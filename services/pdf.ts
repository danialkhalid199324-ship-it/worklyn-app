import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Svg,
  Line,
  Rect,
  Polyline,
  Circle,
  renderToBuffer,
} from '@react-pdf/renderer'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProgressPoint { date: string; score: number }
export interface FrequencyPoint { month: string; count: number }

export interface PDFData {
  practitionerName: string
  clientName: string
  reportTitle: string
  finalText: string
  progressData: ProgressPoint[]
  frequencyData: FrequencyPoint[]
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const BRAND = '#4F46E5'
const GRAY_100 = '#F3F4F6'
const GRAY_200 = '#E5E7EB'
const GRAY_400 = '#9CA3AF'
const GRAY_700 = '#374151'
const GRAY_900 = '#111827'

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: 48,
    paddingTop: 48,
    paddingBottom: 64,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: GRAY_700,
    lineHeight: 1.5,
  },
  // Header
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  businessName: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: GRAY_900 },
  reportMeta: { textAlign: 'right', fontSize: 9, color: GRAY_400 },
  divider: { borderBottomWidth: 1, borderBottomColor: GRAY_200, marginVertical: 14 },
  // Info strip
  infoStrip: { flexDirection: 'row', gap: 32, marginBottom: 18 },
  infoItem: { flexDirection: 'column', gap: 2 },
  infoLabel: { fontSize: 8, color: GRAY_400, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: GRAY_900 },
  // Sections
  sectionHeading: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: BRAND,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 16,
    marginBottom: 4,
  },
  sectionBody: { fontSize: 10, color: GRAY_700, lineHeight: 1.6 },
  // Charts
  chartBlock: { marginTop: 24 },
  chartTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: GRAY_900, marginBottom: 8 },
  noData: { fontSize: 9, color: GRAY_400, fontStyle: 'italic' },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 48,
    right: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: GRAY_200,
    paddingTop: 6,
  },
  footerText: { fontSize: 8, color: GRAY_400 },
})

// ---------------------------------------------------------------------------
// Chart helpers
// ---------------------------------------------------------------------------

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function shortDate(iso: string): string {
  const d = new Date(iso)
  return `${MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCDate()}`
}

function monthLabel(yyyyMM: string): string {
  const [year, month] = yyyyMM.split('-')
  return `${MONTHS_SHORT[parseInt(month) - 1]} '${year.slice(2)}`
}

function sparseIndices(total: number, max: number): number[] {
  if (total <= max) return Array.from({ length: total }, (_, i) => i)
  const step = (total - 1) / (max - 1)
  return Array.from({ length: max }, (_, i) => Math.round(i * step))
}

// Chart canvas dimensions (fits within 48pt side margins on A4)
const CW = 499
const CH = 140
const CPL = 30  // left pad (y labels)
const CPR = 6
const CPT = 10
const CPB = 26  // bottom pad (x labels)
const PW = CW - CPL - CPR   // plot width
const PH = CH - CPT - CPB   // plot height

// ---------------------------------------------------------------------------
// Progress Line Chart
// ---------------------------------------------------------------------------

function ProgressLineChart({ data }: { data: ProgressPoint[] }) {
  if (data.length < 2) {
    return React.createElement(Text, { style: styles.noData }, 'At least two sessions with a progress score are needed to display this chart.')
  }

  const xOf = (i: number) => CPL + (i / (data.length - 1)) * PW
  const yOf = (s: number) => CPT + ((10 - s) / 9) * PH

  const polyPts = data.map((d, i) => `${xOf(i)},${yOf(d.score)}`).join(' ')
  const gridY = [2, 4, 6, 8, 10]
  const labelIdxs = sparseIndices(data.length, 7)

  return React.createElement(
    Svg,
    { width: CW, height: CH },

    // Background
    React.createElement(Rect, { x: CPL, y: CPT, width: PW, height: PH, fill: GRAY_100 }),

    // Y grid lines
    ...gridY.map((val) =>
      React.createElement(Line, {
        key: `gy${val}`,
        x1: CPL, y1: yOf(val), x2: CPL + PW, y2: yOf(val),
        stroke: GRAY_200, strokeWidth: 0.5,
      })
    ),

    // Y labels
    ...gridY.filter((_, i) => i % 2 === 0).map((val) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      React.createElement(Text, {
        key: `yl${val}`,
        x: CPL - 4,
        y: yOf(val) + 2.5,
        fontSize: 7,
        fill: GRAY_400,
      } as any, String(val))
    ),

    // Data line
    React.createElement(Polyline, {
      points: polyPts,
      stroke: BRAND,
      strokeWidth: 1.75,
      fill: 'none',
    }),

    // Data points
    ...data.map((d, i) =>
      React.createElement(Circle, {
        key: `pt${i}`,
        cx: xOf(i), cy: yOf(d.score), r: 3,
        fill: BRAND,
      })
    ),

    // X labels
    ...labelIdxs.map((idx) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      React.createElement(Text, {
        key: `xl${idx}`,
        x: xOf(idx) - 9,
        y: CH - 6,
        fontSize: 7,
        fill: GRAY_400,
      } as any, shortDate(data[idx].date))
    ),

    // Axes
    React.createElement(Line, { x1: CPL, y1: CPT, x2: CPL, y2: CPT + PH, stroke: GRAY_200, strokeWidth: 0.5 }),
    React.createElement(Line, { x1: CPL, y1: CPT + PH, x2: CPL + PW, y2: CPT + PH, stroke: GRAY_200, strokeWidth: 0.5 }),
  )
}

// ---------------------------------------------------------------------------
// Session Frequency Bar Chart
// ---------------------------------------------------------------------------

function FrequencyBarChart({ data }: { data: FrequencyPoint[] }) {
  if (!data.length) {
    return React.createElement(Text, { style: styles.noData }, 'No session data available.')
  }

  const maxCount = Math.max(...data.map((d) => d.count))
  const slotW = PW / data.length
  const barW = Math.min(slotW * 0.6, 28)
  const xBar = (i: number) => CPL + i * slotW + (slotW - barW) / 2
  const bH = (c: number) => (c / maxCount) * PH
  const yBar = (c: number) => CPT + PH - bH(c)

  const gridCounts = [0, Math.round(maxCount / 2), maxCount].filter((v, i, a) => a.indexOf(v) === i)
  const labelIdxs = sparseIndices(data.length, 8)

  return React.createElement(
    Svg,
    { width: CW, height: CH },

    // Background
    React.createElement(Rect, { x: CPL, y: CPT, width: PW, height: PH, fill: GRAY_100 }),

    // Y grid lines + labels
    ...gridCounts.map((val) => {
      const y = CPT + PH - (val / maxCount) * PH
      return [
        React.createElement(Line, {
          key: `gy${val}`,
          x1: CPL, y1: y, x2: CPL + PW, y2: y,
          stroke: GRAY_200, strokeWidth: 0.5,
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        React.createElement(Text, {
          key: `yl${val}`,
          x: CPL - 4, y: y + 2.5,
          fontSize: 7, fill: GRAY_400,
        } as any, String(val)),
      ]
    }).flat(),

    // Bars
    ...data.map((d, i) =>
      React.createElement(Rect, {
        key: `bar${i}`,
        x: xBar(i), y: yBar(d.count),
        width: barW, height: bH(d.count),
        fill: BRAND, opacity: 0.85,
      })
    ),

    // X labels
    ...labelIdxs.map((idx) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      React.createElement(Text, {
        key: `xl${idx}`,
        x: xBar(idx) - 2,
        y: CH - 6,
        fontSize: 7, fill: GRAY_400,
      } as any, monthLabel(data[idx].month))
    ),

    // Axes
    React.createElement(Line, { x1: CPL, y1: CPT, x2: CPL, y2: CPT + PH, stroke: GRAY_200, strokeWidth: 0.5 }),
    React.createElement(Line, { x1: CPL, y1: CPT + PH, x2: CPL + PW, y2: CPT + PH, stroke: GRAY_200, strokeWidth: 0.5 }),
  )
}

// ---------------------------------------------------------------------------
// Text parser — splits AI output on **HEADING** markers
// ---------------------------------------------------------------------------

function parseSections(text: string): { heading: string; body: string }[] {
  const sections: { heading: string; body: string }[] = []
  const regex = /\*\*([^*\n]+)\*\*/g
  let match: RegExpExecArray | null
  let lastHeading = ''
  let lastEnd = 0

  while ((match = regex.exec(text)) !== null) {
    if (lastHeading) {
      sections.push({ heading: lastHeading, body: text.slice(lastEnd, match.index).trim() })
    }
    lastHeading = match[1].trim()
    lastEnd = match.index + match[0].length
  }

  if (lastHeading) {
    sections.push({ heading: lastHeading, body: text.slice(lastEnd).trim() })
  }

  // Fallback: treat entire text as one block
  if (!sections.length) {
    sections.push({ heading: 'Report', body: text.trim() })
  }

  return sections
}

// ---------------------------------------------------------------------------
// PDF Document
// ---------------------------------------------------------------------------

function ReportDocument({ data }: { data: PDFData }) {
  const sections = parseSections(data.finalText)
  const generatedDate = new Date().toLocaleDateString('en-US', { dateStyle: 'long' })

  return React.createElement(
    Document,
    { title: data.reportTitle, author: data.practitionerName },
    React.createElement(
      Page,
      { size: 'A4', style: styles.page },

      // ── Header ──────────────────────────────────────────────────────────
      React.createElement(
        View,
        { style: styles.headerRow },
        React.createElement(
          View,
          null,
          React.createElement(Text, { style: styles.businessName }, data.practitionerName),
          React.createElement(Text, { style: { fontSize: 10, color: GRAY_400, marginTop: 2 } }, 'Clinical Session Report'),
        ),
        React.createElement(
          View,
          { style: styles.reportMeta },
          React.createElement(Text, null, `Generated: ${generatedDate}`),
        ),
      ),

      React.createElement(View, { style: styles.divider }),

      // ── Client / Title info strip ────────────────────────────────────────
      React.createElement(
        View,
        { style: styles.infoStrip },
        React.createElement(
          View,
          { style: styles.infoItem },
          React.createElement(Text, { style: styles.infoLabel }, 'Client'),
          React.createElement(Text, { style: styles.infoValue }, data.clientName),
        ),
        React.createElement(
          View,
          { style: styles.infoItem },
          React.createElement(Text, { style: styles.infoLabel }, 'Report'),
          React.createElement(Text, { style: styles.infoValue }, data.reportTitle),
        ),
      ),

      React.createElement(View, { style: styles.divider }),

      // ── Report sections ──────────────────────────────────────────────────
      ...sections.map((s, i) =>
        React.createElement(
          View,
          { key: i },
          React.createElement(Text, { style: styles.sectionHeading }, s.heading),
          React.createElement(Text, { style: styles.sectionBody }, s.body),
        )
      ),

      // ── Charts ──────────────────────────────────────────────────────────
      React.createElement(
        View,
        { style: styles.chartBlock },
        React.createElement(Text, { style: styles.chartTitle }, 'Progress Over Time'),
        React.createElement(ProgressLineChart, { data: data.progressData }),
      ),

      React.createElement(
        View,
        { style: styles.chartBlock },
        React.createElement(Text, { style: styles.chartTitle }, 'Session Frequency'),
        React.createElement(FrequencyBarChart, { data: data.frequencyData }),
      ),

      // ── Footer ──────────────────────────────────────────────────────────
      React.createElement(
        View,
        { style: styles.footer, fixed: true },
        React.createElement(Text, { style: styles.footerText }, `Practitioner: ${data.practitionerName}`),
        React.createElement(
          Text,
          { style: styles.footerText, render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => `Page ${pageNumber} of ${totalPages}` },
        ),
      ),
    )
  )
}

// ---------------------------------------------------------------------------
// Public export
// ---------------------------------------------------------------------------

export async function generateReportPDF(data: PDFData): Promise<Buffer> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element = React.createElement(ReportDocument, { data }) as any
  return renderToBuffer(element) as Promise<Buffer>
}
