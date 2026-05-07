'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import type { ClientRow, ServiceRow, NdisPriceGuideRow } from '@/types/database'
import type { SessionWithClient } from '@/lib/db'
import SessionModal from '../sessions/SessionModal'

const HOUR_START = 8
const HOUR_END = 18
const HOUR_PX = 64
const TOTAL_PX = (HOUR_END - HOUR_START) * HOUR_PX
const HOURS = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => i + HOUR_START)
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const STATUS_CLASSES: Record<string, string> = {
  scheduled: 'bg-blue-100 border-blue-300 text-blue-800',
  completed: 'bg-green-100 border-green-300 text-green-800',
  cancelled: 'bg-gray-100 border-gray-300 text-gray-400 line-through',
}

// ── Date helpers ─────────────────────────────────────────────────────────────
// All arithmetic uses Date.UTC so toISOString() is never shifted by local TZ.

function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}

/** Today's date in the browser's local timezone as YYYY-MM-DD */
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

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  sessions: SessionWithClient[]
  clients: ClientRow[]
  services: ServiceRow[]
  priceGuide: NdisPriceGuideRow[]
  weekStart: string // YYYY-MM-DD — always a Monday, always treated as a plain date
}

export default function CalendarClient({ sessions, clients, services, priceGuide, weekStart }: Props) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [editSession, setEditSession] = useState<SessionWithClient | null>(null)
  const [slotDate, setSlotDate] = useState<string | undefined>()
  const [slotTime, setSlotTime] = useState<string | undefined>()

  // todayStr is the user's LOCAL date so the "today" highlight is correct.
  const todayStr = localToday()

  // Build one entry per day without any Date-to-local-timezone conversion.
  const days = DAY_LABELS.map((label, i) => {
    const dateStr = addDays(weekStart, i)
    return { label, dateStr, dayNum: dayNum(dateStr), isToday: dateStr === todayStr }
  })

  // Index sessions by their service_date (plain YYYY-MM-DD string from DB).
  const sessionsByDate = new Map<string, SessionWithClient[]>()
  for (const s of sessions) {
    const arr = sessionsByDate.get(s.service_date) ?? []
    arr.push(s)
    sessionsByDate.set(s.service_date, arr)
  }

  // Navigation: keep all arithmetic in string-space.
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

      {/* ── Week grid ── */}
      <div className="flex-1 overflow-auto rounded-xl border border-gray-200 bg-white">
        <div className="min-w-[700px]">

          {/* Day header row */}
          <div
            className="sticky top-0 z-20 grid border-b border-gray-100 bg-white"
            style={{ gridTemplateColumns: '56px repeat(7, 1fr)' }}
          >
            <div />
            {days.map(({ label, dateStr, dayNum, isToday }) => {
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
                    {dayNum}
                  </div>
                  {/* Unscheduled sessions — no start_time, show as badges */}
                  {unscheduled.length > 0 && (
                    <div className="mt-1 space-y-0.5 px-1">
                      {unscheduled.map(s => (
                        <div
                          key={s.id}
                          onClick={(e) => openSession(s, e)}
                          title={s.clients ? `${s.clients.first_name} ${s.clients.last_name}` : 'Session'}
                          className={`cursor-pointer truncate rounded border px-1 py-0.5 text-xs
                            ${STATUS_CLASSES[s.status] ?? 'bg-gray-100 border-gray-300'}`}
                        >
                          {s.clients
                            ? `${s.clients.first_name} ${s.clients.last_name.charAt(0)}.`
                            : 'Session'}
                        </div>
                      ))}
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
              return (
                <div
                  key={dateStr}
                  className="relative border-l border-gray-100"
                  style={{ height: TOTAL_PX }}
                >
                  {/* Clickable hour cells (background layer) */}
                  {HOURS.map(h => (
                    <div
                      key={h}
                      style={{ top: (h - HOUR_START) * HOUR_PX, height: HOUR_PX }}
                      className="absolute inset-x-0 cursor-pointer border-b border-gray-50 transition-colors hover:bg-indigo-50"
                      onClick={() => openSlot(dateStr, h)}
                    />
                  ))}

                  {/* Session blocks (foreground layer) */}
                  {timed.map(s => {
                    const startMins = timeToMins(s.start_time!)
                    if (startMins < HOUR_START * 60 || startMins >= HOUR_END * 60) return null
                    const topPx = (startMins - HOUR_START * 60) * (HOUR_PX / 60)
                    const heightPx = Math.max(s.duration_minutes * (HOUR_PX / 60), 24)
                    const clientName = s.clients
                      ? `${s.clients.first_name} ${s.clients.last_name}`
                      : 'Session'
                    return (
                      <div
                        key={s.id}
                        onClick={(e) => openSession(s, e)}
                        style={{ top: topPx, height: heightPx, left: 2, right: 2 }}
                        className={`absolute z-10 cursor-pointer overflow-hidden rounded border px-1.5 py-0.5 text-xs
                          hover:brightness-95 ${STATUS_CLASSES[s.status] ?? 'bg-gray-100 border-gray-300'}`}
                      >
                        <div className="truncate font-medium leading-tight">{clientName}</div>
                        {heightPx >= 36 && (
                          <div className="truncate leading-tight opacity-70">
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

      {showModal && (
        <SessionModal
          clients={clients}
          services={services}
          priceGuide={priceGuide}
          session={editSession}
          defaultDate={slotDate}
          defaultStartTime={slotTime}
          onClose={closeModal}
        />
      )}
    </div>
  )
}
