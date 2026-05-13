import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { sendSessionNotification } from '@/lib/session-notifications'
import { sendEmail } from '@/lib/email'
import { invoiceOverdueReminderEmail } from '@/lib/email-templates'
import type { NotificationType, PractitionerRow, SessionRow } from '@/types/database'

// ---------------------------------------------------------------------------
// Timezone helper — converts a local session time to UTC without any library.
//
// Algorithm: treat the (date, time) as UTC temporarily, ask Intl what that
// UTC instant looks like in the target timezone, then compute the offset from
// the difference. Add the offset to get true UTC.
//
// Accuracy is sufficient for reminder windows (±1 hour from DST is acceptable).
// ---------------------------------------------------------------------------

function getSessionStartUtc(
  serviceDate: string,
  startTime: string,
  timezone: string,
): Date | null {
  try {
    const [y, mo, d] = serviceDate.split('-').map(Number)
    const [h, mi] = startTime.split(':').map(Number)

    // Step 1: treat the local time as if it were UTC
    const assumed = new Date(Date.UTC(y, mo - 1, d, h, mi, 0))

    // Step 2: find out what the target timezone says this UTC instant represents
    const fmt = new Intl.DateTimeFormat('sv-SE', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    const localStr = fmt.format(assumed) // "YYYY-MM-DD HH:MM"
    const [datePart, timePart] = localStr.split(' ')
    const [fy, fmo, fd] = datePart.split('-').map(Number)
    const [fh, fmi] = timePart.split(':').map(Number)

    // Step 3: the offset is (assumed UTC) - (what timezone reports for assumed)
    const tzMs = Date.UTC(fy, fmo - 1, fd, fh === 24 ? 0 : fh, fmi, 0)
    const offsetMs = assumed.getTime() - tzMs

    // Step 4: true UTC = assumed + offset
    return new Date(assumed.getTime() + offsetMs)
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const now = new Date()
  console.log('[reminders] cron triggered | timestamp:', now.toISOString())

  // Auth guard — must supply CRON_SECRET in Authorization header
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error('[reminders] fatal: CRON_SECRET env var is not set — set it in Vercel environment variables and redeploy')
    return new NextResponse(
      'CRON_SECRET is not configured. Set it in your environment variables.',
      { status: 503 },
    )
  }
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${secret}`) {
    console.error('[reminders] unauthorized | Authorization header present:', !!authHeader)
    return new NextResponse('Unauthorized', { status: 401 })
  }
  console.log('[reminders] auth ok')

  // Verify required env vars are present before doing any DB work
  const missingEnv: string[] = []
  if (!process.env.RESEND_API_KEY)          missingEnv.push('RESEND_API_KEY')
  if (!process.env.EMAIL_FROM)              missingEnv.push('EMAIL_FROM')
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) missingEnv.push('NEXT_PUBLIC_SUPABASE_URL')
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missingEnv.push('SUPABASE_SERVICE_ROLE_KEY')
  if (missingEnv.length > 0) {
    console.error('[reminders] missing env vars:', missingEnv.join(', '))
    return new NextResponse(`Missing environment variables: ${missingEnv.join(', ')}`, { status: 503 })
  }

  const admin = createAdminClient()

  // Reminder windows (UTC):
  //   24h reminder → session starts between 23 and 25 hours from now
  //    2h reminder → session starts between  1 and  3 hours from now
  const ms = (h: number) => h * 3600 * 1000
  const window24hStart = new Date(now.getTime() + ms(23))
  const window24hEnd   = new Date(now.getTime() + ms(25))
  const window2hStart  = new Date(now.getTime() + ms(1))
  const window2hEnd    = new Date(now.getTime() + ms(3))

  // Date bounds to narrow the session query (no need to inspect sessions weeks away)
  const todayStr    = now.toISOString().slice(0, 10)
  const in2DaysStr  = new Date(now.getTime() + ms(50)).toISOString().slice(0, 10)

  // Fetch all practitioners
  const { data: practitioners, error: practErr } = await admin
    .from('practitioners')
    .select('*')

  if (practErr) {
    console.error('[reminders] failed to fetch practitioners:', practErr.message)
    return new NextResponse(`Failed to fetch practitioners: ${practErr.message}`, { status: 500 })
  }
  console.log('[reminders] practitioners found:', practitioners?.length ?? 0)

  // Fetch auth emails in one batch (needed for email reply-to)
  let userEmailMap: Record<string, string> = {}
  try {
    const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 })
    userEmailMap = Object.fromEntries(
      (users ?? []).map((u: { id: string; email?: string }) => [u.id, u.email ?? ''])
    )
  } catch (err) {
    console.error('[reminders] could not fetch auth users:', err)
  }

  const results = { checked: 0, sent: 0, skipped: 0, failed: 0 }

  for (const practitioner of (practitioners ?? []) as PractitionerRow[]) {
    const timezone = practitioner.timezone || 'UTC'
    const practitionerEmail = userEmailMap[practitioner.user_id] ?? ''

    // Fetch scheduled sessions in the relevant date window
    const { data: sessions, error: sessErr } = await admin
      .from('sessions')
      .select('*')
      .eq('practitioner_id', practitioner.id)
      .eq('status', 'scheduled')
      .not('start_time', 'is', null)
      .gte('service_date', todayStr)
      .lte('service_date', in2DaysStr)

    if (sessErr) {
      console.error('[reminders] session fetch error for practitioner', practitioner.id, sessErr.message)
      continue
    }

    for (const session of (sessions ?? []) as SessionRow[]) {
      results.checked++

      const startUtc = getSessionStartUtc(session.service_date, session.start_time!, timezone)
      if (!startUtc) continue

      // Determine which window this session falls into
      let notifType: NotificationType | null = null
      if (startUtc >= window24hStart && startUtc < window24hEnd) {
        notifType = 'reminder_24h'
      } else if (startUtc >= window2hStart && startUtc < window2hEnd) {
        notifType = 'reminder_2h'
      }
      if (!notifType) continue

      // Dedup: skip if this reminder type was already sent successfully for this session
      const { data: existing } = await admin
        .from('session_notifications')
        .select('id')
        .eq('session_id', session.id)
        .eq('type', notifType)
        .eq('status', 'sent')
        .limit(1)

      if (existing && existing.length > 0) {
        results.skipped++
        continue
      }

      try {
        await sendSessionNotification(session, practitioner, practitionerEmail, notifType, admin)
        results.sent++
      } catch (err) {
        console.error('[reminders] send failed for session', session.id, err)
        results.failed++
      }
    }
  }

  // ── Overdue invoice reminders ─────────────────────────────────────────────
  // Fires once per overdue invoice: status IN ('sent','overdue'), past due_at,
  // not paid, and overdue_reminder_sent_at IS NULL (not yet reminded).
  // Sets overdue_reminder_sent_at + bumps status to 'overdue' on success.

  console.log('[reminders] --- overdue invoice reminders | cutoff date:', todayStr, '---')
  const invoiceResults = { checked: 0, sent: 0, skipped: 0, failed: 0 }

  for (const practitioner of (practitioners ?? []) as PractitionerRow[]) {
    const practitionerEmail = userEmailMap[practitioner.user_id] ?? ''

    // Fetch org settings once per practitioner (non-fatal if missing)
    let businessName = `${practitioner.first_name} ${practitioner.last_name}`
    let orgBsb: string | null = null
    let orgBankName: string | null = null
    let orgAccountNumber: string | null = null
    let orgPayRefPrefix: string | null = null
    try {
      const { data: org } = await admin
        .from('org_settings')
        .select('business_name, bsb, bank_account_name, account_number, payment_reference_prefix')
        .eq('practitioner_id', practitioner.id)
        .maybeSingle()
      if (org?.business_name) businessName = org.business_name
      orgBsb = org?.bsb ?? null
      orgBankName = org?.bank_account_name ?? null
      orgAccountNumber = org?.account_number ?? null
      orgPayRefPrefix = org?.payment_reference_prefix ?? null
    } catch { /* non-fatal */ }

    const { data: overdueInvoices, error: invErr } = await admin
      .from('invoices')
      .select('id, invoice_number, total_cents, currency, due_at, recipient_name, recipient_email, status')
      .eq('practitioner_id', practitioner.id)
      .in('status', ['sent', 'overdue'])
      .lt('due_at', todayStr)
      .is('paid_at', null)
      .is('overdue_reminder_sent_at', null)

    if (invErr) {
      console.error('[reminders] invoice fetch error | practitioner:', practitioner.id, '| error:', invErr.message)
      continue
    }
    console.log('[reminders] overdue invoices found | practitioner:', practitioner.id, '| count:', overdueInvoices?.length ?? 0)

    for (const invoice of (overdueInvoices ?? [])) {
      invoiceResults.checked++

      if (!invoice.recipient_email) {
        console.log('[reminders] skipping invoice (no recipient email) | invoice:', invoice.invoice_number)
        invoiceResults.skipped++
        continue
      }
      console.log('[reminders] attempting overdue email | invoice:', invoice.invoice_number, '| to:', invoice.recipient_email, '| due:', invoice.due_at)

      const total = new Intl.NumberFormat('en-AU', {
        style: 'currency',
        currency: invoice.currency ?? 'AUD',
      }).format(invoice.total_cents / 100)

      const dueDate = invoice.due_at
        ? new Date(invoice.due_at).toLocaleDateString('en-AU', {
            day: 'numeric', month: 'long', year: 'numeric',
          })
        : 'N/A'

      const payRef = orgPayRefPrefix
        ? `${orgPayRefPrefix}-${invoice.invoice_number}`
        : invoice.invoice_number

      const html = invoiceOverdueReminderEmail({
        recipientName: invoice.recipient_name ?? 'there',
        businessName,
        invoiceNumber: invoice.invoice_number,
        total,
        dueDate,
        practitionerEmail,
        bsb: orgBsb,
        bankAccountName: orgBankName,
        accountNumber: orgAccountNumber,
        paymentReference: payRef,
      })

      try {
        await sendEmail({
          to: invoice.recipient_email,
          toName: invoice.recipient_name ?? undefined,
          subject: `Overdue: Invoice ${invoice.invoice_number} from ${businessName} — ${total}`,
          html,
          replyTo: practitionerEmail || undefined,
        })

        await admin
          .from('invoices')
          .update({ overdue_reminder_sent_at: now.toISOString(), status: 'overdue' })
          .eq('id', invoice.id)
          .eq('practitioner_id', practitioner.id)

        console.log(
          `[reminders] overdue reminder sent | invoice=${invoice.invoice_number}`,
          `practitioner=${practitioner.id} recipient=${invoice.recipient_email}`,
        )
        invoiceResults.sent++
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(
          '[reminders] overdue invoice send failed | invoice:', invoice.invoice_number,
          '| practitioner:', practitioner.id,
          '| error:', msg,
        )
        invoiceResults.failed++
      }
    }
  }

  console.log('[reminders] complete | sessions:', JSON.stringify(results), '| invoices:', JSON.stringify(invoiceResults))

  return NextResponse.json({
    ok: true,
    timestamp: now.toISOString(),
    sessions: results,
    invoices: invoiceResults,
  })
}
