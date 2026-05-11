'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import InvoiceModal from '@/app/dashboard/invoices/InvoiceModal'
import {
  sendInvoice,
  updateInvoiceStatus,
  deleteInvoice,
  markInvoicePaid,
  markRemittanceReceived,
  updatePaymentDetails,
} from '@/app/actions/invoices'
import { formatDate, formatCurrency } from '@/lib/utils'
import { recipientLabel } from '@/lib/invoice-routing'
import type {
  ClientRow,
  InvoiceAuditLogRow,
  InvoiceItemRow,
  InvoiceRow,
  InvoiceStatus,
  OrgSettingsRow,
  PractitionerRow,
  SessionRow,
} from '@/types/database'

type FullInvoice = InvoiceRow & {
  invoice_items: InvoiceItemRow[]
  clients: ClientRow | null
}

interface Props {
  invoice: FullInvoice
  orgSettings: OrgSettingsRow | null
  practitioner: PractitionerRow
  sessions: SessionRow[]
  clients: ClientRow[]
  auditLog: InvoiceAuditLogRow[]
}

const STATUS_COLOR: Record<InvoiceStatus, 'gray' | 'blue' | 'green' | 'amber' | 'red'> = {
  draft: 'gray', sent: 'blue', paid: 'green', overdue: 'red', cancelled: 'gray',
}

const EDITABLE_STATUSES: InvoiceStatus[] = ['draft', 'sent', 'paid']

// ---------------------------------------------------------------------------
// Activity history helpers
// ---------------------------------------------------------------------------

interface ActivityEntry {
  timestamp: string
  label: string
  sub?: string
  kind: 'created' | 'sent' | 'paid' | 'remittance' | 'edit' | 'status'
}

function buildActivityFeed(invoice: FullInvoice, auditLog: InvoiceAuditLogRow[]): ActivityEntry[] {
  const entries: ActivityEntry[] = []

  entries.push({
    timestamp: invoice.created_at,
    label: 'Invoice generated',
    sub: `${invoice.invoice_number} created`,
    kind: 'created',
  })

  if (invoice.invoice_sent_at) {
    entries.push({
      timestamp: invoice.invoice_sent_at,
      label: 'Invoice sent',
      sub: invoice.recipient_email ? `To: ${invoice.recipient_email}` : undefined,
      kind: 'sent',
    })
  }

  if (invoice.paid_at) {
    entries.push({
      timestamp: invoice.paid_at,
      label: 'Marked as paid',
      sub: invoice.payment_reference ? `Ref: ${invoice.payment_reference}` : undefined,
      kind: 'paid',
    })
  }

  if (invoice.remittance_received_at) {
    entries.push({
      timestamp: invoice.remittance_received_at,
      label: 'Remittance advice received',
      kind: 'remittance',
    })
  }

  for (const entry of auditLog) {
    // Skip entries already captured by timestamp fields
    const reason = entry.reason ?? ''
    if (
      reason === 'Invoice sent via email' ||
      reason === 'Marked as paid' ||
      reason === 'Remittance advice received'
    ) continue

    const statusChange = (entry.updated_values as Record<string, unknown>).status as string | undefined
    entries.push({
      timestamp: entry.edited_at,
      label: statusChange ? `Status changed to ${statusChange}` : 'Invoice edited',
      sub: reason || undefined,
      kind: statusChange ? 'status' : 'edit',
    })
  }

  return entries.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
}

function ActivityIcon({ kind }: { kind: ActivityEntry['kind'] }) {
  if (kind === 'created') return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100">
      <svg className="h-3.5 w-3.5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    </div>
  )
  if (kind === 'sent') return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100">
      <svg className="h-3.5 w-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    </div>
  )
  if (kind === 'paid') return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-100">
      <svg className="h-3.5 w-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    </div>
  )
  if (kind === 'remittance') return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-100">
      <svg className="h-3.5 w-3.5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    </div>
  )
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100">
      <svg className="h-3.5 w-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function InvoiceDetailClient({ invoice, orgSettings, practitioner, sessions, clients, auditLog }: Props) {
  const [sendPending, startSendTransition] = useTransition()
  const [statusPending, startStatusTransition] = useTransition()
  const [deletePending, startDeleteTransition] = useTransition()
  const [payPending, startPayTransition] = useTransition()
  const [remittancePending, startRemittanceTransition] = useTransition()
  const [payDetailsPending, startPayDetailsTransition] = useTransition()

  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Edit flow state
  const [editWarningOpen, setEditWarningOpen] = useState(false)
  const [editReason, setEditReason] = useState('')
  const [editModalOpen, setEditModalOpen] = useState(false)

  // Mark-as-paid panel
  const [showPayPanel, setShowPayPanel] = useState(false)
  const [payRef, setPayRef] = useState(invoice.payment_reference ?? '')
  const [payNotes, setPayNotes] = useState(invoice.payment_notes ?? '')

  // Edit payment details panel
  const [showPayDetailsPanel, setShowPayDetailsPanel] = useState(false)
  const [editPayRef, setEditPayRef] = useState(invoice.payment_reference ?? '')
  const [editPayNotes, setEditPayNotes] = useState(invoice.payment_notes ?? '')

  const router = useRouter()

  const businessName = orgSettings?.business_name ?? `${practitioner.first_name} ${practitioner.last_name}`
  const paymentRef = orgSettings?.payment_reference_prefix
    ? `${orgSettings.payment_reference_prefix}-${invoice.invoice_number}`
    : invoice.invoice_number

  const canEdit = EDITABLE_STATUSES.includes(invoice.status)
  const canSend = invoice.status === 'draft' || invoice.status === 'sent'
  const canMarkPaid = invoice.status === 'sent' || invoice.status === 'overdue'
  const canDelete = invoice.status === 'draft' || invoice.status === 'cancelled'
  const needsWarningBeforeEdit = invoice.status === 'sent' || invoice.status === 'paid'
  const canMarkRemittance = invoice.status === 'paid' && !invoice.remittance_received_at

  const activityFeed = buildActivityFeed(invoice, auditLog)

  function handleEditClick() {
    if (needsWarningBeforeEdit) {
      setEditWarningOpen(true)
    } else {
      setEditModalOpen(true)
    }
  }

  function handleDelete() {
    setError(null)
    startDeleteTransition(async () => {
      const result = await deleteInvoice(invoice.id)
      if (result?.error) {
        setError(result.error)
        setShowDeleteConfirm(false)
      } else {
        router.push('/dashboard/invoices')
      }
    })
  }

  function handleSend() {
    setError(null)
    setSuccessMsg(null)
    startSendTransition(async () => {
      const result = await sendInvoice(invoice.id)
      if (result?.error) {
        setError(result.error)
      } else {
        setSuccessMsg('Invoice sent successfully.')
        router.refresh()
      }
    })
  }

  function handleStatusChange(status: InvoiceStatus) {
    setError(null)
    startStatusTransition(async () => {
      const result = await updateInvoiceStatus(invoice.id, status)
      if (result?.error) {
        setError(result.error)
      } else {
        router.refresh()
      }
    })
  }

  function handleMarkPaid() {
    setError(null)
    startPayTransition(async () => {
      const result = await markInvoicePaid(invoice.id, payRef, payNotes)
      if (result?.error) {
        setError(result.error)
      } else {
        setShowPayPanel(false)
        router.refresh()
      }
    })
  }

  function handleRemittance() {
    setError(null)
    startRemittanceTransition(async () => {
      const result = await markRemittanceReceived(invoice.id)
      if (result?.error) {
        setError(result.error)
      } else {
        router.refresh()
      }
    })
  }

  function handleSavePayDetails() {
    setError(null)
    startPayDetailsTransition(async () => {
      const result = await updatePaymentDetails(invoice.id, editPayRef, editPayNotes)
      if (result?.error) {
        setError(result.error)
      } else {
        setShowPayDetailsPanel(false)
        router.refresh()
      }
    })
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Back + header */}
      <div className="flex items-start justify-between">
        <div>
          <button
            onClick={() => router.push('/dashboard/invoices')}
            className="mb-2 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Invoices
          </button>
          <h1 className="text-xl font-bold text-gray-900">{invoice.invoice_number}</h1>
          <div className="mt-1 flex items-center gap-2">
            <Badge color={STATUS_COLOR[invoice.status] ?? 'gray'}>{invoice.status}</Badge>
            {invoice.issued_at && (
              <span className="text-sm text-gray-400">Issued {formatDate(invoice.issued_at)}</span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center justify-end gap-2">
          {canDelete && (
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(true)}
              loading={deletePending}
              className="text-red-600 hover:border-red-300 hover:bg-red-50"
            >
              Delete
            </Button>
          )}

          {canEdit && (
            <Button variant="outline" onClick={handleEditClick}>
              <svg className="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </Button>
          )}

          <a
            href={`/api/invoices/${invoice.id}/pdf`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            PDF
          </a>

          {canMarkPaid && (
            <Button
              variant="outline"
              onClick={() => setShowPayPanel((v) => !v)}
            >
              Mark as paid
            </Button>
          )}

          {canSend && (
            <Button onClick={handleSend} loading={sendPending}>
              {invoice.status === 'sent' ? 'Resend' : 'Send invoice'}
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {successMsg}
        </div>
      )}

      {/* Mark as paid panel */}
      {showPayPanel && canMarkPaid && (
        <Card padding="md">
          <p className="mb-3 text-sm font-semibold text-gray-800">Record payment</p>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Payment reference <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <input
                type="text"
                value={payRef}
                onChange={(e) => setPayRef(e.target.value)}
                placeholder="e.g. BSB transfer, NDIS claim #"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Reconciliation notes <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <textarea
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
                placeholder="e.g. Partial payment received, awaiting balance…"
                rows={2}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowPayPanel(false)}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <Button onClick={handleMarkPaid} loading={payPending}>
                Confirm payment
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Invoice card */}
      <Card>
        {/* From / To header */}
        <div className="mb-6 grid grid-cols-3 gap-4">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">From</p>
            <p className="font-semibold text-gray-900">{businessName}</p>
            {orgSettings?.abn && <p className="text-sm text-gray-500">ABN: {orgSettings.abn}</p>}
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Bill To</p>
            {invoice.recipient_name && <p className="font-semibold text-gray-900">{invoice.recipient_name}</p>}
            {invoice.recipient_type && (
              <p className="text-sm text-gray-500">{recipientLabel(invoice.recipient_type)}</p>
            )}
            {invoice.recipient_email && <p className="text-sm text-gray-500">{invoice.recipient_email}</p>}
            {invoice.recipient_phone && <p className="text-sm text-gray-500">{invoice.recipient_phone}</p>}
            {invoice.billing_note && <p className="mt-1 text-xs font-medium text-amber-700">{invoice.billing_note}</p>}
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Client</p>
            {invoice.clients && (
              <>
                <p className="font-semibold text-gray-900">
                  {invoice.clients.first_name} {invoice.clients.last_name}
                </p>
                {invoice.clients.ndis_number && (
                  <p className="text-sm text-gray-500">NDIS: {invoice.clients.ndis_number}</p>
                )}
              </>
            )}
            <div className="mt-3">
              <p className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-gray-400">Due</p>
              <p className="text-sm font-medium text-gray-700">
                {invoice.due_at ? formatDate(invoice.due_at) : 'Upon receipt'}
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100" />

        {/* Line items */}
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Description</th>
              <th className="py-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-400">Qty</th>
              <th className="py-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">Unit price</th>
              <th className="py-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.invoice_items.map((item) => (
              <tr key={item.id} className="border-b border-gray-50 last:border-0">
                <td className="py-3 text-gray-800">{item.description}</td>
                <td className="py-3 text-center text-gray-600">{item.quantity}</td>
                <td className="py-3 text-right text-gray-600">{formatCurrency(item.unit_price_cents, invoice.currency)}</td>
                <td className="py-3 text-right font-medium text-gray-900">{formatCurrency(item.unit_price_cents * item.quantity, invoice.currency)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            {invoice.tax_cents > 0 && (
              <>
                <tr>
                  <td colSpan={3} className="pt-4 text-right text-sm text-gray-500">Subtotal</td>
                  <td className="pt-4 text-right text-sm text-gray-900">{formatCurrency(invoice.subtotal_cents, invoice.currency)}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="py-1 text-right text-sm text-gray-500">GST</td>
                  <td className="py-1 text-right text-sm text-gray-900">{formatCurrency(invoice.tax_cents, invoice.currency)}</td>
                </tr>
              </>
            )}
            <tr>
              <td colSpan={3} className="pt-3 text-right text-base font-bold text-gray-900">Total</td>
              <td className="pt-3 text-right text-base font-bold text-indigo-600">{formatCurrency(invoice.total_cents, invoice.currency)}</td>
            </tr>
          </tfoot>
        </table>

        {/* Bank details */}
        {(orgSettings?.bsb || orgSettings?.bank_account_name) && (
          <div className="mt-6 rounded-xl bg-gray-50 px-4 py-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Payment Details</p>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              {orgSettings.bank_account_name && (
                <><dt className="text-gray-500">Account name</dt><dd className="font-medium text-gray-800">{orgSettings.bank_account_name}</dd></>
              )}
              {orgSettings.bsb && (
                <><dt className="text-gray-500">BSB</dt><dd className="font-medium text-gray-800">{orgSettings.bsb}</dd></>
              )}
              {orgSettings.account_number && (
                <><dt className="text-gray-500">Account number</dt><dd className="font-medium text-gray-800">{orgSettings.account_number}</dd></>
              )}
              <dt className="text-gray-500">Reference</dt>
              <dd className="font-medium text-gray-800">{paymentRef}</dd>
            </dl>
          </div>
        )}

        {invoice.notes && (
          <div className="mt-4 rounded-xl bg-amber-50 px-4 py-3">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-600">Notes</p>
            <p className="text-sm text-amber-900">{invoice.notes}</p>
          </div>
        )}
      </Card>

      {/* Status / date metadata */}
      <Card padding="sm">
        <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs font-medium text-gray-400">Status</dt>
            <dd className="mt-1"><Badge color={STATUS_COLOR[invoice.status] ?? 'gray'}>{invoice.status}</Badge></dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-400">Sent</dt>
            <dd className="mt-1 text-gray-700">
              {invoice.invoice_sent_at
                ? formatDate(invoice.invoice_sent_at)
                : invoice.issued_at
                  ? formatDate(invoice.issued_at)
                  : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-400">Due</dt>
            <dd className="mt-1 text-gray-700">{invoice.due_at ? formatDate(invoice.due_at) : '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-400">Paid</dt>
            <dd className="mt-1 text-gray-700">{invoice.paid_at ? formatDate(invoice.paid_at) : '—'}</dd>
          </div>
        </dl>
      </Card>

      {/* Payment details card (shown when paid) */}
      {invoice.status === 'paid' && (
        <Card padding="md">
          <div className="flex items-start justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Payment record</p>
            <div className="flex items-center gap-2">
              {canMarkRemittance && (
                <button
                  onClick={handleRemittance}
                  disabled={remittancePending}
                  className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-700 hover:bg-teal-100 disabled:opacity-50"
                >
                  {remittancePending ? 'Saving…' : 'Mark remittance received'}
                </button>
              )}
              <button
                onClick={() => {
                  setEditPayRef(invoice.payment_reference ?? '')
                  setEditPayNotes(invoice.payment_notes ?? '')
                  setShowPayDetailsPanel((v) => !v)
                }}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
                Edit payment details
              </button>
            </div>
          </div>

          <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-gray-400">Payment date</dt>
              <dd className="mt-0.5 font-medium text-gray-800">{invoice.paid_at ? formatDate(invoice.paid_at) : '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400">Payment reference</dt>
              <dd className="mt-0.5 font-medium text-gray-800">{invoice.payment_reference ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400">Remittance received</dt>
              <dd className="mt-0.5 font-medium text-gray-800">
                {invoice.remittance_received_at ? formatDate(invoice.remittance_received_at) : (
                  <span className="text-amber-600">Pending</span>
                )}
              </dd>
            </div>
            {invoice.payment_notes && (
              <div className="col-span-full">
                <dt className="text-xs text-gray-400">Reconciliation notes</dt>
                <dd className="mt-0.5 text-gray-700">{invoice.payment_notes}</dd>
              </div>
            )}
          </dl>

          {/* Edit payment details inline panel */}
          {showPayDetailsPanel && (
            <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Payment reference</label>
                <input
                  type="text"
                  value={editPayRef}
                  onChange={(e) => setEditPayRef(e.target.value)}
                  placeholder="e.g. BSB transfer, NDIS claim #"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Reconciliation notes</label>
                <textarea
                  value={editPayNotes}
                  onChange={(e) => setEditPayNotes(e.target.value)}
                  placeholder="e.g. NDIS portal confirmed, claim ref #…"
                  rows={2}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowPayDetailsPanel(false)}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <Button onClick={handleSavePayDetails} loading={payDetailsPending}>
                  Save
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Linked sessions */}
      {sessions.length > 0 && (
        <Card>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Sessions ({sessions.length})
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Date</th>
                <th className="py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">NDIS code</th>
                <th className="py-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">Duration</th>
                <th className="py-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">Rate</th>
                <th className="py-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">Amount</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => {
                const amountCents = Math.round((s.duration_minutes / 60) * s.rate * 100)
                return (
                  <tr key={s.id} className="border-b border-gray-50 last:border-0">
                    <td className="py-2.5 text-gray-800">{formatDate(`${s.service_date}T12:00:00`)}</td>
                    <td className="py-2.5 text-gray-500">{s.ndis_line_item ?? '—'}</td>
                    <td className="py-2.5 text-right text-gray-600">{s.duration_minutes}min</td>
                    <td className="py-2.5 text-right text-gray-600">${s.rate}/hr</td>
                    <td className="py-2.5 text-right font-medium text-gray-900">
                      {formatCurrency(amountCents, invoice.currency)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>
      )}

      {/* Activity history */}
      {activityFeed.length > 0 && (
        <Card padding="md">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-400">Activity history</p>
          <ol className="space-y-3">
            {activityFeed.map((entry, i) => (
              <li key={i} className="flex items-start gap-3">
                <ActivityIcon kind={entry.kind} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-800">{entry.label}</p>
                  {entry.sub && <p className="mt-0.5 text-xs text-gray-400">{entry.sub}</p>}
                </div>
                <p className="shrink-0 text-xs text-gray-400">{formatDate(entry.timestamp)}</p>
              </li>
            ))}
          </ol>
        </Card>
      )}

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <ConfirmDialog
          title="Delete invoice?"
          message={sessions.length > 0
            ? `This will delete invoice ${invoice.invoice_number} and unlink ${sessions.length} session${sessions.length !== 1 ? 's' : ''} (sessions will not be deleted). This action cannot be undone.`
            : `Are you sure you want to delete invoice ${invoice.invoice_number}? This action cannot be undone.`}
          confirmLabel="Delete invoice"
          loading={deletePending}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}

      {/* Edit warning dialog */}
      {editWarningOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-3 flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100">
                <svg className="h-5 w-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-gray-900">Edit {invoice.status} invoice?</h3>
            </div>
            <p className="text-sm text-gray-600">
              This invoice has already been <strong>{invoice.status}</strong>. Editing may affect audit records and payment reconciliation.
            </p>
            <div className="mt-4">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Reason <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <textarea
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                placeholder="e.g. Correcting line item description…"
                rows={2}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => { setEditWarningOpen(false); setEditReason('') }}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => { setEditWarningOpen(false); setEditModalOpen(true) }}
                className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600"
              >
                Continue editing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editModalOpen && (
        <InvoiceModal
          clients={clients}
          nextInvoiceNumber=""
          orgSettings={orgSettings}
          invoice={invoice}
          editReason={editReason}
          onClose={() => { setEditModalOpen(false); setEditReason('') }}
        />
      )}
    </div>
  )
}
