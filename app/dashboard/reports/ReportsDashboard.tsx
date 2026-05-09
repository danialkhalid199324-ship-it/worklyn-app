'use client'

import { useRouter } from 'next/navigation'
import Card from '@/components/ui/Card'
import type { Period } from '@/lib/reports'

const fmtAUD = (cents: number) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(cents / 100)

const PERIOD_OPTIONS: { key: Period; label: string }[] = [
  { key: 'this_month',    label: 'This month' },
  { key: 'last_month',    label: 'Last month' },
  { key: 'last_3_months', label: 'Last 3 months' },
  { key: 'this_year',     label: 'This year' },
]

type Preview = {
  overdue:   { count: number; totalCents: number }
  clients:   { active: number; total: number }
  sessions:  { completed: number; total: number }
  financial: { totalPaidCents: number; totalOutstandingCents: number; overdueCount: number; revenueMonthCents: number }
}

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------

function DownloadIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  )
}

function Chip({
  value, label, color = 'gray',
}: {
  value: string; label: string; color?: 'gray' | 'green' | 'amber' | 'red' | 'blue'
}) {
  const cls = {
    gray:  'bg-gray-100 text-gray-600',
    green: 'bg-green-50 text-green-700',
    amber: 'bg-amber-50 text-amber-700',
    red:   'bg-red-50 text-red-700',
    blue:  'bg-blue-50 text-blue-700',
  }[color]
  return (
    <span className={`inline-flex items-baseline gap-1 rounded-md px-2.5 py-1 text-xs font-medium ${cls}`}>
      <span className="font-semibold">{value}</span>
      <span>{label}</span>
    </span>
  )
}

function ReportCard({
  title, description, chips, exportHref, filename,
}: {
  title: string
  description: string
  chips: React.ReactNode
  exportHref: string
  filename: string
}) {
  return (
    <Card padding="md" className="flex flex-col gap-4">
      <div>
        <p className="font-semibold text-gray-900">{title}</p>
        <p className="mt-0.5 text-sm text-gray-500">{description}</p>
      </div>
      <div className="flex flex-wrap gap-1.5">{chips}</div>
      <div className="mt-auto pt-1 border-t border-gray-50">
        <a
          href={exportHref}
          download={filename}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
        >
          <DownloadIcon />
          Export CSV
        </a>
      </div>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ReportsDashboard({
  preview,
  currentPeriod,
}: {
  preview: Preview
  currentPeriod: Period
}) {
  const router = useRouter()
  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="space-y-5">

      {/* Period filter */}
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

      {/* Report cards */}
      <div className="grid gap-4 sm:grid-cols-2">

        {/* 1. Overdue Invoices */}
        <ReportCard
          title="Overdue Invoices"
          description="All overdue invoices with client, recipient, and contact details. Includes days overdue."
          chips={
            <>
              <Chip
                value={preview.overdue.count.toString()}
                label={preview.overdue.count === 1 ? 'overdue invoice' : 'overdue invoices'}
                color={preview.overdue.count > 0 ? 'red' : 'gray'}
              />
              {preview.overdue.totalCents > 0 && (
                <Chip value={fmtAUD(preview.overdue.totalCents)} label="total owed" color="amber" />
              )}
              {preview.overdue.count === 0 && (
                <Chip value="All clear" label="" color="green" />
              )}
            </>
          }
          exportHref={`/api/reports/export?type=overdue-invoices`}
          filename={`overdue-invoices-report-${today}.csv`}
        />

        {/* 2. Client List */}
        <ReportCard
          title="Client List"
          description="All clients with contact, funding type, NDIS details, and plan manager information."
          chips={
            <>
              <Chip value={preview.clients.active.toString()} label="active" color="green" />
              <Chip value={preview.clients.total.toString()} label="total clients" />
            </>
          }
          exportHref={`/api/reports/export?type=clients`}
          filename={`clients-report-${today}.csv`}
        />

        {/* 3. Sessions Report */}
        <ReportCard
          title="Sessions Report"
          description="Sessions in the selected period with service, rate, amount, invoice number, and notes status."
          chips={
            <>
              <Chip value={preview.sessions.completed.toString()} label="completed" color="green" />
              <Chip value={preview.sessions.total.toString()} label={`total (${PERIOD_OPTIONS.find(o => o.key === currentPeriod)?.label ?? currentPeriod})`} />
            </>
          }
          exportHref={`/api/reports/export?type=sessions&period=${currentPeriod}`}
          filename={`sessions-report-${today}.csv`}
        />

        {/* 4. Financial Summary */}
        <ReportCard
          title="Financial Summary"
          description="Revenue totals, outstanding amounts, and breakdown by client and service category."
          chips={
            <>
              <Chip value={fmtAUD(preview.financial.totalPaidCents)} label="paid (all time)" color="green" />
              <Chip
                value={fmtAUD(preview.financial.totalOutstandingCents)}
                label="outstanding"
                color={preview.financial.totalOutstandingCents > 0 ? 'amber' : 'gray'}
              />
              {preview.financial.overdueCount > 0 && (
                <Chip value={preview.financial.overdueCount.toString()} label="overdue" color="red" />
              )}
            </>
          }
          exportHref={`/api/reports/export?type=financial-summary&period=${currentPeriod}`}
          filename={`financial-summary-report-${today}.csv`}
        />

      </div>
    </div>
  )
}
