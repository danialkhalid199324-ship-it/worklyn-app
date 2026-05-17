import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'About — Worklyn',
  description: 'Worklyn is purpose-built operational infrastructure for Australian allied health providers.',
}

export default function AboutPage() {
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
        <div className="container-app relative py-24 lg:py-28 text-center">
          <div className="mb-6 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold text-white/80 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400 shrink-0" />
              Australian Made · Built for Allied Health
            </span>
          </div>
          <h1 className="mx-auto max-w-3xl text-4xl font-black uppercase tracking-wider text-white sm:text-5xl lg:text-6xl leading-[1.1]">
            Built for Allied Health.
            <br />
            <span className="text-sky-300">By people who get it.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-white/60">
            Worklyn was created because allied health providers deserved software that reflects how clinical operations actually work — not a generic business tool bent to fit.
          </p>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="border-b border-gray-100 bg-gray-50 py-14">
        <div className="container-app">
          <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-3 text-center">
            {[
              { stat: 'NDIS Ready', label: 'Price Guide integrated from day one', icon: '🇦🇺' },
              { stat: 'Compliant', label: 'Healthcare-grade security and privacy', icon: '🔒' },
              { stat: 'Practitioner-first', label: 'Designed around real clinical workflows', icon: '⚕️' },
            ].map(item => (
              <div key={item.label} className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
                <div className="mb-3 text-3xl">{item.icon}</div>
                <p className="text-xl font-black text-brand-600">{item.stat}</p>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Mission ── */}
      <section className="py-20">
        <div className="container-app">
          <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-2 lg:gap-20 items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-brand-600">Our mission</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                Remove the operational burden from allied health practitioners
              </h2>
              <p className="mt-5 text-base leading-relaxed text-gray-500">
                Allied health professionals spend too many hours on administration — chasing invoices, managing compliance, manually entering session notes. Worklyn exists to give that time back.
              </p>
              <p className="mt-4 text-base leading-relaxed text-gray-500">
                We built infrastructure for the full clinical workflow: session delivery, documentation, NDIS billing, and operational reporting — so practitioners can focus on participant outcomes.
              </p>
              <div className="mt-8 flex gap-4">
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-white hover:bg-brand-700 transition-colors"
                >
                  See pricing →
                </Link>
              </div>
            </div>

            {/* Visual block */}
            <div className="space-y-4">
              {[
                { label: 'Admin time saved per week', value: '8+ hours', color: 'text-brand-600', bg: 'bg-brand-50', bar: 'bg-brand-500', width: '80%' },
                { label: 'Invoices auto-generated on session completion', value: '100%', color: 'text-green-600', bg: 'bg-green-50', bar: 'bg-green-500', width: '100%' },
                { label: 'NDIS compliance rate with structured notes', value: 'Always', color: 'text-sky-600', bg: 'bg-sky-50', bar: 'bg-sky-500', width: '100%' },
              ].map(item => (
                <div key={item.label} className={`rounded-xl border border-gray-100 ${item.bg} p-5`}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-gray-600">{item.label}</p>
                    <span className={`text-lg font-black ${item.color}`}>{item.value}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-white/60">
                    <div className={`h-1.5 rounded-full ${item.bar}`} style={{ width: item.width }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Values ── */}
      <section className="border-t border-gray-100 bg-gray-50 py-20">
        <div className="container-app">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-brand-600">How we build</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-900">Our principles</h2>
          </div>
          <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-3">
            {values.map(v => (
              <div key={v.title} className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
                <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-xl ${v.iconBg}`}>
                  {v.icon}
                </div>
                <h3 className="text-base font-bold text-gray-900">{v.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">{v.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-24">
        <div className="container-app">
          <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 to-brand-900 px-8 py-16 text-center">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Ready to run a better practice?
            </h2>
            <p className="mx-auto mt-4 max-w-md text-lg text-brand-100">
              Join allied health providers across Australia on Worklyn. 14-day free trial, no credit card.
            </p>
            <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/auth/signup"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-sm font-bold text-brand-700 hover:bg-brand-50 transition-colors"
              >
                Start for free
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center rounded-xl border border-white/30 bg-white/10 px-8 py-3.5 text-sm font-semibold text-white hover:bg-white/20 transition-colors"
              >
                Get in touch
              </Link>
            </div>
            <p className="mt-5 text-sm text-brand-200">No credit card required · Cancel anytime</p>
          </div>
        </div>
      </section>
    </>
  )
}

const values = [
  {
    iconBg: 'bg-brand-50',
    icon: (
      <svg className="h-6 w-6 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    title: 'Compliance-first',
    description: 'Every feature is designed around real NDIS and healthcare compliance requirements — not bolted on afterwards.',
  },
  {
    iconBg: 'bg-green-50',
    icon: (
      <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: 'Practitioner-first',
    description: 'Designed by people who have sat across from practitioners. Every workflow mirrors the real clinical day.',
  },
  {
    iconBg: 'bg-sky-50',
    icon: (
      <svg className="h-6 w-6 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    title: 'Secure by default',
    description: 'Healthcare-grade security is non-negotiable. Row-level access control, encryption, and Australian data residency.',
  },
]
