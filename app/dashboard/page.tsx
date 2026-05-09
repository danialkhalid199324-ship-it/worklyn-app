import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { requireAuth } from '@/lib/auth'
import { getPractitionerByUserId, getClients, getServices, getNdisPriceGuide, getOrgSettings } from '@/lib/db'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getNextInvoiceNumber } from '@/app/actions/invoices'
import DashboardQuickActions from './DashboardQuickActions'

export const metadata: Metadata = { title: 'Dashboard' }

const fmtAUD = (cents: number) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(cents / 100)

function statusColor(status: string): 'gray' | 'green' | 'amber' | 'red' | 'blue' | 'purple' {
  switch (status) {
    case 'paid':      return 'green'
    case 'overdue':   return 'red'
    case 'sent':      return 'blue'
    case 'draft':     return 'gray'
    case 'scheduled': return 'blue'
    case 'completed': return 'green'
    case 'cancelled': return 'red'
    default:          return 'gray'
  }
}

function formatUpcomingDate(dateStr: string, tomorrowStr: string): string {
  if (dateStr === tomorrowStr) return 'Tomorrow'
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('en-AU', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
}

function daysUntil(dateStr: string): number {
  const target = new Date(`${dateStr}T00:00:00`)
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - d.getTime()) / 86400000)
}

export default async function DashboardPage() {
  const user = await requireAuth()
  const practitioner = await getPractitionerByUserId(user.id)
  const supabase = await createServerSupabaseClient()
  const pid = practitioner.id

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
    outstandingListRes,
    revenueRes,
    overdueCountRes,
    draftCountRes,
    missingNotesRes,
    fundingRes,
    availabilityRes,
    servicesRes,
    sessionsExistRes,
    modalClients,
    modalServices,
    orgSettings,
    nextInvoiceNumber,
  ] = await Promise.all([
    // Today's sessions (list, all non-cancelled)
    supabase.from('sessions')
      .select('id, service_date, start_time, end_time, status, client_id, clients(id, first_name, last_name), services(name)')
      .eq('practitioner_id', pid).eq('service_date', today).neq('status', 'cancelled')
      .order('start_time', { nullsFirst: false }),

    // Active client count
    supabase.from('clients').select('id', { count: 'exact', head: true })
      .eq('practitioner_id', pid).eq('is_active', true),

    // Upcoming sessions (tomorrow → +7 days, scheduled only)
    supabase.from('sessions')
      .select('id, service_date, start_time, end_time, status, client_id, clients(id, first_name, last_name), services(name)')
      .eq('practitioner_id', pid).eq('status', 'scheduled')
      .gte('service_date', tomorrowStr).lte('service_date', sevenOutStr)
      .order('service_date').order('start_time', { nullsFirst: false }).limit(8),

    // Outstanding invoice amounts + status (for totals and breakdown counts)
    supabase.from('invoices').select('total_cents, status')
      .eq('practitioner_id', pid).in('status', ['draft', 'sent', 'overdue']),

    // Outstanding invoices list for display
    supabase.from('invoices')
      .select('id, invoice_number, total_cents, status, due_at, clients(id, first_name, last_name)')
      .eq('practitioner_id', pid).in('status', ['draft', 'sent', 'overdue'])
      .order('created_at', { ascending: false }).limit(8),

    // Revenue this month
    supabase.from('invoices').select('total_cents')
      .eq('practitioner_id', pid).eq('status', 'paid').gte('paid_at', monthStart),

    // Overdue invoice count
    supabase.from('invoices').select('id', { count: 'exact', head: true })
      .eq('practitioner_id', pid).eq('status', 'overdue'),

    // Draft invoice count
    supabase.from('invoices').select('id', { count: 'exact', head: true })
      .eq('practitioner_id', pid).eq('status', 'draft'),

    // Completed sessions missing notes (last 90 days)
    supabase.from('sessions').select('id', { count: 'exact', head: true })
      .eq('practitioner_id', pid).eq('status', 'completed')
      .is('notes', null).gte('service_date', ninetyAgoStr),

    // Active funding allocations for alerts
    supabase.from('client_funding_allocations')
      .select('id, plan_name, plan_end_date, allocated_amount, remaining_amount, utilisation_percentage, client_id, clients(id, first_name, last_name)')
      .eq('practitioner_id', pid).eq('is_active', true)
      .order('plan_end_date'),

    // Checklist
    supabase.from('availability_rules').select('id', { count: 'exact', head: true }).eq('practitioner_id', pid),
    supabase.from('services').select('id', { count: 'exact', head: true }).eq('practitioner_id', pid),
    supabase.from('sessions').select('id', { count: 'exact', head: true }).eq('practitioner_id', pid),

    // Quick-action modal data
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

  type InvoiceItem = {
    id: string; invoice_number: string; total_cents: number; status: string; due_at: string | null
    clients: { id: string; first_name: string; last_name: string } | null
  }

  type FundingItem = {
    id: string; plan_name: string; plan_end_date: string
    allocated_amount: number; remaining_amount: number; utilisation_percentage: number
    client_id: string
    clients: { id: string; first_name: string; last_name: string } | null
  }

  // ---------------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------------

  const todaySessions   = (todayRes.data ?? []) as unknown as SessionItem[]
  const upcomingSessions = (upcomingRes.data ?? []) as unknown as SessionItem[]

  const outstandingData  = (outstandingAmtRes.data ?? []) as { total_cents: number; status: string }[]
  const pendingCents     = outstandingData.reduce((s, r) => s + r.total_cents, 0)
  const sentCount        = outstandingData.filter(r => r.status === 'sent').length
  const revenueCents     = (revenueRes.data ?? []).reduce((s, r) => s + (r as { total_cents: number }).total_cents, 0)
  const revenuePaidCount = (revenueRes.data ?? []).length

  const activeClients    = activeClientsRes.count ?? 0
  const overdueCount     = overdueCountRes.count ?? 0
  const draftCount       = draftCountRes.count ?? 0
  const missingNotesCount = missingNotesRes.count ?? 0

  const statusPriority: Record<string, number> = { overdue: 0, sent: 1, draft: 2 }
  const outstandingInvoices = ((outstandingListRes.data ?? []) as unknown as InvoiceItem[])
    .sort((a, b) => (statusPriority[a.status] ?? 3) - (statusPriority[b.status] ?? 3))

  const allActivePlans = (fundingRes.data ?? []) as unknown as FundingItem[]
  const fundingAlerts  = allActivePlans
    .filter(p => Number(p.utilisation_percentage) >= 80 || p.plan_end_date <= thirtyOutStr)
    .slice(0, 5)

  const clientsWithFunding   = new Set(allActivePlans.map(p => p.client_id)).size
  const clientsMissingFunding = Math.max(0, activeClients - clientsWithFunding)

  const hasAttention = overdueCount > 0 || missingNotesCount > 0 || draftCount > 0 || fundingAlerts.length > 0 || clientsMissingFunding > 0

  const hasClient       = activeClients > 0
  const hasAvailability = (availabilityRes.count ?? 0) > 0
  const hasService      = (servicesRes.count ?? 0) > 0
  const hasSession      = (sessionsExistRes.count ?? 0) > 0
  const checklistDone   = hasClient && hasAvailability && hasService && hasSession

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
            {now.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900">
            Overview
          </h1>
        </div>
        <DashboardQuickActions
          clients={modalClients}
          services={modalServices}
          priceGuide={priceGuide}
          nextInvoiceNumber={nextInvoiceNumber}
          orgSettings={orgSettings}
        />
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<CalIcon />}
          bg="bg-brand-50"
          label="Today's sessions"
          value={todaySessions.length.toString()}
          valueColor="text-brand-700"
          sub={
            overdueCount > 0
              ? <span className="font-medium text-red-500">{overdueCount} overdue invoice{overdueCount !== 1 ? 's' : ''}</span>
              : <span>{todaySessions.length === 0 ? 'No sessions today' : `${todaySessions.length} session${todaySessions.length !== 1 ? 's' : ''}`}</span>
          }
        />
        <StatCard
          icon={<PeopleIcon />}
          bg="bg-green-50"
          label="Active clients"
          value={activeClients.toString()}
          valueColor="text-green-700"
          sub={<span>{activeClients === 0 ? 'No clients yet' : `${activeClients} active`}</span>}
        />
        <StatCard
          icon={<InvIcon />}
          bg="bg-amber-50"
          label="Pending invoices"
          value={pendingCents > 0 ? fmtAUD(pendingCents) : '$0'}
          valueColor={pendingCents > 0 ? 'text-amber-700' : 'text-gray-400'}
          sub={
            pendingCents === 0
              ? <span className="font-medium text-green-600">All clear</span>
              : <span>
                  {[
                    overdueCount > 0 && `${overdueCount} overdue`,
                    sentCount > 0 && `${sentCount} sent`,
                    draftCount > 0 && `${draftCount} draft`,
                  ].filter(Boolean).join(' · ')}
                </span>
          }
        />
        <StatCard
          icon={<RevIcon />}
          bg="bg-purple-50"
          label="Revenue this month"
          value={revenueCents > 0 ? fmtAUD(revenueCents) : '$0'}
          valueColor={revenueCents > 0 ? 'text-purple-700' : 'text-gray-400'}
          sub={<span>{revenueCents === 0 ? 'No paid invoices yet' : `${revenuePaidCount} paid invoice${revenuePaidCount !== 1 ? 's' : ''}`}</span>}
        />
      </div>

      {/* Main grid: today's schedule + action required */}
      <div className="grid gap-5 lg:grid-cols-3">

        {/* Today + coming up */}
        <Card className="lg:col-span-2" padding="md">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Today</h2>
            <a href="/dashboard/calendar" className="text-xs font-medium text-brand-600 hover:underline">Calendar →</a>
          </div>

          {todaySessions.length === 0 ? (
            <p className="text-sm text-gray-400 pb-2">No sessions scheduled for today.</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {todaySessions.map(s => {
                const name = s.clients ? `${s.clients.first_name} ${s.clients.last_name}` : 'Unknown client'
                const time = s.start_time
                  ? s.end_time
                    ? `${s.start_time.slice(0, 5)}–${s.end_time.slice(0, 5)}`
                    : s.start_time.slice(0, 5)
                  : null
                const initials = s.clients
                  ? `${s.clients.first_name[0]}${s.clients.last_name[0]}`
                  : '?'
                return (
                  <li key={s.id} className="flex items-center gap-3 py-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-600 uppercase">
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <a href={`/dashboard/clients/${s.client_id}`} className="text-sm font-medium text-gray-900 hover:text-brand-600 truncate block">
                        {name}
                      </a>
                      <p className="text-xs text-gray-400 truncate">
                        {[time, s.services?.name].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <Badge color={statusColor(s.status)}>{s.status}</Badge>
                  </li>
                )
              })}
            </ul>
          )}

          {upcomingSessions.length > 0 && (
            <>
              <div className="mt-5 mb-3 flex items-center gap-3">
                <p className="shrink-0 text-xs font-semibold uppercase tracking-widest text-gray-400">Coming up</p>
                <div className="flex-1 border-t border-gray-100" />
              </div>
              <ul className="divide-y divide-gray-50">
                {upcomingSessions.map(s => {
                  const name = s.clients ? `${s.clients.first_name} ${s.clients.last_name}` : 'Unknown client'
                  const dateLabel = formatUpcomingDate(s.service_date, tomorrowStr)
                  const time = s.start_time ? s.start_time.slice(0, 5) : null
                  return (
                    <li key={s.id} className="flex items-center gap-3 py-2.5">
                      <span className="w-20 shrink-0 text-xs font-medium text-gray-400">{dateLabel}</span>
                      <div className="min-w-0 flex-1">
                        <a href={`/dashboard/clients/${s.client_id}`} className="text-sm font-medium text-gray-900 hover:text-brand-600 truncate block">
                          {name}
                        </a>
                        {s.services?.name && (
                          <p className="text-xs text-gray-400 truncate">{s.services.name}</p>
                        )}
                      </div>
                      {time && <span className="shrink-0 text-xs tabular-nums font-medium text-gray-500">{time}</span>}
                    </li>
                  )
                })}
              </ul>
            </>
          )}

          {todaySessions.length === 0 && upcomingSessions.length === 0 && (
            <EmptyState
              title="No sessions scheduled this week"
              description="Schedule sessions from the calendar."
              action={{ label: 'Open calendar', href: '/dashboard/calendar' }}
            />
          )}
        </Card>

        {/* Action required */}
        <Card padding="md">
          <h2 className="mb-4 font-semibold text-gray-900">Action required</h2>
          {!hasAttention ? (
            <div className="flex flex-col items-center py-6 text-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-green-50">
                <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="mt-3 text-sm font-semibold text-gray-700">All clear</p>
              <p className="mt-1 text-xs text-gray-400">Your operations are in order.</p>
            </div>
          ) : (
            <ul className="space-y-1">
              {overdueCount > 0 && (
                <ActionItem
                  href="/dashboard/invoices"
                  dot="bg-red-500"
                  textColor="text-red-600"
                  label={`${overdueCount} overdue invoice${overdueCount !== 1 ? 's' : ''}`}
                  sub="Requires immediate action"
                />
              )}
              {missingNotesCount > 0 && (
                <ActionItem
                  href="/dashboard/sessions"
                  dot="bg-amber-400"
                  textColor="text-amber-700"
                  label={`${missingNotesCount} session${missingNotesCount !== 1 ? 's' : ''} missing notes`}
                  sub="Complete session documentation"
                />
              )}
              {draftCount > 0 && (
                <ActionItem
                  href="/dashboard/invoices"
                  dot="bg-blue-400"
                  textColor="text-blue-600"
                  label={`${draftCount} draft invoice${draftCount !== 1 ? 's' : ''} unsent`}
                  sub="Send to participants or plan managers when ready"
                />
              )}
              {clientsMissingFunding > 0 && (
                <ActionItem
                  href="/dashboard/clients"
                  dot="bg-amber-400"
                  textColor="text-amber-700"
                  label={`${clientsMissingFunding} client${clientsMissingFunding !== 1 ? 's' : ''} missing funding setup`}
                  sub="Funding tracking incomplete"
                />
              )}
              {fundingAlerts.map(p => {
                const clientName = p.clients
                  ? `${p.clients.first_name} ${p.clients.last_name}`
                  : 'Client'
                const days = daysUntil(p.plan_end_date)
                const isExpiring = p.plan_end_date <= thirtyOutStr
                const sub = isExpiring
                  ? `Expires in ${days} day${days !== 1 ? 's' : ''}`
                  : `${Math.round(Number(p.utilisation_percentage))}% utilised`
                return (
                  <ActionItem
                    key={p.id}
                    href={`/dashboard/clients/${p.client_id}`}
                    dot="bg-amber-400"
                    textColor="text-amber-700"
                    label={`${clientName} — ${p.plan_name}`}
                    sub={sub}
                  />
                )
              })}
            </ul>
          )}
        </Card>
      </div>

      {/* Secondary grid: outstanding invoices + funding alerts */}
      <div className="grid gap-5 lg:grid-cols-2">

        {/* Outstanding invoices */}
        <Card padding="md">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Outstanding invoices</h2>
            {outstandingInvoices.length === 0
              ? <Badge color="green">All paid</Badge>
              : <a href="/dashboard/invoices" className="text-xs font-medium text-brand-600 hover:underline">View all →</a>
            }
          </div>
          {outstandingInvoices.length === 0 ? (
            <EmptyState title="No outstanding invoices" description="Create an invoice after your next session." />
          ) : (
            <ul className="divide-y divide-gray-50">
              {outstandingInvoices.map(inv => {
                const clientName = inv.clients
                  ? `${inv.clients.first_name} ${inv.clients.last_name}`
                  : 'Unknown client'
                const isOverdue = inv.status === 'overdue'
                return (
                  <li key={inv.id}>
                    <a
                      href={`/dashboard/invoices/${inv.id}`}
                      className="flex items-center gap-3 py-2.5 hover:bg-gray-50 -mx-6 px-6 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{clientName}</p>
                        <p className="text-xs text-gray-400">
                          {inv.invoice_number}
                          {inv.due_at && ` · Due ${new Date(`${inv.due_at}T12:00:00`).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}`}
                        </p>
                      </div>
                      <Badge color={statusColor(inv.status)}>{inv.status}</Badge>
                      <span className={`shrink-0 text-sm font-semibold tabular-nums ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                        {fmtAUD(inv.total_cents)}
                      </span>
                    </a>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        {/* Funding alerts */}
        <Card padding="md">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Funding alerts</h2>
            {activeClients > 0 && clientsMissingFunding === 0 && fundingAlerts.length === 0 && (
              <Badge color="green">All plans within budget</Badge>
            )}
          </div>
          {activeClients === 0 ? (
            <EmptyState
              title="No active funding plans"
              description="Add funding plans via client profiles."
            />
          ) : clientsMissingFunding > 0 ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-amber-800">
                      {clientsMissingFunding} client{clientsMissingFunding !== 1 ? 's' : ''} missing funding setup
                    </p>
                    <p className="mt-0.5 text-xs text-amber-600">
                      {clientsWithFunding} of {activeClients} client{activeClients !== 1 ? 's' : ''} have funding configured.
                    </p>
                  </div>
                  <a href="/dashboard/clients" className="shrink-0 text-xs font-semibold text-amber-700 hover:underline">
                    Set up →
                  </a>
                </div>
              </div>
              {fundingAlerts.length > 0 && (
                <ul className="space-y-2.5">
                  {fundingAlerts.map(p => (
                    <FundingPlanRow key={p.id} p={p} thirtyOutStr={thirtyOutStr} />
                  ))}
                </ul>
              )}
            </div>
          ) : fundingAlerts.length > 0 ? (
            <ul className="space-y-2.5">
              {fundingAlerts.map(p => (
                <FundingPlanRow key={p.id} p={p} thirtyOutStr={thirtyOutStr} />
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center py-6 text-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-green-50">
                <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="mt-3 text-sm font-semibold text-gray-700">All plans within budget</p>
              <p className="mt-1 text-xs text-gray-400">
                {allActivePlans.length} active plan{allActivePlans.length !== 1 ? 's' : ''} tracked.
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* Getting started — hidden once all setup steps are done */}
      {!checklistDone && (
        <Card padding="md">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Getting started</h2>
            <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-600">
              {[hasClient, hasAvailability, hasService, hasSession].filter(Boolean).length} / 4 complete
            </span>
          </div>

          {/* Progress bar */}
          <div className="mb-5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-brand-600 transition-all"
              style={{ width: `${([hasClient, hasAvailability, hasService, hasSession].filter(Boolean).length / 4) * 100}%` }}
            />
          </div>

          <ul className="space-y-3">
            {[
              { done: hasClient,       label: 'Add your first client',      href: '/dashboard/clients' },
              { done: hasAvailability, label: 'Set your availability',       href: '/dashboard/availability' },
              { done: hasService,      label: 'Configure a service',         href: '/dashboard/services' },
              { done: hasSession,      label: 'Schedule your first session', href: '/dashboard/calendar' },
            ].map(item => (
              <li key={item.label} className="flex items-center gap-3">
                <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${item.done ? 'border-green-500 bg-green-500' : 'border-gray-300'}`}>
                  {item.done && (
                    <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <a
                  href={item.href}
                  className={`text-sm transition-colors ${item.done ? 'text-gray-400 line-through pointer-events-none' : 'text-gray-700 hover:text-brand-600 hover:underline'}`}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Shared sub-component for funding plan rows (deduplicates two identical blocks)
// ---------------------------------------------------------------------------

function FundingPlanRow({
  p,
  thirtyOutStr,
}: {
  p: {
    id: string; plan_name: string; plan_end_date: string
    remaining_amount: number; utilisation_percentage: number
    client_id: string
    clients: { id: string; first_name: string; last_name: string } | null
  }
  thirtyOutStr: string
}) {
  const clientName = p.clients
    ? `${p.clients.first_name} ${p.clients.last_name}`
    : 'Unknown client'
  const pct = Math.min(Math.round(Number(p.utilisation_percentage)), 100)
  const days = daysUntil(p.plan_end_date)
  const isExpiring = p.plan_end_date <= thirtyOutStr
  const barColor = pct >= 90 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-400' : 'bg-green-500'
  const pctColor  = pct >= 90 ? 'text-red-600' : pct >= 80 ? 'text-amber-600' : 'text-gray-600'
  return (
    <li>
      <a
        href={`/dashboard/clients/${p.client_id}`}
        className="group block rounded-xl border border-gray-100 p-3 hover:border-brand-200 hover:bg-gray-50 transition-all"
      >
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate group-hover:text-brand-600">
              {clientName}
            </p>
            <p className="text-xs text-gray-400 truncate">{p.plan_name}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {isExpiring && (
              <Badge color={days <= 7 ? 'red' : 'amber'}>
                {days <= 0 ? 'Expired' : `${days}d left`}
              </Badge>
            )}
            <span className={`text-xs font-semibold tabular-nums ${pctColor}`}>
              {pct}%
            </span>
          </div>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-1.5 text-xs text-gray-400">
          {fmtAUD(p.remaining_amount)} remaining · expires{' '}
          {new Date(`${p.plan_end_date}T12:00:00`).toLocaleDateString('en-AU', {
            day: 'numeric', month: 'short', year: 'numeric',
          })}
        </p>
      </a>
    </li>
  )
}

// ---------------------------------------------------------------------------
// Local helper components
// ---------------------------------------------------------------------------

function StatCard({ icon, bg, label, value, valueColor, sub }: {
  icon: ReactNode; bg: string; label: string; value: string; valueColor: string; sub: ReactNode
}) {
  return (
    <Card padding="md" className="flex items-start gap-3">
      <div className={`rounded-xl p-2.5 ${bg} shrink-0`}>{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <p className={`mt-0.5 text-2xl font-bold tracking-tight sm:text-3xl ${valueColor}`}>{value}</p>
        <div className="mt-0.5 text-xs text-gray-400 truncate">{sub}</div>
      </div>
    </Card>
  )
}

function ActionItem({ href, dot, textColor, label, sub }: {
  href: string; dot: string; textColor: string; label: string; sub: string
}) {
  return (
    <li>
      <a href={href} className="flex items-center gap-3 rounded-lg p-2.5 hover:bg-gray-50 -mx-2.5 transition-colors">
        <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-medium truncate ${textColor}`}>{label}</p>
          <p className="text-xs text-gray-400">{sub}</p>
        </div>
        <svg className="ml-auto h-3.5 w-3.5 shrink-0 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </a>
    </li>
  )
}

function EmptyState({ title, description, action }: {
  title: string; description: string; action?: { label: string; href: string }
}) {
  return (
    <div className="flex flex-col items-center py-8 text-center">
      <p className="text-sm font-medium text-gray-700">{title}</p>
      <p className="mt-1 text-xs text-gray-400">{description}</p>
      {action && (
        <a href={action.href} className="mt-4 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
          {action.label}
        </a>
      )}
    </div>
  )
}

function CalIcon() {
  return (
    <svg className="h-5 w-5 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}

function PeopleIcon() {
  return (
    <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function InvIcon() {
  return (
    <svg className="h-5 w-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
}

function RevIcon() {
  return (
    <svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}
