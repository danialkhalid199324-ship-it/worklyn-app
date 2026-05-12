import type { Metadata } from 'next'
import { requireAuthWithPractitioner } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getPeriodDates, type Period } from '@/lib/reports'
import ReportsDashboard from './ReportsDashboard'

export const metadata: Metadata = { title: 'Reports' }

const VALID_PERIODS: Period[] = ['this_month', 'last_month', 'last_3_months', 'this_year']

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: { period?: string }
}) {
  const { practitioner } = await requireAuthWithPractitioner()
  const supabase = await createServerSupabaseClient()
  const pid = practitioner.id

  const period: Period = VALID_PERIODS.includes(searchParams.period as Period)
    ? (searchParams.period as Period)
    : 'this_month'

  const { from, to } = getPeriodDates(period)

  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  const [
    overdueRes,
    activeClientsRes,
    totalClientsRes,
    periodSessionsRes,
    allInvoicesRes,
    revenueMonthRes,
  ] = await Promise.all([
    supabase.from('invoices').select('total_cents')
      .eq('practitioner_id', pid).eq('status', 'overdue'),

    supabase.from('clients').select('id', { count: 'exact', head: true })
      .eq('practitioner_id', pid).eq('is_active', true),

    supabase.from('clients').select('id', { count: 'exact', head: true })
      .eq('practitioner_id', pid),

    supabase.from('sessions').select('id, status')
      .eq('practitioner_id', pid).gte('service_date', from).lte('service_date', to),

    supabase.from('invoices').select('status, total_cents')
      .eq('practitioner_id', pid),

    supabase.from('invoices').select('total_cents')
      .eq('practitioner_id', pid).eq('status', 'paid').gte('paid_at', monthStart),
  ])

  const overdueInvoices = (overdueRes.data ?? []) as { total_cents: number }[]
  const overdueCount = overdueInvoices.length
  const overdueTotalCents = overdueInvoices.reduce((s, r) => s + r.total_cents, 0)

  const allInvoices = (allInvoicesRes.data ?? []) as { status: string; total_cents: number }[]
  const totalPaidCents = allInvoices.filter(r => r.status === 'paid').reduce((s, r) => s + r.total_cents, 0)
  const totalOutstandingCents = allInvoices
    .filter(r => ['sent', 'overdue'].includes(r.status))
    .reduce((s, r) => s + r.total_cents, 0)

  const periodSessions = (periodSessionsRes.data ?? []) as { id: string; status: string }[]

  const preview = {
    overdue: { count: overdueCount, totalCents: overdueTotalCents },
    clients: {
      active: activeClientsRes.count ?? 0,
      total: totalClientsRes.count ?? 0,
    },
    sessions: {
      completed: periodSessions.filter(s => s.status === 'completed').length,
      total: periodSessions.length,
    },
    financial: {
      totalPaidCents,
      totalOutstandingCents,
      overdueCount,
      revenueMonthCents: (revenueMonthRes.data ?? []).reduce(
        (s, r) => s + (r as { total_cents: number }).total_cents, 0
      ),
    },
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Reports</h1>
        <p className="mt-0.5 text-sm text-gray-500">Choose a report, preview key metrics, and export as CSV.</p>
      </div>
      <ReportsDashboard preview={preview} currentPeriod={period} />
    </div>
  )
}
