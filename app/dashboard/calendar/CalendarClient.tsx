'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import type { ClientRow, ServiceRow, NdisPriceGuideRow, PractitionerRow, BlockedTimeRow } from '@/types/database'
import type { SessionWithClient } from '@/lib/db'
import SessionModal from '../sessions/SessionModal'

const HOUR_START = 8
const HOUR_END = 18
const HOUR_PX = 64
const TOTAL_PX = (HOUR_END - HOUR_START) * HOUR_PX
const HOURS = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => i + HOUR_START)
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// ── Date helpers ─────────────────────────────────────────────────────────────

function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}

function localToday(): string {
  const d = new Date()
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}

function dayNum(dateStr: string): number {
  return Number(dateStr.split('-')[2])
}

function timeToMins(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function padTwo(n: number): string {
  return String(n).padStart(2, '0')
}

// ── Colour helpers ────────────────────────────────────────────────────────────

const FALLBACK_COLOR = '#6366f1'

/** Convert hex like "#6366f1" to "r g b" for CSS rgba(). */
function hexToRgb(hex: string): string {
  const h = hex.replace('#', '')
  if (h.length !== 6) return '99 102 241'
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `${r} ${g} ${b}`
}

/**
 * Returns a readable text colour for content rendered on a light tinted
 * background (≈15% opacity) of the same hue. Dark colours are used as-is;
 * light colours are darkened so they stay legible on pale backgrounds.
 */
function textColor(hex: string): string {
  const h = hex.replace('#', '')
  if (h.length !== 6) return '#4338ca'
  const r = parseInt(h.slice(0, 2), 16) / 255
  const g = parseInt(h.slice(2, 4), 16) / 255
  const b = parseInt(h.slice(4, 6), 16) / 255
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b
  if (luminance < 0.4) return hex
  const dr = Math.round(r * 255 * 0.55).toString(16).padStart(2, '0')
  const dg = Math.round(g * 255 * 0.55).toString(16).padStart(2, '0')
  const db = Math.round(b * 255 * 0.55).toString(16).padStart(2, '0')
  return `#${dr}${dg}${db}`
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  sessions: SessionWithClient[]
  blockedTimes: BlockedTimeRow[]
  clients: ClientRow[]
  services: ServiceRow[]
  priceGuide: NdisPriceGuideRow[]
  practitioners: PractitionerRow[]
  currentPractitionerId: string
  isAdmin: boolean
  weekStart: string
}

export default function CalendarClient({
  sessions,
  blockedTimes,
  clients,
  services,
  priceGuide,
  practitioners,
  currentPractitionerId,
  isAdmin,
  weekStart,
}: Props) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [editSession, setEditSession] = useState<SessionWithClient | null>(null)
  const [slotDate, setSlotDate] = useState<string | undefined>()
  const [slotTime, setSlotTime] = useState<string | undefined>()
  const [filterPractitionerId, setFilterPractitionerId] = useState<string>(
    isAdmin ? 'all' : currentPractitionerId,
  )

  const todayStr = localToday()
  const isTeam = practitioners.length > 1

  // Practitioner lookup map for colours and names
  const practitionerMap = new Map(practitioners.map((p) => [p.id, p]))

  const days = DAY_LABELS.map((label, i) => {
    const dateStr = addDays(weekStart, i)
    return { label, dateStr, dayNum: dayNum(dateStr), isToday: dateStr === todayStr }
  })

  // Filter sessions and blocked times by selected practitioner
  const visibleSessions = filterPractitionerId === 'all'
    ? sessions
    : sessions.filter((s) => s.practitioner_id === filterPractitionerId)

  const visibleBlocked = filterPractitionerId === 'all'
    ? blockedTimes
    : blockedTimes.filter((b) => b.practitioner_id === filterPractitionerId)

  // Index by date
  const sessionsByDate = new Map<string, SessionWithClient[]>()
  for (const s of visibleSessions) {
    const arr = sessionsByDate.get(s.service_date) ?? []
    arr.push(s)
    sessionsByDate.set(s.service_date, arr)
  }

  const blockedByDate = new Map<string, BlockedTimeRow[]>()
  for (const b of visibleBlocked) {
    const date = b.start_time.slice(0, 10)
    const arr = blockedByDate.get(date) ?? []
    arr.push(b)
    blockedByDate.set(date, arr)
  }

  function navigate(offset: number) {
    router.push(`/dashboard/calendar?week=${addDays(weekStart, offset * 7)}`)
  }

  function openSlot(dateStr: string, hour: number) {
    setSlotDate(dateStr)
    setSlotTime(`${padTwo(hour)}:00`)
    setEditSession(null)
    setShowModal(true)
  }

  function openSession(s: SessionWithClient, e: React.MouseEvent) {
    if (!isAdmin && s.practitioner_id !== currentPractitionerId) return
    e.stopPropagation()
    setEditSession(s)
    setSlotDate(undefined)
    setSlotTime(undefined)
    setShowModal(true)
  }

  function openNew() {
    setSlotDate(todayStr)
    setSlotTime(undefined)
    setEditSession(null)
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditSession(null)
    setSlotDate(undefined)
    setSlotTime(undefined)
  }

  const [wy, wm] = weekStart.split('-').map(Number)
  const monthLabel = new Date(Date.UTC(wy, wm - 1, 1))
    .toLocaleDateString('en-AU', { month: 'long', year: 'numeric', timeZone: 'UTC' })

  // Default practitioner for new sessions.
  // Admin: follow the filter selection. Non-admin: always book for themselves.
  const defaultPractitionerId = isAdmin && filterPractitionerId !== 'all'
    ? filterPractitionerId
    : currentPractitionerId

  return (
    <div className="flex h-full flex-col gap-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Calendar</h1>
          <p className="mt-0.5 text-sm text-gray-500">{monthLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded-lg border border-gray-200">
            <button
              onClick={() => navigate(-1)}
              className="border-r border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
            >
              ‹ Prev
            </button>
            <button
              onClick={() => router.push('/dashboard/calendar')}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Today
            </button>
            <button
              onClick={() => navigate(1)}
              className="border-l border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
            >
              Next ›
            </button>
          </div>
          <Button onClick={openNew}>
            <svg className="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New session
          </Button>
        </div>
      </div>

      {/* ── Practitioner filter (admin / team view only) ── */}
      {isTeam && (
        <div className="flex items-center gap-2">
          <label htmlFor="practitioner-filter" className="text-xs font-medium text-gray-500">
            View:
          </label>
          <select
            id="practitioner-filter"
            value={filterPractitionerId}
            onChange={(e) => setFilterPractitionerId(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white py-1.5 pl-3 pr-8 text-sm text-gray-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="all">All practitioners</option>
            {practitioners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.first_name} {p.last_name}{p.id === currentPractitionerId ? ' (you)' : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* ── Week grid ── */}
      <div className="flex-1 overflow-auto rounded-xl border border-gray-200 bg-white">
        <div className="min-w-[700px]">

          {/* Day header row */}
          <div
            className="sticky top-0 z-20 grid border-b border-gray-100 bg-white"
            style={{ gridTemplateColumns: '56px repeat(7, 1fr)' }}
          >
            <div />
            {days.map(({ label, dateStr, dayNum: dn, isToday }) => {
              const unscheduled = (sessionsByDate.get(dateStr) ?? []).filter(s => !s.start_time)
              return (
                <div key={dateStr} className="border-l border-gray-100 py-2 text-center">
                  <p className={`text-xs font-medium ${isToday ? 'text-indigo-600' : 'text-gray-400'}`}>
                    {label}
                  </p>
                  <div
                    className={`mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold
                      ${isToday ? 'bg-indigo-600 text-white' : 'text-gray-800'}`}
                  >
                    {dn}
                  </div>
                  {/* Unscheduled sessions */}
                  {unscheduled.length > 0 && (
                    <div className="mt-1 space-y-0.5 px-1">
                      {unscheduled.map(s => {
                        const pract = practitionerMap.get(s.practitioner_id)
                        const color = pract?.calendar_color || FALLBACK_COLOR
                        const isCancelled = s.status === 'cancelled'
                        const canEdit = isAdmin || s.practitioner_id === currentPractitionerId
                        const txt = textColor(color)
                        return (
                          <div
                            key={s.id}
                            onClick={canEdit ? (e) => openSession(s, e) : undefined}
                            title={s.clients ? `${s.clients.first_name} ${s.clients.last_name}` : 'Session'}
                            style={{
                              backgroundColor: `rgba(${hexToRgb(color)}/0.15)`,
                              borderColor: `rgba(${hexToRgb(color)}/0.5)`,
                              color: txt,
                            }}
                            className={`truncate rounded border px-1 py-0.5 text-xs
                              ${canEdit ? 'cursor-pointer' : 'cursor-default'}
                              ${isCancelled ? 'opacity-50 line-through' : ''}`}
                          >
                            {isTeam && pract && (
                              <span className="font-semibold opacity-70">
                                {pract.first_name.charAt(0)}.{' '}
                              </span>
                            )}
                            {s.clients
                              ? `${s.clients.first_name} ${s.clients.last_name.charAt(0)}.`
                              : 'Session'}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Time body */}
          <div className="grid" style={{ gridTemplateColumns: '56px repeat(7, 1fr)' }}>

            {/* Hour labels */}
            <div className="relative" style={{ height: TOTAL_PX }}>
              {HOURS.map(h => (
                <div
                  key={h}
                  style={{ top: (h - HOUR_START) * HOUR_PX + 4 }}
                  className="absolute right-2 text-right text-xs leading-none text-gray-300"
                >
                  {h % 12 || 12}{h < 12 ? 'am' : 'pm'}
                </div>
              ))}
            </div>

            {/* Day columns */}
            {days.map(({ dateStr }) => {
              const timed = (sessionsByDate.get(dateStr) ?? []).filter(s => !!s.start_time)
              const blocked = blockedByDate.get(dateStr) ?? []

              return (
                <div
                  key={dateStr}
                  className="relative border-l border-gray-100"
                  style={{ height: TOTAL_PX }}
                >
                  {/* Clickable hour cells */}
                  {HOURS.map(h => (
                    <div
                      key={h}
                      style={{ top: (h - HOUR_START) * HOUR_PX, height: HOUR_PX }}
                      className="absolute inset-x-0 cursor-pointer border-b border-gray-50 transition-colors hover:bg-indigo-50"
                      onClick={() => openSlot(dateStr, h)}
                    />
                  ))}

                  {/* Blocked time blocks (behind sessions, z-index 5) */}
                  {blocked.map((b) => {
                    const startStr = b.start_time.slice(11, 16) // HH:MM
                    const endStr = b.end_time.slice(11, 16)
                    const startMins = timeToMins(startStr)
                    const endMins = timeToMins(endStr)

                    // Clamp to visible window
                    const clampedStart = Math.max(startMins, HOUR_START * 60)
                    const clampedEnd = Math.min(endMins, HOUR_END * 60)
                    if (clampedEnd <= clampedStart) return null

                    const topPx = (clampedStart - HOUR_START * 60) * (HOUR_PX / 60)
                    const heightPx = Math.max((clampedEnd - clampedStart) * (HOUR_PX / 60), 16)

                    const pract = practitionerMap.get(b.practitioner_id)
                    const color = pract?.calendar_color || FALLBACK_COLOR

                    return (
                      <div
                        key={b.id}
                        title={b.reason ? `Blocked: ${b.reason}` : 'Blocked'}
                        style={{
                          top: topPx,
                          height: heightPx,
                          left: 0,
                          right: 0,
                          background: `repeating-linear-gradient(
                            135deg,
                            rgba(${hexToRgb(color)}/0.08),
                            rgba(${hexToRgb(color)}/0.08) 4px,
                            rgba(${hexToRgb(color)}/0.18) 4px,
                            rgba(${hexToRgb(color)}/0.18) 8px
                          )`,
                          borderLeft: `3px solid rgba(${hexToRgb(color)}/0.5)`,
                        }}
                        className="absolute z-5 overflow-hidden px-1.5 py-0.5 pointer-events-none"
                      >
                        {heightPx >= 20 && (
                          <p className="truncate text-[10px] font-medium leading-tight" style={{ color: textColor(color) }}>
                            {b.reason || 'Blocked'}
                            {isTeam && pract ? ` · ${pract.first_name}` : ''}
                          </p>
                        )}
                      </div>
                    )
                  })}

                  {/* Session blocks (foreground, z-index 10) */}
                  {timed.map(s => {
                    const startMins = timeToMins(s.start_time!)
                    if (startMins < HOUR_START * 60 || startMins >= HOUR_END * 60) return null
                    const topPx = (startMins - HOUR_START * 60) * (HOUR_PX / 60)
                    const heightPx = Math.max(s.duration_minutes * (HOUR_PX / 60), 24)
                    const clientName = s.clients
                      ? `${s.clients.first_name} ${s.clients.last_name}`
                      : 'Session'
                    const pract = practitionerMap.get(s.practitioner_id)
                    const color = pract?.calendar_color || FALLBACK_COLOR

                    const isCompleted = s.status === 'completed'
                    const isCancelled = s.status === 'cancelled'
                    const canEdit = isAdmin || s.practitioner_id === currentPractitionerId
                    const txt = textColor(color)

                    return (
                      <div
                        key={s.id}
                        onClick={canEdit ? (e) => openSession(s, e) : undefined}
                        style={{
                          top: topPx,
                          height: heightPx,
                          left: 2,
                          right: 2,
                          backgroundColor: `rgba(${hexToRgb(color)}/${isCancelled ? '0.1' : isCompleted ? '0.22' : '0.15'})`,
                          borderColor: `rgba(${hexToRgb(color)}/0.5)`,
                          borderLeftColor: color,
                          borderLeftWidth: 3,
                          color: txt,
                        }}
                        className={`absolute z-10 overflow-hidden rounded border px-1.5 py-0.5 text-xs
                          ${canEdit ? 'cursor-pointer hover:brightness-95' : 'cursor-default'}
                          ${isCancelled ? 'opacity-50' : ''}`}
                      >
                        <div className={`truncate font-medium leading-tight ${isCancelled ? 'line-through' : ''}`}>
                          {isTeam && pract && (
                            <span className="opacity-70">{pract.first_name.charAt(0)}. </span>
                          )}
                          {clientName}
                        </div>
                        {heightPx >= 36 && (
                          <div className="truncate leading-tight opacity-60">
                            {s.start_time!.slice(0, 5)}
                            {s.ndis_line_item ? ` · ${s.ndis_line_item}` : ''}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}

          </div>
        </div>
      </div>

      {/* Legend for team view */}
      {isTeam && filterPractitionerId === 'all' && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
          <span className="font-medium text-gray-600">Legend:</span>
          {practitioners.map((p) => {
            const color = p.calendar_color || FALLBACK_COLOR
            return (
              <span key={p.id} className="flex items-center gap-1">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: color }}
                />
                {p.first_name} {p.last_name}
              </span>
            )
          })}
          <span className="flex items-center gap-1 ml-2">
            <span className="inline-block h-2.5 w-4 rounded-sm"
              style={{ background: 'repeating-linear-gradient(135deg, #e5e7eb, #e5e7eb 2px, #d1d5db 2px, #d1d5db 5px)' }}
            />
            Blocked
          </span>
        </div>
      )}

      {showModal && (
        <SessionModal
          clients={clients}
          services={services}
          priceGuide={priceGuide}
          practitioners={isAdmin ? practitioners : []}
          defaultPractitionerId={defaultPractitionerId}
          session={editSession}
          defaultDate={slotDate}
          defaultStartTime={slotTime}
          onClose={closeModal}
        />
      )}
    </div>
  )
}
