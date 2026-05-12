'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/auth'
import { getPractitionerByUserId } from '@/lib/db'

const BUCKET = 'client-documents'
const MAX_BYTES = 50 * 1024 * 1024 // 50 MB

export async function uploadDocument(
  formData: FormData,
): Promise<{ success?: true; error?: string }> {
  const user = await requireAuth()
  const practitioner = await getPractitionerByUserId(user.id)
  const supabase = await createServerSupabaseClient()
  const admin = createAdminClient()

  const clientId = (formData.get('client_id') as string)?.trim()
  const category = (formData.get('document_category') as string)?.trim() || 'Other'
  const file = formData.get('file') as File | null

  if (!clientId || !file || file.size === 0) return { error: 'Select a file to upload.' }
  if (file.size > MAX_BYTES) return { error: 'File exceeds the 50 MB limit.' }

  // Verify client is accessible under current user's RLS scope
  const { data: clientCheck } = await supabase
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .single()
  if (!clientCheck) return { error: 'Client not found.' }

  const ext = file.name.split('.').pop() ?? ''
  const storagePath = `${practitioner.id}/${clientId}/${crypto.randomUUID()}${ext ? `.${ext}` : ''}`

  const bytes = await file.arrayBuffer()
  const { error: uploadErr } = await admin.storage
    .from(BUCKET)
    .upload(storagePath, Buffer.from(bytes), {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    })
  if (uploadErr) return { error: `Upload failed: ${uploadErr.message}` }

  const { error: dbErr } = await supabase
    .from('client_documents')
    .insert({
      practitioner_id: practitioner.id,
      client_id: clientId,
      file_name: file.name,
      file_path: storagePath,
      file_type: file.type || 'application/octet-stream',
      file_size: file.size,
      document_category: category,
      uploaded_by: user.id,
    })

  if (dbErr) {
    await admin.storage.from(BUCKET).remove([storagePath])
    return { error: `Database error: ${dbErr.message}` }
  }

  revalidatePath(`/dashboard/clients/${clientId}`)
  return { success: true }
}

export async function getDocumentSignedUrl(
  documentId: string,
): Promise<{ url?: string; error?: string }> {
  await requireAuth()
  const supabase = await createServerSupabaseClient()
  const admin = createAdminClient()

  // RLS enforces visibility; no extra ownership check needed
  const { data: doc } = await supabase
    .from('client_documents')
    .select('file_path')
    .eq('id', documentId)
    .single()
  if (!doc) return { error: 'Document not found.' }

  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(doc.file_path, 120) // 2-minute TTL
  if (error || !data?.signedUrl) return { error: 'Could not generate link.' }
  return { url: data.signedUrl }
}

export async function renameDocument(
  documentId: string,
  newName: string,
): Promise<{ error?: string }> {
  const user = await requireAuth()
  const practitioner = await getPractitionerByUserId(user.id)
  const supabase = await createServerSupabaseClient()

  const trimmed = newName.trim()
  if (!trimmed) return { error: 'Document name cannot be empty.' }

  const { data, error } = await supabase
    .from('client_documents')
    .update({ file_name: trimmed })
    .eq('id', documentId)
    .eq('practitioner_id', practitioner.id)
    .select('client_id')
    .single()

  if (error) return { error: error.message }
  if (data?.client_id) revalidatePath(`/dashboard/clients/${data.client_id}`)
  return {}
}

export async function deleteDocument(
  documentId: string,
): Promise<{ error?: string }> {
  const user = await requireAuth()
  const practitioner = await getPractitionerByUserId(user.id)
  const supabase = await createServerSupabaseClient()
  const admin = createAdminClient()

  const { data: doc } = await supabase
    .from('client_documents')
    .select('file_path, client_id')
    .eq('id', documentId)
    .eq('practitioner_id', practitioner.id)
    .single()
  if (!doc) return { error: 'Document not found.' }

  // Remove from storage (non-fatal if already gone)
  await admin.storage.from(BUCKET).remove([doc.file_path])

  const { error } = await supabase
    .from('client_documents')
    .delete()
    .eq('id', documentId)
    .eq('practitioner_id', practitioner.id)
  if (error) return { error: error.message }

  revalidatePath(`/dashboard/clients/${doc.client_id}`)
  return {}
}
