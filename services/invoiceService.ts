import { createClient } from '@/lib/supabase'
import type { InsertInvoice, InsertInvoiceItem, UpdateInvoice } from '@/types/database'

export async function createInvoice(
  invoice: InsertInvoice,
  items: InsertInvoiceItem[],
) {
  const supabase = createClient()

  const { data: created, error: invoiceError } = await supabase
    .from('invoices')
    .insert(invoice)
    .select()
    .single()
  if (invoiceError) throw invoiceError

  const { error: itemsError } = await supabase
    .from('invoice_items')
    .insert(items.map((item) => ({ ...item, invoice_id: created.id })))
  if (itemsError) throw itemsError

  return created
}

export async function updateInvoiceStatus(id: string, payload: UpdateInvoice) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('invoices')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function markInvoicePaid(id: string) {
  return updateInvoiceStatus(id, {
    status: 'paid',
    paid_at: new Date().toISOString(),
  })
}
