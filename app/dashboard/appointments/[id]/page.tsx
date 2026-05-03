import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAuth } from '@/lib/auth'
import {
  getPractitionerByUserId,
  getAppointmentById,
  getSessionNoteByAppointmentId,
} from '@/lib/db'
import { formatDate, formatTime } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import SessionNoteForm from './SessionNoteForm'

interface Props {
  params: { id: string }
}

export const metadata: Metadata = { title: 'Appointment' }

const STATUS_COLORS: Record<string, 'gray' | 'green' | 'amber' | 'red' | 'blue' | 'purple'> = {
  scheduled: 'blue',
  confirmed: 'green',
  completed: 'gray',
  cancelled: 'red',
  no_show: 'amber',
}

export default async function AppointmentDetailPage({ params }: Props) {
  const user = await requireAuth()
  const practitioner = await getPractitionerByUserId(user.id)

  let appointment
  try {
    appointment = await getAppointmentById(practitioner.id, params.id)
  } catch {
    notFound()
  }

  const existingNote = await getSessionNoteByAppointmentId(params.id)

  const client = appointment.clients as {
    id: string
    first_name: string
    last_name: string
    email: string | null
  } | null

  const service = appointment.services as {
    name: string
    duration_minutes: number
  } | null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          {client && (
            <Link
              href={`/dashboard/clients/${client.id}`}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">
                {client
                  ? `${client.first_name} ${client.last_name}`
                  : 'Appointment'}
              </h1>
              <Badge color={STATUS_COLORS[appointment.status] ?? 'gray'}>
                {appointment.status.replace('_', ' ')}
              </Badge>
            </div>
            <p className="mt-0.5 text-sm text-gray-500">
              {service?.name ?? 'Session'} &middot;{' '}
              {formatDate(appointment.start_time)} &middot;{' '}
              {formatTime(appointment.start_time)}–{formatTime(appointment.end_time)}
            </p>
          </div>
        </div>
      </div>

      {/* Session note form + report generator */}
      <SessionNoteForm
        appointmentId={params.id}
        clientId={client?.id ?? ''}
        existingNote={existingNote}
      />
    </div>
  )
}
