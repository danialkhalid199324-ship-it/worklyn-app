import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { requireAuthWithPractitioner } from '@/lib/auth'
import { getClients, getServices, getNdisPriceGuide, getOrgSettings } from '@/lib/db'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getNextInvoiceNumber } from '@/app/actions/invoices'
import DashboardQuickActions from './DashboardQuickActions'

export const metadata: Metadata = { title: 'Dashboard' }

// Full precision for health panels
const fmtAUD = (cents: number) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(cents / 100)

// Compact for pills and featured metrics
const fmtShort = (cents: number) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(cents / 100)

function greet(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function daysUntil(dateStr: string): number {
  const target = new Date(`${dateStr}T00:00:00`)
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - d.getTime()) / 86400000)
}

export default async function DashboardPage() {
  const { practitioner } = await requireAuthWithPractitioner()
  const supabase = await createServerSupabaseClient()
  const pid = practitioner.id
  const firstName = practitioner.first_name

  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().slice(0, 10)

  const sevenOut = new Date(now); sevenOut.setDate(sevenOut.getDate() + 7)
  const sevenOutStr = sevenOut.toISOString().slice(0, 10)

  const thirtyOut = new Date(now); thirtyOut.setDate(thirtyOut.getDate() + 30)
  const thirtyOutStr = thirtyOut.toISOString().slice(0, 10)

  const ninetyAgo = new Date(now); ninetyAgo.setDate(ninetyAgo.getDate() - 90)
  const ninetyAgoStr = ninetyAgo.toISOString().slice(0, 10)

  const [
    todayRes,
    activeClientsRes,
    upcomingRes,
    outstandingAmtRes,
    revenueRes,
    overdueCountRes,
    draftCountRes,
    missingNotesRes,
    fundingRes,
    availabilityRes,
    servicesRes,
    sessionsExistRes,
    remittancePendingRes,
    uninvoicedRes,
    paidTodayRes,
    missingPaymentRefRes,
    completedThisMonthRes,
    cancelledThisMonthRes,
    clientDocsRes,
    activeClientIdsRes,
    modalClients,
    modalServices,
    orgSettings,
    nextInvoiceNumber,
  ] = await Promise.all([
    supabase.from('sessions')
      .select('id, service_date, start_time, end_time, status, client_id, clients(id, first_name, last_name), services(name)')
      .eq('practitioner_id', pid).eq('service_date', today).neq('status', 'cancelled')
      .order('start_time', { nullsFirst: false }),

    supabase.from('clients').select('id', { count: 'exact', head: true })
      .eq('practitioner_id', pid).eq('is_active', true),

    supabase.from('sessions')
      .select('id, service_date, start_time, end_time, status, client_id, clients(id, first_name, last_name), services(name)')
      .eq('practitioner_id', pid).eq('status', 'scheduled')
      .gte('service_date', tomorrowStr).lte('service_date', sevenOutStr)
      .order('service_date').order('start_time', { nullsFirst: false }).limit(8),

    supabase.from('invoices').select('total_cents, status')
      .eq('practitioner_id', pid).in('status', ['draft', 'sent', 'overdue']),

    supabase.from('invoices').select('total_cents')
      .eq('practitioner_id', pid).eq('status', 'paid').gte('paid_at', monthStart),

    supabase.from('invoices').select('id', { count: 'exact', head: true })
      .eq('practitioner_id', pid).eq('status', 'overdue'),

    supabase.from('invoices').select('id', { count: 'exact', head: true })
      .eq('practitioner_id', pid).eq('status', 'draft'),

    supabase.from('sessions').select('id', { count: 'exact', head: true })
      .eq('practitioner_id', pid).eq('status', 'completed')
      .is('notes', null).gte('service_date', ninetyAgoStr),

    supabase.from('client_funding_allocations')
      .select('id, plan_name, plan_end_date, remaining_amount, utilisation_percentage, client_id')
      .eq('practitioner_id', pid).eq('is_active', true)
      .order('plan_end_date'),

    supabase.from('availability_rules').select('id', { count: 'exact', head: true }).eq('practitioner_id', pid),
    supabase.from('services').select('id', { count: 'exact', head: true }).eq('practitioner_id', pid),
    supabase.from('sessions').select('id', { count: 'exact', head: true }).eq('practitioner_id', pid),

    supabase.from('invoices').select('id', { count: 'exact', head: true })
      .eq('practitioner_id', pid).eq('status', 'paid').is('remittance_received_at', null),

    supabase.from('sessions').select('id', { count: 'exact', head: true })
      .eq('practitioner_id', pid).eq('status', 'completed').is('invoice_id', null),

    supabase.from('invoices').select('total_cents')
      .eq('practitioner_id', pid).eq('status', 'paid').gte('paid_at', today),

    supabase.from('invoices').select('id', { count: 'exact', head: true })
      .eq('practitioner_id', pid).eq('status', 'paid').is('payment_reference', null),

    supabase.from('sessions').select('id', { count: 'exact', head: true })
      .eq('practitioner_id', pid).eq('status', 'completed').gte('service_date', monthStart),

    supabase.from('sessions').select('id', { count: 'exact', head: true })
      .eq('practitioner_id', pid).eq('status', 'cancelled').gte('service_date', monthStart),

    supabase.from('client_documents').select('client_id').eq('practitioner_id', pid),
    supabase.from('clients').select('id').eq('practitioner_id', pid).eq('is_active', true),

    getClients(pid),
    getServices(pid),
    getOrgSettings(pid),
    getNextInvoiceNumber(pid),
  ])

  const supportNums = Array.from(new Set(
    modalServices.map(s => s.support_item_number).filter((n): n is string => n !== null),
  ))
  const priceGuide = await getNdisPriceGuide(supportNums)

  // ---------------------------------------------------------------------------
  // Types
  // ---------------------------------------------------------------------------

  type SessionItem = {
    id: string; service_date: string; start_time: string | null; end_time: string | null
    status: string; client_id: string
    clients: { id: string; first_name: string; last_name: string } | null
    services: { name: string } | null
  }

  type FundingItem = {
    id: string; plan_name: string; plan_end_date: string
    remaining_amount: number; utilisation_percentage: number
    client_id: string
  }

  // ---------------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------------

  const todaySessions    = (todayRes.data ?? []) as unknown as SessionItem[]
  const upcomingSessions = (upcomingRes.data ?? []) as unknown as SessionItem[]
  const allActivePlans   = (fundingRes.data ?? []) as unknown as FundingItem[]

  const outstandingData  = (outstandingAmtRes.data ?? []) as { total_cents: number; status: string }[]
  const outstandingCents = outstandingData.reduce((s, r) => s + r.total_cents, 0)
  const overdueCents     = outstandingData.filter(r => r.status === 'overdue').reduce((s, r) => s + r.total_cents, 0)

  const revenueCents   = (revenueRes.data ?? []).reduce((s, r) => s + (r as { total_cents: number }).total_cents, 0)
  const paidTodayCents = (paidTodayRes.data ?? []).reduce((s, r) => s + (r as { total_cents: number }).total_cents, 0)

  const activeClients      = activeClientsRes.count ?? 0
  const overdueCount       = overdueCountRes.count ?? 0
  const draftCount         = draftCountRes.count ?? 0
  const missingNotesCount  = missingNotesRes.count ?? 0
  const remittancePending  = remittancePendingRes.count ?? 0
  const uninvoicedCount    = uninvoicedRes.count ?? 0
  const missingPaymentRef  = missingPaymentRefRes.count ?? 0
  const completedThisMonth = completedThisMonthRes.count ?? 0
  const cancelledThisMonth = cancelledThisMonthRes.count ?? 0

  const docClientIds = new Set(
    (clientDocsRes.data ?? []).map((r: { client_id: string }) => r.client_id),
  )
  const clientsMissingDocs = (activeClientIdsRes.data ?? []).filter(
    (c: { id: string }) => !docClientIds.has(c.id),
  ).length

  const fundingAlerts = allActivePlans.filter(
    p => Number(p.utilisation_percentage) >= 80 || p.plan_end_date <= thirtyOutStr,
  )
  const fundingExpiryCount = allActivePlans.filter(p => p.plan_end_date <= thirtyOutStr).length

  const completionRate = completedThisMonth + cancelledThisMonth > 0
    ? Math.round((completedThisMonth / (completedThisMonth + cancelledThisMonth)) * 100)
    : 100

  const totalBilledCents = revenueCents + outstandingCents
  const collectionRate   = totalBilledCents > 0 ? Math.round((revenueCents / totalBilledCents) * 100) : 0

  const hasAvailability = (availabilityRes.count ?? 0) > 0
  const hasService      = (servicesRes.count ?? 0) > 0
  const hasSession      = (sessionsExistRes.count ?? 0) > 0
  const checklistDone   = activeClients > 0 && hasAvailability && hasService && hasSession

  const actionItems = [
    { label: 'Complete missing case notes',   href: '/dashboard/sessions', count: missingNotesCount,  color: 'amber' as const },
    { label: 'Follow up overdue invoices',    href: '/dashboard/invoices', count: overdueCount,       color: 'red'   as const },
    { label: 'Review remittance pending',     href: '/dashboard/invoices', count: remittancePending,  color: 'blue'  as const },
    { label: 'Invoice completed sessions',    href: '/dashboard/sessions', count: uninvoicedCount,    color: 'blue'  as const },
    { label: 'Clients with expiring funding', href: '/dashboard/clients',  count: fundingExpiryCount, color: 'amber' as const },
    { label: 'Clients missing documents',     href: '/dashboard/clients',  count: clientsMissingDocs, color: 'amber' as const },
  ]
  const urgentCount = actionItems.filter(a => a.count > 0).length

  // First scheduled session at or after current time
  const nowTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const nextSessionId =
    todaySessions.find(s => s.status === 'scheduled' && (s.start_time ?? '99:99') >= nowTimeStr)?.id ??
    todaySessions.find(s => s.status === 'scheduled')?.id ??
    null

  const totalComplianceIssues = missingNotesCount + uninvoicedCount + missingPaymentRef + clientsMissingDocs

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const dateLabel = now.toLocaleDateString('en-AU', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div className="space-y-4">

      {/* ─── Header ─── */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">{dateLabel}</p>
        <h1 className="mt-0.5 text-[26px] font-extrabold tracking-tight text-gray-900">
          {greet()}, {firstName}
        </h1>
      </div>

      {/* ─── Alert bar: 4 metric cards ─── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <AlertCard
          icon={<WarningIcon />}
          iconBg="bg-red-50" iconColor="text-red-500"
          count={overdueCount}
          label="Overdue invoices"
          sub={overdueCount > 0 ? `${fmtShort(overdueCents)} overdue` : 'None overdue'}
          subColor={overdueCount > 0 ? 'text-red-500' : 'text-gray-400'}
          href="/dashboard/invoices"
          active={overdueCount > 0}
          activeBorder="border-red-100"
        />
        <AlertCard
          icon={<ClipboardIcon />}
          iconBg="bg-amber-50" iconColor="text-amber-500"
          count={missingNotesCount}
          label="Missing case notes"
          sub={missingNotesCount > 0 ? 'Action required' : 'All complete'}
          subColor={missingNotesCount > 0 ? 'text-amber-500' : 'text-gray-400'}
          href="/dashboard/sessions"
          active={missingNotesCount > 0}
          activeBorder="border-amber-100"
        />
        <AlertCard
          icon={<InboxIcon />}
          iconBg="bg-blue-50" iconColor="text-blue-500"
          count={remittancePending}
          label="Remittance pending"
          sub={remittancePending > 0 ? `${fmtShort(outstandingCents)} awaiting` : 'None pending'}
          subColor={remittancePending > 0 ? 'text-blue-500' : 'text-gray-400'}
          href="/dashboard/invoices"
          active={remittancePending > 0}
          activeBorder="border-blue-100"
        />
        <AlertCard
          icon={<ClockIcon />}
          iconBg="bg-violet-50" iconColor="text-violet-500"
          count={fundingExpiryCount}
          label="Funding expiring soon"
          sub={fundingAlerts.length > 0 ? `${daysUntil(fundingAlerts[0].plan_end_date)}d remaining` : 'None expiring'}
          subColor={fundingExpiryCount > 0 ? 'text-violet-500' : 'text-gray-400'}
          active={fundingExpiryCount > 0}
          activeBorder="border-violet-100"
        />
      </div>

      {/* ─── Command bar ─── */}
      <div className="rounded-2xl border border-gray-100 bg-white px-5 py-3.5 shadow">
        <DashboardQuickActions
          clients={modalClients}
          services={modalServices}
          priceGuide={priceGuide}
          nextInvoiceNumber={nextInvoiceNumber}
          orgSettings={orgSettings}
        />
      </div>

      {/* ─── Main grid: Schedule | Urgent Actions | Financial ─── */}
      <div className="grid gap-4 lg:grid-cols-3">

        {/* Today's Schedule */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-50 px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50">
                <svg className="h-3.5 w-3.5 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-sm font-bold text-gray-900">Today&apos;s Schedule</h2>
              {todaySessions.length > 0 && (
                <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-600">{todaySessions.length}</span>
              )}
            </div>
            <a href="/dashboard/calendar" className="text-[11px] font-semibold text-brand-600 hover:underline">View calendar</a>
          </div>

          <div className="px-4 py-3">
            {todaySessions.length === 0 ? (
              <div className="flex flex-col items-center py-5 text-center">
                <p className="text-sm text-gray-400">No sessions scheduled today.</p>
                <a href="/dashboard/calendar" className="mt-2 text-xs font-medium text-brand-600 hover:underline">Open calendar →</a>
              </div>
            ) : (
              <ul className="space-y-1.5">
                {todaySessions.map(s => {
                  const name     = s.clients ? `${s.clients.first_name} ${s.clients.last_name}` : 'Unknown client'
                  const initials = s.clients ? `${s.clients.first_name[0]}${s.clients.last_name[0]}` : '?'
                  const isNext   = s.id === nextSessionId

                  const borderColor = { scheduled: 'border-l-blue-400', completed: 'border-l-emerald-500', cancelled: 'border-l-red-400' }[s.status] ?? 'border-l-gray-200'
                  const dotColor    = { scheduled: 'bg-blue-400', completed: 'bg-emerald-500', cancelled: 'bg-red-400' }[s.status] ?? 'bg-gray-300'

                  return (
                    <li key={s.id}>
                      <a
                        href={`/dashboard/clients/${s.client_id}`}
                        className={`group flex items-center gap-2.5 rounded-lg border-l-[3px] px-3 py-2 transition-colors ${borderColor} ${isNext ? 'ring-1 ring-brand-200 bg-brand-50/50 hover:bg-brand-50' : 'bg-gray-50 hover:bg-gray-100'}`}
                      >
                        {/* Time */}
                        <div className="w-9 shrink-0 text-right">
                          {s.start_time ? (
                            <>
                              <span className="block text-[11px] font-bold tabular-nums text-gray-700 leading-none">{s.start_time.slice(0, 5)}</span>
                              {s.end_time && <span className="mt-0.5 block text-[10px] tabular-nums text-gray-400 leading-none">{s.end_time.slice(0, 5)}</span>}
                            </>
                          ) : <span className="text-xs text-gray-300">—</span>}
                        </div>
                        {/* Avatar */}
                        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold uppercase ${isNext ? 'bg-brand-100 text-brand-700' : 'bg-white text-gray-600 shadow-sm'}`}>
                          {initials}
                        </div>
                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          <p className={`text-xs font-semibold truncate ${isNext ? 'text-brand-800' : 'text-gray-900'}`}>{name}</p>
                          {s.services?.name && <p className="text-[10px] text-gray-400 truncate">{s.services.name}</p>}
                        </div>
                        {isNext && <span className="shrink-0 rounded-full bg-brand-600 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">Next</span>}
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotColor}`} />
                      </a>
                    </li>
                  )
                })}
              </ul>
            )}

            {/* Coming up */}
            {upcomingSessions.length > 0 && (
              <>
                <div className="my-2.5 flex items-center gap-2">
                  <p className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-gray-400">Coming up</p>
                  <div className="flex-1 border-t border-gray-100" />
                </div>
                <ul className="space-y-0.5">
                  {upcomingSessions.slice(0, 5).map(s => {
                    const name    = s.clients ? `${s.clients.first_name} ${s.clients.last_name}` : 'Unknown client'
                    const dateLbl = s.service_date === tomorrowStr
                      ? 'Tomorrow'
                      : new Date(`${s.service_date}T12:00:00`).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
                    return (
                      <li key={s.id}>
                        <a href={`/dashboard/clients/${s.client_id}`} className="flex items-center gap-2 rounded px-1.5 py-1 hover:bg-gray-50 transition-colors -mx-1.5">
                          <span className="w-16 shrink-0 text-[10px] font-medium text-gray-400">{dateLbl}</span>
                          <p className="min-w-0 flex-1 text-[11px] font-medium text-gray-700 truncate">{name}</p>
                          {s.start_time && <span className="shrink-0 text-[10px] tabular-nums text-gray-400">{s.start_time.slice(0, 5)}</span>}
                        </a>
                      </li>
                    )
                  })}
                  {upcomingSessions.length > 5 && (
                    <li className="px-1.5 py-1 text-[10px] text-gray-400">+ {upcomingSessions.length - 5} more this week</li>
                  )}
                </ul>
              </>
            )}

            {todaySessions.length === 0 && upcomingSessions.length === 0 && (
              <p className="py-1 text-center text-[11px] text-gray-400">No upcoming sessions this week.</p>
            )}
          </div>
        </div>

        {/* Urgent Actions */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-50 px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50">
                <svg className="h-3.5 w-3.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-sm font-bold text-gray-900">Urgent Actions</h2>
              {urgentCount > 0 && (
                <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-bold text-red-600">{urgentCount}</span>
              )}
            </div>
            <a href="/dashboard/sessions" className="text-[11px] font-semibold text-brand-600 hover:underline">View all tasks</a>
          </div>
          <ul className="divide-y divide-gray-50">
            {actionItems.map(a => {
              const dotCls = a.count > 0
                ? { red: 'bg-red-500', amber: 'bg-amber-400', blue: 'bg-blue-400' }[a.color]
                : 'bg-gray-200'
              const cntCls = a.count > 0
                ? { red: 'text-red-600 font-bold', amber: 'text-amber-600 font-bold', blue: 'text-blue-600 font-bold' }[a.color]
                : 'text-gray-300 font-medium'
              return (
                <li key={a.label}>
                  <a href={a.href} className="flex items-center gap-3 px-5 py-2.5 hover:bg-gray-50 transition-colors group">
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotCls}`} />
                    <span className="flex-1 text-xs text-gray-700 group-hover:text-gray-900 truncate">{a.label}</span>
                    <span className={`shrink-0 text-xs tabular-nums ${cntCls}`}>{a.count}</span>
                  </a>
                </li>
              )
            })}
          </ul>
          {urgentCount === 0 && (
            <div className="border-t border-gray-50 px-5 py-3 text-center">
              <p className="text-xs font-medium text-emerald-600">All actions clear</p>
            </div>
          )}
        </div>

        {/* Financial Health */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-50 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <span className="h-4 w-1 rounded-full bg-emerald-500" />
              <h2 className="text-xs font-bold uppercase tracking-wide text-gray-700">Financial Health</h2>
            </div>
            <a href="/dashboard/invoices" className="text-[11px] font-semibold text-brand-600 hover:underline">Invoices →</a>
          </div>

          <div className="border-b border-gray-50 bg-gradient-to-br from-emerald-50/60 to-white px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Revenue this month</p>
            <p className={`mt-1 text-2xl font-bold tabular-nums ${revenueCents > 0 ? 'text-emerald-700' : 'text-gray-400'}`}>
              {revenueCents > 0 ? fmtShort(revenueCents) : '—'}
            </p>
            {totalBilledCents > 0 && (
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-400">{collectionRate}% collected</span>
                  <span className="text-[10px] text-gray-400">{fmtShort(totalBilledCents)} billed</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${collectionRate}%` }} />
                </div>
              </div>
            )}
          </div>

          <dl className="divide-y divide-gray-50 px-5">
            <HealthRow label="Outstanding" value={outstandingCents > 0 ? fmtShort(outstandingCents) : 'All clear'} status={outstandingCents > 0 ? 'warn' : 'good'} />
            <HealthRow label="Overdue" value={overdueCount > 0 ? `${overdueCount} · ${fmtShort(overdueCents)}` : 'None'} status={overdueCount > 0 ? 'bad' : 'good'} />
            <HealthRow label="Paid today" value={paidTodayCents > 0 ? fmtShort(paidTodayCents) : '—'} status={paidTodayCents > 0 ? 'good' : 'neutral'} />
          </dl>
        </div>

      </div>

      {/* ─── Secondary grid: Operational | Compliance | Funding / Getting Started ─── */}
      <div className="grid gap-4 lg:grid-cols-3">

        {/* Operational Health */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-50 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <span className="h-4 w-1 rounded-full bg-brand-500" />
              <h2 className="text-xs font-bold uppercase tracking-wide text-gray-700">Operational Health</h2>
            </div>
            <a href="/dashboard/sessions" className="text-[11px] font-semibold text-brand-600 hover:underline">Sessions →</a>
          </div>

          <div className="border-b border-gray-50 bg-gradient-to-br from-sky-50/50 to-white px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Completion rate</p>
            <p className={`mt-1 text-2xl font-bold tabular-nums ${completionRate >= 80 ? 'text-brand-700' : completionRate >= 60 ? 'text-amber-700' : 'text-red-600'}`}>
              {completedThisMonth + cancelledThisMonth > 0 ? `${completionRate}%` : '—'}
            </p>
            {completedThisMonth + cancelledThisMonth > 0 && (
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-400">{completedThisMonth} completed</span>
                  <span className="text-[10px] text-gray-400">{cancelledThisMonth} cancelled</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={`h-full rounded-full transition-all ${completionRate >= 80 ? 'bg-brand-500' : completionRate >= 60 ? 'bg-amber-400' : 'bg-red-400'}`}
                    style={{ width: `${completionRate}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <dl className="divide-y divide-gray-50 px-5">
            <HealthRow label="Completed sessions" value={completedThisMonth > 0 ? `${completedThisMonth} this month` : 'None yet'} status={completedThisMonth > 0 ? 'good' : 'neutral'} />
            <HealthRow label="Cancelled" value={cancelledThisMonth > 0 ? `${cancelledThisMonth} this month` : 'None'} status={cancelledThisMonth > 0 ? 'warn' : 'good'} />
            <HealthRow label="Draft invoices" value={draftCount > 0 ? `${draftCount} unsent` : 'All sent'} status={draftCount > 0 ? 'warn' : 'good'} />
          </dl>
        </div>

        {/* Compliance Health */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-50 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <span className="h-4 w-1 rounded-full bg-violet-500" />
              <h2 className="text-xs font-bold uppercase tracking-wide text-gray-700">Compliance Health</h2>
            </div>
            <a href="/dashboard/reports" className="text-[11px] font-semibold text-brand-600 hover:underline">Reports →</a>
          </div>

          <div className="border-b border-gray-50 bg-gradient-to-br from-violet-50/50 to-white px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Open items</p>
            <p className={`mt-1 text-2xl font-bold tabular-nums ${totalComplianceIssues === 0 ? 'text-emerald-700' : 'text-violet-700'}`}>
              {totalComplianceIssues === 0 ? 'All clear' : totalComplianceIssues}
            </p>
            <p className="mt-0.5 text-[10px] text-gray-400">
              {totalComplianceIssues === 0 ? 'No compliance issues' : `item${totalComplianceIssues !== 1 ? 's' : ''} need attention`}
            </p>
          </div>

          <dl className="divide-y divide-gray-50 px-5">
            <HealthRow label="Missing notes" value={missingNotesCount > 0 ? `${missingNotesCount} session${missingNotesCount !== 1 ? 's' : ''}` : 'All complete'} status={missingNotesCount > 0 ? 'warn' : 'good'} />
            <HealthRow label="Uninvoiced sessions" value={uninvoicedCount > 0 ? `${uninvoicedCount} session${uninvoicedCount !== 1 ? 's' : ''}` : 'All invoiced'} status={uninvoicedCount > 0 ? 'warn' : 'good'} />
            <HealthRow label="Missing payment refs" value={missingPaymentRef > 0 ? `${missingPaymentRef} invoice${missingPaymentRef !== 1 ? 's' : ''}` : 'All complete'} status={missingPaymentRef > 0 ? 'warn' : 'good'} />
            <HealthRow label="Clients without docs" value={clientsMissingDocs > 0 ? `${clientsMissingDocs} client${clientsMissingDocs !== 1 ? 's' : ''}` : 'All documented'} status={clientsMissingDocs > 0 ? 'warn' : 'good'} />
          </dl>
        </div>

        {/* Funding Alerts — or Getting Started if no alerts and onboarding incomplete */}
        {fundingAlerts.length > 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-white shadow overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-50 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <span className="h-4 w-1 rounded-full bg-amber-400" />
                <h2 className="text-xs font-bold uppercase tracking-wide text-gray-700">Funding Alerts</h2>
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700">{fundingAlerts.length}</span>
              </div>
              <a href="/dashboard/clients" className="text-[11px] font-semibold text-brand-600 hover:underline">Clients →</a>
            </div>
            <ul className="divide-y divide-gray-50">
              {fundingAlerts.slice(0, 6).map(p => {
                const days     = daysUntil(p.plan_end_date)
                const pct      = Math.min(Math.round(Number(p.utilisation_percentage)), 100)
                const isExpiry = p.plan_end_date <= thirtyOutStr
                const barColor = pct >= 90 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-400' : 'bg-brand-500'
                const pctColor = pct >= 90 ? 'text-red-600' : pct >= 80 ? 'text-amber-600' : 'text-gray-600'
                return (
                  <li key={p.id}>
                    <a href={`/dashboard/clients/${p.client_id}`} className="flex items-center gap-3 px-5 py-2.5 hover:bg-gray-50 transition-colors">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-gray-900 truncate">{p.plan_name}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-100">
                            <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className={`text-[10px] font-semibold tabular-nums ${pctColor}`}>{pct}%</span>
                        </div>
                      </div>
                      {isExpiry && (
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${days <= 7 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                          {days <= 0 ? 'Expired' : `${days}d`}
                        </span>
                      )}
                    </a>
                  </li>
                )
              })}
            </ul>
          </div>
        ) : !checklistDone ? (
          <div className="rounded-2xl border border-gray-100 bg-white px-5 py-5 shadow">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wide text-gray-700">Getting started</h2>
              <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-600">
                {[activeClients > 0, hasAvailability, hasService, hasSession].filter(Boolean).length} / 4
              </span>
            </div>
            <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-brand-600 transition-all"
                style={{ width: `${([activeClients > 0, hasAvailability, hasService, hasSession].filter(Boolean).length / 4) * 100}%` }}
              />
            </div>
            <ul className="space-y-2.5">
              {[
                { done: activeClients > 0, label: 'Add your first client',      href: '/dashboard/clients' },
                { done: hasAvailability,   label: 'Set your availability',       href: '/dashboard/availability' },
                { done: hasService,        label: 'Configure a service',         href: '/dashboard/services' },
                { done: hasSession,        label: 'Schedule your first session', href: '/dashboard/calendar' },
              ].map(item => (
                <li key={item.label} className="flex items-center gap-3">
                  <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${item.done ? 'border-emerald-500 bg-emerald-500' : 'border-gray-200'}`}>
                    {item.done && (
                      <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <a
                    href={item.href}
                    className={`text-xs transition-colors ${item.done ? 'text-gray-400 line-through pointer-events-none' : 'text-gray-700 hover:text-brand-600 hover:underline'}`}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

      </div>

    </div>
  )
}

// ---------------------------------------------------------------------------
// AlertCard
// ---------------------------------------------------------------------------

function AlertCard({
  icon, iconBg, iconColor, count, label, sub, subColor, href, active, activeBorder,
}: {
  icon: ReactNode; iconBg: string; iconColor: string
  count: number; label: string; sub: string; subColor: string
  href?: string; active: boolean; activeBorder: string
}) {
  const inner = (
    <div className={`rounded-xl border bg-white p-4 shadow-sm transition-shadow hover:shadow ${active ? activeBorder : 'border-gray-100'}`}>
      <div className="flex items-start gap-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
          <span className={iconColor}>{icon}</span>
        </div>
        <div className="min-w-0">
          <p className={`text-2xl font-bold tabular-nums leading-none ${active ? 'text-gray-900' : 'text-gray-400'}`}>{count}</p>
          <p className="mt-0.5 text-xs font-medium text-gray-600 truncate">{label}</p>
          <p className={`mt-0.5 text-[11px] font-medium ${subColor}`}>{sub}</p>
        </div>
      </div>
    </div>
  )
  return href ? <a href={href}>{inner}</a> : inner
}

// ---------------------------------------------------------------------------
// HealthRow
// ---------------------------------------------------------------------------

function HealthRow({ label, value, status }: { label: string; value: string; status: 'good' | 'warn' | 'bad' | 'neutral' }) {
  const dot = { good: 'bg-emerald-400', warn: 'bg-amber-400', bad: 'bg-red-500', neutral: 'bg-gray-300' }[status]
  const val = { good: 'text-emerald-700', warn: 'text-amber-700', bad: 'text-red-600', neutral: 'text-gray-400' }[status]
  return (
    <div className="flex items-center gap-2 py-2">
      <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
      <dt className="min-w-0 flex-1 text-xs text-gray-400 truncate">{label}</dt>
      <dd className={`shrink-0 text-xs font-semibold tabular-nums ${val}`}>{value}</dd>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function WarningIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  )
}

function ClipboardIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  )
}

function InboxIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}
