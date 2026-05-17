'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function ContactPage() {
  const [sent, setSent] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', organisation: '', message: '' })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSent(true)
  }

  return (
    <>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-brand-900 to-brand-700">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
        <div className="container-app relative py-20 lg:py-24 text-center">
          <div className="mb-6 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold text-white/80 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400 shrink-0" />
              We typically respond within one business day
            </span>
          </div>
          <h1 className="mx-auto max-w-2xl text-4xl font-black uppercase tracking-wider text-white sm:text-5xl leading-[1.1]">
            Get in touch
          </h1>
          <p className="mx-auto mt-5 max-w-lg text-lg leading-relaxed text-white/60">
            Questions about Worklyn, pricing, or your specific workflow? We&apos;re happy to help.
          </p>
        </div>
      </section>

      {/* ── Form + info ── */}
      <section className="bg-gray-50 py-20">
        <div className="container-app">
          <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-5">

            {/* Left: info */}
            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-widest text-brand-600 mb-4">How we can help</p>
                <ul className="space-y-3">
                  {[
                    'Product demos and walkthroughs',
                    'Enterprise and multi-location enquiries',
                    'NDIS compliance and billing questions',
                    'Technical support',
                    'Partnership opportunities',
                  ].map(item => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-gray-600">
                      <svg className="mt-0.5 h-4 w-4 shrink-0 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-brand-100 bg-brand-50 p-6">
                <p className="text-sm font-bold text-brand-900">Just want to try it?</p>
                <p className="mt-2 text-sm leading-relaxed text-brand-700">
                  Start your free 14-day trial — no credit card, no commitment.
                </p>
                <Link
                  href="/auth/signup"
                  className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-700 transition-colors"
                >
                  Start free trial →
                </Link>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Response time</p>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-50">
                    <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Within 1 business day</p>
                    <p className="text-xs text-gray-500">Mon – Fri, AEST</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: form */}
            <div className="lg:col-span-3">
              {sent ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-green-200 bg-green-50 px-8 py-20 text-center shadow-sm">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                    <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="mt-5 text-xl font-bold text-gray-900">Message received</h2>
                  <p className="mt-2 text-sm leading-relaxed text-gray-500 max-w-xs">
                    Thanks for reaching out. We&apos;ll get back to you within one business day.
                  </p>
                  <button
                    onClick={() => { setSent(false); setForm({ name: '', email: '', organisation: '', message: '' }) }}
                    className="mt-6 text-sm font-semibold text-brand-600 hover:text-brand-700 transition-colors"
                  >
                    Send another message →
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={handleSubmit}
                  className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm space-y-5"
                >
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Send us a message</h2>
                    <p className="mt-1 text-sm text-gray-500">We&apos;ll respond within one business day.</p>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label htmlFor="name" className="block text-xs font-semibold text-gray-700 mb-1.5">
                        Full name <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="name"
                        type="text"
                        required
                        value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="Jane Smith"
                        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-xs font-semibold text-gray-700 mb-1.5">
                        Email address <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="email"
                        type="email"
                        required
                        value={form.email}
                        onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                        placeholder="jane@clinic.com.au"
                        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="organisation" className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Organisation <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <input
                      id="organisation"
                      type="text"
                      value={form.organisation}
                      onChange={e => setForm(f => ({ ...f, organisation: e.target.value }))}
                      placeholder="Sunrise Allied Health"
                      className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    />
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Message <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="message"
                      required
                      rows={5}
                      value={form.message}
                      onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                      placeholder="Tell us about your practice and what you need..."
                      className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full rounded-xl bg-brand-600 py-3.5 text-sm font-bold text-white hover:bg-brand-700 transition-colors shadow-sm"
                  >
                    Send message
                  </button>

                  <p className="text-center text-xs text-gray-400">
                    By submitting this form you agree to our{' '}
                    <Link href="/privacy" className="underline hover:text-gray-600">Privacy Policy</Link>.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
