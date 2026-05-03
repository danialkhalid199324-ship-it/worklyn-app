'use server'

import { createAdminClient } from '@/lib/supabase-server'
import { getAvailableSlots } from '@/lib/availability'
import { sendEmail } from '@/lib/email'
import { clientConfirmationEmail, practitionerNotificationEmail } from '@/lib/email-templates'
import type { BookingConfirmationData } from '@/lib/email-templates'

interface BookingPayload {
  practitionerId: string
  serviceId: string
  date: string          // "YYYY-MM-DD"
  startTime: string     // "HH:MM"
  clientName: string
  clientEmail: string
  clientPhone?: string
  clientNotes?: string
}

export async function createBooking(payload: BookingPayload) {
  // Admin client bypasses RLS — required because this runs without an auth session
  const admin = createAdminClient()

  // -----------------------------------------------------------------------
  // 1. Fetch practitioner + service
  // -----------------------------------------------------------------------
  const [{ data: practitioner, error: pErr }, { data: service, error: sErr }] =
    await Promise.all([
      admin
        .from('practitioners')
        .select('*, users(email)')
        .eq('id', payload.practitionerId)
        .single(),
      admin
        .from('services')
        .select('*')
        .eq('id', payload.serviceId)
        .eq('practitioner_id', payload.practitionerId)
        .eq('is_active', true)
        .single(),
    ])

  if (pErr || !practitioner) return { error: 'Practitioner not found' }
  if (sErr || !service) return { error: 'Service not found or inactive' }

  // -----------------------------------------------------------------------
  // 2. Re-verify slot availability (double-booking prevention)
  // -----------------------------------------------------------------------
  const [rulesRes, blockedRes, apptRes] = await Promise.all([
    admin
      .from('availability_rules')
      .select('*')
      .eq('practitioner_id', payload.practitionerId),
    admin
      .from('blocked_times')
      .select('*')
      .eq('practitioner_id', payload.practitionerId),
    admin
      .from('appointments')
      .select('*')
      .eq('practitioner_id', payload.practitionerId)
      .gte('start_time', `${payload.date}T00:00:00`)
      .lte('start_time', `${payload.date}T23:59:59`),
  ])

  const bufferMinutes = (practitioner as never as { buffer_minutes?: number }).buffer_minutes ?? 0

  const availableSlots = getAvailableSlots({
    date: payload.date,
    rules: rulesRes.data ?? [],
    blockedTimes: blockedRes.data ?? [],
    appointments: apptRes.data ?? [],
    durationMinutes: service.duration_minutes,
    bufferMinutes,
  })

  const slotExists = availableSlots.some((s) => s.start === payload.startTime)
  if (!slotExists) {
    return { error: 'This time slot is no longer available. Please choose another.' }
  }

  // -----------------------------------------------------------------------
  // 3. Upsert client record
  // -----------------------------------------------------------------------
  const nameParts = payload.clientName.trim().split(' ')
  const firstName = nameParts[0]
  const lastName = nameParts.slice(1).join(' ') || '-'

  const { data: existingClient } = await admin
    .from('clients')
    .select('id')
    .eq('practitioner_id', payload.practitionerId)
    .eq('email', payload.clientEmail)
    .maybeSingle()

  let clientId: string

  if (existingClient) {
    clientId = existingClient.id
  } else {
    const { data: newClient, error: cErr } = await admin
      .from('clients')
      .insert({
        practitioner_id: payload.practitionerId,
        first_name: firstName,
        last_name: lastName,
        email: payload.clientEmail,
        phone: payload.clientPhone ?? null,
      })
      .select('id')
      .single()

    if (cErr || !newClient) return { error: 'Failed to create client record' }
    clientId = newClient.id
  }

  // -----------------------------------------------------------------------
  // 4. Create appointment
  // -----------------------------------------------------------------------
  const startISO = `${payload.date}T${payload.startTime}:00`
  const endDate = new Date(`${payload.date}T${payload.startTime}:00`)
  endDate.setMinutes(endDate.getMinutes() + service.duration_minutes)
  const endISO = endDate.toISOString().replace('Z', '')

  const { data: appointment, error: apptErr } = await admin
    .from('appointments')
    .insert({
      practitioner_id: payload.practitionerId,
      client_id: clientId,
      service_id: payload.serviceId,
      start_time: startISO,
      end_time: endISO,
      status: 'scheduled',
      client_notes: payload.clientNotes ?? null,
      price_cents: service.price_cents,
      currency: service.currency,
    })
    .select('id')
    .single()

  if (apptErr || !appointment) {
    return { error: 'Failed to save appointment. Please try again.' }
  }

  // -----------------------------------------------------------------------
  // 5. Send confirmation emails
  // -----------------------------------------------------------------------
  const dateObj = new Date(`${payload.date}T12:00:00`)
  const humanDate = dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const endTime = endDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
  const startTimeFormatted = new Date(`${payload.date}T${payload.startTime}:00`).toLocaleTimeString(
    'en-US',
    { hour: 'numeric', minute: '2-digit', hour12: true },
  )

  const practitionerUser = (practitioner as never as { users?: { email: string } }).users

  const emailData: BookingConfirmationData = {
    clientName: payload.clientName,
    clientEmail: payload.clientEmail,
    serviceName: service.name,
    practitionerName:
      practitioner.display_name ??
      `${practitioner.first_name} ${practitioner.last_name}`,
    practitionerEmail: practitionerUser?.email ?? '',
    practitionerPhone: practitioner.phone,
    date: humanDate,
    startTime: startTimeFormatted,
    endTime,
    notes: payload.clientNotes,
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  }

  // Fire emails — don't let email failures break the booking
  await Promise.allSettled([
    sendEmail({
      to: payload.clientEmail,
      toName: payload.clientName,
      subject: `Appointment confirmed: ${service.name} on ${humanDate}`,
      html: clientConfirmationEmail(emailData),
      replyTo: practitionerUser?.email,
    }),
    practitionerUser?.email
      ? sendEmail({
          to: practitionerUser.email,
          subject: `New booking: ${payload.clientName} — ${service.name} on ${humanDate}`,
          html: practitionerNotificationEmail(emailData),
        })
      : Promise.resolve(),
  ])

  return {
    success: true,
    appointmentId: appointment.id,
    summary: emailData,
  }
}
