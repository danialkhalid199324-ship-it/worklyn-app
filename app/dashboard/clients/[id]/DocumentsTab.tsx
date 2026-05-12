'use client'

import { useState, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { uploadDocument, getDocumentSignedUrl, renameDocument, deleteDocument } from '@/app/actions/documents'
import type { ClientDocumentWithUploader } from '@/lib/db'
import type { ClinicRole } from '@/types/database'
import { formatDate } from '@/lib/utils'

const CATEGORIES = [
  'Service Agreement',
  'Support Plan',
  'Behaviour Support Plan',
  'Risk Assessment',
  'Consent Form',
  'Referral',
  'Invoice / Finance',
  'NDIS Plan',
  'Assessment Report',
  'Other',
]

const MIME_LABELS: Record<string, string> = {
  'application/pdf': 'PDF',
  'application/msword': 'Word',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
  'application/vnd.ms-excel': 'Excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel',
  'image/jpeg': 'Image',
  'image/png': 'Image',
  'image/gif': 'Image',
  'image/webp': 'Image',
  'image/tiff': 'Image',
  'text/csv': 'CSV',
  'text/plain': 'Text',
}

function friendlyType(mimeType: string): string {
  return MIME_LABELS[mimeType] ?? (mimeType.split('/')[1]?.toUpperCase() ?? 'File')
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface Props {
  clientId: string
  documents: ClientDocumentWithUploader[]
  practitionerRole: ClinicRole
}

export default function DocumentsTab({ clientId, documents, practitionerRole }: Props) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploadPending, startUpload] = useTransition()
  const [actionPending, startAction] = useTransition()

  const [category, setCategory] = useState('Other')
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState(false)

  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [renameError, setRenameError] = useState<string | null>(null)

  const [confirmDeleteDoc, setConfirmDeleteDoc] = useState<ClientDocumentWithUploader | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [loadingAction, setLoadingAction] = useState<'view' | 'download' | null>(null)

  const canUpload = ['admin', 'practitioner', 'receptionist'].includes(practitionerRole)
  const canDelete = practitionerRole === 'admin'

  // Finance role: show only Invoice / Finance category
  const visibleDocs = practitionerRole === 'finance'
    ? documents.filter((d) => d.document_category === 'Invoice / Finance')
    : documents

  function handleUpload() {
    const file = fileRef.current?.files?.[0]
    if (!file) { setUploadError('Please select a file.'); return }

    setUploadError(null)
    setUploadSuccess(false)
    const fd = new FormData()
    fd.set('client_id', clientId)
    fd.set('document_category', category)
    fd.set('file', file)

    startUpload(async () => {
      const result = await uploadDocument(fd)
      if (result.error) {
        setUploadError(result.error)
      } else {
        setUploadSuccess(true)
        if (fileRef.current) fileRef.current.value = ''
        router.refresh()
      }
    })
  }

  async function handleOpen(doc: ClientDocumentWithUploader, mode: 'view' | 'download') {
    setLoadingId(doc.id)
    setLoadingAction(mode)
    const result = await getDocumentSignedUrl(doc.id)
    setLoadingId(null)
    setLoadingAction(null)
    if (result.error) { setActionError(result.error); return }
    const url = result.url!
    if (mode === 'view') {
      window.open(url, '_blank', 'noopener')
    } else {
      const a = document.createElement('a')
      a.href = url
      a.download = doc.file_name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }
  }

  function startRename(doc: ClientDocumentWithUploader) {
    setRenamingId(doc.id)
    setRenameValue(doc.file_name)
    setRenameError(null)
  }

  function cancelRename() {
    setRenamingId(null)
    setRenameError(null)
  }

  function commitRename(docId: string) {
    setRenameError(null)
    startAction(async () => {
      const result = await renameDocument(docId, renameValue)
      if (result.error) {
        setRenameError(result.error)
      } else {
        setRenamingId(null)
        router.refresh()
      }
    })
  }

  function handleDelete(doc: ClientDocumentWithUploader) {
    setActionError(null)
    startAction(async () => {
      const result = await deleteDocument(doc.id)
      if (result.error) {
        setActionError(result.error)
      } else {
        setConfirmDeleteDoc(null)
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-5">
      {/* Upload card — hidden for finance role */}
      {canUpload && (
        <Card>
          <h3 className="mb-4 text-sm font-semibold text-gray-900">Upload document</h3>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-48">
              <label className="mb-1 block text-xs font-medium text-gray-500">
                File <span className="text-gray-400">(max 50 MB)</span>
              </label>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp,.tif,.tiff,.csv,.txt"
                className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100"
              />
            </div>
            <Button
              type="button"
              loading={uploadPending}
              onClick={handleUpload}
            >
              Upload
            </Button>
          </div>
          {uploadError && (
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {uploadError}
            </p>
          )}
          {uploadSuccess && (
            <p className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
              Document uploaded successfully.
            </p>
          )}
        </Card>
      )}

      {/* Documents list */}
      {visibleDocs.length === 0 ? (
        <Card>
          <div className="py-8 text-center">
            <p className="text-sm text-gray-500">No documents uploaded yet.</p>
          </div>
        </Card>
      ) : (
        <Card padding="sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Category</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Size</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Uploaded</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">By</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {visibleDocs.map((doc) => {
                const isRenaming = renamingId === doc.id
                const isLoadingThis = loadingId === doc.id
                return (
                  <tr key={doc.id} className="group">
                    {/* Name cell — inline rename */}
                    <td className="px-4 py-3 font-medium text-gray-900 max-w-xs">
                      {isRenaming ? (
                        <div className="flex items-center gap-2">
                          <input
                            autoFocus
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') commitRename(doc.id)
                              if (e.key === 'Escape') cancelRename()
                            }}
                            className="w-full rounded border border-indigo-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <button
                            onClick={() => commitRename(doc.id)}
                            disabled={actionPending}
                            className="shrink-0 rounded px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 disabled:opacity-50"
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelRename}
                            className="shrink-0 rounded px-2 py-1 text-xs text-gray-400 hover:bg-gray-100"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="truncate">{doc.file_name}</span>
                          {canUpload && (
                            <button
                              onClick={() => startRename(doc)}
                              title="Rename"
                              className="shrink-0 opacity-0 group-hover:opacity-100 rounded p-0.5 text-gray-400 hover:text-gray-600 transition-opacity"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828A2 2 0 0110 16.414H8v-2a2 2 0 01.586-1.414z" />
                              </svg>
                            </button>
                          )}
                        </div>
                      )}
                      {isRenaming && renameError && (
                        <p className="mt-1 text-xs text-red-600">{renameError}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{doc.document_category}</td>
                    <td className="px-4 py-3 text-gray-500">{friendlyType(doc.file_type)}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatBytes(doc.file_size)}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(doc.created_at)}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {doc.uploader
                        ? `${doc.uploader.first_name} ${doc.uploader.last_name}`
                        : '—'}
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                        <button
                          onClick={() => handleOpen(doc, 'view')}
                          disabled={isLoadingThis}
                          title="View"
                          className="rounded px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 disabled:opacity-50"
                        >
                          {isLoadingThis && loadingAction === 'view' ? 'Opening…' : 'View'}
                        </button>
                        <button
                          onClick={() => handleOpen(doc, 'download')}
                          disabled={isLoadingThis}
                          title="Download"
                          className="rounded px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                        >
                          {isLoadingThis && loadingAction === 'download' ? 'Downloading…' : 'Download'}
                        </button>
                        {canDelete && (
                          <button
                            onClick={() => setConfirmDeleteDoc(doc)}
                            title="Delete"
                            className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4h6v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>
      )}

      {/* Global action error toast */}
      {actionError && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-lg">
          {actionError}
          <button onClick={() => setActionError(null)} className="ml-3 font-medium underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDeleteDoc && (
        <ConfirmDialog
          title="Delete document?"
          message={`"${confirmDeleteDoc.file_name}" will be permanently deleted and cannot be recovered.`}
          confirmLabel="Delete document"
          loading={actionPending}
          onConfirm={() => handleDelete(confirmDeleteDoc)}
          onCancel={() => setConfirmDeleteDoc(null)}
        />
      )}
    </div>
  )
}
