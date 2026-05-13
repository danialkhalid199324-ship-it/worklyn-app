import type { Metadata } from 'next'
import { requireAuthWithPractitioner } from '@/lib/auth'
import { getClients, getSessions, getServices, getNdisPriceGuide, getClinicMembers } from '@/lib/db'
import SessionsClient from './SessionsClient'
import type { PractitionerRow } from '@/types/database'

export const metadata: Metadata = { title: 'Sessions' }

type SessionFilter = 'all' | 'scheduled' | 'completed' | 'unbilled'
const VALID_SESSION_FILTERS: SessionFilter[] = ['all', 'scheduled', 'completed', 'unbilled']

export default async function SessionsPage({
  searchParams,
}: {
  searchParams: { filter?: string }
}) {
  const { practitioner } = await requireAuthWithPractitioner()
  const defaultFilter: SessionFilter = VALID_SESSION_FILTERS.includes(searchParams.filter as SessionFilter)
    ? (searchParams.filter as SessionFilter)
    : 'all'

  const [sessions, clients, services, clinicMembers] = await Promise.all([
    getSessions(practitioner.id, 200),
    getClients(practitioner.id),
    getServices(practitioner.id),
    // clinic_id in clinic_memberships is the admin/owner's practitioner.id
    getClinicMembers(practitioner.id).catch(() => []),
  ])

  const supportNums = Array.from(new Set(
    services.map((s) => s.support_item_number).filter((n): n is string => n !== null),
  ))
  const priceGuide = await getNdisPriceGuide(supportNums)

  // Extract practitioner rows from clinic members (skip pending invites with no practitioner row)
  const practitioners: PractitionerRow[] = clinicMembers
    .map((m) => m.member)
    .filter((m): m is PractitionerRow => m !== null)

  // Ensure the logged-in practitioner is always in the list (even if not in clinic_memberships)
  if (!practitioners.find((p) => p.id === practitioner.id)) {
    practitioners.unshift(practitioner)
  }

  const practitionerName = `${practitioner.first_name} ${practitioner.last_name}`

  return (
    <SessionsClient
      sessions={sessions}
      clients={clients}
      services={services}
      priceGuide={priceGuide}
      practitioners={practitioners}
      defaultPractitionerId={practitioner.id}
      practitionerName={practitionerName}
      defaultFilter={defaultFilter}
    />
  )
}
