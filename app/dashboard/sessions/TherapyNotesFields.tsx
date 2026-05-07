'use client'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface TherapyNotes {
  focus_areas: string[]
  focus_other: string
  obs_engagement: string[]
  obs_emotional_regulation: string[]
  obs_communication: string[]
  obs_social_interaction: string[]
  obs_behaviour_of_concern: string[]
  session_note: string
  strategies_used: string[]
  strategies_other: string
  response_to_strategies: string
  response_comment: string
  follow_up: string[]
  follow_up_notes: string
  plan_for_next: string[]
  plan_notes: string
}

export const EMPTY_THERAPY_NOTES: TherapyNotes = {
  focus_areas: [],
  focus_other: '',
  obs_engagement: [],
  obs_emotional_regulation: [],
  obs_communication: [],
  obs_social_interaction: [],
  obs_behaviour_of_concern: [],
  session_note: '',
  strategies_used: [],
  strategies_other: '',
  response_to_strategies: '',
  response_comment: '',
  follow_up: [],
  follow_up_notes: '',
  plan_for_next: [],
  plan_notes: '',
}

// ── Parse / serialise ──────────────────────────────────────────────────────────

export function parseTherapyNotes(raw: string | null): TherapyNotes | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (parsed?.__therapy_v1) return { ...EMPTY_THERAPY_NOTES, ...parsed } as TherapyNotes
  } catch {}
  return null
}

export function computeTherapyWarnings(notes: TherapyNotes): string[] {
  const warnings: string[] = []
  if (!notes.session_note.trim() || notes.session_note.trim().length < 20) {
    warnings.push('Session Note requires at least 20 characters')
  }
  return warnings
}

// ── Formatted output (for display and AI prompt) ───────────────────────────────

export function formatTherapyNote(notes: TherapyNotes): string {
  const lines: string[] = ['Therapy Session Note', '']

  lines.push('Focus of the Session')
  if (notes.focus_areas.length > 0) notes.focus_areas.forEach((f) => lines.push(`- ${f}`))
  if (notes.focus_other.trim()) lines.push(`- Additional notes: ${notes.focus_other.trim()}`)
  if (notes.focus_areas.length === 0 && !notes.focus_other.trim()) lines.push('- Not specified')
  lines.push('')

  lines.push('Session Observations')
  const obsGroups: { label: string; values: string[] }[] = [
    { label: 'Engagement', values: notes.obs_engagement },
    { label: 'Emotional Regulation', values: notes.obs_emotional_regulation },
    { label: 'Communication', values: notes.obs_communication },
    { label: 'Social Interaction', values: notes.obs_social_interaction },
    { label: 'Behaviour of Concern', values: notes.obs_behaviour_of_concern },
  ]
  obsGroups.forEach(({ label, values }) => {
    if (values.length > 0) lines.push(`${label}: ${values.join(', ')}`)
  })
  lines.push('')

  lines.push('Session Note')
  lines.push(notes.session_note.trim() || 'Not recorded')
  lines.push('')

  lines.push('Strategies Used')
  if (notes.strategies_used.length > 0) notes.strategies_used.forEach((s) => lines.push(`- ${s}`))
  if (notes.strategies_other.trim()) lines.push(`- Other: ${notes.strategies_other.trim()}`)
  if (notes.strategies_used.length === 0 && !notes.strategies_other.trim()) lines.push('- Not specified')
  lines.push('')

  lines.push('Response to Strategies')
  if (notes.response_to_strategies) lines.push(notes.response_to_strategies)
  if (notes.response_comment.trim()) lines.push(notes.response_comment.trim())
  if (!notes.response_to_strategies && !notes.response_comment.trim()) lines.push('Not recorded')
  lines.push('')

  lines.push('Follow Up')
  if (notes.follow_up.length > 0) notes.follow_up.forEach((f) => lines.push(`- ${f}`))
  if (notes.follow_up_notes.trim()) lines.push(`- Notes: ${notes.follow_up_notes.trim()}`)
  if (notes.follow_up.length === 0 && !notes.follow_up_notes.trim()) lines.push('- Not specified')
  lines.push('')

  lines.push('Plan for Next Session')
  if (notes.plan_for_next.length > 0) notes.plan_for_next.forEach((p) => lines.push(`- ${p}`))
  if (notes.plan_notes.trim()) lines.push(`- Notes: ${notes.plan_notes.trim()}`)
  if (notes.plan_for_next.length === 0 && !notes.plan_notes.trim()) lines.push('- Not specified')

  return lines.join('\n')
}

// ── Static option lists ────────────────────────────────────────────────────────

const FOCUS_OPTIONS = [
  'Rapport building',
  'Emotional regulation',
  'Sensory regulation',
  'Communication skills',
  'Behaviour observation',
  'Social interaction',
  'School transition support',
  'Functional capacity',
  'Anxiety management',
]

const OBS_GROUPS: { key: keyof Pick<TherapyNotes, 'obs_engagement' | 'obs_emotional_regulation' | 'obs_communication' | 'obs_social_interaction' | 'obs_behaviour_of_concern'>; label: string; options: string[] }[] = [
  {
    key: 'obs_engagement',
    label: 'Engagement',
    options: ['Highly engaged', 'Moderately engaged', 'Distracted', 'Required redirection'],
  },
  {
    key: 'obs_emotional_regulation',
    label: 'Emotional Regulation',
    options: ['Calm', 'Fatigued', 'Restless', 'Dysregulated', 'Improved during session'],
  },
  {
    key: 'obs_communication',
    label: 'Communication',
    options: ['Verbal communication', 'Short sentences', 'Prompt dependent', 'Non-verbal communication', 'Responded to visual prompts'],
  },
  {
    key: 'obs_social_interaction',
    label: 'Social Interaction',
    options: ['Cooperative', 'Turn-taking observed', 'Required support with interaction', 'Avoidant', 'Limited peer/adult interaction'],
  },
  {
    key: 'obs_behaviour_of_concern',
    label: 'Behaviour of Concern',
    options: ['None observed', 'Mild indicators observed', 'Verbal escalation', 'Physical escalation', 'Difficulty remaining seated', 'Sensory seeking behaviour'],
  },
]

const STRATEGY_OPTIONS = [
  'Visual prompts',
  'Verbal prompts',
  'Positive reinforcement',
  'Sensory supports',
  'Movement breaks',
  'Choice-making opportunities',
  'Emotional regulation strategies',
  'Redirection',
  'Low-demand engagement',
  'Task modification',
  'Parent/carer guidance',
  'Safety monitoring',
]

const RESPONSE_OPTIONS = [
  'Responded well',
  'Partial response',
  'Minimal response',
  'Escalation reduced',
  'Improved regulation observed',
  'Required ongoing support',
]

const FOLLOW_UP_OPTIONS = [
  'Parent/carer follow-up required',
  'School/day program liaison',
  'MDT discussion required',
  'Risk monitoring required',
  'Update support plan',
  'Behaviour support review required',
  'No immediate follow-up required',
]

const PLAN_OPTIONS = [
  'Continue rapport building',
  'Continue sensory regulation work',
  'Increase communication-based tasks',
  'Trial visual supports',
  'Behaviour monitoring',
  'Community-based session',
  'Emotional recognition activities',
  'Review progress toward goals',
  'Practice transitions between activities',
]

// ── Helper sub-components ──────────────────────────────────────────────────────

function SectionTitle({ num, title }: { num: number; title: string }) {
  return (
    <div className="mb-3 flex items-center gap-2.5">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-600">
        {num}
      </span>
      <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
    </div>
  )
}

function CheckboxGrid({
  options,
  selected,
  onChange,
  disabled,
  cols = 2,
}: {
  options: string[]
  selected: string[]
  onChange: (val: string[]) => void
  disabled?: boolean
  cols?: 2 | 3
}) {
  function toggle(opt: string) {
    onChange(selected.includes(opt) ? selected.filter((s) => s !== opt) : [...selected, opt])
  }
  return (
    <div className={`grid gap-x-3 gap-y-2 ${cols === 3 ? 'sm:grid-cols-3 grid-cols-2' : 'sm:grid-cols-2 grid-cols-1'}`}>
      {options.map((opt) => (
        <label key={opt} className="flex cursor-pointer items-start gap-2">
          <input
            type="checkbox"
            checked={selected.includes(opt)}
            onChange={() => toggle(opt)}
            disabled={disabled}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
          />
          <span className="text-sm leading-snug text-gray-700">{opt}</span>
        </label>
      ))}
    </div>
  )
}

function OptionalText({
  value,
  onChange,
  placeholder,
  disabled,
  rows = 2,
}: {
  value: string
  onChange: (val: string) => void
  placeholder: string
  disabled?: boolean
  rows?: number
}) {
  return (
    <textarea
      rows={rows}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-300 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 disabled:bg-gray-50 disabled:text-gray-500"
    />
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

interface Props {
  notes: TherapyNotes
  onChange: (updated: TherapyNotes) => void
  warnings: string[]
  disabled?: boolean
}

export default function TherapyNotesFields({ notes, onChange, warnings, disabled }: Props) {
  function set<K extends keyof TherapyNotes>(key: K, value: TherapyNotes[K]) {
    onChange({ ...notes, [key]: value })
  }

  return (
    <div className="space-y-6">
      {/* Validation warnings */}
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

      {/* 1 · Focus of the Session */}
      <section className="rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-4">
        <SectionTitle num={1} title="Focus of the Session" />
        <CheckboxGrid
          options={FOCUS_OPTIONS}
          selected={notes.focus_areas}
          onChange={(v) => set('focus_areas', v)}
          disabled={disabled}
          cols={3}
        />
        <div className="mt-3">
          <p className="mb-1.5 text-xs text-gray-400">Additional focus notes (optional)</p>
          <OptionalText
            value={notes.focus_other}
            onChange={(v) => set('focus_other', v)}
            placeholder="Any additional focus areas…"
            disabled={disabled}
          />
        </div>
      </section>

      {/* 2 · Session Observations */}
      <section className="rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-4">
        <SectionTitle num={2} title="Session Observations" />
        <div className="space-y-4">
          {OBS_GROUPS.map(({ key, label, options }) => (
            <div key={key}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
              <CheckboxGrid
                options={options}
                selected={notes[key] as string[]}
                onChange={(v) => set(key, v)}
                disabled={disabled}
              />
            </div>
          ))}
        </div>
      </section>

      {/* 3 · Session Note */}
      <section className="rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-4">
        <SectionTitle num={3} title="Session Note" />
        <p className="mb-2 text-[11px] leading-relaxed text-gray-400">
          What activities were completed? How did the participant respond? What behaviours or clinical observations were noted? What supports were provided?
        </p>
        <textarea
          rows={5}
          value={notes.session_note}
          onChange={(e) => set('session_note', e.target.value)}
          disabled={disabled}
          placeholder="Write the session narrative here, or use Generate Professional Note below to draft from your selections…"
          className="w-full resize-y rounded-lg border border-gray-200 px-3 py-2.5 text-sm leading-relaxed text-gray-800 placeholder:text-gray-300 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 disabled:bg-gray-50 disabled:text-gray-500"
        />
        {!disabled && notes.session_note.trim() && notes.session_note.trim().length < 20 && (
          <p className="mt-1 text-xs text-amber-600">Too short — please add more detail.</p>
        )}
      </section>

      {/* 4 · Strategies Used */}
      <section className="rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-4">
        <SectionTitle num={4} title="Strategies Used" />
        <CheckboxGrid
          options={STRATEGY_OPTIONS}
          selected={notes.strategies_used}
          onChange={(v) => set('strategies_used', v)}
          disabled={disabled}
          cols={3}
        />
        <div className="mt-3">
          <p className="mb-1.5 text-xs text-gray-400">Other strategy (optional)</p>
          <OptionalText
            value={notes.strategies_other}
            onChange={(v) => set('strategies_other', v)}
            placeholder="Describe any other strategies used…"
            disabled={disabled}
          />
        </div>
      </section>

      {/* 5 · Response to Strategies */}
      <section className="rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-4">
        <SectionTitle num={5} title="Response to Strategies" />
        <select
          value={notes.response_to_strategies}
          onChange={(e) => set('response_to_strategies', e.target.value)}
          disabled={disabled}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 disabled:bg-gray-50 disabled:text-gray-500"
        >
          <option value="">— Select response —</option>
          {RESPONSE_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        <div className="mt-3">
          <p className="mb-1.5 text-xs text-gray-400">Additional comments (optional)</p>
          <OptionalText
            value={notes.response_comment}
            onChange={(v) => set('response_comment', v)}
            placeholder="Any additional observations about response…"
            disabled={disabled}
          />
        </div>
      </section>

      {/* 6 · Follow Up */}
      <section className="rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-4">
        <SectionTitle num={6} title="Follow Up" />
        <CheckboxGrid
          options={FOLLOW_UP_OPTIONS}
          selected={notes.follow_up}
          onChange={(v) => set('follow_up', v)}
          disabled={disabled}
        />
        <div className="mt-3">
          <p className="mb-1.5 text-xs text-gray-400">Follow-up notes (optional)</p>
          <OptionalText
            value={notes.follow_up_notes}
            onChange={(v) => set('follow_up_notes', v)}
            placeholder="Any additional follow-up information…"
            disabled={disabled}
          />
        </div>
      </section>

      {/* 7 · Plan for Next Session */}
      <section className="rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-4">
        <SectionTitle num={7} title="Plan for Next Session" />
        <CheckboxGrid
          options={PLAN_OPTIONS}
          selected={notes.plan_for_next}
          onChange={(v) => set('plan_for_next', v)}
          disabled={disabled}
        />
        <div className="mt-3">
          <p className="mb-1.5 text-xs text-gray-400">Plan notes (optional)</p>
          <OptionalText
            value={notes.plan_notes}
            onChange={(v) => set('plan_notes', v)}
            placeholder="Any additional plan details…"
            disabled={disabled}
          />
        </div>
      </section>
    </div>
  )
}
