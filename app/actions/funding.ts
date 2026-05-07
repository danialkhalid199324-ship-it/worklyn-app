'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/auth'
import { getPractitionerByUserId } from '@/lib/db'
import {
  calculateRemainingFunding,
  calculateUtilisationPercentage,
} from '@/lib/funding-utils'

// ---------------------------------------------------------------------------
// Internal recalculation — also imported by sessions.ts after invoice events
// ---------------------------------------------------------------------------

/**
 * Recomputes used_amount, remaining_amount, and utilisation_percentage for
 * all active allocations belonging to this client.
 *
 * Source of truth: invoice_items.total_cents for invoiced sessions;
 * rate × duration estimate for completed sessions without an invoice yet.
 * Invoices and sessions are NEVER modified here.
 */
export async function recalculateAllocationForClient(
  practitionerId: string,
  clientId: string,
): Promise<void> {
  const supabase = await createServerSupabaseClient()

  const { data: allocations } = await supabase
    .from('client_funding_allocations')
    .select('id, plan_start_date, plan_end_date, allocated_amount')
    .eq('practitioner_id', practitionerId)
    .eq('client_id', clientId)
    .eq('is_active', true)

  if (!allocations || allocations.length === 0) return

  for (const allocation of allocations) {
    const { data: sessions } = await supabase
      .from('sessions')
      .select('id, rate, duration_minutes, invoice_id')
      .eq('practitioner_id', practitionerId)
      .eq('client_id', clientId)
      .eq('status', 'completed')
      .gte('service_date', allocation.plan_start_date)
      .lte('service_date', allocation.plan_end_date)

    if (!sessions) continue

    let usedCents = 0

    // Sessions with linked invoices: use actual billed amounts
    const invoiceIds = sessions
      .filter(s => s.invoice_id)
      .map(s => s.invoice_id as string)

    if (invoiceIds.length > 0) {
      const { data: items } = await supabase
        .from('invoice_items')
        .select('total_cents')
        .in('invoice_id', invoiceIds)

      if (items) {
        usedCents += items.reduce((sum, item) => sum + item.total_cents, 0)
      }
    }

    // Sessions without invoices: estimate from rate × duration
    for (const s of sessions.filter(s => !s.invoice_id)) {
      usedCents += Math.round((s.duration_minutes / 60) * s.rate * 100)
    }

    await supabase
      .from('client_funding_allocations')
      .update({
        used_amount: usedCents,
        remaining_amount: calculateRemainingFunding(allocation.allocated_amount, usedCents),
        utilisation_percentage: calculateUtilisationPercentage(allocation.allocated_amount, usedCents),
      })
      .eq('id', allocation.id)
      .eq('practitioner_id', practitionerId)
  }
}

// ---------------------------------------------------------------------------
// Server actions
// ---------------------------------------------------------------------------

export async function createFundingAllocation(formData: FormData, clientId: string) {
  const user = await requireAuth()
  const practitioner = await getPractitionerByUserId(user.id)
  const supabase = await createServerSupabaseClient()

  const planName = (formData.get('plan_name') as string)?.trim()
  const planStartDate = formData.get('plan_start_date') as string
  const planEndDate = formData.get('plan_end_date') as string
  const allocatedDollars = parseFloat(formData.get('allocated_amount') as string)
  const fundingType = (formData.get('funding_type') as string) || 'Private / Other'
  const managementType = (formData.get('management_type') as string) || null
  const supportCategory = (formData.get('support_category') as string)?.trim() || null
  const serviceCategory = (formData.get('service_category') as string)?.trim() || null
  const ndisLineItem = (formData.get('ndis_line_item') as string)?.trim() || null
  const notes = (formData.get('notes') as string)?.trim() || null

  if (!planName || !planStartDate || !planEndDate || isNaN(allocatedDollars)) {
    return { error: 'Plan name, dates, and allocated amount are required.' }
  }
  if (planEndDate <= planStartDate) {
    return { error: 'Plan end date must be after plan start date.' }
  }

  const allocatedCents = Math.round(allocatedDollars * 100)

  // Deactivate any currently active allocations for this client
  await supabase
    .from('client_funding_allocations')
    .update({ is_active: false })
    .eq('practitioner_id', practitioner.id)
    .eq('client_id', clientId)
    .eq('is_active', true)

  const { error } = await supabase
    .from('client_funding_allocations')
    .insert({
      practitioner_id: practitioner.id,
      client_id: clientId,
      plan_name: planName,
      plan_start_date: planStartDate,
      plan_end_date: planEndDate,
      allocated_amount: allocatedCents,
      used_amount: 0,
      remaining_amount: allocatedCents,
      utilisation_percentage: 0,
      funding_type: fundingType,
      management_type: managementType,
      support_category: supportCategory,
      service_category: serviceCategory,
      ndis_line_item: ndisLineItem,
      notes,
      is_active: true,
    })

  if (error) return { error: error.message }

  // Immediately populate usage from any existing sessions in this period
  try {
    await recalculateAllocationForClient(practitioner.id, clientId)
  } catch (err) {
    console.warn('[createFundingAllocation] recalculation failed (non-critical):', String(err))
  }

  revalidatePath(`/dashboard/clients/${clientId}`)
  return { success: true as const }
}

export async function updateFundingAllocation(
  allocationId: string,
  clientId: string,
  formData: FormData,
) {
  const user = await requireAuth()
  const practitioner = await getPractitionerByUserId(user.id)
  const supabase = await createServerSupabaseClient()

  const planName = (formData.get('plan_name') as string)?.trim()
  const planStartDate = formData.get('plan_start_date') as string
  const planEndDate = formData.get('plan_end_date') as string
  const allocatedDollars = parseFloat(formData.get('allocated_amount') as string)
  const supportCategory = (formData.get('support_category') as string)?.trim() || null
  const serviceCategory = (formData.get('service_category') as string)?.trim() || null
  const ndisLineItem = (formData.get('ndis_line_item') as string)?.trim() || null
  const notes = (formData.get('notes') as string)?.trim() || null

  if (!planName || !planStartDate || !planEndDate || isNaN(allocatedDollars)) {
    return { error: 'Plan name, dates, and allocated amount are required.' }
  }
  if (planEndDate <= planStartDate) {
    return { error: 'Plan end date must be after plan start date.' }
  }

  const allocatedCents = Math.round(allocatedDollars * 100)

  const { error } = await supabase
    .from('client_funding_allocations')
    .update({
      plan_name: planName,
      plan_start_date: planStartDate,
      plan_end_date: planEndDate,
      allocated_amount: allocatedCents,
      support_category: supportCategory,
      service_category: serviceCategory,
      ndis_line_item: ndisLineItem,
      notes,
    })
    .eq('id', allocationId)
    .eq('practitioner_id', practitioner.id)

  if (error) return { error: error.message }

  // Recalculate with updated date range / budget
  try {
    await recalculateAllocationForClient(practitioner.id, clientId)
  } catch (err) {
    console.warn('[updateFundingAllocation] recalculation failed (non-critical):', String(err))
  }

  revalidatePath(`/dashboard/clients/${clientId}`)
  return { success: true as const }
}

export async function deactivateFundingAllocation(allocationId: string, clientId: string) {
  const user = await requireAuth()
  const practitioner = await getPractitionerByUserId(user.id)
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from('client_funding_allocations')
    .update({ is_active: false })
    .eq('id', allocationId)
    .eq('practitioner_id', practitioner.id)

  if (error) return { error: error.message }

  revalidatePath(`/dashboard/clients/${clientId}`)
  return { success: true as const }
}

export async function reactivateFundingAllocation(allocationId: string, clientId: string) {
  const user = await requireAuth()
  const practitioner = await getPractitionerByUserId(user.id)
  const supabase = await createServerSupabaseClient()

  // Deactivate any currently active allocations first (only one active at a time)
  await supabase
    .from('client_funding_allocations')
    .update({ is_active: false })
    .eq('practitioner_id', practitioner.id)
    .eq('client_id', clientId)
    .eq('is_active', true)

  const { error } = await supabase
    .from('client_funding_allocations')
    .update({ is_active: true })
    .eq('id', allocationId)
    .eq('practitioner_id', practitioner.id)

  if (error) return { error: error.message }

  revalidatePath(`/dashboard/clients/${clientId}`)
  return { success: true as const }
}

export async function refreshAllocationUsage(clientId: string) {
  const user = await requireAuth()
  const practitioner = await getPractitionerByUserId(user.id)

  try {
    await recalculateAllocationForClient(practitioner.id, clientId)
  } catch (err) {
    return { error: String(err) }
  }

  revalidatePath(`/dashboard/clients/${clientId}`)
  return { success: true as const }
}
