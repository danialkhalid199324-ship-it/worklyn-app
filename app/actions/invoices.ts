'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/auth'
import { getPractitionerByUserId, getClientById, getInvoiceById, getOrgSettings } from '@/lib/db'
import { resolveInvoiceRecipient } from '@/lib/invoice-routing'
import { sendEmail } from '@/lib/email'
import { generateInvoicePdfBuffer } from '@/lib/invoice-pdf'

interface LineItemInput {
  description: string
  quantity: string
  unit_price: string
}

export async function createInvoice(formData: FormData) {
  const user = await requireAuth()
  const practitioner = await getPractitionerByUserId(user.id)
  const supabase = await createServerSupabaseClient()

  const clientId = formData.get('client_id') as string
  if (!clientId) return { error: 'Client is required.' }

  const invoiceNumber = (formData.get('invoice_number') as string).trim()
  if (!invoiceNumber) return { error: 'Invoice number is required.' }

  // Load client to resolve billing recipient
  const client = await getClientById(practitioner.id, clientId)
  if (!client) return { error: 'Client not found.' }
  const recipient = resolveInvoiceRecipient(client)

  // Parse line items from JSON
  let lineItems: LineItemInput[] = []
  try {
    lineItems = JSON.parse((formData.get('line_items') as string) || '[]')
  } catch {
    return { error: 'Invalid line items.' }
  }

  if (!lineItems.length) return { error: 'At least one line item is required.' }

  // Compute totals from line items
  let subtotalCents = 0
  for (const item of lineItems) {
    const qty = parseFloat(item.quantity) || 0
    const priceCents = Math.round(parseFloat(item.unit_price) * 100)
    subtotalCents += Math.round(qty * priceCents)
  }

  const { data: invoice, error: invoiceErr } = await supabase
    .from('invoices')
    .insert({
      practitioner_id: practitioner.id,
      client_id: clientId,
      appointment_id: (formData.get('appointment_id') as string) || null,
      invoice_number: invoiceNumber,
      status: 'draft',
      subtotal_cents: subtotalCents,
      tax_cents: 0,
      total_cents: subtotalCents,
      currency: 'AUD',
      notes: (formData.get('notes') as string)?.trim() || null,
      issued_at: (formData.get('issued_at') as string) || null,
      due_at: (formData.get('due_at') as string) || null,
      ...recipient,
    })
    .select('id')
    .single()

  if (invoiceErr || !invoice) return { error: invoiceErr?.message ?? 'Failed to create invoice.' }

  // Insert line items
  const { error: itemsErr } = await supabase.from('invoice_items').insert(
    lineItems.map((item) => ({
      invoice_id: invoice.id,
      description: item.description.trim(),
      quantity: parseFloat(item.quantity) || 1,
      unit_price_cents: Math.round(parseFloat(item.unit_price) * 100),
    })),
  )

  if (itemsErr) {
    // Roll back the invoice if items failed
    await supabase.from('invoices').delete().eq('id', invoice.id)
    return { error: `Failed to save line items: ${itemsErr.message}` }
  }

  revalidatePath('/dashboard/invoices')
  revalidatePath(`/dashboard/clients/${clientId}`)
  return { success: true, invoiceId: invoice.id }
}

export async function updateInvoiceStatus(
  invoiceId: string,
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled',
) {
  const user = await requireAuth()
  const practitioner = await getPractitionerByUserId(user.id)
  const supabase = await createServerSupabaseClient()

  const update: Record<string, unknown> = { status }
  if (status === 'paid') update.paid_at = new Date().toISOString()

  const { error } = await supabase
    .from('invoices')
    .update(update)
    .eq('id', invoiceId)
    .eq('practitioner_id', practitioner.id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/invoices')
  return { success: true }
}

export async function sendInvoice(invoiceId: string) {
  const user = await requireAuth()
  const practitioner = await getPractitionerByUserId(user.id)
  const supabase = await createServerSupabaseClient()

  const [invoice, orgSettings] = await Promise.all([
    getInvoiceById(practitioner.id, invoiceId),
    getOrgSettings(practitioner.id),
  ])

  if (!invoice.recipient_email) {
    return { error: 'No recipient email address found for this invoice. Update the client\'s billing contact details.' }
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(invoice.recipient_email)) {
    return { error: `Recipient email address "${invoice.recipient_email}" is not valid. Update the client's billing contact details.` }
  }

  const payRef = orgSettings?.payment_reference_prefix
    ? `${orgSettings.payment_reference_prefix}-${invoice.invoice_number}`
    : invoice.invoice_number

  const businessName = orgSettings?.business_name ?? `${practitioner.first_name} ${practitioner.last_name}`
  const total = new Intl.NumberFormat('en-AU', { style: 'currency', currency: invoice.currency }).format(invoice.total_cents / 100)
  const dueDate = invoice.due_at ? new Date(invoice.due_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Upon receipt'

  const bankHtml = orgSettings?.bsb
    ? `
      <tr><td style="padding:4px 0;color:#6b7280;width:140px">Account name</td><td style="padding:4px 0;font-weight:500">${orgSettings.bank_account_name ?? ''}</td></tr>
      <tr><td style="padding:4px 0;color:#6b7280">BSB</td><td style="padding:4px 0;font-weight:500">${orgSettings.bsb}</td></tr>
      <tr><td style="padding:4px 0;color:#6b7280">Account number</td><td style="padding:4px 0;font-weight:500">${orgSettings.account_number ?? ''}</td></tr>
      <tr><td style="padding:4px 0;color:#6b7280">Reference</td><td style="padding:4px 0;font-weight:500">${payRef}</td></tr>
    `
    : ''

  const lineItemsHtml = invoice.invoice_items
    .map((item) => {
      const itemTotal = new Intl.NumberFormat('en-AU', { style: 'currency', currency: invoice.currency }).format((item.unit_price_cents * item.quantity) / 100)
      const unitPrice = new Intl.NumberFormat('en-AU', { style: 'currency', currency: invoice.currency }).format(item.unit_price_cents / 100)
      return `<tr>
        <td style="padding:8px;border-bottom:1px solid #f3f4f6">${item.description}</td>
        <td style="padding:8px;border-bottom:1px solid #f3f4f6;text-align:center">${item.quantity}</td>
        <td style="padding:8px;border-bottom:1px solid #f3f4f6;text-align:right">${unitPrice}</td>
        <td style="padding:8px;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:500">${itemTotal}</td>
      </tr>`
    })
    .join('')

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;color:#1a1a2e">
      <div style="background:#6366f1;padding:24px 32px;border-radius:12px 12px 0 0">
        <p style="color:#e0e7ff;margin:0;font-size:13px">INVOICE</p>
        <p style="color:#fff;margin:4px 0 0;font-size:22px;font-weight:700">${invoice.invoice_number}</p>
      </div>
      <div style="background:#f9fafb;padding:24px 32px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none">
        <p style="margin:0 0 16px">Hi ${invoice.recipient_name ?? 'there'},</p>
        <p style="margin:0 0 20px">Please find your invoice from <strong>${businessName}</strong> for ${total}, due <strong>${dueDate}</strong>.</p>

        <table style="width:100%;border-collapse:collapse;margin-bottom:16px;font-size:13px">
          <thead>
            <tr style="background:#f3f4f6">
              <th style="padding:8px;text-align:left;font-weight:600;color:#6b7280;font-size:11px;text-transform:uppercase">Description</th>
              <th style="padding:8px;text-align:center;font-weight:600;color:#6b7280;font-size:11px;text-transform:uppercase">Qty</th>
              <th style="padding:8px;text-align:right;font-weight:600;color:#6b7280;font-size:11px;text-transform:uppercase">Unit</th>
              <th style="padding:8px;text-align:right;font-weight:600;color:#6b7280;font-size:11px;text-transform:uppercase">Total</th>
            </tr>
          </thead>
          <tbody>${lineItemsHtml}</tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="padding:12px 8px;text-align:right;font-weight:700;font-size:14px">Total</td>
              <td style="padding:12px 8px;text-align:right;font-weight:700;font-size:14px;color:#6366f1">${total}</td>
            </tr>
          </tfoot>
        </table>

        ${orgSettings?.bsb ? `
        <div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:16px">
          <p style="margin:0 0 10px;font-weight:600;font-size:13px">Payment Details</p>
          <table style="font-size:13px">${bankHtml}</table>
        </div>
        ` : ''}

        ${invoice.notes ? `<p style="background:#fffbeb;border-radius:8px;padding:12px;font-size:13px;margin:0">${invoice.notes}</p>` : ''}

        <p style="margin:20px 0 0;font-size:12px;color:#9ca3af">Questions? Reply to this email or contact your practitioner directly.</p>
      </div>
    </div>
  `

  let pdfBuffer: Buffer | undefined
  try {
    pdfBuffer = await generateInvoicePdfBuffer(invoice, orgSettings)
  } catch {
    // PDF generation failure is non-fatal — send email without attachment
  }

  try {
    await sendEmail({
      to: invoice.recipient_email,
      toName: invoice.recipient_name ?? undefined,
      subject: `Invoice ${invoice.invoice_number} from ${businessName} — ${total} due ${dueDate}`,
      html,
      attachments: pdfBuffer
        ? [{ filename: `${invoice.invoice_number}.pdf`, content: pdfBuffer, content_type: 'application/pdf' }]
        : undefined,
    })
  } catch (err) {
    return { error: `Failed to send email: ${err instanceof Error ? err.message : 'Unknown error'}` }
  }

  const { error } = await supabase
    .from('invoices')
    .update({ status: 'sent' })
    .eq('id', invoiceId)
    .eq('practitioner_id', practitioner.id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/invoices')
  revalidatePath(`/dashboard/invoices/${invoiceId}`)
  return { success: true }
}

export async function deleteInvoice(invoiceId: string) {
  const user = await requireAuth()
  const practitioner = await getPractitionerByUserId(user.id)
  const supabase = await createServerSupabaseClient()

  const { data: existing } = await supabase
    .from('invoices')
    .select('id, status, client_id')
    .eq('id', invoiceId)
    .eq('practitioner_id', practitioner.id)
    .single()

  if (!existing) return { error: 'Invoice not found.' }
  if (existing.status !== 'draft' && existing.status !== 'cancelled') {
    return { error: 'Only draft or cancelled invoices can be deleted.' }
  }

  // Unlink sessions (do not delete them)
  await supabase
    .from('sessions')
    .update({ invoice_id: null })
    .eq('invoice_id', invoiceId)
    .eq('practitioner_id', practitioner.id)

  await supabase.from('invoice_items').delete().eq('invoice_id', invoiceId)

  const { error } = await supabase
    .from('invoices')
    .delete()
    .eq('id', invoiceId)
    .eq('practitioner_id', practitioner.id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/invoices')
  revalidatePath('/dashboard/sessions')
  if (existing.client_id) revalidatePath(`/dashboard/clients/${existing.client_id}`)
  return { success: true }
}

export async function updateInvoice(
  invoiceId: string,
  formData: FormData,
  reason?: string,
) {
  const user = await requireAuth()
  const practitioner = await getPractitionerByUserId(user.id)
  const supabase = await createServerSupabaseClient()

  const existing = await getInvoiceById(practitioner.id, invoiceId)
  const needsAudit = existing.status === 'sent' || existing.status === 'paid'

  const invoiceNumber = (formData.get('invoice_number') as string).trim()
  const clientId = formData.get('client_id') as string
  if (!invoiceNumber) return { error: 'Invoice number is required.' }
  if (!clientId) return { error: 'Client is required.' }

  let lineItems: LineItemInput[] = []
  try {
    lineItems = JSON.parse((formData.get('line_items') as string) || '[]')
  } catch {
    return { error: 'Invalid line items.' }
  }
  if (!lineItems.length) return { error: 'At least one line item is required.' }

  const client = await getClientById(practitioner.id, clientId)
  if (!client) return { error: 'Client not found.' }
  const recipient = resolveInvoiceRecipient(client)

  let subtotalCents = 0
  for (const item of lineItems) {
    const qty = parseFloat(item.quantity) || 0
    const priceCents = Math.round(parseFloat(item.unit_price) * 100)
    subtotalCents += Math.round(qty * priceCents)
  }

  const notesValue = (formData.get('notes') as string)?.trim() || null
  const issuedAt = (formData.get('issued_at') as string) || null
  const dueAt = (formData.get('due_at') as string) || null

  // Never touch status or paid_at — preserve them as-is
  const { error: updateErr } = await supabase
    .from('invoices')
    .update({
      client_id: clientId,
      invoice_number: invoiceNumber,
      subtotal_cents: subtotalCents,
      tax_cents: 0,
      total_cents: subtotalCents,
      notes: notesValue,
      issued_at: issuedAt,
      due_at: dueAt,
      updated_at: new Date().toISOString(),
      ...recipient,
    })
    .eq('id', invoiceId)
    .eq('practitioner_id', practitioner.id)

  if (updateErr) return { error: updateErr.message }

  // Replace line items
  await supabase.from('invoice_items').delete().eq('invoice_id', invoiceId)
  const { error: itemsErr } = await supabase.from('invoice_items').insert(
    lineItems.map((item) => ({
      invoice_id: invoiceId,
      description: item.description.trim(),
      quantity: parseFloat(item.quantity) || 1,
      unit_price_cents: Math.round(parseFloat(item.unit_price) * 100),
    })),
  )
  if (itemsErr) return { error: `Failed to update line items: ${itemsErr.message}` }

  if (needsAudit) {
    await supabase.from('invoice_audit_log').insert({
      invoice_id: invoiceId,
      practitioner_id: practitioner.id,
      edited_by: user.id,
      previous_values: {
        invoice_number: existing.invoice_number,
        status: existing.status,
        subtotal_cents: existing.subtotal_cents,
        tax_cents: existing.tax_cents,
        total_cents: existing.total_cents,
        notes: existing.notes,
        issued_at: existing.issued_at,
        due_at: existing.due_at,
        invoice_items: existing.invoice_items.map((i) => ({
          description: i.description,
          quantity: i.quantity,
          unit_price_cents: i.unit_price_cents,
        })),
      },
      updated_values: {
        invoice_number: invoiceNumber,
        subtotal_cents: subtotalCents,
        tax_cents: 0,
        total_cents: subtotalCents,
        notes: notesValue,
        issued_at: issuedAt,
        due_at: dueAt,
        invoice_items: lineItems.map((item) => ({
          description: item.description.trim(),
          quantity: parseFloat(item.quantity) || 1,
          unit_price_cents: Math.round(parseFloat(item.unit_price) * 100),
        })),
      },
      reason: reason?.trim() || null,
    })
  }

  revalidatePath('/dashboard/invoices')
  revalidatePath(`/dashboard/invoices/${invoiceId}`)
  if (clientId) revalidatePath(`/dashboard/clients/${clientId}`)
  return { success: true }
}

export async function getNextInvoiceNumber(practitionerId: string): Promise<string> {
  const supabase = await createServerSupabaseClient()
  const { count } = await supabase
    .from('invoices')
    .select('*', { count: 'exact', head: true })
    .eq('practitioner_id', practitionerId)

  const year = new Date().getFullYear()
  const seq = String((count ?? 0) + 1).padStart(4, '0')
  return `INV-${year}-${seq}`
}
