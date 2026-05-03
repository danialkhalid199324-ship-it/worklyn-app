import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Check your email' }

export default function CheckEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md text-center">
        <div className="rounded-2xl border border-gray-100 bg-white p-10 shadow-sm">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50">
            <svg className="h-7 w-7 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>

          <h1 className="text-xl font-bold text-gray-900">Check your email</h1>
          <p className="mt-2 text-sm text-gray-500">
            We sent a confirmation link to your email address. Click the link to activate
            your account and sign in.
          </p>
          <p className="mt-4 text-xs text-gray-400">
            Didn&apos;t receive it? Check your spam folder or{' '}
            <Link href="/auth/signup" className="text-brand-600 hover:underline">
              try signing up again
            </Link>
            .
          </p>
        </div>

        <p className="mt-6 text-sm text-gray-500">
          Already confirmed?{' '}
          <Link href="/auth/login" className="font-medium text-brand-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
