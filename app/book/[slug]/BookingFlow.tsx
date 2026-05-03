'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBooking } from '@/app/actions/booking'
import type { TimeSlot } from '@/lib/availability'
import ConfirmationScreen from './ConfirmationScreen'

interface Service {
  id: string
  name: string
  description: string | null
  duration_minutes: number
  price_cents: number
  currency: string
}

interface Props {
  practitionerId: string
  practitionerName: string
  services: Service[]
}

type Step = 'service' | 'datetime' | 'details' | 'confirmed'

function formatCurrency(cents: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100)
}

function StepIndicator({ current }: { current: Step }) {
  const steps: { id: Step; label: string }[] = [
    { id: 'service', label: 'Service' },
    { id: 'datetime', label: 'Date & time' },
    { id: 'details', label: 'Your details' },
  ]
  const idx = steps.findIndex((s) => s.id === current)
  return (
    <div className="mb-6 flex items-center gap-2">
      {steps.map((s, i) => (
        <div key={s.id} className="flex items-center gap-2">
          <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-colors ${
            i < idx ? 'bg-brand-600 text-white' :
            i === idx ? 'bg-brand-600 text-white' :
            'bg-gray-100 text-gray-400'
          }`}>
            {i < idx ? (
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            ) : i + 1}
          </div>
          <span className={`text-xs font-medium ${i <= idx ? 'text-gray-700' : 'text-gray-400'}`}>
            {s.label}
          </span>
          {i < steps.length - 1 && (
            <div className={`h-px w-8 ${i < idx ? 'bg-brand-400' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 1 — Service selection
// ---------------------------------------------------------------------------
function ServiceStep({
  services,
  onSelect,
}: {
  services: Service[]
  onSelect: (s: Service) => void
}) {
  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold text-gray-900">Select a service</h2>
      {services.map((s) => (
        <button
          key={s.id}
          onClick={() => onSelect(s)}
          className="w-full rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-all hover:border-brand-400 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <p className="font-semibold text-gray-900">{s.name}</p>
            <p className="text-sm font-bold text-brand-600">
              {formatCurrency(s.price_cents, s.currency)}
            </p>
          </div>
          <div className="mt-1 flex items-center gap-3">
            <span className="text-xs text-gray-400">
              <svg className="mr-1 inline h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {s.duration_minutes} min
            </span>
          </div>
          {s.description && (
            <p className="mt-2 text-xs text-gray-500">{s.description}</p>
          )}
        </button>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 2 — Date + time slot
// ---------------------------------------------------------------------------
function DateTimeStep({
  practitionerId,
  service,
  onSelect,
  onBack,
}: {
  practitionerId: string
  service: Service
  onSelect: (date: string, slot: TimeSlot) => void
  onBack: () => void
}) {
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)

  const today = new Date().toISOString().split('T')[0]
  const maxDate = new Date()
  maxDate.setMonth(maxDate.getMonth() + 3)

  const fetchSlots = useCallback(async (date: string) => {
    setLoading(true)
    setSlots([])
    setSelectedSlot(null)
    try {
      const res = await fetch(
        `/api/availability?practitionerId=${practitionerId}&serviceId=${service.id}&date=${date}`,
      )
      const data = await res.json()
      setSlots(data.slots ?? [])
    } catch {
      setSlots([])
    } finally {
      setLoading(false)
    }
  }, [practitionerId, service.id])

  function handleDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    const d = e.target.value
    setSelectedDate(d)
    if (d) fetchSlots(d)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-base font-semibold text-gray-900">
          {service.name} · {service.duration_minutes} min
        </h2>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Select a date</label>
        <input
          type="date"
          min={today}
          max={maxDate.toISOString().split('T')[0]}
          value={selectedDate}
          onChange={handleDateChange}
          className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm shadow-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
        />
      </div>

      {selectedDate && (
        <div>
          <p className="mb-2 text-sm font-medium text-gray-700">
            {loading ? 'Loading available times…' : slots.length > 0 ? 'Available times' : 'No availability on this date'}
          </p>
          {loading && (
            <div className="flex gap-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-10 w-24 animate-pulse rounded-lg bg-gray-100" />
              ))}
            </div>
          )}
          {!loading && slots.length > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {slots.map((slot) => (
                <button
                  key={slot.start}
                  onClick={() => setSelectedSlot(slot)}
                  className={`rounded-lg border py-2.5 text-sm font-medium transition-all ${
                    selectedSlot?.start === slot.start
                      ? 'border-brand-600 bg-brand-600 text-white shadow-sm'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-brand-400 hover:text-brand-600'
                  }`}
                >
                  {slot.startFormatted}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedSlot && (
        <button
          onClick={() => onSelect(selectedDate, selectedSlot)}
          className="w-full rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Continue with {selectedSlot.startFormatted} →
        </button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 3 — Client details form
// ---------------------------------------------------------------------------
function DetailsStep({
  service,
  date,
  slot,
  onBack,
  onSubmit,
  submitting,
  submitError,
}: {
  service: Service
  date: string
  slot: TimeSlot
  onBack: () => void
  onSubmit: (data: { name: string; email: string; phone: string; notes: string }) => void
  submitting: boolean
  submitError: string | null
}) {
  const humanDate = new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    onSubmit({
      name: fd.get('name') as string,
      email: fd.get('email') as string,
      phone: fd.get('phone') as string,
      notes: fd.get('notes') as string,
    })
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-base font-semibold text-gray-900">Your details</h2>
      </div>

      {/* Booking summary */}
      <div className="rounded-xl bg-brand-50 border border-brand-100 p-4 text-sm">
        <p className="font-semibold text-brand-800">{service.name}</p>
        <p className="mt-0.5 text-brand-600">
          {humanDate} · {slot.startFormatted} – {slot.endFormatted}
        </p>
        <p className="mt-0.5 text-brand-500">{formatCurrency(service.price_cents, service.currency)}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="name">
            Full name <span className="text-red-500">*</span>
          </label>
          <input
            id="name" name="name" type="text"
            required autoComplete="name"
            placeholder="Jane Smith"
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm shadow-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="email">
            Email address <span className="text-red-500">*</span>
          </label>
          <input
            id="email" name="email" type="email"
            required autoComplete="email"
            placeholder="jane@example.com"
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm shadow-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="phone">
            Phone number
          </label>
          <input
            id="phone" name="phone" type="tel"
            autoComplete="tel"
            placeholder="+1 555 000 1234"
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm shadow-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="notes">
            Notes for your practitioner
          </label>
          <textarea
            id="notes" name="notes" rows={3}
            placeholder="Any relevant information, questions, or special requests…"
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm shadow-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
          />
        </div>

        {submitError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {submitError}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Confirming…
            </span>
          ) : (
            'Confirm booking'
          )}
        </button>

        <p className="text-center text-xs text-gray-400">
          A confirmation email will be sent to your address.
        </p>
      </form>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Root orchestrator
// ---------------------------------------------------------------------------
export default function BookingFlow({ practitionerId, practitionerName, services }: Props) {
  const [step, setStep] = useState<Step>('service')
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [confirmationData, setConfirmationData] = useState<{
    clientName: string; clientEmail: string; serviceName: string
    date: string; startTime: string; endTime: string; price: string; practitionerName: string
  } | null>(null)

  async function handleSubmitBooking(clientData: {
    name: string; email: string; phone: string; notes: string
  }) {
    if (!selectedService || !selectedSlot) return
    setSubmitting(true)
    setSubmitError(null)

    const result = await createBooking({
      practitionerId,
      serviceId: selectedService.id,
      date: selectedDate,
      startTime: selectedSlot.start,
      clientName: clientData.name,
      clientEmail: clientData.email,
      clientPhone: clientData.phone || undefined,
      clientNotes: clientData.notes || undefined,
    })

    setSubmitting(false)

    if ('error' in result) {
      setSubmitError(result.error ?? null)
      return
    }

    // Show confirmation
    setConfirmationData({
      clientName: clientData.name,
      clientEmail: clientData.email,
      serviceName: selectedService.name,
      date: new Date(`${selectedDate}T12:00:00`).toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric',
      }),
      startTime: selectedSlot.startFormatted,
      endTime: selectedSlot.endFormatted,
      price: formatCurrency(selectedService.price_cents, selectedService.currency),
      practitionerName,
    })
    setStep('confirmed')
  }

  if (step === 'confirmed' && confirmationData) {
    return <ConfirmationScreen data={confirmationData} />
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      {step !== 'confirmed' && <StepIndicator current={step} />}

      {step === 'service' && (
        <ServiceStep
          services={services}
          onSelect={(s) => { setSelectedService(s); setStep('datetime') }}
        />
      )}

      {step === 'datetime' && selectedService && (
        <DateTimeStep
          practitionerId={practitionerId}
          service={selectedService}
          onSelect={(date, slot) => {
            setSelectedDate(date)
            setSelectedSlot(slot)
            setStep('details')
          }}
          onBack={() => setStep('service')}
        />
      )}

      {step === 'details' && selectedService && selectedSlot && (
        <DetailsStep
          service={selectedService}
          date={selectedDate}
          slot={selectedSlot}
          onBack={() => setStep('datetime')}
          onSubmit={handleSubmitBooking}
          submitting={submitting}
          submitError={submitError}
        />
      )}
    </div>
  )
}
