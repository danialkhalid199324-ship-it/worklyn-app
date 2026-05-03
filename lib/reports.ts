import { createServerSupabaseClient } from './supabase-server'
import type { InvoiceRow, ClientRow } from '@/types/database'

// ---------------------------------------------------------------------------
// Period
// ---------------------------------------------------------------------------

export type Period = 'this_month' | 'last_month' | 'last_3_months' | 'this_year'

export function getPeriodDates(period: Period): { from: string; to: string; label: string } {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth() // 0-indexed
  const p = (n: number) => String(n).padStart(2, '0')

  switch (period) {
    case 'this_month': {
      const from = `${y}-${p(m + 1)}-01`
      const to = `${y}-${p(m + 1)}-${p(new Date(y, m + 1, 0).getDate())}`
      return { from, to, label: now.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' }) }
    }
    case 'last_month': {
      const lm = m === 0 ? 11 : m - 1
      const ly = m === 0 ? y - 1 : y
      const from = `${ly}-${p(lm + 1)}-01`
      const to = `${ly}-${p(lm + 1)}-${p(new Date(ly, lm + 1, 0).getDate())}`
      return { from, to, label: new Date(ly, lm).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' }) }
    }
    case 'last_3_months': {
      const d = new Date(y, m - 2, 1)
      const from = `${d.getFullYear()}-${p(d.getMonth() + 1)}-01`
      const to = `${y}-${p(m + 1)}-${p(new Date(y, m + 1, 0).getDate())}`
      return { from, to, label: 'Last 3 months' }
    }
    case 'this_year':
      return { from: `${y}-01-01`, to: `${y}-12-31`, label: `Year ${y}` }
  }
}

// ---------------------------------------------------------------------------
// Report data types — all serialisable (safe to pass server → client as props)
// ---------------------------------------------------------------------------

export type ChartBar = { label: string; amountCents: number }

export type DashboardMetrics = {
  totalRevenueCents: number
  completedSessions: number
  newClients: number
  avgSessionValueCents: number
  chartBars: ChartBar[]
}

export type RevenueReportData = {
  byService: { name: string; amountCents: number; count: number }[]
  byClient: { name: string; amountCents: number }[]
  byMonth: { month: string; amountCents: number }[]
  paidCents: number
  unpaidCents: number
}

export type SessionsReportData = {
  total: number
  completed: number
  cancelled: number
  scheduled: number
  completionRate: number
  byService: { name: string; total: number; completed: number }[]
}

export type ClientsReportData = {
  totalActive: number
  newInPeriod: number
  inactive: number
  topByRevenue: { name: string; amountCents: number }[]
  withOutstanding: { name: string; amountCents: number }[]
}

export type InvoicesReportData = {
  draft: number
  sent: number
  paid: number
  overdue: number
  cancelled: number
  totalOutstandingCents: number
  totalPaidCents: number
  avgDaysToPay: number | null
}

export type AllReportData = {
  period: { from: string; to: string; label: string }
  dashboard: DashboardMetrics
  revenue: RevenueReportData
  sessions: SessionsReportData
  clients: ClientsReportData
  invoices: InvoicesReportData
}

// ---------------------------------------------------------------------------
// Internal shapes for Supabase join results
// ---------------------------------------------------------------------------

type SessShape = {
  id: string
  service_date: string
  status: string
  rate: number
  duration_minutes: number
  invoice_id: string | null
  client_id: string
  service_id: string | null
  clients: { first_name: string; last_name: string } | null
  services: { name: string } | null
}

type InvShape = InvoiceRow & {
  clients: { first_name: string; last_name: string } | null
}

type ClientShape = Pick<ClientRow, 'id' | 'first_name' | 'last_name' | 'is_active' | 'created_at'>

// ---------------------------------------------------------------------------
// Main report query — called from the server component only
// ---------------------------------------------------------------------------

export async function getReportData(
  practitionerId: string,
  period: Period,
): Promise<AllReportData> {
  const { from, to, label } = getPeriodDates(period)
  const supabase = await createServerSupabaseClient()

  const fromDate = new Date(from + 'T00:00:00Z')
  const toDate = new Date(to + 'T23:59:59Z')

  const [sessRes, invRes, clientRes, allSessRes] = await Promise.all([
    supabase
      .from('sessions')
      .select(
        'id, service_date, status, rate, duration_minutes, invoice_id, client_id, service_id, clients(first_name, last_name), services(name)',
      )
      .eq('practitioner_id', practitionerId)
      .gte('service_date', from)
      .lte('service_date', to),
    supabase
      .from('invoices')
      .select('*, clients(first_name, last_name)')
      .eq('practitioner_id', practitionerId),
    supabase
      .from('clients')
      .select('id, first_name, last_name, is_active, created_at')
      .eq('practitioner_id', practitionerId),
    supabase
      .from('sessions')
      .select('client_id, service_date')
      .eq('practitioner_id', practitionerId)
      .eq('status', 'completed'),
  ])

  const periodSessions = (sessRes.data ?? []) as unknown as SessShape[]
  const allInvoices = (invRes.data ?? []) as unknown as InvShape[]
  const allClients = (clientRes.data ?? []) as unknown as ClientShape[]
  const allCompletedSessions = (allSessRes.data ?? []) as unknown as {
    client_id: string
    service_date: string
  }[]

  // Helpers for date range filtering of ISO timestamps
  const inPeriod = (ts: string | null): boolean => {
    if (!ts) return false
    const d = new Date(ts)
    return d >= fromDate && d <= toDate
  }

  // Paid invoices within the period (by paid_at)
  const paidInPeriod = allInvoices.filter(
    (inv) => inv.status === 'paid' && inPeriod(inv.paid_at),
  )

  // Invoices issued within the period
  const issuedInPeriod = allInvoices.filter((inv) =>
    inPeriod(inv.issued_at ?? inv.created_at),
  )

  // ---- Dashboard metrics ----
  const totalRevenueCents = paidInPeriod.reduce((s, inv) => s + inv.total_cents, 0)
  const completedSessions = periodSessions.filter((s) => s.status === 'completed').length
  const newClients = allClients.filter((c) => inPeriod(c.created_at)).length
  const avgSessionValueCents =
    completedSessions > 0 ? Math.round(totalRevenueCents / completedSessions) : 0

  // Chart: daily if span ≤ 31 days, monthly otherwise
  const spanDays =
    Math.ceil((new Date(to).getTime() - new Date(from).getTime()) / 86_400_000) + 1
  const useMonthly = spanDays > 31

  const chartMap: Record<string, number> = {}
  paidInPeriod.forEach((inv) => {
    const key = (inv.paid_at ?? inv.created_at).slice(0, useMonthly ? 7 : 10)
    chartMap[key] = (chartMap[key] ?? 0) + inv.total_cents
  })

  const chartBars: ChartBar[] = []
  if (useMonthly) {
    const cur = new Date(from.slice(0, 7) + '-01T12:00:00Z')
    const end = new Date(to.slice(0, 7) + '-01T12:00:00Z')
    while (cur <= end) {
      const key = cur.toISOString().slice(0, 7)
      chartBars.push({
        label: new Date(key + '-01T12:00:00Z').toLocaleDateString('en-AU', {
          month: 'short',
          year: '2-digit',
        }),
        amountCents: chartMap[key] ?? 0,
      })
      cur.setUTCMonth(cur.getUTCMonth() + 1)
    }
  } else {
    const cur = new Date(from + 'T12:00:00Z')
    const end = new Date(to + 'T12:00:00Z')
    while (cur <= end) {
      const key = cur.toISOString().slice(0, 10)
      chartBars.push({
        label: new Date(key + 'T12:00:00Z').toLocaleDateString('en-AU', {
          day: 'numeric',
          month: 'short',
        }),
        amountCents: chartMap[key] ?? 0,
      })
      cur.setUTCDate(cur.getUTCDate() + 1)
    }
  }

  // ---- Revenue report ----
  const paidInvoiceIds = new Set(
    allInvoices.filter((inv) => inv.status === 'paid').map((inv) => inv.id),
  )

  const serviceRevMap: Record<string, { name: string; amountCents: number; count: number }> = {}
  periodSessions
    .filter((s) => s.invoice_id && paidInvoiceIds.has(s.invoice_id))
    .forEach((s) => {
      const name = s.services?.name ?? 'Unspecified service'
      const amountCents = Math.round(s.rate * (s.duration_minutes / 60) * 100)
      if (!serviceRevMap[name]) serviceRevMap[name] = { name, amountCents: 0, count: 0 }
      serviceRevMap[name].amountCents += amountCents
      serviceRevMap[name].count += 1
    })

  const clientRevMap: Record<string, { name: string; amountCents: number }> = {}
  const monthRevMap: Record<string, number> = {}
  paidInPeriod.forEach((inv) => {
    const name = inv.clients
      ? `${inv.clients.first_name} ${inv.clients.last_name}`
      : 'Unknown client'
    if (!clientRevMap[name]) clientRevMap[name] = { name, amountCents: 0 }
    clientRevMap[name].amountCents += inv.total_cents
    const month = (inv.paid_at ?? inv.created_at).slice(0, 7)
    monthRevMap[month] = (monthRevMap[month] ?? 0) + inv.total_cents
  })

  const unpaidStatuses = new Set(['draft', 'sent', 'overdue'])
  const unpaidCents = issuedInPeriod
    .filter((inv) => unpaidStatuses.has(inv.status))
    .reduce((s, inv) => s + inv.total_cents, 0)

  // ---- Sessions report ----
  const completed = periodSessions.filter((s) => s.status === 'completed').length
  const cancelled = periodSessions.filter((s) => s.status === 'cancelled').length
  const scheduled = periodSessions.filter((s) => s.status === 'scheduled').length
  const completionRate =
    completed + cancelled > 0 ? Math.round((completed / (completed + cancelled)) * 100) : 0

  const sessServiceMap: Record<string, { name: string; total: number; completed: number }> = {}
  periodSessions.forEach((s) => {
    const name = s.services?.name ?? 'Unspecified service'
    if (!sessServiceMap[name]) sessServiceMap[name] = { name, total: 0, completed: 0 }
    sessServiceMap[name].total += 1
    if (s.status === 'completed') sessServiceMap[name].completed += 1
  })

  // ---- Clients report ----
  const totalActive = allClients.filter((c) => c.is_active).length

  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
  const ninetyStr = ninetyDaysAgo.toISOString().slice(0, 10)

  const lastSessDate: Record<string, string> = {}
  allCompletedSessions.forEach(({ client_id, service_date }) => {
    if (!lastSessDate[client_id] || service_date > lastSessDate[client_id]) {
      lastSessDate[client_id] = service_date
    }
  })

  const inactive = allClients.filter((c) => {
    const last = lastSessDate[c.id]
    return !last || last < ninetyStr
  }).length

  const clientRevAll: Record<string, number> = {}
  allInvoices
    .filter((inv) => inv.status === 'paid')
    .forEach((inv) => {
      clientRevAll[inv.client_id] = (clientRevAll[inv.client_id] ?? 0) + inv.total_cents
    })

  const topByRevenue = allClients
    .filter((c) => clientRevAll[c.id])
    .map((c) => ({ name: `${c.first_name} ${c.last_name}`, amountCents: clientRevAll[c.id] }))
    .sort((a, b) => b.amountCents - a.amountCents)
    .slice(0, 8)

  const clientOutstanding: Record<string, number> = {}
  allInvoices
    .filter((inv) => ['sent', 'overdue'].includes(inv.status))
    .forEach((inv) => {
      clientOutstanding[inv.client_id] =
        (clientOutstanding[inv.client_id] ?? 0) + inv.total_cents
    })

  const withOutstanding = allClients
    .filter((c) => clientOutstanding[c.id])
    .map((c) => ({
      name: `${c.first_name} ${c.last_name}`,
      amountCents: clientOutstanding[c.id],
    }))
    .sort((a, b) => b.amountCents - a.amountCents)

  // ---- Invoice report ----
  const invByStatus = (s: string) => allInvoices.filter((inv) => inv.status === s).length

  const totalOutstandingCents = allInvoices
    .filter((inv) => ['sent', 'overdue'].includes(inv.status))
    .reduce((s, inv) => s + inv.total_cents, 0)

  const totalPaidCents = allInvoices
    .filter((inv) => inv.status === 'paid')
    .reduce((s, inv) => s + inv.total_cents, 0)

  const paidWithDates = allInvoices.filter(
    (inv) => inv.status === 'paid' && inv.paid_at && inv.issued_at,
  )
  let avgDaysToPay: number | null = null
  if (paidWithDates.length > 0) {
    const totalDays = paidWithDates.reduce((sum, inv) => {
      const diff =
        new Date(inv.paid_at as string).getTime() -
        new Date(inv.issued_at as string).getTime()
      return sum + Math.max(0, Math.round(diff / 86_400_000))
    }, 0)
    avgDaysToPay = Math.round(totalDays / paidWithDates.length)
  }

  return {
    period: { from, to, label },
    dashboard: {
      totalRevenueCents,
      completedSessions,
      newClients,
      avgSessionValueCents,
      chartBars,
    },
    revenue: {
      byService: Object.values(serviceRevMap).sort((a, b) => b.amountCents - a.amountCents),
      byClient: Object.values(clientRevMap).sort((a, b) => b.amountCents - a.amountCents),
      byMonth: Object.entries(monthRevMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, amountCents]) => ({
          month: new Date(month + '-01T12:00:00Z').toLocaleDateString('en-AU', {
            month: 'short',
            year: 'numeric',
          }),
          amountCents,
        })),
      paidCents: totalRevenueCents,
      unpaidCents,
    },
    sessions: {
      total: periodSessions.length,
      completed,
      cancelled,
      scheduled,
      completionRate,
      byService: Object.values(sessServiceMap).sort((a, b) => b.total - a.total),
    },
    clients: {
      totalActive,
      newInPeriod: newClients,
      inactive,
      topByRevenue,
      withOutstanding,
    },
    invoices: {
      draft: invByStatus('draft'),
      sent: invByStatus('sent'),
      paid: invByStatus('paid'),
      overdue: invByStatus('overdue'),
      cancelled: invByStatus('cancelled'),
      totalOutstandingCents,
      totalPaidCents,
      avgDaysToPay,
    },
  }
}
