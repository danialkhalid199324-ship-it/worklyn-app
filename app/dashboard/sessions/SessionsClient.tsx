'use client'

import { useState, useTransition } from 'react'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { formatCurrency, formatDate } from '@/lib/utils'
import { deleteSession, cancelSession } from '@/app/actions/sessions'
import type { ClientRow, ServiceRow, NdisPriceGuideRow } from '@/types/database'
import type { SessionWithClient } from '@/lib/db'
import SessionModal from './SessionModal'
import GenerateInvoiceModal from './GenerateInvoiceModal'
import { useRouter } from 'next/navigation'

interface Props {
  sessions: SessionWithClient[]
  clients: ClientRow[]
  services: ServiceRow[]
  priceGuide: NdisPriceGuideRow[]
}

const STATUS_COLOR = {
  scheduled: 'blue',
  completed: 'green',
  cancelled: 'gray',
} as const

type Filter = 'all' | 'scheduled' | 'completed' | 'unbilled'

function sessionAmount(s: SessionWithClient) {
  return Math.round((s.duration_minutes / 60) * s.rate * 100)
}

export default function SessionsClient({ sessions, clients, services, priceGuide }: Props) {
  const router = useRouter()
  const [filter, setFilter] = useState<Filter>('all')
  const [showNew, setShowNew] = useState(false)
  const [showGenerate, setShowGenerate] = useState(false)
  const [editSession, setEditSession] = useState<SessionWithClient | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<SessionWithClient | null>(null)
  const [confirmCancel, setConfirmCancel] = useState<SessionWithClient | null>(null)
  const [actionPending, startActionTransition] = useTransition()
  const [actionError, setActionError] = useState<string | null>(null)

  function handleDelete(s: SessionWithClient) {
    setActionError(null)
    startActionTransition(async () => {
      const result = await deleteSession(s.id)
      if ('error' in result) {
        setActionError(result.error ?? null)
      } else {
        setConfirmDelete(null)
        router.refresh()
      }
    })
  }

  function handleCancel(s: SessionWithClient) {
    setActionError(null)
    startActionTransition(async () => {
      const result = await cancelSession(s.id)
      if ('error' in result) {
        setActionError(result.error ?? null)
      } else {
        setConfirmCancel(null)
        router.refresh()
      }
    })
  }

  const filtered = sessions.filter((s) => {
    if (filter === 'scheduled') return s.status === 'scheduled'
    if (filter === 'completed') return s.status === 'completed'
    if (filter === 'unbilled') return s.status === 'completed' && !s.invoice_id
    return true
  })

  const unbilledCount = sessions.filter((s) => s.status === 'completed' && !s.invoice_id).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sessions</h1>
          <p className="mt-0.5 text-sm text-gray-500">Record delivered sessions and generate invoices automatically.</p>
        </div>
        <div className="flex items-center gap-2">
          {unbilledCount > 0 && (
            <Button variant="outline" onClick={() => setShowGenerate(true)}>
              Generate invoice
              <span className="ml-1.5 rounded-full bg-indigo-100 px-1.5 py-0.5 text-xs font-semibold text-indigo-700">
                {unbilledCount}
              </span>
            </Button>
          )}
          <Button onClick={() => setShowNew(true)}>New session</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-1 rounded-lg border border-gray-200 bg-white p-1 w-fit">
        {(['all', 'scheduled', 'completed', 'unbilled'] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
              filter === f
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {f === 'unbilled' ? 'Unbilled' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-gray-500">No sessions found.</p>
            <Button className="mt-4" onClick={() => setShowNew(true)}>
              Record first session
            </Button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Client</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">NDIS code</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">Duration</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">Amount</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-400">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Invoice</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((s) => (
                <tr
                  key={s.id}
                  onClick={() => setEditSession(s)}
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {formatDate(`${s.service_date}T12:00:00`)}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {s.clients
                      ? `${s.clients.first_name} ${s.clients.last_name}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {s.ndis_line_item ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {s.duration_minutes}min
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    {formatCurrency(sessionAmount(s), 'AUD')}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge color={STATUS_COLOR[s.status] ?? 'gray'}>{s.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    {s.invoices ? (
                      <a
                        href={`/dashboard/invoices/${s.invoice_id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-indigo-600 hover:underline font-medium"
                      >
                        {s.invoices.invoice_number}
                      </a>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  {/* Per-row actions */}
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setEditSession(s)}
                        title="Edit"
                        className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828A2 2 0 0110 16.414H8v-2a2 2 0 01.586-1.414z" />
                        </svg>
                      </button>
                      {s.status === 'scheduled' && !s.invoice_id && (
                        <button
                          onClick={() => setConfirmCancel(s)}
                          title="Cancel session"
                          className="rounded p-1.5 text-gray-400 hover:bg-amber-50 hover:text-amber-600"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636L5.636 18.364M5.636 5.636l12.728 12.728" />
                          </svg>
                        </button>
                      )}
                      {!s.invoice_id && (
                        <button
                          onClick={() => setConfirmDelete(s)}
                          title="Delete"
                          className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4h6v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      {(showNew || editSession) && (
        <SessionModal
          clients={clients}
          services={services}
          priceGuide={priceGuide}
          session={editSession}
          onClose={() => { setShowNew(false); setEditSession(null) }}
        />
      )}

      {showGenerate && (
        <GenerateInvoiceModal
          clients={clients}
          sessions={sessions.filter((s) => s.status === 'completed' && !s.invoice_id)}
          onClose={() => setShowGenerate(false)}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Delete session?"
          message="Are you sure you want to delete this session? This action cannot be undone."
          confirmLabel="Delete session"
          loading={actionPending}
          onConfirm={() => handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {confirmCancel && (
        <ConfirmDialog
          title="Cancel session?"
          message="Are you sure you want to cancel this session? This action cannot be undone."
          confirmLabel="Cancel session"
          loading={actionPending}
          onConfirm={() => handleCancel(confirmCancel)}
          onCancel={() => setConfirmCancel(null)}
        />
      )}

      {actionError && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-lg">
          {actionError}
          <button onClick={() => setActionError(null)} className="ml-3 font-medium underline">Dismiss</button>
        </div>
      )}
    </div>
  )
}
