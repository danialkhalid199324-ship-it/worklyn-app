import type { Metadata } from 'next'
import { requireAuth } from '@/lib/auth'
import { getPractitionerByUserId, getClients, getSessions, getServices } from '@/lib/db'
import SessionsClient from './SessionsClient'

export const metadata: Metadata = { title: 'Sessions' }

export default async function SessionsPage() {
  const user = await requireAuth()
  const practitioner = await getPractitionerByUserId(user.id)

  const [sessions, clients, services] = await Promise.all([
    getSessions(practitioner.id),
    getClients(practitioner.id),
    getServices(practitioner.id),
  ])

  return <SessionsClient sessions={sessions} clients={clients} services={services} />
}
