import type { Metadata } from 'next'
import { requireAuth } from '@/lib/auth'
import { getPractitionerByUserId } from '@/lib/db'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import AvailabilityForm from './AvailabilityForm'
import BlockedTimesSection from './BlockedTimesSection'

export const metadata: Metadata = { title: 'Availability' }

export default async function AvailabilityPage() {
  const user = await requireAuth()
  const practitioner = await getPractitionerByUserId(user.id)
  const supabase = await createServerSupabaseClient()

  const [rulesRes, blockedRes] = await Promise.all([
    supabase
      .from('availability_rules')
      .select('*')
      .eq('practitioner_id', practitioner.id)
      .order('day_of_week'),
    supabase
      .from('blocked_times')
      .select('*')
      .eq('practitioner_id', practitioner.id)
      .gte('end_time', new Date().toISOString())
      .order('start_time'),
  ])

  const bufferMinutes =
    (practitioner as never as { buffer_minutes?: number }).buffer_minutes ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Availability</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Set when you're available for bookings and block off time when you're not.
        </p>
      </div>

      <AvailabilityForm
        rules={rulesRes.data ?? []}
        bufferMinutes={bufferMinutes}
      />

      <BlockedTimesSection
        blockedTimes={blockedRes.data ?? []}
        practitionerId={practitioner.id}
      />
    </div>
  )
}
