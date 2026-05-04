'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Card from '@/components/ui/Card'
import type {
  AllReportData,
  Period,
  ChartBar,
} from '@/lib/reports'
import { RevenueModal, SessionsModal, ClientsModal, InvoicesModal } from './ReportModals'

function DownloadIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  )
}

const EXPORT_TYPES = [
  { key: 'all',      label: 'All' },
  { key: 'revenue',  label: 'Revenue' },
  { key: 'sessions', label: 'Sessions' },
  { key: 'clients',  label: 'Clients' },
  { key: 'invoices', label: 'Invoices' },
] as const

// Defined inline so this file never imports a server module as a value
const fmtAUD = (cents: number) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(cents / 100)

const PERIOD_OPTIONS: { key: Period; label: string }[] = [
  { key: 'this_month', label: 'This month' },
  { key: 'last_month', label: 'Last month' },
  { key: 'last_3_months', label: 'Last 3 months' },
  { key: 'this_year', label: 'This year' },
]

type ModalKey = 'revenue' | 'sessions' | 'clients' | 'invoices' | null

// ---------------------------------------------------------------------------
// Bar chart — pure CSS, no library
// ---------------------------------------------------------------------------

function BarChart({ bars }: { bars: ChartBar[] }) {
  const maxCents = Math.max(...bars.map((b) => b.amountCents), 1)
  const showLabel = (i: number) => bars.length <= 14 || i % 7 === 0 || i === bars.length - 1

  return (
    <div className="flex items-end gap-px" style={{ height: 140 }}>
      {bars.map((bar, i) => {
        const pct = Math.max((bar.amountCents / maxCents) * 100, bar.amountCents > 0 ? 1.5 : 0.3)
        return (
          <div
            key={i}
            className="group relative flex flex-1 flex-col items-center justify-end"
            style={{ height: '100%' }}
          >
            {/* Hover tooltip */}
            {bar.amountCents > 0 && (
              <div className="pointer-events-none absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100 z-10">
                {fmtAUD(bar.amountCents)}
              </div>
            )}
            {/* Bar */}
            <div
              className={`w-full rounded-t transition-colors ${
                bar.amountCents > 0
                  ? 'bg-brand-500 group-hover:bg-brand-600'
                  : 'bg-gray-100'
              }`}
              style={{ height: `${pct}%` }}
            />
            {/* Label */}
            <span
              className="mt-1.5 block truncate px-px text-center leading-tight"
              style={{
                fontSize: 9,
                color: '#9ca3af',
                visibility: showLabel(i) ? 'visible' : 'hidden',
                maxWidth: '100%',
              }}
            >
              {bar.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Report card (clickable)
// ---------------------------------------------------------------------------

function ReportCard({
  title,
  subtitle,
  icon,
  onClick,
}: {
  title: string
  subtitle: string
  icon: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-start gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md text-left"
    >
      <span className="mt-0.5 text-2xl">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-gray-900 group-hover:text-brand-600">{title}</p>
        <p className="mt-0.5 text-sm text-gray-500 truncate">{subtitle}</p>
      </div>
      <svg
        className="mt-1 h-4 w-4 shrink-0 text-gray-300 transition-colors group-hover:text-brand-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  )
}

// ---------------------------------------------------------------------------
// KPI card
// ---------------------------------------------------------------------------

function KpiCard({
  label,
  value,
  sub,
  highlight,
}: {
  label: string
  value: string
  sub: string
  highlight?: boolean
}) {
  return (
    <Card padding="md">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
      <p
        className={`mt-1.5 text-2xl font-bold ${
          highlight ? 'text-brand-700' : 'text-gray-900'
        }`}
      >
        {value}
      </p>
      <p className="mt-0.5 text-xs text-gray-400">{sub}</p>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Main dashboard component
// ---------------------------------------------------------------------------

export default function ReportsDashboard({
  data,
  currentPeriod,
}: {
  data: AllReportData
  currentPeriod: Period
}) {
  const router = useRouter()
  const [openModal, setOpenModal] = useState<ModalKey>(null)
  const { dashboard, revenue, sessions, clients, invoices, period } = data

  const hasChart = dashboard.chartBars.some((b) => b.amountCents > 0)

  return (
    <>
      {/* Period filter + export */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {PERIOD_OPTIONS.map((opt) => (
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

        {/* Export buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-gray-400">Export:</span>
          {EXPORT_TYPES.map((t) => (
            <a
              key={t.key}
              href={`/api/reports/export?type=${t.key}&period=${currentPeriod}`}
              download
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-800"
            >
              <DownloadIcon />
              {t.label}
            </a>
          ))}
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total revenue"
          value={fmtAUD(dashboard.totalRevenueCents)}
          sub="From paid invoices"
          highlight={dashboard.totalRevenueCents > 0}
        />
        <KpiCard
          label="Sessions completed"
          value={dashboard.completedSessions.toString()}
          sub={period.label}
        />
        <KpiCard
          label="New clients"
          value={dashboard.newClients.toString()}
          sub="Enrolled this period"
        />
        <KpiCard
          label="Avg session value"
          value={fmtAUD(dashboard.avgSessionValueCents)}
          sub={
            dashboard.completedSessions > 0
              ? 'Per completed session'
              : 'No completed sessions yet'
          }
        />
      </div>

      {/* Revenue over time */}
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Revenue over time</h2>
          {hasChart && (
            <span className="text-xs text-gray-400">
              {fmtAUD(dashboard.totalRevenueCents)} total
            </span>
          )}
        </div>
        {hasChart ? (
          <BarChart bars={dashboard.chartBars} />
        ) : (
          <div className="flex h-36 items-center justify-center rounded-xl bg-gray-50">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-400">No paid revenue this period</p>
              <p className="mt-1 text-xs text-gray-300">
                Revenue appears here once invoices are marked as paid.
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* Report cards */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Detailed reports</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <ReportCard
            title="Revenue report"
            subtitle={
              revenue.paidCents > 0
                ? `${fmtAUD(revenue.paidCents)} paid · ${fmtAUD(revenue.unpaidCents)} outstanding`
                : 'No paid revenue this period'
            }
            icon="💰"
            onClick={() => setOpenModal('revenue')}
          />
          <ReportCard
            title="Sessions report"
            subtitle={
              sessions.total > 0
                ? `${sessions.completed} completed · ${sessions.completionRate}% completion rate`
                : 'No sessions this period'
            }
            icon="📅"
            onClick={() => setOpenModal('sessions')}
          />
          <ReportCard
            title="Client report"
            subtitle={`${clients.totalActive} active · ${clients.newInPeriod} new · ${clients.inactive} inactive`}
            icon="👥"
            onClick={() => setOpenModal('clients')}
          />
          <ReportCard
            title="Invoice report"
            subtitle={
              invoices.totalOutstandingCents > 0
                ? `${fmtAUD(invoices.totalOutstandingCents)} outstanding · ${invoices.overdue} overdue`
                : `${invoices.paid} paid · all cleared`
            }
            icon="📊"
            onClick={() => setOpenModal('invoices')}
          />
        </div>
      </div>

      {/* Modals */}
      {openModal === 'revenue' && (
        <RevenueModal data={revenue} periodLabel={period.label} onClose={() => setOpenModal(null)} />
      )}
      {openModal === 'sessions' && (
        <SessionsModal data={sessions} periodLabel={period.label} onClose={() => setOpenModal(null)} />
      )}
      {openModal === 'clients' && (
        <ClientsModal data={clients} onClose={() => setOpenModal(null)} />
      )}
      {openModal === 'invoices' && (
        <InvoicesModal data={invoices} onClose={() => setOpenModal(null)} />
      )}
    </>
  )
}
