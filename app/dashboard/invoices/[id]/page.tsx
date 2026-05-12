import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { requireAuthWithPractitioner } from '@/lib/auth'
import { getInvoiceById, getOrgSettings, getSessionsByInvoice, getClients } from '@/lib/db'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import InvoiceDetailClient from './InvoiceDetailClient'
import type { ClientRow, InvoiceAuditLogRow, InvoiceItemRow } from '@/types/database'

export const metadata: Metadata = { title: 'Invoice' }

export default async function InvoiceDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const { id } = params
  const { practitioner } = await requireAuthWithPractitioner()

  let invoice
  try {
    invoice = await getInvoiceById(practitioner.id, id)
  } catch (err) {
    console.error('[InvoiceDetail] fetch error for id', id, ':', err)
    notFound()
  }

  const supabase = await createServerSupabaseClient()
  const [orgSettings, sessions, clients, auditLogResult] = await Promise.all([
    getOrgSettings(practitioner.id),
    getSessionsByInvoice(practitioner.id, id).catch(() => []),
    getClients(practitioner.id),
    supabase
      .from('invoice_audit_log')
      .select('*')
      .eq('invoice_id', id)
      .eq('practitioner_id', practitioner.id)
      .order('edited_at', { ascending: false })
      .limit(20),
  ])

  const auditLog = (auditLogResult.data ?? []) as unknown as InvoiceAuditLogRow[]

  return (
    <InvoiceDetailClient
      invoice={invoice as typeof invoice & { invoice_items: InvoiceItemRow[]; clients: ClientRow | null }}
      orgSettings={orgSettings}
      practitioner={practitioner}
      sessions={sessions}
      clients={clients}
      auditLog={auditLog}
    />
  )
}
