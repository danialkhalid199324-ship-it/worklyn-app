# Known Issues & Constraints

## Resolved (as of May 2026)

### Invoice Number Duplicate Key Violation (FIXED)
- **Symptom:** Auto invoice creation silently failed; session remained with no `invoice_id`.
- **Root cause:** `count()+1` strategy for generating invoice numbers produced duplicates when any invoice had been deleted (count < actual max sequence).
- **Fix:** `generateNextInvoiceNumber()` [app/actions/sessions.ts:130] — scans all `invoice_number` values matching `INV-YYYY-%`, parses numeric tails, finds the actual max, returns max+1.
- **Also fixed in:** `generateInvoiceFromSessions` (manual path).

### Session Link Silent Failure (FIXED)
- **Symptom:** Invoice was created but `sessions.invoice_id` was not set.
- **Fix:** Added `.select('id')` to the UPDATE and checked row count; rolls back invoice insert if link fails.

### PGRST116 Misuse (FIXED)
- **Symptom:** `.is('invoice_id', null).single()` returned PGRST116 (no rows) when a session already had an invoice; this was mapped to a fake "session not found" error.
- **Fix:** Removed `is('invoice_id', null)` from the fetch; check `session.invoice_id` explicitly after fetching.

---

## Active Constraints

### `getNextInvoiceNumber` in `app/actions/invoices.ts:382` Still Uses Old Logic
The exported `getNextInvoiceNumber` function still uses `count()+1`. It is **not** called by the auto-invoice or manual-from-sessions path (both use the private `generateNextInvoiceNumber` helper in `sessions.ts`). If this function is wired up elsewhere, it will produce duplicates. **Do not use it for new invoice creation.**

### Debug Logging Still Present
Temporary `console.log` statements exist in `autoCreateDraftInvoice`, `completeSession`, and `createSession` in `app/actions/sessions.ts`. Remove once the auto-invoice flow is confirmed stable.

### Migration 012 / 013 May Need Manual Execution
Supabase migrations are not applied automatically in this project. If `invoice_audit_log` or `sessions` tables are missing, run migrations 012 and 013 manually in the Supabase SQL Editor.

### Sandbox Email Override
`lib/email.ts` may contain a sandbox recipient override from development. Review before deploying to production to ensure emails reach real recipients.

### No Anthropic API Key
The AI "Generate Professional Note" feature was removed for stability. If re-enabling it, add a real `ANTHROPIC_API_KEY` to `.env.local`.
