'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import NDISNotesFields, {
  type NDISNotes,
  parseNDISNotes,
  computeNotesWarnings,
} from './NDISNotesFields'
import { completeSession, createSession } from '@/app/actions/sessions'
import type { SessionWithClient } from '@/lib/db'

export interface NewSessionData {
  client_id: string
  service_id: string | null
  service_date: string
  start_time: string | null
  end_time: string | null
  duration_minutes: number
  ndis_line_item: string | null
  rate: number
}

interface Props {
  session: SessionWithClient | null   // null when creating a new session
  newSessionData?: NewSessionData     // required when session is null
  clientName: string
  serviceName: string
  onSuccess: () => void
  onCancel: () => void
}

const EMPTY_NDIS: NDISNotes = {
  participant_presentation: '',
  supports_delivered: '',
  participant_response: '',
  progress_toward_goals: '',
  risks_incidents: '',
  next_steps: '',
}

export default function CompleteSessionNotesModal({
  session,
  newSessionData,
  clientName,
  serviceName,
  onSuccess,
  onCancel,
}: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [ndisNotes, setNdisNotes] = useState<NDISNotes>(
    () => parseNDISNotes(session?.notes ?? null) ?? { ...EMPTY_NDIS },
  )
  const [saveAttempted, setSaveAttempted] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const warnings = saveAttempted ? computeNotesWarnings(ndisNotes) : []

  const serviceDate = session?.service_date ?? newSessionData?.service_date ?? ''
  const startTime = (session?.start_time ?? newSessionData?.start_time ?? '').slice(0, 5)
  const endTime = (session?.end_time ?? newSessionData?.end_time ?? '').slice(0, 5)
  const durationMinutes = session?.duration_minutes ?? newSessionData?.duration_minutes

  const displayDate = serviceDate
    ? new Date(`${serviceDate}T12:00:00`).toLocaleDateString('en-AU', {
        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
      })
    : ''

  function handleSave() {
    setSaveAttempted(true)
    const currentWarnings = computeNotesWarnings(ndisNotes)
    if (currentWarnings.length > 0) return

    setServerError(null)
    const notesJson = JSON.stringify({ __ndis_v1: true, ...ndisNotes })

    startTransition(async () => {
      let result: { success?: boolean; error?: string }

      if (session) {
        result = await completeSession(session.id, notesJson)
      } else if (newSessionData) {
        const fd = new FormData()
        fd.set('client_id', newSessionData.client_id)
        if (newSessionData.service_id) fd.set('service_id', newSessionData.service_id)
        fd.set('service_date', newSessionData.service_date)
        if (newSessionData.start_time) fd.set('start_time', newSessionData.start_time)
        if (newSessionData.end_time) fd.set('end_time', newSessionData.end_time)
        fd.set('duration_minutes', String(newSessionData.duration_minutes))
        if (newSessionData.ndis_line_item) fd.set('ndis_line_item', newSessionData.ndis_line_item)
        fd.set('rate', String(newSessionData.rate))
        fd.set('status', 'completed')
        fd.set('notes', notesJson)
        result = await createSession(fd)
      } else {
        setServerError('Missing session data.')
        return
      }

      if (result.error) {
        setServerError(result.error)
      } else {
        router.refresh()
        onSuccess()
      }
    })
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl">

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">Complete Session Notes</h2>
          <button
            onClick={onCancel}
            className="rounded p-1 text-gray-400 hover:text-gray-600"
            aria-label="Cancel"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">

          {/* Required notice */}
          <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
            Session notes are required before this session can be completed and invoiced.
          </div>

          {/* Session reference */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              Session Reference
            </p>
            <div className="space-y-1 text-sm">
              {clientName && (
                <div>
                  <span className="text-xs text-gray-400">Client: </span>
                  <span className="text-gray-700">{clientName}</span>
                </div>
              )}
              {displayDate && (
                <div>
                  <span className="text-xs text-gray-400">Date: </span>
                  <span className="text-gray-700">{displayDate}</span>
                </div>
              )}
              {startTime && endTime && (
                <div>
                  <span className="text-xs text-gray-400">Time: </span>
                  <span className="text-gray-700">{startTime} – {endTime}</span>
                </div>
              )}
              {durationMinutes != null && (
                <div>
                  <span className="text-xs text-gray-400">Duration: </span>
                  <span className="text-gray-700">{durationMinutes} min</span>
                </div>
              )}
              {serviceName && (
                <div>
                  <span className="text-xs text-gray-400">Service: </span>
                  <span className="text-gray-700">{serviceName}</span>
                </div>
              )}
            </div>
          </div>

          {/* NDIS notes — suppress internal session reference (already shown above) */}
          <NDISNotesFields
            notes={ndisNotes}
            onChange={setNdisNotes}
            warnings={warnings}
            meta={{ date: '', startTime: '', endTime: '', duration: '', serviceName: '' }}
            disabled={false}
          />

          {serverError && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {serverError}
            </p>
          )}

        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="button" loading={pending} onClick={handleSave}>
            Complete Session
          </Button>
        </div>

      </div>
    </div>
  )
}
