import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getPractitionerByUserId } from '@/lib/db'
import { getReportData, getPeriodDates, type Period } from '@/lib/reports'

const VALID_PERIODS: Period[] = ['this_month', 'last_month', 'last_3_months', 'this_year']
const VALID_TYPES = ['all', 'revenue', 'sessions', 'clients', 'invoices'] as const
type ExportType = (typeof VALID_TYPES)[number]

const fmtAUD = (cents: number) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(cents / 100)

function csvRow(...cells: (string | number)[]) {
  return cells.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')
}

function section(title: string) {
  return [`\n"${title}"`]
}

// ---------------------------------------------------------------------------
// Per-type CSV builders
// ---------------------------------------------------------------------------

function buildRevenueCsv(data: Awaited<ReturnType<typeof getReportData>>, periodLabel: string) {
  const { revenue } = data
  const lines: string[] = []

  lines.push(csvRow(`Revenue Report — ${periodLabel}`))
  lines.push(csvRow(`Generated`, new Date().toLocaleDateString('en-AU')))

  lines.push(...section('Summary'))
  lines.push(csvRow('Metric', 'Amount (AUD)'))
  lines.push(csvRow('Paid Revenue', fmtAUD(revenue.paidCents)))
  lines.push(csvRow('Outstanding (draft / sent / overdue)', fmtAUD(revenue.unpaidCents)))
  lines.push(csvRow('Total Invoiced', fmtAUD(revenue.paidCents + revenue.unpaidCents)))

  lines.push(...section('Revenue by Service'))
  lines.push(csvRow('Service', 'Sessions', 'Amount (AUD)'))
  if (revenue.byService.length === 0) {
    lines.push(csvRow('No invoiced sessions this period', '', ''))
  } else {
    revenue.byService.forEach((s) =>
      lines.push(csvRow(s.name, s.count, fmtAUD(s.amountCents))),
    )
  }

  lines.push(...section('Revenue by Client'))
  lines.push(csvRow('Client', 'Amount (AUD)'))
  if (revenue.byClient.length === 0) {
    lines.push(csvRow('No paid revenue this period', ''))
  } else {
    revenue.byClient.forEach((c) => lines.push(csvRow(c.name, fmtAUD(c.amountCents))))
  }

  if (revenue.byMonth.length > 0) {
    lines.push(...section('Revenue by Month'))
    lines.push(csvRow('Month', 'Amount (AUD)'))
    revenue.byMonth.forEach((m) => lines.push(csvRow(m.month, fmtAUD(m.amountCents))))
  }

  return lines.join('\n')
}

function buildSessionsCsv(data: Awaited<ReturnType<typeof getReportData>>, periodLabel: string) {
  const { sessions } = data
  const lines: string[] = []

  lines.push(csvRow(`Sessions Report — ${periodLabel}`))
  lines.push(csvRow(`Generated`, new Date().toLocaleDateString('en-AU')))

  lines.push(...section('Status Summary'))
  lines.push(csvRow('Status', 'Count'))
  lines.push(csvRow('Total', sessions.total))
  lines.push(csvRow('Completed', sessions.completed))
  lines.push(csvRow('Scheduled (upcoming)', sessions.scheduled))
  lines.push(csvRow('Cancelled', sessions.cancelled))
  lines.push(
    csvRow(
      'Completion Rate',
      sessions.completed + sessions.cancelled > 0
        ? `${sessions.completionRate}%`
        : '—',
    ),
  )

  lines.push(...section('By Service'))
  lines.push(csvRow('Service', 'Total Sessions', 'Completed'))
  if (sessions.byService.length === 0) {
    lines.push(csvRow('No sessions this period', '', ''))
  } else {
    sessions.byService.forEach((s) =>
      lines.push(csvRow(s.name, s.total, s.completed)),
    )
  }

  return lines.join('\n')
}

function buildClientsCsv(data: Awaited<ReturnType<typeof getReportData>>) {
  const { clients } = data
  const lines: string[] = []

  lines.push(csvRow('Clients Report'))
  lines.push(csvRow('Generated', new Date().toLocaleDateString('en-AU')))

  lines.push(...section('Overview'))
  lines.push(csvRow('Metric', 'Value'))
  lines.push(csvRow('Total Active Clients', clients.totalActive))
  lines.push(csvRow('New This Period', clients.newInPeriod))
  lines.push(csvRow('Inactive (no session in 90 days)', clients.inactive))

  lines.push(...section('Top Clients by Revenue (All Time)'))
  lines.push(csvRow('Rank', 'Client', 'Revenue (AUD)'))
  if (clients.topByRevenue.length === 0) {
    lines.push(csvRow('', 'No paid invoices recorded yet', ''))
  } else {
    clients.topByRevenue.forEach((c, i) =>
      lines.push(csvRow(i + 1, c.name, fmtAUD(c.amountCents))),
    )
  }

  lines.push(...section('Clients with Outstanding Invoices'))
  lines.push(csvRow('Client', 'Outstanding (AUD)'))
  if (clients.withOutstanding.length === 0) {
    lines.push(csvRow('No outstanding invoices — all clear', ''))
  } else {
    clients.withOutstanding.forEach((c) =>
      lines.push(csvRow(c.name, fmtAUD(c.amountCents))),
    )
  }

  return lines.join('\n')
}

function buildInvoicesCsv(data: Awaited<ReturnType<typeof getReportData>>) {
  const { invoices } = data
  const lines: string[] = []

  lines.push(csvRow('Invoice Report — Current State'))
  lines.push(csvRow('Generated', new Date().toLocaleDateString('en-AU')))

  lines.push(...section('Status Breakdown'))
  lines.push(csvRow('Status', 'Count'))
  lines.push(csvRow('Paid', invoices.paid))
  lines.push(csvRow('Sent (awaiting payment)', invoices.sent))
  lines.push(csvRow('Overdue', invoices.overdue))
  lines.push(csvRow('Draft', invoices.draft))
  lines.push(csvRow('Cancelled', invoices.cancelled))

  lines.push(...section('Amounts'))
  lines.push(csvRow('Metric', 'Value'))
  lines.push(csvRow('Total Paid (All Time)', fmtAUD(invoices.totalPaidCents)))
  lines.push(csvRow('Total Outstanding', fmtAUD(invoices.totalOutstandingCents)))
  lines.push(
    csvRow(
      'Avg Days to Payment',
      invoices.avgDaysToPay !== null ? `${invoices.avgDaysToPay} days` : '—',
    ),
  )

  return lines.join('\n')
}

function buildAllCsv(data: Awaited<ReturnType<typeof getReportData>>, periodLabel: string) {
  return [
    buildRevenueCsv(data, periodLabel),
    '\n\n',
    buildSessionsCsv(data, periodLabel),
    '\n\n',
    buildClientsCsv(data),
    '\n\n',
    buildInvoicesCsv(data),
  ].join('')
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const rawPeriod = searchParams.get('period') ?? 'this_month'
  const rawType = searchParams.get('type') ?? 'all'

  const period: Period = VALID_PERIODS.includes(rawPeriod as Period)
    ? (rawPeriod as Period)
    : 'this_month'

  const type: ExportType = VALID_TYPES.includes(rawType as ExportType)
    ? (rawType as ExportType)
    : 'all'

  const user = await requireAuth()
  const practitioner = await getPractitionerByUserId(user.id)
  const data = await getReportData(practitioner.id, period)
  const { label } = getPeriodDates(period)

  let csv: string
  let filename: string

  const slug = period.replace(/_/g, '-')
  switch (type) {
    case 'revenue':
      csv = buildRevenueCsv(data, label)
      filename = `revenue-report-${slug}.csv`
      break
    case 'sessions':
      csv = buildSessionsCsv(data, label)
      filename = `sessions-report-${slug}.csv`
      break
    case 'clients':
      csv = buildClientsCsv(data)
      filename = `clients-report-${slug}.csv`
      break
    case 'invoices':
      csv = buildInvoicesCsv(data)
      filename = `invoices-report-${slug}.csv`
      break
    default:
      csv = buildAllCsv(data, label)
      filename = `all-reports-${slug}.csv`
  }

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
