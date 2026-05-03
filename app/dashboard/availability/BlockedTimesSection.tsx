'use client'

import { useState, useTransition } from 'react'
import { addBlockedTime, deleteBlockedTime } from '@/app/actions/availability'
import Card from '@/components/ui/Card'
import type { BlockedTimeRow } from '@/types/database'

function formatBlockedRange(bt: BlockedTimeRow): string {
  const start = new Date(bt.start_time)
  const end = new Date(bt.end_time)
  const date = start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  const startT = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  const endT = end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  return `${date} · ${startT} – ${endT}`
}

export default function BlockedTimesSection({
  blockedTimes,
  practitionerId,
}: {
  blockedTimes: BlockedTimeRow[]
  practitionerId: string
}) {
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const today = new Date().toISOString().split('T')[0]

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setError(null)

    startTransition(async () => {
      const res = await addBlockedTime(fd)
      if ('error' in res) {
        setError(res.error ?? null)
      } else {
        setAdding(false)
      }
    })
  }

  function handleDelete(id: string) {
    startTransition(() => deleteBlockedTime(id))
  }

  return (
    <Card>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-900">Blocked times</h2>
          <p className="mt-0.5 text-xs text-gray-400">
            Block specific dates or times — holidays, personal appointments, etc.
          </p>
        </div>
        <button
          onClick={() => setAdding((v) => !v)}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
        >
          {adding ? 'Cancel' : '+ Add block'}
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <form onSubmit={handleAdd} className="mb-5 rounded-xl border border-dashed border-gray-200 p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
              <input
                type="date"
                name="date"
                required
                min={today}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
              <input
                type="time"
                name="start_time"
                required
                defaultValue="09:00"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
              <input
                type="time"
                name="end_time"
                required
                defaultValue="17:00"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Reason (optional)</label>
            <input
              type="text"
              name="reason"
              placeholder="e.g. Public holiday, personal appointment…"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
            />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {isPending ? 'Saving…' : 'Add block'}
            </button>
          </div>
        </form>
      )}

      {/* List */}
      {blockedTimes.length === 0 ? (
        <p className="text-sm text-gray-400">No upcoming blocked times.</p>
      ) : (
        <ul className="divide-y divide-gray-50">
          {blockedTimes.map((bt) => (
            <li key={bt.id} className="flex items-center justify-between py-2.5">
              <div>
                <p className="text-sm font-medium text-gray-700">{formatBlockedRange(bt)}</p>
                {bt.reason && (
                  <p className="text-xs text-gray-400">{bt.reason}</p>
                )}
              </div>
              <button
                onClick={() => handleDelete(bt.id)}
                disabled={isPending}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
                aria-label="Delete"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
