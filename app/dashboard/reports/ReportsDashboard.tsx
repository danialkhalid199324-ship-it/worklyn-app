'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import type { CommandCentreData, AllReportData, Period } from '@/lib/reports'
import { RevenueModal, SessionsModal, ClientsModal, InvoicesModal } from './ReportModals'

// ─── Formatters ────────────────────────────────────────────────────────────────

const fmtAUD = (cents: number) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(cents / 100)

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })

// ─── Period options ────────────────────────────────────────────────────────────

const PERIOD_OPTIONS: { key: Period; label: string }[] = [
  { key: 'today',         label: 'Today'        },
  { key: 'this_week',     label: 'This week'    },
  { key: 'this_month',    label: 'This month'   },
  { key: 'last_month',    label: 'Last month'   },
  { key: 'last_3_months', label: 'Last 3 months'},
  { key: 'this_year',     label: 'This year'    },
]

type ActiveModal = 'revenue' | 'sessions' | 'clients' | 'invoices' | null

// ─── SVG icon set ──────────────────────────────────────────────────────────────

const Icon = {
  dollar: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  warn: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  check: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  clipboard: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  ),
  calendar: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  inbox: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
    </svg>
  ),
  users: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  chart: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  shield: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  document: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  download: (
    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  ),
  eye: (
    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ),
}

// ─── Layout primitives ─────────────────────────────────────────────────────────

function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-gray-100 bg-white p-5 shadow-sm ${className ?? ''}`}>
      {children}
    </div>
  )
}

function SectionGroup({
  icon, iconBg, title, description, children,
}: {
  icon: ReactNode; iconBg: string; title: string; description: string; children: ReactNode
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconBg} text-white`}>
          {icon}
        </div>
        <div>
          <h2 className="text-sm font-bold text-gray-900">{title}</h2>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
      </div>
      {children}
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return <p className="py-4 text-center text-sm text-gray-400">{text}</p>
}

// ─── Insight card (top KPI strip) ──────────────────────────────────────────────

function InsightCard({
  icon, iconBg, iconColor, label, value, sub, valueColor, href,
}: {
  icon: ReactNode; iconBg: string; iconColor: string
  label: string; value: string; sub?: string; valueColor?: string; href?: string
}) {
  const inner = (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-shadow hover:shadow">
      <div className="flex items-start gap-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
          <span className={iconColor}>{icon}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-medium leading-none text-gray-500">{label}</p>
          <p className={`mt-1 text-xl font-bold tabular-nums leading-none ${valueColor ?? 'text-gray-900'}`}>{value}</p>
          {sub && <p className="mt-1 text-[11px] text-gray-400">{sub}</p>}
        </div>
      </div>
    </div>
  )
  return href ? <a href={href}>{inner}</a> : inner
}

// ─── Report card ───────────────────────────────────────────────────────────────

function ReportCard({
  icon, iconBg, iconColor,
  title, description,
  metric, metricSub, metricColor,
  onPreview,
  exportHref, exportFilename,
}: {
  icon: ReactNode; iconBg: string; iconColor: string
  title: string; description: string
  metric: string; metricSub: string; metricColor?: string
  onPreview?: () => void
  exportHref: string; exportFilename: string
}) {
  return (
    <div className="flex flex-col rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition-shadow hover:shadow">
      <div className="mb-3 flex items-center gap-2.5">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
          <span className={iconColor}>{icon}</span>
        </div>
        <p className="text-sm font-semibold leading-tight text-gray-800">{title}</p>
      </div>
      <p className="mb-4 flex-1 text-xs leading-relaxed text-gray-500">{description}</p>
      <div className="mb-4">
        <p className={`text-2xl font-bold tabular-nums ${metricColor ?? 'text-gray-900'}`}>{metric}</p>
        <p className="mt-0.5 text-[11px] text-gray-400">{metricSub}</p>
      </div>
      <div className="flex items-center gap-2 border-t border-gray-50 pt-3">
        {onPreview && (
          <button
            onClick={onPreview}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100"
          >
            {Icon.eye}
            Preview
          </button>
        )}
        <a
          href={exportHref}
          download={exportFilename}
          className={`flex items-center justify-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-100 ${onPreview ? 'flex-1' : 'w-full'}`}
        >
          {Icon.download}
          Export CSV
        </a>
      </div>
    </div>
  )
}

// ─── Ageing row ────────────────────────────────────────────────────────────────

type KpiColor = 'default' | 'green' | 'amber' | 'red' | 'blue'

function AgeingRow({ label, count, cents, color }: {
  label: string; count: number; cents: number; color: KpiColor
}) {
  const dot: Record<KpiColor, string>  = { default: 'bg-gray-200', green: 'bg-emerald-400', amber: 'bg-amber-400',  red: 'bg-red-500',  blue: 'bg-blue-400'  }
  const txt: Record<KpiColor, string>  = { default: 'text-gray-600', green: 'text-emerald-700', amber: 'text-amber-700', red: 'text-red-700', blue: 'text-blue-700' }
  return (
    <div className={`flex items-center justify-between rounded-lg px-3 py-2.5 ${count > 0 ? 'bg-gray-50' : ''}`}>
      <div className="flex items-center gap-2.5">
        <div className={`h-2 w-2 rounded-full ${count > 0 ? dot[color] : 'bg-gray-200'}`} />
        <span className={`text-sm ${count > 0 ? txt[color] : 'text-gray-400'}`}>{label}</span>
      </div>
      {count > 0 ? (
        <div className="flex items-center gap-3">
          <span className={`text-xs font-medium ${txt[color]}`}>{count} inv{count !== 1 ? 's' : ''}</span>
          <span className={`text-sm font-semibold tabular-nums ${txt[color]}`}>{fmtAUD(cents)}</span>
        </div>
      ) : (
        <span className="text-xs text-gray-300">All clear</span>
      )}
    </div>
  )
}

// ─── Compliance badge ──────────────────────────────────────────────────────────

function ComplianceBadge({ label, count, description, severity }: {
  label: string; count: number; description: string; severity: 'ok' | 'warn' | 'error'
}) {
  const s = {
    ok:    { bg: 'bg-emerald-50', border: 'border-emerald-100', dot: 'bg-emerald-400', num: 'text-emerald-700', lbl: 'text-emerald-700' },
    warn:  { bg: 'bg-amber-50',   border: 'border-amber-100',   dot: 'bg-amber-400',   num: 'text-amber-700',   lbl: 'text-amber-700'   },
    error: { bg: 'bg-red-50',     border: 'border-red-100',     dot: 'bg-red-500',     num: 'text-red-700',     lbl: 'text-red-700'     },
  }[severity]

  return (
    <div className={`rounded-xl border p-4 ${s.bg} ${s.border}`}>
      <div className="mb-1.5 flex items-center gap-2">
        <div className={`h-2 w-2 rounded-full ${s.dot}`} />
        <span className={`text-[10px] font-bold uppercase tracking-wider ${s.lbl}`}>{label}</span>
      </div>
      <p className={`text-3xl font-bold tabular-nums leading-none ${s.num}`}>{count}</p>
      <p className="mt-1.5 text-xs leading-snug text-gray-500">{description}</p>
    </div>
  )
}

// ─── All-clear row ─────────────────────────────────────────────────────────────

function AllClear({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 py-3">
      <div className="h-2 w-2 rounded-full bg-emerald-400" />
      <span className="text-sm font-medium text-emerald-600">{text}</span>
    </div>
  )
}

// ─── Main dashboard ────────────────────────────────────────────────────────────

export default function ReportsDashboard({
  data,
  reportData,
  currentPeriod,
}: {
  data: CommandCentreData
  reportData: AllReportData
  currentPeriod: Period
}) {
  const router = useRouter()
  const [modal, setModal] = useState<ActiveModal>(null)
  const today = new Date().toISOString().slice(0, 10)
  const { kpis, finance, operations, compliance, period } = data

  const totalComplianceItems =
    compliance.missingNotes + compliance.uninvoiced + compliance.missingPaymentRef + compliance.clientsMissingDocs

  // SessionsModal expects SessionsReportData shape (byService without hours is fine)
  const sessionsData = reportData.sessions

  return (
    <div className="space-y-10">

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Reports</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Operational, financial and compliance reporting for {period.label.toLowerCase()}.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PERIOD_OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => router.push(`/dashboard/reports?period=${opt.key}`)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
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

      {/* ── Operational Insights strip ──────────────────────────────────────── */}
      <div>
        <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">
          Operational insights · {period.label}
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <InsightCard
            icon={Icon.dollar} iconBg="bg-emerald-100" iconColor="text-emerald-600"
            label="Revenue received" value={fmtAUD(kpis.revenueReceivedCents)}
            sub="paid this period" valueColor="text-emerald-700"
            href="/dashboard/invoices"
          />
          <InsightCard
            icon={Icon.warn}
            iconBg={kpis.outstandingCents > 0 ? 'bg-amber-100' : 'bg-gray-100'}
            iconColor={kpis.outstandingCents > 0 ? 'text-amber-600' : 'text-gray-400'}
            label="Outstanding" value={fmtAUD(kpis.outstandingCents)}
            sub="sent + overdue"
            valueColor={kpis.outstandingCents > 0 ? 'text-amber-700' : 'text-gray-900'}
            href="/dashboard/invoices"
          />
          <InsightCard
            icon={Icon.warn}
            iconBg={kpis.overdueCount > 0 ? 'bg-red-100' : 'bg-emerald-100'}
            iconColor={kpis.overdueCount > 0 ? 'text-red-600' : 'text-emerald-600'}
            label="Overdue invoices" value={kpis.overdueCount.toString()}
            sub={kpis.overdueCents > 0 ? fmtAUD(kpis.overdueCents) : 'none overdue'}
            valueColor={kpis.overdueCount > 0 ? 'text-red-700' : 'text-emerald-700'}
            href="/dashboard/invoices"
          />
          <InsightCard
            icon={Icon.calendar}
            iconBg={operations.completed > 0 ? 'bg-blue-100' : 'bg-gray-100'}
            iconColor={operations.completed > 0 ? 'text-blue-600' : 'text-gray-400'}
            label="Sessions completed" value={operations.completed.toString()}
            sub={`${operations.completionRate}% completion rate`}
            valueColor={operations.completed > 0 ? 'text-blue-700' : 'text-gray-900'}
            href="/dashboard/sessions"
          />
          <InsightCard
            icon={Icon.clipboard}
            iconBg={kpis.uninvoicedCompleted > 0 ? 'bg-amber-100' : 'bg-emerald-100'}
            iconColor={kpis.uninvoicedCompleted > 0 ? 'text-amber-600' : 'text-emerald-600'}
            label="Uninvoiced sessions" value={kpis.uninvoicedCompleted.toString()}
            sub="completed, no invoice"
            valueColor={kpis.uninvoicedCompleted > 0 ? 'text-amber-700' : 'text-emerald-700'}
            href="/dashboard/sessions"
          />
          <InsightCard
            icon={Icon.inbox}
            iconBg={finance.remittancePendingCount > 0 ? 'bg-blue-100' : 'bg-gray-100'}
            iconColor={finance.remittancePendingCount > 0 ? 'text-blue-600' : 'text-gray-400'}
            label="Remittance pending" value={finance.remittancePendingCount.toString()}
            sub={finance.remittancePendingCount > 0 ? fmtAUD(finance.remittancePendingCents) : 'all received'}
            valueColor={finance.remittancePendingCount > 0 ? 'text-blue-700' : 'text-gray-900'}
            href="/dashboard/invoices"
          />
        </div>
      </div>

      {/* ── FINANCIAL REPORTS ────────────────────────────────────────────────── */}
      <SectionGroup
        icon={Icon.dollar}
        iconBg="bg-emerald-700"
        title="Financial Reports"
        description="Revenue, invoicing and payment reporting"
      >
        {/* Report cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ReportCard
            icon={Icon.chart} iconBg="bg-emerald-100" iconColor="text-emerald-600"
            title="Revenue Summary"
            description="Paid revenue, outstanding amounts, revenue by service and top clients for the selected period."
            metric={fmtAUD(kpis.revenueReceivedCents)}
            metricSub={`paid in ${period.label}`}
            metricColor="text-emerald-700"
            onPreview={() => setModal('revenue')}
            exportHref={`/api/reports/export?type=financial-summary&period=${currentPeriod}`}
            exportFilename={`financial-summary-${today}.csv`}
          />
          <ReportCard
            icon={Icon.document} iconBg="bg-blue-100" iconColor="text-blue-600"
            title="Invoice Status"
            description="Current invoice portfolio: draft, sent, paid and overdue counts with total outstanding amount."
            metric={fmtAUD(finance.outstandingCents)}
            metricSub="total outstanding"
            metricColor={finance.outstandingCents > 0 ? 'text-amber-700' : 'text-gray-900'}
            onPreview={() => setModal('invoices')}
            exportHref={`/api/reports/export?type=overdue-invoices`}
            exportFilename={`overdue-invoices-${today}.csv`}
          />
          <ReportCard
            icon={Icon.warn}
            iconBg={finance.overdueCents > 0 ? 'bg-red-100' : 'bg-emerald-100'}
            iconColor={finance.overdueCents > 0 ? 'text-red-600' : 'text-emerald-600'}
            title="Overdue & Ageing"
            description="Aged receivables broken down by overdue bucket. Export includes recipient contact details."
            metric={fmtAUD(finance.overdueCents)}
            metricSub={`${kpis.overdueCount} overdue invoice${kpis.overdueCount !== 1 ? 's' : ''}`}
            metricColor={finance.overdueCents > 0 ? 'text-red-700' : 'text-emerald-700'}
            exportHref="/api/reports/export?type=overdue-invoices"
            exportFilename={`overdue-invoices-${today}.csv`}
          />
        </div>

        {/* Live data: ageing + revenue by client */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel>
            <p className="mb-3 text-sm font-semibold text-gray-800">Invoice ageing</p>
            <div className="space-y-1">
              <AgeingRow label="0–7 days overdue"   count={finance.ageing.d0_7}    cents={finance.ageingCents.d0_7}    color="amber" />
              <AgeingRow label="8–14 days overdue"  count={finance.ageing.d8_14}   cents={finance.ageingCents.d8_14}   color="amber" />
              <AgeingRow label="15–30 days overdue" count={finance.ageing.d15_30}  cents={finance.ageingCents.d15_30}  color="red"   />
              <AgeingRow label="30+ days overdue"   count={finance.ageing.d30plus} cents={finance.ageingCents.d30plus} color="red"   />
            </div>
            {finance.overdueCents === 0 && (
              <p className="mt-3 text-center text-xs font-medium text-emerald-600">No overdue invoices — all clear</p>
            )}
          </Panel>
          <Panel>
            <p className="mb-3 text-sm font-semibold text-gray-800">Revenue by client (all time)</p>
            {finance.revenueByClient.length === 0 ? (
              <EmptyState text="No paid invoices recorded yet." />
            ) : (
              <div>
                {finance.revenueByClient.slice(0, 8).map((c, i) => (
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
      </SectionGroup>

      {/* ── OPERATIONAL REPORTS ──────────────────────────────────────────────── */}
      <SectionGroup
        icon={Icon.calendar}
        iconBg="bg-blue-700"
        title="Operational Reports"
        description="Session delivery, utilisation and service breakdown"
      >
        {/* Report cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ReportCard
            icon={Icon.calendar} iconBg="bg-blue-100" iconColor="text-blue-600"
            title="Sessions Report"
            description="Session counts by status and service type with completion rate analysis for the period."
            metric={operations.completed.toString()}
            metricSub={`completed · ${operations.completionRate}% rate`}
            metricColor={operations.completed > 0 ? 'text-blue-700' : 'text-gray-900'}
            onPreview={() => setModal('sessions')}
            exportHref={`/api/reports/export?type=sessions&period=${currentPeriod}`}
            exportFilename={`sessions-${today}.csv`}
          />
          <ReportCard
            icon={Icon.chart} iconBg="bg-purple-100" iconColor="text-purple-600"
            title="Practitioner Utilisation"
            description="Hours delivered, throughput and completion rate. Includes per-service revenue for paid sessions."
            metric={`${operations.hoursDelivered}h`}
            metricSub="hours delivered this period"
            metricColor="text-purple-700"
            exportHref={`/api/reports/export?type=practitioner-utilisation&period=${currentPeriod}`}
            exportFilename={`practitioner-utilisation-${today}.csv`}
          />
          <ReportCard
            icon={Icon.users} iconBg="bg-indigo-100" iconColor="text-indigo-600"
            title="Service Breakdown"
            description="Session counts, completion rates and hours delivered broken down by service type."
            metric={operations.byService.length.toString()}
            metricSub="service types this period"
            exportHref={`/api/reports/export?type=sessions&period=${currentPeriod}`}
            exportFilename={`sessions-${today}.csv`}
          />
        </div>

        {/* Live data: sessions by service table */}
        <Panel>
          <p className="mb-3 text-sm font-semibold text-gray-800">Sessions by service type · {period.label}</p>
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
                        <td className="py-2.5 text-right tabular-nums text-gray-700">{s.total}</td>
                        <td className="py-2.5 text-right tabular-nums">
                          <span className={s.completed > 0 ? 'font-medium text-emerald-600' : 'text-gray-400'}>{s.completed}</span>
                        </td>
                        <td className="py-2.5 text-right tabular-nums">
                          <span className={rate >= 80 ? 'text-emerald-600' : rate > 0 ? 'text-amber-600' : 'text-gray-400'}>
                            {s.total > 0 ? `${rate}%` : '—'}
                          </span>
                        </td>
                        <td className="py-2.5 text-right tabular-nums text-gray-700">{s.hours > 0 ? s.hours : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </SectionGroup>

      {/* ── COMPLIANCE & AUDIT ───────────────────────────────────────────────── */}
      <SectionGroup
        icon={Icon.shield}
        iconBg="bg-orange-700"
        title="Compliance & Audit"
        description="Exception reporting and audit items requiring attention"
      >
        {/* Report card + badge grid */}
        <div className="grid gap-4 lg:grid-cols-3">
          <ReportCard
            icon={Icon.shield} iconBg="bg-orange-100" iconColor="text-orange-600"
            title="Compliance Exceptions"
            description="Full audit report: missing case notes, uninvoiced sessions, overdue invoices and clients with no documents."
            metric={totalComplianceItems.toString()}
            metricSub="total exception items"
            metricColor={totalComplianceItems > 0 ? 'text-orange-700' : 'text-emerald-700'}
            exportHref="/api/reports/export?type=compliance-exceptions"
            exportFilename={`compliance-exceptions-${today}.csv`}
          />
          <div className="grid grid-cols-2 gap-3 lg:col-span-2 content-start">
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
        </div>

        {/* Live data: overdue list + remittance */}
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
              <AllClear text="No overdue invoices — all clear" />
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
                        <td className="max-w-[120px] truncate py-2.5 text-gray-600">{inv.clientName}</td>
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
              <AllClear text="All remittance received — all clear" />
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
                        <td className="max-w-[120px] truncate py-2.5 text-gray-600">{inv.clientName}</td>
                        <td className="py-2.5 text-right text-xs tabular-nums text-gray-500">
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
      </SectionGroup>

      {/* ── CLIENT REPORTS ───────────────────────────────────────────────────── */}
      <SectionGroup
        icon={Icon.users}
        iconBg="bg-violet-700"
        title="Client Reports"
        description="Client portfolio, revenue attribution and document compliance"
      >
        {/* Report cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ReportCard
            icon={Icon.users} iconBg="bg-violet-100" iconColor="text-violet-600"
            title="Client List"
            description="Full client register with NDIS numbers, funding types, plan managers and contact information."
            metric={reportData.clients.totalActive.toString()}
            metricSub="active clients"
            metricColor="text-violet-700"
            onPreview={() => setModal('clients')}
            exportHref="/api/reports/export?type=clients"
            exportFilename={`clients-${today}.csv`}
          />
          <ReportCard
            icon={Icon.dollar} iconBg="bg-teal-100" iconColor="text-teal-600"
            title="Revenue by Client"
            description="Clients ranked by total paid revenue all time, plus outstanding invoice amounts per client."
            metric={reportData.clients.topByRevenue.length.toString()}
            metricSub="clients with paid revenue"
            metricColor="text-teal-700"
            onPreview={() => setModal('clients')}
            exportHref={`/api/reports/export?type=financial-summary&period=${currentPeriod}`}
            exportFilename={`financial-summary-${today}.csv`}
          />
          <ReportCard
            icon={Icon.warn}
            iconBg={reportData.clients.withOutstanding.length > 0 ? 'bg-amber-100' : 'bg-emerald-100'}
            iconColor={reportData.clients.withOutstanding.length > 0 ? 'text-amber-600' : 'text-emerald-600'}
            title="Outstanding by Client"
            description="Clients with unpaid or overdue invoices. Export includes full invoice details for follow-up."
            metric={reportData.clients.withOutstanding.length.toString()}
            metricSub="clients with outstanding invoices"
            metricColor={reportData.clients.withOutstanding.length > 0 ? 'text-amber-700' : 'text-emerald-700'}
            onPreview={() => setModal('clients')}
            exportHref="/api/reports/export?type=overdue-invoices"
            exportFilename={`overdue-invoices-${today}.csv`}
          />
        </div>

        {/* Live data: top clients table */}
        {finance.revenueByClient.length > 0 && (
          <Panel>
            <p className="mb-3 text-sm font-semibold text-gray-800">Top clients by revenue (all time)</p>
            <div className="grid grid-cols-1 gap-0 sm:grid-cols-2 lg:grid-cols-3">
              {finance.revenueByClient.slice(0, 9).map((c, i) => (
                <div key={i} className="flex items-center gap-3 border-b border-gray-50 py-2.5 last:border-0">
                  <span className="w-5 shrink-0 text-xs font-medium text-gray-300">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-sm text-gray-700">{c.name}</span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-gray-900">{fmtAUD(c.cents)}</span>
                </div>
              ))}
            </div>
          </Panel>
        )}
      </SectionGroup>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      {modal === 'revenue' && (
        <RevenueModal
          data={reportData.revenue}
          periodLabel={period.label}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'sessions' && (
        <SessionsModal
          data={sessionsData}
          periodLabel={period.label}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'clients' && (
        <ClientsModal
          data={reportData.clients}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'invoices' && (
        <InvoicesModal
          data={reportData.invoices}
          onClose={() => setModal(null)}
        />
      )}

    </div>
  )
}
