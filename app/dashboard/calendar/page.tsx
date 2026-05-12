import type { Metadata } from 'next'
import { requireAuthWithPractitioner } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase-server'
import {
  getClients,
  getServices,
  getSessionsForDateRange,
  getBlockedTimesForDateRange,
  getClinicMembers,
  getNdisPriceGuide,
} from '@/lib/db'
import CalendarClient from './CalendarClient'
import type { PractitionerRow, BlockedTimeRow } from '@/types/database'
import type { SessionWithClient } from '@/lib/db'

export const metadata: Metadata = { title: 'Calendar' }

function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}

function mondayOf(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  const dow = date.getUTCDay()
  const offset = dow === 0 ? -6 : 1 - dow
  date.setUTCDate(date.getUTCDate() + offset)
  return date.toISOString().slice(0, 10)
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: { week?: string }
}) {
  const { practitioner } = await requireAuthWithPractitioner()
  const isAdmin = !practitioner.role || practitioner.role === 'admin'

  const todayUTC = new Date().toISOString().slice(0, 10)
  const from = searchParams.week ?? mondayOf(todayUTC)
  const to = addDays(from, 6)

  let sessions: SessionWithClient[] = []
  let blockedTimes: BlockedTimeRow[] = []
  let teamPractitioners: PractitionerRow[] = [practitioner]
  let allClients = await getClients(practitioner.id)

  if (isAdmin) {
    // Fetch clinic members so we can build the full team list
    const members = await getClinicMembers(practitioner.id).catch(() => [])
    const memberPractitioners = members
      .filter((m) => m.is_active && m.member)
      .map((m) => m.member as PractitionerRow)

    teamPractitioners = [practitioner, ...memberPractitioners]
    const memberIds = teamPractitioners.map((p) => p.id)

    // Use admin client to bypass RLS for cross-practitioner reads
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminClient: any = createAdminClient()

    const [sessRes, blockedRes, clientsRes] = await Promise.all([
      adminClient
        .from('sessions')
        .select('*, clients(first_name, last_name), invoices(invoice_number)')
        .in('practitioner_id', memberIds)
        .gte('service_date', from)
        .lte('service_date', to)
        .order('service_date')
        .order('start_time', { ascending: true, nullsFirst: false }),
      adminClient
        .from('blocked_times')
        .select('*')
        .in('practitioner_id', memberIds)
        .gte('start_time', `${from}T00:00:00`)
        .lte('start_time', `${to}T23:59:59`)
        .order('start_time'),
      // All clients across all team practitioners
      adminClient
        .from('clients')
        .select('*')
        .in('practitioner_id', memberIds)
        .eq('is_active', true)
        .order('last_name'),
    ])

    sessions = (sessRes.data ?? []) as unknown as SessionWithClient[]
    blockedTimes = (blockedRes.data ?? []) as unknown as BlockedTimeRow[]
    if (clientsRes.data) allClients = clientsRes.data
  } else {
    // Non-admin practitioner — check if part of a clinic team
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminClient: any = createAdminClient()

    const membershipRes = await adminClient
      .from('clinic_memberships')
      .select('clinic_id')
      .eq('member_id', practitioner.id)
      .eq('is_active', true)
      .maybeSingle()

    const clinicId: string | null = membershipRes.data?.clinic_id ?? null

    if (clinicId) {
      // Part of a clinic — fetch full team so they can view teammates' calendars
      const [adminRes, membersRes] = await Promise.all([
        adminClient.from('practitioners').select('*').eq('id', clinicId).single(),
        adminClient
          .from('clinic_memberships')
          .select('*, member:practitioners!clinic_memberships_member_id_fkey(*)')
          .eq('clinic_id', clinicId)
          .eq('is_active', true),
      ])

      const clinicAdmin = adminRes.data as PractitionerRow | null
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const memberPractitioners = ((membersRes.data ?? []) as any[])
        .filter((m) => m.member)
        .map((m) => m.member as PractitionerRow)

      const teamMap = new Map<string, PractitionerRow>()
      if (clinicAdmin) teamMap.set(clinicAdmin.id, clinicAdmin)
      for (const m of memberPractitioners) teamMap.set(m.id, m)
      teamPractitioners = teamMap.size > 0 ? Array.from(teamMap.values()) : [practitioner]

      const memberIds = teamPractitioners.map((p) => p.id)

      const [sessRes, blockedRes] = await Promise.all([
        adminClient
          .from('sessions')
          .select('*, clients(first_name, last_name), invoices(invoice_number)')
          .in('practitioner_id', memberIds)
          .gte('service_date', from)
          .lte('service_date', to)
          .order('service_date')
          .order('start_time', { ascending: true, nullsFirst: false }),
        adminClient
          .from('blocked_times')
          .select('*')
          .in('practitioner_id', memberIds)
          .gte('start_time', `${from}T00:00:00`)
          .lte('start_time', `${to}T23:59:59`)
          .order('start_time'),
      ])

      sessions = (sessRes.data ?? []) as unknown as SessionWithClient[]
      blockedTimes = (blockedRes.data ?? []) as unknown as BlockedTimeRow[]
    } else {
      // Solo practitioner — own data only
      ;[sessions, blockedTimes] = await Promise.all([
        getSessionsForDateRange(practitioner.id, from, to),
        getBlockedTimesForDateRange(practitioner.id, from, to),
      ])
    }
  }

  const services = await getServices(practitioner.id)
  const supportNums = Array.from(new Set(
    services.map((s) => s.support_item_number).filter((n): n is string => n !== null),
  ))
  const priceGuide = await getNdisPriceGuide(supportNums)

  return (
    <CalendarClient
      sessions={sessions}
      blockedTimes={blockedTimes}
      clients={allClients}
      services={services}
      priceGuide={priceGuide}
      practitioners={teamPractitioners}
      currentPractitionerId={practitioner.id}
      isAdmin={isAdmin}
      weekStart={from}
    />
  )
}
