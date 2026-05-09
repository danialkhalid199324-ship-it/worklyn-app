'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import ClientModal from './ClientModal'
import BulkUploadModal from './BulkUploadModal'
import { formatDate } from '@/lib/utils'
import type { ClientRow } from '@/types/database'

interface Props {
  clients: ClientRow[]
}

type StatusFilter = 'all' | 'active' | 'inactive'

export default function ClientsClient({ clients }: Props) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [modal, setModal] = useState<
    { mode: 'create' } | { mode: 'edit'; client: ClientRow } | null
  >(null)
  const [bulkOpen, setBulkOpen] = useState(false)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return clients.filter((c) => {
      const matchesSearch =
        !q ||
        `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
        (c.email ?? '').toLowerCase().includes(q) ||
        (c.phone ?? '').includes(q)

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' ? c.is_active : !c.is_active)

      return matchesSearch && matchesStatus
    })
  }, [clients, search, statusFilter])

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Clients</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              Manage participant profiles, funding plans, and service history.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setBulkOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Bulk upload
            </button>
            <Button onClick={() => setModal({ mode: 'create' })}>
              <svg className="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add client
            </Button>
          </div>
        </div>

        {/* Search + filters */}
        <Card padding="sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-sm">
              <svg
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="search"
                placeholder="Search participants…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="rounded-lg border border-gray-200 py-2 pl-3 pr-8 text-sm text-gray-600 focus:border-brand-400 focus:outline-none"
            >
              <option value="all">All participants</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </Card>

        {/* Table */}
        <Card padding="sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Phone</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Added</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <p className="mt-2 text-sm font-medium text-gray-700">
                      {search || statusFilter !== 'all' ? 'No participants match your filters' : 'No participants yet'}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      {search || statusFilter !== 'all'
                        ? 'Try adjusting your search or filter.'
                        : 'Add your first participant to start tracking service delivery.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((client) => (
                  <tr key={client.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/clients/${client.id}`}
                        className="font-medium text-gray-900 hover:text-brand-600"
                      >
                        {client.first_name} {client.last_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{client.email ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{client.phone ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Badge color={client.is_active ? 'green' : 'gray'}>
                        {client.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {formatDate(client.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setModal({ mode: 'edit', client })}
                          className="rounded p-1 text-gray-400 hover:text-gray-600"
                          title="Edit client"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <Link
                          href={`/dashboard/clients/${client.id}`}
                          className="rounded p-1 text-gray-400 hover:text-gray-600"
                          title="View profile"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                              d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      </div>

      {modal && (
        <ClientModal
          mode={modal.mode}
          client={modal.mode === 'edit' ? modal.client : undefined}
          onClose={() => setModal(null)}
        />
      )}

      {bulkOpen && <BulkUploadModal onClose={() => setBulkOpen(false)} />}
    </>
  )
}
