'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import AuthLogo from '@/components/auth/AuthLogo'
import { verifyMfaChallenge } from '@/app/actions/mfa'
import { createClient } from '@/lib/supabase'

interface Props {
  redirectTo?: string
}

export default function MfaClient({ redirectTo }: Props) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  const [status, setStatus] = useState<'checking' | 'ready'>('checking')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  // Check whether MFA is actually needed before rendering the form.
  // If the user is already at AAL2 (or has no TOTP factor), redirect away.
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.mfa.getAuthenticatorAssuranceLevel().then(({ data }) => {
      if (!data || data.nextLevel !== 'aal2' || data.currentLevel === 'aal2') {
        const dest =
          redirectTo &&
          redirectTo.startsWith('/') &&
          !redirectTo.startsWith('/auth/')
            ? redirectTo
            : '/dashboard'
        router.replace(dest)
      } else {
        setStatus('ready')
        // Auto-focus the code field once the form appears
        requestAnimationFrame(() => inputRef.current?.focus())
      }
    })
  }, [router, redirectTo])

  function handleCodeChange(e: React.ChangeEvent<HTMLInputElement>) {
    // Accept digits only, max 6 characters
    setCode(e.target.value.replace(/\D/g, '').slice(0, 6))
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (code.length !== 6 || pending) return
    setError(null)
    startTransition(async () => {
      const result = await verifyMfaChallenge(code, redirectTo)
      // verifyMfaChallenge redirects on success, so we only land here on error
      if (result?.error) {
        setError(result.error)
        setCode('')
        requestAnimationFrame(() => inputRef.current?.focus())
      }
    })
  }

  if (status === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 pb-16">
      <div className="w-full max-w-sm">

        <div className="mb-7">
          <AuthLogo />
          <h1 className="mt-5 text-center text-xl font-bold text-gray-900">
            Two-factor authentication
          </h1>
          <p className="mt-1 text-center text-sm text-gray-500">
            Enter the 6-digit code from your authenticator app.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-gray-100 bg-white p-8 shadow-sm"
        >
          <div>
            <label
              className="block text-sm font-medium text-gray-700"
              htmlFor="mfa-code"
            >
              Verification code
            </label>
            <input
              ref={inputRef}
              id="mfa-code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="one-time-code"
              maxLength={6}
              required
              disabled={pending}
              value={code}
              onChange={handleCodeChange}
              placeholder="000000"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-center text-2xl font-mono tracking-[0.5em] shadow-sm placeholder:text-gray-300 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-60"
            />
          </div>

          <button
            type="submit"
            disabled={pending || code.length !== 6}
            className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
          >
            {pending ? 'Verifying…' : 'Verify'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Wrong account?{' '}
          <button
            type="button"
            onClick={handleSignOut}
            className="font-medium text-brand-600 hover:underline"
          >
            Sign in with a different account
          </button>
        </p>

      </div>
    </div>
  )
}
