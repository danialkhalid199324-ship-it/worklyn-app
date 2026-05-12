// ---------------------------------------------------------------------------
// Email templates — plain functions that return HTML strings
// ---------------------------------------------------------------------------

export interface BookingConfirmationData {
  clientName: string
  clientEmail: string
  serviceName: string
  practitionerName: string
  practitionerEmail: string
  practitionerPhone?: string | null
  date: string        // human-readable, e.g. "Monday, 21 April 2026"
  startTime: string   // e.g. "10:00 AM"
  endTime: string     // e.g. "11:00 AM"
  location?: string | null
  notes?: string | null
  appUrl: string
}

const baseStyles = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #f9fafb;
  margin: 0; padding: 0;
`

function container(content: string) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Appointment Confirmation</title>
</head>
<body style="${baseStyles}">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table width="100%" style="max-width:560px; background:#ffffff; border-radius:12px; border:1px solid #e5e7eb; overflow:hidden;">
          ${content}
        </table>
        <p style="margin-top:24px; font-size:12px; color:#9ca3af;">
          Sent by <a href="${process.env.NEXT_PUBLIC_APP_URL}" style="color:#6366f1;">Worklyn</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function header(title: string) {
  return `
  <tr>
    <td style="background:#6366f1; padding:28px 32px;">
      <p style="margin:0; color:#c7d2fe; font-size:13px; font-weight:600; letter-spacing:0.05em; text-transform:uppercase;">
        Worklyn
      </p>
      <h1 style="margin:8px 0 0; color:#ffffff; font-size:22px; font-weight:700;">${title}</h1>
    </td>
  </tr>`
}

function row(label: string, value: string) {
  return `
  <tr>
    <td style="padding:8px 0; border-bottom:1px solid #f3f4f6;">
      <table width="100%">
        <tr>
          <td style="font-size:13px; color:#6b7280; width:40%;">${label}</td>
          <td style="font-size:13px; color:#111827; font-weight:500;">${value}</td>
        </tr>
      </table>
    </td>
  </tr>`
}

// ---------------------------------------------------------------------------
// Client confirmation email
// ---------------------------------------------------------------------------
export function clientConfirmationEmail(data: BookingConfirmationData): string {
  return container(`
    ${header('Your appointment is confirmed')}
    <tr>
      <td style="padding:28px 32px;">
        <p style="margin:0 0 20px; font-size:15px; color:#374151;">
          Hi <strong>${data.clientName}</strong>, your appointment has been booked.
          Here's a summary:
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
          ${row('Service', data.serviceName)}
          ${row('Date', data.date)}
          ${row('Time', `${data.startTime} – ${data.endTime}`)}
          ${row('Practitioner', data.practitionerName)}
          ${data.location ? row('Location', data.location) : ''}
        </table>

        <h2 style="margin:0 0 12px; font-size:15px; font-weight:600; color:#111827;">
          Practitioner contact
        </h2>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
          ${row('Email', `<a href="mailto:${data.practitionerEmail}" style="color:#0284c7;">${data.practitionerEmail}</a>`)}
          ${data.practitionerPhone ? row('Phone', data.practitionerPhone) : ''}
        </table>

        ${data.notes ? `
        <div style="background:#f0f9ff; border-left:3px solid #0284c7; border-radius:4px; padding:12px 16px; margin-bottom:24px;">
          <p style="margin:0; font-size:13px; color:#0369a1; font-weight:600;">Your notes</p>
          <p style="margin:4px 0 0; font-size:13px; color:#374151;">${data.notes}</p>
        </div>` : ''}

        <p style="margin:0; font-size:13px; color:#6b7280;">
          Need to cancel or reschedule? Contact your practitioner directly at
          <a href="mailto:${data.practitionerEmail}" style="color:#0284c7;">${data.practitionerEmail}</a>.
        </p>
      </td>
    </tr>
  `)
}

// ---------------------------------------------------------------------------
// Session confirmation / reminder emails (practitioner → client/guardian)
// ---------------------------------------------------------------------------

export interface SessionEmailData {
  clientName: string       // the actual client (e.g. "John Smith")
  recipientName: string    // who receives the email (could be guardian)
  businessName: string
  practitionerName: string
  practitionerEmail: string
  date: string             // "Monday, 28 April 2026"
  startTime: string        // "9:00 AM"
  endTime: string          // "10:00 AM"
  location: string | null
  serviceName?: string | null
}

export function sessionConfirmationEmail(data: SessionEmailData): string {
  return container(`
    ${header('Your session is confirmed')}
    <tr>
      <td style="padding:28px 32px;">
        <p style="margin:0 0 20px; font-size:15px; color:#374151;">
          Hi <strong>${data.recipientName}</strong>,<br/>
          This is a confirmation for ${data.recipientName === data.clientName ? 'your' : `<strong>${data.clientName}</strong>'s`}
          upcoming session with <strong>${data.businessName}</strong>.
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
          ${row('Client', data.clientName)}
          ${data.serviceName ? row('Service', data.serviceName) : ''}
          ${row('Date', data.date)}
          ${row('Time', `${data.startTime} – ${data.endTime}`)}
          ${row('Practitioner', data.practitionerName)}
          ${data.location ? row('Location', data.location) : ''}
        </table>
        <p style="margin:0; font-size:13px; color:#6b7280;">
          Questions? Contact us at
          <a href="mailto:${data.practitionerEmail}" style="color:#6366f1;">${data.practitionerEmail}</a>.
        </p>
      </td>
    </tr>
  `)
}

export function sessionReminderEmail(data: SessionEmailData): string {
  return container(`
    ${header('Session reminder')}
    <tr>
      <td style="padding:28px 32px;">
        <p style="margin:0 0 20px; font-size:15px; color:#374151;">
          Hi <strong>${data.recipientName}</strong>,<br/>
          This is a friendly reminder about ${data.recipientName === data.clientName ? 'your' : `<strong>${data.clientName}</strong>'s`}
          upcoming session with <strong>${data.businessName}</strong>.
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
          ${row('Client', data.clientName)}
          ${data.serviceName ? row('Service', data.serviceName) : ''}
          ${row('Date', data.date)}
          ${row('Time', `${data.startTime} – ${data.endTime}`)}
          ${row('Practitioner', data.practitionerName)}
          ${data.location ? row('Location', data.location) : ''}
        </table>
        <p style="margin:0; font-size:13px; color:#6b7280;">
          Need to reschedule? Contact us at
          <a href="mailto:${data.practitionerEmail}" style="color:#6366f1;">${data.practitionerEmail}</a>.
        </p>
      </td>
    </tr>
  `)
}

export function sessionUpdateEmail(data: SessionEmailData): string {
  return container(`
    ${header('Session rescheduled')}
    <tr>
      <td style="padding:28px 32px;">
        <p style="margin:0 0 20px; font-size:15px; color:#374151;">
          Hi <strong>${data.recipientName}</strong>,<br/>
          ${data.recipientName === data.clientName ? 'Your session' : `<strong>${data.clientName}</strong>'s session`}
          with <strong>${data.businessName}</strong> has been updated. Here are the new details:
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
          ${row('Client', data.clientName)}
          ${row('Date', data.date)}
          ${row('Time', `${data.startTime} – ${data.endTime}`)}
          ${row('Practitioner', data.practitionerName)}
          ${data.location ? row('Location', data.location) : ''}
        </table>
        <p style="margin:0; font-size:13px; color:#6b7280;">
          Questions? Contact us at
          <a href="mailto:${data.practitionerEmail}" style="color:#0284c7;">${data.practitionerEmail}</a>.
        </p>
      </td>
    </tr>
  `)
}

export function sessionCancellationEmail(data: SessionEmailData): string {
  return container(`
    ${header('Session cancelled')}
    <tr>
      <td style="padding:28px 32px;">
        <p style="margin:0 0 20px; font-size:15px; color:#374151;">
          Hi <strong>${data.recipientName}</strong>,<br/>
          ${data.recipientName === data.clientName ? 'Your session' : `<strong>${data.clientName}</strong>'s session`}
          with <strong>${data.businessName}</strong> has been cancelled.
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
          ${row('Client', data.clientName)}
          ${row('Date', data.date)}
          ${row('Time', `${data.startTime} – ${data.endTime}`)}
          ${row('Practitioner', data.practitionerName)}
        </table>
        <p style="margin:0; font-size:13px; color:#6b7280;">
          To reschedule, contact us at
          <a href="mailto:${data.practitionerEmail}" style="color:#0284c7;">${data.practitionerEmail}</a>.
        </p>
      </td>
    </tr>
  `)
}

// ---------------------------------------------------------------------------
// Overdue invoice reminder email (sent by cron to the invoice recipient)
// ---------------------------------------------------------------------------

export interface InvoiceOverdueReminderData {
  recipientName: string
  businessName: string
  invoiceNumber: string
  total: string       // pre-formatted, e.g. "AU$250.00"
  dueDate: string     // pre-formatted, e.g. "1 April 2026"
  practitionerEmail: string
  bsb?: string | null
  bankAccountName?: string | null
  accountNumber?: string | null
  paymentReference?: string | null
}

export function invoiceOverdueReminderEmail(data: InvoiceOverdueReminderData): string {
  const bankHtml = data.bsb ? `
    <div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#111827;">Payment details</p>
      <table style="font-size:13px;border-collapse:collapse;">
        ${data.bankAccountName ? `<tr><td style="padding:3px 12px 3px 0;color:#6b7280;">Account name</td><td style="padding:3px 0;font-weight:500;">${data.bankAccountName}</td></tr>` : ''}
        <tr><td style="padding:3px 12px 3px 0;color:#6b7280;">BSB</td><td style="padding:3px 0;font-weight:500;">${data.bsb}</td></tr>
        ${data.accountNumber ? `<tr><td style="padding:3px 12px 3px 0;color:#6b7280;">Account number</td><td style="padding:3px 0;font-weight:500;">${data.accountNumber}</td></tr>` : ''}
        ${data.paymentReference ? `<tr><td style="padding:3px 12px 3px 0;color:#6b7280;">Reference</td><td style="padding:3px 0;font-weight:500;">${data.paymentReference}</td></tr>` : ''}
      </table>
    </div>` : ''

  return container(`
    ${header('Payment overdue')}
    <tr>
      <td style="padding:28px 32px;">
        <p style="margin:0 0 20px; font-size:15px; color:#374151;">
          Hi <strong>${data.recipientName}</strong>,<br/>
          This is a reminder that the following invoice from
          <strong>${data.businessName}</strong> is now overdue.
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:4px;">
          ${row('Invoice', data.invoiceNumber)}
          ${row('Amount due', `<span style="font-weight:700;color:#dc2626;">${data.total}</span>`)}
          ${row('Due date', `<span style="color:#dc2626;">${data.dueDate}</span>`)}
        </table>
        ${bankHtml}
        <p style="margin:16px 0 0; font-size:13px; color:#6b7280;">
          If you have already paid, please disregard this message or reply to confirm.
          Questions? Contact us at
          <a href="mailto:${data.practitionerEmail}" style="color:#6366f1;">${data.practitionerEmail}</a>.
        </p>
      </td>
    </tr>
  `)
}

// ---------------------------------------------------------------------------
// Practitioner notification email
// ---------------------------------------------------------------------------
export function practitionerNotificationEmail(data: BookingConfirmationData): string {
  return container(`
    ${header('New appointment booked')}
    <tr>
      <td style="padding:28px 32px;">
        <p style="margin:0 0 20px; font-size:15px; color:#374151;">
          A new appointment has been booked by <strong>${data.clientName}</strong>.
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
          ${row('Service', data.serviceName)}
          ${row('Date', data.date)}
          ${row('Time', `${data.startTime} – ${data.endTime}`)}
          ${row('Client', data.clientName)}
          ${row('Email', `<a href="mailto:${data.clientEmail}" style="color:#0284c7;">${data.clientEmail}</a>`)}
          ${data.location ? row('Location', data.location) : ''}
        </table>

        ${data.notes ? `
        <div style="background:#fefce8; border-left:3px solid #ca8a04; border-radius:4px; padding:12px 16px; margin-bottom:24px;">
          <p style="margin:0; font-size:13px; color:#92400e; font-weight:600;">Client notes</p>
          <p style="margin:4px 0 0; font-size:13px; color:#374151;">${data.notes}</p>
        </div>` : ''}

        <a href="${data.appUrl}/dashboard/calendar"
          style="display:inline-block; background:#0284c7; color:#ffffff; text-decoration:none;
                 font-size:14px; font-weight:600; padding:10px 20px; border-radius:8px;">
          View in dashboard →
        </a>
      </td>
    </tr>
  `)
}
