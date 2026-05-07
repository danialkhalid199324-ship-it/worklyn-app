'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import { createInvoice, updateInvoice } from '@/app/actions/invoices'
import { resolveInvoiceRecipient, recipientLabel } from '@/lib/invoice-routing'
import type { ClientRow, InvoiceItemRow, InvoiceRow, OrgSettingsRow } from '@/types/database'

type InvoiceForEdit = InvoiceRow & { invoice_items: InvoiceItemRow[] }

interface Props {
  clients: ClientRow[]
  nextInvoiceNumber: string
  orgSettings: OrgSettingsRow | null
  onClose: () => void
  invoice?: InvoiceForEdit
  editReason?: string
}

interface LineItem {
  id: number
  description: string
  quantity: string
  unit_price: string
}

let lineItemIdSeq = 0

function newItem(): LineItem {
  return { id: ++lineItemIdSeq, description: '', quantity: '1', unit_price: '' }
}

function itemsFromInvoice(items: InvoiceItemRow[]): LineItem[] {
  return items.map((i) => ({
    id: ++lineItemIdSeq,
    description: i.description,
    quantity: String(i.quantity),
    unit_price: String((i.unit_price_cents / 100).toFixed(2)),
  }))
}

const INPUT =
  'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400'

export default function InvoiceModal({
  clients,
  nextInvoiceNumber,
  orgSettings,
  onClose,
  invoice,
  editReason,
}: Props) {
  const isEdit = !!invoice
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [selectedClientId, setSelectedClientId] = useState(
    invoice?.client_id ?? '',
  )
  const [lineItems, setLineItems] = useState<LineItem[]>(
    invoice ? itemsFromInvoice(invoice.invoice_items) : [newItem()],
  )
  const router = useRouter()

  const selectedClient = clients.find((c) => c.id === selectedClientId) ?? null
  const recipient = selectedClient ? resolveInvoiceRecipient(selectedClient) : null
  const isNdia = recipient?.recipient_type === 'ndia_claim'

  const subtotal = lineItems.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0
    const price = parseFloat(item.unit_price) || 0
    return sum + qty * price
  }, 0)

  function updateItem(id: number, field: keyof Omit<LineItem, 'id'>, value: string) {
    setLineItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    )
  }

  function addItem() {
    setLineItems((prev) => [...prev, newItem()])
  }

  function removeItem(id: number) {
    setLineItems((prev) => prev.filter((item) => item.id !== id))
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)
    formData.set('client_id', selectedClientId)
    formData.set(
      'line_items',
      JSON.stringify(
        lineItems.map(({ description, quantity, unit_price }) => ({
          description,
          quantity,
          unit_price,
        })),
      ),
    )

    startTransition(async () => {
      const result = isEdit
        ? await updateInvoice(invoice.id, formData, editReason)
        : await createInvoice(formData)

      if (result?.error) {
        setError(result.error)
      } else {
        router.refresh()
        onClose()
      }
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="flex w-full max-w-2xl flex-col rounded-2xl bg-white shadow-xl max-h-[92vh]">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">
            {isEdit ? 'Edit invoice' : 'New invoice'}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:text-gray-600">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
          <div className="overflow-y-auto px-6 py-5 space-y-5">

            {/* Warn banner for sent/paid edits */}
            {isEdit && (invoice.status === 'sent' || invoice.status === 'paid') && (
              <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <svg className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                <p className="text-sm text-amber-800">
                  Editing a <strong>{invoice.status}</strong> invoice. Changes are audit-logged.
                  {editReason && <span className="ml-1">Reason: <em>{editReason}</em></span>}
                </p>
              </div>
            )}

            {/* Client + invoice number row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Client <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  required
                  className={INPUT}
                >
                  <option value="">— Select client —</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.first_name} {c.last_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Invoice number <span className="text-red-500">*</span>
                </label>
                <input
                  name="invoice_number"
                  defaultValue={invoice?.invoice_number ?? nextInvoiceNumber}
                  required
                  className={INPUT}
                />
              </div>
            </div>

            {/* Billing recipient preview */}
            {recipient && (
              <div className={[
                'rounded-xl border px-4 py-3 text-sm',
                isNdia
                  ? 'border-amber-200 bg-amber-50 text-amber-800'
                  : 'border-indigo-100 bg-indigo-50/60 text-indigo-900',
              ].join(' ')}>
                <p className="font-medium">
                  {isNdia ? 'NDIA claim required' : `Bill to: ${recipientLabel(recipient.recipient_type)}`}
                </p>
                {recipient.recipient_name && (
                  <p className="mt-0.5 text-xs opacity-75">{recipient.recipient_name}</p>
                )}
                {recipient.recipient_email && (
                  <p className="text-xs opacity-75">{recipient.recipient_email}</p>
                )}
                {recipient.billing_note && (
                  <p className="mt-1 text-xs font-medium">{recipient.billing_note}</p>
                )}
              </div>
            )}

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Issue date</label>
                <input
                  type="date"
                  name="issued_at"
                  defaultValue={invoice?.issued_at ?? new Date().toISOString().slice(0, 10)}
                  className={INPUT}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Due date</label>
                <input
                  type="date"
                  name="due_at"
                  defaultValue={invoice?.due_at ?? ''}
                  className={INPUT}
                />
              </div>
            </div>

            {/* Line items */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Line items</label>
                <button
                  type="button"
                  onClick={addItem}
                  className="text-xs font-medium text-brand-600 hover:text-brand-700"
                >
                  + Add row
                </button>
              </div>

              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <div className="grid grid-cols-[1fr_80px_100px_32px] gap-2 border-b border-gray-100 bg-gray-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  <span>Description</span>
                  <span className="text-center">Qty</span>
                  <span className="text-right">Unit price</span>
                  <span />
                </div>

                {lineItems.map((item) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-[1fr_80px_100px_32px] gap-2 border-b border-gray-50 last:border-0 px-3 py-2 items-center"
                  >
                    <input
                      value={item.description}
                      onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                      placeholder="Description"
                      required
                      className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                    />
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                      min="0.01"
                      step="0.01"
                      required
                      className="rounded-lg border border-gray-200 px-2 py-1.5 text-center text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                    />
                    <input
                      type="number"
                      value={item.unit_price}
                      onChange={(e) => updateItem(item.id, 'unit_price', e.target.value)}
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      required
                      className="rounded-lg border border-gray-200 px-2 py-1.5 text-right text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                    />
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      disabled={lineItems.length === 1}
                      className="flex items-center justify-center rounded p-1 text-gray-300 hover:text-red-400 disabled:opacity-30"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}

                <div className="flex justify-end border-t border-gray-100 bg-gray-50 px-4 py-2">
                  <span className="text-sm text-gray-500 mr-3">Total</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(subtotal)}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment details */}
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Payment details (on invoice)</p>
              {orgSettings?.bsb ? (
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  {orgSettings.bank_account_name && (
                    <><span className="text-gray-500">Account name</span><span className="font-medium text-gray-800">{orgSettings.bank_account_name}</span></>
                  )}
                  <span className="text-gray-500">BSB</span><span className="font-medium text-gray-800">{orgSettings.bsb}</span>
                  {orgSettings.account_number && (
                    <><span className="text-gray-500">Account number</span><span className="font-medium text-gray-800">{orgSettings.account_number}</span></>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-400">
                  No bank details saved.{' '}
                  <a href="/dashboard/settings" className="text-brand-600 underline" target="_blank" rel="noreferrer">
                    Add in Settings → Practice &amp; Billing
                  </a>
                </p>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Notes</label>
              <textarea
                name="notes"
                rows={2}
                defaultValue={invoice?.notes ?? ''}
                placeholder="Optional notes shown on the invoice…"
                className={INPUT}
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>

          {/* Footer */}
          <div className="flex shrink-0 justify-end gap-3 border-t border-gray-100 px-6 py-4">
            <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={isPending} disabled={!selectedClientId || isNdia}>
              {isEdit ? 'Save changes' : (isNdia ? 'NDIA — no invoice' : 'Create invoice')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
