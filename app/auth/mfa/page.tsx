import type { Metadata } from 'next'
import MfaClient from './MfaClient'

export const metadata: Metadata = { title: 'Two-factor authentication' }

export default function MfaPage({
  searchParams,
}: {
  searchParams: { redirectTo?: string }
}) {
  return <MfaClient redirectTo={searchParams.redirectTo} />
}
