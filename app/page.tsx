import Link from 'next/link'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">

        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-brand-900 to-brand-700">
          {/* Subtle dot grid */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)',
              backgroundSize: '32px 32px',
            }}
          />

          <div className="container-app relative py-28 lg:py-36">
            {/* Badge */}
            <div className="mb-6 flex justify-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold text-white/80 backdrop-blur-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-green-400 shrink-0" />
                Built for Allied Health Professionals · Australia
              </span>
            </div>

            {/* Headline */}
            <h1 className="mx-auto max-w-3xl text-center text-5xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl">
              Run your entire practice.{' '}
              <span className="text-sky-300">In one place.</span>
            </h1>

            {/* Subtext */}
            <p className="mx-auto mt-6 max-w-xl text-center text-lg leading-relaxed text-white/60">
              Scheduling, clinical notes, invoicing, and NDIS funding — purpose-built for Australian health practitioners.
            </p>

            {/* CTAs */}
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
                href="/auth/login"
                className="inline-flex items-center rounded-xl border border-white/25 bg-white/10 px-8 py-3.5 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/20 transition-colors"
              >
                Sign in
              </Link>
            </div>

            <p className="mt-5 text-center text-xs text-white/30">
              No credit card required · 14-day free trial · Cancel anytime
            </p>
          </div>
        </section>

        {/* ── Trust bar ─────────────────────────────────────────────────────── */}
        <section className="border-b border-gray-100 bg-gray-50">
          <div className="container-app py-5">
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
              {[
                'NDIS Ready',
                'Secure & Private',
                'Allied Health First',
                'Australian Made',
                'Compliant by Design',
              ].map(item => (
                <div key={item} className="flex items-center gap-2">
                  <svg className="h-4 w-4 shrink-0 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-sm font-medium text-gray-500">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Features ──────────────────────────────────────────────────────── */}
        <section id="features" className="py-24">
          <div className="container-app">
            <div className="mx-auto mb-14 max-w-2xl text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-brand-600">Features</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                Everything you need to run your practice
              </h2>
              <p className="mt-4 text-lg text-gray-500">
                No more scattered tools. Worklyn brings your entire clinical workflow into one secure platform.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map(f => (
                <div
                  key={f.title}
                  className="group rounded-2xl border border-gray-100 bg-white p-6 shadow-sm hover:border-brand-200 hover:shadow-md transition-all"
                >
                  <div className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl ${f.iconBg}`}>
                    {f.icon}
                  </div>
                  <h3 className="text-base font-semibold text-gray-900">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-500">{f.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Pricing ───────────────────────────────────────────────────────── */}
        <section id="pricing" className="bg-gray-50 py-24">
          <div className="container-app">
            <div className="mx-auto mb-14 max-w-2xl text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-brand-600">Pricing</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                Simple, transparent pricing
              </h2>
              <p className="mt-4 text-lg text-gray-500">
                Start free. Scale when you&apos;re ready.
              </p>
            </div>

            <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-3">
              {plans.map(plan => (
                <div
                  key={plan.name}
                  className={`relative flex flex-col rounded-2xl p-8 ${
                    plan.featured
                      ? 'bg-brand-600 shadow-2xl shadow-brand-900/30 ring-2 ring-brand-600'
                      : 'border border-gray-200 bg-white shadow-sm'
                  }`}
                >
                  {plan.featured && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span className="rounded-full bg-green-400 px-3 py-1 text-xs font-bold text-green-900">
                        Most popular
                      </span>
                    </div>
                  )}

                  <div className="mb-6">
                    <h3 className={`text-lg font-bold ${plan.featured ? 'text-white' : 'text-gray-900'}`}>
                      {plan.name}
                    </h3>
                    <p className={`mt-1 text-sm ${plan.featured ? 'text-brand-100' : 'text-gray-500'}`}>
                      {plan.description}
                    </p>
                    <div className="mt-5 flex items-baseline gap-1">
                      <span className={`text-4xl font-bold tracking-tight ${plan.featured ? 'text-white' : 'text-gray-900'}`}>
                        {plan.price}
                      </span>
                      {plan.period && (
                        <span className={`text-sm ${plan.featured ? 'text-brand-100' : 'text-gray-500'}`}>
                          {plan.period}
                        </span>
                      )}
                    </div>
                  </div>

                  <ul className="mb-8 flex-1 space-y-3">
                    {plan.features.map(feature => (
                      <li key={feature} className="flex items-start gap-2.5">
                        <svg
                          className={`mt-0.5 h-4 w-4 shrink-0 ${plan.featured ? 'text-sky-200' : 'text-green-500'}`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span className={`text-sm ${plan.featured ? 'text-brand-50' : 'text-gray-600'}`}>
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={plan.cta.href}
                    className={`block w-full rounded-xl py-3 text-center text-sm font-bold transition-colors ${
                      plan.featured
                        ? 'bg-white text-brand-700 hover:bg-brand-50'
                        : 'bg-brand-600 text-white hover:bg-brand-700'
                    }`}
                  >
                    {plan.cta.label}
                  </Link>
                </div>
              ))}
            </div>

            <p className="mt-8 text-center text-sm text-gray-400">
              All plans include a 14-day free trial. No credit card required.
            </p>
          </div>
        </section>

        {/* ── Final CTA ─────────────────────────────────────────────────────── */}
        <section className="py-24">
          <div className="container-app">
            <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 to-brand-900 px-8 py-16 text-center">
              <h2 className="text-3xl font-bold text-white sm:text-4xl">
                Ready to streamline your practice?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-lg text-brand-100">
                Join health practitioners across Australia who use Worklyn to manage their entire workflow.
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
                  href="/auth/login"
                  className="inline-flex items-center rounded-xl border border-white/30 bg-white/10 px-8 py-3.5 text-sm font-semibold text-white hover:bg-white/20 transition-colors"
                >
                  Sign in
                </Link>
              </div>
              <p className="mt-5 text-sm text-brand-200">No credit card required · Cancel anytime</p>
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const features = [
  {
    iconBg: 'bg-brand-50',
    icon: (
      <svg className="h-5 w-5 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    title: 'Smart Scheduling',
    description: 'Set availability rules, block time, and manage appointments with a calendar built for health professionals.',
  },
  {
    iconBg: 'bg-green-50',
    icon: (
      <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: 'Client Management',
    description: 'Maintain comprehensive profiles with history, contact details, guardian information, and funding plans.',
  },
  {
    iconBg: 'bg-purple-50',
    icon: (
      <svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
    title: 'Clinical Notes',
    description: 'Write and securely store structured session notes — NDIS progress notes, therapy notes, and custom formats.',
  },
  {
    iconBg: 'bg-amber-50',
    icon: (
      <svg className="h-5 w-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    title: 'Invoicing',
    description: 'Generate professional invoices, track payment status, and automate billing after every session.',
  },
  {
    iconBg: 'bg-sky-50',
    icon: (
      <svg className="h-5 w-5 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: 'Funding Tracking',
    description: 'Monitor NDIS plan utilisation, track remaining budgets, and get alerts before plans expire or overspend.',
  },
  {
    iconBg: 'bg-red-50',
    icon: (
      <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    title: 'Secure & Compliant',
    description: 'Row-level security, encrypted at rest, built to meet Australian healthcare privacy requirements.',
  },
]

const plans = [
  {
    name: 'Solo',
    description: 'For independent practitioners',
    price: '$39',
    period: '/month',
    featured: false,
    features: [
      '1 practitioner',
      'Unlimited clients',
      'Smart scheduling',
      'Clinical notes',
      'Invoicing & billing',
      'NDIS funding tracking',
      'Email notifications',
    ],
    cta: { label: 'Start free trial', href: '/auth/signup' },
  },
  {
    name: 'Clinic',
    description: 'For small teams & group practices',
    price: '$99',
    period: '/month',
    featured: true,
    features: [
      'Up to 10 practitioners',
      'Shared client records',
      'Team role management',
      'Everything in Solo',
      'Multi-practitioner calendar',
      'Clinic-level reporting',
      'Priority support',
    ],
    cta: { label: 'Start free trial', href: '/auth/signup' },
  },
  {
    name: 'Enterprise',
    description: 'For large clinics & multi-location',
    price: 'Custom',
    period: undefined,
    featured: false,
    features: [
      'Unlimited practitioners',
      'Multi-location support',
      'Everything in Clinic',
      'Custom reporting',
      'Dedicated account manager',
      'SLA guarantee',
      'SSO / SAML',
    ],
    cta: { label: 'Contact us', href: '/auth/signup' },
  },
]
