'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth'
import { getPractitionerByUserId } from '@/lib/db'
import { createAdminClient } from '@/lib/supabase-server'
import { sendEmail } from '@/lib/email'
import type { ClinicRole } from '@/types/database'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  practitioner: 'Practitioner',
  receptionist: 'Receptionist',
  finance: 'Finance',
}

function buildInviteEmail({
  inviteeName,
  inviteeEmail,
  inviterName,
  orgName,
  roleLabel,
  signupUrl,
}: {
  inviteeName: string
  inviteeEmail: string
  inviterName: string
  orgName: string
  roleLabel: string
  signupUrl: string
}): string {
  const greeting = inviteeName || 'there'
  return `
    <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;color:#1a1a2e">
      <div style="background:#6366f1;padding:24px 32px;border-radius:12px 12px 0 0">
        <p style="color:#e0e7ff;margin:0;font-size:13px">WORKLYN</p>
        <p style="color:#fff;margin:4px 0 0;font-size:22px;font-weight:700">You&rsquo;ve been invited</p>
      </div>
      <div style="background:#f9fafb;padding:24px 32px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none">
        <p style="margin:0 0 16px">Hi ${greeting},</p>
        <p style="margin:0 0 24px">
          <strong>${inviterName}</strong> has invited you to join
          <strong>${orgName}</strong> on Worklyn as a
          <strong>${roleLabel}</strong>.
        </p>
        <div style="text-align:center;margin:28px 0">
          <a href="${signupUrl}"
             style="background:#6366f1;color:#fff;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:600;font-size:15px;display:inline-block">
            Create your account
          </a>
        </div>
        <p style="font-size:12px;color:#9ca3af;margin:0 0 20px;text-align:center">
          Or copy this link: <span style="color:#6366f1">${signupUrl}</span>
        </p>
        <p style="margin:0;font-size:12px;color:#9ca3af">
          This invitation was sent to ${inviteeEmail}.
          If you weren&rsquo;t expecting it, you can safely ignore this email.
        </p>
      </div>
    </div>
  `
}

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

    // Send invite email — non-blocking: failure logs but doesn't roll back the invite
    let warning: string | undefined
    try {
      const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '')
      const signupUrl = `${appUrl}/auth/signup?email=${encodeURIComponent(email)}`

      const { data: orgRow } = await adminClient
        .from('organisation_settings')
        .select('business_name')
        .eq('practitioner_id', admin.id)
        .maybeSingle()
      const orgName   = orgRow?.business_name ?? `${admin.first_name} ${admin.last_name}'s Practice`
      const inviterName = admin.display_name ?? `${admin.first_name} ${admin.last_name}`
      const roleLabel   = ROLE_LABELS[role] ?? role

      await sendEmail({
        to: email,
        toName: fullName || undefined,
        subject: `You've been invited to join ${orgName} on Worklyn`,
        html: buildInviteEmail({
          inviteeName: fullName,
          inviteeEmail: email,
          inviterName,
          orgName,
          roleLabel,
          signupUrl,
        }),
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      console.error('[addClinicMember] invite email failed:', msg)
      warning = `Invite created, but the email couldn't be sent (${msg}). Contact them directly at ${email}.`
    }

    revalidatePath('/dashboard/team')
    return warning ? { success: true, warning } : { success: true }
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
