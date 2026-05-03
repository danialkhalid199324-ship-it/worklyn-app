'use client'

import { useState, useTransition } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { saveSessionNote, generateAIReport, saveReport } from '@/app/actions/session-notes'
import { generateAndStorePDF } from '@/app/actions/reports'
import type { SessionNoteRow } from '@/types/database'

interface Props {
  appointmentId: string
  clientId: string
  existingNote: SessionNoteRow | null
}

type Phase = 'form' | 'generating' | 'review' | 'saved'

export default function SessionNoteForm({ appointmentId, clientId, existingNote }: Props) {
  const [noteId, setNoteId] = useState<string | null>(existingNote?.id ?? null)
  const [phase, setPhase] = useState<Phase>('form')
  const [draftText, setDraftText] = useState('')
  const [finalText, setFinalText] = useState('')
  const [reportId, setReportId] = useState<string | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [noteError, setNoteError] = useState<string | null>(null)
  const [reportError, setReportError] = useState<string | null>(null)
  const [pdfError, setPdfError] = useState<string | null>(null)
  const [score, setScore] = useState<number>(existingNote?.progress_score ?? 5)

  const [isSaving, startSave] = useTransition()
  const [isGenerating, startGenerate] = useTransition()
  const [isSavingReport, startSaveReport] = useTransition()
  const [isGeneratingPdf, startPdf] = useTransition()

  function handleSaveNote(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setNoteError(null)

    startSave(async () => {
      const result = await saveSessionNote(appointmentId, formData)
      if (result?.error) {
        setNoteError(result.error)
      } else {
        setNoteId(result.noteId!)
      }
    })
  }

  function handleGenerate() {
    if (!noteId) return
    setReportError(null)
    setPhase('generating')

    startGenerate(async () => {
      const result = await generateAIReport(noteId, appointmentId)
      if (result.error) {
        setReportError(result.error)
        setPhase('form')
      } else {
        setDraftText(result.text ?? '')
        setFinalText(result.text ?? '')
        setPhase('review')
      }
    })
  }

  function handleSaveReport() {
    setReportError(null)

    startSaveReport(async () => {
      const result = await saveReport({ clientId, appointmentId, draftText, finalText })
      if (result?.error) {
        setReportError(result.error)
      } else {
        setReportId(result.reportId ?? null)
        setPhase('saved')
      }
    })
  }

  function handleGeneratePdf() {
    if (!reportId) return
    setPdfError(null)
    setPdfUrl(null)

    startPdf(async () => {
      const result = await generateAndStorePDF(reportId)
      if (result.error) {
        setPdfError(result.error)
      } else {
        setPdfUrl(result.url ?? null)
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------------ */}
      {/* Session Note Form                                                   */}
      {/* ------------------------------------------------------------------ */}
      <Card>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Session Note</h2>
          {noteId && (
            <span className="flex items-center gap-1.5 text-xs text-green-600">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              Saved
            </span>
          )}
        </div>

        <form onSubmit={handleSaveNote} className="space-y-5">
          <NoteField label="Goals addressed this session" name="goals_addressed"
            defaultValue={existingNote?.goals_addressed ?? ''}
            placeholder="Which treatment goals were worked on?" />
          <NoteField label="Clinical observations" name="observations"
            defaultValue={existingNote?.observations ?? ''}
            placeholder="Affect, behaviour, engagement level, presentation…" />
          <NoteField label="Interventions used" name="interventions_used"
            defaultValue={existingNote?.interventions_used ?? ''}
            placeholder="Techniques, modalities, or exercises applied…" />
          <NoteField label="Participant response" name="participant_response"
            defaultValue={existingNote?.participant_response ?? ''}
            placeholder="How did the client respond to interventions?" />
          <NoteField label="Risks / issues noted" name="risks_issues"
            defaultValue={existingNote?.risks_issues ?? ''}
            placeholder="Safety concerns, barriers, or significant events (leave blank if none)" />
          <NoteField label="Next steps / plan" name="next_steps"
            defaultValue={existingNote?.next_steps ?? ''}
            placeholder="Homework, referrals, focus for next session…" />

          {/* Progress score */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Progress score</label>
              <span className="text-sm font-semibold text-brand-600">{score}/10</span>
            </div>
            <input type="range" name="progress_score" min={1} max={10} value={score}
              onChange={(e) => setScore(Number(e.target.value))}
              className="w-full accent-brand-600" />
            <div className="mt-1 flex justify-between text-xs text-gray-400">
              <span>1 — Minimal</span>
              <span>5 — Moderate</span>
              <span>10 — Significant</span>
            </div>
          </div>

          {/* Private toggle */}
          <label className="flex cursor-pointer items-center gap-2.5">
            <input type="checkbox" name="is_private"
              defaultChecked={existingNote?.is_private ?? false}
              className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
            <span className="text-sm text-gray-600">Mark note as private</span>
          </label>

          {noteError && <p className="text-sm text-red-600">{noteError}</p>}

          <div className="flex justify-end">
            <Button type="submit" loading={isSaving}>
              {noteId ? 'Update note' : 'Save note'}
            </Button>
          </div>
        </form>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* AI Report Generator                                                 */}
      {/* ------------------------------------------------------------------ */}
      <Card>
        <div className="mb-5">
          <h2 className="text-base font-semibold text-gray-900">AI Session Report</h2>
          <p className="mt-1 text-sm text-gray-500">
            Generate a professional session report from your notes using Claude AI.
          </p>
        </div>

        {phase === 'saved' ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl bg-green-50 p-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100">
                <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-green-800">Report saved</p>
                <p className="text-xs text-green-600">Stored in the client&apos;s record.</p>
              </div>
            </div>

            {/* PDF generation */}
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <p className="mb-3 text-sm font-medium text-gray-700">
                Generate PDF with charts
              </p>
              <p className="mb-4 text-xs text-gray-500">
                Creates a styled PDF with progress-over-time and session-frequency charts embedded,
                stored in Supabase Storage.
              </p>

              {pdfUrl ? (
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download PDF
                </a>
              ) : (
                <>
                  {pdfError && <p className="mb-3 text-sm text-red-600">{pdfError}</p>}
                  <Button
                    variant="outline"
                    onClick={handleGeneratePdf}
                    loading={isGeneratingPdf}
                    disabled={!reportId}
                  >
                    <svg className="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    {isGeneratingPdf ? 'Generating PDF…' : 'Generate PDF'}
                  </Button>
                </>
              )}
            </div>
          </div>
        ) : phase === 'form' ? (
          <div className="flex flex-col items-start gap-3">
            {!noteId && (
              <p className="text-sm text-amber-600">
                Save the session note above before generating a report.
              </p>
            )}
            {reportError && <p className="text-sm text-red-600">{reportError}</p>}
            <Button variant="outline" onClick={handleGenerate} loading={isGenerating} disabled={!noteId}>
              <svg className="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Generate Report
            </Button>
          </div>
        ) : phase === 'generating' ? (
          <div className="flex items-center gap-3 py-4 text-sm text-gray-500">
            <svg className="h-5 w-5 animate-spin text-brand-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Generating report with Claude AI…
          </div>
        ) : (
          /* Review phase */
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Draft report — review and edit before saving
              </label>
              <textarea
                value={finalText}
                onChange={(e) => setFinalText(e.target.value)}
                rows={20}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 font-mono text-sm leading-relaxed text-gray-800 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
              />
            </div>

            {reportError && <p className="text-sm text-red-600">{reportError}</p>}

            <div className="flex items-center justify-between">
              <button type="button" onClick={() => setPhase('form')}
                className="text-sm text-gray-500 hover:text-gray-700">
                ← Back
              </button>
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleGenerate} loading={isGenerating}>
                  Regenerate
                </Button>
                <Button onClick={handleSaveReport} loading={isSavingReport}>
                  Save report
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

function NoteField({ label, name, defaultValue, placeholder }: {
  label: string; name: string; defaultValue: string; placeholder: string
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">{label}</label>
      <textarea name={name} rows={3} defaultValue={defaultValue} placeholder={placeholder}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm placeholder-gray-300 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400" />
    </div>
  )
}
