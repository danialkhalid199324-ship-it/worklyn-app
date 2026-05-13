import type { Metadata } from 'next'
import { requireAuthWithPractitioner } from '@/lib/auth'
import { getInvoices, getClients, getOrgSettings } from '@/lib/db'
import { getNextInvoiceNumber } from '@/app/actions/invoices'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import InvoicesClient from './InvoicesClient'

export const metadata: Metadata = { title: 'Invoices' }

type InvoiceFilterStatus = 'all' | 'draft' | 'sent' | 'overdue' | 'paid' | 'cancelled'
const VALID_INVOICE_FILTERS: InvoiceFilterStatus[] = ['all', 'draft', 'sent', 'overdue', 'paid', 'cancelled']

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: { filter?: string }
}) {
  const { practitioner } = await requireAuthWithPractitioner()
  const defaultFilter: InvoiceFilterStatus = VALID_INVOICE_FILTERS.includes(searchParams.filter as InvoiceFilterStatus)
    ? (searchParams.filter as InvoiceFilterStatus)
    : 'all'

  // Auto-mark overdue: flip sent invoices whose due_at has passed.
  // Runs on every page load — safe, targeted, no side-effects on other fields.
  try {
    const supabase = await createServerSupabaseClient()
    const todayIso = new Date().toISOString()
    await supabase
      .from('invoices')
      .update({ status: 'overdue' })
      .eq('practitioner_id', practitioner.id)
      .eq('status', 'sent')
      .lt('due_at', todayIso)
  } catch { /* non-fatal — page still renders with stale status */ }

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
  let awaitingRemittanceCents = 0
  let awaitingRemittanceCount = 0

  for (const inv of invoices) {
    if (inv.status === 'draft') {
      draftCount++
    } else if (inv.status === 'sent') {
      outstandingCents += inv.total_cents
      outstandingCount++
    } else if (inv.status === 'overdue') {
      overdueCents += inv.total_cents
      overdueCount++
    } else if (inv.status === 'paid') {
      if (inv.paid_at && inv.paid_at >= monthStart) {
        paidThisMonthCents += inv.total_cents
        paidThisMonthCount++
      }
      // Paid but remittance not yet received
      if (!inv.remittance_received_at) {
        awaitingRemittanceCents += inv.total_cents
        awaitingRemittanceCount++
      }
    }
  }

  return (
    <InvoicesClient
      invoices={invoices as Parameters<typeof InvoicesClient>[0]['invoices']}
      clients={clients}
      nextInvoiceNumber={nextInvoiceNumber}
      orgSettings={orgSettings}
      defaultFilter={defaultFilter}
      stats={{
        outstandingCents,
        outstandingCount,
        paidThisMonthCents,
        paidThisMonthCount,
        overdueCents,
        overdueCount,
        draftCount,
        awaitingRemittanceCents,
        awaitingRemittanceCount,
      }}
    />
  )
}
