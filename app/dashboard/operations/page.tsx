import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import { getPractitionerByUserId } from '@/lib/db'
import { createAdminClient } from '@/lib/supabase-server'
import OperationsClient from './OperationsClient'
import type { SessionRow, InvoiceRow } from '@/types/database'

export const metadata: Metadata = { title: 'Operations' }

export type PractitionerMetrics = {
  id: string
  name: string
  role: string
  totalSessions: number
  completedSessions: number
  scheduledSessions: number
  cancelledSessions: number
  totalInvoicedCents: number
  billableMinutes: number
  lastActivityDate: string | null
  completionRate: number
}

export type ActivityEvent = {
  id: string
  kind: 'session_completed' | 'invoice_created' | 'notification_sent' | 'member_invited'
  label: string
  sub: string
  timestamp: string
}

function getDateRange(range: string): { start: string; end: string; label: string } {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const toDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const today = toDate(now)

  if (range === 'today') {
    return { start: today, end: today, label: 'Today' }
  }

  if (range === 'week') {
    const day = now.getDay()
    const diff = day === 0 ? -6 : 1 - day
    const monday = new Date(now)
    monday.setDate(now.getDate() + diff)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    return { start: toDate(monday), end: toDate(sunday), label: 'This Week' }
  }

  // month (default)
  const first = new Date(now.getFullYear(), now.getMonth(), 1)
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const label = now.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })
  return { start: toDate(first), end: toDate(last), label }
}

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default async function OperationsPage({
  searchParams,
}: {
  searchParams: { range?: string }
}) {
  const user = await requireAuth()
  const practitioner = await getPractitionerByUserId(user.id)
  const practitionerRole = practitioner.role as string | undefined
  const isAdmin = !practitionerRole || practitionerRole === 'admin'

  if (!isAdmin) redirect('/dashboard')

  const range = searchParams.range === 'today' || searchParams.range === 'week'
    ? searchParams.range
    : 'month'
  const { start, end, label: dateLabel } = getDateRange(range)

  const adminClient = createAdminClient()

  // Build member list: owner + all active clinic members
  const allIds: string[] = [practitioner.id]
  const memberMap: Record<string, { name: string; role: string }> = {
    [practitioner.id]: {
      name: `${practitioner.first_name} ${practitioner.last_name}`,
      role: practitioner.role ?? 'admin',
    },
  }

  try {
    const { data: memberships } = await adminClient
      .from('clinic_memberships')
      .select('member_id, role, member:practitioners!clinic_memberships_member_id_fkey(id, first_name, last_name, user_id)')
      .eq('clinic_id', practitioner.id)
      .eq('is_active', true)
      .eq('status', 'active')

    for (const m of memberships ?? []) {
      if (m.member_id && m.member && !allIds.includes(m.member_id)) {
        const mem = m.member as unknown as { id: string; first_name: string; last_name: string; user_id: string }
        // Skip if this clinic member is the same auth user as the owner — dedup guard
        // for the case where one person has two practitioner records (owner + member).
        if (mem.user_id === user.id) continue
        allIds.push(m.member_id)
        memberMap[m.member_id] = {
          name: `${mem.first_name} ${mem.last_name}`,
          role: m.role,
        }
      }
    }
  } catch { /* migration 016 not yet applied — owner-only mode */ }

  // Sessions in date range
  type SessionSlice = Pick<SessionRow, 'id' | 'practitioner_id' | 'status' | 'duration_minutes' | 'service_date' | 'rate'>
  const { data: rawSessions } = await adminClient
    .from('sessions')
    .select('id, practitioner_id, status, duration_minutes, service_date, rate')
    .in('practitioner_id', allIds)
    .gte('service_date', start)
    .lte('service_date', end)
  const sessions = (rawSessions ?? []) as unknown as SessionSlice[]

  // Invoices in date range
  type InvoiceSlice = Pick<InvoiceRow, 'id' | 'practitioner_id' | 'total_cents' | 'status' | 'invoice_number' | 'created_at'>
  const { data: rawInvoices } = await adminClient
    .from('invoices')
    .select('id, practitioner_id, total_cents, status, invoice_number, created_at')
    .in('practitioner_id', allIds)
    .gte('created_at', `${start}T00:00:00.000Z`)
    .lte('created_at', `${end}T23:59:59.999Z`)
  const invoices = (rawInvoices ?? []) as unknown as InvoiceSlice[]

  // Per-practitioner metrics
  const metrics: PractitionerMetrics[] = allIds.map(id => {
    const ps = sessions.filter(s => s.practitioner_id === id)
    const pi = invoices.filter(i => i.practitioner_id === id)

    const completed = ps.filter(s => s.status === 'completed')
    const scheduled = ps.filter(s => s.status === 'scheduled')
    const cancelled = ps.filter(s => s.status === 'cancelled')
    const billableMinutes = completed.reduce((sum, s) => sum + (s.duration_minutes ?? 0), 0)
    const totalInvoicedCents = pi
      .filter(i => i.status !== 'cancelled')
      .reduce((sum, i) => sum + (i.total_cents ?? 0), 0)
    const lastActivityDate = ps.length > 0
      ? ps.map(s => s.service_date).sort().at(-1) ?? null
      : null
    const completionRate = ps.length > 0
      ? Math.round((completed.length / ps.length) * 100)
      : 0

    return {
      id,
      name: memberMap[id]?.name ?? 'Unknown',
      role: memberMap[id]?.role ?? 'practitioner',
      totalSessions: ps.length,
      completedSessions: completed.length,
      scheduledSessions: scheduled.length,
      cancelledSessions: cancelled.length,
      totalInvoicedCents,
      billableMinutes,
      lastActivityDate,
      completionRate,
    }
  })

  // Activity feed (not date-filtered — shows most recent events overall)
  const activityEvents: ActivityEvent[] = []

  try {
    const { data: recentSessions } = await adminClient
      .from('sessions')
      .select('id, service_date, updated_at, practitioner_id, clients!sessions_client_id_fkey(first_name, last_name)')
      .in('practitioner_id', allIds)
      .eq('status', 'completed')
      .order('updated_at', { ascending: false })
      .limit(8)

    for (const s of recentSessions ?? []) {
      const cl = (s as Record<string, unknown>).clients as { first_name: string; last_name: string } | null
      const clientName = cl ? `${cl.first_name} ${cl.last_name}` : 'a client'
      activityEvents.push({
        id: `sess-${s.id}`,
        kind: 'session_completed',
        label: `Session completed for ${clientName}`,
        sub: `${memberMap[s.practitioner_id]?.name ?? 'Unknown'} · ${formatDateShort(s.updated_at)}`,
        timestamp: s.updated_at,
      })
    }
  } catch { /* non-fatal */ }

  try {
    const { data: recentInvoices } = await adminClient
      .from('invoices')
      .select('id, invoice_number, total_cents, created_at, practitioner_id')
      .in('practitioner_id', allIds)
      .order('created_at', { ascending: false })
      .limit(8)

    for (const inv of recentInvoices ?? []) {
      const amount = ((inv.total_cents ?? 0) / 100).toFixed(2)
      activityEvents.push({
        id: `inv-${inv.id}`,
        kind: 'invoice_created',
        label: `Invoice ${inv.invoice_number} created`,
        sub: `${memberMap[inv.practitioner_id]?.name ?? 'Unknown'} · $${amount} · ${formatDateShort(inv.created_at)}`,
        timestamp: inv.created_at,
      })
    }
  } catch { /* non-fatal */ }

  try {
    const { data: recentNotifs } = await adminClient
      .from('session_notifications')
      .select('id, type, recipient_name, created_at, practitioner_id')
      .in('practitioner_id', allIds)
      .eq('status', 'sent')
      .order('created_at', { ascending: false })
      .limit(8)

    for (const n of recentNotifs ?? []) {
      const notifLabel = n.type === 'confirmation'
        ? `Confirmation sent to ${n.recipient_name ?? 'client'}`
        : `Reminder sent to ${n.recipient_name ?? 'client'}`
      activityEvents.push({
        id: `notif-${n.id}`,
        kind: 'notification_sent',
        label: notifLabel,
        sub: `${memberMap[n.practitioner_id]?.name ?? 'Unknown'} · ${formatDateShort(n.created_at)}`,
        timestamp: n.created_at,
      })
    }
  } catch { /* non-fatal */ }

  try {
    const { data: recentMembers } = await adminClient
      .from('clinic_memberships')
      .select('id, created_at, invited_name, invited_email, role')
      .eq('clinic_id', practitioner.id)
      .order('created_at', { ascending: false })
      .limit(5)

    for (const m of recentMembers ?? []) {
      const who = m.invited_name ?? m.invited_email ?? 'Unknown'
      activityEvents.push({
        id: `mem-${m.id}`,
        kind: 'member_invited',
        label: `Team member invited: ${who}`,
        sub: `${m.role} · ${formatDateShort(m.created_at)}`,
        timestamp: m.created_at,
      })
    }
  } catch { /* migration 016 not yet applied */ }

  const activityFeed = activityEvents
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 20)

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <OperationsClient
        range={range}
        dateLabel={dateLabel}
        metrics={metrics}
        activityFeed={activityFeed}
      />
    </div>
  )
}
