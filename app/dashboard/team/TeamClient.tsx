'use client'

import { useState, useTransition } from 'react'
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
  admin:        'bg-rose-50 text-rose-700',
  practitioner: 'bg-brand-50 text-brand-700',
  receptionist: 'bg-teal-50 text-teal-700',
  finance:      'bg-amber-50 text-amber-700',
}

const STATUS_BADGE: Record<ClinicMemberStatus, string> = {
  active:   'bg-green-50 text-green-700',
  pending:  'bg-amber-50 text-amber-700',
  inactive: 'bg-gray-100 text-gray-500',
}

const STATUS_LABEL: Record<ClinicMemberStatus, string> = {
  active:   'Active',
  pending:  'Pending',
  inactive: 'Inactive',
}

const ROLE_OPTIONS: ClinicRole[] = ['practitioner', 'receptionist', 'finance', 'admin']

// ─── Member row ───────────────────────────────────────────────────────────────

function MemberRow({
  m,
  isAdmin,
  isSelf,
}: {
  m: ClinicMemberWithProfile & { email: string }
  isAdmin: boolean
  isSelf: boolean
}) {
  const router = useRouter()
  const [rolePending,    startRoleTransition]    = useTransition()
  const [activePending,  startActiveTransition]  = useTransition()
  const [removePending,  startRemoveTransition]  = useTransition()
  const [confirmRemove,  setConfirmRemove]        = useState(false)

  const isPending  = m.status === 'pending'
  const isInactive = m.status === 'inactive'

  // Display data: use member profile if active, invited fields otherwise
  const displayName = m.member
    ? (m.member.display_name ?? `${m.member.first_name} ${m.member.last_name}`)
    : (m.invited_name || '—')
  const displayEmail = m.email || '—'
  const displayProvider = m.member?.provider_number ?? null
  const displayColor = m.member?.calendar_color ?? '#6366F1'
  const initials = m.member
    ? `${m.member.first_name[0] ?? ''}${m.member.last_name[0] ?? ''}`.toUpperCase()
    : (m.invited_name ? m.invited_name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2) : '?')

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
    <tr className={`border-b border-gray-50 transition-colors hover:bg-gray-50/50 ${!m.is_active && !isPending ? 'opacity-60' : ''}`}>
      {/* Avatar + Name */}
      <td className="py-3.5 pl-6 pr-3">
        <div className="flex items-center gap-3">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ backgroundColor: displayColor }}
          >
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate max-w-[160px]">{displayName}</p>
            <p className="text-xs text-gray-400 truncate max-w-[160px]">{displayEmail}</p>
          </div>
        </div>
      </td>

      {/* Role */}
      <td className="px-3 py-3.5">
        {isAdmin && !isSelf && !isPending ? (
          <select
            value={m.role}
            onChange={handleRoleChange}
            disabled={rolePending}
            className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 focus:border-brand-400 focus:outline-none disabled:opacity-50"
          >
            {ROLE_OPTIONS.map(r => (
              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
            ))}
          </select>
        ) : (
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${ROLE_BADGE[m.role]}`}>
            {ROLE_LABELS[m.role]}
          </span>
        )}
      </td>

      {/* Provider # */}
      <td className="px-3 py-3.5 text-xs text-gray-500">
        {displayProvider ? (
          <span>{displayProvider}</span>
        ) : (
          <span className="text-gray-300">—</span>
        )}
      </td>

      {/* Colour */}
      <td className="px-3 py-3.5">
        <div
          className="h-5 w-5 rounded-full border border-white shadow-sm"
          style={{ backgroundColor: displayColor }}
          title={displayColor}
        />
      </td>

      {/* Status */}
      <td className="px-3 py-3.5">
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_BADGE[m.status]}`}>
          {STATUS_LABEL[m.status]}
        </span>
      </td>

      {/* Actions */}
      <td className="py-3.5 pl-3 pr-6 text-right">
        {isAdmin && !isSelf && (
          <div className="flex items-center justify-end gap-1.5">
            {!isPending && (
              <button
                onClick={handleToggleActive}
                disabled={activePending}
                className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                {isInactive ? 'Reactivate' : 'Deactivate'}
              </button>
            )}
            <button
              onClick={handleRemove}
              disabled={removePending}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                confirmRemove
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'border border-gray-200 text-gray-400 hover:border-red-200 hover:text-red-500'
              }`}
            >
              {isPending
                ? (confirmRemove ? 'Confirm cancel' : 'Cancel invite')
                : (confirmRemove ? 'Confirm remove' : 'Remove')
              }
            </button>
          </div>
        )}
      </td>
    </tr>
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
  const [showModal, setShowModal] = useState(false)

  const ownerName = currentPractitioner.display_name
    ?? `${currentPractitioner.first_name} ${currentPractitioner.last_name}`
  const ownerInitials = `${currentPractitioner.first_name[0] ?? ''}${currentPractitioner.last_name[0] ?? ''}`.toUpperCase()

  return (
    <>
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Clinic</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900">Team</h1>
          <p className="mt-1 text-sm text-gray-500">
            {isAdmin
              ? 'Manage practitioners and staff who have access to your clinic.'
              : 'Your clinic team members.'}
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
            Invite team member
          </button>
        )}
      </div>

      {/* ── Owner card ──────────────────────────────────────────────────── */}
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">You</p>
          <a
            href="/dashboard/settings"
            className="text-xs font-medium text-brand-600 hover:underline"
          >
            Edit profile →
          </a>
        </div>
        <div className="flex items-center gap-4 px-5 py-4">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
            style={{ backgroundColor: currentPractitioner.calendar_color ?? '#6366F1' }}
          >
            {ownerInitials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-gray-900">{ownerName}</p>
              <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
                {isAdmin ? 'Owner · Admin' : ROLE_LABELS[currentPractitioner.role]}
              </span>
            </div>
            <p className="text-sm text-gray-400">{ownerEmail}</p>
            {currentPractitioner.provider_number && (
              <p className="text-xs text-gray-400 mt-0.5">Provider #{currentPractitioner.provider_number}</p>
            )}
          </div>
          <div
            className="h-5 w-5 shrink-0 rounded-full border border-white shadow-sm"
            style={{ backgroundColor: currentPractitioner.calendar_color ?? '#6366F1' }}
            title="Calendar colour"
          />
        </div>
      </div>

      {/* ── Team members table ───────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
            Team members
            {members.length > 0 && (
              <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600 normal-case tracking-normal">
                {members.length}
              </span>
            )}
          </p>
        </div>

        {members.length === 0 ? (
          <div className="flex flex-col items-center py-12 px-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50">
              <svg className="h-5 w-5 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="mt-3 text-sm font-semibold text-gray-700">No team members yet</p>
            <p className="mt-1 text-sm text-gray-400 max-w-xs">
              Invite practitioners or admin staff to manage your clinic together.
            </p>
            {isAdmin && (
              <button
                onClick={() => setShowModal(true)}
                className="mt-5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
              >
                Invite first member
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="py-2.5 pl-6 pr-3 text-left text-xs font-semibold text-gray-400">Name</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400">Role</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400">Provider #</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400">Colour</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400">Status</th>
                  <th className="py-2.5 pl-3 pr-6 text-right text-xs font-semibold text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map(m => (
                  <MemberRow
                    key={m.id}
                    m={m}
                    isAdmin={isAdmin}
                    isSelf={m.member_id === currentPractitioner.id}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && <TeamMemberModal onClose={() => setShowModal(false)} />}
    </>
  )
}
