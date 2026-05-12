import type { Metadata } from 'next'
import { requireAuthWithPractitioner } from '@/lib/auth'
import { getClients } from '@/lib/db'
import ClientsClient from './ClientsClient'

export const metadata: Metadata = { title: 'Clients' }

export default async function ClientsPage() {
  const { practitioner } = await requireAuthWithPractitioner()
  const clients = await getClients(practitioner.id)

  return <ClientsClient clients={clients} />
}
