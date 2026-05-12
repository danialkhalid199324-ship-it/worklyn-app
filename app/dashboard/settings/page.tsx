import type { Metadata } from 'next'
import { requireAuthWithPractitioner } from '@/lib/auth'
import { getOrgSettings } from '@/lib/db'
import SettingsClient from './SettingsClient'

export const metadata: Metadata = { title: 'Settings' }

export default async function SettingsPage() {
  const { user, practitioner } = await requireAuthWithPractitioner()
  const orgSettings = await getOrgSettings(practitioner.id)

  // Derive initial MFA state from the user object returned by Supabase —
  // no extra network call needed; factors are embedded in the session JWT.
  const mfaFactor =
    user.factors?.find(
      (f) => f.status === 'verified' && f.factor_type === 'totp',
    ) ?? null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Manage your account and practice preferences.
        </p>
      </div>
      <SettingsClient
        practitioner={practitioner}
        orgSettings={orgSettings}
        mfaEnabled={!!mfaFactor}
        mfaFactorId={mfaFactor?.id ?? null}
      />
    </div>
  )
}
