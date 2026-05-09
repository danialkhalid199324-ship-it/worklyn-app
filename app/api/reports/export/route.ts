import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getPractitionerByUserId } from '@/lib/db'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getPeriodDates, type Period } from '@/lib/reports'

const VALID_PERIODS: Period[] = ['this_month', 'last_month', 'last_3_months', 'this_year']
const VALID_TYPES = ['overdue-invoices', 'clients', 'sessions', 'financial-summary'] as const
type ExportType = (typeof VALID_TYPES)[number]

const fmtAUD = (cents: number) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(cents / 100)

function cell(v: string | number | null | undefined): string {
  const s = String(v ?? '').replace(/\r?\n/g, ' ').replace(/"/g, '""')
  return `"${s}"`
}

function csvRow(...vals: (string | number | null | undefined)[]): string {
  return vals.map(cell).join(',')
}

// ---------------------------------------------------------------------------
// Overdue invoices
// ---------------------------------------------------------------------------

async function buildOverdueInvoices(pid: string): Promise<string> {
  const supabase = await createServerSupabaseClient()

  const { data } = await supabase
    .from('invoices')
    .select('invoice_number, issued_at, due_at, total_cents, status, recipient_type, recipient_name, recipient_email, recipient_phone, clients(first_name, last_name)')
    .eq('practitioner_id', pid)
    .eq('status', 'overdue')
    .order('due_at', { ascending: true })

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  type Row = {
    invoice_number: string
    issued_at: string | null
    due_at: string | null
    total_cents: number
    status: string
    recipient_type: string | null
    recipient_name: string | null
    recipient_email: string | null
    recipient_phone: string | null
    clients: { first_name: string; last_name: string } | null
  }

  const lines: string[] = [
    csvRow('Invoice Number', 'Client Name', 'Invoice Date', 'Due Date', 'Amount', 'Status', 'Days Overdue', 'Recipient Type', 'Recipient Name', 'Recipient Email', 'Recipient Phone'),
  ]

  for (const inv of (data ?? []) as unknown as Row[]) {
    const clientName = inv.clients
      ? `${inv.clients.first_name} ${inv.clients.last_name}`
      : ''
    const daysOverdue = inv.due_at
      ? Math.max(0, Math.round((today.getTime() - new Date(inv.due_at + 'T00:00:00').getTime()) / 86400000))
      : ''
    lines.push(csvRow(
      inv.invoice_number,
      clientName,
      inv.issued_at ? inv.issued_at.slice(0, 10) : '',
      inv.due_at ?? '',
      fmtAUD(inv.total_cents),
      inv.status,
      daysOverdue,
      inv.recipient_type ?? '',
      inv.recipient_name ?? '',
      inv.recipient_email ?? '',
      inv.recipient_phone ?? '',
    ))
  }

  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Client list
// ---------------------------------------------------------------------------

async function buildClients(pid: string): Promise<string> {
  const supabase = await createServerSupabaseClient()

  const { data } = await supabase
    .from('clients')
    .select('first_name, last_name, email, phone, date_of_birth, address, is_active, funding_type, ndis_number, ndis_management_type, plan_manager_name, plan_manager_email, plan_manager_phone, self_manager_name, self_manager_email, created_at')
    .eq('practitioner_id', pid)
    .order('last_name', { ascending: true })
    .order('first_name', { ascending: true })

  type Row = {
    first_name: string; last_name: string; email: string | null; phone: string | null
    date_of_birth: string | null; address: string | null; is_active: boolean
    funding_type: string | null; ndis_number: string | null; ndis_management_type: string | null
    plan_manager_name: string | null; plan_manager_email: string | null; plan_manager_phone: string | null
    self_manager_name: string | null; self_manager_email: string | null; created_at: string
  }

  const lines: string[] = [
    csvRow('Client Name', 'Email', 'Phone', 'Date of Birth', 'Address', 'Status', 'Funding Type', 'NDIS Number', 'NDIS Management Type', 'Plan Manager Name', 'Plan Manager Email', 'Plan Manager Phone', 'Self Manager Name', 'Self Manager Email', 'Created Date'),
  ]

  for (const c of (data ?? []) as unknown as Row[]) {
    lines.push(csvRow(
      `${c.first_name} ${c.last_name}`,
      c.email ?? '',
      c.phone ?? '',
      c.date_of_birth ?? '',
      c.address ?? '',
      c.is_active ? 'Active' : 'Inactive',
      c.funding_type ?? '',
      c.ndis_number ?? '',
      c.ndis_management_type ?? '',
      c.plan_manager_name ?? '',
      c.plan_manager_email ?? '',
      c.plan_manager_phone ?? '',
      c.self_manager_name ?? '',
      c.self_manager_email ?? '',
      c.created_at.slice(0, 10),
    ))
  }

  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

async function buildSessions(pid: string, from: string, to: string): Promise<string> {
  const supabase = await createServerSupabaseClient()

  const { data: sessData } = await supabase
    .from('sessions')
    .select('service_date, start_time, status, duration_minutes, rate, ndis_line_item, notes, invoice_id, clients(first_name, last_name), services(name, ndis_line_item)')
    .eq('practitioner_id', pid)
    .gte('service_date', from)
    .lte('service_date', to)
    .order('service_date', { ascending: true })
    .order('start_time', { nullsFirst: false })

  type SRow = {
    service_date: string; start_time: string | null; status: string
    duration_minutes: number; rate: number; ndis_line_item: string | null
    notes: string | null; invoice_id: string | null
    clients: { first_name: string; last_name: string } | null
    services: { name: string; ndis_line_item: string | null } | null
  }

  const sessions = (sessData ?? []) as unknown as SRow[]

  // Resolve invoice numbers in one batch query
  const invoiceIds = Array.from(new Set(sessions.map(s => s.invoice_id).filter(Boolean))) as string[]
  const invoiceNumberMap: Record<string, string> = {}
  if (invoiceIds.length > 0) {
    const { data: invData } = await supabase
      .from('invoices')
      .select('id, invoice_number')
      .in('id', invoiceIds)
    for (const inv of (invData ?? []) as { id: string; invoice_number: string }[]) {
      invoiceNumberMap[inv.id] = inv.invoice_number
    }
  }

  const lines: string[] = [
    csvRow('Session Date', 'Client Name', 'Service', 'NDIS Line Item', 'Duration (min)', 'Rate ($/hr)', 'Amount', 'Status', 'Invoice Number', 'Notes Completed'),
  ]

  for (const s of sessions) {
    const amountCents = Math.round(s.rate * (s.duration_minutes / 60) * 100)
    const ndisLineItem = s.ndis_line_item ?? s.services?.ndis_line_item ?? ''
    const clientName = s.clients ? `${s.clients.first_name} ${s.clients.last_name}` : ''
    const invoiceNumber = s.invoice_id ? (invoiceNumberMap[s.invoice_id] ?? '') : ''
    const notesCompleted = s.notes !== null ? 'Yes' : 'No'
    lines.push(csvRow(
      s.service_date,
      clientName,
      s.services?.name ?? '',
      ndisLineItem,
      s.duration_minutes,
      s.rate.toFixed(2),
      fmtAUD(amountCents),
      s.status,
      invoiceNumber,
      notesCompleted,
    ))
  }

  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Financial summary
// ---------------------------------------------------------------------------

async function buildFinancialSummary(pid: string, from: string, to: string, periodLabel: string): Promise<string> {
  const supabase = await createServerSupabaseClient()

  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  type InvRow = { id: string; status: string; total_cents: number; client_id: string; clients: { first_name: string; last_name: string } | null }
  type SessRow = { rate: number; duration_minutes: number; invoice_id: string | null; services: { name: string } | null }

  const [allInvRes, monthRevRes, sessInPeriodRes] = await Promise.all([
    supabase
      .from('invoices')
      .select('id, status, total_cents, client_id, clients(first_name, last_name)')
      .eq('practitioner_id', pid),
    supabase
      .from('invoices')
      .select('total_cents')
      .eq('practitioner_id', pid).eq('status', 'paid').gte('paid_at', monthStart),
    supabase
      .from('sessions')
      .select('rate, duration_minutes, invoice_id, services(name)')
      .eq('practitioner_id', pid)
      .gte('service_date', from).lte('service_date', to),
  ])

  const allInvoices = (allInvRes.data ?? []) as unknown as InvRow[]
  const sessions    = (sessInPeriodRes.data ?? []) as unknown as SessRow[]

  const totalPaidCents      = allInvoices.filter(r => r.status === 'paid').reduce((s, r) => s + r.total_cents, 0)
  const totalDraftCents     = allInvoices.filter(r => r.status === 'draft').reduce((s, r) => s + r.total_cents, 0)
  const totalSentCents      = allInvoices.filter(r => r.status === 'sent').reduce((s, r) => s + r.total_cents, 0)
  const totalOverdueCents   = allInvoices.filter(r => r.status === 'overdue').reduce((s, r) => s + r.total_cents, 0)
  const totalOutstandingCents = totalDraftCents + totalSentCents + totalOverdueCents
  const totalInvoicedCents  = totalPaidCents + totalOutstandingCents
  const revenueMonthCents   = (monthRevRes.data ?? []).reduce((s, r) => s + (r as { total_cents: number }).total_cents, 0)

  // Revenue by client (all paid invoices, all time)
  const clientRevMap: Record<string, { name: string; cents: number }> = {}
  for (const inv of allInvoices.filter(r => r.status === 'paid')) {
    const name = inv.clients ? `${inv.clients.first_name} ${inv.clients.last_name}` : 'Unknown'
    if (!clientRevMap[inv.client_id]) clientRevMap[inv.client_id] = { name, cents: 0 }
    clientRevMap[inv.client_id].cents += inv.total_cents
  }

  // Revenue by service (sessions in period with paid invoice)
  const paidIds = new Set(allInvoices.filter(r => r.status === 'paid').map(r => r.id))
  const serviceRevMap: Record<string, { name: string; cents: number; count: number }> = {}
  for (const s of sessions) {
    if (s.invoice_id && paidIds.has(s.invoice_id)) {
      const name = s.services?.name ?? 'Unspecified'
      if (!serviceRevMap[name]) serviceRevMap[name] = { name, cents: 0, count: 0 }
      serviceRevMap[name].cents += Math.round(s.rate * (s.duration_minutes / 60) * 100)
      serviceRevMap[name].count += 1
    }
  }

  const genDate = now.toLocaleDateString('en-AU')
  const lines: string[] = []

  lines.push(csvRow('Financial Summary Report'))
  lines.push(csvRow(`Period: ${periodLabel}`))
  lines.push(csvRow(`Generated: ${genDate}`))
  lines.push('')
  lines.push(csvRow('Metric', 'Amount (AUD)'))
  lines.push(csvRow('Total Invoiced (All Time)',     fmtAUD(totalInvoicedCents)))
  lines.push(csvRow('Total Paid (All Time)',         fmtAUD(totalPaidCents)))
  lines.push(csvRow('Total Outstanding',            fmtAUD(totalOutstandingCents)))
  lines.push(csvRow('Draft Invoices Total',         fmtAUD(totalDraftCents)))
  lines.push(csvRow('Sent Invoices Total',          fmtAUD(totalSentCents)))
  lines.push(csvRow('Overdue Invoices Total',       fmtAUD(totalOverdueCents)))
  lines.push(csvRow('Revenue This Month',           fmtAUD(revenueMonthCents)))
  lines.push('')

  lines.push(csvRow('Revenue by Client (All Paid Invoices)'))
  lines.push(csvRow('Client Name', 'Total Paid (AUD)'))
  const sortedClients = Object.values(clientRevMap).sort((a, b) => b.cents - a.cents)
  if (sortedClients.length === 0) {
    lines.push(csvRow('No paid invoices recorded', ''))
  } else {
    for (const c of sortedClients) lines.push(csvRow(c.name, fmtAUD(c.cents)))
  }
  lines.push('')

  lines.push(csvRow(`Revenue by Service (${periodLabel} — paid sessions only)`))
  lines.push(csvRow('Service', 'Sessions', 'Amount (AUD)'))
  const sortedServices = Object.values(serviceRevMap).sort((a, b) => b.cents - a.cents)
  if (sortedServices.length === 0) {
    lines.push(csvRow('No paid sessions this period', '', ''))
  } else {
    for (const s of sortedServices) lines.push(csvRow(s.name, s.count, fmtAUD(s.cents)))
  }

  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const rawType   = searchParams.get('type') ?? ''
  const rawPeriod = searchParams.get('period') ?? 'this_month'

  if (!VALID_TYPES.includes(rawType as ExportType)) {
    return new NextResponse('Invalid report type', { status: 400 })
  }

  const type: ExportType = rawType as ExportType
  const period: Period = VALID_PERIODS.includes(rawPeriod as Period)
    ? (rawPeriod as Period)
    : 'this_month'

  const user = await requireAuth()
  const practitioner = await getPractitionerByUserId(user.id)
  const pid = practitioner.id

  const { from, to, label } = getPeriodDates(period)
  const today = new Date().toISOString().slice(0, 10)

  let csv: string
  let filename: string

  switch (type) {
    case 'overdue-invoices':
      csv = await buildOverdueInvoices(pid)
      filename = `overdue-invoices-report-${today}.csv`
      break
    case 'clients':
      csv = await buildClients(pid)
      filename = `clients-report-${today}.csv`
      break
    case 'sessions':
      csv = await buildSessions(pid, from, to)
      filename = `sessions-report-${today}.csv`
      break
    case 'financial-summary':
      csv = await buildFinancialSummary(pid, from, to, label)
      filename = `financial-summary-report-${today}.csv`
      break
  }

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
