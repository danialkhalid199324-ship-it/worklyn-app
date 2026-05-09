'use client'

import { useState, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import { bulkImportClients } from '@/app/actions/clients'
import type { BulkClientRow } from '@/app/actions/clients'

// ---------------------------------------------------------------------------
// CSV helpers (no external library)
// ---------------------------------------------------------------------------

const TEMPLATE_HEADERS = [
  'first_name',
  'last_name',
  'email',
  'phone',
  'ndis_number',
  'guardian_name',
  'guardian_email',
  'status',
] as const

const TEMPLATE_EXAMPLE =
  'Jane,Smith,jane@example.com,0400000000,43000000,John Smith,john@example.com,active'

function downloadTemplate() {
  const csv = [TEMPLATE_HEADERS.join(','), TEMPLATE_EXAMPLE].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'clients-template.csv'
  a.click()
  URL.revokeObjectURL(url)
}

function parseCSV(text: string): string[][] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  return lines.filter((l) => l.trim()).map((line) => {
    const fields: string[] = []
    let cur = ''
    let inQuote = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { cur += '"'; i++ }
        else inQuote = !inQuote
      } else if (ch === ',' && !inQuote) {
        fields.push(cur.trim())
        cur = ''
      } else {
        cur += ch
      }
    }
    fields.push(cur.trim())
    return fields
  })
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

type ValidRow = BulkClientRow & { _valid: true; _rowNum: number }
type InvalidRow = BulkClientRow & { _valid: false; _rowNum: number; _errors: string[] }
type PreviewRow = ValidRow | InvalidRow

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validateRows(raw: string[][]): { rows: PreviewRow[]; parseError?: string } {
  if (!raw.length) return { rows: [], parseError: 'File is empty.' }

  const header = raw[0].map((h) => h.toLowerCase().trim())
  const dataRows = raw.slice(1)

  // Check that required columns are present
  const missing = ['first_name', 'last_name'].filter((k) => !header.includes(k))
  if (missing.length) {
    return {
      rows: [],
      parseError: `Missing required columns: ${missing.join(', ')}. Download the template for the correct format.`,
    }
  }

  function get(row: string[], key: string): string {
    const idx = header.indexOf(key)
    return idx >= 0 ? (row[idx] ?? '').trim() : ''
  }

  const rows: PreviewRow[] = dataRows.map((raw, i) => {
    const rowNum = i + 2
    const r: BulkClientRow = {
      first_name: get(raw, 'first_name'),
      last_name: get(raw, 'last_name'),
      email: get(raw, 'email'),
      phone: get(raw, 'phone'),
      ndis_number: get(raw, 'ndis_number'),
      guardian_name: get(raw, 'guardian_name'),
      guardian_email: get(raw, 'guardian_email'),
      status: get(raw, 'status') || 'active',
    }

    const errors: string[] = []
    if (!r.first_name) errors.push('First name required')
    if (!r.last_name) errors.push('Last name required')
    if (r.email && !EMAIL_RE.test(r.email)) errors.push('Invalid email')
    if (r.guardian_email && !EMAIL_RE.test(r.guardian_email)) errors.push('Invalid guardian email')
    const st = r.status.toLowerCase()
    if (st && st !== 'active' && st !== 'inactive') errors.push('Status must be "active" or "inactive"')

    if (errors.length) return { ...r, _valid: false, _rowNum: rowNum, _errors: errors }
    return { ...r, _valid: true, _rowNum: rowNum }
  })

  return { rows }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type Step = 'upload' | 'preview' | 'done'

interface Props {
  onClose: () => void
}

export default function BulkUploadModal({ onClose }: Props) {
  const [step, setStep] = useState<Step>('upload')
  const [rows, setRows] = useState<PreviewRow[]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [importedCount, setImportedCount] = useState(0)
  const [isPending, startTransition] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const validRows = rows.filter((r): r is ValidRow => r._valid)
  const invalidRows = rows.filter((r): r is InvalidRow => !r._valid)

  function handleFile(file: File) {
    if (!file.name.endsWith('.csv')) {
      setParseError('Please upload a CSV file.')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const parsed = parseCSV(text)
      const { rows: previewRows, parseError: err } = validateRows(parsed)
      if (err) {
        setParseError(err)
        setRows([])
      } else {
        setParseError(null)
        setRows(previewRows)
        setStep('preview')
      }
    }
    reader.readAsText(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function handleConfirmImport() {
    setImportError(null)
    startTransition(async () => {
      const result = await bulkImportClients(validRows)
      if (result.error) {
        setImportError(result.error)
      } else {
        setImportedCount(result.imported)
        setStep('done')
        router.refresh()
      }
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 shrink-0">
          <h2 className="text-base font-semibold text-gray-900">Bulk upload clients</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:text-gray-600">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto p-6 flex-1">
          {/* ── Step 1: Upload ─────────────────────────────────────────── */}
          {step === 'upload' && (
            <div className="space-y-5">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-sm font-medium text-gray-700 mb-1">Step 1 — Download the template</p>
                <p className="text-xs text-gray-500 mb-3">
                  Fill in your client data using the CSV template. Required columns: first_name, last_name.
                  Optional: email, phone, ndis_number, guardian_name, guardian_email, status (active/inactive).
                </p>
                <button
                  onClick={downloadTemplate}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download CSV template
                </button>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Step 2 — Upload your completed CSV</p>
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => fileRef.current?.click()}
                  className="cursor-pointer rounded-xl border-2 border-dashed border-gray-200 p-8 text-center hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors"
                >
                  <svg className="mx-auto h-8 w-8 text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-sm text-gray-500">Drag & drop your CSV here, or <span className="text-indigo-600 font-medium">click to browse</span></p>
                  <p className="text-xs text-gray-400 mt-1">.csv files only</p>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
                  />
                </div>
                {parseError && (
                  <p className="mt-2 text-sm text-red-600">{parseError}</p>
                )}
              </div>
            </div>
          )}

          {/* ── Step 2: Preview ────────────────────────────────────────── */}
          {step === 'preview' && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="flex gap-3">
                <div className="flex-1 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-center">
                  <p className="text-xl font-bold text-green-700">{validRows.length}</p>
                  <p className="text-xs text-green-600">Ready to import</p>
                </div>
                {invalidRows.length > 0 && (
                  <div className="flex-1 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-center">
                    <p className="text-xl font-bold text-red-700">{invalidRows.length}</p>
                    <p className="text-xs text-red-600">Rows with errors (will be skipped)</p>
                  </div>
                )}
              </div>

              {/* Preview table */}
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wide">#</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wide">Email</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wide">NDIS</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wide">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr
                        key={row._rowNum}
                        className={row._valid
                          ? 'border-b border-gray-100 bg-white'
                          : 'border-b border-red-100 bg-red-50'}
                      >
                        <td className="px-3 py-2 text-gray-400">{row._rowNum}</td>
                        <td className="px-3 py-2 font-medium text-gray-800">
                          {row.first_name} {row.last_name}
                        </td>
                        <td className="px-3 py-2 text-gray-500">{row.email || '—'}</td>
                        <td className="px-3 py-2 text-gray-500">{row.ndis_number || '—'}</td>
                        <td className="px-3 py-2 text-gray-500">{row.status || 'active'}</td>
                        <td className="px-3 py-2">
                          {row._valid ? (
                            <span className="text-green-600 font-medium">✓ Valid</span>
                          ) : (
                            <span className="text-red-600">{row._errors.join(', ')}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {invalidRows.length > 0 && (
                <p className="text-xs text-gray-500">
                  Rows with errors will be skipped. Fix the CSV and re-upload to include them.
                </p>
              )}

              {importError && (
                <p className="text-sm text-red-600">{importError}</p>
              )}
            </div>
          )}

          {/* ── Step 3: Done ───────────────────────────────────────────── */}
          {step === 'done' && (
            <div className="py-8 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-base font-semibold text-gray-900">
                {importedCount} client{importedCount !== 1 ? 's' : ''} imported
              </p>
              <p className="mt-1 text-sm text-gray-500">All valid rows have been added to your client list.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between gap-3 border-t border-gray-100 px-6 py-4 shrink-0">
          {step === 'upload' && (
            <Button variant="outline" onClick={onClose}>Cancel</Button>
          )}
          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={() => setStep('upload')}>Back</Button>
              <Button
                onClick={handleConfirmImport}
                loading={isPending}
                disabled={validRows.length === 0}
              >
                Import {validRows.length} client{validRows.length !== 1 ? 's' : ''}
              </Button>
            </>
          )}
          {step === 'done' && (
            <div className="ml-auto">
              <Button onClick={onClose}>Done</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
