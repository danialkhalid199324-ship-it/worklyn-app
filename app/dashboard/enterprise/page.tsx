import type { Metadata } from 'next'
import { requireAuthWithPractitioner } from '@/lib/auth'
import { getEnterpriseData, type Period } from '@/lib/enterprise'
import EnterpriseDashboard from './EnterpriseDashboard'

export const metadata: Metadata = { title: 'Enterprise Command Centre' }

const VALID_PERIODS: Period[] = ['today', 'this_week', 'this_month', 'last_month', 'last_3_months', 'this_year']

export default async function EnterprisePage({
  searchParams,
}: {
  searchParams: { period?: string }
}) {
  const { practitioner } = await requireAuthWithPractitioner()

  const period: Period = VALID_PERIODS.includes(searchParams.period as Period)
    ? (searchParams.period as Period)
    : 'this_month'

  const name = practitioner.display_name ?? `${practitioner.first_name} ${practitioner.last_name}`

  const data = await getEnterpriseData(practitioner.id, name, period)

  return <EnterpriseDashboard data={data} currentPeriod={period} />
}
