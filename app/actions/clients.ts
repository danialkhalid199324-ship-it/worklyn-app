'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/auth'
import { getPractitionerByUserId } from '@/lib/db'

export async function createClient(formData: FormData) {
  const user = await requireAuth()
  const practitioner = await getPractitionerByUserId(user.id)
  const supabase = await createServerSupabaseClient()

  const fundingType = (formData.get('funding_type') as string).trim() || null
  const mgmtType = fundingType === 'NDIS'
    ? (formData.get('ndis_management_type') as string).trim() || null
    : null

  const { error } = await supabase.from('clients').insert({
    practitioner_id: practitioner.id,
    first_name: (formData.get('first_name') as string).trim(),
    last_name: (formData.get('last_name') as string).trim(),
    email: (formData.get('email') as string).trim() || null,
    phone: (formData.get('phone') as string).trim() || null,
    date_of_birth: (formData.get('date_of_birth') as string) || null,
    address: (formData.get('address') as string).trim() || null,
    notes: (formData.get('notes') as string).trim() || null,
    funding_type: fundingType,
    ndis_number: fundingType === 'NDIS' ? (formData.get('ndis_number') as string).trim() || null : null,
    ndis_management_type: mgmtType,
    self_manager_name:     mgmtType === 'Self-managed' ? (formData.get('self_manager_name') as string).trim() || null : null,
    self_manager_relation: mgmtType === 'Self-managed' ? (formData.get('self_manager_relation') as string).trim() || null : null,
    self_manager_email:    mgmtType === 'Self-managed' ? (formData.get('self_manager_email') as string).trim() || null : null,
    self_manager_phone:    mgmtType === 'Self-managed' ? (formData.get('self_manager_phone') as string).trim() || null : null,
    plan_manager_name:     mgmtType === 'Plan-managed' ? (formData.get('plan_manager_name') as string).trim() || null : null,
    plan_manager_email:    mgmtType === 'Plan-managed' ? (formData.get('plan_manager_email') as string).trim() || null : null,
    plan_manager_phone:    mgmtType === 'Plan-managed' ? (formData.get('plan_manager_phone') as string).trim() || null : null,
    medicare_number: fundingType === 'Medicare' ? (formData.get('medicare_number') as string).trim() || null : null,
    is_active: true,
  })

  if (error) return { error: error.message }
  revalidatePath('/dashboard/clients')
  return { success: true }
}

export async function updateClient(id: string, formData: FormData) {
  const user = await requireAuth()
  const practitioner = await getPractitionerByUserId(user.id)
  const supabase = await createServerSupabaseClient()

  const fundingType = (formData.get('funding_type') as string).trim() || null
  const mgmtType = fundingType === 'NDIS'
    ? (formData.get('ndis_management_type') as string).trim() || null
    : null

  const { error } = await supabase
    .from('clients')
    .update({
      first_name: (formData.get('first_name') as string).trim(),
      last_name: (formData.get('last_name') as string).trim(),
      email: (formData.get('email') as string).trim() || null,
      phone: (formData.get('phone') as string).trim() || null,
      date_of_birth: (formData.get('date_of_birth') as string) || null,
      address: (formData.get('address') as string).trim() || null,
      notes: (formData.get('notes') as string).trim() || null,
      funding_type: fundingType,
      ndis_number: fundingType === 'NDIS' ? (formData.get('ndis_number') as string).trim() || null : null,
      ndis_management_type: mgmtType,
      self_manager_name:     mgmtType === 'Self-managed' ? (formData.get('self_manager_name') as string).trim() || null : null,
      self_manager_relation: mgmtType === 'Self-managed' ? (formData.get('self_manager_relation') as string).trim() || null : null,
      self_manager_email:    mgmtType === 'Self-managed' ? (formData.get('self_manager_email') as string).trim() || null : null,
      self_manager_phone:    mgmtType === 'Self-managed' ? (formData.get('self_manager_phone') as string).trim() || null : null,
      plan_manager_name:     mgmtType === 'Plan-managed' ? (formData.get('plan_manager_name') as string).trim() || null : null,
      plan_manager_email:    mgmtType === 'Plan-managed' ? (formData.get('plan_manager_email') as string).trim() || null : null,
      plan_manager_phone:    mgmtType === 'Plan-managed' ? (formData.get('plan_manager_phone') as string).trim() || null : null,
      medicare_number: fundingType === 'Medicare' ? (formData.get('medicare_number') as string).trim() || null : null,
    })
    .eq('id', id)
    .eq('practitioner_id', practitioner.id)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/clients')
  revalidatePath(`/dashboard/clients/${id}`)
  return { success: true }
}

export interface BulkClientRow {
  first_name: string
  last_name: string
  email: string
  phone: string
  ndis_number: string
  guardian_name: string
  guardian_email: string
  status: string
}

export async function bulkImportClients(
  rows: BulkClientRow[],
): Promise<{ imported: number; error?: string }> {
  const user = await requireAuth()
  const practitioner = await getPractitionerByUserId(user.id)
  const supabase = await createServerSupabaseClient()

  if (!rows.length) return { imported: 0, error: 'No rows to import.' }

  const records = rows.map((r) => ({
    practitioner_id: practitioner.id,
    first_name: r.first_name.trim(),
    last_name: r.last_name.trim(),
    email: r.email.trim() || null,
    phone: r.phone.trim() || null,
    ndis_number: r.ndis_number.trim() || null,
    self_manager_name: r.guardian_name.trim() || null,
    self_manager_email: r.guardian_email.trim() || null,
    is_active: r.status.trim().toLowerCase() !== 'inactive',
  }))

  const { error } = await supabase.from('clients').insert(records)
  if (error) return { imported: 0, error: error.message }

  revalidatePath('/dashboard/clients')
  return { imported: records.length }
}

export async function toggleClientStatus(id: string, isActive: boolean) {
  const user = await requireAuth()
  const practitioner = await getPractitionerByUserId(user.id)
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from('clients')
    .update({ is_active: isActive })
    .eq('id', id)
    .eq('practitioner_id', practitioner.id)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/clients')
  revalidatePath(`/dashboard/clients/${id}`)
  return { success: true }
}
