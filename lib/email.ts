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
    const to = message.toName ? `${message.toName} <${message.to}>` : message.to

    console.log('[email] to:', to)
    console.log('[email] from:', this.from)

    const { error } = await this.client.emails.send({
      from: this.from,
      to: message.to,
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
// Factory — validates configuration and returns a Resend service.
// Returns a service that throws a clear config error when misconfigured so
// callers can surface the message appropriately:
//   • session-notifications.ts  → marks notification record as 'failed'
//   • invoices.ts               → returns error string to the UI
//   • booking.ts                → Promise.allSettled (email failure is silent)
// ---------------------------------------------------------------------------
export function createEmailService(): EmailService {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM

  if (!apiKey) {
    return {
      async send(): Promise<void> {
        throw new Error('RESEND_API_KEY is not configured. Add it to your environment variables.')
      },
    }
  }

  if (!from) {
    return {
      async send(): Promise<void> {
        throw new Error('EMAIL_FROM is not configured. Set a verified sender address in your environment variables before sending emails.')
      },
    }
  }

  if (from === 'onboarding@resend.dev') {
    return {
      async send(): Promise<void> {
        throw new Error('EMAIL_FROM is set to the Resend sandbox address (onboarding@resend.dev). Configure a verified sender domain before sending emails to real recipients.')
      },
    }
  }

  return new ResendEmailService(apiKey, from)
}

// ---------------------------------------------------------------------------
// Convenience wrapper
// ---------------------------------------------------------------------------
export async function sendEmail(message: EmailMessage): Promise<void> {
  const service = createEmailService()
  await service.send(message)
}
