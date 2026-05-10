import type { Metadata } from 'next'
import { requireAuth } from '@/lib/auth'
import { getPractitionerByUserId, getClinicMembers } from '@/lib/db'
import { createAdminClient } from '@/lib/supabase-server'
import TeamClient from './TeamClient'
import type { ClinicMemberWithProfile } from '@/lib/db'

export const metadata: Metadata = { title: 'Team & Permissions' }

export default async function TeamPage() {
  const user = await requireAuth()
  const practitioner = await getPractitionerByUserId(user.id)
  // role='admin' after migration 015; null/undefined before migration = solo owner
  const practitionerRole = practitioner.role as string | undefined
  const isAdmin = !practitionerRole || practitionerRole === 'admin'

  const adminClient = createAdminClient()

  // Fetch team members
  let members: ClinicMemberWithProfile[] = []
  if (isAdmin) {
    try {
      members = await getClinicMembers(practitioner.id)
    } catch {
      // clinic_memberships table not yet created (migration 016 pending)
    }
  } else {
    const { data: memberships } = await adminClient
      .from('clinic_memberships')
      .select('clinic_id')
      .eq('member_id', practitioner.id)
      .eq('is_active', true)
      .limit(1)

    if (memberships && memberships.length > 0) {
      members = await getClinicMembers(memberships[0].clinic_id as string)
    }
  }

  // Fetch auth emails for all practitioners in one call
  let userEmailMap: Record<string, string> = {}
  let ownerEmail = ''
  try {
    const { data: { users } } = await adminClient.auth.admin.listUsers({ perPage: 1000 })
    userEmailMap = Object.fromEntries(
      (users ?? []).map((u: { id: string; email?: string }) => [u.id, u.email ?? ''])
    )
    ownerEmail = userEmailMap[user.id] ?? ''
  } catch {
    // Non-critical; emails fall back to empty string
  }

  const membersWithEmail = members.map(m => ({
    ...m,
    // Pending invites: show the invited_email directly (no practitioner row)
    email: m.member
      ? (userEmailMap[m.member.user_id] ?? m.invited_email ?? '')
      : (m.invited_email ?? ''),
  }))

  return (
    <div className="mx-auto max-w-4xl">
      <TeamClient
        currentPractitioner={practitioner}
        members={membersWithEmail}
        isAdmin={isAdmin}
        ownerEmail={ownerEmail}
      />
    </div>
  )
}
