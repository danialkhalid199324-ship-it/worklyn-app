'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth'
import { getPractitionerByUserId } from '@/lib/db'
import { createAdminClient } from '@/lib/supabase-server'
import type { ClinicRole } from '@/types/database'

async function requireAdmin() {
  const user = await requireAuth()
  const practitioner = await getPractitionerByUserId(user.id)
  // null/undefined role = migration 015 not yet applied = solo owner → allow
  const role = practitioner.role as string | undefined
  if (role && role !== 'admin') {
    throw new Error('Only clinic admins can manage team members.')
  }
  return practitioner
}

export async function addClinicMember(formData: FormData) {
  const admin = await requireAdmin()
  const adminClient = createAdminClient()

  const email        = (formData.get('email') as string | null)?.trim().toLowerCase()
  const fullName     = (formData.get('full_name') as string | null)?.trim() ?? ''
  const role         = ((formData.get('role') as string | null) ?? 'practitioner') as ClinicRole
  const providerNum  = (formData.get('provider_number') as string | null)?.trim() || null
  const calColor     = (formData.get('calendar_color') as string | null)?.trim() || '#6366F1'

  if (!email) return { error: 'Email is required.' }

  // Check for an existing pending invite with that email in this clinic
  const { data: existingPending } = await adminClient
    .from('clinic_memberships')
    .select('id, status')
    .eq('clinic_id', admin.id)
    .eq('invited_email', email)
    .eq('status', 'pending')
    .maybeSingle()

  if (existingPending) {
    return { error: 'A pending invitation already exists for that email.' }
  }

  // Try to find a user with that email
  const { data: { users }, error: listErr } = await adminClient.auth.admin.listUsers({ perPage: 1000 })
  if (listErr) return { error: 'Failed to look up users.' }

  const targetUser = (users ?? []).find(
    (u: { id: string; email?: string }) => u.email?.toLowerCase() === email
  )

  if (targetUser) {
    // User exists — create an active membership
    const { data: memberPractitioner } = await adminClient
      .from('practitioners')
      .select('id')
      .eq('user_id', targetUser.id)
      .maybeSingle()

    if (!memberPractitioner) {
      return { error: 'That user does not have a practitioner profile yet.' }
    }
    if (memberPractitioner.id === admin.id) {
      return { error: 'You cannot add yourself as a team member.' }
    }

    const { data: existing } = await adminClient
      .from('clinic_memberships')
      .select('id, status')
      .eq('clinic_id', admin.id)
      .eq('member_id', memberPractitioner.id)
      .maybeSingle()

    if (existing?.status === 'active') {
      return { error: 'This practitioner is already an active team member.' }
    }

    if (existing) {
      // Reactivate a previously deactivated member
      await adminClient
        .from('clinic_memberships')
        .update({ status: 'active', is_active: true, role, invited_name: fullName, invited_email: email })
        .eq('id', existing.id)
    } else {
      const { error: insertErr } = await adminClient
        .from('clinic_memberships')
        .insert({
          clinic_id: admin.id, member_id: memberPractitioner.id,
          role, status: 'active', is_active: true,
          invited_by: admin.id, invited_email: email, invited_name: fullName,
        })
      if (insertErr) return { error: insertErr.message }
    }

    // Optionally update their profile with admin-specified details
    const profileUpdate: Record<string, unknown> = { role }
    if (providerNum) profileUpdate.provider_number = providerNum
    if (/^#[0-9A-Fa-f]{6}$/.test(calColor)) profileUpdate.calendar_color = calColor
    await adminClient.from('practitioners').update(profileUpdate).eq('id', memberPractitioner.id)

  } else {
    // User does not have an account yet — store a pending invite
    const { error: insertErr } = await adminClient
      .from('clinic_memberships')
      .insert({
        clinic_id: admin.id, member_id: null,
        role, status: 'pending', is_active: false,
        invited_by: admin.id, invited_email: email, invited_name: fullName || null,
      })
    if (insertErr) return { error: insertErr.message }
  }

  revalidatePath('/dashboard/team')
  return { success: true }
}

export async function updateMemberRole(membershipId: string, role: ClinicRole) {
  const admin = await requireAdmin()
  const adminClient = createAdminClient()

  const { data: membership } = await adminClient
    .from('clinic_memberships')
    .select('id, member_id, clinic_id')
    .eq('id', membershipId)
    .maybeSingle()

  if (!membership) return { error: 'Membership not found.' }
  if (membership.clinic_id !== admin.id) return { error: 'Not authorised.' }

  await adminClient.from('clinic_memberships').update({ role }).eq('id', membershipId)
  if (membership.member_id) {
    await adminClient.from('practitioners').update({ role }).eq('id', membership.member_id)
  }

  revalidatePath('/dashboard/team')
  return { success: true }
}

export async function toggleMemberActive(membershipId: string, newActive: boolean) {
  const admin = await requireAdmin()
  const adminClient = createAdminClient()

  const { data: membership } = await adminClient
    .from('clinic_memberships')
    .select('id, member_id, clinic_id')
    .eq('id', membershipId)
    .maybeSingle()

  if (!membership) return { error: 'Membership not found.' }
  if (membership.clinic_id !== admin.id) return { error: 'Not authorised.' }

  const newStatus = newActive ? 'active' : 'inactive'
  await adminClient
    .from('clinic_memberships')
    .update({ is_active: newActive, status: newStatus })
    .eq('id', membershipId)

  if (membership.member_id) {
    await adminClient
      .from('practitioners')
      .update({ is_active: newActive })
      .eq('id', membership.member_id)
  }

  revalidatePath('/dashboard/team')
  return { success: true }
}

export async function removeMember(membershipId: string) {
  const admin = await requireAdmin()
  const adminClient = createAdminClient()

  const { data: membership } = await adminClient
    .from('clinic_memberships')
    .select('id, clinic_id')
    .eq('id', membershipId)
    .maybeSingle()

  if (!membership) return { error: 'Membership not found.' }
  if (membership.clinic_id !== admin.id) return { error: 'Not authorised.' }

  await adminClient.from('clinic_memberships').delete().eq('id', membershipId)

  revalidatePath('/dashboard/team')
  return { success: true }
}
