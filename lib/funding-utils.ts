// Pure calculation functions for funding allocation.
// No database access — safe to call in client components.

export type FundingStatus = 'healthy' | 'warning' | 'exhausted'

export interface AllocationUsage {
  allocatedCents: number
  usedCents: number
  remainingCents: number
  utilisationPercentage: number
  status: FundingStatus
}

export function calculateAllocationUsage(
  allocatedCents: number,
  usedCents: number,
): AllocationUsage {
  const remainingCents = calculateRemainingFunding(allocatedCents, usedCents)
  const utilisationPercentage = calculateUtilisationPercentage(allocatedCents, usedCents)
  return {
    allocatedCents,
    usedCents,
    remainingCents,
    utilisationPercentage,
    status: getFundingStatus(utilisationPercentage),
  }
}

export function calculateRemainingFunding(
  allocatedCents: number,
  usedCents: number,
): number {
  return allocatedCents - usedCents
}

export function calculateUtilisationPercentage(
  allocatedCents: number,
  usedCents: number,
): number {
  if (allocatedCents <= 0) return 0
  return parseFloat(((usedCents / allocatedCents) * 100).toFixed(2))
}

export function getFundingStatus(utilisationPercentage: number): FundingStatus {
  if (utilisationPercentage >= 100) return 'exhausted'
  if (utilisationPercentage >= 80) return 'warning'
  return 'healthy'
}

export function formatAllocationAmount(cents: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
  }).format(cents / 100)
}
