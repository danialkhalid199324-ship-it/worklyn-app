'use client'

import { useState } from 'react'
import ClientModal from '@/app/dashboard/clients/ClientModal'
import SessionModal from '@/app/dashboard/sessions/SessionModal'
import InvoiceModal from '@/app/dashboard/invoices/InvoiceModal'
import type { ClientRow, ServiceRow, NdisPriceGuideRow, OrgSettingsRow } from '@/types/database'

interface Props {
  clients: ClientRow[]
  services: ServiceRow[]
  priceGuide: NdisPriceGuideRow[]
  nextInvoiceNumber: string
  orgSettings: OrgSettingsRow | null
}

export default function DashboardQuickActions({
  clients,
  services,
  priceGuide,
  nextInvoiceNumber,
  orgSettings,
}: Props) {
  const [activeModal, setActiveModal] = useState<'client' | 'session' | 'invoice' | null>(null)
  const close = () => setActiveModal(null)

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveModal('session')}
          className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold bg-brand-600 text-white hover:bg-brand-700 transition-colors"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          New appointment
        </button>
        <button
          onClick={() => setActiveModal('client')}
          className="rounded-lg px-3.5 py-2 text-sm font-medium bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          Add client
        </button>
        <button
          onClick={() => setActiveModal('invoice')}
          className="rounded-lg px-3.5 py-2 text-sm font-medium bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          Create invoice
        </button>
      </div>

      {activeModal === 'client' && (
        <ClientModal mode="create" onClose={close} />
      )}
      {activeModal === 'session' && (
        <SessionModal
          clients={clients}
          services={services}
          priceGuide={priceGuide}
          session={null}
          onClose={close}
        />
      )}
      {activeModal === 'invoice' && (
        <InvoiceModal
          clients={clients}
          nextInvoiceNumber={nextInvoiceNumber}
          orgSettings={orgSettings}
          onClose={close}
        />
      )}
    </>
  )
}
