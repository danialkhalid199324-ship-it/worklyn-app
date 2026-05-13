'use client'

import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { EnterpriseData, HealthStatus, Period } from '@/lib/enterprise'

const PERIOD_LABELS: Record<Period, string> = {
  today: 'Today',
  this_week: 'This week',
  this_month: 'This month',
  last_month: 'Last month',
  last_3_months: 'Last 3 months',
  this_year: 'This year',
}

const ALL_PERIODS = Object.keys(PERIOD_LABELS) as Period[]

const fmtAUD = (cents: number) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(cents / 100)

const fmtHours = (minutes: number) => {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })

// ---------------------------------------------------------------------------
// Health status config
// ---------------------------------------------------------------------------

const HEALTH_CONFIG: Record<HealthStatus, { label: string; bg: string; text: string; dot: string; border: string }> = {
  healthy: {
    label: 'Healthy',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
    border: 'border-emerald-100',
  },
  watch: {
    label: 'Watch',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    dot: 'bg-amber-400',
    border: 'border-amber-100',
  },
  action_required: {
    label: 'Action Required',
    bg: 'bg-red-50',
    text: 'text-red-700',
    dot: 'bg-red-500',
    border: 'border-red-100',
  },
}

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-900 text-white">
        {icon}
      </div>
      <div>
        <h2 className="text-sm font-bold text-gray-900">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>
    </div>
  )
}

function Card({ children, className, id }: { children: React.ReactNode; className?: string; id?: string }) {
  return (
    <div id={id} className={cn('rounded-xl border border-gray-100 bg-white shadow-sm', className)}>
      {children}
    </div>
  )
}

function CardHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-50 px-5 py-3.5">
      {children}
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
        <svg className="h-5 w-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <p className="text-sm font-medium text-emerald-700">All clear</p>
      <p className="text-xs text-gray-400">{message}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Executive KPI cards
// ---------------------------------------------------------------------------

type KpiCardProps = {
  label: string
  value: string
  sub?: string
  iconBg: string
  iconColor: string
  icon: React.ReactNode
  active?: boolean
  activeBorder?: string
  href?: string
}

function KpiCard({ label, value, sub, iconBg, iconColor, icon, active, activeBorder, href }: KpiCardProps) {
  const cls = cn(
    'rounded-xl border bg-white p-4 shadow-sm transition-all duration-150',
    active && activeBorder ? activeBorder : 'border-gray-100',
    href && 'cursor-pointer hover:shadow-md hover:border-gray-200',
  )
  const inner = (
    <>
      <div className={cn('mb-3 flex h-8 w-8 items-center justify-center rounded-lg', iconBg)}>
        <span className={iconColor}>{icon}</span>
      </div>
      <p className={cn('text-xl font-bold tabular-nums leading-none', active ? 'text-gray-900' : 'text-gray-400')}>
        {value}
      </p>
      <p className="mt-1 text-[11px] font-medium text-gray-500 leading-tight">{label}</p>
      {sub && <p className={cn('mt-0.5 text-[10px] font-medium', active ? 'text-gray-500' : 'text-gray-300')}>{sub}</p>}
      {href && <p className="mt-2 text-[10px] font-semibold text-gray-300 group-hover:text-gray-400">View →</p>}
    </>
  )
  if (href) {
    return <a href={href} className={cn(cls, 'group block')}>{inner}</a>
  }
  return <div className={cls}>{inner}</div>
}

// ---------------------------------------------------------------------------
// Compliance row
// ---------------------------------------------------------------------------

function ComplianceRow({
  label, count, sub, href, dotColor,
}: {
  label: string; count: number; sub: string; href: string; dotColor: string
}) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-gray-50"
    >
      <span className={cn('h-2 w-2 shrink-0 rounded-full', count > 0 ? dotColor : 'bg-gray-200')} />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-gray-700 truncate">{label}</p>
        <p className={cn('text-[10px]', count > 0 ? 'text-gray-500' : 'text-gray-300')}>{sub}</p>
      </div>
      <span className={cn(
        'shrink-0 text-sm font-bold tabular-nums',
        count > 0 ? 'text-gray-900' : 'text-gray-300',
      )}>
        {count}
      </span>
    </a>
  )
}

// ---------------------------------------------------------------------------
// Client risk row
// ---------------------------------------------------------------------------

function ClientRow({ id, name, sub }: { id: string; name: string; sub?: string }) {
  return (
    <a
      href={`/dashboard/clients/${id}`}
      className="flex items-center gap-2.5 rounded-lg px-3 py-2 transition-colors hover:bg-gray-50"
    >
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[10px] font-bold uppercase text-gray-500">
        {name.split(' ').map(w => w[0]).slice(0, 2).join('')}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-gray-800 truncate">{name}</p>
        {sub && <p className="text-[10px] text-gray-400">{sub}</p>}
      </div>
      <svg className="h-3 w-3 shrink-0 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </a>
  )
}

// ---------------------------------------------------------------------------
// Stat block (for performance panel)
// ---------------------------------------------------------------------------

function StatBlock({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div className="rounded-lg bg-gray-50 p-3">
      <p className={cn('text-lg font-bold tabular-nums leading-none', color)}>{value}</p>
      <p className="mt-1 text-[10px] font-medium text-gray-400 leading-tight">{label}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function EnterpriseDashboard({
  data,
  currentPeriod,
}: {
  data: EnterpriseData
  currentPeriod: Period
}) {
  const router = useRouter()
  const { kpis, health, performance, compliance, clientRisk, automation, period } = data

  const totalHealthIssues = Object.values(health).filter(s => s === 'action_required').length
  const healthWatchCount = Object.values(health).filter(s => s === 'watch').length

  return (
    <div className="space-y-8">

      {/* ─── Header ─── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-900">
              <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h1 className="text-xl font-extrabold tracking-tight text-gray-900">Enterprise Command Centre</h1>
          </div>
          <p className="mt-1 text-sm text-gray-500 ml-10.5">
            Organisation-wide operational, compliance, workforce and financial intelligence.
          </p>
          <p className="mt-0.5 text-xs text-gray-400 ml-10.5">
            Period: <span className="font-medium text-gray-600">{period.label}</span>
            {totalHealthIssues > 0 && (
              <span className="ml-3 inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                {totalHealthIssues} area{totalHealthIssues !== 1 ? 's' : ''} need action
              </span>
            )}
            {totalHealthIssues === 0 && healthWatchCount > 0 && (
              <span className="ml-3 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-600">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                {healthWatchCount} area{healthWatchCount !== 1 ? 's' : ''} to watch
              </span>
            )}
            {totalHealthIssues === 0 && healthWatchCount === 0 && (
              <span className="ml-3 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                All systems healthy
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {ALL_PERIODS.map(p => (
            <button
              key={p}
              onClick={() => router.push(`/dashboard/enterprise?period=${p}`)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                currentPeriod === p
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
              )}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Executive KPI strip ─── */}
      <div>
        <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">
          Executive KPIs · {period.label}
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <KpiCard
            label="Revenue received"
            value={kpis.revenueInPeriodCents > 0 ? fmtAUD(kpis.revenueInPeriodCents) : '—'}
            sub={kpis.revenueInPeriodCents > 0 ? 'Paid invoices' : 'No paid invoices'}
            icon={<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            iconBg="bg-emerald-50" iconColor="text-emerald-600"
            active={kpis.revenueInPeriodCents > 0} activeBorder="border-emerald-100"
          />
          <KpiCard
            label="Outstanding"
            value={kpis.outstandingCents > 0 ? fmtAUD(kpis.outstandingCents) : '—'}
            sub="All-time unpaid"
            icon={<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
            iconBg="bg-amber-50" iconColor="text-amber-600"
            active={kpis.outstandingCents > 0} activeBorder="border-amber-100"
            href="/dashboard/invoices?filter=sent"
          />
          <KpiCard
            label="Overdue invoices"
            value={String(kpis.overdueCount)}
            sub={kpis.overdueCents > 0 ? fmtAUD(kpis.overdueCents) : 'None overdue'}
            icon={<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
            iconBg="bg-red-50" iconColor="text-red-500"
            active={kpis.overdueCount > 0} activeBorder="border-red-100"
            href="/dashboard/invoices?filter=overdue"
          />
          <KpiCard
            label="Compliance items"
            value={String(kpis.complianceOpenItems)}
            sub={kpis.complianceOpenItems > 0 ? 'Open items' : 'All clear'}
            icon={<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>}
            iconBg="bg-violet-50" iconColor="text-violet-600"
            active={kpis.complianceOpenItems > 0} activeBorder="border-violet-100"
            href="#compliance-section"
          />
          <KpiCard
            label="Sessions completed"
            value={String(kpis.completedSessions)}
            sub={`${kpis.completionRate}% completion rate`}
            icon={<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>}
            iconBg="bg-sky-50" iconColor="text-sky-600"
            active={kpis.completedSessions > 0} activeBorder="border-sky-100"
            href="/dashboard/sessions?filter=completed"
          />
          <KpiCard
            label="Remittance pending"
            value={String(kpis.remittancePending)}
            sub={kpis.remittancePending > 0 ? 'Awaiting confirmation' : 'All reconciled'}
            icon={<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>}
            iconBg="bg-blue-50" iconColor="text-blue-600"
            active={kpis.remittancePending > 0} activeBorder="border-blue-100"
            href="/dashboard/invoices?filter=paid"
          />
        </div>
      </div>

      {/* ─── Business Health ─── */}
      <div>
        <SectionHeader
          icon={<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>}
          title="Business Health"
          subtitle="Real-time health signals across four domains"
        />
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {([
            {
              domain: 'Financial Health',
              status: health.financial,
              desc: health.financial === 'healthy'
                ? 'No overdue invoices. Revenue collection on track.'
                : health.financial === 'watch'
                ? `${kpis.overdueCount} overdue invoice${kpis.overdueCount !== 1 ? 's' : ''} — follow up needed.`
                : `${kpis.overdueCount} overdue invoices. Immediate action required.`,
            },
            {
              domain: 'Compliance Health',
              status: health.compliance,
              desc: health.compliance === 'healthy'
                ? 'All case notes complete, sessions invoiced.'
                : health.compliance === 'watch'
                ? `${kpis.complianceOpenItems} compliance item${kpis.complianceOpenItems !== 1 ? 's' : ''} require attention.`
                : `${kpis.complianceOpenItems} open items need urgent resolution.`,
            },
            {
              domain: 'Workforce Health',
              status: health.workforce,
              desc: health.workforce === 'healthy'
                ? `${kpis.completionRate}% session completion rate. Excellent.`
                : health.workforce === 'watch'
                ? `${kpis.completionRate}% completion rate — below optimal.`
                : `${kpis.completionRate}% completion rate. Review scheduling.`,
            },
            {
              domain: 'Client Documentation',
              status: health.clientDoc,
              desc: health.clientDoc === 'healthy'
                ? 'All active clients have documents on file.'
                : health.clientDoc === 'watch'
                ? `${compliance.clientsWithoutDocs} client${compliance.clientsWithoutDocs !== 1 ? 's' : ''} missing documentation.`
                : `${compliance.clientsWithoutDocs} clients with no documents — urgent.`,
            },
          ] as const).map(({ domain, status, desc }) => {
            const cfg = HEALTH_CONFIG[status]
            return (
              <div key={domain} className={cn('rounded-xl border p-4', cfg.border, cfg.bg)}>
                <div className="mb-2 flex items-center gap-2">
                  <span className={cn('h-2 w-2 shrink-0 rounded-full', cfg.dot)} />
                  <p className="text-xs font-bold text-gray-800">{domain}</p>
                </div>
                <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold', cfg.bg, cfg.text)}>
                  {cfg.label}
                </span>
                <p className="mt-2 text-[11px] text-gray-600 leading-relaxed">{desc}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* ─── Practitioner Performance + Compliance Audit ─── */}
      <div className="grid gap-4 lg:grid-cols-2">

        {/* Practitioner Performance */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50">
                <svg className="h-3.5 w-3.5 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Practitioner Performance</h3>
                <p className="text-[10px] text-gray-400">{data.practitionerName} · {period.label}</p>
              </div>
            </div>
            <a href="/dashboard/sessions" className="text-[11px] font-semibold text-gray-600 hover:text-gray-900">
              Sessions →
            </a>
          </CardHeader>

          <div className="p-5">
            <div className="grid grid-cols-3 gap-3">
              <StatBlock
                value={String(performance.completed)}
                label="Sessions completed"
                color={performance.completed > 0 ? 'text-gray-900' : 'text-gray-400'}
              />
              <StatBlock
                value={performance.minutesDelivered > 0 ? fmtHours(performance.minutesDelivered) : '—'}
                label="Hours delivered"
                color={performance.minutesDelivered > 0 ? 'text-sky-700' : 'text-gray-400'}
              />
              <StatBlock
                value={performance.completed + performance.cancelled > 0 ? `${performance.completionRate}%` : '—'}
                label="Completion rate"
                color={
                  performance.completionRate >= 90 ? 'text-emerald-700'
                  : performance.completionRate >= 70 ? 'text-amber-700'
                  : 'text-red-600'
                }
              />
              <StatBlock
                value={String(performance.cancelled)}
                label="Cancelled"
                color={performance.cancelled > 0 ? 'text-amber-700' : 'text-gray-400'}
              />
              <StatBlock
                value={String(performance.missingNotes)}
                label="Missing notes"
                color={performance.missingNotes > 0 ? 'text-red-600' : 'text-gray-400'}
              />
              <StatBlock
                value={performance.revenueGeneratedCents > 0 ? fmtAUD(performance.revenueGeneratedCents) : '—'}
                label="Revenue generated"
                color={performance.revenueGeneratedCents > 0 ? 'text-emerald-700' : 'text-gray-400'}
              />
            </div>

            <p className="mt-4 text-[10px] text-gray-400 border-t border-gray-50 pt-3">
              Multi-practitioner performance comparison available when team members are added.
            </p>
          </div>
        </Card>

        {/* Compliance & Audit Centre */}
        <Card id="compliance-section">
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50">
                <svg className="h-3.5 w-3.5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Compliance & Audit Centre</h3>
                <p className="text-[10px] text-gray-400">Actionable items requiring attention</p>
              </div>
            </div>
            {kpis.complianceOpenItems > 0 && (
              <span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs font-bold text-violet-700">
                {kpis.complianceOpenItems}
              </span>
            )}
          </CardHeader>

          <div className="p-3">
            {kpis.complianceOpenItems === 0 ? (
              <EmptyState message="No compliance issues — keep it up." />
            ) : (
              <div className="space-y-0.5">
                <ComplianceRow
                  label="Missing case notes"
                  count={compliance.missingNotes}
                  sub={compliance.missingNotes > 0 ? 'Completed sessions without notes' : 'All notes complete'}
                  href="/dashboard/sessions?filter=completed"
                  dotColor="bg-amber-400"
                />
                <ComplianceRow
                  label="Sessions not invoiced"
                  count={compliance.uninvoicedSessions}
                  sub={compliance.uninvoicedSessions > 0 ? 'Completed but no invoice created' : 'All invoiced'}
                  href="/dashboard/sessions?filter=unbilled"
                  dotColor="bg-amber-400"
                />
                <ComplianceRow
                  label="Missing payment references"
                  count={compliance.missingPaymentRef}
                  sub={compliance.missingPaymentRef > 0 ? 'Paid invoices without reference' : 'All references recorded'}
                  href="/dashboard/invoices?filter=paid"
                  dotColor="bg-blue-400"
                />
                <ComplianceRow
                  label="Clients without documents"
                  count={compliance.clientsWithoutDocs}
                  sub={compliance.clientsWithoutDocs > 0 ? 'Active clients missing files' : 'All clients documented'}
                  href="/dashboard/clients"
                  dotColor="bg-amber-400"
                />
                <ComplianceRow
                  label="Remittance pending"
                  count={compliance.remittancePending}
                  sub={compliance.remittancePending > 0 ? 'Paid invoices awaiting remittance' : 'All remittances recorded'}
                  href="/dashboard/invoices?filter=paid"
                  dotColor="bg-blue-400"
                />
                <ComplianceRow
                  label="Overdue invoices"
                  count={compliance.overdueInvoices}
                  sub={compliance.overdueInvoices > 0 ? 'Past due date and unpaid' : 'No overdue invoices'}
                  href="/dashboard/invoices?filter=overdue"
                  dotColor="bg-red-500"
                />
              </div>
            )}
          </div>
        </Card>

      </div>

      {/* ─── Client Risk + Automation ─── */}
      <div className="grid gap-4 lg:grid-cols-2">

        {/* Client Risk */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50">
                <svg className="h-3.5 w-3.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-gray-900">Client Risk & Funding</h3>
            </div>
            <a href="/dashboard/clients" className="text-[11px] font-semibold text-gray-600 hover:text-gray-900">
              Clients →
            </a>
          </CardHeader>

          <div className="divide-y divide-gray-50">

            {/* Without docs */}
            <div className="px-4 py-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Without Documents</p>
                <span className={cn(
                  'text-xs font-bold tabular-nums',
                  clientRisk.withoutDocs.length > 0 ? 'text-amber-700' : 'text-gray-300',
                )}>
                  {clientRisk.withoutDocs.length}
                </span>
              </div>
              {clientRisk.withoutDocs.length === 0 ? (
                <p className="text-[11px] text-gray-400">All active clients have documents on file.</p>
              ) : (
                <div className="space-y-0.5">
                  {clientRisk.withoutDocs.slice(0, 4).map(c => (
                    <ClientRow key={c.id} id={c.id} name={c.name} sub="No documents uploaded" />
                  ))}
                  {clientRisk.withoutDocs.length > 4 && (
                    <p className="px-3 pt-1 text-[10px] text-gray-400">
                      + {clientRisk.withoutDocs.length - 4} more
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* With overdue invoices */}
            <div className="px-4 py-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Overdue Invoices</p>
                <span className={cn(
                  'text-xs font-bold tabular-nums',
                  clientRisk.withOverdueInvoices.length > 0 ? 'text-red-600' : 'text-gray-300',
                )}>
                  {clientRisk.withOverdueInvoices.length}
                </span>
              </div>
              {clientRisk.withOverdueInvoices.length === 0 ? (
                <p className="text-[11px] text-gray-400">No clients with overdue invoices.</p>
              ) : (
                <div className="space-y-0.5">
                  {clientRisk.withOverdueInvoices.slice(0, 4).map(c => (
                    <ClientRow key={c.id} id={c.id} name={c.name} sub={fmtAUD(c.totalCents) + ' overdue'} />
                  ))}
                  {clientRisk.withOverdueInvoices.length > 4 && (
                    <p className="px-3 pt-1 text-[10px] text-gray-400">
                      + {clientRisk.withOverdueInvoices.length - 4} more
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Funding expiring */}
            {clientRisk.fundingExpiringSoon.length > 0 && (
              <div className="px-4 py-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Funding Expiring (30 days)</p>
                  <span className="text-xs font-bold tabular-nums text-amber-700">
                    {clientRisk.fundingExpiringSoon.length}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {clientRisk.fundingExpiringSoon.slice(0, 4).map((f, i) => (
                    <a
                      key={i}
                      href={`/dashboard/clients/${f.clientId}`}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 transition-colors hover:bg-gray-50"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-gray-800 truncate">{f.planName}</p>
                      </div>
                      <span className={cn(
                        'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                        f.daysLeft <= 7 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700',
                      )}>
                        {f.daysLeft <= 0 ? 'Expired' : `${f.daysLeft}d left`}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Without upcoming sessions */}
            <div className="px-4 py-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">No Upcoming Sessions</p>
                <span className={cn(
                  'text-xs font-bold tabular-nums',
                  clientRisk.withoutUpcomingSessions.length > 0 ? 'text-gray-700' : 'text-gray-300',
                )}>
                  {clientRisk.withoutUpcomingSessions.length}
                </span>
              </div>
              {clientRisk.withoutUpcomingSessions.length === 0 ? (
                <p className="text-[11px] text-gray-400">All active clients have upcoming sessions.</p>
              ) : (
                <div className="space-y-0.5">
                  {clientRisk.withoutUpcomingSessions.slice(0, 3).map(c => (
                    <ClientRow key={c.id} id={c.id} name={c.name} sub="No scheduled sessions" />
                  ))}
                  {clientRisk.withoutUpcomingSessions.length > 3 && (
                    <p className="px-3 pt-1 text-[10px] text-gray-400">
                      + {clientRisk.withoutUpcomingSessions.length - 3} more
                    </p>
                  )}
                </div>
              )}
            </div>

          </div>
        </Card>

        {/* Automation Centre */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50">
                <svg className="h-3.5 w-3.5 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                    d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-gray-900">Automation Centre</h3>
            </div>
          </CardHeader>

          <div className="p-5 space-y-4">

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <StatBlock
                value={String(automation.sentInPeriod)}
                label="Reminders sent"
                color={automation.sentInPeriod > 0 ? 'text-brand-700' : 'text-gray-400'}
              />
              <StatBlock
                value={String(automation.failedTotal)}
                label="Failed notifications"
                color={automation.failedTotal > 0 ? 'text-red-600' : 'text-gray-400'}
              />
              <StatBlock
                value={automation.lastSentAt ? '✓' : '—'}
                label="Last run status"
                color={automation.lastSentAt ? 'text-emerald-700' : 'text-gray-400'}
              />
            </div>

            {automation.lastSentAt && (
              <div className="rounded-lg bg-gray-50 px-3 py-2">
                <p className="text-[10px] text-gray-500">
                  Last notification sent: <span className="font-semibold text-gray-700">{fmtDate(automation.lastSentAt)}</span>
                </p>
              </div>
            )}

            {automation.failedTotal > 0 && (
              <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2">
                <p className="text-xs font-semibold text-red-700">
                  {automation.failedTotal} failed notification{automation.failedTotal !== 1 ? 's' : ''} — check delivery logs
                </p>
                <p className="mt-0.5 text-[10px] text-red-500">
                  Verify RESEND_API_KEY and sender domain in Vercel environment settings.
                </p>
              </div>
            )}

            <div className="space-y-1 border-t border-gray-50 pt-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Configured Automations</p>
              {([
                { label: 'Session confirmation emails', status: 'active' as const },
                { label: '24h before session reminders', status: 'active' as const },
                { label: '2h before session reminders', status: 'active' as const },
                { label: 'Overdue invoice reminders', status: 'active' as const },
                { label: 'Document expiry reminders', status: 'soon' as const },
              ]).map(item => (
                <div key={item.label} className="flex items-center gap-2 py-1">
                  <span className={cn(
                    'h-1.5 w-1.5 shrink-0 rounded-full',
                    item.status === 'active' ? 'bg-emerald-400' : 'bg-gray-200',
                  )} />
                  <p className="flex-1 text-xs text-gray-600">{item.label}</p>
                  {item.status === 'soon' && (
                    <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[9px] font-semibold text-gray-400">
                      SOON
                    </span>
                  )}
                </div>
              ))}
            </div>

          </div>
        </Card>

      </div>

      {/* ─── Operational Insights ─── */}
      <div>
        <SectionHeader
          icon={<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
          title="Operational Insights"
          subtitle="Snapshot across key practice dimensions"
        />

        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
          <InsightCard
            title="Revenue this period"
            value={kpis.revenueInPeriodCents > 0 ? fmtAUD(kpis.revenueInPeriodCents) : 'No revenue'}
            detail={kpis.revenueInPeriodCents > 0 ? 'Paid invoices in range' : 'No paid invoices yet'}
            color={kpis.revenueInPeriodCents > 0 ? 'emerald' : 'gray'}
            href="/dashboard/reports"
          />
          <InsightCard
            title="Overdue risk"
            value={kpis.overdueCents > 0 ? fmtAUD(kpis.overdueCents) : 'None'}
            detail={kpis.overdueCount > 0 ? `${kpis.overdueCount} invoice${kpis.overdueCount !== 1 ? 's' : ''} overdue` : 'No overdue invoices'}
            color={kpis.overdueCount > 0 ? 'red' : 'gray'}
            href="/dashboard/invoices?filter=overdue"
          />
          <InsightCard
            title="Completion rate"
            value={performance.completed + performance.cancelled > 0 ? `${performance.completionRate}%` : '—'}
            detail={`${performance.completed} completed · ${performance.cancelled} cancelled`}
            color={performance.completionRate >= 90 ? 'emerald' : performance.completionRate >= 70 ? 'amber' : 'red'}
            href="/dashboard/sessions?filter=completed"
          />
          <InsightCard
            title="Missing documents"
            value={String(compliance.clientsWithoutDocs)}
            detail={compliance.clientsWithoutDocs > 0 ? 'Active clients without files' : 'All clients documented'}
            color={compliance.clientsWithoutDocs > 0 ? 'amber' : 'gray'}
            href="/dashboard/clients"
          />
          <InsightCard
            title="Remittance pipeline"
            value={String(kpis.remittancePending)}
            detail={kpis.remittancePending > 0 ? 'Paid invoices awaiting confirmation' : 'All remittances cleared'}
            color={kpis.remittancePending > 0 ? 'blue' : 'gray'}
            href="/dashboard/invoices?filter=paid"
          />
        </div>
      </div>

    </div>
  )
}

// ---------------------------------------------------------------------------
// Insight card
// ---------------------------------------------------------------------------

type InsightColor = 'emerald' | 'amber' | 'red' | 'blue' | 'gray'

const INSIGHT_COLORS: Record<InsightColor, { value: string; bg: string; border: string }> = {
  emerald: { value: 'text-emerald-700', bg: 'bg-emerald-50/60', border: 'border-emerald-100' },
  amber:   { value: 'text-amber-700',   bg: 'bg-amber-50/60',   border: 'border-amber-100'   },
  red:     { value: 'text-red-700',     bg: 'bg-red-50/60',     border: 'border-red-100'     },
  blue:    { value: 'text-blue-700',    bg: 'bg-blue-50/60',    border: 'border-blue-100'    },
  gray:    { value: 'text-gray-400',    bg: 'bg-white',         border: 'border-gray-100'    },
}

function InsightCard({
  title, value, detail, color, href,
}: {
  title: string; value: string; detail: string; color: InsightColor; href?: string
}) {
  const cfg = INSIGHT_COLORS[color]
  const cls = cn(
    'rounded-xl border p-4 shadow-sm transition-all duration-150',
    cfg.bg, cfg.border,
    href && 'cursor-pointer hover:shadow-md',
  )
  const inner = (
    <>
      <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">{title}</p>
      <p className={cn('mt-1 text-lg font-bold tabular-nums leading-none', cfg.value)}>{value}</p>
      <p className="mt-1.5 text-[10px] text-gray-500 leading-tight">{detail}</p>
      {href && <p className="mt-2 text-[10px] font-semibold text-gray-300">View →</p>}
    </>
  )
  if (href) {
    return <a href={href} className={cls}>{inner}</a>
  }
  return <div className={cls}>{inner}</div>
}
