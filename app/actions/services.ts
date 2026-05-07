'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/auth'
import { getPractitionerByUserId } from '@/lib/db'
import type { UnitType } from '@/types/database'

// ---------------------------------------------------------------------------
// Example NDIS services — seeded on first use
// ---------------------------------------------------------------------------

/** Round a rate to 2 decimal places. */
function r(v: number) { return Math.round(v * 100) / 100 }

const EXAMPLE_SERVICES: Array<{
  name: string
  category: string
  ndis_line_item: string
  default_rate: number
  weekday_rate: number
  saturday_rate: number
  sunday_rate: number
  public_holiday_rate: number
  unit_type: UnitType
  gst_applicable: boolean
}> = [
  {
    name: 'Occupational Therapy',
    category: 'Therapy',
    ndis_line_item: '15_056_0128_1_3',
    default_rate: 193.99,
    weekday_rate: 193.99,
    saturday_rate: r(193.99 * 1.25),
    sunday_rate: r(193.99 * 1.35),
    public_holiday_rate: r(193.99 * 1.65),
    unit_type: 'hourly',
    gst_applicable: false,
  },
  {
    name: 'Psychology',
    category: 'Therapy',
    ndis_line_item: '15_056_0128_1_3',
    default_rate: 214.41,
    weekday_rate: 214.41,
    saturday_rate: r(214.41 * 1.25),
    sunday_rate: r(214.41 * 1.35),
    public_holiday_rate: r(214.41 * 1.65),
    unit_type: 'hourly',
    gst_applicable: false,
  },
  {
    name: 'Behaviour Support',
    category: 'Behaviour Support',
    ndis_line_item: '07_002_0106_1_3',
    default_rate: 213.28,
    weekday_rate: 213.28,
    saturday_rate: r(213.28 * 1.25),
    sunday_rate: r(213.28 * 1.35),
    public_holiday_rate: r(213.28 * 1.65),
    unit_type: 'hourly',
    gst_applicable: false,
  },
  {
    name: 'Support Coordination',
    category: 'Support Coordination',
    ndis_line_item: '07_002_0106_1_3',
    default_rate: 100.14,
    weekday_rate: 100.14,
    saturday_rate: r(100.14 * 1.25),
    sunday_rate: r(100.14 * 1.35),
    public_holiday_rate: r(100.14 * 1.65),
    unit_type: 'hourly',
    gst_applicable: false,
  },
  {
    name: 'Support Work',
    category: 'Support Work',
    ndis_line_item: '01_011_0107_1_1',
    default_rate: 67.56,
    weekday_rate: 67.56,
    saturday_rate: r(67.56 * 1.25),
    sunday_rate: r(67.56 * 1.35),
    public_holiday_rate: r(67.56 * 1.65),
    unit_type: 'hourly',
    gst_applicable: false,
  },
  {
    name: 'Community Access',
    category: 'Community Access',
    ndis_line_item: '04_104_0125_6_1',
    default_rate: 67.56,
    weekday_rate: 67.56,
    saturday_rate: r(67.56 * 1.25),
    sunday_rate: r(67.56 * 1.35),
    public_holiday_rate: r(67.56 * 1.65),
    unit_type: 'hourly',
    gst_applicable: false,
  },
]

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export async function upsertService(
  serviceId: string | null,
  formData: FormData,
): Promise<{ success?: true; error?: string }> {
  const user = await requireAuth()
  const practitioner = await getPractitionerByUserId(user.id)
  const supabase = await createServerSupabaseClient()

  const name = (formData.get('name') as string)?.trim()
  if (!name) return { error: 'Service name is required.' }

  function parseRate(field: string): number | null {
    const raw = formData.get(field) as string
    if (!raw || raw.trim() === '') return null
    const val = parseFloat(raw)
    return isNaN(val) || val < 0 ? null : val
  }

  const defaultRate = parseRate('default_rate')
  const weekdayRate = parseRate('weekday_rate')
  const saturdayRate = parseRate('saturday_rate')
  const sundayRate = parseRate('sunday_rate')
  const phRate = parseRate('public_holiday_rate')

  const payload = {
    practitioner_id: practitioner.id,
    name,
    category: (formData.get('category') as string)?.trim() || null,
    ndis_line_item: (formData.get('ndis_line_item') as string)?.trim() || null,
    support_item_number: (formData.get('support_item_number') as string)?.trim() || null,
    default_rate: defaultRate,
    weekday_rate: weekdayRate,
    saturday_rate: saturdayRate,
    sunday_rate: sundayRate,
    public_holiday_rate: phRate,
    unit_type: ((formData.get('unit_type') as string) || 'hourly') as UnitType,
    gst_applicable: formData.get('gst_applicable') === 'true',
    // Legacy booking defaults so existing appointment queries don't break
    description: null as string | null,
    duration_minutes: 60,
    price_cents: defaultRate ? Math.round(defaultRate * 100) : 0,
    currency: 'AUD',
  }

  if (serviceId) {
    const { error } = await supabase
      .from('services')
      .update(payload)
      .eq('id', serviceId)
      .eq('practitioner_id', practitioner.id)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from('services')
      .insert({ ...payload, is_active: true })
    if (error) return { error: error.message }
  }

  revalidatePath('/dashboard/services')
  revalidatePath('/dashboard/sessions')
  return { success: true }
}

export async function toggleServiceActive(
  serviceId: string,
): Promise<{ success?: true; error?: string }> {
  const user = await requireAuth()
  const practitioner = await getPractitionerByUserId(user.id)
  const supabase = await createServerSupabaseClient()

  const { data: row } = await supabase
    .from('services')
    .select('is_active')
    .eq('id', serviceId)
    .eq('practitioner_id', practitioner.id)
    .single()

  if (!row) return { error: 'Service not found.' }

  const { error } = await supabase
    .from('services')
    .update({ is_active: !(row as unknown as { is_active: boolean }).is_active })
    .eq('id', serviceId)
    .eq('practitioner_id', practitioner.id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/services')
  revalidatePath('/dashboard/sessions')
  return { success: true }
}

export async function deleteService(
  serviceId: string,
): Promise<{ success?: true; error?: string; inUse?: boolean }> {
  const user = await requireAuth()
  const practitioner = await getPractitionerByUserId(user.id)
  const supabase = await createServerSupabaseClient()

  // Block deletion if any session references this service
  const { count } = await supabase
    .from('sessions')
    .select('*', { count: 'exact', head: true })
    .eq('practitioner_id', practitioner.id)
    .eq('service_id', serviceId)

  if (count && count > 0) {
    return { inUse: true, error: 'This service is used in existing sessions.' }
  }

  const { error } = await supabase
    .from('services')
    .delete()
    .eq('id', serviceId)
    .eq('practitioner_id', practitioner.id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/services')
  revalidatePath('/dashboard/sessions')
  return { success: true }
}

export async function seedExampleServices(): Promise<{ success?: true; error?: string }> {
  const user = await requireAuth()
  const practitioner = await getPractitionerByUserId(user.id)
  const supabase = await createServerSupabaseClient()

  const { count } = await supabase
    .from('services')
    .select('*', { count: 'exact', head: true })
    .eq('practitioner_id', practitioner.id)

  if (count && count > 0) {
    return { error: 'Services already exist — clear them first if you want to re-seed.' }
  }

  const rows = EXAMPLE_SERVICES.map((s) => ({
    practitioner_id: practitioner.id,
    name: s.name,
    category: s.category,
    ndis_line_item: s.ndis_line_item,
    default_rate: s.default_rate,
    weekday_rate: s.weekday_rate,
    saturday_rate: s.saturday_rate,
    sunday_rate: s.sunday_rate,
    public_holiday_rate: s.public_holiday_rate,
    unit_type: s.unit_type,
    gst_applicable: s.gst_applicable,
    description: null,
    duration_minutes: 60,
    price_cents: Math.round(s.default_rate * 100),
    currency: 'AUD',
    color: null,
    is_active: true,
  }))

  const { error } = await supabase.from('services').insert(rows)
  if (error) return { error: error.message }

  revalidatePath('/dashboard/services')
  revalidatePath('/dashboard/sessions')
  return { success: true }
}
