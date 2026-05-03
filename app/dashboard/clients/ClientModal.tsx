'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import { createClient, updateClient } from '@/app/actions/clients'
import type { ClientRow, FundingType, NdisManagementType } from '@/types/database'

interface Props {
  mode: 'create' | 'edit'
  client?: ClientRow
  onClose: () => void
}

const FUNDING_OPTIONS: { value: FundingType; label: string }[] = [
  { value: 'NDIS', label: 'NDIS' },
  { value: 'Medicare', label: 'Medicare' },
  { value: 'Private / Other', label: 'Private / Other' },
]

const MGMT_OPTIONS: { value: NdisManagementType; label: string }[] = [
  { value: 'NDIA-managed', label: 'NDIA-managed' },
  { value: 'Self-managed', label: 'Self-managed' },
  { value: 'Plan-managed', label: 'Plan-managed' },
]

export default function ClientModal({ mode, client, onClose }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [fundingType, setFundingType] = useState<FundingType | ''>(client?.funding_type ?? '')
  const [mgmtType, setMgmtType] = useState<NdisManagementType | ''>(client?.ndis_management_type ?? '')
  const router = useRouter()

  function handleFundingChange(val: FundingType | '') {
    setFundingType(val)
    if (val !== 'NDIS') setMgmtType('')
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setError(null)

    startTransition(async () => {
      const result =
        mode === 'create'
          ? await createClient(formData)
          : await updateClient(client!.id, formData)

      if (result?.error) {
        setError(result.error)
      } else {
        router.refresh()
        onClose()
      }
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 shrink-0">
          <h2 className="text-base font-semibold text-gray-900">
            {mode === 'create' ? 'Add client' : 'Edit client'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:text-gray-600"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-4">
          {/* Core fields */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="First name" name="first_name" required defaultValue={client?.first_name} />
            <Field label="Last name" name="last_name" required defaultValue={client?.last_name} />
          </div>
          <Field label="Email" name="email" type="email" defaultValue={client?.email ?? ''} />
          <Field label="Phone" name="phone" type="tel" defaultValue={client?.phone ?? ''} />
          <Field label="Date of birth" name="date_of_birth" type="date" defaultValue={client?.date_of_birth ?? ''} />
          <Field label="Address" name="address" defaultValue={client?.address ?? ''} />

          {/* Funding type */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Funding type</label>
            <select
              name="funding_type"
              value={fundingType}
              onChange={(e) => handleFundingChange(e.target.value as FundingType | '')}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
            >
              <option value="">— Not specified —</option>
              {FUNDING_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* NDIS sub-fields */}
          {fundingType === 'NDIS' && (
            <div className="space-y-4 rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
              <Field label="NDIS number" name="ndis_number" defaultValue={client?.ndis_number ?? ''} />

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Management type</label>
                <select
                  name="ndis_management_type"
                  value={mgmtType}
                  onChange={(e) => setMgmtType(e.target.value as NdisManagementType | '')}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                >
                  <option value="">— Not specified —</option>
                  {MGMT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Self-managed contact */}
              {mgmtType === 'Self-managed' && (
                <div className="space-y-3 pt-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Self-manager contact</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Name" name="self_manager_name" defaultValue={client?.self_manager_name ?? ''} />
                    <Field label="Relation to participant" name="self_manager_relation" defaultValue={client?.self_manager_relation ?? ''} />
                  </div>
                  <Field label="Email" name="self_manager_email" type="email" defaultValue={client?.self_manager_email ?? ''} />
                  <Field label="Phone" name="self_manager_phone" type="tel" defaultValue={client?.self_manager_phone ?? ''} />
                </div>
              )}

              {/* Plan-managed contact */}
              {mgmtType === 'Plan-managed' && (
                <div className="space-y-3 pt-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Plan manager contact</p>
                  <Field label="Name" name="plan_manager_name" defaultValue={client?.plan_manager_name ?? ''} />
                  <Field label="Email" name="plan_manager_email" type="email" defaultValue={client?.plan_manager_email ?? ''} />
                  <Field label="Phone" name="plan_manager_phone" type="tel" defaultValue={client?.plan_manager_phone ?? ''} />
                </div>
              )}
            </div>
          )}

          {/* Medicare number */}
          {fundingType === 'Medicare' && (
            <Field label="Medicare number" name="medicare_number" defaultValue={client?.medicare_number ?? ''} />
          )}

          {/* Notes */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Notes</label>
            <textarea
              name="notes"
              rows={3}
              defaultValue={client?.notes ?? ''}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={isPending}>
              {mode === 'create' ? 'Add client' : 'Save changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({
  label,
  name,
  type = 'text',
  required,
  defaultValue,
}: {
  label: string
  name: string
  type?: string
  required?: boolean
  defaultValue?: string
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      <input
        type={type}
        name={name}
        required={required}
        defaultValue={defaultValue}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
      />
    </div>
  )
}
