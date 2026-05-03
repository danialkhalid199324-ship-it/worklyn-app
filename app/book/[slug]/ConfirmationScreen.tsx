'use client'

interface Props {
  data: {
    clientName: string
    clientEmail: string
    serviceName: string
    date: string
    startTime: string
    endTime: string
    price: string
    practitionerName: string
  }
}

export default function ConfirmationScreen({ data }: Props) {
  return (
    <div className="rounded-2xl border border-green-100 bg-white p-8 shadow-sm text-center">
      {/* Checkmark animation */}
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
        <svg
          className="h-8 w-8 text-green-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>

      <h2 className="text-xl font-bold text-gray-900">You&apos;re booked!</h2>
      <p className="mt-2 text-sm text-gray-500">
        A confirmation has been sent to{' '}
        <span className="font-medium text-gray-700">{data.clientEmail}</span>.
      </p>

      {/* Summary card */}
      <div className="mx-auto mt-6 max-w-xs rounded-xl border border-gray-100 bg-gray-50 p-5 text-left space-y-2.5">
        <Row label="Service" value={data.serviceName} />
        <Row label="Practitioner" value={data.practitionerName} />
        <Row label="Date" value={data.date} />
        <Row label="Time" value={`${data.startTime} – ${data.endTime}`} />
        <Row label="Fee" value={data.price} />
      </div>

      <p className="mt-6 text-xs text-gray-400">
        Need to cancel? Contact your practitioner directly — details are in your confirmation email.
      </p>

      <a
        href="/"
        className="mt-4 inline-block rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
      >
        Return to home
      </a>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs text-gray-400 shrink-0">{label}</span>
      <span className="text-xs font-medium text-gray-800 text-right">{value}</span>
    </div>
  )
}
