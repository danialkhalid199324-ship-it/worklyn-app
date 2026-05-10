/**
 * Safe session notification sender.
 *
 * Behaviour:
 *  1. For 'confirmation' type: skips silently if a sent confirmation already
 *     exists for this session (duplicate-send guard).
 *  2. Creates a 'pending' record in session_notifications.
 *  3. Attempts to send via the configured email provider.
 *  4. Updates the record to 'sent' or 'failed'.
 *
 * Accepts an optional dbClient so the reminder endpoint (which has no auth
 * cookies) can pass the admin client instead of the cookie-based server client.
 *
 * The caller should always await this; it never throws.
 */

import { createAdminClient } from './supabase-server'
import { getClientById, getOrgSettings } from './db'
import { createEmailService } from './email'
import {
  sessionConfirmationEmail,
  sessionUpdateEmail,
  sessionCancellationEmail,
  sessionReminderEmail,
} from './email-templates'
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

// ── Subject / HTML selection ──────────────────────────────────────────────────

function buildEmail(type: NotificationType, emailData: {
  clientName: string
  recipientName: string
  businessName: string
  practitionerName: string
  practitionerEmail: string
  date: string
  startTime: string
  endTime: string
  location: string | null
  serviceName?: string | null
}): { subject: string; html: string } {
  switch (type) {
    case 'confirmation':
      return {
        subject: `Session confirmed — ${emailData.date}`,
        html: sessionConfirmationEmail(emailData),
      }
    case 'update':
      return {
        subject: `Session rescheduled — ${emailData.date}`,
        html: sessionUpdateEmail(emailData),
      }
    case 'cancellation':
      return {
        subject: `Session cancelled — ${emailData.date}`,
        html: sessionCancellationEmail(emailData),
      }
    case 'reminder_24h':
      return {
        subject: `Session reminder — tomorrow, ${emailData.date}`,
        html: sessionReminderEmail(emailData),
      }
    case 'reminder_2h':
      return {
        subject: `Session reminder — today at ${emailData.startTime}`,
        html: sessionReminderEmail(emailData),
      }
    default:
      // 'reminder' and any future legacy types
      return {
        subject: `Session reminder — ${emailData.date}`,
        html: sessionReminderEmail(emailData),
      }
  }
}

// ── Core send function ────────────────────────────────────────────────────────

export async function sendSessionNotification(
  session: SessionRow,
  practitioner: PractitionerRow,
  practitionerEmail: string,
  type: NotificationType,
  // Accepts the admin client from the reminder endpoint (no auth cookies there).
  // Falls back to the cookie-based server client in normal server action calls.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dbClient?: any,
): Promise<{ sent: boolean; noRecipient: boolean; error?: string }> {
  // Use admin client by default: the cookie-based server client cannot reliably
  // propagate the JWT through nested async calls, causing RLS to block the
  // session_notifications INSERT. All DB ops here are already scoped by the
  // authenticated practitioner object passed from the caller.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = dbClient !== undefined ? dbClient : createAdminClient()

  // Duplicate-send guard: skip if a sent confirmation already exists for this session.
  if (type === 'confirmation') {
    const { data: existing } = await supabase
      .from('session_notifications')
      .select('id')
      .eq('session_id', session.id)
      .eq('type', 'confirmation')
      .eq('status', 'sent')
      .limit(1)
    if (existing && existing.length > 0) return { sent: false, noRecipient: false }
  }

  let recipientEmail: string | null = null
  let recipientName = 'Client'
  let clientName = 'Client'

  try {
    const client = await getClientById(practitioner.id, session.client_id)
    clientName = `${client.first_name} ${client.last_name}`

    // Client email takes priority; fall back to guardian/self-manager email.
    if (client.email) {
      recipientEmail = client.email
      recipientName = clientName
    } else if (client.self_manager_email) {
      recipientEmail = client.self_manager_email
      recipientName = client.self_manager_name ?? clientName
    }
  } catch (err) {
    console.error('[session-notifications] could not fetch client:', err)
  }

  // Fetch service name for the email body (non-fatal if missing).
  let serviceName: string | null = null
  if (session.service_id) {
    try {
      const { data: svc } = await supabase
        .from('services')
        .select('name')
        .eq('id', session.service_id)
        .maybeSingle()
      serviceName = svc?.name ?? null
    } catch { /* non-fatal */ }
  }

  console.log(
    `[session-notifications] type=${type} session=${session.id} client=${session.client_id}`,
    `| recipient=${recipientEmail ?? 'NONE'} name="${recipientName}"`,
    `| service="${serviceName ?? 'none'}"`,
  )

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
    return { sent: false, noRecipient: !recipientEmail, error: insertErr?.message }
  }

  if (!recipientEmail) {
    await supabase
      .from('session_notifications')
      .update({ status: 'failed', error_message: 'No email address found for client or guardian.' })
      .eq('id', notif.id)
    return { sent: false, noRecipient: true }
  }

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
    serviceName,
  }

  const { subject, html } = buildEmail(type, emailData)

  let status: 'sent' | 'failed' = 'sent'
  let errorMessage: string | null = null

  try {
    await createEmailService().send({
      to: recipientEmail,
      toName: recipientName,
      subject,
      html,
    })
    console.log(
      `[session-notifications] sent | type=${type} session=${session.id}`,
      `client=${session.client_id} recipient=${recipientEmail}`,
    )
  } catch (err) {
    status = 'failed'
    errorMessage = err instanceof Error ? err.message : String(err)
    console.error(
      `[session-notifications] send failed | type=${type} session=${session.id} recipient=${recipientEmail}:`,
      errorMessage,
    )
  }

  await supabase
    .from('session_notifications')
    .update({
      status,
      error_message: errorMessage,
      sent_at: status === 'sent' ? new Date().toISOString() : null,
    })
    .eq('id', notif.id)

  return status === 'sent'
    ? { sent: true, noRecipient: false }
    : { sent: false, noRecipient: false, error: errorMessage ?? 'Failed to send.' }
}
