import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import { getPractitionerByUserId, getInvoiceById, getOrgSettings, getSessionsByInvoice, getClients } from '@/lib/db'
import InvoiceDetailClient from './InvoiceDetailClient'
import type { ClientRow, InvoiceItemRow } from '@/types/database'

export const metadata: Metadata = { title: 'Invoice' }

export default async function InvoiceDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const { id } = params
  const user = await requireAuth()
  const practitioner = await getPractitionerByUserId(user.id)

  let invoice
  try {
    invoice = await getInvoiceById(practitioner.id, id)
  } catch (err) {
    console.error('[InvoiceDetail] fetch error for id', id, ':', err)
    notFound()
  }

  const [orgSettings, sessions, clients] = await Promise.all([
    getOrgSettings(practitioner.id),
    getSessionsByInvoice(practitioner.id, id).catch(() => []),
    getClients(practitioner.id),
  ])

  return (
    <InvoiceDetailClient
      invoice={invoice as typeof invoice & { invoice_items: InvoiceItemRow[]; clients: ClientRow | null }}
      orgSettings={orgSettings}
      practitioner={practitioner}
      sessions={sessions}
      clients={clients}
    />
  )
}
