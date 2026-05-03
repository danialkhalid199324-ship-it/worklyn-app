import { createClient } from '@/lib/supabase'
import type { InsertAppointment, UpdateAppointment } from '@/types/database'

export async function createAppointment(payload: InsertAppointment) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('appointments')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateAppointment(id: string, payload: UpdateAppointment) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('appointments')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function cancelAppointment(id: string) {
  return updateAppointment(id, { status: 'cancelled' })
}

export async function completeAppointment(id: string) {
  return updateAppointment(id, { status: 'completed' })
}
