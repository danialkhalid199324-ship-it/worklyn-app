import type { Metadata } from 'next'
import { requireAuthWithPractitioner } from '@/lib/auth'
import { getCommandCentreData, type Period } from '@/lib/reports'
import ReportsDashboard from './ReportsDashboard'

export const metadata: Metadata = { title: 'Reports' }

const VALID_PERIODS: Period[] = ['this_month', 'last_month', 'last_3_months', 'this_year']

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: { period?: string }
}) {
  const { practitioner } = await requireAuthWithPractitioner()

  const period: Period = VALID_PERIODS.includes(searchParams.period as Period)
    ? (searchParams.period as Period)
    : 'this_month'

  const data = await getCommandCentreData(practitioner.id, period)

  return <ReportsDashboard data={data} currentPeriod={period} />
}
