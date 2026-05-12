'use server'

import { requireAuthWithPractitioner } from '@/lib/auth'
import {
  getClientEvents,
  getClientInvoices,
  getClientSessionNotes,
  getClientFundingAllocations,
  getClientDocuments,
  type ClientEventRow,
  type ClientDocumentWithUploader,
  type ClientSessionNote,
} from '@/lib/db'
import type { InvoiceRow, FundingAllocationRow } from '@/types/database'

export type ClientTabPayload = {
  events?: ClientEventRow[]
  invoices?: InvoiceRow[]
  sessionNotes?: ClientSessionNote[]
  allocations?: FundingAllocationRow[]
  documents?: ClientDocumentWithUploader[]
  error?: string
}

/**
 * Fetch data for a single client profile tab on demand.
 * Called client-side when the user first opens a tab.
 * Each call re-authenticates to keep RLS enforced.
 */
export async function fetchClientTabData(
  clientId: string,
  tab: 'appointments' | 'invoices' | 'reports' | 'funding' | 'documents',
): Promise<ClientTabPayload> {
  try {
    const { practitioner } = await requireAuthWithPractitioner()
    switch (tab) {
      case 'appointments':
        return { events: await getClientEvents(practitioner.id, clientId) }
      case 'invoices':
        return { invoices: await getClientInvoices(practitioner.id, clientId) }
      case 'reports':
        return { sessionNotes: await getClientSessionNotes(practitioner.id, clientId) }
      case 'funding':
        return { allocations: await getClientFundingAllocations(practitioner.id, clientId).catch(() => []) }
      case 'documents':
        return { documents: await getClientDocuments(practitioner.id, clientId).catch(() => []) }
    }
  } catch {
    return { error: 'Failed to load. Please try again.' }
  }
}
