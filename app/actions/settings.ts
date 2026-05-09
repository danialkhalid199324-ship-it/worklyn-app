'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth'
import { getPractitionerByUserId } from '@/lib/db'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'

export async function savePractitionerProfile(formData: FormData) {
  const user = await requireAuth()
  const practitioner = await getPractitionerByUserId(user.id)
  const supabase = await createServerSupabaseClient()

  const calendarColor = (formData.get('calendar_color') as string)?.trim()

  const { error } = await supabase
    .from('practitioners')
    .update({
      first_name: (formData.get('first_name') as string)?.trim(),
      last_name: (formData.get('last_name') as string)?.trim(),
      display_name: (formData.get('display_name') as string)?.trim() || null,
      phone: (formData.get('phone') as string)?.trim() || null,
      bio: (formData.get('bio') as string)?.trim() || null,
      provider_number: (formData.get('provider_number') as string)?.trim() || null,
      ...(calendarColor && /^#[0-9A-Fa-f]{6}$/.test(calendarColor) ? { calendar_color: calendarColor } : {}),
    })
    .eq('id', practitioner.id)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/settings')
  return { success: true }
}

export async function saveOrgSettings(formData: FormData) {
  const user = await requireAuth()
  const practitioner = await getPractitionerByUserId(user.id)
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from('organisation_settings')
    .upsert(
      {
        practitioner_id: practitioner.id,
        business_name: (formData.get('business_name') as string)?.trim() || null,
        abn: (formData.get('abn') as string)?.trim() || null,
        bank_account_name: (formData.get('bank_account_name') as string)?.trim() || null,
        bsb: (formData.get('bsb') as string)?.trim() || null,
        account_number: (formData.get('account_number') as string)?.trim() || null,
        payment_reference_prefix: (formData.get('payment_reference_prefix') as string)?.trim() || null,
      },
      { onConflict: 'practitioner_id' },
    )

  if (error) return { error: error.message }
  revalidatePath('/dashboard/settings')
  revalidatePath('/dashboard/invoices')
  return { success: true }
}

const LOGO_BUCKET = 'organisation-logos'

export async function uploadOrgLogo(formData: FormData) {
  const user = await requireAuth()
  const practitioner = await getPractitionerByUserId(user.id)
  const admin = createAdminClient()

  const file = formData.get('logo') as File
  if (!file || file.size === 0) return { error: 'No file provided.' }

  const allowed = ['image/png', 'image/jpeg', 'image/jpg']
  if (!allowed.includes(file.type)) return { error: 'Only PNG or JPG images are allowed.' }
  if (file.size > 2 * 1024 * 1024) return { error: 'Image must be under 2 MB.' }

  // Path: {organisation_id}/logo.png  (content-type header drives actual format)
  const filePath = `${practitioner.id}/logo.png`

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const { error: uploadErr } = await admin.storage
    .from(LOGO_BUCKET)
    .upload(filePath, buffer, { contentType: file.type, upsert: true })

  if (uploadErr) {
    if (uploadErr.message.toLowerCase().includes('bucket')) {
      return { error: 'Organisation logo storage bucket is not configured. Please create the "organisation-logos" bucket in Supabase Storage.' }
    }
    return { error: uploadErr.message }
  }

  const { data: { publicUrl } } = admin.storage.from(LOGO_BUCKET).getPublicUrl(filePath)

  // Append a version param so browsers always fetch the latest file after re-upload
  const versionedUrl = `${publicUrl}?v=${Date.now()}`

  const supabase = await createServerSupabaseClient()
  const { error: dbErr } = await supabase
    .from('organisation_settings')
    .upsert(
      { practitioner_id: practitioner.id, logo_url: versionedUrl },
      { onConflict: 'practitioner_id' },
    )

  if (dbErr) return { error: dbErr.message }

  revalidatePath('/dashboard/settings')
  revalidatePath('/dashboard')
  return { success: true, url: versionedUrl }
}
