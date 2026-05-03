/**
 * Safe session notification sender.
 *
 * Behaviour:
 *  1. Creates a 'pending' record in session_notifications.
 *  2. Attempts to send via whatever email provider is configured
 *     (Resend in production, console logger in dev — never crashes).
 *  3. Updates the record to 'sent' or 'failed' with any error message.
 *
 * The caller should always await this; it never throws.
 */

import { createServerSupabaseClient } from './supabase-server'
import { getClientById, getOrgSettings } from './db'
import { createEmailService } from './email'
import { sessionConfirmationEmail, sessionReminderEmail } from './email-templates'
import type { NotificationType, PractitionerRow, SessionRow } from '@/types/database'

// ── Date / time helpers ───────────────────────────────────────────────────────

function formatSessionDate(serviceDate: string): string {
  const [y, m, d] = serviceDate.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function formatHHMM(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${period}`
}

function deriveEndDisplay(session: SessionRow): string {
  if (session.end_time) return formatHHMM(session.end_time)
  if (session.start_time) {
    const [h, m] = session.start_time.split(':').map(Number)
    const total = h * 60 + m + session.duration_minutes
    const eh = Math.floor(total / 60) % 24
    const em = total % 60
    return formatHHMM(`${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`)
  }
  return 'TBD'
}

// ── Core send function ────────────────────────────────────────────────────────

export async function sendSessionNotification(
  session: SessionRow,
  practitioner: PractitionerRow,
  practitionerEmail: string,
  type: NotificationType,
): Promise<void> {
  const supabase = await createServerSupabaseClient()

  let recipientEmail: string | null = null
  let recipientName = 'Client'
  let clientName = 'Client'

  // Fetch client and resolve recipient (guardian takes priority over client)
  try {
    const client = await getClientById(practitioner.id, session.client_id)
    clientName = `${client.first_name} ${client.last_name}`

    if (client.self_manager_email) {
      recipientEmail = client.self_manager_email
      recipientName = client.self_manager_name ?? clientName
    } else if (client.email) {
      recipientEmail = client.email
      recipientName = clientName
    }
  } catch (err) {
    console.error('[session-notifications] could not fetch client:', err)
  }

  // Always write a record so the practitioner can see the attempt
  const { data: notif, error: insertErr } = await supabase
    .from('session_notifications')
    .insert({
      practitioner_id: practitioner.id,
      session_id: session.id,
      type,
      recipient_name: recipientName,
      recipient_email: recipientEmail,
      status: 'pending',
      error_message: null,
      sent_at: null,
    })
    .select('id')
    .single()

  if (insertErr || !notif) {
    console.error('[session-notifications] could not create record:', insertErr?.message)
    return
  }

  // No address — mark failed immediately
  if (!recipientEmail) {
    await supabase
      .from('session_notifications')
      .update({ status: 'failed', error_message: 'No email address found for client or guardian.' })
      .eq('id', notif.id)
    return
  }

  // Build email
  let orgSettings = null
  try { orgSettings = await getOrgSettings(practitioner.id) } catch { /* non-fatal */ }

  const businessName =
    orgSettings?.business_name ?? `${practitioner.first_name} ${practitioner.last_name}`

  const emailData = {
    clientName,
    recipientName,
    businessName,
    practitionerName: `${practitioner.first_name} ${practitioner.last_name}`,
    practitionerEmail,
    date: formatSessionDate(session.service_date),
    startTime: session.start_time ? formatHHMM(session.start_time) : 'TBD',
    endTime: deriveEndDisplay(session),
    location: null,
  }

  const subject =
    type === 'confirmation'
      ? `Session confirmed — ${emailData.date}`
      : `Session reminder — ${emailData.date}`

  const html =
    type === 'confirmation'
      ? sessionConfirmationEmail(emailData)
      : sessionReminderEmail(emailData)

  // Attempt send (createEmailService never throws — falls back to console logger)
  let status: 'sent' | 'failed' = 'sent'
  let errorMessage: string | null = null

  try {
    await createEmailService().send({
      to: recipientEmail,
      toName: recipientName,
      subject,
      html,
    })
  } catch (err) {
    status = 'failed'
    errorMessage = err instanceof Error ? err.message : String(err)
    console.error('[session-notifications] send failed:', err)
  }

  await supabase
    .from('session_notifications')
    .update({
      status,
      error_message: errorMessage,
      sent_at: status === 'sent' ? new Date().toISOString() : null,
    })
    .eq('id', notif.id)
}
