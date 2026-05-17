import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Service — Worklyn',
  description: 'Terms governing your use of the Worklyn platform. Australian-based healthcare SaaS.',
}

const LAST_UPDATED = '17 May 2025'
const CONTACT_EMAIL = 'legal@worklyn.com.au'

export default function TermsPage() {
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
            Terms of Service
          </h1>
          <p className="mx-auto mt-5 max-w-lg text-lg leading-relaxed text-white/60">
            Please read these terms carefully before using Worklyn. By using the platform, you agree to be bound by these terms.
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
                  'Agreement and Definitions',
                  'Acceptable Use',
                  'User Accounts and Security',
                  'Provider and Healthcare Responsibilities',
                  'Subscription, Billing, and Payment',
                  'Intellectual Property',
                  'Confidentiality',
                  'Service Availability',
                  'Limitation of Liability',
                  'Indemnification',
                  'Termination',
                  'Dispute Resolution',
                  'Governing Law',
                  'Changes to These Terms',
                  'Contact',
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

              <Section id="section-1" title="1. Agreement and Definitions">
                <p>
                  These Terms of Service (&quot;Terms&quot;) form a legally binding agreement between <strong>Worklyn Pty Ltd</strong> (&quot;Worklyn&quot;, &quot;we&quot;, &quot;us&quot;) and the individual or entity (&quot;you&quot;, &quot;your&quot;, &quot;Customer&quot;) accessing or using the Worklyn platform.
                </p>
                <p>
                  &quot;Platform&quot; means the Worklyn web application and all associated services, APIs, and features. &quot;Subscription&quot; means the plan (Solo, Clinic, or Enterprise) that you have selected. &quot;User&quot; means any individual granted access to the platform under your subscription. &quot;Participant data&quot; means information about the clients or NDIS participants managed within the platform.
                </p>
                <p>
                  By creating an account, you represent that you have the authority to bind the entity you represent to these Terms, and that you and your Users will comply with them in full.
                </p>
              </Section>

              <Section id="section-2" title="2. Acceptable Use">
                <p>You agree to use Worklyn only for lawful purposes and in accordance with these Terms. You must not:</p>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>Use the platform in any way that violates applicable Australian or state law, regulation, or guideline</li>
                  <li>Enter false, inaccurate, or fraudulent participant records, invoices, or clinical notes</li>
                  <li>Attempt to gain unauthorised access to another user&apos;s account or another organisation&apos;s data</li>
                  <li>Use the platform to transmit unsolicited communications, malware, or harmful code</li>
                  <li>Reverse engineer, decompile, or attempt to extract the source code of the platform</li>
                  <li>Resell, sublicense, or provide access to the platform to third parties without our written consent</li>
                  <li>Use the platform in a way that could damage, disable, or impair the service or its infrastructure</li>
                  <li>Represent that clinical outputs from Worklyn constitute independent medical or legal advice</li>
                </ul>
                <p>
                  Worklyn reserves the right to suspend or terminate accounts that breach these acceptable use requirements without notice.
                </p>
              </Section>

              <Section id="section-3" title="3. User Accounts and Security">
                <p>
                  You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You must immediately notify Worklyn of any suspected unauthorised access at{' '}
                  <a href={`mailto:${CONTACT_EMAIL}`} className="text-brand-600 hover:underline">{CONTACT_EMAIL}</a>.
                </p>
                <p>
                  You are responsible for ensuring that all Users added to your subscription are authorised members of your organisation and comply with these Terms. You must revoke access promptly when a User&apos;s employment or engagement ends.
                </p>
                <p>
                  We strongly recommend enabling multi-factor authentication (MFA). Where your plan requires MFA, it is a condition of use. Worklyn accepts no liability for losses arising from compromised credentials.
                </p>
              </Section>

              <Section id="section-4" title="4. Provider and Healthcare Responsibilities">
                <p>
                  Worklyn is a practice management platform. It is <strong>not</strong> a clinical decision-making system, a medical record system of record, or a substitute for professional clinical judgement.
                </p>
                <p>You acknowledge and agree that:</p>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>You are solely responsible for the clinical decisions, diagnoses, treatment plans, and care outcomes for participants you support.</li>
                  <li>You are responsible for ensuring that all information entered into the platform is accurate and complies with applicable standards (including NDIS Practice Standards, the <em>Health Records Act</em>, and relevant state legislation).</li>
                  <li>You have obtained appropriate consents from participants and their representatives for the collection and processing of their data within Worklyn.</li>
                  <li>Invoices, service agreements, and clinical notes generated or facilitated by the platform must be reviewed by an authorised practitioner before being submitted to the NDIA, participants, or plan managers.</li>
                  <li>Worklyn&apos;s NDIS Price Guide integration is provided as a convenience tool. You remain responsible for verifying that the line items and rates applied to invoices are correct and compliant at the time of submission.</li>
                </ul>
              </Section>

              <Section id="section-5" title="5. Subscription, Billing, and Payment">
                <SubHeading>Trial Period</SubHeading>
                <p>
                  All new subscriptions include a 14-day free trial. No credit card is required to start a trial. At the end of the trial period, access is suspended unless you provide valid payment details and select a paid plan.
                </p>
                <SubHeading>Billing</SubHeading>
                <p>
                  Subscriptions are billed monthly or annually in Australian Dollars (AUD). Fees are charged at the beginning of each billing cycle and are non-refundable except where required by Australian Consumer Law. Prices are exclusive of GST; GST will be added where applicable.
                </p>
                <SubHeading>Plan Changes</SubHeading>
                <p>
                  You may upgrade or downgrade your subscription at any time. Upgrades take effect immediately on a pro-rata basis. Downgrades take effect at the start of the next billing cycle.
                </p>
                <SubHeading>Late Payment and Suspension</SubHeading>
                <p>
                  If payment fails, we will notify you and attempt to retry. If payment remains outstanding for more than 14 days, we may suspend access to the platform. Your data will not be deleted during a suspension period.
                </p>
                <SubHeading>Cancellation</SubHeading>
                <p>
                  You may cancel your subscription at any time. Upon cancellation, your account remains accessible until the end of the current billing period. You can export your data at any time before or after cancellation.
                </p>
              </Section>

              <Section id="section-6" title="6. Intellectual Property">
                <p>
                  The Worklyn platform — including its design, source code, features, algorithms, trademarks, and documentation — is the exclusive intellectual property of Worklyn Pty Ltd. These Terms do not grant you any ownership interest in the platform.
                </p>
                <p>
                  You grant Worklyn a limited, non-exclusive, royalty-free licence to store, process, and display your data solely for the purpose of providing the platform services to you.
                </p>
                <p>
                  Your data remains yours. Worklyn does not claim ownership of any participant records, clinical notes, invoices, or other content you create within the platform.
                </p>
              </Section>

              <Section id="section-7" title="7. Confidentiality">
                <p>
                  Each party agrees to keep confidential any non-public information disclosed by the other party in connection with these Terms. Worklyn will not disclose your data or your participants&apos; data to third parties except as required to provide the service, as described in our{' '}
                  <Link href="/privacy" className="text-brand-600 hover:underline">Privacy Policy</Link>, or as required by law.
                </p>
                <p>
                  This obligation survives termination of these Terms for a period of 3 years.
                </p>
              </Section>

              <Section id="section-8" title="8. Service Availability">
                <p>
                  Worklyn targets a high level of platform availability but does not guarantee uninterrupted or error-free service. We perform scheduled maintenance with advance notice where possible. Unplanned outages may occur.
                </p>
                <p>
                  Worklyn is not liable for any losses, data unavailability, or operational disruption arising from scheduled or unscheduled maintenance, hosting provider incidents, force majeure events, or factors outside our reasonable control.
                </p>
                <p>
                  Enterprise customers may negotiate a specific Service Level Agreement (SLA) with guaranteed uptime commitments. Contact{' '}
                  <a href="mailto:enterprise@worklyn.com.au" className="text-brand-600 hover:underline">enterprise@worklyn.com.au</a>.
                </p>
              </Section>

              <Section id="section-9" title="9. Limitation of Liability">
                <p>
                  To the maximum extent permitted by Australian law, Worklyn&apos;s total liability to you for any claim arising out of or related to these Terms or the platform will not exceed the total fees paid by you to Worklyn in the 12-month period preceding the claim.
                </p>
                <p>Worklyn is not liable for:</p>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>Indirect, consequential, incidental, or special damages of any kind</li>
                  <li>Loss of profits, revenue, business opportunity, or data</li>
                  <li>Errors or omissions in clinical documentation or invoices created by Users</li>
                  <li>NDIS claim rejections or compliance failures caused by incorrect data entry</li>
                  <li>Any harm caused by your reliance on platform outputs as a substitute for professional clinical judgement</li>
                </ul>
                <p>
                  Nothing in these Terms excludes liability that cannot be excluded under the <em>Australian Consumer Law</em>, including statutory guarantees for services supplied to consumers.
                </p>
              </Section>

              <Section id="section-10" title="10. Indemnification">
                <p>
                  You agree to indemnify, defend, and hold harmless Worklyn and its officers, directors, employees, and contractors from and against any claims, liabilities, damages, and costs (including legal fees) arising from:
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>Your breach of these Terms</li>
                  <li>Your violation of any applicable law or regulation</li>
                  <li>Your use of the platform in a manner not authorised by these Terms</li>
                  <li>Data you or your Users enter into the platform</li>
                  <li>Any third-party claim arising from your clinical or operational activities</li>
                </ul>
              </Section>

              <Section id="section-11" title="11. Termination">
                <p>
                  Either party may terminate these Terms at any time. You may terminate by cancelling your subscription as described in Section 5. Worklyn may terminate your access immediately if you materially breach these Terms, engage in fraudulent activity, or fail to make payment after the grace period.
                </p>
                <p>
                  Upon termination: (a) your access to the platform ceases; (b) you may export your data within 30 days; (c) after 30 days we may delete your data, subject to our legal retention obligations.
                </p>
                <p>
                  Sections 6 (Intellectual Property), 7 (Confidentiality), 9 (Limitation of Liability), 10 (Indemnification), and 13 (Governing Law) survive termination.
                </p>
              </Section>

              <Section id="section-12" title="12. Dispute Resolution">
                <p>
                  If a dispute arises relating to these Terms, the parties agree to first attempt resolution through good-faith negotiation. If the dispute is not resolved within 30 days of written notice, either party may escalate to mediation in accordance with the Resolution Institute Mediation Rules before commencing legal proceedings.
                </p>
              </Section>

              <Section id="section-13" title="13. Governing Law">
                <p>
                  These Terms are governed by and construed in accordance with the laws of New South Wales, Australia. The parties submit to the non-exclusive jurisdiction of the courts of New South Wales and the Federal Court of Australia.
                </p>
              </Section>

              <Section id="section-14" title="14. Changes to These Terms">
                <p>
                  We may update these Terms from time to time. Where changes are material, we will notify you by email at least 14 days before the changes take effect. Your continued use of the platform after that date constitutes acceptance of the updated Terms. If you do not agree to the revised Terms, you may cancel your subscription before the effective date.
                </p>
              </Section>

              <Section id="section-15" title="15. Contact">
                <p>
                  For questions about these Terms, to request a copy of your data, or to raise a legal concern, contact us:
                </p>
                <div className="rounded-xl border border-gray-200 bg-white p-5 mt-4">
                  <p className="text-sm font-semibold text-gray-900">Worklyn Pty Ltd — Legal</p>
                  <p className="mt-1 text-sm text-gray-500">Australia</p>
                  <a href={`mailto:${CONTACT_EMAIL}`} className="mt-2 block text-sm text-brand-600 hover:underline">{CONTACT_EMAIL}</a>
                </div>
              </Section>

            </div>

            {/* Bottom nav */}
            <div className="mt-12 flex items-center justify-between border-t border-gray-200 pt-8">
              <Link href="/privacy" className="text-sm font-semibold text-brand-600 hover:text-brand-700 transition-colors">
                ← Privacy Policy
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
