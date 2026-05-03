'use client'

import { useState, useTransition } from 'react'
import { saveAvailabilityRules } from '@/app/actions/availability'
import Card from '@/components/ui/Card'
import type { AvailabilityRuleRow } from '@/types/database'

const DAYS = [
  { label: 'Sunday', short: 'Sun', value: 0 },
  { label: 'Monday', short: 'Mon', value: 1 },
  { label: 'Tuesday', short: 'Tue', value: 2 },
  { label: 'Wednesday', short: 'Wed', value: 3 },
  { label: 'Thursday', short: 'Thu', value: 4 },
  { label: 'Friday', short: 'Fri', value: 5 },
  { label: 'Saturday', short: 'Sat', value: 6 },
]

interface DayState {
  enabled: boolean
  start: string
  end: string
}

function rulesMap(rules: AvailabilityRuleRow[]): Record<number, DayState> {
  const map: Record<number, DayState> = {}
  DAYS.forEach(({ value }) => {
    const rule = rules.find((r) => r.day_of_week === value)
    map[value] = rule
      ? { enabled: true, start: rule.start_time.slice(0, 5), end: rule.end_time.slice(0, 5) }
      : { enabled: false, start: '09:00', end: '17:00' }
  })
  return map
}

export default function AvailabilityForm({
  rules,
  bufferMinutes: initialBuffer,
}: {
  rules: AvailabilityRuleRow[]
  bufferMinutes: number
}) {
  const [days, setDays] = useState<Record<number, DayState>>(() => rulesMap(rules))
  const [buffer, setBuffer] = useState(initialBuffer)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  function toggle(day: number) {
    setDays((prev) => ({
      ...prev,
      [day]: { ...prev[day], enabled: !prev[day].enabled },
    }))
  }

  function update(day: number, field: 'start' | 'end', value: string) {
    setDays((prev) => ({ ...prev, [day]: { ...prev[day], [field]: value } }))
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const fd = new FormData(form)

    startTransition(async () => {
      await saveAvailabilityRules(fd)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    })
  }

  return (
    <Card>
      <h2 className="mb-5 font-semibold text-gray-900">Working hours</h2>

      <form onSubmit={handleSubmit} className="space-y-2">
        <input type="hidden" name="buffer_minutes" value={buffer} />

        {DAYS.map(({ label, short, value }) => {
          const day = days[value]
          return (
            <div
              key={value}
              className="flex items-center gap-4 rounded-lg px-3 py-2.5 hover:bg-gray-50"
            >
              {/* Toggle */}
              <label className="flex w-32 cursor-pointer items-center gap-2.5">
                <button
                  type="button"
                  role="switch"
                  aria-checked={day.enabled}
                  onClick={() => toggle(value)}
                  className={`relative h-5 w-9 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1 ${
                    day.enabled ? 'bg-brand-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                      day.enabled ? 'translate-x-4' : ''
                    }`}
                  />
                </button>
                <span className={`text-sm font-medium ${day.enabled ? 'text-gray-900' : 'text-gray-400'}`}>
                  {label}
                </span>
              </label>

              {/* Hidden inputs (only submitted if enabled) */}
              {day.enabled && (
                <>
                  <input type="hidden" name={`day_${value}_enabled`} value="1" />
                  <input type="hidden" name={`day_${value}_start`} value={day.start} />
                  <input type="hidden" name={`day_${value}_end`} value={day.end} />
                </>
              )}

              {/* Time pickers */}
              {day.enabled ? (
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={day.start}
                    onChange={(e) => update(value, 'start', e.target.value)}
                    className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-gray-700 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                  />
                  <span className="text-xs text-gray-400">to</span>
                  <input
                    type="time"
                    value={day.end}
                    onChange={(e) => update(value, 'end', e.target.value)}
                    className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-gray-700 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                  />
                </div>
              ) : (
                <span className="text-sm text-gray-300">Unavailable</span>
              )}
            </div>
          )
        })}

        {/* Buffer time */}
        <div className="mt-4 flex items-center gap-4 rounded-lg border-t border-gray-100 pt-4 px-3">
          <span className="w-32 text-sm font-medium text-gray-700">Buffer time</span>
          <div className="flex items-center gap-2">
            <select
              value={buffer}
              onChange={(e) => setBuffer(Number(e.target.value))}
              className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-gray-700 focus:border-brand-400 focus:outline-none"
            >
              {[0, 5, 10, 15, 20, 30, 45, 60].map((m) => (
                <option key={m} value={m}>{m === 0 ? 'None' : `${m} min`}</option>
              ))}
            </select>
            <span className="text-xs text-gray-400">gap between appointments</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4">
          {saved && (
            <span className="text-sm text-green-600 font-medium">
              ✓ Saved
            </span>
          )}
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
          >
            {isPending ? 'Saving…' : 'Save hours'}
          </button>
        </div>
      </form>
    </Card>
  )
}
