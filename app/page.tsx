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
                Built for Allied Health · NDIS Ready · Australia
              </span>
            </div>

            {/* Headline */}
            <h1 className="mx-auto text-center text-4xl font-black uppercase tracking-wider text-white sm:text-5xl lg:text-6xl leading-[1.1]">
              Operational Infrastructure
              <br />
              <span className="text-sky-300">for Allied Health</span>
            </h1>

            {/* Subtext */}
            <p className="mx-auto mt-6 max-w-xl text-center text-lg leading-relaxed text-white/60">
              Manage practitioners, streamline NDIS workflows, and maintain operational clarity — purpose-built for Australian healthcare providers.
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
                'Practitioner-First',
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
              <p className="text-xs font-bold uppercase tracking-widest text-brand-600">Capabilities</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                Built around how allied health actually works
              </h2>
              <p className="mt-4 text-lg text-gray-500">
                From first session to final invoice — every part of your clinical operation, in one place.
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

        {/* ── Operational Preview ───────────────────────────────────────────── */}
        <section className="bg-slate-950 py-24">
          <div className="container-app">

            {/* Section header */}
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-sky-400">Operational Visibility</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Operational visibility across your practice.
              </h2>
              <p className="mt-4 text-lg text-slate-400">
                Monitor sessions, practitioners, documentation, invoicing, and operational
                performance from a single operational layer.
              </p>
            </div>

            {/* Dashboard frame */}
            <div className="overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-900 shadow-2xl shadow-black/60">

              {/* Window chrome */}
              <div className="flex items-center gap-3 border-b border-slate-700/50 bg-slate-900/80 px-5 py-3.5">
                <div className="flex gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-red-500/60" />
                  <span className="h-3 w-3 rounded-full bg-amber-500/60" />
                  <span className="h-3 w-3 rounded-full bg-green-500/60" />
                </div>
                <span className="ml-2 text-xs font-medium text-slate-500">
                  Worklyn · Sunrise Allied Health · Operations
                </span>
                <div className="ml-auto flex items-center gap-3">
                  <span className="flex items-center gap-1.5 rounded-md bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                    Live
                  </span>
                  <span className="hidden text-xs text-slate-600 sm:block">Mon 12 May · 09:14</span>
                </div>
              </div>

              <div className="space-y-3 p-4">

                {/* ── Stat row ── */}
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  {/* Sessions this week */}
                  <div className="rounded-xl border border-slate-700/40 bg-slate-800/60 p-4">
                    <div className="flex items-start justify-between">
                      <p className="text-xs text-slate-400">Sessions This Week</p>
                      <svg className="h-4 w-4 text-sky-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="mt-2 text-2xl font-bold text-sky-400">34</p>
                    <p className="mt-0.5 text-xs text-slate-500">of 40 session target</p>
                    <div className="mt-3 h-1 w-full rounded-full bg-slate-700">
                      <div className="h-1 rounded-full bg-sky-500" style={{ width: '85%' }} />
                    </div>
                  </div>

                  {/* Active participants */}
                  <div className="rounded-xl border border-slate-700/40 bg-slate-800/60 p-4">
                    <div className="flex items-start justify-between">
                      <p className="text-xs text-slate-400">Active Participants</p>
                      <svg className="h-4 w-4 text-green-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <p className="mt-2 text-2xl font-bold text-green-400">47</p>
                    <p className="mt-0.5 text-xs text-slate-500">3 new this month</p>
                    <div className="mt-3 flex gap-0.5">
                      {[72, 68, 74, 71, 75, 73, 79, 77, 82, 80, 85, 84].map((v, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-sm bg-green-500/40"
                          style={{ height: `${Math.round((v / 90) * 20)}px` }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Outstanding invoices */}
                  <div className="rounded-xl border border-slate-700/40 bg-slate-800/60 p-4">
                    <div className="flex items-start justify-between">
                      <p className="text-xs text-slate-400">Outstanding Invoices</p>
                      <svg className="h-4 w-4 text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p className="mt-2 text-2xl font-bold text-amber-400">$12,840</p>
                    <p className="mt-0.5 text-xs text-slate-500">8 invoices awaiting payment</p>
                    <div className="mt-3 flex items-center gap-1.5">
                      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-400">3 overdue</span>
                      <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-xs text-sky-400">3 NDIA</span>
                    </div>
                  </div>

                  {/* Clinical notes due */}
                  <div className="rounded-xl border border-red-500/20 bg-slate-800/60 p-4">
                    <div className="flex items-start justify-between">
                      <p className="text-xs text-slate-400">Clinical Notes Due</p>
                      <svg className="h-4 w-4 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </div>
                    <p className="mt-2 text-2xl font-bold text-red-400">7</p>
                    <p className="mt-0.5 text-xs text-slate-500">Requires attention</p>
                    <div className="mt-3 flex items-center gap-1.5">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-400" />
                      <p className="text-xs text-red-400/80">Compliance risk — overdue &gt;48h</p>
                    </div>
                  </div>
                </div>

                {/* ── Middle row ── */}
                <div className="grid gap-3 lg:grid-cols-5">

                  {/* Practitioner activity */}
                  <div className="rounded-xl border border-slate-700/40 bg-slate-800/60 p-4 lg:col-span-3">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Practitioner Activity
                      </p>
                      <span className="text-xs text-slate-500">Week of 12 May</span>
                    </div>
                    <table className="w-full">
                      <thead>
                        <tr>
                          <th className="pb-2.5 text-left text-xs font-medium text-slate-500">Practitioner</th>
                          <th className="pb-2.5 text-right text-xs font-medium text-slate-500">Sessions</th>
                          <th className="hidden pb-2.5 text-right text-xs font-medium text-slate-500 sm:table-cell">Utilisation</th>
                          <th className="pb-2.5 text-right text-xs font-medium text-slate-500">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/40">
                        {[
                          { initials: 'SC', name: 'Sarah Chen',    role: 'OT',      sessions: 18, util: 82, status: 'active',   color: 'bg-sky-500' },
                          { initials: 'JO', name: 'James Okafor',  role: 'Physio',  sessions: 16, util: 87, status: 'active',   color: 'bg-purple-500' },
                          { initials: 'MW', name: 'Marcus Webb',   role: 'OT',      sessions: 12, util: 71, status: 'active',   color: 'bg-brand-500' },
                          { initials: 'PN', name: 'Priya Nair',    role: 'Speech',  sessions: 8,  util: 54, status: 'leave',    color: 'bg-amber-500' },
                        ].map((p) => (
                          <tr key={p.name}>
                            <td className="py-2.5">
                              <div className="flex items-center gap-2.5">
                                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${p.color}`}>
                                  {p.initials}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-slate-200">{p.name}</p>
                                  <p className="text-xs text-slate-500">{p.role}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-2.5 text-right text-sm tabular-nums text-slate-300">{p.sessions}</td>
                            <td className="hidden py-2.5 text-right sm:table-cell">
                              <div className="flex items-center justify-end gap-2">
                                <div className="h-1.5 w-20 rounded-full bg-slate-700">
                                  <div
                                    className={`h-1.5 rounded-full transition-all ${
                                      p.util >= 80 ? 'bg-green-500' : p.util >= 65 ? 'bg-sky-500' : 'bg-amber-500'
                                    }`}
                                    style={{ width: `${p.util}%` }}
                                  />
                                </div>
                                <span className="w-8 text-right text-xs tabular-nums text-slate-400">{p.util}%</span>
                              </div>
                            </td>
                            <td className="py-2.5 text-right">
                              <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                                p.status === 'active'
                                  ? 'bg-green-500/10 text-green-400'
                                  : 'bg-amber-500/10 text-amber-400'
                              }`}>
                                {p.status === 'active' ? 'Active' : 'On leave'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="mt-3 flex items-center justify-between border-t border-slate-700/40 pt-3">
                      <p className="text-xs text-slate-500">Clinic average utilisation</p>
                      <p className="text-xs font-semibold text-slate-300">74%</p>
                    </div>
                  </div>

                  {/* Upcoming sessions */}
                  <div className="rounded-xl border border-slate-700/40 bg-slate-800/60 p-4 lg:col-span-2">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Upcoming Sessions
                      </p>
                      <span className="rounded-md bg-sky-500/10 px-2 py-0.5 text-xs text-sky-400">12 today</span>
                    </div>
                    <div className="space-y-1">
                      {[
                        { time: '09:00', client: 'Emma Patel',    type: 'OT',     prac: 'S. Chen',   color: 'bg-sky-500' },
                        { time: '10:30', client: 'Liam Torres',   type: 'Physio', prac: 'J. Okafor', color: 'bg-purple-500' },
                        { time: '11:00', client: 'Aria Mathews',  type: 'OT',     prac: 'M. Webb',   color: 'bg-brand-500' },
                        { time: '13:30', client: 'Noah Singh',    type: 'Speech', prac: 'P. Nair',   color: 'bg-amber-500' },
                        { time: '14:00', client: 'Olivia Tan',    type: 'Physio', prac: 'J. Okafor', color: 'bg-purple-500' },
                      ].map((s, i) => (
                        <div key={i} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-700/30">
                          <span className="w-10 shrink-0 text-xs font-medium tabular-nums text-sky-400">{s.time}</span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-slate-200">{s.client}</p>
                            <p className="text-xs text-slate-500">{s.type} · {s.prac}</p>
                          </div>
                          <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full opacity-60 ${s.color}`}>
                            <span className="h-1.5 w-1.5 rounded-full bg-white" />
                          </span>
                        </div>
                      ))}
                      <p className="pt-2 text-center text-xs text-slate-500">+ 7 more sessions today</p>
                    </div>
                  </div>
                </div>

                {/* ── Bottom row ── */}
                <div className="grid gap-3 lg:grid-cols-2">

                  {/* Invoicing breakdown */}
                  <div className="rounded-xl border border-slate-700/40 bg-slate-800/60 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Invoicing & Payments
                      </p>
                      <span className="text-xs text-slate-500">May 2025</span>
                    </div>
                    <div className="mb-4 flex h-2 w-full overflow-hidden rounded-full bg-slate-700">
                      <div className="h-full bg-green-500 transition-all" style={{ width: '62%' }} />
                      <div className="h-full bg-amber-500 transition-all" style={{ width: '28%' }} />
                      <div className="h-full bg-sky-500 transition-all" style={{ width: '9%' }} />
                      <div className="h-full bg-slate-600 transition-all" style={{ width: '1%' }} />
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                      {[
                        { label: 'Paid',        value: '$28,450', pct: '62%', dot: 'bg-green-500' },
                        { label: 'Outstanding', value: '$12,840', pct: '28%', dot: 'bg-amber-500' },
                        { label: 'NDIA Pending',value: '$4,200',  pct: '9%',  dot: 'bg-sky-500'   },
                        { label: 'Draft',       value: '$420',    pct: '1%',  dot: 'bg-slate-600' },
                      ].map((row) => (
                        <div key={row.label} className="flex items-center gap-2">
                          <span className={`h-2 w-2 shrink-0 rounded-full ${row.dot}`} />
                          <span className="text-xs text-slate-400">{row.label}</span>
                          <span className="ml-auto text-xs font-semibold text-slate-300">{row.value}</span>
                          <span className="w-7 text-right text-xs text-slate-500">{row.pct}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-slate-700/40 pt-3">
                      <p className="text-xs text-slate-500">Total billed this month</p>
                      <p className="text-xs font-semibold text-slate-300">$45,910</p>
                    </div>
                  </div>

                  {/* NDIS claims */}
                  <div className="rounded-xl border border-slate-700/40 bg-slate-800/60 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        NDIS Claims
                      </p>
                      <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-xs text-amber-400">3 awaiting</span>
                    </div>
                    <div className="space-y-2">
                      {[
                        { ref: 'CLM-0089', participant: 'Emma Patel',  amount: '$1,480',  category: 'Daily Activities',    days: 2 },
                        { ref: 'CLM-0090', participant: 'Liam Torres', amount: '$2,240',  category: 'Capacity Building',   days: 1 },
                        { ref: 'CLM-0091', participant: 'Noah Singh',  amount: '$480',    category: 'Capacity Building',   days: 0 },
                      ].map((claim) => (
                        <div key={claim.ref} className="flex items-center justify-between rounded-lg border border-slate-700/40 px-3 py-2.5">
                          <div>
                            <p className="text-sm font-medium text-slate-200">{claim.participant}</p>
                            <p className="text-xs text-slate-500">{claim.ref} · {claim.category}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-slate-200">{claim.amount}</p>
                            <span className="text-xs text-amber-400">
                              {claim.days === 0 ? 'Submitted today' : `${claim.days}d ago`}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-slate-700/40 pt-3">
                      <p className="text-xs text-slate-500">12 claims paid this month</p>
                      <p className="text-xs font-semibold text-green-400">$18,600 received</p>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </section>

        {/* ── Pricing ───────────────────────────────────────────────────────── */}
        <section id="pricing" className="bg-gray-50 py-24">
          <div className="container-app">
            <div className="mx-auto mb-14 max-w-2xl text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-brand-600">Pricing</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                Transparent pricing for allied health providers
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
                Purpose-built for allied health operations.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-lg text-brand-100">
                Join allied health providers across Australia running compliant, organised, operational practices.
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
    title: 'Session Scheduling',
    description: 'Define practitioner availability, block time, and coordinate session delivery across your clinic.',
  },
  {
    iconBg: 'bg-green-50',
    icon: (
      <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: 'Participant Management',
    description: 'Maintain complete participant profiles — contact details, guardian information, NDIS funding plans, and service history.',
  },
  {
    iconBg: 'bg-purple-50',
    icon: (
      <svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
    title: 'Clinical Documentation',
    description: 'Write and securely store structured session notes — NDIS progress notes, therapy notes, and custom formats — audit-ready.',
  },
  {
    iconBg: 'bg-amber-50',
    icon: (
      <svg className="h-5 w-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    title: 'Billing & Invoicing',
    description: 'Generate compliant invoices, process NDIA claims, and automate billing after every session.',
  },
  {
    iconBg: 'bg-sky-50',
    icon: (
      <svg className="h-5 w-5 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: 'NDIS Funding Management',
    description: 'Monitor plan utilisation across support categories, track budgets, and receive alerts before plans expire or overspend.',
  },
  {
    iconBg: 'bg-red-50',
    icon: (
      <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    title: 'Healthcare-Grade Security',
    description: 'Row-level security, encrypted at rest, built to meet Australian healthcare privacy and compliance requirements.',
  },
]

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
    cta: { label: 'Contact us', href: '/auth/signup' },
  },
]
