import type { Metadata } from 'next'
import { requireAuth } from '@/lib/auth'
import { getPractitionerByUserId, getClients } from '@/lib/db'
import ClientsClient from './ClientsClient'

export const metadata: Metadata = { title: 'Clients' }

export default async function ClientsPage() {
  const user = await requireAuth()
  const practitioner = await getPractitionerByUserId(user.id)
  const clients = await getClients(practitioner.id)

  return <ClientsClient clients={clients} />
}
