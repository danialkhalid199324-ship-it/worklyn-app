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

    const { error: practErr } = await admin.from('practitioners').upsert(
      { user_id: data.user.id, first_name: firstName, last_name: lastName },
      { onConflict: 'user_id' },
    )
    if (practErr) {
      redirect(`/auth/signup?error=${encodeURIComponent(`Failed to create practitioner record: ${practErr.message}`)}`)
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
  const redirectTo = `${appUrl}/auth/confirm?next=/auth/reset-password`

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
  console.log('[updatePassword] session user:', user?.id ?? 'none')

  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    console.error('[updatePassword] error:', error.message, error)
    redirect('/auth/reset-password?error=' + encodeURIComponent(error.message))
  }

  console.log('[updatePassword] password updated for user:', user?.id)
  revalidatePath('/', 'layout')
  redirect('/auth/login?message=' + encodeURIComponent('Password updated successfully. Please sign in.'))
}
