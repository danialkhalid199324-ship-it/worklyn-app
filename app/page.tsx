import Link from 'next/link'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import Button from '@/components/ui/Button'

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-br from-brand-50 to-white py-24">
          <div className="container-app text-center">
            <h1 className="text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              Practice management,{' '}
              <span className="text-brand-600">simplified.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
              Schedule appointments, manage clients, track session notes, and
              send invoices — all in one place built for health professionals.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Link href="/auth/signup">
                <Button size="lg">Get started free</Button>
              </Link>
              <Link href="/auth/login">
                <Button variant="outline" size="lg">
                  Sign in
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-20">
          <div className="container-app">
            <h2 className="text-center text-3xl font-bold text-gray-900">
              Everything you need to run your practice
            </h2>
            <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f) => (
                <div
                  key={f.title}
                  className="rounded-2xl border border-gray-100 p-6 shadow-sm"
                >
                  <div className="mb-4 text-3xl">{f.icon}</div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {f.title}
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">{f.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-brand-600 py-20">
          <div className="container-app text-center">
            <h2 className="text-3xl font-bold text-white">
              Ready to streamline your practice?
            </h2>
            <p className="mt-4 text-brand-100">
              Join practitioners who trust us to manage their workflow.
            </p>
            <Link href="/auth/signup" className="mt-8 inline-block">
              <Button variant="white" size="lg">
                Start for free
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

const features = [
  {
    icon: '📅',
    title: 'Smart Scheduling',
    description:
      'Set availability rules, block time off, and let clients book online 24/7.',
  },
  {
    icon: '👥',
    title: 'Client Management',
    description:
      'Maintain detailed client profiles with history, notes, and contact info.',
  },
  {
    icon: '📝',
    title: 'Session Notes',
    description:
      'Write, store, and retrieve confidential session notes securely.',
  },
  {
    icon: '💳',
    title: 'Invoicing',
    description:
      'Generate professional invoices and track payment status with ease.',
  },
  {
    icon: '📊',
    title: 'Reports',
    description:
      'Get insights on revenue, appointments, and practice performance.',
  },
  {
    icon: '🔒',
    title: 'Secure & Compliant',
    description: 'Built on Supabase with row-level security for data privacy.',
  },
]
