'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/auth'
import {
  getPractitionerByUserId,
  getClientProgressHistory,
  getClientSessionFrequency,
} from '@/lib/db'
import { generateReportPDF } from '@/services/pdf'

export async function generateAndStorePDF(
  reportId: string,
): Promise<{ url?: string; error?: string }> {
  const user = await requireAuth()
  const practitioner = await getPractitionerByUserId(user.id)
  const supabase = await createServerSupabaseClient()
  const admin = createAdminClient()

  // Fetch the report
  const { data: report, error: reportErr } = await supabase
    .from('reports')
    .select('*')
    .eq('id', reportId)
    .eq('practitioner_id', practitioner.id)
    .single()

  if (reportErr || !report) return { error: 'Report not found.' }
  if (!report.final_text) return { error: 'Report has no final text. Save the report first.' }
  if (!report.client_id) return { error: 'Report has no associated client.' }

  // Fetch client name
  const { data: client } = await supabase
    .from('clients')
    .select('first_name, last_name')
    .eq('id', report.client_id)
    .single()

  // Fetch chart data
  const [progressData, frequencyData] = await Promise.all([
    getClientProgressHistory(practitioner.id, report.client_id),
    getClientSessionFrequency(practitioner.id, report.client_id),
  ])

  const practitionerName =
    practitioner.display_name ??
    `${practitioner.first_name} ${practitioner.last_name}`

  const clientName = client
    ? `${client.first_name} ${client.last_name}`
    : 'Client'

  // Generate PDF buffer
  let pdfBuffer: Buffer
  try {
    pdfBuffer = await generateReportPDF({
      practitionerName,
      clientName,
      reportTitle: report.title,
      finalText: report.final_text,
      progressData,
      frequencyData,
    })
  } catch (err) {
    return {
      error: `PDF generation failed: ${err instanceof Error ? err.message : String(err)}`,
    }
  }

  // Upload to Supabase Storage (bucket: "reports")
  const filePath = `${practitioner.id}/${reportId}.pdf`
  const { error: uploadErr } = await admin.storage
    .from('reports')
    .upload(filePath, pdfBuffer, { contentType: 'application/pdf', upsert: true })

  if (uploadErr) {
    return { error: `Storage upload failed: ${uploadErr.message}` }
  }

  // Persist path on the report row
  await supabase
    .from('reports')
    .update({ pdf_path: filePath })
    .eq('id', reportId)

  // Create a short-lived signed URL (24 h)
  const { data: signed } = await admin.storage
    .from('reports')
    .createSignedUrl(filePath, 60 * 60 * 24)

  return { url: signed?.signedUrl }
}
