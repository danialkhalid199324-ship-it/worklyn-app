import type { Metadata } from 'next'
import { requireAuth } from '@/lib/auth'
import { getPractitionerByUserId, getInvoices, getClients, getOrgSettings } from '@/lib/db'
import { getNextInvoiceNumber } from '@/app/actions/invoices'
import InvoicesClient from './InvoicesClient'

export const metadata: Metadata = { title: 'Invoices' }

export default async function InvoicesPage() {
  const user = await requireAuth()
  const practitioner = await getPractitionerByUserId(user.id)

  const [invoices, clients, nextInvoiceNumber, orgSettings] = await Promise.all([
    getInvoices(practitioner.id),
    getClients(practitioner.id),
    getNextInvoiceNumber(practitioner.id),
    getOrgSettings(practitioner.id),
  ])

  // Compute summary stats server-side
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  let outstandingCents = 0
  let outstandingCount = 0
  let paidThisMonthCents = 0
  let paidThisMonthCount = 0
  let overdueCents = 0
  let overdueCount = 0
  let draftCount = 0

  for (const inv of invoices) {
    if (inv.status === 'draft') {
      draftCount++
    } else if (inv.status === 'sent') {
      outstandingCents += inv.total_cents
      outstandingCount++
    } else if (inv.status === 'overdue') {
      overdueCents += inv.total_cents
      overdueCount++
    } else if (inv.status === 'paid' && inv.paid_at && inv.paid_at >= monthStart) {
      paidThisMonthCents += inv.total_cents
      paidThisMonthCount++
    }
  }

  return (
    <InvoicesClient
      invoices={invoices as Parameters<typeof InvoicesClient>[0]['invoices']}
      clients={clients}
      nextInvoiceNumber={nextInvoiceNumber}
      orgSettings={orgSettings}
      stats={{
        outstandingCents,
        outstandingCount,
        paidThisMonthCents,
        paidThisMonthCount,
        overdueCents,
        overdueCount,
        draftCount,
      }}
    />
  )
}
