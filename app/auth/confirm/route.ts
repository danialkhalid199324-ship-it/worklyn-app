import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { EmailOtpType } from '@supabase/auth-js'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)

  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  console.log('[auth/confirm] params:', { token_hash: !!token_hash, type, code: !!code, next })

  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          )
        },
      },
    },
  )

  // PKCE OAuth code exchange (OAuth providers, some email flows)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      console.error('[auth/confirm] exchangeCodeForSession error:', error.message)
      return NextResponse.redirect(
        new URL(`/auth/login?error=${encodeURIComponent('Reset link is invalid or has expired. Please request a new one.')}`, origin),
      )
    }
    console.log('[auth/confirm] code exchanged successfully, redirecting to:', next)
    return NextResponse.redirect(new URL(next.startsWith('/') ? next : '/dashboard', origin))
  }

  // Email OTP / recovery token_hash flow
  if (!token_hash || !type) {
    console.error('[auth/confirm] missing token_hash or type')
    return NextResponse.redirect(
      new URL(`/auth/login?error=${encodeURIComponent('Invalid or missing confirmation link.')}`, origin),
    )
  }

  const { error } = await supabase.auth.verifyOtp({ token_hash, type })

  if (error) {
    console.error('[auth/confirm] verifyOtp error:', error.message, '| type:', type)
    return NextResponse.redirect(
      new URL(`/auth/login?error=${encodeURIComponent('Reset link is invalid or has expired. Please request a new one.')}`, origin),
    )
  }

  console.log('[auth/confirm] OTP verified (type=%s), redirecting to: %s', type, next)
  return NextResponse.redirect(new URL(next.startsWith('/') ? next : '/dashboard', origin))
}
