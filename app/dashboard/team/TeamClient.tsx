'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import TeamMemberModal from './TeamMemberModal'
import { updateMemberRole, toggleMemberActive, removeMember } from '@/app/actions/team'
import type { ClinicMemberWithProfile } from '@/lib/db'
import type { ClinicRole, ClinicMemberStatus, PractitionerRow } from '@/types/database'

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<ClinicRole, string> = {
  admin:        'Admin',
  practitioner: 'Practitioner',
  receptionist: 'Receptionist',
  finance:      'Finance',
}

const ROLE_BADGE: Record<ClinicRole, string> = {
  admin:        'bg-rose-50 text-rose-700 ring-rose-200/60',
  practitioner: 'bg-brand-50 text-brand-700 ring-brand-200/60',
  receptionist: 'bg-teal-50 text-teal-700 ring-teal-200/60',
  finance:      'bg-amber-50 text-amber-700 ring-amber-200/60',
}

const ROLE_OPTIONS: ClinicRole[] = ['practitioner', 'receptionist', 'finance', 'admin']

type FilterTab = 'all' | ClinicMemberStatus

// ─── Pending invite card ──────────────────────────────────────────────────────

function PendingCard({
  m,
  isAdmin,
}: {
  m: ClinicMemberWithProfile & { email: string }
  isAdmin: boolean
}) {
  const router = useRouter()
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [isPending, startTransition]      = useTransition()

  const displayName  = m.invited_name || null
  const displayEmail = m.email || m.invited_email || '—'

  function handleCancel() {
    if (!confirmCancel) { setConfirmCancel(true); return }
    startTransition(async () => {
      await removeMember(m.id)
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col rounded-2xl border border-dashed border-gray-200 bg-white p-5 transition-shadow hover:shadow-sm">
      <div className="flex items-start gap-3.5">
        {/* Envelope avatar */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-50 ring-1 ring-gray-200">
          <svg className="h-4.5 w-4.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          {displayName && (
            <p className="truncate text-sm font-semibold text-gray-900">{displayName}</p>
          )}
          <p className="truncate text-sm text-gray-500">{displayEmail}</p>
          <span className={`mt-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${ROLE_BADGE[m.role]}`}>
            {ROLE_LABELS[m.role]}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between border-t border-gray-50 pt-4">
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          <span className="text-xs text-gray-400">Awaiting sign-up</span>
        </div>
        {isAdmin && (
          <button
            onClick={handleCancel}
            disabled={isPending}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
              confirmCancel
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'border border-gray-200 text-gray-400 hover:border-red-200 hover:text-red-500'
            }`}
          >
            {confirmCancel ? 'Confirm cancel' : 'Cancel invite'}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Practitioner card ────────────────────────────────────────────────────────

function PractitionerCard({
  m,
  isAdmin,
  isSelf,
}: {
  m: ClinicMemberWithProfile & { email: string }
  isAdmin: boolean
  isSelf: boolean
}) {
  const router = useRouter()
  const [rolePending,   startRoleTransition]   = useTransition()
  const [activePending, startActiveTransition] = useTransition()
  const [removePending, startRemoveTransition] = useTransition()
  const [confirmRemove, setConfirmRemove]      = useState(false)

  const isInactive = m.status === 'inactive'

  const displayName  = m.member
    ? (m.member.display_name ?? `${m.member.first_name} ${m.member.last_name}`)
    : (m.invited_name || '—')
  const displayEmail = m.email || '—'
  const displayColor = m.member?.calendar_color ?? '#6366F1'
  const initials     = m.member
    ? `${m.member.first_name[0] ?? ''}${m.member.last_name[0] ?? ''}`.toUpperCase()
    : '?'

  function handleRoleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    startRoleTransition(async () => {
      await updateMemberRole(m.id, e.target.value as ClinicRole)
      router.refresh()
    })
  }

  function handleToggleActive() {
    startActiveTransition(async () => {
      await toggleMemberActive(m.id, isInactive)
      router.refresh()
    })
  }

  function handleRemove() {
    if (!confirmRemove) { setConfirmRemove(true); return }
    startRemoveTransition(async () => {
      await removeMember(m.id)
      router.refresh()
    })
  }

  return (
    <div className={`flex flex-col rounded-2xl border bg-white p-5 transition-shadow hover:shadow-sm ${
      isInactive ? 'border-gray-100 opacity-65' : 'border-gray-200'
    }`}>
      {/* Identity */}
      <div className="flex items-start gap-3.5">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ring-2 ring-white shadow-sm"
          style={{ backgroundColor: displayColor }}
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-gray-900">{displayName}</p>
          <p className="truncate text-sm text-gray-400">{displayEmail}</p>
          {m.member?.provider_number && (
            <p className="mt-0.5 text-xs text-gray-400">Provider #{m.member.provider_number}</p>
          )}
          <div className="mt-2">
            {isAdmin && !isSelf ? (
              <select
                value={m.role}
                onChange={handleRoleChange}
                disabled={rolePending}
                className="rounded-full border border-gray-200 bg-white px-2.5 py-0.5 text-xs font-semibold text-gray-700 focus:border-brand-400 focus:outline-none disabled:opacity-50 cursor-pointer"
              >
                {ROLE_OPTIONS.map(r => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </select>
            ) : (
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${ROLE_BADGE[m.role]}`}>
                {ROLE_LABELS[m.role]}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between border-t border-gray-50 pt-4">
        {/* Status + calendar colour */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className={`h-1.5 w-1.5 rounded-full ${isInactive ? 'bg-gray-300' : 'bg-emerald-400'}`} />
            <span className="text-xs text-gray-500">{isInactive ? 'Inactive' : 'Active'}</span>
          </div>
          <div
            className="h-3.5 w-3.5 rounded-full border-2 border-white shadow-sm ring-1 ring-gray-200/50"
            style={{ backgroundColor: displayColor }}
            title="Calendar colour"
          />
        </div>

        {/* Actions (admin, not self) */}
        {isAdmin && !isSelf && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleToggleActive}
              disabled={activePending}
              className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {isInactive ? 'Reactivate' : 'Deactivate'}
            </button>
            <button
              onClick={handleRemove}
              disabled={removePending}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                confirmRemove
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'border border-gray-200 text-gray-400 hover:border-red-200 hover:text-red-500'
              }`}
            >
              {confirmRemove ? 'Confirm' : 'Remove'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  currentPractitioner: PractitionerRow
  members: (ClinicMemberWithProfile & { email: string })[]
  isAdmin: boolean
  ownerEmail: string
}

export default function TeamClient({ currentPractitioner, members, isAdmin, ownerEmail }: Props) {
  const [showModal,    setShowModal]    = useState(false)
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all')
  const [search,       setSearch]       = useState('')

  const ownerName    = currentPractitioner.display_name
    ?? `${currentPractitioner.first_name} ${currentPractitioner.last_name}`
  const ownerInitials = `${currentPractitioner.first_name[0] ?? ''}${currentPractitioner.last_name[0] ?? ''}`.toUpperCase()
  const ownerColor   = currentPractitioner.calendar_color ?? '#6366F1'

  const counts = useMemo(() => ({
    all:      members.length,
    active:   members.filter(m => m.status === 'active').length,
    pending:  members.filter(m => m.status === 'pending').length,
    inactive: members.filter(m => m.status === 'inactive').length,
  }), [members])

  const filteredMembers = useMemo(() => {
    let list = activeFilter === 'all' ? members : members.filter(m => m.status === activeFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(m => {
        const name = m.member
          ? `${m.member.first_name} ${m.member.last_name} ${m.member.display_name ?? ''}`.toLowerCase()
          : (m.invited_name ?? '').toLowerCase()
        const email   = (m.email ?? '').toLowerCase()
        const provider = (m.member?.provider_number ?? '').toLowerCase()
        return name.includes(q) || email.includes(q) || provider.includes(q)
      })
    }
    return list
  }, [members, activeFilter, search])

  const FILTER_TABS: { key: FilterTab; label: string; count: number }[] = [
    { key: 'all',      label: 'All',      count: counts.all },
    { key: 'active',   label: 'Active',   count: counts.active },
    { key: 'pending',  label: 'Pending',  count: counts.pending },
    { key: 'inactive', label: 'Inactive', count: counts.inactive },
  ]

  return (
    <>
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Clinic</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900">Practitioners</h1>
          <p className="mt-1 text-sm text-gray-500">
            {isAdmin
              ? 'Manage your workforce and service delivery team.'
              : 'Your clinic practitioners.'}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Invite Practitioner
          </button>
        )}
      </div>

      {/* ── Owner card ──────────────────────────────────────────────────── */}
      <div className="mb-6 rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50/30 to-white p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5 min-w-0">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ring-2 ring-white shadow-sm"
              style={{ backgroundColor: ownerColor }}
            >
              {ownerInitials}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-gray-900">{ownerName}</p>
                <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
                  {isAdmin ? 'Owner · Admin' : ROLE_LABELS[currentPractitioner.role as ClinicRole]}
                </span>
              </div>
              <p className="mt-0.5 text-sm text-gray-400 truncate">{ownerEmail}</p>
              {currentPractitioner.provider_number && (
                <p className="mt-0.5 text-xs text-gray-400">Provider #{currentPractitioner.provider_number}</p>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <div
              className="h-4 w-4 rounded-full border-2 border-white shadow-sm ring-1 ring-gray-200/50"
              style={{ backgroundColor: ownerColor }}
              title="Calendar colour"
            />
            <a
              href="/dashboard/settings"
              className="text-xs font-medium text-brand-600 hover:underline whitespace-nowrap"
            >
              Edit profile
            </a>
          </div>
        </div>
      </div>

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      {members.length > 0 && (
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Search */}
          <div className="relative max-w-xs flex-1">
            <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="search"
              placeholder="Search by name, email, or provider #…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm placeholder:text-gray-400 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
            />
          </div>
          {/* Filter pills */}
          <div className="flex gap-1.5">
            {FILTER_TABS.filter(t => t.key === 'all' || t.count > 0).map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveFilter(tab.key)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  activeFilter === tab.key
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={`ml-1.5 rounded-full px-1.5 py-px text-[10px] font-bold ${
                    activeFilter === tab.key ? 'bg-white/20 text-white' : 'bg-white text-gray-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Practitioners grid / empty state ─────────────────────────────── */}
      {members.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-gray-200 bg-white py-16 px-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50">
            <svg className="h-7 w-7 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="mt-4 text-base font-semibold text-gray-800">No practitioners added yet.</p>
          <p className="mt-1.5 max-w-sm text-sm text-gray-400">
            Build your workforce and manage service delivery from one place.
          </p>
          {isAdmin && (
            <button
              onClick={() => setShowModal(true)}
              className="mt-6 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
            >
              Invite Practitioner
            </button>
          )}
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="flex items-center justify-center rounded-2xl border border-gray-100 bg-white py-12 px-6">
          <p className="text-sm text-gray-400">No practitioners match your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {filteredMembers.map(m =>
            m.status === 'pending' ? (
              <PendingCard key={m.id} m={m} isAdmin={isAdmin} />
            ) : (
              <PractitionerCard
                key={m.id}
                m={m}
                isAdmin={isAdmin}
                isSelf={m.member_id === currentPractitioner.id}
              />
            )
          )}
        </div>
      )}

      {showModal && <TeamMemberModal onClose={() => setShowModal(false)} />}
    </>
  )
}
