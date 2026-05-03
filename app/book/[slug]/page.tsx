import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import BookingFlow from './BookingFlow'

interface Props {
  params: { slug: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = await createServerSupabaseClient()
  const { data: p } = await supabase
    .from('practitioners')
    .select('first_name, last_name, display_name, bio')
    .eq('booking_page_slug', params.slug)
    .single()

  if (!p) return { title: 'Book an appointment' }
  const name = p.display_name ?? `${p.first_name} ${p.last_name}`
  return { title: `Book with ${name}` }
}

export default async function PublicBookingPage({ params }: Props) {
  const supabase = await createServerSupabaseClient()

  const { data: practitioner } = await supabase
    .from('practitioners')
    .select('id, first_name, last_name, display_name, bio, phone, is_accepting_clients')
    .eq('booking_page_slug', params.slug)
    .single()

  if (!practitioner || !practitioner.is_accepting_clients) notFound()

  const { data: services } = await supabase
    .from('services')
    .select('id, name, description, duration_minutes, price_cents, currency')
    .eq('practitioner_id', practitioner.id)
    .eq('is_active', true)
    .order('name')

  if (!services || services.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-lg font-medium text-gray-700">No services available yet.</p>
          <p className="mt-1 text-sm text-gray-400">Check back soon.</p>
        </div>
      </div>
    )
  }

  const practitionerName =
    practitioner.display_name ??
    `${practitioner.first_name} ${practitioner.last_name}`

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-white">
      {/* Header */}
      <header className="border-b border-brand-100/50 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-2xl px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-500">
            Book an appointment
          </p>
          <h1 className="mt-0.5 text-lg font-bold text-gray-900">{practitionerName}</h1>
          {practitioner.bio && (
            <p className="mt-1 text-sm text-gray-500 line-clamp-2">{practitioner.bio}</p>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        <BookingFlow
          practitionerId={practitioner.id}
          practitionerName={practitionerName}
          services={services}
        />
      </main>

      <footer className="py-8 text-center text-xs text-gray-400">
        Powered by <span className="font-semibold text-brand-500">Worklyn</span>
      </footer>
    </div>
  )
}
