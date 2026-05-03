'use client'

export interface NDISNotes {
  participant_presentation: string
  supports_delivered: string
  participant_response: string
  progress_toward_goals: string
  risks_incidents: string
  next_steps: string
}

export function parseNDISNotes(raw: string | null): NDISNotes | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (parsed?.__ndis_v1) return parsed as NDISNotes
  } catch {}
  return null
}

export function computeNotesWarnings(notes: NDISNotes): string[] {
  const MIN = 20
  const required: { key: keyof NDISNotes; label: string }[] = [
    { key: 'participant_presentation', label: 'Participant Presentation' },
    { key: 'supports_delivered', label: 'Supports Delivered' },
    { key: 'participant_response', label: 'Participant Response' },
    { key: 'progress_toward_goals', label: 'Progress Toward Goals' },
  ]
  const warnings: string[] = []
  for (const { key, label } of required) {
    const val = notes[key].trim()
    if (!val) warnings.push(`${label} is required`)
    else if (val.length < MIN) warnings.push(`${label} is too short — add more detail`)
  }
  return warnings
}

const SECTIONS: { key: keyof NDISNotes; label: string; hint: string; required: boolean }[] = [
  {
    key: 'participant_presentation',
    label: 'Participant Presentation',
    hint: 'How was the participant presenting at the start of the session? (mood, engagement, triggers)',
    required: true,
  },
  {
    key: 'supports_delivered',
    label: 'Supports Delivered',
    hint: 'What supports, activities, and strategies were provided during this session?',
    required: true,
  },
  {
    key: 'participant_response',
    label: 'Participant Response',
    hint: 'How did the participant respond to the supports delivered?',
    required: true,
  },
  {
    key: 'progress_toward_goals',
    label: 'Progress Toward Goals',
    hint: "Progress observed toward the participant's NDIS goals this session.",
    required: true,
  },
  {
    key: 'risks_incidents',
    label: 'Risks / Incidents',
    hint: 'Any risks, incidents, or behaviours of concern. Leave blank if none.',
    required: false,
  },
  {
    key: 'next_steps',
    label: 'Next Steps',
    hint: 'What is planned for the next session?',
    required: false,
  },
]

interface SessionMeta {
  date: string
  startTime: string
  endTime: string
  duration: string
  serviceName: string
}

interface Props {
  notes: NDISNotes
  onChange: (updated: NDISNotes) => void
  warnings: string[]
  meta: SessionMeta
  disabled?: boolean
}

export default function NDISNotesFields({ notes, onChange, warnings, meta, disabled }: Props) {
  const hasMeta = meta.date || meta.duration || meta.serviceName

  return (
    <div className="space-y-5">
      {/* Auto-fill session reference */}
      {hasMeta && (
        <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-indigo-400">
            Session Reference
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-indigo-700">
            {meta.date && <span>{meta.date}</span>}
            {meta.startTime && meta.endTime ? (
              <span>{meta.startTime} – {meta.endTime}</span>
            ) : meta.startTime ? (
              <span>From {meta.startTime}</span>
            ) : null}
            {meta.duration && <span>{meta.duration} min</span>}
            {meta.serviceName && <span className="font-medium">{meta.serviceName}</span>}
          </div>
        </div>
      )}

      {/* Validation warnings — non-blocking, shown after first save attempt */}
      {warnings.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="mb-1.5 text-xs font-semibold text-amber-800">Notes require attention:</p>
          <ul className="space-y-0.5">
            {warnings.map((w, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-amber-700">
                <span className="mt-px shrink-0 text-amber-500">·</span>
                {w}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Structured NDIS sections */}
      {SECTIONS.map(({ key, label, hint, required }) => {
        const value = notes[key]
        const isTooShort = required && !disabled && value.trim().length > 0 && value.trim().length < 20
        return (
          <div key={key}>
            <div className="mb-1 flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">{label}</label>
              {required ? (
                <span className="text-[11px] font-medium text-indigo-400">required</span>
              ) : (
                <span className="text-[11px] text-gray-400">optional</span>
              )}
            </div>
            <p className="mb-1.5 text-[11px] leading-relaxed text-gray-400">{hint}</p>
            <textarea
              rows={4}
              disabled={disabled}
              value={value}
              onChange={(e) => onChange({ ...notes, [key]: e.target.value })}
              placeholder={disabled ? '' : `Enter ${label.toLowerCase()}…`}
              className="w-full resize-y rounded-lg border border-gray-200 px-3 py-2.5 text-sm leading-relaxed text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-500"
            />
            {isTooShort && (
              <p className="mt-0.5 text-xs text-amber-600">Too short — please add more detail.</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
