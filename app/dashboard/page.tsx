import type { Metadata } from 'next'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { requireAuth } from '@/lib/auth'
import { getPractitionerByUserId } from '@/lib/db'
import { createServerSupabaseClient } from '@/lib/supabase-server'

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

export default async function DashboardPage() {
  const user = await requireAuth()
  const practitioner = await getPractitionerByUserId(user.id)
  const supabase = await createServerSupabaseClient()
  const pid = practitioner.id

  const today = new Date().toISOString().slice(0, 10)
  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  const [
    todayRes,
    activeClientsRes,
    upcomingRes,
    recentClientsRes,
    outstandingAmountRes,
    outstandingListRes,
    revenueRes,
    availabilityRes,
    servicesRes,
    sessionsExistRes,
  ] = await Promise.all([
    // today's session count (not cancelled)
    supabase.from('sessions').select('id', { count: 'exact', head: true })
      .eq('practitioner_id', pid).eq('service_date', today).neq('status', 'cancelled'),

    // active client count
    supabase.from('clients').select('id', { count: 'exact', head: true })
      .eq('practitioner_id', pid).eq('is_active', true),

    // upcoming sessions (next 5, scheduled only)
    supabase.from('sessions')
      .select('id, service_date, start_time, end_time, status, clients(first_name, last_name), services(name)')
      .eq('practitioner_id', pid).eq('status', 'scheduled').gte('service_date', today)
      .order('service_date').order('start_time', { nullsFirst: false }).limit(5),

    // recent clients (latest 5)
    supabase.from('clients')
      .select('id, first_name, last_name, is_active, created_at')
      .eq('practitioner_id', pid).order('created_at', { ascending: false }).limit(5),

    // outstanding invoices amounts only (for sum)
    supabase.from('invoices').select('total_cents')
      .eq('practitioner_id', pid).in('status', ['draft', 'sent', 'overdue']),

    // outstanding invoices list (latest 5 for display)
    supabase.from('invoices')
      .select('id, invoice_number, total_cents, status, clients(first_name, last_name)')
      .eq('practitioner_id', pid).in('status', ['draft', 'sent', 'overdue'])
      .order('created_at', { ascending: false }).limit(5),

    // paid this month
    supabase.from('invoices').select('total_cents')
      .eq('practitioner_id', pid).eq('status', 'paid').gte('paid_at', monthStart),

    // checklist: availability exists
    supabase.from('availability_rules').select('id', { count: 'exact', head: true })
      .eq('practitioner_id', pid),

    // checklist: service exists
    supabase.from('services').select('id', { count: 'exact', head: true })
      .eq('practitioner_id', pid),

    // checklist: session exists
    supabase.from('sessions').select('id', { count: 'exact', head: true })
      .eq('practitioner_id', pid),
  ])

  // Derive metrics
  const todayCount       = todayRes.count ?? 0
  const activeClients    = activeClientsRes.count ?? 0
  const pendingCents     = (outstandingAmountRes.data ?? []).reduce((s, r) => s + (r as { total_cents: number }).total_cents, 0)
  const revenueCents     = (revenueRes.data ?? []).reduce((s, r) => s + (r as { total_cents: number }).total_cents, 0)

  // Checklist
  const hasClient       = (recentClientsRes.data?.length ?? 0) > 0
  const hasAvailability = (availabilityRes.count ?? 0) > 0
  const hasService      = (servicesRes.count ?? 0) > 0
  const hasSession      = (sessionsExistRes.count ?? 0) > 0

  // Typed shapes for upcoming sessions
  type UpcomingSession = {
    id: string
    service_date: string
    start_time: string | null
    end_time: string | null
    status: string
    clients: { first_name: string; last_name: string } | null
    services: { name: string } | null
  }
  const upcomingSessions = (upcomingRes.data ?? []) as unknown as UpcomingSession[]

  // Typed shapes for recent clients
  type RecentClient = { id: string; first_name: string; last_name: string; is_active: boolean; created_at: string }
  const recentClients = (recentClientsRes.data ?? []) as unknown as RecentClient[]

  // Typed shapes for outstanding invoices
  type OutstandingInvoice = {
    id: string
    invoice_number: string
    total_cents: number
    status: string
    clients: { first_name: string; last_name: string } | null
  }
  const outstandingInvoices = (outstandingListRes.data ?? []) as unknown as OutstandingInvoice[]

  const stats = [
    {
      label: 'Appointments today',
      value: todayCount.toString(),
      change: todayCount === 0 ? 'No sessions today' : `${todayCount} scheduled`,
      color: 'text-brand-600',
      bg: 'bg-brand-50',
      icon: (
        <svg className="h-5 w-5 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      label: 'Active clients',
      value: activeClients.toString(),
      change: activeClients === 0 ? 'No clients yet' : `${activeClients} active`,
      color: 'text-green-600',
      bg: 'bg-green-50',
      icon: (
        <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      label: 'Pending invoices',
      value: pendingCents > 0 ? fmtAUD(pendingCents) : '$0',
      change: pendingCents === 0 ? 'All clear' : `${outstandingInvoices.length}+ unpaid`,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      icon: (
        <svg className="h-5 w-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      label: 'Revenue this month',
      value: revenueCents > 0 ? fmtAUD(revenueCents) : '$0',
      change: revenueCents === 0 ? 'No paid sessions yet' : 'From paid invoices',
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      icon: (
        <svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ]

  const quickActions = [
    { label: 'New appointment', href: '/dashboard/calendar', color: 'bg-brand-600 text-white hover:bg-brand-700' },
    { label: 'Add client', href: '/dashboard/clients', color: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50' },
    { label: 'Create invoice', href: '/dashboard/invoices', color: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50' },
  ]

  const checklist = [
    { done: hasClient,       label: 'Add your first client',       href: '/dashboard/clients' },
    { done: hasAvailability, label: 'Set your availability',        href: '/dashboard/availability' },
    { done: hasService,      label: 'Configure a service',          href: '/dashboard/services' },
    { done: hasSession,      label: 'Book your first appointment',  href: '/dashboard/calendar' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Overview</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-2">
          {quickActions.map((a) => (
            <a
              key={a.label}
              href={a.href}
              className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${a.color}`}
            >
              {a.label}
            </a>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} padding="md" className="flex items-start gap-4">
            <div className={`rounded-xl p-2.5 ${s.bg}`}>{s.icon}</div>
            <div>
              <p className="text-xs font-medium text-gray-500">{s.label}</p>
              <p className={`mt-0.5 text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="mt-0.5 text-xs text-gray-400">{s.change}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Body */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Upcoming appointments */}
        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Upcoming appointments</h2>
            <a href="/dashboard/calendar" className="text-xs font-medium text-brand-600 hover:underline">
              View calendar →
            </a>
          </div>
          {upcomingSessions.length === 0 ? (
            <EmptyState
              icon="📅"
              title="No upcoming appointments"
              description="Schedule your first appointment from the calendar."
              action={{ label: 'Open calendar', href: '/dashboard/calendar' }}
            />
          ) : (
            <ul className="divide-y divide-gray-50">
              {upcomingSessions.map((s) => {
                const clientName = s.clients
                  ? `${s.clients.first_name} ${s.clients.last_name}`
                  : 'Unknown client'
                const displayDate = new Date(`${s.service_date}T12:00:00`)
                  .toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
                const startTime = s.start_time ? s.start_time.slice(0, 5) : null
                const endTime = s.end_time ? s.end_time.slice(0, 5) : null
                return (
                  <li key={s.id} className="flex items-center gap-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{clientName}</p>
                      <p className="text-xs text-gray-400">
                        {displayDate}
                        {startTime && endTime && ` · ${startTime}–${endTime}`}
                        {s.services?.name && ` · ${s.services.name}`}
                      </p>
                    </div>
                    <Badge color={statusColor(s.status)}>{s.status}</Badge>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        {/* Recent clients */}
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Recent clients</h2>
            <a href="/dashboard/clients" className="text-xs font-medium text-brand-600 hover:underline">
              All clients →
            </a>
          </div>
          {recentClients.length === 0 ? (
            <EmptyState
              icon="👥"
              title="No clients yet"
              description="Add your first client to get started."
              action={{ label: 'Add client', href: '/dashboard/clients' }}
            />
          ) : (
            <ul className="divide-y divide-gray-50">
              {recentClients.map((c) => (
                <li key={c.id} className="flex items-center gap-3 py-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
                    {c.first_name[0]}{c.last_name[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <a
                      href={`/dashboard/clients/${c.id}`}
                      className="text-sm font-medium text-gray-900 hover:text-brand-600 truncate block"
                    >
                      {c.first_name} {c.last_name}
                    </a>
                    <p className="text-xs text-gray-400">
                      Added {new Date(c.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  {!c.is_active && <Badge color="gray">Inactive</Badge>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Invoices + getting started */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Outstanding invoices</h2>
            {outstandingInvoices.length === 0 ? (
              <Badge color="green">All paid</Badge>
            ) : (
              <a href="/dashboard/invoices" className="text-xs font-medium text-brand-600 hover:underline">
                View all →
              </a>
            )}
          </div>
          {outstandingInvoices.length === 0 ? (
            <EmptyState icon="💳" title="No outstanding invoices" description="Create an invoice after your next session." />
          ) : (
            <ul className="divide-y divide-gray-50">
              {outstandingInvoices.map((inv) => {
                const clientName = inv.clients
                  ? `${inv.clients.first_name} ${inv.clients.last_name}`
                  : 'Unknown client'
                return (
                  <li key={inv.id}>
                    <a
                      href={`/dashboard/invoices/${inv.id}`}
                      className="flex items-center gap-4 py-3 hover:bg-gray-50 -mx-6 px-6 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{clientName}</p>
                        <p className="text-xs text-gray-400">{inv.invoice_number}</p>
                      </div>
                      <Badge color={statusColor(inv.status)}>{inv.status}</Badge>
                      <span className="shrink-0 text-sm font-semibold text-gray-900">
                        {fmtAUD(inv.total_cents)}
                      </span>
                    </a>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="mb-4 font-semibold text-gray-900">Getting started</h2>
          <ul className="space-y-3">
            {checklist.map((item) => (
              <li key={item.label} className="flex items-center gap-3">
                <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${item.done ? 'border-green-500 bg-green-500' : 'border-gray-300'}`}>
                  {item.done && (
                    <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <a href={item.href} className="text-sm text-gray-600 hover:text-brand-600 hover:underline">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}

function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: string
  title: string
  description: string
  action?: { label: string; href: string }
}) {
  return (
    <div className="flex flex-col items-center py-8 text-center">
      <span className="text-3xl">{icon}</span>
      <p className="mt-2 text-sm font-medium text-gray-700">{title}</p>
      <p className="mt-1 text-xs text-gray-400">{description}</p>
      {action && (
        <a
          href={action.href}
          className="mt-4 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
        >
          {action.label}
        </a>
      )}
    </div>
  )
}
