'use client'

import { useState, useTransition, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import ClientModal from '../ClientModal'
import { updateClient, toggleClientStatus } from '@/app/actions/clients'
import { fetchClientTabData } from '@/app/actions/client-tabs'
import { formatDate, formatCurrency } from '@/lib/utils'
import { resolveInvoiceRecipient, recipientLabel } from '@/lib/invoice-routing'
import type { ClientRow, InvoiceRow, FundingAllocationRow, ClinicRole } from '@/types/database'
import type { ClientEventRow, ClientSessionNote, ClientDocumentWithUploader } from '@/lib/db'
import FundingTab from './FundingTab'
import DocumentsTab from './DocumentsTab'
import { parseNDISNotes } from '@/app/dashboard/sessions/NDISNotesFields'
import type { NDISNotes } from '@/app/dashboard/sessions/NDISNotesFields'
import { parseTherapyNotes } from '@/app/dashboard/sessions/TherapyNotesFields'
import type { TherapyNotes } from '@/app/dashboard/sessions/TherapyNotesFields'

type DlRow = { label: string; value: string | null | undefined }

interface Props {
  client: ClientRow
  practitionerRole: ClinicRole
}

type Tab = 'profile' | 'funding' | 'appointments' | 'reports' | 'invoices' | 'documents'

type TabData = {
  events?: ClientEventRow[]
  invoices?: InvoiceRow[]
  sessionNotes?: ClientSessionNote[]
  allocations?: FundingAllocationRow[]
  documents?: ClientDocumentWithUploader[]
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'profile',      label: 'Profile' },
  { id: 'funding',      label: 'Funding' },
  { id: 'appointments', label: 'Appointments' },
  { id: 'reports',      label: 'Session Notes' },
  { id: 'invoices',     label: 'Invoices' },
  { id: 'documents',    label: 'Documents' },
]

const STATUS_COLORS: Record<string, 'gray' | 'green' | 'amber' | 'red' | 'blue' | 'purple'> = {
  scheduled: 'blue',
  confirmed: 'green',
  completed: 'gray',
  cancelled: 'red',
  no_show:   'amber',
}

const INVOICE_COLORS: Record<string, 'gray' | 'green' | 'amber' | 'red' | 'blue' | 'purple'> = {
  draft:     'gray',
  sent:      'blue',
  paid:      'green',
  overdue:   'red',
  cancelled: 'gray',
}

export default function ClientDetailTabs({ client, practitionerRole }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('profile')
  const [tabData, setTabData] = useState<TabData>({})
  const [loadingTab, setLoadingTab] = useState<Tab | null>(null)
  const [tabError, setTabError] = useState<Tab | null>(null)
  // Track which tabs have been loaded so we don't re-fetch on re-visit
  const loadedTabs = useRef<Set<Tab>>(new Set<Tab>(['profile']))

  const [showEditModal, setShowEditModal] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [statusError, setStatusError] = useState<string | null>(null)
  const router = useRouter()

  function handleToggleStatus() {
    setStatusError(null)
    startTransition(async () => {
      const result = await toggleClientStatus(client.id, !client.is_active)
      if (result?.error) setStatusError(result.error)
      else router.refresh()
    })
  }

  function handleTabClick(tab: Tab) {
    setActiveTab(tab)
    setTabError(null)
    if (tab === 'profile' || loadedTabs.current.has(tab)) return

    // Mark as loaded immediately to prevent duplicate fetches
    loadedTabs.current.add(tab)
    setLoadingTab(tab)

    fetchClientTabData(client.id, tab).then((result) => {
      if (result.error) {
        loadedTabs.current.delete(tab) // allow retry on next click
        setTabError(tab)
      } else {
        setTabData(prev => ({ ...prev, ...result }))
      }
      setLoadingTab(null)
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/clients"
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">
                {client.first_name} {client.last_name}
              </h1>
              <Badge color={client.is_active ? 'green' : 'gray'}>
                {client.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <p className="mt-0.5 text-sm text-gray-500">
              Client since {formatDate(client.created_at)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleStatus}
            loading={isPending}
          >
            {client.is_active ? 'Deactivate' : 'Activate'}
          </Button>
          <Button size="sm" onClick={() => setShowEditModal(true)}>
            Edit profile
          </Button>
        </div>
      </div>

      {statusError && (
        <p className="text-sm text-red-600">{statusError}</p>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={[
                'pb-3 text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'border-b-2 border-brand-600 text-brand-600'
                  : 'text-gray-500 hover:text-gray-700',
              ].join(' ')}
            >
              {tab.label}
              {tab.id === 'funding' && tabData.allocations?.some(a => a.is_active) && (
                <span className="ml-1.5 rounded-full bg-green-100 px-1.5 py-0.5 text-xs text-green-700">
                  active
                </span>
              )}
              {tab.id === 'appointments' && tabData.events && tabData.events.length > 0 && (
                <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
                  {tabData.events.length}
                </span>
              )}
              {tab.id === 'invoices' && tabData.invoices && tabData.invoices.length > 0 && (
                <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
                  {tabData.invoices.length}
                </span>
              )}
              {tab.id === 'reports' && tabData.sessionNotes && tabData.sessionNotes.length > 0 && (
                <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
                  {tabData.sessionNotes.length}
                </span>
              )}
              {tab.id === 'documents' && tabData.documents && tabData.documents.length > 0 && (
                <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
                  {tabData.documents.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab panels */}
      {activeTab === 'profile' && <ProfileTab client={client} />}

      {activeTab !== 'profile' && loadingTab === activeTab && <TabSkeleton />}

      {activeTab !== 'profile' && tabError === activeTab && (
        <Card>
          <div className="py-8 text-center">
            <p className="text-sm text-red-600">Failed to load. Please try again.</p>
            <button
              onClick={() => handleTabClick(activeTab)}
              className="mt-3 text-sm font-medium text-brand-600 hover:underline"
            >
              Retry
            </button>
          </div>
        </Card>
      )}

      {activeTab === 'funding' && loadingTab !== 'funding' && tabError !== 'funding' && (
        <FundingTab allocations={tabData.allocations ?? []} client={client} />
      )}
      {activeTab === 'appointments' && loadingTab !== 'appointments' && tabError !== 'appointments' && (
        <AppointmentsTab events={tabData.events ?? []} />
      )}
      {activeTab === 'reports' && loadingTab !== 'reports' && tabError !== 'reports' && (
        <ReportsTab notes={tabData.sessionNotes ?? []} />
      )}
      {activeTab === 'invoices' && loadingTab !== 'invoices' && tabError !== 'invoices' && (
        <InvoicesTab invoices={tabData.invoices ?? []} client={client} />
      )}
      {activeTab === 'documents' && loadingTab !== 'documents' && tabError !== 'documents' && (
        <DocumentsTab
          clientId={client.id}
          documents={tabData.documents ?? []}
          practitionerRole={practitionerRole}
        />
      )}

      {showEditModal && (
        <ClientModal
          mode="edit"
          client={client}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Inline tab loading skeleton
// ---------------------------------------------------------------------------

function TabSkeleton() {
  return (
    <Card padding="sm">
      <div className="space-y-0 divide-y divide-gray-50">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3.5">
            <div className="h-4 w-20 animate-pulse rounded bg-gray-100" />
            <div className="h-4 w-28 animate-pulse rounded bg-gray-100" />
            <div className="h-4 w-24 animate-pulse rounded bg-gray-100" />
            <div className="ml-auto h-5 w-16 animate-pulse rounded-full bg-gray-100" />
          </div>
        ))}
      </div>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Profile tab
// ---------------------------------------------------------------------------

function ProfileTab({ client }: { client: ClientRow }) {
  const contactFields: { label: string; value: string | null }[] = [
    { label: 'Email',         value: client.email },
    { label: 'Phone',         value: client.phone },
    { label: 'Date of birth', value: client.date_of_birth ? formatDate(client.date_of_birth) : null },
    { label: 'Address',       value: client.address },
  ]

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <h3 className="mb-4 text-sm font-semibold text-gray-900">Contact information</h3>
        <dl className="space-y-3">
          {contactFields.map(({ label, value }) => (
            <div key={label} className="flex justify-between gap-4">
              <dt className="text-sm text-gray-500">{label}</dt>
              <dd className="text-sm font-medium text-gray-900 text-right">{value ?? '—'}</dd>
            </div>
          ))}
        </dl>
      </Card>

      {client.funding_type && (
        <FundingCard client={client} />
      )}

      {client.notes && (
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-gray-900">Notes</h3>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{client.notes}</p>
        </Card>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Appointments tab
// ---------------------------------------------------------------------------

const INVOICE_STATUS_COLORS: Record<string, 'gray' | 'green' | 'amber' | 'red' | 'blue'> = {
  draft:     'gray',
  sent:      'blue',
  paid:      'green',
  overdue:   'red',
  cancelled: 'gray',
}

function EventTable({ rows, label }: { rows: ClientEventRow[]; label: string }) {
  return (
    <div>
      <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
        {label}
      </p>
      <Card padding="sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Time</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Service</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Invoice</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((ev) => (
              <tr key={`${ev.source}-${ev.id}`} className="border-b border-gray-50 last:border-0">
                <td className="px-4 py-3 font-medium text-gray-900">
                  {ev.appointment_href ? (
                    <Link href={ev.appointment_href} className="hover:text-brand-600">
                      {ev.formatted_date}
                    </Link>
                  ) : (
                    ev.formatted_date
                  )}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {ev.start_time_display && ev.end_time_display
                    ? `${ev.start_time_display} – ${ev.end_time_display}`
                    : ev.start_time_display ?? '—'}
                </td>
                <td className="px-4 py-3 text-gray-600">{ev.service_name ?? '—'}</td>
                <td className="px-4 py-3">
                  <Badge color={STATUS_COLORS[ev.status] ?? 'gray'}>
                    {ev.status.replace('_', ' ')}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  {ev.invoice_id ? (
                    <Link href={`/dashboard/invoices/${ev.invoice_id}`} className="inline-flex" onClick={(e) => e.stopPropagation()}>
                      <Badge color={INVOICE_STATUS_COLORS['sent']}>Invoiced</Badge>
                    </Link>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

function AppointmentsTab({ events }: { events: ClientEventRow[] }) {
  if (!events.length) {
    return <EmptyState message="No appointments or sessions recorded yet." />
  }

  const todayStr = new Date().toLocaleDateString('en-CA')
  const upcoming = events
    .filter((e) => e.sort_date >= todayStr)
    .sort((a, b) => a.sort_date.localeCompare(b.sort_date))
  const past = events
    .filter((e) => e.sort_date < todayStr)
    .sort((a, b) => b.sort_date.localeCompare(a.sort_date))

  return (
    <div className="space-y-6">
      {upcoming.length > 0 && (
        <EventTable rows={upcoming} label={`Upcoming (${upcoming.length})`} />
      )}
      {past.length > 0 && (
        <EventTable rows={past} label={`Past (${past.length})`} />
      )}
      {upcoming.length === 0 && past.length === 0 && (
        <EmptyState message="No appointments or sessions recorded yet." />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Session notes tab
// ---------------------------------------------------------------------------

const NDIS_SECTION_LABELS: { key: keyof NDISNotes; label: string }[] = [
  { key: 'participant_presentation', label: 'Participant Presentation' },
  { key: 'supports_delivered',       label: 'Supports Delivered' },
  { key: 'participant_response',     label: 'Participant Response' },
  { key: 'progress_toward_goals',    label: 'Progress Toward Goals' },
  { key: 'risks_incidents',          label: 'Risks / Incidents' },
  { key: 'next_steps',               label: 'Next Steps' },
]

function NdisNotesSections({ ndis }: { ndis: NDISNotes }) {
  const filled = NDIS_SECTION_LABELS.filter(({ key }) => ndis[key]?.trim())
  if (!filled.length) return <p className="text-xs text-gray-400">No note content recorded.</p>
  return (
    <div className="space-y-3">
      {filled.map(({ key, label }) => (
        <div key={key} className="rounded-lg bg-gray-50 px-3 py-2.5">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
          <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">{ndis[key]}</p>
        </div>
      ))}
    </div>
  )
}

function TherapyNotesSections({ therapy }: { therapy: TherapyNotes }) {
  const obsGroups: { label: string; values: string[] }[] = [
    { label: 'Engagement',              values: therapy.obs_engagement },
    { label: 'Emotional Regulation',    values: therapy.obs_emotional_regulation },
    { label: 'Communication',           values: therapy.obs_communication },
    { label: 'Social Interaction',      values: therapy.obs_social_interaction },
    { label: 'Behaviour of Concern',    values: therapy.obs_behaviour_of_concern },
  ]
  const hasObs = obsGroups.some(({ values }) => values.length > 0)

  return (
    <div className="space-y-4">
      {(therapy.focus_areas.length > 0 || therapy.focus_other.trim()) && (
        <div className="rounded-lg bg-gray-50 px-3 py-2.5">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Focus of the Session</p>
          <ul className="space-y-0.5">
            {therapy.focus_areas.map((f) => (
              <li key={f} className="flex items-start gap-1.5 text-sm text-gray-700">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                {f}
              </li>
            ))}
            {therapy.focus_other.trim() && (
              <li className="flex items-start gap-1.5 text-sm text-gray-500">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-300" />
                {therapy.focus_other.trim()}
              </li>
            )}
          </ul>
        </div>
      )}

      {hasObs && (
        <div className="rounded-lg bg-gray-50 px-3 py-2.5">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Session Observations</p>
          <div className="space-y-1.5">
            {obsGroups.filter(({ values }) => values.length > 0).map(({ label, values }) => (
              <div key={label} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="text-xs font-medium text-gray-500">{label}:</span>
                <span className="text-sm text-gray-700">{values.join(', ')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {therapy.session_note.trim() && (
        <div className="rounded-lg bg-gray-50 px-3 py-2.5">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Session Note</p>
          <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">{therapy.session_note}</p>
        </div>
      )}

      {(therapy.strategies_used.length > 0 || therapy.strategies_other.trim()) && (
        <div className="rounded-lg bg-gray-50 px-3 py-2.5">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Strategies Used</p>
          <ul className="space-y-0.5">
            {therapy.strategies_used.map((s) => (
              <li key={s} className="flex items-start gap-1.5 text-sm text-gray-700">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                {s}
              </li>
            ))}
            {therapy.strategies_other.trim() && (
              <li className="flex items-start gap-1.5 text-sm text-gray-500">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-300" />
                Other: {therapy.strategies_other.trim()}
              </li>
            )}
          </ul>
        </div>
      )}

      {(therapy.response_to_strategies || therapy.response_comment.trim()) && (
        <div className="rounded-lg bg-gray-50 px-3 py-2.5">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Response to Strategies</p>
          {therapy.response_to_strategies && (
            <p className="text-sm font-medium text-gray-700">{therapy.response_to_strategies}</p>
          )}
          {therapy.response_comment.trim() && (
            <p className="mt-0.5 text-sm text-gray-600">{therapy.response_comment.trim()}</p>
          )}
        </div>
      )}

      {(therapy.follow_up.length > 0 || therapy.follow_up_notes.trim()) && (
        <div className="rounded-lg bg-gray-50 px-3 py-2.5">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Follow Up</p>
          <ul className="space-y-0.5">
            {therapy.follow_up.map((f) => (
              <li key={f} className="flex items-start gap-1.5 text-sm text-gray-700">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                {f}
              </li>
            ))}
            {therapy.follow_up_notes.trim() && (
              <li className="mt-1 text-sm text-gray-500">{therapy.follow_up_notes.trim()}</li>
            )}
          </ul>
        </div>
      )}

      {(therapy.plan_for_next.length > 0 || therapy.plan_notes.trim()) && (
        <div className="rounded-lg bg-gray-50 px-3 py-2.5">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Plan for Next Session</p>
          <ul className="space-y-0.5">
            {therapy.plan_for_next.map((p) => (
              <li key={p} className="flex items-start gap-1.5 text-sm text-gray-700">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                {p}
              </li>
            ))}
            {therapy.plan_notes.trim() && (
              <li className="mt-1 text-sm text-gray-500">{therapy.plan_notes.trim()}</li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}

function ReportsTab({ notes }: { notes: ClientSessionNote[] }) {
  if (!notes.length) {
    return <EmptyState message="No session notes recorded yet." />
  }

  return (
    <div className="space-y-4">
      {notes.map((session) => {
        const therapy = parseTherapyNotes(session.notes)
        const ndis = !therapy ? parseNDISNotes(session.notes) : null
        const formattedDate = new Date(`${session.service_date}T12:00:00`).toLocaleDateString('en-AU', {
          weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
        })
        const timeRange = session.start_time && session.end_time
          ? `${session.start_time.slice(0, 5)} – ${session.end_time.slice(0, 5)}`
          : session.start_time
            ? session.start_time.slice(0, 5)
            : null

        return (
          <Card key={session.id}>
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">{formattedDate}</p>
                <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-400">
                  {timeRange && <span>{timeRange}</span>}
                  {session.service_name && (
                    <span className="font-medium text-indigo-600">{session.service_name}</span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {session.invoice_id && (
                  session.invoice_number ? (
                    <Link href={`/dashboard/invoices/${session.invoice_id}`} className="inline-flex">
                      <Badge color="amber">Locked · {session.invoice_number}</Badge>
                    </Link>
                  ) : (
                    <Badge color="amber">Locked</Badge>
                  )
                )}
                <Badge color={STATUS_COLORS[session.status] ?? 'gray'}>
                  {session.status.replace('_', ' ')}
                </Badge>
              </div>
            </div>

            {therapy ? (
              <TherapyNotesSections therapy={therapy} />
            ) : ndis ? (
              <NdisNotesSections ndis={ndis} />
            ) : session.notes ? (
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{session.notes}</p>
            ) : null}
          </Card>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Invoices tab
// ---------------------------------------------------------------------------

function InvoicesTab({ invoices, client }: { invoices: InvoiceRow[]; client: ClientRow }) {
  if (!invoices.length) {
    return <EmptyState message="No invoices issued yet." />
  }

  const derived = resolveInvoiceRecipient(client)

  return (
    <div className="space-y-4">
      <BillingDestinationBanner client={client} />

      <Card padding="sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Invoice #</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Bill to</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Issued</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Due</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Status</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">Total</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => {
              const recipType = inv.recipient_type ?? derived.recipient_type
              const recipName = inv.recipient_name ?? derived.recipient_name
              const isNdia = recipType === 'ndia_claim'

              return (
                <tr key={inv.id} className="cursor-pointer border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/dashboard/invoices/${inv.id}`} className="text-indigo-600 hover:underline" onClick={(e) => e.stopPropagation()}>
                      {inv.invoice_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {isNdia ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                        NDIA claim
                      </span>
                    ) : (
                      <span className="text-gray-700">{recipName ?? '—'}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {inv.issued_at ? formatDate(inv.issued_at) : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {inv.due_at ? formatDate(inv.due_at) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge color={INVOICE_COLORS[inv.status] ?? 'gray'}>{inv.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    {formatCurrency(inv.total_cents, inv.currency)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

function BillingDestinationBanner({ client }: { client: ClientRow }) {
  const recipient = resolveInvoiceRecipient(client)
  const isNdia = recipient.recipient_type === 'ndia_claim'
  const isPlan = recipient.recipient_type === 'plan_manager'
  const isSelf = recipient.recipient_type === 'self_manager'

  return (
    <div className={[
      'rounded-xl border px-4 py-3',
      isNdia
        ? 'border-amber-200 bg-amber-50'
        : isPlan || isSelf
          ? 'border-indigo-100 bg-indigo-50/50'
          : 'border-gray-100 bg-gray-50',
    ].join(' ')}>
      <div className="flex flex-wrap items-start gap-x-6 gap-y-1">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Billing destination</p>
          <p className={`mt-0.5 text-sm font-medium ${isNdia ? 'text-amber-700' : 'text-gray-900'}`}>
            {recipientLabel(recipient.recipient_type)}
          </p>
        </div>
        {recipient.recipient_name && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Name</p>
            <p className="mt-0.5 text-sm text-gray-700">{recipient.recipient_name}</p>
          </div>
        )}
        {recipient.recipient_email && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Email</p>
            <p className="mt-0.5 text-sm text-gray-700">{recipient.recipient_email}</p>
          </div>
        )}
        {recipient.recipient_phone && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Phone</p>
            <p className="mt-0.5 text-sm text-gray-700">{recipient.recipient_phone}</p>
          </div>
        )}
        {recipient.billing_note && (
          <div className="w-full">
            <p className={`text-xs ${isNdia ? 'font-medium text-amber-700' : 'text-gray-500'}`}>
              {recipient.billing_note}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Funding card (profile tab)
// ---------------------------------------------------------------------------

function FundingCard({ client }: { client: ClientRow }) {
  function DlRow({ label, value }: DlRow) {
    if (!value) return null
    return (
      <div className="flex justify-between gap-4">
        <dt className="text-sm text-gray-500">{label}</dt>
        <dd className="text-sm font-medium text-gray-900 text-right">{value}</dd>
      </div>
    )
  }

  const isSelf = client.ndis_management_type === 'Self-managed'
  const isPlan = client.ndis_management_type === 'Plan-managed'

  return (
    <Card>
      <h3 className="mb-4 text-sm font-semibold text-gray-900">Funding</h3>
      <dl className="space-y-3">
        <DlRow label="Type" value={client.funding_type} />

        {client.funding_type === 'NDIS' && (
          <>
            <DlRow label="NDIS number" value={client.ndis_number} />
            <DlRow label="Management"  value={client.ndis_management_type} />

            {isSelf && (client.self_manager_name || client.self_manager_email || client.self_manager_phone) && (
              <>
                <div className="border-t border-gray-100 pt-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Self-manager</p>
                </div>
                <DlRow label="Name"     value={client.self_manager_name} />
                <DlRow label="Relation" value={client.self_manager_relation} />
                <DlRow label="Email"    value={client.self_manager_email} />
                <DlRow label="Phone"    value={client.self_manager_phone} />
              </>
            )}

            {isPlan && (client.plan_manager_name || client.plan_manager_email || client.plan_manager_phone) && (
              <>
                <div className="border-t border-gray-100 pt-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Plan manager</p>
                </div>
                <DlRow label="Name"  value={client.plan_manager_name} />
                <DlRow label="Email" value={client.plan_manager_email} />
                <DlRow label="Phone" value={client.plan_manager_phone} />
              </>
            )}
          </>
        )}

        {client.funding_type === 'Medicare' && (
          <DlRow label="Medicare number" value={client.medicare_number} />
        )}
      </dl>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Shared empty state
// ---------------------------------------------------------------------------

function EmptyState({ message }: { message: string }) {
  return (
    <Card>
      <div className="py-8 text-center">
        <p className="text-sm text-gray-500">{message}</p>
      </div>
    </Card>
  )
}
