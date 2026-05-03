'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import { generateInvoiceFromSessions } from '@/app/actions/sessions'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { ClientRow } from '@/types/database'
import type { SessionWithClient } from '@/lib/db'

interface Props {
  clients: ClientRow[]
  sessions: SessionWithClient[]  // pre-filtered: completed + no invoice_id
  onClose: () => void
}

function sessionAmount(s: SessionWithClient) {
  return Math.round((s.duration_minutes / 60) * s.rate * 100)
}

export default function GenerateInvoiceModal({ clients, sessions, onClose }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [clientId, setClientId] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [notes, setNotes] = useState('')

  const clientSessions = useMemo(
    () => sessions.filter((s) => s.client_id === clientId),
    [sessions, clientId],
  )

  function handleClientChange(id: string) {
    setClientId(id)
    // Auto-select all sessions for the new client
    setSelected(new Set(sessions.filter((s) => s.client_id === id).map((s) => s.id)))
  }

  function toggleAll() {
    if (selected.size === clientSessions.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(clientSessions.map((s) => s.id)))
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const totalCents = clientSessions
    .filter((s) => selected.has(s.id))
    .reduce((sum, s) => sum + sessionAmount(s), 0)

  function handleGenerate() {
    if (!clientId || selected.size === 0) return
    setError(null)

    const fd = new FormData()
    fd.append('client_id', clientId)
    fd.append('session_ids', JSON.stringify(Array.from(selected)))
    fd.append('notes', notes)

    startTransition(async () => {
      const result = await generateInvoiceFromSessions(fd)
      if ('error' in result) {
        setError(result.error ?? null)
      } else {
        router.push(`/dashboard/invoices/${result.invoiceId}`)
        onClose()
      }
    })
  }

  // Clients that have at least one unbilled completed session
  const eligibleClientIds = new Set(sessions.map((s) => s.client_id))
  const eligibleClients = clients.filter((c) => eligibleClientIds.has(c.id))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">Generate invoice from sessions</h2>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:text-gray-600">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          {/* Client selector */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Client</label>
            <select
              value={clientId}
              onChange={(e) => handleClientChange(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select client…</option>
              {eligibleClients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.first_name} {c.last_name}
                </option>
              ))}
            </select>
          </div>

          {/* Session list */}
          {clientId && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Sessions to include ({selected.size} of {clientSessions.length})
                </label>
                <button
                  type="button"
                  onClick={toggleAll}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                >
                  {selected.size === clientSessions.length ? 'Deselect all' : 'Select all'}
                </button>
              </div>

              {clientSessions.length === 0 ? (
                <p className="rounded-lg bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
                  No unbilled completed sessions for this client.
                </p>
              ) : (
                <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-gray-200">
                  {clientSessions.map((s) => {
                    const checked = selected.has(s.id)
                    const amt = sessionAmount(s)
                    return (
                      <label
                        key={s.id}
                        className={`flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50 ${
                          checked ? 'bg-indigo-50/50' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(s.id)}
                          className="h-4 w-4 rounded border-gray-300 accent-indigo-600"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {formatDate(`${s.service_date}T12:00:00`)}
                            {s.ndis_line_item && (
                              <span className="ml-2 text-xs text-gray-500">{s.ndis_line_item}</span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500">
                            {s.duration_minutes}min @ ${s.rate}/hr
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-gray-800">
                          {formatCurrency(amt, 'AUD')}
                        </span>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          {clientId && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Invoice notes (optional)</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Payment terms, reference, etc."
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-gray-300"
              />
            </div>
          )}

          {/* Total preview */}
          {selected.size > 0 && (
            <div className="rounded-xl bg-gray-50 px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Invoice total ({selected.size} session{selected.size !== 1 ? 's' : ''})</span>
                <span className="text-lg font-bold text-indigo-700">{formatCurrency(totalCents, 'AUD')}</span>
              </div>
              <p className="mt-1 text-xs text-gray-400">
                Draft invoice will be created. You can review and send from the invoice page.
              </p>
            </div>
          )}

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              onClick={handleGenerate}
              loading={pending}
              disabled={!clientId || selected.size === 0}
            >
              Generate draft invoice
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
