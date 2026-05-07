'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import { createFundingAllocation, updateFundingAllocation } from '@/app/actions/funding'
import type { FundingAllocationRow, ClientRow } from '@/types/database'

interface Props {
  mode: 'create' | 'edit'
  client: ClientRow
  existing: FundingAllocationRow | null
  onClose: () => void
}

export default function FundingAllocationModal({ mode, client, existing, onClose }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)

    startTransition(async () => {
      const result =
        mode === 'create'
          ? await createFundingAllocation(fd, client.id)
          : await updateFundingAllocation(existing!.id, client.id, fd)

      if (result?.error) {
        setError(result.error)
      } else {
        router.refresh()
        onClose()
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">
            {mode === 'create' ? 'Add funding plan' : 'Edit funding plan'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Hidden: auto-populated from client */}
          <input type="hidden" name="funding_type" value={client.funding_type ?? 'Private / Other'} />
          <input type="hidden" name="management_type" value={client.ndis_management_type ?? ''} />

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Plan name</label>
            <input
              name="plan_name"
              defaultValue={existing?.plan_name ?? ''}
              required
              placeholder="e.g. 2026–2027 NDIS Plan"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Plan start</label>
              <input
                type="date"
                name="plan_start_date"
                defaultValue={existing?.plan_start_date ?? ''}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Plan end</label>
              <input
                type="date"
                name="plan_end_date"
                defaultValue={existing?.plan_end_date ?? ''}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Total allocated amount
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                $
              </span>
              <input
                type="number"
                name="allocated_amount"
                defaultValue={existing ? (existing.allocated_amount / 100).toFixed(2) : ''}
                required
                min="0.01"
                step="0.01"
                placeholder="0.00"
                className="w-full rounded-lg border border-gray-300 pl-7 pr-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Support category{' '}
              <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <input
              name="support_category"
              defaultValue={existing?.support_category ?? ''}
              placeholder="e.g. Core Supports"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Service category{' '}
                <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <input
                name="service_category"
                defaultValue={existing?.service_category ?? ''}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                NDIS line item{' '}
                <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <input
                name="ndis_line_item"
                defaultValue={existing?.ndis_line_item ?? ''}
                placeholder="e.g. 01_002_0107_1_1"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Notes <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <textarea
              name="notes"
              defaultValue={existing?.notes ?? ''}
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" loading={isPending}>
              {mode === 'create' ? 'Add plan' : 'Save changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
