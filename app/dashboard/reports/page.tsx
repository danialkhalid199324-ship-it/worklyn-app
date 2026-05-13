import type { Metadata } from 'next'
import { requireAuthWithPractitioner } from '@/lib/auth'
import { getCommandCentreData, getReportData, type Period } from '@/lib/reports'
import ReportsDashboard from './ReportsDashboard'

export const metadata: Metadata = { title: 'Reports' }

const VALID_PERIODS: Period[] = ['today', 'this_week', 'this_month', 'last_month', 'last_3_months', 'this_year']

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: { period?: string }
}) {
  const { practitioner } = await requireAuthWithPractitioner()

  const period: Period = VALID_PERIODS.includes(searchParams.period as Period)
    ? (searchParams.period as Period)
    : 'this_month'

  const [data, reportData] = await Promise.all([
    getCommandCentreData(practitioner.id, period),
    getReportData(practitioner.id, period),
  ])

  return <ReportsDashboard data={data} reportData={reportData} currentPeriod={period} />
}
