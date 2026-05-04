'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/auth'
import { getPractitionerByUserId, getClientById } from '@/lib/db'
import { resolveInvoiceRecipient } from '@/lib/invoice-routing'
import { sendSessionNotification } from '@/lib/session-notifications'
import type { SessionStatus, SessionRow } from '@/types/database'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** HH:MM string from a total-minutes value (wraps at 24 h). */
function minsToHHMM(totalMins: number): string {
  const h = Math.floor(totalMins / 60) % 24
  const m = totalMins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/**
 * If end_time is blank, derive it from start_time + duration_minutes.
 * Returns null when start_time is also blank (unscheduled sessions are fine).
 */
function deriveEndTime(
  startTime: string | null,
  endTime: string | null,
  durationMinutes: number,
): string | null {
  if (endTime) return endTime
  if (!startTime) return null
  const [h, m] = startTime.split(':').map(Number)
  return minsToHHMM(h * 60 + m + durationMinutes)
}

/**
 * Returns an error string if the practitioner already has a scheduled or
 * completed session whose time range overlaps [startTime, endTime] on the
 * same service_date.  Pass excludeId when updating an existing session.
 */
async function checkConflict(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  practitionerId: string,
  serviceDate: string,
  startTime: string,
  endTime: string,
  excludeId?: string,
): Promise<string | null> {
  // Overlap condition: existing.start_time < newEnd  AND  existing.end_time > newStart
  // Only sessions that are scheduled or completed can conflict (not cancelled).
  // Only sessions with both start_time and end_time can be compared.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from('sessions')
    .select('id', { count: 'exact', head: true })
    .eq('practitioner_id', practitionerId)
    .eq('service_date', serviceDate)
    .neq('status', 'cancelled')
    .not('start_time', 'is', null)
    .not('end_time', 'is', null)
    .lt('start_time', endTime)
    .gt('end_time', startTime)

  if (excludeId) {
    query = query.neq('id', excludeId)
  }

  const { count, error } = await query
  if (error) return null // don't block on query failure
  return count && count > 0 ? 'This time conflicts with another session.' : null
}

// ---------------------------------------------------------------------------
// Notes validation
// ---------------------------------------------------------------------------

/**
 * Validates that NDIS structured notes contain all required fields with
 * sufficient detail. Returns the first error string or null if valid.
 */
function validateCompletionNotes(notesRaw: string | null): string | null {
  if (!notesRaw) return 'Session notes are required to complete this session.'
  try {
    const parsed = JSON.parse(notesRaw)
    if (!parsed?.__ndis_v1) return 'Session notes are required to complete this session.'
    const required: { key: string; label: string }[] = [
      { key: 'participant_presentation', label: 'Participant Presentation' },
      { key: 'supports_delivered',       label: 'Supports Delivered' },
      { key: 'participant_response',     label: 'Participant Response' },
      { key: 'progress_toward_goals',    label: 'Progress Toward Goals' },
    ]
    for (const { key, label } of required) {
      const val = ((parsed[key] as string) ?? '').trim()
      if (!val) return `${label} is required.`
      if (val.length < 20) return `${label} is too short — please add more detail.`
    }
    return null
  } catch {
    return 'Invalid notes format.'
  }
}

// ---------------------------------------------------------------------------
// Auto-invoice helper
// ---------------------------------------------------------------------------

type SupabaseClient = Awaited<ReturnType<typeof createServerSupabaseClient>>
type Practitioner = Awaited<ReturnType<typeof getPractitionerByUserId>>

/**
 * Creates a draft invoice for a single completed session.
 * Idempotent: does nothing if the session already has an invoice_id.
 * Errors are logged but never bubble — they must not block the session action.
 */
async function autoCreateDraftInvoice(
  supabase: SupabaseClient,
  practitioner: Practitioner,
  sessionId: string,
): Promise<void> {
  // Fetch session with service name; the .is('invoice_id', null) acts as
  // the idempotency guard — returns null if already invoiced.
  const { data: raw } = await supabase
    .from('sessions')
    .select('*, services(name)')
    .eq('id', sessionId)
    .eq('practitioner_id', practitioner.id)
    .is('invoice_id', null)
    .single()

  if (!raw) return // already invoiced or not found

  type SessionWithService = SessionRow & { services: { name: string } | null }
  const session = raw as unknown as SessionWithService

  const client = await getClientById(practitioner.id, session.client_id)
  if (!client) {
    console.error('[autoCreateDraftInvoice] client not found:', session.client_id)
    return
  }
  const recipient = resolveInvoiceRecipient(client)

  // Invoice number — same sequence logic as generateInvoiceFromSessions
  const { count } = await supabase
    .from('invoices')
    .select('*', { count: 'exact', head: true })
    .eq('practitioner_id', practitioner.id)
  const year = new Date().getFullYear()
  const seq = String((count ?? 0) + 1).padStart(4, '0')
  const invoiceNumber = `INV-${year}-${seq}`

  const hours = session.duration_minutes / 60
  const amountCents = Math.round(hours * session.rate * 100)

  const dateStr = new Date(`${session.service_date}T12:00:00`).toLocaleDateString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
  const servicePart = session.services?.name ?? null
  const codePart = session.ndis_line_item ?? null
  const header = servicePart
    ? `${servicePart}${codePart ? ` (${codePart})` : ''}`
    : codePart ?? null
  const description = header
    ? `${header} — ${dateStr} (${session.duration_minutes}min @ $${session.rate}/hr)`
    : `${dateStr} (${session.duration_minutes}min @ $${session.rate}/hr)`

  const today = new Date()
  const due = new Date(today)
  due.setDate(due.getDate() + 14)

  const { data: invoice, error: invoiceErr } = await supabase
    .from('invoices')
    .insert({
      practitioner_id: practitioner.id,
      client_id: session.client_id,
      invoice_number: invoiceNumber,
      status: 'draft',
      subtotal_cents: amountCents,
      tax_cents: 0,
      total_cents: amountCents,
      currency: 'AUD',
      issued_at: today.toISOString(),
      due_at: due.toISOString(),
      ...recipient,
    })
    .select('id')
    .single()

  if (invoiceErr || !invoice) {
    console.error('[autoCreateDraftInvoice] invoice insert failed:', invoiceErr?.message)
    return
  }

  const { error: itemErr } = await supabase.from('invoice_items').insert({
    invoice_id: invoice.id,
    description,
    quantity: parseFloat(hours.toFixed(4)),
    unit_price_cents: Math.round(session.rate * 100),
  })

  if (itemErr) {
    console.error('[autoCreateDraftInvoice] line item failed:', itemErr.message)
    await supabase.from('invoices').delete().eq('id', invoice.id)
    return
  }

  // Link session → invoice; final idempotency guard via .is('invoice_id', null)
  const { error: linkErr } = await supabase
    .from('sessions')
    .update({ invoice_id: invoice.id })
    .eq('id', session.id)
    .eq('practitioner_id', practitioner.id)
    .is('invoice_id', null)

  if (linkErr) {
    console.error('[autoCreateDraftInvoice] session link failed:', linkErr.message)
    await supabase.from('invoices').delete().eq('id', invoice.id)
    return
  }

  // Set audit lock metadata — non-critical, requires DB columns to exist
  await supabase
    .from('sessions')
    .update({
      notes_locked_at: new Date().toISOString(),
      notes_locked_by: practitioner.user_id,
    })
    .eq('id', session.id)
    .eq('practitioner_id', practitioner.id)
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export async function createSession(formData: FormData) {
  const user = await requireAuth()
  const practitioner = await getPractitionerByUserId(user.id)
  const supabase = await createServerSupabaseClient()

  const clientId = formData.get('client_id') as string
  const serviceDate = formData.get('service_date') as string
  const durationMinutes = parseInt(formData.get('duration_minutes') as string)
  const rate = parseFloat(formData.get('rate') as string)

  if (!clientId || !serviceDate) return { error: 'Client and date are required.' }
  if (!durationMinutes || durationMinutes <= 0) return { error: 'Duration must be at least 1 minute.' }
  if (isNaN(rate) || rate <= 0) return { error: 'A valid hourly rate is required.' }

  const rawStart = (formData.get('start_time') as string) || null
  const rawEnd = (formData.get('end_time') as string) || null
  const startTime = rawStart || null
  const endTime = deriveEndTime(rawStart, rawEnd, durationMinutes)

  // Conflict check — only when a time range is known
  if (startTime && endTime) {
    const conflict = await checkConflict(
      supabase, practitioner.id, serviceDate, startTime, endTime,
    )
    if (conflict) return { error: conflict }
  }

  const sessionStatus = ((formData.get('status') as string) || 'scheduled') as SessionStatus

  // Block creating a completed session without valid notes
  if (sessionStatus === 'completed') {
    const notesError = validateCompletionNotes((formData.get('notes') as string)?.trim() || null)
    if (notesError) return { error: notesError }
  }

  const { data: newSession, error } = await supabase
    .from('sessions')
    .insert({
      practitioner_id: practitioner.id,
      client_id: clientId,
      appointment_id: (formData.get('appointment_id') as string) || null,
      service_id: (formData.get('service_id') as string) || null,
      service_date: serviceDate,
      start_time: startTime,
      end_time: endTime,
      duration_minutes: durationMinutes,
      ndis_line_item: (formData.get('ndis_line_item') as string)?.trim() || null,
      rate,
      notes: (formData.get('notes') as string)?.trim() || null,
      status: sessionStatus,
      invoice_id: null,
    })
    .select('*')
    .single()

  if (error) return { error: error.message }

  // Auto-create a draft invoice when the session is created as completed
  if (sessionStatus === 'completed' && newSession) {
    try {
      await autoCreateDraftInvoice(supabase, practitioner, newSession.id)
    } catch (err) {
      console.error('[createSession] auto-invoice failed:', err)
    }
    revalidatePath('/dashboard/invoices')
  }

  // Send confirmation email for scheduled sessions — never blocks or fails the action.
  if (sessionStatus === 'scheduled' && newSession) {
    try {
      const user = await requireAuth()
      await sendSessionNotification(
        newSession as unknown as import('@/types/database').SessionRow,
        practitioner,
        user.email ?? '',
        'confirmation',
      )
    } catch (err) {
      console.error('[sessions] confirmation email failed:', err)
    }
  }

  revalidatePath('/dashboard/sessions')
  revalidatePath('/dashboard/calendar')
  revalidatePath(`/dashboard/clients/${clientId}`)
  return { success: true }
}

export async function updateSession(sessionId: string, formData: FormData) {
  const user = await requireAuth()
  const practitioner = await getPractitionerByUserId(user.id)
  const supabase = await createServerSupabaseClient()

  // Explicit lock check — session notes and details are immutable once invoiced
  const { data: existing } = await supabase
    .from('sessions')
    .select('invoice_id, client_id, status')
    .eq('id', sessionId)
    .eq('practitioner_id', practitioner.id)
    .single()
  if (!existing) return { error: 'Session not found.' }
  if (existing.invoice_id) {
    return { error: 'This session has been invoiced. Notes and session details are locked for audit integrity.' }
  }

  const serviceDate = formData.get('service_date') as string
  const durationMinutes = parseInt(formData.get('duration_minutes') as string)
  const rate = parseFloat(formData.get('rate') as string)

  if (!durationMinutes || durationMinutes <= 0) return { error: 'Duration must be at least 1 minute.' }
  if (isNaN(rate) || rate <= 0) return { error: 'A valid hourly rate is required.' }

  const rawStart = (formData.get('start_time') as string) || null
  const rawEnd = (formData.get('end_time') as string) || null
  const startTime = rawStart || null
  const endTime = deriveEndTime(rawStart, rawEnd, durationMinutes)

  if (startTime && endTime) {
    const conflict = await checkConflict(
      supabase, practitioner.id, serviceDate, startTime, endTime, sessionId,
    )
    if (conflict) return { error: conflict }
  }

  const newStatus = formData.get('status') as SessionStatus

  // Block transitioning to completed without valid notes
  if (newStatus === 'completed' && existing.status !== 'completed') {
    const notesError = validateCompletionNotes((formData.get('notes') as string)?.trim() || null)
    if (notesError) return { error: notesError }
  }

  const { data: updated, error } = await supabase
    .from('sessions')
    .update({
      service_id: (formData.get('service_id') as string) || null,
      service_date: serviceDate,
      start_time: startTime,
      end_time: endTime,
      duration_minutes: durationMinutes,
      ndis_line_item: (formData.get('ndis_line_item') as string)?.trim() || null,
      rate,
      notes: (formData.get('notes') as string)?.trim() || null,
      status: newStatus,
    })
    .eq('id', sessionId)
    .eq('practitioner_id', practitioner.id)
    .is('invoice_id', null) // prevent editing already-invoiced sessions
    .select('id')

  if (error) return { error: error.message }

  // Auto-create a draft invoice when a session is marked completed
  if (newStatus === 'completed' && updated && updated.length > 0) {
    try {
      await autoCreateDraftInvoice(supabase, practitioner, sessionId)
    } catch (err) {
      console.error('[updateSession] auto-invoice failed:', err)
    }
    revalidatePath('/dashboard/invoices')
  }

  revalidatePath('/dashboard/sessions')
  revalidatePath('/dashboard/calendar')
  revalidatePath(`/dashboard/clients/${existing.client_id}`)
  return { success: true }
}

export async function deleteSession(sessionId: string) {
  const user = await requireAuth()
  const practitioner = await getPractitionerByUserId(user.id)
  const supabase = await createServerSupabaseClient()

  // Explicit lock check — invoiced sessions cannot be deleted
  const { data: existing } = await supabase
    .from('sessions')
    .select('invoice_id, client_id')
    .eq('id', sessionId)
    .eq('practitioner_id', practitioner.id)
    .single()
  if (!existing) return { error: 'Session not found.' }
  if (existing.invoice_id) {
    return { error: 'Cannot delete an invoiced session.' }
  }

  const { error } = await supabase
    .from('sessions')
    .delete()
    .eq('id', sessionId)
    .eq('practitioner_id', practitioner.id)
    .is('invoice_id', null) // secondary guard

  if (error) return { error: error.message }

  revalidatePath('/dashboard/sessions')
  revalidatePath('/dashboard/calendar')
  revalidatePath(`/dashboard/clients/${existing.client_id}`)
  return { success: true }
}

export async function generateInvoiceFromSessions(formData: FormData) {
  const user = await requireAuth()
  const practitioner = await getPractitionerByUserId(user.id)
  const supabase = await createServerSupabaseClient()

  const clientId = formData.get('client_id') as string
  let sessionIds: string[]
  try {
    sessionIds = JSON.parse(formData.get('session_ids') as string)
  } catch {
    return { error: 'Invalid session selection.' }
  }

  if (!clientId || !sessionIds.length) return { error: 'Select at least one session.' }

  // Verify sessions are unbilled and belong to this practitioner + client
  // Join services so line item descriptions include the service name
  const { data: rawSessions, error: fetchErr } = await supabase
    .from('sessions')
    .select('*, services(name)')
    .eq('practitioner_id', practitioner.id)
    .eq('client_id', clientId)
    .in('id', sessionIds)
    .is('invoice_id', null)

  if (fetchErr) return { error: fetchErr.message }

  type SessionForInvoice = SessionRow & { services: { name: string } | null }
  const sessions = (rawSessions ?? []) as unknown as SessionForInvoice[]
  if (!sessions.length) return { error: 'No unbilled sessions found for the selected IDs.' }

  // Resolve billing recipient from client record
  const client = await getClientById(practitioner.id, clientId)
  const recipient = resolveInvoiceRecipient(client)

  // Build line items and compute totals
  let subtotalCents = 0
  const lineItems = sessions.map((s) => {
    const hours = s.duration_minutes / 60
    const amountCents = Math.round(hours * s.rate * 100)
    subtotalCents += amountCents
    const dateStr = new Date(`${s.service_date}T12:00:00`).toLocaleDateString('en-AU', {
      day: 'numeric', month: 'short', year: 'numeric',
    })
    // Service name → NDIS code → date → duration/rate
    const servicePart = s.services?.name ?? null
    const codePart = s.ndis_line_item ?? null
    const header = servicePart
      ? `${servicePart}${codePart ? ` (${codePart})` : ''}`
      : codePart ?? null
    const description = header
      ? `${header} — ${dateStr} (${s.duration_minutes}min @ $${s.rate}/hr)`
      : `${dateStr} (${s.duration_minutes}min @ $${s.rate}/hr)`
    return {
      description,
      quantity: parseFloat(hours.toFixed(4)),
      unit_price_cents: Math.round(s.rate * 100),
    }
  })

  // Invoice number
  const { count } = await supabase
    .from('invoices')
    .select('*', { count: 'exact', head: true })
    .eq('practitioner_id', practitioner.id)

  const year = new Date().getFullYear()
  const seq = String((count ?? 0) + 1).padStart(4, '0')
  const invoiceNumber = `INV-${year}-${seq}`

  const today = new Date()
  const due = new Date(today)
  due.setDate(due.getDate() + 14)

  // Create invoice
  const { data: invoice, error: invoiceErr } = await supabase
    .from('invoices')
    .insert({
      practitioner_id: practitioner.id,
      client_id: clientId,
      invoice_number: invoiceNumber,
      status: 'draft',
      subtotal_cents: subtotalCents,
      tax_cents: 0,
      total_cents: subtotalCents,
      currency: 'AUD',
      issued_at: today.toISOString(),
      due_at: due.toISOString(),
      notes: (formData.get('notes') as string)?.trim() || null,
      ...recipient,
    })
    .select('id')
    .single()

  if (invoiceErr || !invoice) return { error: invoiceErr?.message ?? 'Failed to create invoice.' }

  // Insert line items
  const { error: itemsErr } = await supabase
    .from('invoice_items')
    .insert(lineItems.map((item) => ({ invoice_id: invoice.id, ...item })))

  if (itemsErr) {
    await supabase.from('invoices').delete().eq('id', invoice.id)
    return { error: itemsErr.message }
  }

  // Attach sessions to invoice
  const { error: linkErr } = await supabase
    .from('sessions')
    .update({ invoice_id: invoice.id })
    .in('id', sessions.map((s) => s.id))
    .eq('practitioner_id', practitioner.id)

  if (linkErr) {
    await supabase.from('invoices').delete().eq('id', invoice.id)
    return { error: linkErr.message }
  }

  // Set audit lock metadata on all linked sessions — non-critical, requires DB columns to exist
  const lockedAt = new Date().toISOString()
  await supabase
    .from('sessions')
    .update({
      notes_locked_at: lockedAt,
      notes_locked_by: user.id,
    })
    .in('id', sessions.map((s) => s.id))
    .eq('practitioner_id', practitioner.id)

  revalidatePath('/dashboard/sessions')
  revalidatePath('/dashboard/invoices')
  revalidatePath('/dashboard/calendar')
  revalidatePath(`/dashboard/clients/${clientId}`)
  return { success: true, invoiceId: invoice.id as string }
}

/**
 * Atomically marks an existing session as completed, saves validated NDIS
 * notes, and auto-creates a draft invoice.  Called by CompleteSessionNotesModal.
 */
export async function completeSession(sessionId: string, notesJson: string) {
  const user = await requireAuth()
  const practitioner = await getPractitionerByUserId(user.id)
  const supabase = await createServerSupabaseClient()

  // Validate notes server-side (defence-in-depth)
  const notesError = validateCompletionNotes(notesJson)
  if (notesError) return { error: notesError }

  const { data: existing } = await supabase
    .from('sessions')
    .select('invoice_id, client_id, status')
    .eq('id', sessionId)
    .eq('practitioner_id', practitioner.id)
    .single()
  if (!existing) return { error: 'Session not found.' }
  if (existing.invoice_id) {
    return { error: 'This session has already been invoiced and cannot be modified.' }
  }

  const { error } = await supabase
    .from('sessions')
    .update({ status: 'completed' as SessionStatus, notes: notesJson })
    .eq('id', sessionId)
    .eq('practitioner_id', practitioner.id)
    .is('invoice_id', null)

  if (error) return { error: error.message }

  try {
    await autoCreateDraftInvoice(supabase, practitioner, sessionId)
  } catch (err) {
    console.error('[completeSession] auto-invoice failed:', err)
  }

  revalidatePath('/dashboard/sessions')
  revalidatePath('/dashboard/invoices')
  revalidatePath('/dashboard/calendar')
  revalidatePath(`/dashboard/clients/${existing.client_id}`)
  return { success: true as const }
}
