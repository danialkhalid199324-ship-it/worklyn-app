import type { Metadata } from 'next'
import { requireAuth } from '@/lib/auth'
import { getPractitionerByUserId, getClients, getSessions, getServices, getNdisPriceGuide } from '@/lib/db'
import SessionsClient from './SessionsClient'

export const metadata: Metadata = { title: 'Sessions' }

export default async function SessionsPage() {
  const user = await requireAuth()
  const practitioner = await getPractitionerByUserId(user.id)

  const [sessions, clients, services] = await Promise.all([
    getSessions(practitioner.id, 200),
    getClients(practitioner.id),
    getServices(practitioner.id),
  ])

  const supportNums = Array.from(new Set(
    services.map((s) => s.support_item_number).filter((n): n is string => n !== null),
  ))
  const priceGuide = await getNdisPriceGuide(supportNums)

  return <SessionsClient sessions={sessions} clients={clients} services={services} priceGuide={priceGuide} />
}
