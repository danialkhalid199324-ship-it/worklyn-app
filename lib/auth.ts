import { createServerSupabaseClient } from './supabase-server'
import { redirect } from 'next/navigation'

// ---------------------------------------------------------------------------
// Auth helpers — all server-side
// ---------------------------------------------------------------------------

export async function getSession() {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.auth.getSession()
  if (error) return null
  return data.session
}

export async function getUser() {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.auth.getUser()
  if (error) return null
  return data.user
}

/** Redirect unauthenticated users to /auth/login */
export async function requireAuth() {
  const user = await getUser()
  if (!user) redirect('/auth/login')
  return user
}

/** Redirect authenticated users away from auth pages */
export async function requireGuest() {
  const user = await getUser()
  if (user) redirect('/dashboard')
}

export async function signOut() {
  const supabase = await createServerSupabaseClient()
  await supabase.auth.signOut()
  redirect('/auth/login')
}
