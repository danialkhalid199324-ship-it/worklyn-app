'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// ── Shared types ───────────────────────────────────────────────────────────────

export type TotpEnrollData = {
  factorId: string
  qrCode: string   // data:image/svg+xml,… from Supabase
  secret: string   // base-32 secret for manual entry
  uri: string      // otpauth:// URI
}

type EnrollResult = TotpEnrollData | { error: string }
type ActionResult = { success: true } | { error: string }

// ── Helpers ────────────────────────────────────────────────────────────────────

function friendlyTotpError(msg: string): string {
  const lower = msg.toLowerCase()
  if (lower.includes('invalid') || lower.includes('mismatch')) {
    return 'Incorrect code — please try again.'
  }
  if (lower.includes('expired')) return 'Code expired — please enter a fresh code.'
  return msg
}

// ── Enrollment ─────────────────────────────────────────────────────────────────

/** Step 1: Create an unverified TOTP factor and return the QR code + secret. */
export async function startTotpEnrollment(): Promise<EnrollResult> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' })

  if (error || !data?.totp) {
    console.error('[startTotpEnrollment]', error?.message ?? 'missing totp data')
    return { error: error?.message ?? 'Failed to start 2FA setup. Please try again.' }
  }

  return {
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
    uri: data.totp.uri,
  }
}

/** Step 2: Verify the 6-digit code to complete enrollment. */
export async function verifyTotpEnrollment(
  factorId: string,
  code: string,
): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code })

  if (error) {
    console.error('[verifyTotpEnrollment]', error.message)
    return { error: friendlyTotpError(error.message) }
  }

  revalidatePath('/dashboard/settings')
  return { success: true }
}

// ── Login MFA challenge ────────────────────────────────────────────────────────

/**
 * Called from the /auth/mfa page after password login.
 * Verifies the TOTP code and upgrades the session to AAL2.
 * Redirects to `redirectTo` on success, returns { error } on failure.
 */
export async function verifyMfaChallenge(
  code: string,
  redirectTo?: string,
): Promise<{ error: string } | null> {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    console.error('[verifyMfaChallenge] no session:', userError?.message)
    redirect('/auth/login')
  }

  const factor = user.factors?.find(
    (f) => f.status === 'verified' && f.factor_type === 'totp',
  )

  if (!factor) {
    // User has no TOTP factor — shouldn't be here
    redirect('/dashboard')
  }

  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId: factor.id,
    code,
  })

  if (error) {
    console.error('[verifyMfaChallenge]', error.message)
    return { error: friendlyTotpError(error.message) }
  }

  revalidatePath('/', 'layout')
  // Avoid redirect loops: never send the user back to an /auth/ page
  const dest =
    redirectTo && redirectTo.startsWith('/') && !redirectTo.startsWith('/auth/')
      ? redirectTo
      : '/dashboard'
  redirect(dest)
}

// ── Disable MFA ────────────────────────────────────────────────────────────────

/**
 * Verifies the current TOTP code then unenrols the factor.
 * Requires a valid code to prevent unauthorised disablement.
 */
export async function disableMfa(
  factorId: string,
  code: string,
): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient()

  // Verify ownership with the live code before unenrolling
  const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
    factorId,
    code,
  })

  if (verifyError) {
    console.error('[disableMfa] verify error:', verifyError.message)
    return { error: 'Incorrect code — please try again.' }
  }

  const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId })

  if (unenrollError) {
    console.error('[disableMfa] unenroll error:', unenrollError.message)
    return { error: unenrollError.message }
  }

  revalidatePath('/dashboard/settings')
  return { success: true }
}
