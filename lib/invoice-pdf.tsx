import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer'
import type { InvoiceRow, InvoiceItemRow, ClientRow, OrgSettingsRow } from '@/types/database'
import { recipientLabel } from '@/lib/invoice-routing'

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    paddingTop: 48,
    paddingBottom: 60,
    paddingHorizontal: 48,
    color: '#1a1a2e',
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 },
  businessName: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#1a1a2e', marginBottom: 4 },
  abn: { fontSize: 9, color: '#6b7280' },
  invoiceTitle: { fontSize: 24, fontFamily: 'Helvetica-Bold', color: '#6366f1', textAlign: 'right' },
  invoiceMeta: { fontSize: 9, color: '#6b7280', textAlign: 'right', marginTop: 2 },
  sectionLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  billRow: { flexDirection: 'row', gap: 32, marginBottom: 28 },
  billBox: { flex: 1 },
  billName: { fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  billDetail: { color: '#6b7280', lineHeight: 1.5 },
  divider: { borderBottomWidth: 1, borderBottomColor: '#e5e7eb', marginBottom: 16 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f9fafb', paddingVertical: 6, paddingHorizontal: 8, marginBottom: 0 },
  tableHeaderCell: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#9ca3af', textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  tableCell: { fontSize: 10 },
  colDesc: { flex: 3 },
  colQty: { flex: 1, textAlign: 'center' },
  colPrice: { flex: 1.5, textAlign: 'right' },
  colTotal: { flex: 1.5, textAlign: 'right' },
  totalsSection: { marginTop: 8, alignItems: 'flex-end' },
  totalRow: { flexDirection: 'row', gap: 16, paddingVertical: 3 },
  totalLabel: { fontSize: 9, color: '#6b7280', width: 80, textAlign: 'right' },
  totalValue: { fontSize: 10, width: 80, textAlign: 'right' },
  grandTotal: { flexDirection: 'row', gap: 16, paddingVertical: 6, marginTop: 4, borderTopWidth: 1.5, borderTopColor: '#6366f1' },
  grandLabel: { fontSize: 11, fontFamily: 'Helvetica-Bold', width: 80, textAlign: 'right' },
  grandValue: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#6366f1', width: 80, textAlign: 'right' },
  paymentBox: { marginTop: 28, padding: 12, backgroundColor: '#f9fafb', borderRadius: 6 },
  paymentTitle: { fontFamily: 'Helvetica-Bold', marginBottom: 6 },
  paymentRow: { flexDirection: 'row', marginBottom: 3 },
  paymentKey: { color: '#6b7280', width: 100 },
  paymentVal: { flex: 1 },
  notes: { marginTop: 20, padding: 12, backgroundColor: '#fffbeb', borderRadius: 6 },
  notesTitle: { fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  footer: { position: 'absolute', bottom: 24, left: 48, right: 48, textAlign: 'center', fontSize: 8, color: '#9ca3af' },
})

function fmt(cents: number): string {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(cents / 100)
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
}

interface Props {
  invoice: InvoiceRow & { invoice_items: InvoiceItemRow[]; clients: ClientRow | null }
  orgSettings: OrgSettingsRow | null
}

export function InvoicePdfDocument({ invoice, orgSettings }: Props) {
  const payRef = orgSettings?.payment_reference_prefix
    ? `${orgSettings.payment_reference_prefix}-${invoice.invoice_number}`
    : invoice.invoice_number

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.businessName}>
              {orgSettings?.business_name ?? (invoice.clients ? `${invoice.clients.first_name} ${invoice.clients.last_name}` : 'Practice')}
            </Text>
            {orgSettings?.abn && <Text style={styles.abn}>ABN: {orgSettings.abn}</Text>}
          </View>
          <View>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invoiceMeta}>{invoice.invoice_number}</Text>
          </View>
        </View>

        {/* Bill from / Bill to */}
        <View style={styles.billRow}>
          <View style={styles.billBox}>
            <Text style={styles.sectionLabel}>Invoice Date</Text>
            <Text style={styles.billName}>{fmtDate(invoice.issued_at)}</Text>
            {invoice.due_at && (
              <>
                <Text style={[styles.sectionLabel, { marginTop: 10 }]}>Due Date</Text>
                <Text style={styles.billName}>{fmtDate(invoice.due_at)}</Text>
              </>
            )}
          </View>
          <View style={styles.billBox}>
            <Text style={styles.sectionLabel}>Bill To</Text>
            {invoice.recipient_name ? (
              <Text style={styles.billName}>{invoice.recipient_name}</Text>
            ) : invoice.clients ? (
              <Text style={styles.billName}>{invoice.clients.first_name} {invoice.clients.last_name}</Text>
            ) : null}
            {invoice.recipient_type && (
              <Text style={styles.billDetail}>{recipientLabel(invoice.recipient_type)}</Text>
            )}
            {invoice.recipient_email && <Text style={styles.billDetail}>{invoice.recipient_email}</Text>}
            {invoice.recipient_phone && <Text style={styles.billDetail}>{invoice.recipient_phone}</Text>}
            {invoice.billing_note && <Text style={[styles.billDetail, { marginTop: 4 }]}>{invoice.billing_note}</Text>}
          </View>
          <View style={styles.billBox}>
            <Text style={styles.sectionLabel}>Client</Text>
            {invoice.clients && (
              <Text style={styles.billName}>{invoice.clients.first_name} {invoice.clients.last_name}</Text>
            )}
          </View>
        </View>

        <View style={styles.divider} />

        {/* Line items table */}
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, styles.colDesc]}>Description</Text>
          <Text style={[styles.tableHeaderCell, styles.colQty]}>Qty</Text>
          <Text style={[styles.tableHeaderCell, styles.colPrice]}>Unit Price</Text>
          <Text style={[styles.tableHeaderCell, styles.colTotal]}>Total</Text>
        </View>

        {invoice.invoice_items.map((item) => (
          <View key={item.id} style={styles.tableRow}>
            <Text style={[styles.tableCell, styles.colDesc]}>{item.description}</Text>
            <Text style={[styles.tableCell, styles.colQty]}>{item.quantity}</Text>
            <Text style={[styles.tableCell, styles.colPrice]}>{fmt(item.unit_price_cents)}</Text>
            <Text style={[styles.tableCell, styles.colTotal]}>{fmt(item.unit_price_cents * item.quantity)}</Text>
          </View>
        ))}

        {/* Totals */}
        <View style={styles.totalsSection}>
          {invoice.tax_cents > 0 && (
            <>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal</Text>
                <Text style={styles.totalValue}>{fmt(invoice.subtotal_cents)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>GST</Text>
                <Text style={styles.totalValue}>{fmt(invoice.tax_cents)}</Text>
              </View>
            </>
          )}
          <View style={styles.grandTotal}>
            <Text style={styles.grandLabel}>Total</Text>
            <Text style={styles.grandValue}>{fmt(invoice.total_cents)}</Text>
          </View>
        </View>

        {/* Payment details */}
        {(orgSettings?.bank_account_name || orgSettings?.bsb) && (
          <View style={styles.paymentBox}>
            <Text style={styles.paymentTitle}>Payment Details</Text>
            {orgSettings.bank_account_name && (
              <View style={styles.paymentRow}>
                <Text style={styles.paymentKey}>Account name:</Text>
                <Text style={styles.paymentVal}>{orgSettings.bank_account_name}</Text>
              </View>
            )}
            {orgSettings.bsb && (
              <View style={styles.paymentRow}>
                <Text style={styles.paymentKey}>BSB:</Text>
                <Text style={styles.paymentVal}>{orgSettings.bsb}</Text>
              </View>
            )}
            {orgSettings.account_number && (
              <View style={styles.paymentRow}>
                <Text style={styles.paymentKey}>Account number:</Text>
                <Text style={styles.paymentVal}>{orgSettings.account_number}</Text>
              </View>
            )}
            <View style={styles.paymentRow}>
              <Text style={styles.paymentKey}>Reference:</Text>
              <Text style={styles.paymentVal}>{payRef}</Text>
            </View>
          </View>
        )}

        {/* Notes */}
        {invoice.notes && (
          <View style={styles.notes}>
            <Text style={styles.notesTitle}>Notes</Text>
            <Text>{invoice.notes}</Text>
          </View>
        )}

        <Text style={styles.footer}>
          {orgSettings?.business_name ?? ''} · {invoice.invoice_number} · Generated {new Date().toLocaleDateString('en-AU')}
        </Text>
      </Page>
    </Document>
  )
}
