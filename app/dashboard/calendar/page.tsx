import type { Metadata } from 'next'
import { requireAuth } from '@/lib/auth'
import { getPractitionerByUserId, getClients, getServices, getSessionsForDateRange } from '@/lib/db'
import CalendarClient from './CalendarClient'

export const metadata: Metadata = { title: 'Calendar' }

// All date arithmetic works on plain YYYY-MM-DD strings using Date.UTC so
// there is no local-timezone conversion (toISOString always returns UTC).

function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}

function mondayOf(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  const dow = date.getUTCDay() // 0 = Sun, 1 = Mon …
  const offset = dow === 0 ? -6 : 1 - dow
  date.setUTCDate(date.getUTCDate() + offset)
  return date.toISOString().slice(0, 10)
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: { week?: string }
}) {
  const user = await requireAuth()
  const practitioner = await getPractitionerByUserId(user.id)

  // If the client passed ?week=YYYY-MM-DD we trust it (already a Monday).
  // Otherwise derive Monday from the current UTC date.
  const todayUTC = new Date().toISOString().slice(0, 10)
  const from = searchParams.week ?? mondayOf(todayUTC)
  const to = addDays(from, 6)

  const [sessions, clients, services] = await Promise.all([
    getSessionsForDateRange(practitioner.id, from, to),
    getClients(practitioner.id),
    getServices(practitioner.id),
  ])

  return (
    <CalendarClient
      sessions={sessions}
      clients={clients}
      services={services}
      weekStart={from}
    />
  )
}
