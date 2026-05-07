'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import {
  deactivateFundingAllocation,
  reactivateFundingAllocation,
  refreshAllocationUsage,
} from '@/app/actions/funding'
import { calculateAllocationUsage, formatAllocationAmount } from '@/lib/funding-utils'
import { formatDate } from '@/lib/utils'
import type { FundingAllocationRow, ClientRow } from '@/types/database'
import FundingAllocationModal from './FundingAllocationModal'

interface Props {
  allocations: FundingAllocationRow[]
  client: ClientRow
}

function statusColor(pct: number): 'green' | 'amber' | 'red' {
  if (pct >= 100) return 'red'
  if (pct >= 80) return 'amber'
  return 'green'
}

function statusLabel(pct: number): string {
  if (pct >= 100) return 'Over budget'
  if (pct >= 80) return 'Nearing limit'
  return 'On track'
}

function ProgressBar({ pct }: { pct: number }) {
  const fill = Math.min(100, pct)
  const color =
    pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-brand-600'
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
      <div
        className={`h-full rounded-full transition-all duration-300 ${color}`}
        style={{ width: `${fill}%` }}
      />
    </div>
  )
}

function AmountGrid({
  allocated,
  used,
  remaining,
}: {
  allocated: number
  used: number
  remaining: number
}) {
  return (
    <div className="grid grid-cols-3 gap-4 rounded-lg bg-gray-50 p-4">
      <div className="text-center">
        <p className="text-xs text-gray-500">Allocated</p>
        <p className="mt-1 text-sm font-semibold text-gray-900">
          {formatAllocationAmount(allocated)}
        </p>
      </div>
      <div className="text-center">
        <p className="text-xs text-gray-500">Used</p>
        <p className="mt-1 text-sm font-semibold text-gray-900">
          {formatAllocationAmount(used)}
        </p>
      </div>
      <div className="text-center">
        <p className="text-xs text-gray-500">Remaining</p>
        <p
          className={`mt-1 text-sm font-semibold ${
            remaining < 0 ? 'text-red-600' : 'text-gray-900'
          }`}
        >
          {formatAllocationAmount(remaining)}
        </p>
      </div>
    </div>
  )
}

export default function FundingTab({ allocations, client }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const active = allocations.find(a => a.is_active) ?? null
  const history = allocations.filter(a => !a.is_active)

  const usage = active
    ? calculateAllocationUsage(active.allocated_amount, active.used_amount)
    : null

  function handleDeactivate() {
    if (!active) return
    setActionError(null)
    startTransition(async () => {
      const result = await deactivateFundingAllocation(active.id, client.id)
      if (result?.error) setActionError(result.error)
      else router.refresh()
    })
  }

  function handleReactivate(allocationId: string) {
    setActionError(null)
    startTransition(async () => {
      const result = await reactivateFundingAllocation(allocationId, client.id)
      if (result?.error) setActionError(result.error)
      else router.refresh()
    })
  }

  function handleRefresh() {
    setActionError(null)
    startTransition(async () => {
      const result = await refreshAllocationUsage(client.id)
      if (result?.error) setActionError(result.error)
      else router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      {actionError && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{actionError}</p>
      )}

      {/* Active Plan */}
      {active && usage ? (
        <Card>
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">{active.plan_name}</h3>
              <p className="mt-0.5 text-xs text-gray-500">
                {formatDate(active.plan_start_date)} → {formatDate(active.plan_end_date)}
              </p>
              {active.support_category && (
                <p className="mt-0.5 text-xs text-gray-500">
                  Category: {active.support_category}
                </p>
              )}
              {active.ndis_line_item && (
                <p className="mt-0.5 text-xs text-gray-400">
                  Line item: {active.ndis_line_item}
                </p>
              )}
            </div>
            <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
              <Badge color="green">Active</Badge>
              <Badge color={statusColor(usage.utilisationPercentage)}>
                {statusLabel(usage.utilisationPercentage)}
              </Badge>
            </div>
          </div>

          <AmountGrid
            allocated={usage.allocatedCents}
            used={usage.usedCents}
            remaining={usage.remainingCents}
          />

          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs text-gray-500">Utilisation</span>
              <span className="text-xs font-medium text-gray-700">
                {usage.utilisationPercentage.toFixed(1)}%
              </span>
            </div>
            <ProgressBar pct={usage.utilisationPercentage} />
          </div>

          {active.notes && (
            <p className="mt-4 text-xs text-gray-500">{active.notes}</p>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4">
            <Button size="sm" onClick={() => setModal('edit')}>
              Edit plan
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRefresh}
              loading={isPending}
            >
              Refresh usage
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDeactivate}
              loading={isPending}
            >
              Deactivate
            </Button>
            <Button size="sm" variant="outline" onClick={() => setModal('create')}>
              + New plan
            </Button>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">No active funding plan</p>
              <p className="mt-0.5 text-xs text-gray-500">
                Add a plan to start tracking funding allocation and utilisation.
              </p>
            </div>
            <Button size="sm" onClick={() => setModal('create')}>
              + Add plan
            </Button>
          </div>
        </Card>
      )}

      {/* History */}
      {history.length > 0 && (
        <div>
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Previous plans
          </h4>
          <div className="space-y-3">
            {history.map(alloc => {
              const h = calculateAllocationUsage(alloc.allocated_amount, alloc.used_amount)
              return (
                <Card key={alloc.id}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-800">
                        {alloc.plan_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(alloc.plan_start_date)} → {formatDate(alloc.plan_end_date)}
                      </p>
                    </div>
                    <div className="flex flex-shrink-0 flex-col items-end gap-1">
                      <span className="text-sm font-medium text-gray-700">
                        {formatAllocationAmount(alloc.allocated_amount)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {h.utilisationPercentage.toFixed(1)}% used
                      </span>
                    </div>
                  </div>
                  <div className="mt-3">
                    <ProgressBar pct={h.utilisationPercentage} />
                  </div>
                  <div className="mt-3 flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReactivate(alloc.id)}
                      loading={isPending}
                    >
                      Reactivate
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {modal && (
        <FundingAllocationModal
          mode={modal}
          client={client}
          existing={modal === 'edit' && active ? active : null}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
