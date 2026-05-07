'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/auth'
import { getPractitionerByUserId, getAppointmentById, getSessionNoteByAppointmentId } from '@/lib/db'
import { generateSessionReport, generateTherapyNoteText } from '@/services/ai'
import { formatDate } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Generate professional narrative from structured therapy note data
// ---------------------------------------------------------------------------

export async function generateProfessionalNote({
  formattedNote,
  clientName,
  serviceName,
}: {
  formattedNote: string
  clientName?: string
  serviceName?: string
}): Promise<{ text?: string; error?: string }> {
  await requireAuth()

  try {
    const text = await generateTherapyNoteText({ formattedNote, clientName, serviceName })
    return { text }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'AI generation failed.' }
  }
}

// ---------------------------------------------------------------------------
// Save (upsert) a structured session note
// ---------------------------------------------------------------------------

export async function saveSessionNote(appointmentId: string, formData: FormData) {
  const user = await requireAuth()
  const practitioner = await getPractitionerByUserId(user.id)
  const supabase = await createServerSupabaseClient()

  const payload = {
    practitioner_id: practitioner.id,
    appointment_id: appointmentId,
    content: '',
    is_private: formData.get('is_private') === 'on',
    goals_addressed: (formData.get('goals_addressed') as string).trim() || null,
    observations: (formData.get('observations') as string).trim() || null,
    interventions_used: (formData.get('interventions_used') as string).trim() || null,
    participant_response: (formData.get('participant_response') as string).trim() || null,
    risks_issues: (formData.get('risks_issues') as string).trim() || null,
    next_steps: (formData.get('next_steps') as string).trim() || null,
    progress_score: formData.get('progress_score')
      ? Number(formData.get('progress_score'))
      : null,
  }

  const existing = await getSessionNoteByAppointmentId(appointmentId)

  let noteId: string
  if (existing) {
    const { data, error } = await supabase
      .from('session_notes')
      .update(payload)
      .eq('id', existing.id)
      .eq('practitioner_id', practitioner.id)
      .select('id')
      .single()
    if (error) return { error: error.message }
    noteId = data.id
  } else {
    const { data, error } = await supabase
      .from('session_notes')
      .insert(payload)
      .select('id')
      .single()
    if (error) return { error: error.message }
    noteId = data.id
  }

  revalidatePath(`/dashboard/appointments/${appointmentId}`)
  return { success: true, noteId }
}

// ---------------------------------------------------------------------------
// Generate AI report draft from a saved session note
// ---------------------------------------------------------------------------

export async function generateAIReport(
  noteId: string,
  appointmentId: string,
): Promise<{ text?: string; error?: string }> {
  const user = await requireAuth()
  const practitioner = await getPractitionerByUserId(user.id)
  const supabase = await createServerSupabaseClient()

  const [{ data: note }, appointment] = await Promise.all([
    supabase
      .from('session_notes')
      .select('*')
      .eq('id', noteId)
      .eq('practitioner_id', practitioner.id)
      .single(),
    getAppointmentById(practitioner.id, appointmentId),
  ])

  if (!note) return { error: 'Session note not found.' }

  const client = appointment.clients as { first_name: string } | null
  const service = appointment.services as { name: string } | null

  try {
    const text = await generateSessionReport({
      clientFirstName: client?.first_name ?? 'Client',
      appointmentDate: formatDate(appointment.start_time),
      serviceName: service?.name ?? 'Session',
      goalsAddressed: note.goals_addressed ?? '',
      observations: note.observations ?? '',
      interventionsUsed: note.interventions_used ?? '',
      participantResponse: note.participant_response ?? '',
      risksIssues: note.risks_issues ?? '',
      nextSteps: note.next_steps ?? '',
      progressScore: note.progress_score ?? 5,
    })
    return { text }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'AI generation failed.' }
  }
}

// ---------------------------------------------------------------------------
// Save final report to the reports table
// ---------------------------------------------------------------------------

export async function saveReport({
  clientId,
  appointmentId,
  draftText,
  finalText,
}: {
  clientId: string
  appointmentId: string
  draftText: string
  finalText: string
}) {
  const user = await requireAuth()
  const practitioner = await getPractitionerByUserId(user.id)
  const supabase = await createServerSupabaseClient()

  const appointment = await getAppointmentById(practitioner.id, appointmentId)
  const title = `Session Report — ${formatDate(appointment.start_time)}`

  const { data: inserted, error } = await supabase
    .from('reports')
    .insert({
      practitioner_id: practitioner.id,
      client_id: clientId,
      type: 'custom',
      title,
      data: {},
      draft_text: draftText,
      final_text: finalText,
      period_start: null,
      period_end: null,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath(`/dashboard/clients/${clientId}`)
  revalidatePath(`/dashboard/appointments/${appointmentId}`)
  return { success: true, reportId: inserted.id }
}
