import type { Metadata } from 'next'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'

export const metadata: Metadata = { title: 'Dashboard' }

const stats = [
  {
    label: 'Appointments today',
    value: '0',
    change: '+0 from yesterday',
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
    value: '0',
    change: 'No clients yet',
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
    value: '$0',
    change: 'All clear',
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
    value: '$0',
    change: 'No sessions yet',
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

export default function DashboardPage() {
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
          <EmptyState
            icon="📅"
            title="No upcoming appointments"
            description="Schedule your first appointment from the calendar."
            action={{ label: 'Open calendar', href: '/dashboard/calendar' }}
          />
        </Card>

        {/* Recent clients */}
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Recent clients</h2>
            <a href="/dashboard/clients" className="text-xs font-medium text-brand-600 hover:underline">
              All clients →
            </a>
          </div>
          <EmptyState
            icon="👥"
            title="No clients yet"
            description="Add your first client to get started."
            action={{ label: 'Add client', href: '/dashboard/clients' }}
          />
        </Card>
      </div>

      {/* Invoices + notes */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Outstanding invoices</h2>
            <Badge color="green">All paid</Badge>
          </div>
          <EmptyState icon="💳" title="No outstanding invoices" description="Create an invoice after your next session." />
        </Card>

        <Card>
          <h2 className="mb-4 font-semibold text-gray-900">Getting started</h2>
          <ul className="space-y-3">
            {[
              { done: false, label: 'Add your first client', href: '/dashboard/clients' },
              { done: false, label: 'Set your availability', href: '/dashboard/settings' },
              { done: false, label: 'Configure a service', href: '/dashboard/settings' },
              { done: false, label: 'Book your first appointment', href: '/dashboard/calendar' },
            ].map((item) => (
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
