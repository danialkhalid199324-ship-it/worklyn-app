'use client'

import { useEffect } from 'react'
import type {
  RevenueReportData,
  SessionsReportData,
  ClientsReportData,
  InvoicesReportData,
} from '@/lib/reports'

const fmtAUD = (cents: number) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(cents / 100)

// ---------------------------------------------------------------------------
// Modal shell
// ---------------------------------------------------------------------------

function Modal({
  title,
  children,
  onClose,
}: {
  title: string
  children: React.ReactNode
  onClose: () => void
}) {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', esc)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', esc)
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
          <h2 className="text-base font-bold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-5 space-y-6">{children}</div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
        {title}
      </h3>
      {children}
    </div>
  )
}

function StatRow({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: 'green' | 'amber' | 'red' }) {
  const valueColor =
    color === 'green' ? 'text-green-600' :
    color === 'amber' ? 'text-amber-600' :
    color === 'red'   ? 'text-red-600'   : 'text-gray-900'
  return (
    <div className="flex items-center justify-between border-b border-gray-50 py-2.5 last:border-0">
      <div>
        <span className="text-sm text-gray-600">{label}</span>
        {sub && <span className="ml-2 text-xs text-gray-400">{sub}</span>}
      </div>
      <span className={`text-sm font-semibold ${valueColor}`}>{value}</span>
    </div>
  )
}

function RankedList({
  items,
  emptyText,
  renderValue,
}: {
  items: { name: string }[]
  emptyText: string
  renderValue: (item: { name: string } & Record<string, unknown>) => string
}) {
  if (items.length === 0) {
    return <p className="text-sm text-gray-400 py-2">{emptyText}</p>
  }
  return (
    <div className="space-y-0">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-3 border-b border-gray-50 py-2.5 last:border-0">
          <span className="w-5 shrink-0 text-xs font-medium text-gray-300">{i + 1}</span>
          <span className="min-w-0 flex-1 truncate text-sm text-gray-700">{item.name}</span>
          <span className="shrink-0 text-sm font-semibold text-gray-900">
            {renderValue(item as { name: string } & Record<string, unknown>)}
          </span>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Revenue modal
// ---------------------------------------------------------------------------

export function RevenueModal({
  data,
  periodLabel,
  onClose,
}: {
  data: RevenueReportData
  periodLabel: string
  onClose: () => void
}) {
  return (
    <Modal title={`Revenue report — ${periodLabel}`} onClose={onClose}>
      {/* Paid vs unpaid */}
      <Section title="Summary">
        <StatRow label="Paid revenue" value={fmtAUD(data.paidCents)} color="green" />
        <StatRow label="Outstanding (draft · sent · overdue)" value={fmtAUD(data.unpaidCents)} color={data.unpaidCents > 0 ? 'amber' : undefined} />
        <StatRow
          label="Total invoiced"
          value={fmtAUD(data.paidCents + data.unpaidCents)}
        />
      </Section>

      {/* By service */}
      <Section title="Revenue by service">
        {data.byService.length === 0 ? (
          <p className="text-sm text-gray-400 py-2">No invoiced sessions this period.</p>
        ) : (
          <div>
            {data.byService.map((s, i) => (
              <div key={i} className="flex items-center gap-3 border-b border-gray-50 py-2.5 last:border-0">
                <span className="w-5 shrink-0 text-xs font-medium text-gray-300">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <span className="truncate text-sm text-gray-700">{s.name}</span>
                  <span className="ml-2 text-xs text-gray-400">{s.count} session{s.count !== 1 ? 's' : ''}</span>
                </div>
                <span className="shrink-0 text-sm font-semibold text-gray-900">{fmtAUD(s.amountCents)}</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* By client */}
      <Section title="Revenue by client">
        <RankedList
          items={data.byClient}
          emptyText="No paid revenue this period."
          renderValue={(item) => fmtAUD((item as unknown as { amountCents: number }).amountCents)}
        />
      </Section>

      {/* By month */}
      {data.byMonth.length > 1 && (
        <Section title="By month">
          {data.byMonth.map((m, i) => (
            <StatRow key={i} label={m.month} value={fmtAUD(m.amountCents)} />
          ))}
        </Section>
      )}
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Sessions modal
// ---------------------------------------------------------------------------

export function SessionsModal({
  data,
  periodLabel,
  onClose,
}: {
  data: SessionsReportData
  periodLabel: string
  onClose: () => void
}) {
  return (
    <Modal title={`Sessions report — ${periodLabel}`} onClose={onClose}>
      <Section title="Status summary">
        <StatRow label="Total sessions" value={data.total.toString()} />
        <StatRow label="Completed" value={data.completed.toString()} color="green" />
        <StatRow label="Scheduled (upcoming)" value={data.scheduled.toString()} />
        <StatRow label="Cancelled" value={data.cancelled.toString()} color={data.cancelled > 0 ? 'amber' : undefined} />
        <StatRow
          label="Completion rate"
          value={
            data.completed + data.cancelled > 0 ? `${data.completionRate}%` : '—'
          }
          sub="completed ÷ (completed + cancelled)"
          color={data.completionRate >= 80 ? 'green' : data.completionRate > 0 ? 'amber' : undefined}
        />
      </Section>

      <Section title="By service">
        {data.byService.length === 0 ? (
          <p className="text-sm text-gray-400 py-2">No sessions this period.</p>
        ) : (
          <div>
            {data.byService.map((s, i) => (
              <div key={i} className="flex items-center gap-3 border-b border-gray-50 py-2.5 last:border-0">
                <span className="w-5 shrink-0 text-xs font-medium text-gray-300">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-gray-700">{s.name}</span>
                <div className="shrink-0 text-right">
                  <span className="text-sm font-semibold text-gray-900">{s.total}</span>
                  <span className="ml-1.5 text-xs text-gray-400">
                    ({s.completed} done)
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Clients modal
// ---------------------------------------------------------------------------

export function ClientsModal({
  data,
  onClose,
}: {
  data: ClientsReportData
  onClose: () => void
}) {
  return (
    <Modal title="Client report" onClose={onClose}>
      <Section title="Overview">
        <StatRow label="Total active clients" value={data.totalActive.toString()} color="green" />
        <StatRow label="New this period" value={data.newInPeriod.toString()} />
        <StatRow
          label="Inactive (no session in 90 days)"
          value={data.inactive.toString()}
          color={data.inactive > 0 ? 'amber' : undefined}
        />
      </Section>

      <Section title="Top clients by revenue (all time)">
        <RankedList
          items={data.topByRevenue}
          emptyText="No paid invoices recorded yet."
          renderValue={(item) => fmtAUD((item as unknown as { amountCents: number }).amountCents)}
        />
      </Section>

      <Section title="Clients with outstanding invoices">
        {data.withOutstanding.length === 0 ? (
          <p className="text-sm text-gray-400 py-2">No outstanding invoices — all clear.</p>
        ) : (
          <div>
            {data.withOutstanding.map((c, i) => (
              <div key={i} className="flex items-center gap-3 border-b border-gray-50 py-2.5 last:border-0">
                <span className="min-w-0 flex-1 truncate text-sm text-gray-700">{c.name}</span>
                <span className="shrink-0 text-sm font-semibold text-amber-600">
                  {fmtAUD(c.amountCents)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Section>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Invoices modal
// ---------------------------------------------------------------------------

export function InvoicesModal({
  data,
  onClose,
}: {
  data: InvoicesReportData
  onClose: () => void
}) {
  return (
    <Modal title="Invoice report — current state" onClose={onClose}>
      <Section title="Status breakdown">
        <StatRow label="Paid" value={data.paid.toString()} color="green" />
        <StatRow label="Sent (awaiting payment)" value={data.sent.toString()} color={data.sent > 0 ? 'amber' : undefined} />
        <StatRow label="Overdue" value={data.overdue.toString()} color={data.overdue > 0 ? 'red' : undefined} />
        <StatRow label="Draft" value={data.draft.toString()} />
        <StatRow label="Cancelled" value={data.cancelled.toString()} />
      </Section>

      <Section title="Amounts">
        <StatRow label="Total paid (all time)" value={fmtAUD(data.totalPaidCents)} color="green" />
        <StatRow
          label="Total outstanding"
          value={fmtAUD(data.totalOutstandingCents)}
          color={data.totalOutstandingCents > 0 ? 'amber' : undefined}
        />
        <StatRow
          label="Avg days to payment"
          value={data.avgDaysToPay !== null ? `${data.avgDaysToPay} days` : '—'}
          sub={data.avgDaysToPay !== null ? 'from issue date to paid date' : 'no paid invoices with dates'}
        />
      </Section>
    </Modal>
  )
}
