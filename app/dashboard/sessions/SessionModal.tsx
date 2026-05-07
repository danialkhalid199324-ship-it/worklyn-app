'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import { createSession, updateSession, deleteSession } from '@/app/actions/sessions'
import { fetchSessionNotifications, sendSessionReminder } from '@/app/actions/notifications'
import type { ClientRow, ServiceRow, NdisPriceGuideRow, SessionNotificationRow, SessionStatus } from '@/types/database'
import type { SessionWithClient } from '@/lib/db'
import TherapyNotesFields, {
  type TherapyNotes,
  EMPTY_THERAPY_NOTES,
  parseTherapyNotes,
  computeTherapyWarnings,
} from './TherapyNotesFields'
import { parseNDISNotes } from './NDISNotesFields'
import type { NDISNotes } from './NDISNotesFields'
import CompleteSessionNotesModal, { type NewSessionData } from './CompleteSessionNotesModal'

interface Props {
  clients: ClientRow[]
  services?: ServiceRow[]
  priceGuide?: NdisPriceGuideRow[]
  session: SessionWithClient | null
  onClose: () => void
  defaultDate?: string       // YYYY-MM-DD, used when opening a new session from calendar
  defaultStartTime?: string  // HH:MM, used when clicking a time slot
}

// ── Notification helpers ──────────────────────────────────────────────────────

const NOTIF_STATUS_CLASSES: Record<string, string> = {
  sent:    'text-green-700 bg-green-50 border-green-200',
  failed:  'text-red-700 bg-red-50 border-red-200',
  pending: 'text-gray-600 bg-gray-50 border-gray-200',
}

const NOTIF_LABELS: Record<string, string> = {
  confirmation: 'Confirmation',
  reminder:     'Reminder',
}

function NotifBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${NOTIF_STATUS_CLASSES[status] ?? NOTIF_STATUS_CLASSES.pending}`}>
      {status}
    </span>
  )
}

function formatNotifTime(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

/** Converts old NDIS notes to therapy notes by placing the NDIS text into session_note. */
function ndisToTherapyNotes(ndis: NDISNotes): TherapyNotes {
  const parts: string[] = []
  if (ndis.participant_presentation) parts.push(`Participant Presentation:\n${ndis.participant_presentation}`)
  if (ndis.supports_delivered) parts.push(`Supports Delivered:\n${ndis.supports_delivered}`)
  if (ndis.participant_response) parts.push(`Participant Response:\n${ndis.participant_response}`)
  if (ndis.progress_toward_goals) parts.push(`Progress Toward Goals:\n${ndis.progress_toward_goals}`)
  if (ndis.risks_incidents) parts.push(`Risks / Incidents:\n${ndis.risks_incidents}`)
  if (ndis.next_steps) parts.push(`Next Steps:\n${ndis.next_steps}`)
  return { ...EMPTY_THERAPY_NOTES, session_note: parts.join('\n\n') }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SessionModal({ clients, services = [], priceGuide = [], session, onClose, defaultDate, defaultStartTime }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [deletePending, startDeleteTransition] = useTransition()
  const [reminderPending, startReminderTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  // Auto-calculate duration from start/end times
  const [startTime, setStartTime] = useState(session?.start_time?.slice(0, 5) ?? defaultStartTime ?? '')
  const [endTime, setEndTime] = useState(session?.end_time?.slice(0, 5) ?? '')
  const [duration, setDuration] = useState(String(session?.duration_minutes ?? '60'))

  // Service date — controlled so rate can react to date changes
  const [serviceDate, setServiceDate] = useState(
    session?.service_date ?? defaultDate ?? new Date().toISOString().slice(0, 10),
  )
  const [isPublicHoliday, setIsPublicHoliday] = useState(false)

  // Service catalogue auto-fill
  const [selectedServiceId, setSelectedServiceId] = useState(session?.service_id ?? '')
  const [ndisLineItem, setNdisLineItem] = useState(session?.ndis_line_item ?? '')
  const [rate, setRate] = useState(session?.rate ? String(session.rate) : '')
  // Manual override: when true the user can edit rate/ndis_line_item even if a price guide entry exists
  const [rateOverride, setRateOverride] = useState(false)

  // Structured therapy notes — init from therapy v1, or migrate from legacy NDIS, or start empty
  const [therapyNotes, setTherapyNotes] = useState<TherapyNotes>(() => {
    const therapy = parseTherapyNotes(session?.notes ?? null)
    if (therapy) return therapy
    const ndis = parseNDISNotes(session?.notes ?? null)
    if (ndis) return ndisToTherapyNotes(ndis)
    return { ...EMPTY_THERAPY_NOTES }
  })
  const [notesWarnings, setNotesWarnings] = useState<string[]>([])
  const hasLegacyNotes = !parseTherapyNotes(session?.notes ?? null) && !parseNDISNotes(session?.notes ?? null) && Boolean(session?.notes?.trim())

  // Controlled status — needed to intercept transition to 'completed'
  const [selectedStatus, setSelectedStatus] = useState<SessionStatus>(session?.status ?? 'scheduled')

  // Notes completion modal state
  const [showNotesStep, setShowNotesStep] = useState(false)
  const [pendingNewSessionData, setPendingNewSessionData] = useState<NewSessionData | null>(null)

  // Must be derived before lockedByPriceGuide and rateLabel
  const isInvoiced = Boolean(session?.invoice_id)

  // Derive the active price guide entry for the currently selected service
  const selectedService = services.find((s) => s.id === selectedServiceId) ?? null
  const pgEntry: NdisPriceGuideRow | null = selectedService?.support_item_number
    ? (priceGuide.find((p) => p.support_item_number === selectedService.support_item_number) ?? null)
    : null

  // Whether the rate/line-item fields are locked to the price guide
  const lockedByPriceGuide = !!pgEntry && !rateOverride && !isInvoiced

  function dayOfDate(date: string): number {
    return date ? new Date(`${date}T12:00:00`).getDay() : -1
  }

  function resolveRateFromPg(pg: NdisPriceGuideRow, date: string, ph: boolean): string {
    const day = dayOfDate(date)
    let r: number | null
    if (ph)       r = pg.public_holiday_rate ?? pg.weekday_rate
    else if (day === 6) r = pg.saturday_rate ?? pg.weekday_rate
    else if (day === 0) r = pg.sunday_rate ?? pg.weekday_rate
    else          r = pg.weekday_rate
    return r != null ? String(r) : ''
  }

  function resolveRateFromService(svc: ServiceRow, date: string, ph: boolean): string {
    const day = dayOfDate(date)
    let resolved: number | null
    if (ph)       resolved = svc.public_holiday_rate ?? svc.default_rate
    else if (day === 6) resolved = svc.saturday_rate ?? svc.default_rate
    else if (day === 0) resolved = svc.sunday_rate ?? svc.default_rate
    else          resolved = svc.weekday_rate ?? svc.default_rate
    return resolved != null ? String(resolved) : ''
  }

  function resolveRate(svc: ServiceRow, pg: NdisPriceGuideRow | null, date: string, ph: boolean): string {
    if (pg) return resolveRateFromPg(pg, date, ph)
    return resolveRateFromService(svc, date, ph)
  }

  function dayTypeLabel(date: string, ph: boolean): string {
    if (ph) return 'Public holiday rate'
    const day = dayOfDate(date)
    if (day === 6) return 'Saturday rate'
    if (day === 0) return 'Sunday rate'
    if (day >= 1 && day <= 5) return 'Weekday rate'
    return ''
  }

  function handleServiceChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const sid = e.target.value
    setSelectedServiceId(sid)
    setRateOverride(false) // reset override when service changes
    const svc = services.find((s) => s.id === sid)
    if (svc) {
      if (svc.ndis_line_item) setNdisLineItem(svc.ndis_line_item)
      const pg = svc.support_item_number
        ? (priceGuide.find((p) => p.support_item_number === svc.support_item_number) ?? null)
        : null
      setRate(resolveRate(svc, pg, serviceDate, isPublicHoliday))
    }
  }

  function handleDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newDate = e.target.value
    setServiceDate(newDate)
    if (selectedServiceId && !rateOverride) {
      const svc = services.find((s) => s.id === selectedServiceId)
      if (svc) {
        const pg = svc.support_item_number
          ? (priceGuide.find((p) => p.support_item_number === svc.support_item_number) ?? null)
          : null
        setRate(resolveRate(svc, pg, newDate, isPublicHoliday))
      }
    }
  }

  function handlePublicHolidayChange(e: React.ChangeEvent<HTMLInputElement>) {
    const ph = e.target.checked
    setIsPublicHoliday(ph)
    if (selectedServiceId && !rateOverride) {
      const svc = services.find((s) => s.id === selectedServiceId)
      if (svc) {
        const pg = svc.support_item_number
          ? (priceGuide.find((p) => p.support_item_number === svc.support_item_number) ?? null)
          : null
        setRate(resolveRate(svc, pg, serviceDate, ph))
      }
    }
  }

  function handleOverrideChange(checked: boolean) {
    setRateOverride(checked)
    if (!checked && selectedService) {
      // Re-resolve rate from price guide / service when override is turned off
      const pg = selectedService.support_item_number
        ? (priceGuide.find((p) => p.support_item_number === selectedService.support_item_number) ?? null)
        : null
      setRate(resolveRate(selectedService, pg, serviceDate, isPublicHoliday))
      if (selectedService.ndis_line_item) setNdisLineItem(selectedService.ndis_line_item)
    }
  }

  // Label shown below the Rate field
  const rateLabel = (() => {
    if (isInvoiced || !selectedServiceId) return ''
    if (rateOverride) return 'Rate source: Manual override'
    if (pgEntry) return `Rate source: NDIS Support Catalogue ${pgEntry.source_version}`
    if (serviceDate) return dayTypeLabel(serviceDate, isPublicHoliday)
    return ''
  })()

  // Notification history (loaded on mount when editing an existing session)
  const [notifications, setNotifications] = useState<SessionNotificationRow[]>([])
  const [notifsLoaded, setNotifsLoaded] = useState(false)

  useEffect(() => {
    if (startTime && endTime) {
      const [sh, sm] = startTime.split(':').map(Number)
      const [eh, em] = endTime.split(':').map(Number)
      const mins = (eh * 60 + em) - (sh * 60 + sm)
      if (mins > 0) setDuration(String(mins))
    }
  }, [startTime, endTime])

  // Load notification history whenever an existing session is opened
  useEffect(() => {
    if (!session) { setNotifications([]); setNotifsLoaded(true); return }
    setNotifsLoaded(false)
    fetchSessionNotifications(session.id)
      .then((data) => { setNotifications(data); setNotifsLoaded(true) })
      .catch(() => setNotifsLoaded(true))
  }, [session?.id])  // eslint-disable-line react-hooks/exhaustive-deps

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // If transitioning to completed, open the notes modal first
    const wasAlreadyCompleted = session?.status === 'completed'
    if (selectedStatus === 'completed' && !wasAlreadyCompleted) {
      if (!session) {
        // New session — capture current form fields for CompleteSessionNotesModal
        const fd = new FormData(formRef.current!)
        setPendingNewSessionData({
          client_id: fd.get('client_id') as string,
          service_id: (fd.get('service_id') as string) || null,
          service_date: fd.get('service_date') as string,
          start_time: (fd.get('start_time') as string) || null,
          end_time: (fd.get('end_time') as string) || null,
          duration_minutes: parseInt(fd.get('duration_minutes') as string) || 60,
          ndis_line_item: (fd.get('ndis_line_item') as string)?.trim() || null,
          rate: parseFloat(fd.get('rate') as string) || 0,
        })
      }
      setShowNotesStep(true)
      return
    }

    const fd = new FormData(formRef.current!)

    // Only serialize notes for existing completed sessions
    if (session?.status === 'completed') {
      const warns = computeTherapyWarnings(therapyNotes)
      setNotesWarnings(warns)
      if (warns.length > 0) return
      fd.set('notes', JSON.stringify({ __therapy_v1: true, ...therapyNotes }))
    }

    setError(null)
    startTransition(async () => {
      const result = session
        ? await updateSession(session.id, fd)
        : await createSession(fd)

      if ('error' in result) {
        setError(result.error ?? null)
      } else {
        router.refresh()
        onClose()
      }
    })
  }

  function handleDelete() {
    if (!session) return
    setError(null)
    startDeleteTransition(async () => {
      const result = await deleteSession(session.id)
      if ('error' in result) {
        setError(result.error ?? null)
      } else {
        router.refresh()
        onClose()
      }
    })
  }

  function handleReminder() {
    if (!session) return
    setError(null)
    startReminderTransition(async () => {
      const result = await sendSessionReminder(session.id)
      if ('error' in result) {
        setError(result.error ?? null)
      } else {
        // Reload notification list to show the new record
        const fresh = await fetchSessionNotifications(session.id)
        setNotifications(fresh)
      }
    })
  }

  const reminderSent = notifications.some(
    (n) => n.type === 'reminder' && n.status === 'sent',
  )
  const confirmationRecord = notifications.find((n) => n.type === 'confirmation')



  const notesModalClientName = session
    ? [session.clients?.first_name, session.clients?.last_name].filter(Boolean).join(' ')
    : (() => {
        const c = clients.find((cl) => cl.id === pendingNewSessionData?.client_id)
        return c ? `${c.first_name} ${c.last_name}` : ''
      })()

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl">

        {/* Header — fixed */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">
            {session ? 'Edit Session' : 'New Session'}
          </h2>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:text-gray-600">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {isInvoiced && (
          <div className="mx-6 mt-4 shrink-0 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            This session has been invoiced and notes are locked for audit integrity.
          </div>
        )}

        {/* Scrollable form body */}
        <form ref={formRef} onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="space-y-4 px-6 py-5">

            {/* ── Session Details ─────────────────────────────── */}

            {/* Service */}
            {services.length > 0 && (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Service</label>
                <select
                  name="service_id"
                  disabled={isInvoiced}
                  value={selectedServiceId}
                  onChange={handleServiceChange}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-500"
                >
                  <option value="">Select service (auto-fills code &amp; rate)…</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}{s.ndis_line_item ? ` — ${s.ndis_line_item}` : ''}{s.default_rate ? ` ($${s.default_rate}/hr)` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Client */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Client</label>
              <select
                name="client_id"
                required
                disabled={!!session || isInvoiced}
                defaultValue={session?.client_id ?? ''}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-500"
              >
                <option value="">Select client…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.first_name} {c.last_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Service date */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Service date</label>
                <input
                  type="date"
                  name="service_date"
                  required
                  disabled={isInvoiced}
                  value={serviceDate}
                  onChange={handleDateChange}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
                />
              </div>

              {/* Status */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
                <select
                  name="status"
                  disabled={isInvoiced}
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as SessionStatus)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {/* Public holiday flag */}
            <label className="flex cursor-pointer select-none items-center gap-2">
              <input
                type="checkbox"
                disabled={isInvoiced}
                checked={isPublicHoliday}
                onChange={handlePublicHolidayChange}
                className="h-4 w-4 rounded border-gray-300 accent-indigo-600"
              />
              <span className="text-sm font-medium text-gray-700">Public holiday</span>
            </label>

            <div className="grid grid-cols-3 gap-4">
              {/* Start time */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Start time</label>
                <input
                  type="time"
                  name="start_time"
                  disabled={isInvoiced}
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
                />
              </div>

              {/* End time */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">End time</label>
                <input
                  type="time"
                  name="end_time"
                  disabled={isInvoiced}
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
                />
              </div>

              {/* Duration */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Duration (min)</label>
                <input
                  type="number"
                  name="duration_minutes"
                  required
                  min={1}
                  disabled={isInvoiced}
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* NDIS line item */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">NDIS line item</label>
                <input
                  type="text"
                  name="ndis_line_item"
                  disabled={isInvoiced || lockedByPriceGuide}
                  value={ndisLineItem}
                  onChange={(e) => setNdisLineItem(e.target.value)}
                  placeholder="e.g. 15_056_0128_1_3"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-500 placeholder:text-gray-300"
                />
              </div>

              {/* Hourly rate */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Rate ($/hr)</label>
                <input
                  type="number"
                  name="rate"
                  required
                  min={0.01}
                  step={0.01}
                  disabled={isInvoiced || lockedByPriceGuide}
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  placeholder="193.99"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-500 placeholder:text-gray-300"
                />
                {rateLabel && (
                  <p className={`mt-0.5 text-xs ${rateOverride ? 'text-amber-500' : 'text-indigo-500'}`}>
                    {rateLabel}
                  </p>
                )}
              </div>
            </div>

            {/* Override toggle — visible when a price guide entry governs this service */}
            {pgEntry && !isInvoiced && (
              <label className="flex cursor-pointer select-none items-center gap-2">
                <input
                  type="checkbox"
                  checked={rateOverride}
                  onChange={(e) => handleOverrideChange(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 accent-indigo-600"
                />
                <span className="text-xs font-medium text-gray-600">Override rate manually</span>
              </label>
            )}

            {/* ── Clinical Notes (only for existing completed sessions) ── */}
            {session?.status === 'completed' && (
              <div className="border-t border-gray-100 pt-4">
                <div className="mb-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    Clinical Notes
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400">Therapy session documentation</p>
                </div>

                {/* Show plain-text legacy notes read-only if they pre-date any structured format */}
                {hasLegacyNotes && (
                  <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                    <p className="mb-1 text-xs font-semibold text-gray-500">Previous Notes (read-only)</p>
                    <p className="whitespace-pre-wrap text-xs text-gray-600">{session!.notes}</p>
                  </div>
                )}

                <TherapyNotesFields
                  notes={therapyNotes}
                  onChange={setTherapyNotes}
                  warnings={notesWarnings}
                  disabled={isInvoiced}
                />
              </div>
            )}

            {/* ── Notification history ────────────────────────── */}
            {session && (
              <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Email notifications
                  </p>
                  {session.status !== 'cancelled' && (
                    <Button
                      type="button"
                      variant="outline"
                      loading={reminderPending}
                      onClick={handleReminder}
                      className="h-7 px-2.5 text-xs"
                    >
                      {reminderSent ? 'Resend reminder' : 'Send reminder'}
                    </Button>
                  )}
                </div>

                {!notifsLoaded ? (
                  <p className="text-xs text-gray-400">Loading…</p>
                ) : notifications.length === 0 ? (
                  <p className="text-xs text-gray-400">
                    {confirmationRecord === undefined
                      ? 'No emails sent yet.'
                      : 'No notifications found.'}
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {notifications.map((n) => (
                      <li key={n.id} className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <span className="text-xs font-medium text-gray-700">
                            {NOTIF_LABELS[n.type] ?? n.type}
                          </span>
                          {n.recipient_email && (
                            <span className="ml-1.5 truncate text-xs text-gray-400">
                              → {n.recipient_name ?? n.recipient_email}
                            </span>
                          )}
                          {n.error_message && (
                            <p className="mt-0.5 truncate text-xs text-red-600" title={n.error_message}>
                              {n.error_message}
                            </p>
                          )}
                          {n.sent_at && (
                            <p className="text-xs text-gray-400">{formatNotifTime(n.sent_at)}</p>
                          )}
                        </div>
                        <NotifBadge status={n.status} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <div className="flex items-center justify-between pt-1">
              {session && !isInvoiced ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDelete}
                  loading={deletePending}
                  className="text-red-600 hover:border-red-300 hover:bg-red-50"
                >
                  Delete
                </Button>
              ) : (
                <div />
              )}
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                {!isInvoiced && (
                  <Button type="submit" loading={pending}>
                    {session ? 'Save changes' : 'Create session'}
                  </Button>
                )}
              </div>
            </div>

          </div>
        </form>
      </div>
    </div>

    {showNotesStep && (
      <CompleteSessionNotesModal
        session={session}
        newSessionData={pendingNewSessionData ?? undefined}
        clientName={notesModalClientName}
        serviceName={services.find((s) => s.id === selectedServiceId)?.name ?? ''}
        onSuccess={() => {
          setShowNotesStep(false)
          setPendingNewSessionData(null)
          onClose()
        }}
        onCancel={() => {
          setShowNotesStep(false)
          setPendingNewSessionData(null)
          setSelectedStatus(session?.status ?? 'scheduled')
        }}
      />
    )}
    </>
  )
}
