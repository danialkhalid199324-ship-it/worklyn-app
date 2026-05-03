// ---------------------------------------------------------------------------
// Email service abstraction
// Swap the provider by changing createEmailService() — no other code changes.
// ---------------------------------------------------------------------------

import { Resend } from 'resend'

export interface EmailMessage {
  to: string
  toName?: string
  subject: string
  html: string
  replyTo?: string
}

export interface EmailService {
  send(message: EmailMessage): Promise<void>
}

// ---------------------------------------------------------------------------
// Resend provider — uses official SDK
// ---------------------------------------------------------------------------
class ResendEmailService implements EmailService {
  private readonly client: Resend
  private readonly from: string

  constructor(apiKey: string, from: string) {
    this.client = new Resend(apiKey)
    this.from = from
  }

  async send(message: EmailMessage): Promise<void> {
    // TEMP: force recipient to sandbox-verified address for local testing
    const sandboxTo = 'danialkhalid199324@gmail.com'
    const originalTo = message.toName ? `${message.toName} <${message.to}>` : message.to
    const to = sandboxTo

    console.log('[email] original to:', originalTo)
    console.log('[email] sending to (forced):', to)
    console.log('[email] from:', this.from)

    const { error } = await this.client.emails.send({
      from: this.from,
      to,
      subject: message.subject,
      html: message.html,
      replyTo: message.replyTo,
    })

    if (error) {
      throw new Error(`Resend: ${error.message}`)
    }
  }
}

// ---------------------------------------------------------------------------
// Factory — returns real Resend service when key is configured,
// otherwise throws so callers can log the failure properly.
// ---------------------------------------------------------------------------
export function createEmailService(): EmailService {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM ?? 'onboarding@resend.dev'

  console.log('[email] RESEND_API_KEY exists:', Boolean(apiKey))

  if (apiKey) {
    return new ResendEmailService(apiKey, from)
  }

  // No key — return a service that throws with a clear message.
  // Each caller already catches this and handles it appropriately:
  //   • session-notifications.ts  → marks notification record as 'failed'
  //   • invoices.ts               → returns error string to the UI
  //   • booking.ts                → Promise.allSettled (email failure is silent)
  return {
    async send(): Promise<void> {
      throw new Error('RESEND_API_KEY is not set in .env.local')
    },
  }
}

// ---------------------------------------------------------------------------
// Convenience wrapper
// ---------------------------------------------------------------------------
export async function sendEmail(message: EmailMessage): Promise<void> {
  const service = createEmailService()
  await service.send(message)
}
