import type { ClientRow } from '@/types/database'

export type RecipientType = 'client' | 'plan_manager' | 'self_manager' | 'ndia_claim'

export interface InvoiceRecipient {
  recipient_type: RecipientType
  recipient_name: string | null
  recipient_email: string | null
  recipient_phone: string | null
  billing_note: string | null
}

/**
 * Derives the correct invoice recipient from a client's funding configuration.
 * Pure function — safe to call from both server actions and client components.
 */
export function resolveInvoiceRecipient(client: ClientRow): InvoiceRecipient {
  if (client.funding_type === 'NDIS') {
    if (client.ndis_management_type === 'Plan-managed') {
      return {
        recipient_type: 'plan_manager',
        recipient_name: client.plan_manager_name,
        recipient_email: client.plan_manager_email,
        recipient_phone: client.plan_manager_phone,
        billing_note: null,
      }
    }

    if (client.ndis_management_type === 'Self-managed') {
      return {
        recipient_type: 'self_manager',
        recipient_name: client.self_manager_name,
        recipient_email: client.self_manager_email,
        recipient_phone: client.self_manager_phone,
        billing_note: null,
      }
    }

    if (client.ndis_management_type === 'NDIA-managed') {
      return {
        recipient_type: 'ndia_claim',
        recipient_name: null,
        recipient_email: null,
        recipient_phone: null,
        billing_note: 'NDIA claim required — do not invoice client directly.',
      }
    }
  }

  // Medicare: bill client directly, include Medicare number in note
  if (client.funding_type === 'Medicare') {
    return {
      recipient_type: 'client',
      recipient_name: `${client.first_name} ${client.last_name}`,
      recipient_email: client.email,
      recipient_phone: client.phone,
      billing_note: client.medicare_number
        ? `Medicare number: ${client.medicare_number}`
        : null,
    }
  }

  // Private / Other or no funding type — bill client directly
  return {
    recipient_type: 'client',
    recipient_name: `${client.first_name} ${client.last_name}`,
    recipient_email: client.email,
    recipient_phone: client.phone,
    billing_note: null,
  }
}

/** Human-readable label for display. */
export function recipientLabel(type: RecipientType | null | undefined): string {
  switch (type) {
    case 'plan_manager':  return 'Plan manager'
    case 'self_manager':  return 'Self-manager'
    case 'ndia_claim':    return 'NDIA claim'
    case 'client':        return 'Client'
    default:              return 'Client'
  }
}
