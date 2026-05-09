import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { sendSessionNotification } from '@/lib/session-notifications'
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
  // Auth guard — must supply CRON_SECRET in Authorization header
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return new NextResponse(
      'CRON_SECRET is not configured. Set it in your environment variables.',
      { status: 503 },
    )
  }
  if (req.headers.get('authorization') !== `Bearer ${secret}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const admin = createAdminClient()
  const now = new Date()

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
    return new NextResponse(`Failed to fetch practitioners: ${practErr.message}`, { status: 500 })
  }

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

  return NextResponse.json({
    ok: true,
    timestamp: now.toISOString(),
    ...results,
  })
}
