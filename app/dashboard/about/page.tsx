import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'About Worklyn' }

export default function AboutPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">About Worklyn</h1>
        <p className="mt-0.5 text-sm text-gray-500">Product information and details.</p>
      </div>

      <div className="max-w-lg rounded-xl border border-gray-200 bg-white p-8">
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">Worklyn&#8482;</h2>
            <p className="mt-1 text-sm text-gray-400">Version 0.1.0</p>
          </div>

          <p className="text-sm leading-relaxed text-gray-600">
            Worklyn is a practice management platform built for allied health practitioners.
            Manage sessions, clients, invoices, and team communications from a single workspace.
          </p>

          <div className="space-y-1 border-t border-gray-100 pt-5">
            <p className="text-sm text-gray-700">
              <span className="font-medium">Developed by</span>{' '}
              <span className="text-gray-900">Danial Khalid</span>
            </p>
          </div>

          <p className="text-xs text-gray-400">
            &copy; {new Date().getFullYear()} Worklyn. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}
