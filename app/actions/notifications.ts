'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/auth'
import { getPractitionerByUserId, getSessionNotifications } from '@/lib/db'
import { sendSessionNotification } from '@/lib/session-notifications'
import type { SessionNotificationRow, SessionRow } from '@/types/database'

/** Returns all notification records for a session (most recent first). */
export async function fetchSessionNotifications(
  sessionId: string,
): Promise<SessionNotificationRow[]> {
  const user = await requireAuth()
  const practitioner = await getPractitionerByUserId(user.id)
  return getSessionNotifications(practitioner.id, sessionId)
}

/** Sends a reminder email for a session and records the attempt. */
export async function sendSessionReminder(
  sessionId: string,
): Promise<{ success?: true; error?: string }> {
  const user = await requireAuth()
  const practitioner = await getPractitionerByUserId(user.id)
  const supabase = await createServerSupabaseClient()

  const { data: raw, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('practitioner_id', practitioner.id)
    .single()

  if (error || !raw) return { error: 'Session not found.' }
  const session = raw as unknown as SessionRow

  try {
    await sendSessionNotification(session, practitioner, user.email ?? '', 'reminder')
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to send reminder.' }
  }

  // sendSessionNotification never throws — it logs failures internally and marks
  // the DB record as 'failed'. Check the record to surface the real outcome.
  const { data: notif } = await supabase
    .from('session_notifications')
    .select('status, error_message')
    .eq('session_id', sessionId)
    .eq('type', 'reminder')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (notif?.status === 'failed') {
    return { error: notif.error_message ?? 'Failed to send reminder.' }
  }

  return { success: true }
}
