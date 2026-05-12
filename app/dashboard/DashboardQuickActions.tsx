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

export default function DashboardQuickActions({ clients, services, priceGuide, nextInvoiceNumber, orgSettings }: Props) {
  const [activeModal, setActiveModal] = useState<'client' | 'session' | 'invoice' | null>(null)
  const close = () => setActiveModal(null)

  return (
    <>
      <div className="flex items-center gap-2 overflow-x-auto">

        {/* Primary action */}
        <button
          onClick={() => setActiveModal('session')}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 active:scale-[0.98] transition-all"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          New session
        </button>

        {/* Secondary modal actions */}
        <button
          onClick={() => setActiveModal('client')}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 active:scale-[0.98] transition-all"
        >
          <svg className="h-3.5 w-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          Add client
        </button>

        <button
          onClick={() => setActiveModal('invoice')}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 active:scale-[0.98] transition-all"
        >
          <svg className="h-3.5 w-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Create invoice
        </button>

        <div className="h-5 w-px shrink-0 bg-gray-200 mx-0.5" />

        {/* Navigation actions */}
        <a
          href="/dashboard/invoices"
          className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
        >
          <svg className="h-3.5 w-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Record payment
        </a>

        <a
          href="/dashboard/invoices"
          className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
        >
          <svg className="h-3.5 w-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Send reminder
        </a>

        <a
          href="/dashboard/sessions"
          className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
        >
          <svg className="h-3.5 w-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Complete notes
        </a>

      </div>

      {activeModal === 'client' && <ClientModal mode="create" onClose={close} />}
      {activeModal === 'session' && (
        <SessionModal clients={clients} services={services} priceGuide={priceGuide} session={null} onClose={close} />
      )}
      {activeModal === 'invoice' && (
        <InvoiceModal clients={clients} nextInvoiceNumber={nextInvoiceNumber} orgSettings={orgSettings} onClose={close} />
      )}
    </>
  )
}
