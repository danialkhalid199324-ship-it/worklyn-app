import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { requireAuth } from '@/lib/auth'
import { getPractitionerByUserId, getInvoiceById, getOrgSettings } from '@/lib/db'
import { InvoicePdfDocument } from '@/lib/invoice-pdf'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const user = await requireAuth()
  const practitioner = await getPractitionerByUserId(user.id)

  const [invoice, orgSettings] = await Promise.all([
    getInvoiceById(practitioner.id, id),
    getOrgSettings(practitioner.id),
  ])

  const buffer = await renderToBuffer(
    <InvoicePdfDocument invoice={invoice} orgSettings={orgSettings} />,
  )

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${invoice.invoice_number}.pdf"`,
    },
  })
}
