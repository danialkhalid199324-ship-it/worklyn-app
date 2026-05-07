'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import InvoiceModal from './InvoiceModal'
import { deleteInvoice } from '@/app/actions/invoices'
import { formatDate, formatCurrency } from '@/lib/utils'
import { recipientLabel } from '@/lib/invoice-routing'
import type { ClientRow, InvoiceRow, InvoiceStatus, OrgSettingsRow } from '@/types/database'

type InvoiceWithClient = InvoiceRow & {
  clients: { first_name: string; last_name: string } | null
}

interface SummaryStats {
  outstandingCents: number
  outstandingCount: number
  paidThisMonthCents: number
  paidThisMonthCount: number
  overdueCount: number
  overdueCents: number
  draftCount: number
}

interface Props {
  invoices: InvoiceWithClient[]
  clients: ClientRow[]
  nextInvoiceNumber: string
  orgSettings: OrgSettingsRow | null
  stats: SummaryStats
}

const STATUS_COLOR: Record<InvoiceStatus, 'gray' | 'blue' | 'green' | 'amber' | 'red'> = {
  draft: 'gray',
  sent: 'blue',
  paid: 'green',
  overdue: 'red',
  cancelled: 'gray',
}

export default function InvoicesClient({ invoices, clients, nextInvoiceNumber, orgSettings, stats }: Props) {
  const [showModal, setShowModal] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all')
  const [confirmDelete, setConfirmDelete] = useState<InvoiceWithClient | null>(null)
  const [deletePending, startDeleteTransition] = useTransition()
  const router = useRouter()

  function handleDelete(inv: InvoiceWithClient) {
    startDeleteTransition(async () => {
      const result = await deleteInvoice(inv.id)
      if (!result?.error) {
        setConfirmDelete(null)
        router.refresh()
      }
    })
  }

  const fmt = (cents: number) => formatCurrency(cents, 'AUD')

  const summaryCards = [
    { label: 'Total outstanding', value: fmt(stats.outstandingCents), sub: `${stats.outstandingCount} invoice${stats.outstandingCount !== 1 ? 's' : ''}`, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Paid this month',   value: fmt(stats.paidThisMonthCents), sub: `${stats.paidThisMonthCount} invoice${stats.paidThisMonthCount !== 1 ? 's' : ''}`, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Overdue',           value: fmt(stats.overdueCents), sub: `${stats.overdueCount} invoice${stats.overdueCount !== 1 ? 's' : ''}`, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Draft',             value: String(stats.draftCount), sub: `invoice${stats.draftCount !== 1 ? 's' : ''}`, color: 'text-gray-600', bg: 'bg-gray-50' },
  ]

  const filtered = invoices.filter((inv) => {
    const clientName = inv.clients
      ? `${inv.clients.first_name} ${inv.clients.last_name}`.toLowerCase()
      : ''
    const matchSearch =
      !search ||
      inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      clientName.includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || inv.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Invoices</h1>
          <p className="mt-0.5 text-sm text-gray-500">Track, send, and manage client invoices.</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <svg className="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New invoice
        </Button>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((c) => (
          <Card key={c.label} padding="md">
            <div className={`mb-2 inline-flex rounded-lg p-2 ${c.bg}`}>
              <svg className={`h-4 w-4 ${c.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-xs text-gray-500">{c.label}</p>
            <p className={`mt-0.5 text-xl font-bold ${c.color}`}>{c.value}</p>
            <p className="mt-0.5 text-xs text-gray-400">{c.sub}</p>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card padding="sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-xs flex-1">
            <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="search"
              placeholder="Search invoices…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as InvoiceStatus | 'all')}
            className="rounded-lg border border-gray-200 py-2 pl-3 pr-8 text-sm text-gray-600 focus:border-brand-400 focus:outline-none"
          >
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </Card>

      {/* Table */}
      <Card padding="sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              {['Invoice #', 'Client', 'Bill to', 'Amount', 'Status', 'Issued', 'Due'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                  {h}
                </th>
              ))}
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <p className="text-sm font-medium text-gray-700">
                    {invoices.length === 0 ? 'No invoices yet' : 'No invoices match your filters'}
                  </p>
                  {invoices.length === 0 && (
                    <p className="mt-1 text-xs text-gray-400">Click "New invoice" to create your first one.</p>
                  )}
                </td>
              </tr>
            ) : (
              filtered.map((inv) => {
                const clientName = inv.clients
                  ? `${inv.clients.first_name} ${inv.clients.last_name}`
                  : '—'
                const billTo = inv.recipient_type === 'ndia_claim'
                  ? <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">NDIA claim</span>
                  : <span className="text-gray-600">{inv.recipient_name ?? recipientLabel(inv.recipient_type)}</span>

                return (
                  <tr
                    key={inv.id}
                    onClick={() => {
                      if (!inv.id) { console.error('Invoice row missing id:', inv); return }
                      console.log('Navigating to invoice:', inv.id)
                      router.push(`/dashboard/invoices/${inv.id}`)
                    }}
                    className="cursor-pointer border-b border-gray-50 last:border-0 hover:bg-gray-50/50"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">{inv.invoice_number}</td>
                    <td className="px-4 py-3 text-gray-700">{clientName}</td>
                    <td className="px-4 py-3">{billTo}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {formatCurrency(inv.total_cents, inv.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={STATUS_COLOR[inv.status] ?? 'gray'}>
                        {inv.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {inv.issued_at ? formatDate(inv.issued_at) : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {inv.due_at ? formatDate(inv.due_at) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {inv.status === 'draft' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirmDelete(inv) }}
                          title="Delete invoice"
                          className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4h6v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </Card>

      {showModal && (
        <InvoiceModal
          clients={clients}
          nextInvoiceNumber={nextInvoiceNumber}
          orgSettings={orgSettings}
          onClose={() => setShowModal(false)}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Delete invoice?"
          message={`Are you sure you want to delete invoice ${confirmDelete.invoice_number}? Linked sessions will be unlinked but not deleted. This action cannot be undone.`}
          confirmLabel="Delete invoice"
          loading={deletePending}
          onConfirm={() => handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}
