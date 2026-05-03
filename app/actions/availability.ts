'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/auth'
import { getPractitionerByUserId } from '@/lib/db'

// ---------------------------------------------------------------------------
// Availability rules
// ---------------------------------------------------------------------------
export async function saveAvailabilityRules(formData: FormData) {
  const user = await requireAuth()
  const practitioner = await getPractitionerByUserId(user.id)
  const supabase = await createServerSupabaseClient()

  // Delete all existing rules and replace — simpler than upsert per day
  await supabase
    .from('availability_rules')
    .delete()
    .eq('practitioner_id', practitioner.id)

  const days: { day: number; start: string; end: string }[] = []

  for (let day = 0; day <= 6; day++) {
    const enabled = formData.get(`day_${day}_enabled`)
    if (!enabled) continue
    const start = formData.get(`day_${day}_start`) as string
    const end = formData.get(`day_${day}_end`) as string
    if (!start || !end) continue
    days.push({ day, start, end })
  }

  if (days.length > 0) {
    const { error } = await supabase.from('availability_rules').insert(
      days.map((d) => ({
        practitioner_id: practitioner.id,
        day_of_week: d.day,
        start_time: d.start,
        end_time: d.end,
      })),
    )
    if (error) throw error
  }

  // Save buffer minutes to practitioner settings (via metadata column we'll use)
  const bufferMinutes = parseInt(formData.get('buffer_minutes') as string) || 0
  await supabase
    .from('practitioners')
    .update({ buffer_minutes: bufferMinutes } as never)
    .eq('id', practitioner.id)

  revalidatePath('/dashboard/availability')
  return { success: true }
}

// ---------------------------------------------------------------------------
// Blocked times
// ---------------------------------------------------------------------------
export async function addBlockedTime(formData: FormData) {
  const user = await requireAuth()
  const practitioner = await getPractitionerByUserId(user.id)
  const supabase = await createServerSupabaseClient()

  const date = formData.get('date') as string
  const startTime = formData.get('start_time') as string
  const endTime = formData.get('end_time') as string
  const reason = (formData.get('reason') as string) || null

  if (!date || !startTime || !endTime) return { error: 'Missing required fields' }

  const startISO = `${date}T${startTime}:00`
  const endISO = `${date}T${endTime}:00`

  const { error } = await supabase.from('blocked_times').insert({
    practitioner_id: practitioner.id,
    start_time: startISO,
    end_time: endISO,
    reason,
  })

  if (error) return { error: error.message }

  revalidatePath('/dashboard/availability')
  return { success: true }
}

export async function deleteBlockedTime(id: string) {
  const user = await requireAuth()
  const practitioner = await getPractitionerByUserId(user.id)
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from('blocked_times')
    .delete()
    .eq('id', id)
    .eq('practitioner_id', practitioner.id) // RLS double-check

  if (error) throw error

  revalidatePath('/dashboard/availability')
}
