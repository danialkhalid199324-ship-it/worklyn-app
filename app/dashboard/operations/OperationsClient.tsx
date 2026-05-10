'use client'

import Link from 'next/link'
import type { PractitionerMetrics, ActivityEvent } from './page'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  practitioner: 'Practitioner',
  receptionist: 'Receptionist',
  finance: 'Finance',
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatHours(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function BarChart({
  items,
  valueLabel,
  maxValue,
  formatValue,
  color,
}: {
  items: { name: string; value: number }[]
  valueLabel: string
  maxValue: number
  formatValue: (v: number) => string
  color: string
}) {
  if (items.length === 0) {
    return <p className="text-sm text-gray-400">No data for this period.</p>
  }
  return (
    <div className="space-y-3">
      {items.map(item => {
        const pct = maxValue > 0 ? Math.round((item.value / maxValue) * 100) : 0
        return (
          <div key={item.name} className="flex items-center gap-3">
            <span className="w-32 shrink-0 truncate text-right text-sm text-gray-600" title={item.name}>
              {item.name.split(' ')[0]}
            </span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
              <div
                className={`h-2 rounded-full transition-all ${color}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="w-20 shrink-0 text-right text-xs tabular-nums text-gray-500">
              {formatValue(item.value)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function ActivityIcon({ kind }: { kind: ActivityEvent['kind'] }) {
  if (kind === 'session_completed') {
    return (
      <svg className="h-4 w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  }
  if (kind === 'invoice_created') {
    return (
      <svg className="h-4 w-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    )
  }
  if (kind === 'notification_sent') {
    return (
      <svg className="h-4 w-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    )
  }
  // member_invited
  return (
    <svg className="h-4 w-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
        d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
    </svg>
  )
}

function RoleBadge({ role }: { role: string }) {
  const label = ROLE_LABELS[role] ?? role
  const colourMap: Record<string, string> = {
    admin: 'bg-blue-50 text-blue-700',
    practitioner: 'bg-green-50 text-green-700',
    receptionist: 'bg-amber-50 text-amber-700',
    finance: 'bg-purple-50 text-purple-700',
  }
  const colour = colourMap[role] ?? 'bg-gray-100 text-gray-600'
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${colour}`}>
      {label}
    </span>
  )
}

export default function OperationsClient({
  range,
  dateLabel,
  metrics,
  activityFeed,
}: {
  range: string
  dateLabel: string
  metrics: PractitionerMetrics[]
  activityFeed: ActivityEvent[]
}) {
  const totalSessions = metrics.reduce((s, m) => s + m.totalSessions, 0)
  const totalCompleted = metrics.reduce((s, m) => s + m.completedSessions, 0)
  const totalInvoicedCents = metrics.reduce((s, m) => s + m.totalInvoicedCents, 0)
  const overallCompletionRate = totalSessions > 0
    ? Math.round((totalCompleted / totalSessions) * 100)
    : 0

  const maxSessions = Math.max(...metrics.map(m => m.totalSessions), 1)
  const maxRevenue = Math.max(...metrics.map(m => m.totalInvoicedCents), 1)

  const RANGES = [
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Operations</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Team performance and activity overview · {dateLabel}
          </p>
        </div>
        {/* Range tabs */}
        <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
          {RANGES.map(r => (
            <Link
              key={r.key}
              href={`?range=${r.key}`}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                range === r.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {r.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Total Sessions</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-gray-900">{totalSessions}</p>
          <p className="mt-1 text-xs text-gray-400">{totalCompleted} completed</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Total Invoiced</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-gray-900">
            {formatCents(totalInvoicedCents)}
          </p>
          <p className="mt-1 text-xs text-gray-400">non-cancelled invoices</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Completion Rate</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-gray-900">{overallCompletionRate}%</p>
          <p className="mt-1 text-xs text-gray-400">{metrics.length} active {metrics.length === 1 ? 'member' : 'members'}</p>
        </div>
      </div>

      {/* Per-practitioner metrics table */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-sm font-semibold text-gray-900">Team Performance</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                  Practitioner
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-400">
                  Total
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-400">
                  Completed
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-400">
                  Scheduled
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-400">
                  Cancelled
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-400">
                  Billable
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-400">
                  Invoiced
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-400">
                  Rate
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-400">
                  Last Session
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {metrics.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-sm text-gray-400">
                    No data for this period.
                  </td>
                </tr>
              ) : (
                metrics.map(m => (
                  <tr key={m.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">
                          {m.name.split(' ').map(p => p[0]).slice(0, 2).join('')}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{m.name}</p>
                          <RoleBadge role={m.role} />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right tabular-nums text-gray-700">
                      {m.totalSessions}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="tabular-nums text-green-700">{m.completedSessions}</span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="tabular-nums text-blue-600">{m.scheduledSessions}</span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="tabular-nums text-gray-400">{m.cancelledSessions}</span>
                    </td>
                    <td className="px-4 py-4 text-right tabular-nums text-gray-700">
                      {formatHours(m.billableMinutes)}
                    </td>
                    <td className="px-4 py-4 text-right tabular-nums text-gray-700">
                      {formatCents(m.totalInvoicedCents)}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className="h-1.5 rounded-full bg-brand-500"
                            style={{ width: `${m.completionRate}%` }}
                          />
                        </div>
                        <span className="w-8 tabular-nums text-xs text-gray-500">
                          {m.completionRate}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right tabular-nums text-xs text-gray-400">
                      {m.lastActivityDate ? formatDate(m.lastActivityDate) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Sessions by practitioner */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">Sessions by Practitioner</h2>
          <BarChart
            items={metrics.map(m => ({ name: m.name, value: m.totalSessions }))}
            valueLabel="sessions"
            maxValue={maxSessions}
            formatValue={v => `${v} sessions`}
            color="bg-brand-500"
          />
        </div>

        {/* Revenue by practitioner */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">Revenue by Practitioner</h2>
          <BarChart
            items={metrics.map(m => ({ name: m.name, value: m.totalInvoicedCents }))}
            valueLabel="revenue"
            maxValue={maxRevenue}
            formatValue={v => formatCents(v)}
            color="bg-green-500"
          />
        </div>
      </div>

      {/* Completion rate bars */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Completion Rate by Practitioner</h2>
        {metrics.length === 0 ? (
          <p className="text-sm text-gray-400">No data for this period.</p>
        ) : (
          <div className="space-y-3">
            {metrics.map(m => (
              <div key={m.id} className="flex items-center gap-3">
                <span className="w-32 shrink-0 truncate text-right text-sm text-gray-600" title={m.name}>
                  {m.name.split(' ')[0]}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      m.completionRate >= 80
                        ? 'bg-green-500'
                        : m.completionRate >= 50
                          ? 'bg-amber-400'
                          : 'bg-red-400'
                    }`}
                    style={{ width: `${m.completionRate}%` }}
                  />
                </div>
                <div className="flex w-28 shrink-0 items-center justify-end gap-1.5">
                  <span className="tabular-nums text-xs text-gray-500">{m.completionRate}%</span>
                  <span className="text-[11px] text-gray-300">
                    ({m.completedSessions}/{m.totalSessions})
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent activity */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-sm font-semibold text-gray-900">Recent Activity</h2>
        </div>
        {activityFeed.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-gray-400">
            No recent activity to display.
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {activityFeed.map(event => (
              <li key={event.id} className="flex items-start gap-3 px-6 py-3.5">
                <span className="mt-0.5 shrink-0">
                  <ActivityIcon kind={event.kind} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-800">{event.label}</p>
                  <p className="mt-0.5 text-xs text-gray-400">{event.sub}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
