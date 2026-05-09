'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import SecuritySection from './SecuritySection'
import { savePractitionerProfile, saveOrgSettings, uploadOrgLogo } from '@/app/actions/settings'
import type { PractitionerRow, OrgSettingsRow } from '@/types/database'

interface Props {
  practitioner: PractitionerRow
  orgSettings: OrgSettingsRow | null
  mfaEnabled: boolean
  mfaFactorId: string | null
}

const INPUT =
  'mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400'

function Field({
  label,
  name,
  defaultValue,
  type = 'text',
  placeholder,
  className,
}: {
  label: string
  name: string
  defaultValue?: string | null
  type?: string
  placeholder?: string
  className?: string
}) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue ?? ''}
        placeholder={placeholder}
        className={INPUT}
      />
    </div>
  )
}

type Section = 'profile' | 'practice' | 'security'

export default function SettingsClient({
  practitioner,
  orgSettings,
  mfaEnabled,
  mfaFactorId,
}: Props) {
  const router = useRouter()

  const [activeSection, setActiveSection] = useState<Section>('profile')
  const [calendarColor, setCalendarColor] = useState(practitioner.calendar_color ?? '#6366F1')
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [orgMsg, setOrgMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [profilePending, startProfileTransition] = useTransition()
  const [orgPending, startOrgTransition] = useTransition()

  const [logoPreview, setLogoPreview] = useState<string | null>(orgSettings?.logo_url ?? null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoMsg, setLogoMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [logoPending, startLogoTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    setLogoMsg(null)
    setLogoPreview(URL.createObjectURL(file))
  }

  function handleLogoUpload() {
    if (!logoFile) return
    const fd = new FormData()
    fd.append('logo', logoFile)
    startLogoTransition(async () => {
      const result = await uploadOrgLogo(fd)
      if (result?.error) {
        setLogoMsg({ ok: false, text: result.error })
      } else {
        setLogoMsg({ ok: true, text: 'Logo uploaded.' })
        setLogoFile(null)
        // Update preview to the versioned URL saved in the DB
        const saved = (result as { url?: string }).url
        if (saved) setLogoPreview(saved)
        // Re-render server components (navbar) to pick up the new logo_url
        router.refresh()
      }
    })
  }

  async function handleProfileSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setProfileMsg(null)
    const fd = new FormData(e.currentTarget)
    startProfileTransition(async () => {
      const result = await savePractitionerProfile(fd)
      setProfileMsg(
        result?.error
          ? { ok: false, text: result.error }
          : { ok: true, text: 'Profile saved.' },
      )
    })
  }

  async function handleOrgSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setOrgMsg(null)
    const fd = new FormData(e.currentTarget)
    startOrgTransition(async () => {
      const result = await saveOrgSettings(fd)
      setOrgMsg(
        result?.error
          ? { ok: false, text: result.error }
          : { ok: true, text: 'Practice details saved.' },
      )
    })
  }

  const navItems: { key: Section; label: string }[] = [
    { key: 'profile', label: 'Profile' },
    { key: 'practice', label: 'Practice & Billing' },
    { key: 'security', label: 'Security' },
  ]

  return (
    <div className="flex gap-6">
      {/* Side nav */}
      <nav className="w-44 shrink-0">
        <ul className="space-y-0.5">
          {navItems.map((item) => (
            <li key={item.key}>
              <button
                onClick={() => setActiveSection(item.key)}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                  activeSection === item.key
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Content */}
      <div className="flex-1 space-y-6">
        {activeSection === 'profile' && (
          <Card>
            <h2 className="mb-5 font-semibold text-gray-900">Profile</h2>
            <form onSubmit={handleProfileSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="First name"
                  name="first_name"
                  defaultValue={practitioner.first_name}
                  placeholder="Jane"
                />
                <Field
                  label="Last name"
                  name="last_name"
                  defaultValue={practitioner.last_name}
                  placeholder="Smith"
                />
                <Field
                  label="Display name"
                  name="display_name"
                  defaultValue={practitioner.display_name}
                  placeholder="Dr. Jane Smith"
                  className="sm:col-span-2"
                />
                <Field
                  label="Phone"
                  name="phone"
                  type="tel"
                  defaultValue={practitioner.phone}
                  placeholder="+61 4xx xxx xxx"
                />
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700">Bio</label>
                <textarea
                  name="bio"
                  rows={3}
                  defaultValue={practitioner.bio ?? ''}
                  placeholder="A short description of your practice and specialisations…"
                  className={INPUT}
                />
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field
                  label="Provider number"
                  name="provider_number"
                  defaultValue={practitioner.provider_number}
                  placeholder="e.g. 2345678B"
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700">Calendar colour</label>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {[
                      '#6366F1', '#8B5CF6', '#EC4899', '#EF4444',
                      '#F97316', '#EAB308', '#22C55E', '#06B6D4', '#3B82F6', '#64748B',
                    ].map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        onClick={() => setCalendarColor(hex)}
                        style={{ backgroundColor: hex }}
                        className={`h-6 w-6 rounded-full transition-transform ${
                          calendarColor === hex ? 'scale-125 ring-2 ring-offset-1 ring-gray-400' : 'hover:scale-110'
                        }`}
                        aria-label={hex}
                      />
                    ))}
                    <input
                      type="color"
                      value={calendarColor}
                      onChange={(e) => setCalendarColor(e.target.value)}
                      className="h-6 w-6 cursor-pointer rounded-full border-0 bg-transparent p-0"
                      title="Custom colour"
                    />
                  </div>
                  <input type="hidden" name="calendar_color" value={calendarColor} />
                  <p className="mt-1 text-xs text-gray-400">Used for your calendar events and team avatar.</p>
                </div>
              </div>

              {profileMsg && (
                <p
                  className={`mt-3 text-sm ${profileMsg.ok ? 'text-green-600' : 'text-red-600'}`}
                >
                  {profileMsg.text}
                </p>
              )}
              <div className="mt-5 flex justify-end">
                <Button type="submit" loading={profilePending}>
                  Save changes
                </Button>
              </div>
            </form>
          </Card>
        )}

        {activeSection === 'practice' && (
          <Card>
            <h2 className="mb-1 font-semibold text-gray-900">Practice & Billing Details</h2>
            <p className="mb-5 text-sm text-gray-500">
              These details appear on invoices sent to participants, plan managers, and NDIA claims.
            </p>

            {/* Logo upload */}
            <div className="mb-6 border-b border-gray-100 pb-6">
              <p className="mb-3 text-sm font-medium text-gray-700">Organisation logo</p>
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-gray-50">
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="Organisation logo"
                      className="h-16 w-16 rounded-full object-cover"
                    />
                  ) : (
                    <svg className="h-7 w-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 9.75h18M3 9.75A2.25 2.25 0 015.25 7.5h13.5A2.25 2.25 0 0121 9.75v10.5A2.25 2.25 0 0118.75 22.5H5.25A2.25 2.25 0 013 20.25V9.75z" />
                    </svg>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                    >
                      {logoPreview ? 'Change logo' : 'Upload logo'}
                    </button>
                    {logoFile && (
                      <Button type="button" loading={logoPending} onClick={handleLogoUpload}>
                        Save logo
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">PNG or JPG, max 2 MB</p>
                  {logoMsg && (
                    <p className={`text-xs ${logoMsg.ok ? 'text-green-600' : 'text-red-600'}`}>
                      {logoMsg.text}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <form onSubmit={handleOrgSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Business name"
                  name="business_name"
                  defaultValue={orgSettings?.business_name}
                  placeholder="Sunrise Allied Health"
                  className="sm:col-span-2"
                />
                <Field
                  label="ABN"
                  name="abn"
                  defaultValue={orgSettings?.abn}
                  placeholder="12 345 678 901"
                />
                <Field
                  label="Payment reference prefix"
                  name="payment_reference_prefix"
                  defaultValue={orgSettings?.payment_reference_prefix}
                  placeholder="INV"
                />
              </div>

              <div className="mt-5 border-t border-gray-100 pt-5">
                <p className="mb-4 text-sm font-medium text-gray-700">
                  Bank account details
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Account name"
                    name="bank_account_name"
                    defaultValue={orgSettings?.bank_account_name}
                    placeholder="Sunrise Allied Health Pty Ltd"
                    className="sm:col-span-2"
                  />
                  <Field
                    label="BSB"
                    name="bsb"
                    defaultValue={orgSettings?.bsb}
                    placeholder="062-000"
                  />
                  <Field
                    label="Account number"
                    name="account_number"
                    defaultValue={orgSettings?.account_number}
                    placeholder="12345678"
                  />
                </div>
              </div>

              {orgMsg && (
                <p
                  className={`mt-3 text-sm ${orgMsg.ok ? 'text-green-600' : 'text-red-600'}`}
                >
                  {orgMsg.text}
                </p>
              )}
              <div className="mt-5 flex justify-end">
                <Button type="submit" loading={orgPending}>
                  Save changes
                </Button>
              </div>
            </form>
          </Card>
        )}

        {activeSection === 'security' && (
          <SecuritySection
            initialEnabled={mfaEnabled}
            initialFactorId={mfaFactorId}
          />
        )}
      </div>
    </div>
  )
}
