import type { Metadata } from 'next'
import { requireAuthWithPractitioner } from '@/lib/auth'
import { getAllServices } from '@/lib/db'
import ServicesClient from './ServicesClient'

export const metadata: Metadata = { title: 'Service Catalogue' }

export default async function ServicesPage() {
  const { practitioner } = await requireAuthWithPractitioner()
  const services = await getAllServices(practitioner.id)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Service Catalogue</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Manage NDIS support items, line codes, and default rates. Selected when recording a session.
        </p>
      </div>
      <ServicesClient services={services} />
    </div>
  )
}
