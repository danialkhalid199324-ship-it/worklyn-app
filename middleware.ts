import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const PUBLIC_EXACT = new Set([
  '/',
  '/features',
  '/pricing',
  '/about',
  '/contact',
  '/privacy',
  '/terms',
  '/auth/login',
  '/auth/signup',
  '/auth/check-email',
  '/auth/confirm',
  '/auth/forgot-password',
  '/auth/reset-password',
])
const PUBLIC_PREFIXES = ['/book/', '/api/availability']
const AUTH_ROUTES = ['/auth/login', '/auth/signup']
const ADMIN_ROUTES = ['/dashboard/admin']

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // Refresh session — MUST be called before any other Supabase call
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  if (user) {
    // ── MFA check ────────────────────────────────────────────────────────────
    // If the user has a verified TOTP factor but hasn't completed the MFA
    // challenge this session (currentLevel=aal1, nextLevel=aal2), force them
    // to /auth/mfa before they can reach any other route.
    const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    const needsMfa =
      aalData?.nextLevel === 'aal2' && aalData?.currentLevel === 'aal1'

    if (needsMfa) {
      if (pathname === '/auth/mfa') {
        // Already on the MFA page — allow
        return response
      }
      // Recovery sessions must reach /auth/reset-password before MFA can be enforced.
      // The reset page verifies the recovery token; after password update the user
      // is sent to /auth/login and must complete MFA on their next normal sign-in.
      if (pathname === '/auth/reset-password') {
        return response
      }
      const mfaUrl = new URL('/auth/mfa', request.url)
      // Preserve the original destination so we can redirect back after MFA,
      // but only for non-auth routes (avoids /auth/* redirect loops).
      if (!AUTH_ROUTES.some((r) => pathname.startsWith(r))) {
        mfaUrl.searchParams.set('redirectTo', pathname)
      }
      return NextResponse.redirect(mfaUrl)
    }

    // ── Authenticated + MFA-complete ──────────────────────────────────────────
    // Keep authenticated users off the login/signup pages
    if (AUTH_ROUTES.some((r) => pathname.startsWith(r))) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // Block /auth/mfa when the user is already fully authenticated
    if (pathname === '/auth/mfa') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // Admin-only routes
    if (ADMIN_ROUTES.some((r) => pathname.startsWith(r))) {
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'admin') {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }

    return response
  }

  // ── Unauthenticated ───────────────────────────────────────────────────────
  const isPublic =
    PUBLIC_EXACT.has(pathname) ||
    PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))

  if (!isPublic) {
    const redirectUrl = new URL('/auth/login', request.url)
    redirectUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
