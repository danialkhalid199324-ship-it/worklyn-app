import type { AvailabilityRuleRow, BlockedTimeRow, AppointmentRow } from '@/types/database'

// ---------------------------------------------------------------------------
// Time helpers (minutes since midnight)
// ---------------------------------------------------------------------------
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function formatSlotTime(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const period = h < 12 ? 'AM' : 'PM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${period}`
}

// ---------------------------------------------------------------------------
// Core slot generation
// ---------------------------------------------------------------------------
export interface TimeSlot {
  start: string  // "HH:MM"
  end: string    // "HH:MM"
  startFormatted: string
  endFormatted: string
}

/**
 * Generate all candidate time slots for a given working window.
 * Each slot is `durationMinutes` long with `bufferMinutes` gap after it.
 */
export function generateCandidateSlots(
  windowStart: string,
  windowEnd: string,
  durationMinutes: number,
  bufferMinutes = 0,
): TimeSlot[] {
  const slots: TimeSlot[] = []
  const end = timeToMinutes(windowEnd)
  let current = timeToMinutes(windowStart)

  while (current + durationMinutes <= end) {
    const slotStart = minutesToTime(current)
    const slotEnd = minutesToTime(current + durationMinutes)
    slots.push({
      start: slotStart,
      end: slotEnd,
      startFormatted: formatSlotTime(slotStart),
      endFormatted: formatSlotTime(slotEnd),
    })
    current += durationMinutes + bufferMinutes
  }

  return slots
}

// ---------------------------------------------------------------------------
// Conflict detection
// ---------------------------------------------------------------------------

/** Returns true if [aStart, aEnd) overlaps [bStart, bEnd) */
function rangesOverlap(
  aStart: number, aEnd: number,
  bStart: number, bEnd: number,
): boolean {
  return aStart < bEnd && aEnd > bStart
}

export function isSlotBlocked(
  slotStart: string,
  slotEnd: string,
  blockedTimes: BlockedTimeRow[],
  date: string,
): boolean {
  const slotStartMin = timeToMinutes(slotStart)
  const slotEndMin = timeToMinutes(slotEnd)

  return blockedTimes.some((b) => {
    const blockStart = new Date(b.start_time)
    const blockEnd = new Date(b.end_time)
    const blockDate = blockStart.toISOString().split('T')[0]

    if (blockDate !== date) return false

    const blockStartMin =
      blockStart.getHours() * 60 + blockStart.getMinutes()
    const blockEndMin =
      blockEnd.getHours() * 60 + blockEnd.getMinutes()

    return rangesOverlap(slotStartMin, slotEndMin, blockStartMin, blockEndMin)
  })
}

export function isSlotBooked(
  slotStart: string,
  slotEnd: string,
  appointments: AppointmentRow[],
  date: string,
  bufferMinutes = 0,
): boolean {
  const slotStartMin = timeToMinutes(slotStart)
  const slotEndMin = timeToMinutes(slotEnd)

  return appointments.some((appt) => {
    const apptDate = appt.start_time.split('T')[0]
    if (apptDate !== date) return false
    if (appt.status === 'cancelled') return false

    const apptStart = new Date(appt.start_time)
    const apptEnd = new Date(appt.end_time)

    const apptStartMin = apptStart.getHours() * 60 + apptStart.getMinutes()
    // Extend end by buffer so next slot can't start during the buffer
    const apptEndMin =
      apptEnd.getHours() * 60 + apptEnd.getMinutes() + bufferMinutes

    return rangesOverlap(slotStartMin, slotEndMin, apptStartMin, apptEndMin)
  })
}

// ---------------------------------------------------------------------------
// Main export: compute available slots for a date
// ---------------------------------------------------------------------------
export interface AvailabilityInput {
  date: string                        // "YYYY-MM-DD"
  rules: AvailabilityRuleRow[]
  blockedTimes: BlockedTimeRow[]
  appointments: AppointmentRow[]
  durationMinutes: number
  bufferMinutes?: number
}

export function getAvailableSlots({
  date,
  rules,
  blockedTimes,
  appointments,
  durationMinutes,
  bufferMinutes = 0,
}: AvailabilityInput): TimeSlot[] {
  const dayOfWeek = new Date(`${date}T12:00:00`).getDay() // 0=Sun … 6=Sat
  const dayRules = rules.filter((r) => r.day_of_week === dayOfWeek)

  if (dayRules.length === 0) return []

  const now = new Date()
  const isToday = date === now.toISOString().split('T')[0]
  const nowMinutes = isToday ? now.getHours() * 60 + now.getMinutes() : 0

  const available: TimeSlot[] = []

  for (const rule of dayRules) {
    const candidates = generateCandidateSlots(
      rule.start_time.slice(0, 5),
      rule.end_time.slice(0, 5),
      durationMinutes,
      bufferMinutes,
    )

    for (const slot of candidates) {
      // Skip past slots
      if (isToday && timeToMinutes(slot.start) <= nowMinutes) continue

      if (
        !isSlotBlocked(slot.start, slot.end, blockedTimes, date) &&
        !isSlotBooked(slot.start, slot.end, appointments, date, bufferMinutes)
      ) {
        available.push(slot)
      }
    }
  }

  return available
}
