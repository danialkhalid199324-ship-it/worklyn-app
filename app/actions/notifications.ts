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

  console.log(`[session-notifications] manual reminder requested | session=${sessionId} client=${session.client_id}`)

  const result = await sendSessionNotification(session, practitioner, user.email ?? '', 'reminder')

  if (result.noRecipient) {
    return { error: 'No email address found for this client or their guardian. Add an email to the client profile before sending reminders.' }
  }

  if (!result.sent) {
    return { error: result.error ?? 'Failed to send reminder.' }
  }

  return { success: true }
}
