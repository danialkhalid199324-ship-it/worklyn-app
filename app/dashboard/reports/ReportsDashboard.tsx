'use client'

import { useRouter } from 'next/navigation'
import type { CommandCentreData, Period } from '@/lib/reports'

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

const fmtAUD = (cents: number) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(cents / 100)

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })

const PERIOD_OPTIONS: { key: Period; label: string }[] = [
  { key: 'this_month',    label: 'This month'    },
  { key: 'last_month',    label: 'Last month'    },
  { key: 'last_3_months', label: 'Last 3 months' },
  { key: 'this_year',     label: 'This year'     },
]

// ---------------------------------------------------------------------------
// Layout primitives
// ---------------------------------------------------------------------------

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4 flex items-baseline gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">{title}</h2>
      {subtitle && <span className="text-xs text-gray-400">{subtitle}</span>}
    </div>
  )
}

function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-gray-100 bg-white p-5 shadow-sm ${className ?? ''}`}>
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// KPI card
// ---------------------------------------------------------------------------

type KpiColor = 'default' | 'green' | 'amber' | 'red' | 'blue'

function KpiCard({
  label,
  value,
  sub,
  color = 'default',
}: {
  label: string
  value: string
  sub?: string
  color?: KpiColor
}) {
  const valueColors: Record<KpiColor, string> = {
    default: 'text-gray-900',
    green:   'text-green-600',
    amber:   'text-amber-600',
    red:     'text-red-600',
    blue:    'text-blue-600',
  }
  const bgColors: Record<KpiColor, string> = {
    default: 'bg-white',
    green:   'bg-green-50/60',
    amber:   'bg-amber-50/60',
    red:     'bg-red-50/60',
    blue:    'bg-blue-50/60',
  }
  return (
    <div className={`rounded-xl border border-gray-100 p-4 shadow-sm ${bgColors[color]}`}>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className={`mt-1.5 text-2xl font-bold tabular-nums ${valueColors[color]}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Finance sub-components
// ---------------------------------------------------------------------------

function FinanceStat({
  label, value, sub, color = 'default',
}: {
  label: string; value: string; sub?: string; color?: KpiColor
}) {
  const cls: Record<KpiColor, string> = {
    default: 'text-gray-900',
    green:   'text-green-600',
    amber:   'text-amber-600',
    red:     'text-red-600',
    blue:    'text-blue-600',
  }
  return (
    <div className="flex items-center justify-between border-b border-gray-50 py-2.5 last:border-0">
      <div>
        <span className="text-sm text-gray-600">{label}</span>
        {sub && <span className="ml-2 text-xs text-gray-400">{sub}</span>}
      </div>
      <span className={`text-sm font-semibold ${cls[color]}`}>{value}</span>
    </div>
  )
}

function AgeingRow({ label, count, cents, color }: {
  label: string; count: number; cents: number; color: KpiColor
}) {
  const barColors: Record<KpiColor, string> = {
    default: 'bg-gray-200',
    green:   'bg-green-400',
    amber:   'bg-amber-400',
    red:     'bg-red-500',
    blue:    'bg-blue-400',
  }
  const textColors: Record<KpiColor, string> = {
    default: 'text-gray-600',
    green:   'text-green-700',
    amber:   'text-amber-700',
    red:     'text-red-700',
    blue:    'text-blue-700',
  }
  return (
    <div className={`flex items-center justify-between rounded-lg px-3 py-2.5 ${count > 0 ? 'bg-gray-50' : ''}`}>
      <div className="flex items-center gap-2.5">
        <div className={`h-2 w-2 rounded-full ${count > 0 ? barColors[color] : 'bg-gray-200'}`} />
        <span className={`text-sm ${count > 0 ? textColors[color] : 'text-gray-400'}`}>{label}</span>
      </div>
      {count > 0 ? (
        <div className="flex items-center gap-3">
          <span className={`text-xs font-medium ${textColors[color]}`}>{count} invoice{count !== 1 ? 's' : ''}</span>
          <span className={`text-sm font-semibold tabular-nums ${textColors[color]}`}>{fmtAUD(cents)}</span>
        </div>
      ) : (
        <span className="text-xs text-gray-300">All clear</span>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Compliance badge
// ---------------------------------------------------------------------------

function ComplianceBadge({
  label, count, description, severity,
}: {
  label: string; count: number; description: string; severity: 'ok' | 'warn' | 'error'
}) {
  const styles = {
    ok:    { bg: 'bg-green-50',  border: 'border-green-100', dot: 'bg-green-400',  num: 'text-green-700',  label: 'text-green-700' },
    warn:  { bg: 'bg-amber-50',  border: 'border-amber-100', dot: 'bg-amber-400',  num: 'text-amber-700',  label: 'text-amber-700' },
    error: { bg: 'bg-red-50',    border: 'border-red-100',   dot: 'bg-red-500',    num: 'text-red-700',    label: 'text-red-700'   },
  }[severity]

  return (
    <div className={`rounded-xl border p-4 ${styles.bg} ${styles.border}`}>
      <div className="flex items-center gap-2 mb-1">
        <div className={`h-2 w-2 rounded-full ${styles.dot}`} />
        <span className={`text-xs font-semibold uppercase tracking-wide ${styles.label}`}>{label}</span>
      </div>
      <p className={`text-3xl font-bold tabular-nums ${styles.num}`}>{count}</p>
      <p className="mt-1 text-xs text-gray-500">{description}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Export button
// ---------------------------------------------------------------------------

function ExportBtn({ label, href, filename }: { label: string; href: string; filename: string }) {
  return (
    <a
      href={href}
      download={filename}
      className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 hover:border-gray-300"
    >
      <svg className="h-4 w-4 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      {label}
    </a>
  )
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState({ text }: { text: string }) {
  return (
    <p className="py-4 text-center text-sm text-gray-400">{text}</p>
  )
}

// ---------------------------------------------------------------------------
// Main dashboard
// ---------------------------------------------------------------------------

export default function ReportsDashboard({
  data,
  currentPeriod,
}: {
  data: CommandCentreData
  currentPeriod: Period
}) {
  const router = useRouter()
  const today = new Date().toISOString().slice(0, 10)
  const { kpis, finance, operations, compliance, period } = data

  return (
    <div className="space-y-8">

      {/* ── Page header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Reports</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Operational, financial and compliance insights for your practice.
          </p>
        </div>

        {/* Period filter */}
        <div className="flex flex-wrap gap-1.5">
          {PERIOD_OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => router.push(`/dashboard/reports?period=${opt.key}`)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                currentPeriod === opt.key
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── KPI row ────────────────────────────────────────────────────────── */}
      <div>
        <SectionHeader title="Overview" subtitle={period.label} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <KpiCard
            label="Revenue received"
            value={fmtAUD(kpis.revenueReceivedCents)}
            sub="paid this period"
            color="green"
          />
          <KpiCard
            label="Outstanding"
            value={fmtAUD(kpis.outstandingCents)}
            sub="sent + overdue"
            color={kpis.outstandingCents > 0 ? 'amber' : 'default'}
          />
          <KpiCard
            label="Overdue invoices"
            value={kpis.overdueCount.toString()}
            sub={kpis.overdueCents > 0 ? fmtAUD(kpis.overdueCents) : 'none overdue'}
            color={kpis.overdueCount > 0 ? 'red' : 'green'}
          />
          <KpiCard
            label="Sessions completed"
            value={kpis.sessionsCompleted.toString()}
            sub="in period"
            color={kpis.sessionsCompleted > 0 ? 'green' : 'default'}
          />
          <KpiCard
            label="Completion rate"
            value={
              operations.completed + operations.cancelled > 0
                ? `${kpis.completionRate}%`
                : '—'
            }
            sub="completed ÷ (completed + cancelled)"
            color={
              kpis.completionRate >= 80 ? 'green' :
              kpis.completionRate > 0   ? 'amber' : 'default'
            }
          />
          <KpiCard
            label="Uninvoiced sessions"
            value={kpis.uninvoicedCompleted.toString()}
            sub="completed, no invoice"
            color={kpis.uninvoicedCompleted > 0 ? 'amber' : 'green'}
          />
        </div>
      </div>

      {/* ── Finance ────────────────────────────────────────────────────────── */}
      <div>
        <SectionHeader title="Finance" subtitle="All-time financial position" />
        <div className="space-y-4">

          {/* Finance summary cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Panel className="col-span-1">
              <p className="text-xs font-medium text-gray-500">Total paid</p>
              <p className="mt-1 text-xl font-bold text-green-600 tabular-nums">{fmtAUD(finance.paidTotalCents)}</p>
              <p className="mt-0.5 text-xs text-gray-400">all time</p>
            </Panel>
            <Panel className="col-span-1">
              <p className="text-xs font-medium text-gray-500">Outstanding</p>
              <p className={`mt-1 text-xl font-bold tabular-nums ${finance.outstandingCents > 0 ? 'text-amber-600' : 'text-gray-900'}`}>
                {fmtAUD(finance.outstandingCents)}
              </p>
              <p className="mt-0.5 text-xs text-gray-400">sent + overdue</p>
            </Panel>
            <Panel className="col-span-1">
              <p className="text-xs font-medium text-gray-500">Overdue</p>
              <p className={`mt-1 text-xl font-bold tabular-nums ${finance.overdueCents > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                {fmtAUD(finance.overdueCents)}
              </p>
              <p className="mt-0.5 text-xs text-gray-400">{finance.overdueCents > 0 ? `${kpis.overdueCount} invoice${kpis.overdueCount !== 1 ? 's' : ''}` : 'none overdue'}</p>
            </Panel>
            <Panel className="col-span-1">
              <p className="text-xs font-medium text-gray-500">Remittance pending</p>
              <p className={`mt-1 text-xl font-bold tabular-nums ${finance.remittancePendingCount > 0 ? 'text-blue-600' : 'text-gray-900'}`}>
                {finance.remittancePendingCount}
              </p>
              <p className="mt-0.5 text-xs text-gray-400">
                {finance.remittancePendingCount > 0
                  ? `${fmtAUD(finance.remittancePendingCents)} awaiting remittance`
                  : 'all remittance received'}
              </p>
            </Panel>
          </div>

          {/* Invoice ageing + Revenue by client */}
          <div className="grid gap-4 lg:grid-cols-2">

            {/* Invoice ageing */}
            <Panel>
              <p className="mb-3 text-sm font-semibold text-gray-800">Invoice ageing</p>
              <div className="space-y-1">
                <AgeingRow label="0–7 days overdue"   count={finance.ageing.d0_7}    cents={finance.ageingCents.d0_7}    color="amber" />
                <AgeingRow label="8–14 days overdue"  count={finance.ageing.d8_14}   cents={finance.ageingCents.d8_14}   color="amber" />
                <AgeingRow label="15–30 days overdue" count={finance.ageing.d15_30}  cents={finance.ageingCents.d15_30}  color="red"   />
                <AgeingRow label="30+ days overdue"   count={finance.ageing.d30plus} cents={finance.ageingCents.d30plus} color="red"   />
              </div>
              {finance.overdueCents === 0 && (
                <p className="mt-3 text-center text-xs text-green-600 font-medium">No overdue invoices</p>
              )}
            </Panel>

            {/* Revenue by client */}
            <Panel>
              <p className="mb-3 text-sm font-semibold text-gray-800">Revenue by client</p>
              {finance.revenueByClient.length === 0 ? (
                <EmptyState text="No paid invoices recorded yet." />
              ) : (
                <div>
                  {finance.revenueByClient.map((c, i) => (
                    <div key={i} className="flex items-center gap-3 border-b border-gray-50 py-2.5 last:border-0">
                      <span className="w-5 shrink-0 text-xs font-medium text-gray-300">{i + 1}</span>
                      <span className="min-w-0 flex-1 truncate text-sm text-gray-700">{c.name}</span>
                      <span className="shrink-0 text-sm font-semibold tabular-nums text-gray-900">{fmtAUD(c.cents)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

          </div>
        </div>
      </div>

      {/* ── Operations ─────────────────────────────────────────────────────── */}
      <div>
        <SectionHeader title="Operations" subtitle={period.label} />
        <div className="space-y-4">

          {/* Session stat cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Panel>
              <p className="text-xs font-medium text-gray-500">Scheduled</p>
              <p className="mt-1 text-2xl font-bold text-gray-900 tabular-nums">{operations.scheduled}</p>
              <p className="mt-0.5 text-xs text-gray-400">upcoming sessions</p>
            </Panel>
            <Panel>
              <p className="text-xs font-medium text-gray-500">Completed</p>
              <p className={`mt-1 text-2xl font-bold tabular-nums ${operations.completed > 0 ? 'text-green-600' : 'text-gray-900'}`}>
                {operations.completed}
              </p>
              <p className="mt-0.5 text-xs text-gray-400">sessions delivered</p>
            </Panel>
            <Panel>
              <p className="text-xs font-medium text-gray-500">Cancelled</p>
              <p className={`mt-1 text-2xl font-bold tabular-nums ${operations.cancelled > 0 ? 'text-amber-600' : 'text-gray-900'}`}>
                {operations.cancelled}
              </p>
              <p className="mt-0.5 text-xs text-gray-400">
                {operations.completed + operations.cancelled > 0
                  ? `${operations.completionRate}% completion rate`
                  : 'no sessions yet'}
              </p>
            </Panel>
            <Panel>
              <p className="text-xs font-medium text-gray-500">Hours delivered</p>
              <p className="mt-1 text-2xl font-bold text-gray-900 tabular-nums">{operations.hoursDelivered}</p>
              <p className="mt-0.5 text-xs text-gray-400">of completed sessions</p>
            </Panel>
          </div>

          {/* Sessions by service */}
          <Panel>
            <p className="mb-3 text-sm font-semibold text-gray-800">Sessions by service type</p>
            {operations.byService.length === 0 ? (
              <EmptyState text="No sessions in this period." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="py-2 text-left text-xs font-medium text-gray-400">Service</th>
                      <th className="py-2 text-right text-xs font-medium text-gray-400">Total</th>
                      <th className="py-2 text-right text-xs font-medium text-gray-400">Completed</th>
                      <th className="py-2 text-right text-xs font-medium text-gray-400">Rate</th>
                      <th className="py-2 text-right text-xs font-medium text-gray-400">Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {operations.byService.map((s, i) => {
                      const rate = s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0
                      return (
                        <tr key={i} className="border-b border-gray-50 last:border-0">
                          <td className="py-2.5 text-gray-700">{s.name}</td>
                          <td className="py-2.5 text-right text-gray-700 tabular-nums">{s.total}</td>
                          <td className="py-2.5 text-right tabular-nums">
                            <span className={s.completed > 0 ? 'text-green-600 font-medium' : 'text-gray-400'}>{s.completed}</span>
                          </td>
                          <td className="py-2.5 text-right tabular-nums">
                            <span className={rate >= 80 ? 'text-green-600' : rate > 0 ? 'text-amber-600' : 'text-gray-400'}>
                              {s.total > 0 ? `${rate}%` : '—'}
                            </span>
                          </td>
                          <td className="py-2.5 text-right text-gray-700 tabular-nums">{s.hours > 0 ? s.hours : '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

        </div>
      </div>

      {/* ── Compliance ─────────────────────────────────────────────────────── */}
      <div>
        <SectionHeader title="Compliance &amp; Audit" subtitle="Action items requiring attention" />
        <div className="space-y-4">

          {/* Alert badges */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <ComplianceBadge
              label="Missing case notes"
              count={compliance.missingNotes}
              description="Completed sessions with no notes recorded"
              severity={compliance.missingNotes > 0 ? 'warn' : 'ok'}
            />
            <ComplianceBadge
              label="Uninvoiced sessions"
              count={compliance.uninvoiced}
              description="Completed sessions not linked to an invoice"
              severity={compliance.uninvoiced > 0 ? 'warn' : 'ok'}
            />
            <ComplianceBadge
              label="Missing payment ref"
              count={compliance.missingPaymentRef}
              description="Paid invoices without a payment reference"
              severity={compliance.missingPaymentRef > 0 ? 'warn' : 'ok'}
            />
            <ComplianceBadge
              label="Clients without docs"
              count={compliance.clientsMissingDocs}
              description="Active clients with no documents on file"
              severity={compliance.clientsMissingDocs > 0 ? 'warn' : 'ok'}
            />
          </div>

          {/* Overdue invoices list + Remittance pending */}
          <div className="grid gap-4 lg:grid-cols-2">

            <Panel>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-800">Overdue invoices</p>
                {compliance.overdueList.length > 0 && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                    {compliance.overdueList.length}
                  </span>
                )}
              </div>
              {compliance.overdueList.length === 0 ? (
                <div className="flex items-center gap-2 py-3">
                  <div className="h-2 w-2 rounded-full bg-green-400" />
                  <span className="text-sm text-green-600 font-medium">No overdue invoices — all clear.</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="pb-2 text-left text-xs font-medium text-gray-400">Invoice</th>
                        <th className="pb-2 text-left text-xs font-medium text-gray-400">Client</th>
                        <th className="pb-2 text-right text-xs font-medium text-gray-400">Days</th>
                        <th className="pb-2 text-right text-xs font-medium text-gray-400">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {compliance.overdueList.map((inv, i) => (
                        <tr key={i} className="border-b border-gray-50 last:border-0">
                          <td className="py-2.5 font-medium text-gray-700">{inv.invoiceNumber}</td>
                          <td className="py-2.5 text-gray-600 truncate max-w-[120px]">{inv.clientName}</td>
                          <td className="py-2.5 text-right">
                            <span className={`font-semibold tabular-nums ${inv.daysOverdue > 30 ? 'text-red-600' : 'text-amber-600'}`}>
                              {inv.daysOverdue}d
                            </span>
                          </td>
                          <td className="py-2.5 text-right font-semibold tabular-nums text-red-600">
                            {fmtAUD(inv.cents)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>

            <Panel>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-800">Remittance pending</p>
                {compliance.remittancePendingList.length > 0 && (
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                    {compliance.remittancePendingList.length}
                  </span>
                )}
              </div>
              {compliance.remittancePendingList.length === 0 ? (
                <div className="flex items-center gap-2 py-3">
                  <div className="h-2 w-2 rounded-full bg-green-400" />
                  <span className="text-sm text-green-600 font-medium">All remittance received — all clear.</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="pb-2 text-left text-xs font-medium text-gray-400">Invoice</th>
                        <th className="pb-2 text-left text-xs font-medium text-gray-400">Client</th>
                        <th className="pb-2 text-right text-xs font-medium text-gray-400">Paid</th>
                        <th className="pb-2 text-right text-xs font-medium text-gray-400">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {compliance.remittancePendingList.map((inv, i) => (
                        <tr key={i} className="border-b border-gray-50 last:border-0">
                          <td className="py-2.5 font-medium text-gray-700">{inv.invoiceNumber}</td>
                          <td className="py-2.5 text-gray-600 truncate max-w-[120px]">{inv.clientName}</td>
                          <td className="py-2.5 text-right text-xs text-gray-500 tabular-nums">
                            {inv.paidAt ? fmtDate(inv.paidAt) : '—'}
                          </td>
                          <td className="py-2.5 text-right font-semibold tabular-nums text-blue-600">
                            {fmtAUD(inv.cents)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>

          </div>
        </div>
      </div>

      {/* ── Exports ────────────────────────────────────────────────────────── */}
      <div>
        <SectionHeader title="Exports" subtitle="Download CSV reports" />
        <Panel>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <ExportBtn
              label="Financial Summary"
              href={`/api/reports/export?type=financial-summary&period=${currentPeriod}`}
              filename={`financial-summary-${today}.csv`}
            />
            <ExportBtn
              label="Overdue Invoices"
              href={`/api/reports/export?type=overdue-invoices`}
              filename={`overdue-invoices-${today}.csv`}
            />
            <ExportBtn
              label="Client List"
              href={`/api/reports/export?type=clients`}
              filename={`clients-${today}.csv`}
            />
            <ExportBtn
              label="Sessions Report"
              href={`/api/reports/export?type=sessions&period=${currentPeriod}`}
              filename={`sessions-${today}.csv`}
            />
            <ExportBtn
              label="Practitioner Utilisation"
              href={`/api/reports/export?type=practitioner-utilisation&period=${currentPeriod}`}
              filename={`practitioner-utilisation-${today}.csv`}
            />
            <ExportBtn
              label="Compliance Exceptions"
              href={`/api/reports/export?type=compliance-exceptions`}
              filename={`compliance-exceptions-${today}.csv`}
            />
          </div>
        </Panel>
      </div>

    </div>
  )
}
