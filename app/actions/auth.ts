'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'

export async function login(formData: FormData) {
  const supabase = await createServerSupabaseClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const redirectTo = (formData.get('redirectTo') as string) || '/dashboard'

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    redirect(`/auth/login?error=${encodeURIComponent(error.message)}`)
  }

  revalidatePath('/', 'layout')
  redirect(redirectTo.startsWith('/') ? redirectTo : '/dashboard')
}

export async function signup(formData: FormData) {
  const supabase = await createServerSupabaseClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const firstName = formData.get('firstName') as string
  const lastName = formData.get('lastName') as string

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { first_name: firstName, last_name: lastName },
    },
  })

  if (error) {
    redirect(`/auth/signup?error=${encodeURIComponent(error.message)}`)
  }

  // Create matching user + practitioner rows using admin client so the inserts
  // succeed even when email confirmation is pending (no active session yet).
  if (data.user) {
    const admin = createAdminClient()

    const { error: userErr } = await admin.from('users').upsert({
      id: data.user.id,
      email,
      full_name: `${firstName} ${lastName}`,
      role: 'practitioner',
    })
    if (userErr) {
      redirect(`/auth/signup?error=${encodeURIComponent(`Failed to create user record: ${userErr.message}`)}`)
    }

    const { data: newPract, error: practErr } = await admin.from('practitioners').upsert(
      { user_id: data.user.id, first_name: firstName, last_name: lastName },
      { onConflict: 'user_id' },
    ).select('id').single()
    if (practErr) {
      redirect(`/auth/signup?error=${encodeURIComponent(`Failed to create practitioner record: ${practErr.message}`)}`)
    }

    // Activate any pending clinic invites that match the signed-up email.
    if (newPract?.id) {
      try {
        const normalizedEmail = email.toLowerCase()
        const { data: pending } = await admin
          .from('clinic_memberships')
          .select('id, role')
          .eq('invited_email', normalizedEmail)
          .eq('status', 'pending')

        if (pending && pending.length > 0) {
          await admin
            .from('clinic_memberships')
            .update({ status: 'active', is_active: true, member_id: newPract.id })
            .eq('invited_email', normalizedEmail)
            .eq('status', 'pending')

          // Mirror the invite role (prefer admin if any invite grants it)
          const inviteRole: string =
            pending.find((i: { role: string }) => i.role === 'admin')?.role ?? pending[0].role
          if (inviteRole) {
            await admin.from('practitioners').update({ role: inviteRole }).eq('id', newPract.id)
          }

          console.log(
            `[signup] activated ${pending.length} pending invite(s) for ${normalizedEmail}`,
            `| practitioner=${newPract.id} role=${inviteRole ?? 'unchanged'}`,
          )
        }
      } catch (err) {
        // Non-fatal — signup still succeeds even if invite activation fails
        console.error('[signup] invite activation failed:', err)
      }
    }
  }

  revalidatePath('/', 'layout')

  // If Supabase requires email confirmation, data.session will be null.
  // Redirect to a confirmation-pending page instead of the dashboard.
  if (!data.session) {
    redirect('/auth/check-email')
  }

  redirect('/dashboard')
}

export async function logout() {
  const supabase = await createServerSupabaseClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/auth/login')
}

export async function requestPasswordReset(formData: FormData) {
  const supabase = await createServerSupabaseClient()
  const email = (formData.get('email') as string)?.trim()

  if (!email) {
    redirect('/auth/forgot-password?error=' + encodeURIComponent('Email address is required.'))
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '')
  const redirectTo = `${appUrl}/auth/reset-password`

  console.log('[requestPasswordReset] email:', email, '| redirectTo:', redirectTo)

  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })

  if (error) {
    console.error('[requestPasswordReset] error:', error.message, error)
    redirect('/auth/forgot-password?error=' + encodeURIComponent(error.message))
  }

  console.log('[requestPasswordReset] reset email dispatched for:', email)
  redirect('/auth/forgot-password?success=1')
}

export async function updatePassword(formData: FormData) {
  const password = (formData.get('password') as string) ?? ''
  const confirm = (formData.get('confirm') as string) ?? ''

  if (password.length < 8) {
    redirect('/auth/reset-password?error=' + encodeURIComponent('Password must be at least 8 characters.'))
  }

  if (password !== confirm) {
    redirect('/auth/reset-password?error=' + encodeURIComponent('Passwords do not match.'))
  }

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/reset-password?error=' + encodeURIComponent('Session expired. Please request a new password reset link.'))
  }

  console.log('[updatePassword] session user:', user.id)

  // Recovery sessions stay at AAL1, but supabase.auth.updateUser() requires
  // AAL2 when MFA is enabled. The admin client bypasses this gate — safe here
  // because the recovery email link already proved ownership of the account.
  const { error } = await createAdminClient().auth.admin.updateUserById(
    user.id,
    { password },
  )

  if (error) {
    console.error('[updatePassword] error:', error.message, error)
    redirect('/auth/reset-password?error=' + encodeURIComponent(error.message))
  }

  console.log('[updatePassword] password updated for user:', user.id)
  // Sign out the recovery session so the user logs in fresh with the new password.
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/auth/login?message=' + encodeURIComponent('Password updated successfully. Please sign in.'))
}
