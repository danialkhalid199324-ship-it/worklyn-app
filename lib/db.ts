import { cache } from 'react'
import { createServerSupabaseClient } from './supabase-server'
import type {
  PractitionerRow,
  ClientRow,
  ServiceRow,
  AvailabilityRuleRow,
  SessionNoteRow,
  SessionRow,
  InvoiceRow,
  InvoiceItemRow,
  OrgSettingsRow,
  SessionNotificationRow,
  NdisPriceGuideRow,
  FundingAllocationRow,
  ClinicMembershipRow,
  ClientDocumentRow,
} from '@/types/database'

export type ClinicMemberWithProfile = ClinicMembershipRow & {
  member: PractitionerRow | null  // null for pending invites (no practitioner row yet)
  email?: string
}

// ---------------------------------------------------------------------------
// Generic database query helpers — server-side only.
// Explicit return types override the broken Supabase type inference caused by
// the version mismatch between @supabase/ssr 0.5.x and @supabase/supabase-js 2.103.x.
// ---------------------------------------------------------------------------

export const getPractitionerByUserId = cache(async (userId: string): Promise<PractitionerRow> => {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('practitioners')
    .select('*')
    .eq('user_id', userId)
    .single()
  if (error) throw error
  return data as unknown as PractitionerRow
})

export async function getClients(practitionerId: string): Promise<ClientRow[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('practitioner_id', practitionerId)
    .order('last_name')
  if (error) throw error
  return (data ?? []) as unknown as ClientRow[]
}

/** Active services only — used in session form dropdowns. */
export async function getServices(practitionerId: string): Promise<ServiceRow[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('practitioner_id', practitionerId)
    .eq('is_active', true)
    .order('name')
  if (error) throw error
  return (data ?? []) as unknown as ServiceRow[]
}

/** All services including inactive — used in Services catalogue settings page. */
export async function getAllServices(practitionerId: string): Promise<ServiceRow[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('practitioner_id', practitionerId)
    .order('name')
  if (error) throw error
  return (data ?? []) as unknown as ServiceRow[]
}

export async function getUpcomingAppointments(practitionerId: string, limit = 10) {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('appointments')
    .select('*, clients(first_name, last_name), services(name, duration_minutes)')
    .eq('practitioner_id', practitionerId)
    .gte('start_time', new Date().toISOString())
    .in('status', ['scheduled', 'confirmed'])
    .order('start_time')
    .limit(limit)
  if (error) throw error
  return (data ?? []) as unknown as (import('@/types/database').AppointmentRow & {
    clients: { first_name: string; last_name: string } | null
    services: { name: string; duration_minutes: number } | null
  })[]
}

export type InvoiceWithRelations = InvoiceRow & {
  clients: { first_name: string; last_name: string } | null
  invoice_items: InvoiceItemRow[]
}

export async function getInvoices(practitionerId: string): Promise<InvoiceWithRelations[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('invoices')
    .select('*, clients(first_name, last_name), invoice_items(*)')
    .eq('practitioner_id', practitionerId)
    .order('issued_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as InvoiceWithRelations[]
}

export async function getAvailabilityRules(practitionerId: string): Promise<AvailabilityRuleRow[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('availability_rules')
    .select('*')
    .eq('practitioner_id', practitionerId)
    .order('day_of_week')
  if (error) throw error
  return (data ?? []) as unknown as AvailabilityRuleRow[]
}

export async function getSessionNotes(appointmentId: string): Promise<SessionNoteRow[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('session_notes')
    .select('*')
    .eq('appointment_id', appointmentId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as SessionNoteRow[]
}

export async function getClientById(practitionerId: string, clientId: string): Promise<ClientRow> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('practitioner_id', practitionerId)
    .eq('id', clientId)
    .single()
  if (error) throw error
  return data as unknown as ClientRow
}

export async function getClientAppointments(practitionerId: string, clientId: string) {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('appointments')
    .select('*, services(name, duration_minutes)')
    .eq('practitioner_id', practitionerId)
    .eq('client_id', clientId)
    .order('start_time', { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as (import('@/types/database').AppointmentRow & {
    services: { name: string; duration_minutes: number } | null
  })[]
}

// Unified event row merging both appointments and sessions for a client.
// Sessions that are linked to an appointment (appointment_id IS NOT NULL) are
// excluded to avoid showing the same date twice alongside the calendar appointment.
export type ClientEventRow = {
  id: string
  source: 'appointment' | 'session'
  sort_date: string               // YYYY-MM-DD — used for grouping and sorting
  formatted_date: string          // e.g. "15 Jan 2025"
  start_time_display: string | null  // HH:MM
  end_time_display: string | null    // HH:MM
  service_name: string | null
  status: string
  invoice_id: string | null       // only populated for sessions
  appointment_href: string | null // link to /dashboard/appointments/:id if available
}

export async function getClientEvents(practitionerId: string, clientId: string): Promise<ClientEventRow[]> {
  const supabase = await createServerSupabaseClient()

  const [apptRes, sessRes] = await Promise.all([
    supabase
      .from('appointments')
      .select('id, start_time, end_time, status, services(name)')
      .eq('practitioner_id', practitionerId)
      .eq('client_id', clientId),
    supabase
      .from('sessions')
      .select('id, service_date, start_time, end_time, status, invoice_id, appointment_id, services(name)')
      .eq('practitioner_id', practitionerId)
      .eq('client_id', clientId)
      .is('appointment_id', null),  // exclude sessions already covered by an appointment row
  ])

  const events: ClientEventRow[] = []

  for (const a of apptRes.data ?? []) {
    type ApptShape = { id: string; start_time: string; end_time: string; status: string; services: { name: string } | null }
    const appt = a as unknown as ApptShape
    const start = new Date(appt.start_time)
    const end = new Date(appt.end_time)
    events.push({
      id: appt.id,
      source: 'appointment',
      sort_date: appt.start_time.slice(0, 10),
      formatted_date: start.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }),
      start_time_display: start.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: false }),
      end_time_display: end.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: false }),
      service_name: appt.services?.name ?? null,
      status: appt.status,
      invoice_id: null,
      appointment_href: `/dashboard/appointments/${appt.id}`,
    })
  }

  for (const s of sessRes.data ?? []) {
    const sess = s as unknown as SessionRow & { services: { name: string } | null }
    events.push({
      id: sess.id,
      source: 'session',
      sort_date: sess.service_date,
      formatted_date: new Date(`${sess.service_date}T12:00:00`).toLocaleDateString('en-AU', {
        day: 'numeric', month: 'short', year: 'numeric',
      }),
      start_time_display: sess.start_time ? sess.start_time.slice(0, 5) : null,
      end_time_display: sess.end_time ? sess.end_time.slice(0, 5) : null,
      service_name: sess.services?.name ?? null,
      status: sess.status,
      invoice_id: sess.invoice_id,
      appointment_href: null,
    })
  }

  return events
}

export async function getClientInvoices(practitionerId: string, clientId: string): Promise<InvoiceRow[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('practitioner_id', practitionerId)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as InvoiceRow[]
}

export async function getAppointmentById(practitionerId: string, appointmentId: string) {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('appointments')
    .select('*, clients(id, first_name, last_name, email), services(id, name, duration_minutes)')
    .eq('practitioner_id', practitionerId)
    .eq('id', appointmentId)
    .single()
  if (error) throw error
  return data as unknown as import('@/types/database').AppointmentRow & {
    clients: { id: string; first_name: string; last_name: string; email: string | null } | null
    services: { id: string; name: string; duration_minutes: number } | null
  }
}

export async function getSessionNoteByAppointmentId(appointmentId: string): Promise<SessionNoteRow | null> {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('session_notes')
    .select('*')
    .eq('appointment_id', appointmentId)
    .maybeSingle()
  return data as unknown as SessionNoteRow | null
}

export async function getClientProgressHistory(practitionerId: string, clientId: string) {
  const supabase = await createServerSupabaseClient()
  const { data: appointments } = await supabase
    .from('appointments')
    .select('id, start_time')
    .eq('practitioner_id', practitionerId)
    .eq('client_id', clientId)
    .order('start_time')

  const appts = appointments as unknown as { id: string; start_time: string }[] | null
  if (!appts?.length) return []

  const apptIds = appts.map((a) => a.id)
  const { data: notes } = await supabase
    .from('session_notes')
    .select('appointment_id, progress_score')
    .in('appointment_id', apptIds)
    .not('progress_score', 'is', null)

  const noteList = notes as unknown as { appointment_id: string; progress_score: number | null }[] | null
  if (!noteList?.length) return []

  const scoreMap = new Map(noteList.map((n) => [n.appointment_id, n.progress_score as number]))
  return appts
    .filter((a) => scoreMap.has(a.id))
    .map((a) => ({ date: a.start_time, score: scoreMap.get(a.id)! }))
}

export async function getClientSessionFrequency(practitionerId: string, clientId: string) {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('appointments')
    .select('start_time')
    .eq('practitioner_id', practitionerId)
    .eq('client_id', clientId)
    .order('start_time')

  const rows = data as unknown as { start_time: string }[] | null
  if (!rows?.length) return []

  const counts: Record<string, number> = {}
  rows.forEach(({ start_time }) => {
    const key = start_time.slice(0, 7)
    counts[key] = (counts[key] ?? 0) + 1
  })

  return Object.entries(counts).map(([month, count]) => ({ month, count }))
}

export async function getOrgSettings(practitionerId: string): Promise<OrgSettingsRow | null> {
  try {
    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase
      .from('organisation_settings')
      .select('*')
      .eq('practitioner_id', practitionerId)
      .maybeSingle()
    if (error) return null
    return data as unknown as OrgSettingsRow | null
  } catch {
    return null
  }
}

export type FullInvoice = InvoiceRow & {
  invoice_items: InvoiceItemRow[]
  clients: ClientRow | null
}

export async function getInvoiceById(practitionerId: string, invoiceId: string): Promise<FullInvoice> {
  const supabase = await createServerSupabaseClient()
  console.log('[getInvoiceById] querying id:', invoiceId, 'practitioner:', practitionerId)
  // Use explicit FK column hints to avoid PostgREST ambiguity when resolving relations
  const { data, error } = await supabase
    .from('invoices')
    .select('*, clients!invoices_client_id_fkey(*), invoice_items(*)')
    .eq('practitioner_id', practitionerId)
    .eq('id', invoiceId)
    .single()
  console.log('[getInvoiceById] data:', data ? 'found' : 'null', 'error:', error)
  if (error) throw error
  const row = data as unknown as FullInvoice
  if (!row.invoice_items) (row as unknown as Record<string, unknown>).invoice_items = []
  return row
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export type SessionWithClient = SessionRow & {
  clients: { first_name: string; last_name: string } | null
  invoices: { invoice_number: string } | null
  services: { name: string } | null
  practitioners: { first_name: string; last_name: string } | null
}

export async function getSessions(
  practitionerId: string,
  limit?: number,
): Promise<SessionWithClient[]> {
  const supabase = await createServerSupabaseClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = supabase
    .from('sessions')
    .select('*, clients(first_name, last_name), invoices(invoice_number), services(name), practitioners(first_name, last_name)')
    .eq('practitioner_id', practitionerId)
    .order('service_date', { ascending: false })
    .order('created_at', { ascending: false })
  if (limit) q = q.limit(limit)
  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as unknown as SessionWithClient[]
}

export async function getUnbilledSessions(practitionerId: string, clientId?: string): Promise<SessionWithClient[]> {
  const supabase = await createServerSupabaseClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from('sessions')
    .select('*, clients(first_name, last_name), invoices(invoice_number), services(name), practitioners(first_name, last_name)')
    .eq('practitioner_id', practitionerId)
    .eq('status', 'completed')
    .is('invoice_id', null)
    .order('service_date', { ascending: false })
  if (clientId) query = query.eq('client_id', clientId)
  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as unknown as SessionWithClient[]
}

export async function getSessionsByInvoice(practitionerId: string, invoiceId: string): Promise<SessionRow[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('practitioner_id', practitionerId)
    .eq('invoice_id', invoiceId)
    .order('service_date')
  if (error) throw error
  return (data ?? []) as unknown as SessionRow[]
}

export async function getSessionsForDateRange(
  practitionerId: string,
  from: string,
  to: string,
): Promise<SessionWithClient[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('sessions')
    .select('*, clients(first_name, last_name), invoices(invoice_number)')
    .eq('practitioner_id', practitionerId)
    .gte('service_date', from)
    .lte('service_date', to)
    .order('service_date')
    .order('start_time', { nullsFirst: false })
  if (error) throw error
  return (data ?? []) as unknown as SessionWithClient[]
}

export async function getSessionsByClient(practitionerId: string, clientId: string): Promise<SessionRow[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('practitioner_id', practitionerId)
    .eq('client_id', clientId)
    .order('service_date', { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as SessionRow[]
}

export async function getSessionNotifications(
  practitionerId: string,
  sessionId: string,
): Promise<SessionNotificationRow[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('session_notifications')
    .select('*')
    .eq('practitioner_id', practitionerId)
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
  if (error) {
    console.error('[db] getSessionNotifications error:', error.message)
    return []
  }
  return (data ?? []) as unknown as SessionNotificationRow[]
}

export type ClientSessionNote = {
  id: string
  service_date: string
  start_time: string | null
  end_time: string | null
  notes: string | null
  service_name: string | null
  status: string
  invoice_id: string | null
  invoice_number: string | null
}

/**
 * Fetches NDIS price guide entries for the given support item numbers.
 * Only returns currently-active entries (effective_to IS NULL or >= today).
 * When multiple versions exist for the same number, returns all (caller picks first).
 */
export async function getNdisPriceGuide(
  supportItemNumbers: string[],
): Promise<NdisPriceGuideRow[]> {
  if (supportItemNumbers.length === 0) return []
  const supabase = await createServerSupabaseClient()
  const today = new Date().toISOString().slice(0, 10)
  const { data } = await supabase
    .from('ndis_price_guide')
    .select('*')
    .in('support_item_number', supportItemNumbers)
    .or(`effective_to.is.null,effective_to.gte.${today}`)
    .order('effective_from', { ascending: false })
  return (data ?? []) as unknown as NdisPriceGuideRow[]
}

export async function getClientSessionNotes(practitionerId: string, clientId: string): Promise<ClientSessionNote[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('sessions')
    .select('id, service_date, start_time, end_time, notes, status, invoice_id, services(name), invoices(invoice_number)')
    .eq('practitioner_id', practitionerId)
    .eq('client_id', clientId)
    .not('notes', 'is', null)
    .order('service_date', { ascending: false })
  if (error) throw error
  type SessShape = {
    id: string
    service_date: string
    start_time: string | null
    end_time: string | null
    notes: string | null
    status: string
    invoice_id: string | null
    services: { name: string } | null
    invoices: { invoice_number: string } | null
  }
  const rows = (data ?? []) as unknown as SessShape[]
  return rows
    .filter((s) => {
      if (!s.notes) return false
      try { const p = JSON.parse(s.notes); return !!p?.__ndis_v1 || !!p?.__therapy_v1 } catch { return false }
    })
    .map((s) => ({
      id: s.id,
      service_date: s.service_date,
      start_time: s.start_time,
      end_time: s.end_time,
      notes: s.notes,
      service_name: s.services?.name ?? null,
      status: s.status,
      invoice_id: s.invoice_id,
      invoice_number: s.invoices?.invoice_number ?? null,
    }))
}

export async function getClientFundingAllocations(
  practitionerId: string,
  clientId: string,
): Promise<FundingAllocationRow[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('client_funding_allocations')
    .select('*')
    .eq('practitioner_id', practitionerId)
    .eq('client_id', clientId)
    .order('plan_start_date', { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as FundingAllocationRow[]
}

export async function getPractitionerById(id: string): Promise<PractitionerRow | null> {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('practitioners')
    .select('*')
    .eq('id', id)
    .single()
  return data as unknown as PractitionerRow | null
}

export async function getClinicMembers(clinicId: string): Promise<ClinicMemberWithProfile[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('clinic_memberships')
    .select('*, member:practitioners!clinic_memberships_member_id_fkey(*)')
    .eq('clinic_id', clinicId)
    .order('created_at')
  if (error) throw error
  return (data ?? []) as unknown as ClinicMemberWithProfile[]
}

export type ClientDocumentWithUploader = ClientDocumentRow & {
  uploader: { first_name: string; last_name: string } | null
}

export async function getClientDocuments(
  practitionerId: string,
  clientId: string,
): Promise<ClientDocumentWithUploader[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('client_documents')
    .select('*, uploader:practitioners(first_name, last_name)')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as ClientDocumentWithUploader[]
}
