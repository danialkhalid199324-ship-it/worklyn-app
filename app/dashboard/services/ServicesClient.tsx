'use client'

import { useState, useTransition } from 'react'
import Button from '@/components/ui/Button'
import { upsertService, toggleServiceActive, deleteService, seedExampleServices } from '@/app/actions/services'
import { useRouter } from 'next/navigation'
import type { ServiceRow, UnitType } from '@/types/database'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORIES = [
  'Occupational Therapy',
  'Psychology',
  'Behaviour Support',
  'Support Coordination',
  'Support Work',
  'Community Access',
  'Speech Pathology',
  'Physiotherapy',
  'Dietetics',
  'Other',
]

const UNIT_LABELS: Record<UnitType, string> = {
  hourly: 'per hour',
  session: 'per session',
  fixed: 'fixed price',
}

// ---------------------------------------------------------------------------
// Service form modal
// ---------------------------------------------------------------------------

interface ServiceFormProps {
  service: ServiceRow | null
  onClose: () => void
  onSaved: () => void
}

function ServiceForm({ service, onClose, onSaved }: ServiceFormProps) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await upsertService(service?.id ?? null, fd)
      if ('error' in result) {
        setError(result.error ?? null)
      } else {
        onSaved()
      }
    })
  }

  const INPUT =
    'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">
            {service ? 'Edit service' : 'Add service'}
          </h2>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:text-gray-600">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          {/* Name */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Service name *</label>
            <input
              name="name"
              required
              defaultValue={service?.name ?? ''}
              placeholder="e.g. Occupational Therapy"
              className={INPUT}
            />
          </div>

          {/* Category */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Category</label>
            <select name="category" defaultValue={service?.category ?? ''} className={INPUT}>
              <option value="">Select category…</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* NDIS Price Guide link */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              NDIS Support Item Number
              <span className="ml-1.5 text-xs font-normal text-gray-400">(links to official price guide)</span>
            </label>
            <input
              name="support_item_number"
              defaultValue={service?.support_item_number ?? ''}
              placeholder="e.g. 15_056_0128_1_3"
              className={INPUT}
            />
            <p className="mt-0.5 text-xs text-gray-400">
              When set, sessions auto-fill the NDIS line item and rate from the Support Catalogue.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* NDIS line item */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">NDIS line item</label>
              <input
                name="ndis_line_item"
                defaultValue={service?.ndis_line_item ?? ''}
                placeholder="15_056_0128_1_3"
                className={INPUT}
              />
            </div>

            {/* Default rate */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Default rate ($)</label>
              <input
                name="default_rate"
                type="number"
                min={0}
                step={0.01}
                defaultValue={service?.default_rate ?? ''}
                placeholder="193.99"
                className={INPUT}
              />
            </div>
          </div>

          {/* Day-based rates */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Day-based rates ($ / hr) — leave blank to use default
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Weekday (Mon–Fri)</label>
                <input
                  name="weekday_rate"
                  type="number"
                  min={0}
                  step={0.01}
                  defaultValue={service?.weekday_rate ?? ''}
                  placeholder="e.g. 193.99"
                  className={INPUT}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Saturday</label>
                <input
                  name="saturday_rate"
                  type="number"
                  min={0}
                  step={0.01}
                  defaultValue={service?.saturday_rate ?? ''}
                  placeholder="e.g. 242.49"
                  className={INPUT}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Sunday</label>
                <input
                  name="sunday_rate"
                  type="number"
                  min={0}
                  step={0.01}
                  defaultValue={service?.sunday_rate ?? ''}
                  placeholder="e.g. 261.89"
                  className={INPUT}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Public holiday</label>
                <input
                  name="public_holiday_rate"
                  type="number"
                  min={0}
                  step={0.01}
                  defaultValue={service?.public_holiday_rate ?? ''}
                  placeholder="e.g. 320.08"
                  className={INPUT}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Unit type */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Unit type</label>
              <select name="unit_type" defaultValue={service?.unit_type ?? 'hourly'} className={INPUT}>
                <option value="hourly">Per hour</option>
                <option value="session">Per session</option>
                <option value="fixed">Fixed price</option>
              </select>
            </div>

            {/* GST */}
            <div className="flex flex-col justify-end pb-0.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="hidden"
                  name="gst_applicable"
                  value="false"
                />
                <input
                  type="checkbox"
                  name="gst_applicable"
                  value="true"
                  defaultChecked={service?.gst_applicable ?? false}
                  onChange={(e) => {
                    const hidden = e.currentTarget.previousElementSibling as HTMLInputElement
                    hidden.disabled = e.currentTarget.checked
                  }}
                  className="h-4 w-4 rounded border-gray-300 accent-indigo-600"
                />
                <span className="text-sm font-medium text-gray-700">GST applicable</span>
              </label>
            </div>
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={pending}>
              {service ? 'Save changes' : 'Add service'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main client component
// ---------------------------------------------------------------------------

interface Props {
  services: ServiceRow[]
}

// ---------------------------------------------------------------------------
// In-use warning modal
// ---------------------------------------------------------------------------

interface InUseWarningProps {
  service: ServiceRow
  onClose: () => void
  onDeactivate: () => void
  deactivatePending: boolean
}

function InUseWarning({ service, onClose, onDeactivate, deactivatePending }: InUseWarningProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl">
        <div className="px-6 py-5">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-amber-50">
            <svg className="h-5 w-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <h3 className="mb-1 text-sm font-semibold text-gray-900">Cannot delete &ldquo;{service.name}&rdquo;</h3>
          <p className="text-sm text-gray-500">
            This service is linked to existing sessions or invoices. You can deactivate it instead
            to hide it from new sessions while preserving historical records.
          </p>
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          {service.is_active && (
            <Button type="button" loading={deactivatePending} onClick={onDeactivate}>
              Deactivate instead
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main client component
// ---------------------------------------------------------------------------

export default function ServicesClient({ services }: Props) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [editService, setEditService] = useState<ServiceRow | null>(null)
  const [inUseService, setInUseService] = useState<ServiceRow | null>(null)
  const [seedPending, startSeedTransition] = useTransition()
  const [togglePending, startToggleTransition] = useTransition()
  const [deletePending, startDeleteTransition] = useTransition()
  const [seedError, setSeedError] = useState<string | null>(null)

  function handleSaved() {
    setShowForm(false)
    setEditService(null)
    router.refresh()
  }

  function handleEdit(s: ServiceRow) {
    setEditService(s)
    setShowForm(true)
  }

  function handleToggle(serviceId: string) {
    startToggleTransition(async () => {
      await toggleServiceActive(serviceId)
      router.refresh()
    })
  }

  function handleDelete(s: ServiceRow) {
    startDeleteTransition(async () => {
      const result = await deleteService(s.id)
      if (result.inUse) {
        setInUseService(s)
      } else {
        router.refresh()
      }
    })
  }

  function handleDeactivateInstead() {
    if (!inUseService) return
    const id = inUseService.id
    setInUseService(null)
    startToggleTransition(async () => {
      // Only deactivate if currently active
      if (inUseService.is_active) await toggleServiceActive(id)
      router.refresh()
    })
  }

  function handleSeed() {
    setSeedError(null)
    startSeedTransition(async () => {
      const result = await seedExampleServices()
      if ('error' in result) setSeedError(result.error ?? null)
      else router.refresh()
    })
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        {/* Toolbar */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          <p className="text-sm text-gray-500">
            {services.length} service{services.length !== 1 ? 's' : ''}
            {services.some((s) => !s.is_active) && (
              <span className="ml-1 text-gray-400">
                ({services.filter((s) => !s.is_active).length} inactive)
              </span>
            )}
          </p>
          <Button onClick={() => { setEditService(null); setShowForm(true) }}>
            Add service
          </Button>
        </div>

        {services.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-gray-500">No services yet.</p>
            <p className="mt-1 text-xs text-gray-400">
              Add services manually or load the example NDIS catalogue to get started.
            </p>
            {seedError && (
              <p className="mt-2 text-xs text-red-600">{seedError}</p>
            )}
            <Button
              variant="outline"
              className="mt-4"
              loading={seedPending}
              onClick={handleSeed}
            >
              Load example NDIS services
            </Button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Service</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">NDIS code</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">Default rate</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Unit</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-400">GST</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-400">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {services.map((s) => (
                <tr key={s.id} className={s.is_active ? '' : 'opacity-50'}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{s.name}</p>
                    {s.category && (
                      <p className="text-xs text-gray-400">{s.category}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    {s.ndis_line_item ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    {s.default_rate != null ? `$${s.default_rate.toFixed(2)}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {UNIT_LABELS[s.unit_type] ?? s.unit_type}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-500">
                    {s.gst_applicable ? 'Yes' : 'No'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      s.is_active
                        ? 'bg-green-50 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {s.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(s)}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggle(s.id)}
                        disabled={togglePending || deletePending}
                        className="text-xs font-medium text-gray-500 hover:text-gray-700 disabled:opacity-40"
                      >
                        {s.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleDelete(s)}
                        disabled={deletePending || togglePending}
                        className="text-xs font-medium text-red-500 hover:text-red-700 disabled:opacity-40"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <ServiceForm
          service={editService}
          onClose={() => { setShowForm(false); setEditService(null) }}
          onSaved={handleSaved}
        />
      )}

      {inUseService && (
        <InUseWarning
          service={inUseService}
          onClose={() => setInUseService(null)}
          onDeactivate={handleDeactivateInstead}
          deactivatePending={togglePending}
        />
      )}
    </>
  )
}
