import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Features — Worklyn',
  description: 'Everything allied health providers need: sessions, invoicing, NDIS billing, clinical documentation, and operational reporting.',
}

export default function FeaturesPage() {
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
        <div className="container-app relative py-24 lg:py-32 text-center">
          <div className="mb-6 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold text-white/80 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400 shrink-0" />
              Built for Allied Health · NDIS Ready
            </span>
          </div>
          <h1 className="mx-auto max-w-3xl text-4xl font-black uppercase tracking-wider text-white sm:text-5xl lg:text-6xl leading-[1.1]">
            Built around how allied health
            <br />
            <span className="text-sky-300">actually works</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-white/60">
            From first session to final invoice — every part of your clinical operation, in one place.
          </p>
          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-sm font-bold text-brand-700 shadow-lg hover:bg-brand-50 transition-colors"
            >
              Start free trial
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center rounded-xl border border-white/25 bg-white/10 px-8 py-3.5 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/20 transition-colors"
            >
              See pricing
            </Link>
          </div>
          <p className="mt-5 text-center text-xs text-white/30">No credit card required · 14-day free trial</p>
        </div>
      </section>

      {/* ── Trust bar ── */}
      <section className="border-b border-gray-100 bg-gray-50">
        <div className="container-app py-5">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {['NDIS Price Guide integrated', 'Australian data residency', 'Healthcare-grade security', 'Audit-ready records', 'No credit card required'].map(item => (
              <div key={item} className="flex items-center gap-2">
                <svg className="h-4 w-4 shrink-0 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium text-gray-500">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Core features ── */}
      <section className="py-24">
        <div className="container-app">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-brand-600">Capabilities</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Everything your practice needs
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              A complete operational layer — not a patchwork of disconnected tools.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(f => (
              <div
                key={f.title}
                className="group flex flex-col rounded-2xl border border-gray-100 bg-white p-8 shadow-sm transition-all hover:border-brand-200 hover:shadow-lg"
              >
                <div className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl ${f.iconBg} transition-transform group-hover:scale-110`}>
                  {f.icon}
                </div>
                <h3 className="text-base font-bold text-gray-900">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">{f.description}</p>
                <ul className="mt-5 space-y-2 border-t border-gray-50 pt-5">
                  {f.bullets.map(b => (
                    <li key={b} className="flex items-start gap-2 text-sm text-gray-500">
                      <svg className="mt-0.5 h-4 w-4 shrink-0 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                      </svg>
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── NDIS highlight ── */}
      <section className="bg-slate-950 py-20">
        <div className="container-app">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-4 py-1.5 text-xs font-semibold text-sky-400">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
              NDIS Compliance
            </span>
            <h2 className="mt-5 text-3xl font-bold text-white sm:text-4xl">
              Designed for Australian NDIS compliance
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-slate-400">
              Auto-generate compliant invoices from the NDIS Price Guide, track support category budgets, and maintain audit-ready documentation — without the manual overhead.
            </p>
            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {[
                { title: 'Price Guide', desc: 'Auto-populated NDIS line items from the current price guide' },
                { title: 'Budget Tracking', desc: 'Monitor plan utilisation across all support categories' },
                { title: 'Audit-Ready', desc: 'Every note timestamped and practitioner-attributed' },
              ].map(item => (
                <div key={item.title} className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-5 text-left">
                  <p className="text-sm font-bold text-white">{item.title}</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-24">
        <div className="container-app">
          <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 to-brand-900 px-8 py-16 text-center">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Ready to streamline your practice?
            </h2>
            <p className="mx-auto mt-4 max-w-md text-lg text-brand-100">
              Start your 14-day free trial — no credit card required.
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
                Talk to us
              </Link>
            </div>
            <p className="mt-5 text-sm text-brand-200">No credit card required · Cancel anytime</p>
          </div>
        </div>
      </section>
    </>
  )
}

const features = [
  {
    iconBg: 'bg-brand-50',
    icon: (
      <svg className="h-6 w-6 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    title: 'Session Scheduling',
    description: 'Coordinate session delivery across your clinic. Log sessions in seconds and track status from scheduled through to invoiced.',
    bullets: ['Record sessions with client, service, duration and rate', 'Filter by status: scheduled, completed, unbilled', 'Multi-practitioner support'],
  },
  {
    iconBg: 'bg-green-50',
    icon: (
      <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: 'Participant Management',
    description: 'Maintain complete participant profiles — contact details, guardian information, NDIS funding plans, and service history.',
    bullets: ['NDIS participant records with plan dates', 'Guardian and support coordinator contacts', 'Document storage and compliance tracking'],
  },
  {
    iconBg: 'bg-purple-50',
    icon: (
      <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
    title: 'Clinical Documentation',
    description: 'Write and securely store structured session notes — NDIS progress notes, therapy notes, and custom formats — audit-ready.',
    bullets: ['NDIS-compliant progress note format', 'Structured completion notes per session', 'Timestamped and practitioner-attributed'],
  },
  {
    iconBg: 'bg-amber-50',
    icon: (
      <svg className="h-6 w-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    title: 'Billing & Invoicing',
    description: 'Generate compliant invoices automatically after every session. Track payment status, remittance, and outstanding amounts.',
    bullets: ['Auto-draft invoice on session completion', 'NDIS Price Guide line items', 'Payment tracking and remittance management'],
  },
  {
    iconBg: 'bg-sky-50',
    icon: (
      <svg className="h-6 w-6 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: 'Operational Reporting',
    description: 'Monitor sessions, practitioners, billing, and operational performance from a single command centre.',
    bullets: ['Revenue and session KPIs', 'Practitioner utilisation rates', 'Enterprise command centre for clinic owners'],
  },
  {
    iconBg: 'bg-red-50',
    icon: (
      <svg className="h-6 w-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    title: 'Healthcare-Grade Security',
    description: 'Row-level security, encrypted at rest, built to meet Australian healthcare privacy and compliance requirements.',
    bullets: ['Row-level security on all records', 'Encrypted data at rest and in transit', 'Australian data residency'],
  },
]
