import type { Metadata } from 'next'
import Link from 'next/link'
import AuthLogo from '@/components/auth/AuthLogo'
import { requestPasswordReset } from '@/app/actions/auth'

export const metadata: Metadata = { title: 'Forgot password' }

export default function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: { error?: string; success?: string }
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 pb-16">
      <div className="w-full max-w-md">
        <div className="mb-7">
          <AuthLogo />
          <h1 className="mt-5 text-center text-xl font-bold text-gray-900">Reset your password</h1>
          <p className="mt-1 text-center text-sm text-gray-500">
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>

        {searchParams.success ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-10 shadow-sm text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50">
              <svg className="h-7 w-7 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Check your email</h2>
            <p className="mt-2 text-sm text-gray-500">
              We sent a password reset link to your email address. Click the link in the
              email to set a new password.
            </p>
            <p className="mt-4 text-xs text-gray-400">
              Didn&apos;t receive it? Check your spam folder or{' '}
              <Link href="/auth/forgot-password" className="text-brand-600 hover:underline">
                try again
              </Link>
              .
            </p>
          </div>
        ) : (
          <>
            {searchParams.error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {decodeURIComponent(searchParams.error)}
              </div>
            )}

            <form
              action={requestPasswordReset}
              className="space-y-4 rounded-2xl border border-gray-100 bg-white p-8 shadow-sm"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700" htmlFor="email">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  placeholder="you@example.com"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
              >
                Send reset link
              </button>
            </form>
          </>
        )}

        <p className="mt-6 text-center text-sm text-gray-500">
          Remembered it?{' '}
          <Link href="/auth/login" className="font-medium text-brand-600 hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
