import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy — Worklyn',
  description: 'How Worklyn collects, uses, and protects your information. Australian-based healthcare SaaS.',
}

const LAST_UPDATED = '17 May 2025'
const CONTACT_EMAIL = 'privacy@worklyn.com.au'

export default function PrivacyPage() {
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
              Last updated {LAST_UPDATED}
            </span>
          </div>
          <h1 className="mx-auto max-w-2xl text-4xl font-black uppercase tracking-wider text-white sm:text-5xl leading-[1.1]">
            Privacy Policy
          </h1>
          <p className="mx-auto mt-5 max-w-lg text-lg leading-relaxed text-white/60">
            Worklyn is committed to protecting the privacy and security of your information and that of the participants you support.
          </p>
        </div>
      </section>

      {/* ── Content ── */}
      <section className="bg-gray-50 py-20">
        <div className="container-app">
          <div className="mx-auto max-w-3xl">

            {/* TOC */}
            <div className="mb-10 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-widest text-brand-600 mb-4">Contents</p>
              <ol className="space-y-2 text-sm text-gray-600">
                {[
                  'About Worklyn',
                  'Information We Collect',
                  'How We Use Your Information',
                  'Client and Participant Data',
                  'Cookies and Analytics',
                  'Data Storage and Security',
                  'Third-Party Services',
                  'Australian Privacy Compliance',
                  'Your Rights',
                  'Data Retention',
                  'Changes to This Policy',
                  'Contact Us',
                ].map((item, i) => (
                  <li key={item}>
                    <a href={`#section-${i + 1}`} className="hover:text-brand-600 transition-colors">
                      {i + 1}. {item}
                    </a>
                  </li>
                ))}
              </ol>
            </div>

            <div className="space-y-10">

              <Section id="section-1" title="1. About Worklyn">
                <p>
                  Worklyn (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) is an Australian SaaS platform designed for allied health providers, NDIS registered providers, support coordinators, therapists, and operational healthcare teams. We provide practice management infrastructure including session scheduling, clinical documentation, NDIS billing, participant management, and operational reporting.
                </p>
                <p>
                  This Privacy Policy applies to all users of the Worklyn platform, including administrators, practitioners, and any other authorised staff. By using Worklyn, you agree to the collection and use of information as described in this policy.
                </p>
              </Section>

              <Section id="section-2" title="2. Information We Collect">
                <p>We collect information in two categories: information about your organisation and its staff, and information about the participants your organisation supports.</p>
                <SubHeading>Account and Organisation Information</SubHeading>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>Full name, email address, and password (hashed — never stored in plain text)</li>
                  <li>Organisation name, ABN, and contact details</li>
                  <li>NDIS provider registration number (where applicable)</li>
                  <li>Billing details (processed via our payment provider; card numbers are never stored by Worklyn)</li>
                  <li>IP address, browser type, and device information collected automatically when you use the platform</li>
                </ul>
                <SubHeading>Usage Data</SubHeading>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>Pages visited, features used, and actions taken within the platform</li>
                  <li>Session duration and login timestamps</li>
                  <li>API requests and error logs (retained for debugging and security)</li>
                </ul>
              </Section>

              <Section id="section-3" title="3. How We Use Your Information">
                <p>We use your information to:</p>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>Provide, operate, and maintain the Worklyn platform</li>
                  <li>Authenticate users and enforce multi-factor authentication where required</li>
                  <li>Process billing and manage your subscription</li>
                  <li>Send transactional emails (invoices, account confirmations, password resets)</li>
                  <li>Provide customer support and respond to enquiries</li>
                  <li>Monitor platform performance, fix bugs, and improve features</li>
                  <li>Comply with legal obligations under Australian law</li>
                </ul>
                <p>
                  We do <strong>not</strong> sell, rent, or trade your personal information or your participants&apos; data to any third parties.
                </p>
              </Section>

              <Section id="section-4" title="4. Client and Participant Data">
                <p>
                  Because Worklyn is used by healthcare providers, you may enter sensitive information about the participants and clients your organisation supports. This includes NDIS participant identifiers, plan details, funding categories, support history, clinical notes, and contact information for participants and their guardians.
                </p>
                <p>
                  This data is entered by you and remains <strong>yours</strong>. Worklyn acts as a data processor on your behalf. You, as the data controller, are responsible for ensuring you have the appropriate consents and lawful basis to store and process participant information within our platform.
                </p>
                <p>
                  Worklyn staff do not access participant-level data except where necessary to provide technical support, and only with your explicit authorisation. All such access is logged.
                </p>
                <p>
                  Row-level security is enforced at the database level, meaning practitioners and staff can only access the participant records associated with their organisation and their assigned permissions.
                </p>
              </Section>

              <Section id="section-5" title="5. Cookies and Analytics">
                <SubHeading>Essential Cookies</SubHeading>
                <p>
                  Worklyn uses cookies strictly necessary to operate the platform — including authentication session tokens. These cannot be disabled without breaking core functionality.
                </p>
                <SubHeading>Analytics</SubHeading>
                <p>
                  We may use privacy-respecting analytics tools to understand how practitioners use the platform, identify usability issues, and prioritise feature development. Where third-party analytics are used, they are configured to anonymise IP addresses and not share data across sites.
                </p>
                <p>
                  We do not use advertising cookies, tracking pixels, or cross-site behavioural tracking.
                </p>
              </Section>

              <Section id="section-6" title="6. Data Storage and Security">
                <p>All Worklyn data is stored in Australia.</p>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li><strong>Encryption at rest:</strong> All data stored in our database is encrypted using AES-256.</li>
                  <li><strong>Encryption in transit:</strong> All communication between your browser and Worklyn servers is encrypted using TLS 1.2+.</li>
                  <li><strong>Row-level security:</strong> Database policies ensure users can only query records belonging to their organisation.</li>
                  <li><strong>Access controls:</strong> Role-based permissions limit what practitioners, administrators, and support staff can view or modify.</li>
                  <li><strong>Audit trails:</strong> Key actions (invoice creation, note editing, user access) are logged with timestamps and user attribution.</li>
                </ul>
                <p>
                  Despite these measures, no system is perfectly immune to breach. In the event of a data breach affecting your personal information, we will notify you as required by the Notifiable Data Breaches scheme under the Australian Privacy Act 1988.
                </p>
              </Section>

              <Section id="section-7" title="7. Third-Party Services">
                <p>Worklyn uses the following third-party services to operate the platform. Each provider is contractually required to handle data securely and in accordance with applicable privacy laws:</p>
                <div className="overflow-hidden rounded-xl border border-gray-200">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Provider</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Purpose</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Data Location</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {[
                        { name: 'Supabase', purpose: 'Database, authentication, and storage', location: 'Australia (ap-southeast-2)' },
                        { name: 'Vercel', purpose: 'Application hosting and CDN', location: 'Australia / Global edge' },
                        { name: 'Resend', purpose: 'Transactional email delivery', location: 'US (processed only)' },
                        { name: 'Stripe', purpose: 'Subscription billing and payment processing', location: 'Global (PCI-DSS certified)' },
                      ].map(row => (
                        <tr key={row.name}>
                          <td className="px-4 py-3 font-medium text-gray-900">{row.name}</td>
                          <td className="px-4 py-3 text-gray-500">{row.purpose}</td>
                          <td className="px-4 py-3 text-gray-500">{row.location}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p>
                  We evaluate third-party providers carefully and only share the minimum data required for them to perform their function. We do not use any provider that requires us to share participant health data with overseas entities for processing purposes.
                </p>
              </Section>

              <Section id="section-8" title="8. Australian Privacy Compliance">
                <p>
                  Worklyn is designed to help Australian allied health providers meet their obligations under the <em>Privacy Act 1988</em> (Cth), the Australian Privacy Principles (APPs), and the <em>Notifiable Data Breaches (NDB) scheme</em>.
                </p>
                <p>
                  Where your organisation handles health information as defined under the Privacy Act, you remain the primary data controller responsible for compliance with APP 3 (collection), APP 6 (use and disclosure), APP 11 (security), and APP 12 (access and correction). Worklyn provides the technical infrastructure to support these obligations.
                </p>
                <p>
                  If you are a registered NDIS provider, you are also subject to the NDIS Quality and Safeguards Commission&apos;s Practice Standards. Worklyn&apos;s clinical documentation and audit trail features are specifically designed to assist with these requirements.
                </p>
              </Section>

              <Section id="section-9" title="9. Your Rights">
                <p>Under the Australian Privacy Act and applicable state health records legislation, you have the right to:</p>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li><strong>Access:</strong> Request a copy of the personal information we hold about you or your organisation.</li>
                  <li><strong>Correction:</strong> Request that inaccurate or incomplete personal information be corrected.</li>
                  <li><strong>Deletion:</strong> Request deletion of your account and associated data, subject to our legal obligations to retain certain records.</li>
                  <li><strong>Portability:</strong> Export your data at any time. Worklyn provides data export functionality from within your account settings.</li>
                  <li><strong>Withdraw consent:</strong> Where processing is based on consent, you may withdraw it at any time without affecting the lawfulness of prior processing.</li>
                </ul>
                <p>
                  To exercise any of these rights, contact us at{' '}
                  <a href={`mailto:${CONTACT_EMAIL}`} className="text-brand-600 hover:underline">{CONTACT_EMAIL}</a>.
                  We will respond within 30 days.
                </p>
              </Section>

              <Section id="section-10" title="10. Data Retention">
                <p>
                  We retain your account data for the duration of your subscription and for a period of 7 years following account closure, in accordance with Australian tax and business record obligations. Clinical records within the platform are subject to the same retention period.
                </p>
                <p>
                  You may export and delete your data at any time. Following account deletion, residual backup copies are purged within 90 days.
                </p>
              </Section>

              <Section id="section-11" title="11. Changes to This Policy">
                <p>
                  We may update this Privacy Policy from time to time. When we do, we will update the &quot;Last updated&quot; date at the top of this page and, where changes are material, notify you by email or via an in-app notice. Continued use of Worklyn after changes are posted constitutes your acceptance of the updated policy.
                </p>
              </Section>

              <Section id="section-12" title="12. Contact Us">
                <p>If you have questions or concerns about this Privacy Policy or the way we handle your data, please contact us:</p>
                <div className="rounded-xl border border-gray-200 bg-white p-5 mt-4">
                  <p className="text-sm font-semibold text-gray-900">Worklyn Pty Ltd</p>
                  <p className="mt-1 text-sm text-gray-500">Australia</p>
                  <a href={`mailto:${CONTACT_EMAIL}`} className="mt-2 block text-sm text-brand-600 hover:underline">{CONTACT_EMAIL}</a>
                </div>
                <p className="mt-4">
                  You also have the right to lodge a complaint with the{' '}
                  <a href="https://www.oaic.gov.au" target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">
                    Office of the Australian Information Commissioner (OAIC)
                  </a>{' '}
                  if you believe your privacy has been breached.
                </p>
              </Section>

            </div>

            {/* Bottom nav */}
            <div className="mt-12 flex items-center justify-between border-t border-gray-200 pt-8">
              <Link href="/terms" className="text-sm font-semibold text-brand-600 hover:text-brand-700 transition-colors">
                Terms of Service →
              </Link>
              <Link href="/contact" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
                Have a question? Contact us
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <div id={id} className="scroll-mt-24 rounded-2xl border border-gray-200 bg-white p-8 shadow-sm space-y-4">
      <h2 className="text-xl font-bold text-gray-900">{title}</h2>
      <div className="space-y-4 text-sm leading-relaxed text-gray-600">{children}</div>
    </div>
  )
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return <p className="font-semibold text-gray-800 mt-4">{children}</p>
}
