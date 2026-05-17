import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Pricing — Worklyn',
  description: "Simple, transparent pricing for allied health providers. Start free. Scale when you're ready.",
}

export default function PricingPage() {
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
              14-day free trial · No credit card required
            </span>
          </div>
          <h1 className="mx-auto max-w-2xl text-4xl font-black uppercase tracking-wider text-white sm:text-5xl lg:text-6xl leading-[1.1]">
            Transparent pricing
            <br />
            <span className="text-sky-300">for allied health</span>
          </h1>
          <p className="mx-auto mt-6 max-w-lg text-lg leading-relaxed text-white/60">
            Start free. Scale when you&apos;re ready. No lock-in, no hidden fees.
          </p>
        </div>
      </section>

      {/* ── Plans ── */}
      <section className="py-20 bg-gray-50">
        <div className="container-app">
          <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-3 items-start">
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
                  <h2 className={`text-xl font-bold ${plan.featured ? 'text-white' : 'text-gray-900'}`}>
                    {plan.name}
                  </h2>
                  <p className={`mt-1.5 text-sm ${plan.featured ? 'text-brand-100' : 'text-gray-500'}`}>
                    {plan.description}
                  </p>
                  <div className="mt-6 flex items-baseline gap-1">
                    <span className={`text-5xl font-black tracking-tight ${plan.featured ? 'text-white' : 'text-gray-900'}`}>
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span className={`text-sm ${plan.featured ? 'text-brand-100' : 'text-gray-500'}`}>
                        {plan.period}
                      </span>
                    )}
                  </div>
                </div>

                <ul className="mb-8 flex-1 space-y-3.5">
                  {plan.features.map(feature => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <svg
                        className={`mt-0.5 h-4 w-4 shrink-0 ${plan.featured ? 'text-sky-200' : 'text-green-500'}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                      </svg>
                      <span className={`text-sm ${plan.featured ? 'text-brand-50' : 'text-gray-600'}`}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.cta.href}
                  className={`block w-full rounded-xl py-3.5 text-center text-sm font-bold transition-colors ${
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

      {/* ── FAQ ── */}
      <section className="py-20 border-t border-gray-100">
        <div className="container-app">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-brand-600">FAQ</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-900">Common questions</h2>
          </div>
          <div className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-2">
            {faqs.map(faq => (
              <div key={faq.q} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900">{faq.q}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">{faq.a}</p>
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
              Still have questions?
            </h2>
            <p className="mx-auto mt-4 max-w-md text-lg text-brand-100">
              Our team is happy to walk you through Worklyn and find the right plan for your practice.
            </p>
            <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-sm font-bold text-brand-700 hover:bg-brand-50 transition-colors"
              >
                Talk to us
              </Link>
              <Link
                href="/auth/signup"
                className="inline-flex items-center rounded-xl border border-white/30 bg-white/10 px-8 py-3.5 text-sm font-semibold text-white hover:bg-white/20 transition-colors"
              >
                Start free trial
              </Link>
            </div>
            <p className="mt-5 text-sm text-brand-200">No credit card required · Cancel anytime</p>
          </div>
        </div>
      </section>
    </>
  )
}

const plans = [
  {
    name: 'Solo',
    description: 'For sole practitioners and independent providers',
    price: '$39',
    period: '/month',
    featured: false,
    features: [
      '1 practitioner',
      'Unlimited participants',
      'Session scheduling',
      'Clinical documentation',
      'Billing & invoicing',
      'NDIS funding management',
      'Email notifications',
    ],
    cta: { label: 'Start free trial', href: '/auth/signup' },
  },
  {
    name: 'Clinic',
    description: 'For multi-practitioner clinics and group practices',
    price: '$99',
    period: '/month',
    featured: true,
    features: [
      'Up to 10 practitioners',
      'Shared participant records',
      'Role-based access control',
      'Everything in Solo',
      'Multi-practitioner calendar',
      'Operational reporting',
      'Priority support',
    ],
    cta: { label: 'Start free trial', href: '/auth/signup' },
  },
  {
    name: 'Enterprise',
    description: 'For large providers and multi-location clinics',
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
    cta: { label: 'Contact us', href: '/contact' },
  },
]

const faqs = [
  {
    q: 'Is there a free trial?',
    a: 'Yes — every plan includes a 14-day free trial with no credit card required. Cancel or change plans at any time.',
  },
  {
    q: 'Can I add more practitioners later?',
    a: 'Yes. Upgrade your plan at any time. Your data carries across — no migration required.',
  },
  {
    q: 'Is Worklyn NDIS compliant?',
    a: 'Worklyn is built specifically for Australian allied health providers and integrates the NDIS Price Guide for compliant invoicing and support category tracking.',
  },
  {
    q: 'Where is my data stored?',
    a: 'All data is stored in Australia, encrypted at rest and in transit, with row-level security so practitioners only access their own records.',
  },
  {
    q: 'What happens if I cancel?',
    a: 'You can export all your data at any time. If you cancel, your account remains accessible until the end of your billing period.',
  },
  {
    q: 'Do you offer a discount for sole traders?',
    a: 'Our Solo plan at $39/month is designed for independent practitioners. Contact us if you have specific needs.',
  },
]
