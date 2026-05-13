import { createServerSupabaseClient } from './supabase-server'
import { getPeriodDates, type Period } from './reports'
export type { Period } from './reports'

export type HealthStatus = 'healthy' | 'watch' | 'action_required'

export type EnterpriseData = {
  period: { from: string; to: string; label: string }
  practitionerName: string

  kpis: {
    revenueInPeriodCents: number
    outstandingCents: number
    overdueCount: number
    overdueCents: number
    complianceOpenItems: number
    remittancePending: number
    completedSessions: number
    completionRate: number
  }

  health: {
    financial: HealthStatus
    compliance: HealthStatus
    workforce: HealthStatus
    clientDoc: HealthStatus
  }

  performance: {
    completed: number
    cancelled: number
    minutesDelivered: number
    completionRate: number
    missingNotes: number
    revenueGeneratedCents: number
  }

  compliance: {
    missingNotes: number
    uninvoicedSessions: number
    missingPaymentRef: number
    clientsWithoutDocs: number
    remittancePending: number
    overdueInvoices: number
  }

  clientRisk: {
    withoutDocs: { id: string; name: string }[]
    withOverdueInvoices: { id: string; name: string; totalCents: number }[]
    withoutUpcomingSessions: { id: string; name: string }[]
    fundingExpiringSoon: { clientId: string; planName: string; daysLeft: number }[]
  }

  automation: {
    sentInPeriod: number
    failedTotal: number
    lastSentAt: string | null
  }
}

function healthStatus(score: number, warnThreshold: number, actionThreshold: number): HealthStatus {
  if (score >= actionThreshold) return 'action_required'
  if (score >= warnThreshold) return 'watch'
  return 'healthy'
}

function daysUntil(dateStr: string): number {
  const target = new Date(`${dateStr}T00:00:00`)
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - d.getTime()) / 86400000)
}

export async function getEnterpriseData(
  practitionerId: string,
  practitionerName: string,
  period: Period,
): Promise<EnterpriseData> {
  const supabase = await createServerSupabaseClient()
  const pid = practitionerId
  const { from, to, label } = getPeriodDates(period)
  const toEnd = `${to}T23:59:59`

  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  const thirtyOut = new Date(now)
  thirtyOut.setDate(thirtyOut.getDate() + 30)
  const thirtyOutStr = thirtyOut.toISOString().slice(0, 10)

  type OverdueInv = { id: string; client_id: string; total_cents: number; clients: { first_name: string; last_name: string } | null }
  type ActiveClient = { id: string; first_name: string; last_name: string }
  type SessionMinutes = { duration_minutes: number }
  type FundingRow = { id: string; client_id: string; plan_name: string; plan_end_date: string }
  type NotifRow = { sent_at: string | null }

  const [
    revenueRes,
    outstandingRes,
    completedCountRes,
    cancelledCountRes,
    sessionMinutesRes,
    missingNotesRes,
    uninvoicedRes,
    missingPaymentRefRes,
    remittancePendingRes,
    overdueInvoicesRes,
    activeClientsRes,
    clientDocsRes,
    upcomingSessionsRes,
    fundingExpiryRes,
    notifSentRes,
    notifFailedRes,
    lastNotifRes,
  ] = await Promise.all([
    supabase.from('invoices').select('total_cents')
      .eq('practitioner_id', pid).eq('status', 'paid')
      .gte('paid_at', from).lte('paid_at', toEnd),

    supabase.from('invoices').select('total_cents, status')
      .eq('practitioner_id', pid).in('status', ['draft', 'sent', 'overdue']),

    supabase.from('sessions').select('id', { count: 'exact', head: true })
      .eq('practitioner_id', pid).eq('status', 'completed')
      .gte('service_date', from).lte('service_date', to),

    supabase.from('sessions').select('id', { count: 'exact', head: true })
      .eq('practitioner_id', pid).eq('status', 'cancelled')
      .gte('service_date', from).lte('service_date', to),

    supabase.from('sessions').select('duration_minutes')
      .eq('practitioner_id', pid).eq('status', 'completed')
      .gte('service_date', from).lte('service_date', to),

    supabase.from('sessions').select('id', { count: 'exact', head: true })
      .eq('practitioner_id', pid).eq('status', 'completed').is('notes', null),

    supabase.from('sessions').select('id', { count: 'exact', head: true })
      .eq('practitioner_id', pid).eq('status', 'completed').is('invoice_id', null),

    supabase.from('invoices').select('id', { count: 'exact', head: true })
      .eq('practitioner_id', pid).eq('status', 'paid').is('payment_reference', null),

    supabase.from('invoices').select('id', { count: 'exact', head: true })
      .eq('practitioner_id', pid).eq('status', 'paid').is('remittance_received_at', null),

    supabase.from('invoices')
      .select('id, client_id, total_cents, clients(first_name, last_name)')
      .eq('practitioner_id', pid).eq('status', 'overdue'),

    supabase.from('clients').select('id, first_name, last_name')
      .eq('practitioner_id', pid).eq('is_active', true),

    supabase.from('client_documents').select('client_id')
      .eq('practitioner_id', pid),

    supabase.from('sessions').select('client_id')
      .eq('practitioner_id', pid).eq('status', 'scheduled')
      .gte('service_date', today),

    supabase.from('client_funding_allocations')
      .select('id, client_id, plan_name, plan_end_date')
      .eq('practitioner_id', pid).eq('is_active', true)
      .lte('plan_end_date', thirtyOutStr)
      .order('plan_end_date'),

    supabase.from('session_notifications').select('id', { count: 'exact', head: true })
      .eq('practitioner_id', pid).eq('status', 'sent')
      .gte('sent_at', from).lte('sent_at', toEnd),

    supabase.from('session_notifications').select('id', { count: 'exact', head: true })
      .eq('practitioner_id', pid).eq('status', 'failed'),

    supabase.from('session_notifications').select('sent_at')
      .eq('practitioner_id', pid).eq('status', 'sent')
      .order('sent_at', { ascending: false }).limit(1),
  ])

  // Revenue
  const revenueInPeriodCents = (revenueRes.data ?? []).reduce(
    (s: number, r: { total_cents: number }) => s + r.total_cents, 0,
  )

  // Outstanding / overdue
  const outstanding = (outstandingRes.data ?? []) as { total_cents: number; status: string }[]
  const outstandingCents = outstanding.reduce((s, r) => s + r.total_cents, 0)
  const overdueRows = outstanding.filter(r => r.status === 'overdue')
  const overdueCents = overdueRows.reduce((s, r) => s + r.total_cents, 0)
  const overdueCount = overdueRows.length

  // Sessions
  const completedSessions = completedCountRes.count ?? 0
  const cancelledSessions = cancelledCountRes.count ?? 0
  const totalAttempted = completedSessions + cancelledSessions
  const completionRate = totalAttempted > 0 ? Math.round((completedSessions / totalAttempted) * 100) : 100

  // Minutes delivered
  const minutesDelivered = (sessionMinutesRes.data ?? []).reduce(
    (s: number, r: SessionMinutes) => s + (r.duration_minutes ?? 0), 0,
  )

  // Compliance counts
  const missingNotes = missingNotesRes.count ?? 0
  const uninvoicedSessions = uninvoicedRes.count ?? 0
  const missingPaymentRef = missingPaymentRefRes.count ?? 0
  const remittancePending = remittancePendingRes.count ?? 0

  // Active clients + docs
  const activeClients = (activeClientsRes.data ?? []) as ActiveClient[]
  const docClientIds = new Set(
    (clientDocsRes.data ?? []).map((r: { client_id: string }) => r.client_id),
  )
  const clientsWithoutDocs = activeClients.filter(c => !docClientIds.has(c.id)).length

  // Compliance total
  const complianceOpenItems = missingNotes + uninvoicedSessions + missingPaymentRef + clientsWithoutDocs

  // Overdue invoices grouped by client
  const overdueInvoices = (overdueInvoicesRes.data ?? []) as unknown as OverdueInv[]
  const overdueByClient = new Map<string, { name: string; totalCents: number }>()
  for (const inv of overdueInvoices) {
    const name = inv.clients
      ? `${inv.clients.first_name} ${inv.clients.last_name}`
      : 'Unknown client'
    const existing = overdueByClient.get(inv.client_id)
    if (existing) {
      existing.totalCents += inv.total_cents
    } else {
      overdueByClient.set(inv.client_id, { name, totalCents: inv.total_cents })
    }
  }

  // Clients without upcoming sessions
  const upcomingClientIds = new Set(
    (upcomingSessionsRes.data ?? []).map((r: { client_id: string }) => r.client_id),
  )
  const withoutUpcomingSessions = activeClients
    .filter(c => !upcomingClientIds.has(c.id))
    .slice(0, 12)
    .map(c => ({ id: c.id, name: `${c.first_name} ${c.last_name}` }))

  // Clients without docs (detail list)
  const withoutDocsList = activeClients
    .filter(c => !docClientIds.has(c.id))
    .slice(0, 12)
    .map(c => ({ id: c.id, name: `${c.first_name} ${c.last_name}` }))

  // With overdue invoices (detail list)
  const withOverdueInvoices = Array.from(overdueByClient.entries())
    .slice(0, 12)
    .map(([id, v]) => ({ id, name: v.name, totalCents: v.totalCents }))

  // Funding expiring soon
  const fundingExpiringSoon = ((fundingExpiryRes.data ?? []) as FundingRow[])
    .slice(0, 8)
    .map(f => ({
      clientId: f.client_id,
      planName: f.plan_name,
      daysLeft: daysUntil(f.plan_end_date),
    }))

  // Automation
  const sentInPeriod = notifSentRes.count ?? 0
  const failedTotal = notifFailedRes.count ?? 0
  const lastNotifRow = ((lastNotifRes.data ?? []) as NotifRow[])[0]
  const lastSentAt = lastNotifRow?.sent_at ?? null

  // Health scores
  const health = {
    financial: healthStatus(overdueCount, 1, 4) as HealthStatus,
    compliance: healthStatus(complianceOpenItems, 1, 5) as HealthStatus,
    workforce: (completionRate >= 90 ? 'healthy' : completionRate >= 70 ? 'watch' : 'action_required') as HealthStatus,
    clientDoc: healthStatus(clientsWithoutDocs, 1, 4) as HealthStatus,
  }

  return {
    period: { from, to, label },
    practitionerName,
    kpis: {
      revenueInPeriodCents,
      outstandingCents,
      overdueCount,
      overdueCents,
      complianceOpenItems,
      remittancePending,
      completedSessions,
      completionRate,
    },
    health,
    performance: {
      completed: completedSessions,
      cancelled: cancelledSessions,
      minutesDelivered,
      completionRate,
      missingNotes,
      revenueGeneratedCents: revenueInPeriodCents,
    },
    compliance: {
      missingNotes,
      uninvoicedSessions,
      missingPaymentRef,
      clientsWithoutDocs,
      remittancePending,
      overdueInvoices: overdueCount,
    },
    clientRisk: {
      withoutDocs: withoutDocsList,
      withOverdueInvoices,
      withoutUpcomingSessions,
      fundingExpiringSoon,
    },
    automation: {
      sentInPeriod,
      failedTotal,
      lastSentAt,
    },
  }
}
