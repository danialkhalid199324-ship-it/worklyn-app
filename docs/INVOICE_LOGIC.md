# Invoice Logic

## Invoice Number Generation

**Function:** `generateNextInvoiceNumber(supabase, practitionerId)` — `app/actions/sessions.ts:130`

**Format:** `INV-YYYY-NNNN` (e.g. `INV-2026-0042`)

**Algorithm:**
1. Query all `invoice_number` values for the practitioner matching `INV-<year>-%`
2. Parse the numeric tail of each
3. Find the maximum (`maxSeq`)
4. Return `INV-<year>-<maxSeq+1>` padded to 4 digits

**Why not `count()+1`:** Deleted invoices leave gaps between `count` and the actual max sequence, causing duplicate key violations against the `invoices_practitioner_id_invoice_number_key` unique constraint.

> **DO NOT replace this with count()+1 or any other shortcut.**

---

## Auto Invoice Creation

**Function:** `autoCreateDraftInvoice(supabase, practitioner, sessionId)` — `app/actions/sessions.ts:158`

**Called from:**
- `completeSession` [line ~704] — when marking an existing session as completed
- `createSession` [line ~325] — when a new session is created directly with `status=completed`

**Steps:**
1. Fetch session (no invoice_id filter — check explicitly for idempotency)
2. Return `null` (success/no-op) if `session.invoice_id` is already set
3. Fetch client → `resolveInvoiceRecipient` to determine billing target
4. `generateNextInvoiceNumber` → unique invoice number
5. INSERT into `invoices` (status=draft)
6. INSERT into `invoice_items` (single line item)
7. UPDATE `sessions SET invoice_id=<id> WHERE id=session.id AND invoice_id IS NULL`
   - If 0 rows updated → concurrent creation; DELETE the just-inserted invoice and return null
   - If update error → DELETE invoice and return error string
8. INSERT into `invoice_audit_log`
9. Return `null` (success) or error string

**Failure behaviour:** Returns an error string. The session is still marked completed. The UI shows an amber `invoiceWarning` banner. Manual "Generate Invoice" is available as fallback.

---

## Invoice Recipient Resolution

**Function:** `resolveInvoiceRecipient(client)` — `lib/invoice-routing.ts`

| Funding Type | Management Type | Recipient |
|---|---|---|
| NDIS | Plan-managed | Plan manager (name/email/phone) |
| NDIS | Self-managed | Self manager |
| NDIS | NDIA-managed | NDIA claim (no email) |
| Medicare / Private | — | Client directly |

---

## Manual Invoice Generation (Backup)

**Function:** `generateInvoiceFromSessions(formData)` — `app/actions/sessions.ts:571`

Uses the same `generateNextInvoiceNumber` helper. Accepts a `sessionIds` list and creates one invoice covering multiple sessions. Available via the "Generate Invoice" button in the Sessions table. This is the fallback path only — the auto-creation path is primary.

---

## Stale Function — Do Not Use

`getNextInvoiceNumber(practitionerId)` in `app/actions/invoices.ts:382` still uses `count()+1`. It is not called by any current invoice-creation path. Do not wire it up to any new code.
