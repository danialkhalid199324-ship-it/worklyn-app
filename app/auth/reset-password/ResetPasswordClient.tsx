'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import AuthLogo from '@/components/auth/AuthLogo'
import { updatePassword } from '@/app/actions/auth'
import { createClient } from '@/lib/supabase'

function safeDecode(s: string | undefined): string {
  if (!s) return ''
  try { return decodeURIComponent(s) } catch { return s }
}

type Status = 'checking' | 'ready' | 'expired'

export default function ResetPasswordClient({ error }: { error?: string }) {
  const [status, setStatus] = useState<Status>('checking')

  useEffect(() => {
    const supabase = createClient()

    // 1. PKCE flow — Supabase appends ?code= to the redirect URL
    const searchParams = new URLSearchParams(window.location.search)
    const code = searchParams.get('code')
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error: err }) => {
        setStatus(err ? 'expired' : 'ready')
      })
      return
    }

    // 2. Implicit flow — Supabase appends #access_token=...&type=recovery
    //    Hash fragments are never sent to the server, so we handle them here.
    if (window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.slice(1))
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')
      const type = hashParams.get('type')
      if (accessToken && refreshToken && type === 'recovery') {
        supabase.auth
          .setSession({ access_token: accessToken, refresh_token: refreshToken })
          .then(({ error: err }) => {
            setStatus(err ? 'expired' : 'ready')
          })
        return
      }
    }

    // 3. Existing session — arrived via server-side /auth/confirm route (PKCE
    //    exchange done there, session already in cookies).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setStatus('ready')
    })

    supabase.auth.getSession().then(({ data }) => {
      setStatus(data.session ? 'ready' : 'expired')
    })

    return () => subscription.unsubscribe()
  }, [])

  if (status === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
      </div>
    )
  }

  if (status === 'expired') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 pb-16">
        <div className="w-full max-w-md">
          <div className="mb-7">
            <AuthLogo />
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-10 shadow-sm text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
              <svg className="h-7 w-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                  d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Link expired or already used</h2>
            <p className="mt-2 text-sm text-gray-500">
              Password reset links are single-use and expire after 1 hour.
            </p>
            <Link
              href="/auth/forgot-password"
              className="mt-5 inline-block rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Request a new link
            </Link>
          </div>
          <p className="mt-6 text-center text-sm text-gray-500">
            <Link href="/auth/login" className="font-medium text-brand-600 hover:underline">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 pb-16">
      <div className="w-full max-w-md">
        <div className="mb-7">
          <AuthLogo />
          <h1 className="mt-5 text-center text-xl font-bold text-gray-900">Set new password</h1>
          <p className="mt-1 text-center text-sm text-gray-500">
            Choose a strong password for your account.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {safeDecode(error)}
          </div>
        )}

        <form
          action={updatePassword}
          className="space-y-4 rounded-2xl border border-gray-100 bg-white p-8 shadow-sm"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700" htmlFor="password">
              New password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="At least 8 characters"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700" htmlFor="confirm">
              Confirm new password
            </label>
            <input
              id="confirm"
              name="confirm"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="Repeat your new password"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
          >
            Update password
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          <Link href="/auth/login" className="font-medium text-brand-600 hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
