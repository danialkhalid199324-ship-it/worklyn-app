'use client'

import { useState, useTransition } from 'react'
import { addClinicMember } from '@/app/actions/team'
import type { ClinicRole } from '@/types/database'

const ROLES: { value: ClinicRole; label: string }[] = [
  { value: 'practitioner', label: 'Practitioner' },
  { value: 'receptionist', label: 'Receptionist' },
  { value: 'finance',      label: 'Finance' },
  { value: 'admin',        label: 'Admin' },
]

const COLOR_SWATCHES = [
  '#6366F1', '#8B5CF6', '#EC4899', '#EF4444',
  '#F97316', '#EAB308', '#22C55E', '#06B6D4', '#3B82F6', '#64748B',
]

const INPUT =
  'mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm placeholder:text-gray-400 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400'

interface Props {
  onClose: () => void
}

export default function TeamMemberModal({ onClose }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error,   setError]   = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [color, setColor]     = useState('#6366F1')

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    fd.set('calendar_color', color)
    startTransition(async () => {
      const result = await addClinicMember(fd)
      if (result?.error) {
        setError(result.error)
      } else if ('warning' in result && result.warning) {
        setWarning(result.warning)
      } else {
        onClose()
      }
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Invite Practitioner</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              If they don&apos;t have an account yet, they&apos;ll appear as Pending until they sign up.
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:text-gray-600">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Full name</label>
            <input
              name="full_name"
              type="text"
              autoFocus
              placeholder="Jane Smith"
              className={INPUT}
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email address <span className="text-red-500">*</span>
            </label>
            <input
              name="email"
              type="email"
              required
              placeholder="jane@clinic.com"
              className={INPUT}
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Role</label>
            <select
              name="role"
              defaultValue="practitioner"
              className={INPUT}
            >
              {ROLES.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          {/* Provider number */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Provider number <span className="text-xs font-normal text-gray-400">(optional)</span>
            </label>
            <input
              name="provider_number"
              type="text"
              placeholder="e.g. 2345678B"
              className={INPUT}
            />
          </div>

          {/* Calendar colour */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Calendar colour</label>
            <div className="flex flex-wrap items-center gap-2">
              {COLOR_SWATCHES.map(hex => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => setColor(hex)}
                  style={{ backgroundColor: hex }}
                  className={`h-7 w-7 rounded-full transition-transform ${
                    color === hex
                      ? 'scale-125 ring-2 ring-offset-1 ring-gray-400'
                      : 'hover:scale-110'
                  }`}
                  aria-label={hex}
                />
              ))}
              <input
                type="color"
                value={color}
                onChange={e => setColor(e.target.value)}
                className="h-7 w-7 cursor-pointer rounded-full border-0 bg-transparent p-0"
                title="Custom colour"
              />
              <span
                className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: color }}
              >
                J
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-400">Shows on the calendar and team avatar.</p>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
              {error}
            </div>
          )}

          {warning && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
              <p className="font-semibold mb-0.5">Practitioner added — email not sent</p>
              <p>{warning}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-1">
            {warning ? (
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
              >
                Close
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60 transition-colors"
                >
                  {isPending ? 'Sending invite…' : 'Send invite'}
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
