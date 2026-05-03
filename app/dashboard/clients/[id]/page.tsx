import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { requireAuth } from '@/lib/auth'
import {
  getPractitionerByUserId,
  getClientById,
  getClientEvents,
  getClientInvoices,
  getClientSessionNotes,
} from '@/lib/db'
import ClientDetailTabs from './ClientDetailTabs'

interface Props {
  params: { id: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: 'Client Profile' }
}

export default async function ClientDetailPage({ params }: Props) {
  const user = await requireAuth()
  const practitioner = await getPractitionerByUserId(user.id)

  let client
  try {
    client = await getClientById(practitioner.id, params.id)
  } catch {
    notFound()
  }

  const [events, invoices, sessionNotes] = await Promise.all([
    getClientEvents(practitioner.id, params.id),
    getClientInvoices(practitioner.id, params.id),
    getClientSessionNotes(practitioner.id, params.id),
  ])

  return (
    <ClientDetailTabs
      client={client}
      events={events}
      invoices={invoices}
      sessionNotes={sessionNotes}
    />
  )
}
