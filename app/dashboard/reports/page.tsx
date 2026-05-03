import type { Metadata } from 'next'
import { requireAuth } from '@/lib/auth'
import { getPractitionerByUserId } from '@/lib/db'
import { getReportData, type Period } from '@/lib/reports'
import ReportsDashboard from './ReportsDashboard'

export const metadata: Metadata = { title: 'Reports' }

const VALID_PERIODS: Period[] = ['this_month', 'last_month', 'last_3_months', 'this_year']

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: { period?: string }
}) {
  const user = await requireAuth()
  const practitioner = await getPractitionerByUserId(user.id)

  const period: Period = VALID_PERIODS.includes(searchParams.period as Period)
    ? (searchParams.period as Period)
    : 'this_month'

  const data = await getReportData(practitioner.id, period)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Reports</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Business insights for your practice — {data.period.label}.
        </p>
      </div>
      <ReportsDashboard data={data} currentPeriod={period} />
    </div>
  )
}
