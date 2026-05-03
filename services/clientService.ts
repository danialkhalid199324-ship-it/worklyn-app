import { createClient } from '@/lib/supabase'
import type { InsertClient, UpdateClient } from '@/types/database'

export async function createClient_(payload: InsertClient) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('clients')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateClient(id: string, payload: UpdateClient) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('clients')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function archiveClient(id: string) {
  return updateClient(id, { is_active: false })
}
