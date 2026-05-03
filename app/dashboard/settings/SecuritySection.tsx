'use client'

import { useState, useTransition, useRef } from 'react'
import Card from '@/components/ui/Card'
import {
  startTotpEnrollment,
  verifyTotpEnrollment,
  disableMfa,
  type TotpEnrollData,
} from '@/app/actions/mfa'

interface Props {
  initialEnabled: boolean
  initialFactorId: string | null
}

// ── Shared input style ─────────────────────────────────────────────────────────
const CODE_INPUT =
  'mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-center font-mono text-lg tracking-[0.4em] shadow-sm placeholder:text-gray-300 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400 disabled:opacity-60'

// ── Sub-views ──────────────────────────────────────────────────────────────────
type View = 'idle' | 'enrolling' | 'confirming-disable'

export default function SecuritySection({ initialEnabled, initialFactorId }: Props) {
  const [view, setView] = useState<View>('idle')
  const [enabled, setEnabled] = useState(initialEnabled)
  const [factorId, setFactorId] = useState<string | null>(initialFactorId)

  // Enrollment state
  const [enrollData, setEnrollData] = useState<TotpEnrollData | null>(null)
  const [enrollCode, setEnrollCode] = useState('')
  const [enrollMsg, setEnrollMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [enrollPending, startEnrollTransition] = useTransition()

  // Disable state
  const [disableCode, setDisableCode] = useState('')
  const [disableMsg, setDisableMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [disablePending, startDisableTransition] = useTransition()

  const enrollCodeRef = useRef<HTMLInputElement>(null)
  const disableCodeRef = useRef<HTMLInputElement>(null)

  // ── Start enrollment ─────────────────────────────────────────────────────────
  function handleStartEnroll() {
    setEnrollMsg(null)
    setEnrollCode('')
    setEnrollData(null)
    startEnrollTransition(async () => {
      const result = await startTotpEnrollment()
      if ('error' in result) {
        setEnrollMsg({ ok: false, text: result.error })
      } else {
        setEnrollData(result)
        setView('enrolling')
        requestAnimationFrame(() => enrollCodeRef.current?.focus())
      }
    })
  }

  // ── Verify enrollment code ───────────────────────────────────────────────────
  function handleVerifyEnrollment(e: React.FormEvent) {
    e.preventDefault()
    if (!enrollData || enrollCode.length !== 6 || enrollPending) return
    setEnrollMsg(null)
    startEnrollTransition(async () => {
      const result = await verifyTotpEnrollment(enrollData.factorId, enrollCode)
      if ('error' in result) {
        setEnrollMsg({ ok: false, text: result.error })
        setEnrollCode('')
        requestAnimationFrame(() => enrollCodeRef.current?.focus())
      } else {
        setFactorId(enrollData.factorId)
        setEnabled(true)
        setView('idle')
        setEnrollData(null)
        setEnrollCode('')
        setEnrollMsg({ ok: true, text: '2FA enabled successfully.' })
      }
    })
  }

  // ── Start disable flow ───────────────────────────────────────────────────────
  function handleStartDisable() {
    setDisableMsg(null)
    setDisableCode('')
    setView('confirming-disable')
    requestAnimationFrame(() => disableCodeRef.current?.focus())
  }

  // ── Confirm disable ──────────────────────────────────────────────────────────
  function handleConfirmDisable(e: React.FormEvent) {
    e.preventDefault()
    if (!factorId || disableCode.length !== 6 || disablePending) return
    setDisableMsg(null)
    startDisableTransition(async () => {
      const result = await disableMfa(factorId, disableCode)
      if ('error' in result) {
        setDisableMsg({ ok: false, text: result.error })
        setDisableCode('')
        requestAnimationFrame(() => disableCodeRef.current?.focus())
      } else {
        setEnabled(false)
        setFactorId(null)
        setView('idle')
        setDisableCode('')
        setDisableMsg({ ok: true, text: '2FA has been disabled.' })
      }
    })
  }

  // ── Cancel any in-progress flow ──────────────────────────────────────────────
  function handleCancel() {
    setView('idle')
    setEnrollData(null)
    setEnrollCode('')
    setEnrollMsg(null)
    setDisableCode('')
    setDisableMsg(null)
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <Card>
      <h2 className="mb-1 font-semibold text-gray-900">Security</h2>
      <p className="mb-6 text-sm text-gray-500">
        Manage your account security settings.
      </p>

      {/* ── Idle: status row ── */}
      {view === 'idle' && (
        <div className="rounded-xl border border-gray-100 p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              {/* Shield icon */}
              <div
                className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                  enabled ? 'bg-green-50' : 'bg-gray-100'
                }`}
              >
                <svg
                  className={`h-5 w-5 ${enabled ? 'text-green-600' : 'text-gray-400'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.75}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-900">
                  Two-factor authentication (2FA)
                </p>
                <p className="mt-0.5 text-sm text-gray-500">
                  {enabled
                    ? 'Your account is protected with an authenticator app.'
                    : 'Add an extra layer of security by requiring a code from your authenticator app.'}
                </p>
                {enabled && (
                  <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Enabled
                  </span>
                )}
              </div>
            </div>

            {/* Action button */}
            <div className="shrink-0">
              {enabled ? (
                <button
                  onClick={handleStartDisable}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                >
                  Disable
                </button>
              ) : (
                <button
                  onClick={handleStartEnroll}
                  disabled={enrollPending}
                  className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
                >
                  {enrollPending ? 'Starting…' : 'Enable 2FA'}
                </button>
              )}
            </div>
          </div>

          {/* Inline success / error after idle state changes */}
          {(enrollMsg || disableMsg) && (
            <p
              className={`mt-3 text-sm ${
                (enrollMsg ?? disableMsg)!.ok ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {(enrollMsg ?? disableMsg)!.text}
            </p>
          )}
        </div>
      )}

      {/* ── Enrolling: QR code + verification ── */}
      {view === 'enrolling' && enrollData && (
        <div className="space-y-6">
          {/* Step 1: Scan */}
          <div>
            <p className="mb-3 text-sm font-medium text-gray-700">
              Step 1 — Scan this QR code with your authenticator app
            </p>
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
              {/* QR code — Supabase returns a data:image/svg+xml URI */}
              <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={enrollData.qrCode}
                  alt="2FA QR code"
                  width={160}
                  height={160}
                  className="block"
                />
              </div>
              <div className="flex-1 space-y-2">
                <p className="text-sm text-gray-500">
                  Works with Google Authenticator, Microsoft Authenticator, Authy,
                  and any TOTP-compatible app.
                </p>
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">
                    Or enter the key manually
                  </p>
                  <code className="inline-block rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 font-mono text-sm tracking-widest text-gray-800 select-all">
                    {enrollData.secret.match(/.{1,4}/g)?.join(' ') ?? enrollData.secret}
                  </code>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2: Verify */}
          <form onSubmit={handleVerifyEnrollment}>
            <p className="mb-3 text-sm font-medium text-gray-700">
              Step 2 — Enter the 6-digit code from your app
            </p>
            <div className="flex items-center gap-3">
              <input
                ref={enrollCodeRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="one-time-code"
                maxLength={6}
                required
                disabled={enrollPending}
                value={enrollCode}
                onChange={(e) =>
                  setEnrollCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                }
                placeholder="000000"
                className={`${CODE_INPUT} max-w-[160px]`}
              />
              <button
                type="submit"
                disabled={enrollPending || enrollCode.length !== 6}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
              >
                {enrollPending ? 'Verifying…' : 'Verify & enable'}
              </button>
            </div>

            {enrollMsg && (
              <p
                className={`mt-2 text-sm ${enrollMsg.ok ? 'text-green-600' : 'text-red-600'}`}
              >
                {enrollMsg.text}
              </p>
            )}
          </form>

          <button
            onClick={handleCancel}
            className="text-sm text-gray-400 hover:text-gray-600"
          >
            Cancel
          </button>
        </div>
      )}

      {/* ── Confirming disable ── */}
      {view === 'confirming-disable' && (
        <div className="rounded-xl border border-red-100 bg-red-50 p-5">
          <p className="mb-1 text-sm font-medium text-gray-900">
            Disable two-factor authentication
          </p>
          <p className="mb-4 text-sm text-gray-500">
            Enter the current 6-digit code from your authenticator app to confirm.
          </p>

          <form onSubmit={handleConfirmDisable} className="flex items-center gap-3">
            <input
              ref={disableCodeRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="one-time-code"
              maxLength={6}
              required
              disabled={disablePending}
              value={disableCode}
              onChange={(e) =>
                setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))
              }
              placeholder="000000"
              className={`${CODE_INPUT} max-w-[160px]`}
            />
            <button
              type="submit"
              disabled={disablePending || disableCode.length !== 6}
              className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
            >
              {disablePending ? 'Disabling…' : 'Confirm disable'}
            </button>
          </form>

          {disableMsg && (
            <p
              className={`mt-2 text-sm ${disableMsg.ok ? 'text-green-600' : 'text-red-600'}`}
            >
              {disableMsg.text}
            </p>
          )}

          <button
            onClick={handleCancel}
            className="mt-3 text-sm text-gray-400 hover:text-gray-600"
          >
            Cancel
          </button>
        </div>
      )}
    </Card>
  )
}
