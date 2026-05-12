import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { requireAuthWithPractitioner } from '@/lib/auth'
import { getClientById } from '@/lib/db'
import ClientDetailTabs from './ClientDetailTabs'

interface Props {
  params: { id: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: 'Client Profile' }
}

export default async function ClientDetailPage({ params }: Props) {
  const { practitioner } = await requireAuthWithPractitioner()

  let client
  try {
    client = await getClientById(practitioner.id, params.id)
  } catch {
    notFound()
  }

  return (
    <ClientDetailTabs
      client={client}
      practitionerRole={practitioner.role}
    />
  )
}
