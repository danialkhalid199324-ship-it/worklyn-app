import { cache } from 'react'
import { createServerSupabaseClient } from './supabase-server'
import { redirect } from 'next/navigation'
import type { PractitionerRow } from '@/types/database'

// ---------------------------------------------------------------------------
// Auth helpers — all server-side.
// Wrapped in React.cache() so repeated calls within the same server render
// (e.g. layout + page) only hit Supabase once per request.
// ---------------------------------------------------------------------------

export const getUser = cache(async () => {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.auth.getUser()
  if (error) return null
  return data.user
})

export async function getSession() {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.auth.getSession()
  if (error) return null
  return data.session
}

/** Redirect unauthenticated users to /auth/login. */
export const requireAuth = cache(async () => {
  const user = await getUser()
  if (!user) redirect('/auth/login')
  return user
})

/**
 * Auth + practitioner fetch in a single Supabase client.
 * Saves one round-trip vs calling requireAuth() + getPractitionerByUserId()
 * separately, and is cached per server render via React.cache().
 */
export const requireAuthWithPractitioner = cache(async () => {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) redirect('/auth/login')
  const { data: practitioner, error: pErr } = await supabase
    .from('practitioners')
    .select('*')
    .eq('user_id', user.id)
    .single()
  if (pErr || !practitioner) redirect('/auth/login')
  return { user, practitioner: practitioner as unknown as PractitionerRow }
})

/** Redirect authenticated users away from auth pages. */
export async function requireGuest() {
  const user = await getUser()
  if (user) redirect('/dashboard')
}

export async function signOut() {
  const supabase = await createServerSupabaseClient()
  await supabase.auth.signOut()
  redirect('/auth/login')
}
