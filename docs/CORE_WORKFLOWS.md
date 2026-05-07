# Core Workflows

## 1. Session Completion → Auto Invoice (STABLE — DO NOT REFACTOR)

This is the primary financial workflow. All five steps must succeed atomically from the user's perspective.

```
CompleteSessionNotesModal (UI)
  → completeSession(sessionId, notesJson)   [app/actions/sessions.ts:704]
      1. Validate structured notes (validateCompletionNotes)
      2. Update session: status=completed, notes=<json>
      3. Call autoCreateDraftInvoice(supabase, practitioner, sessionId)
          a. Fetch session (check invoice_id for idempotency)
          b. Fetch client (resolve recipient via resolveInvoiceRecipient)
          c. generateNextInvoiceNumber → INV-YYYY-NNNN
          d. INSERT into invoices (status=draft)
          e. INSERT into invoice_items (line item from session rate/duration)
          f. UPDATE sessions SET invoice_id=<new invoice id>
              WHERE id=session.id AND invoice_id IS NULL  ← idempotency guard
          g. INSERT into invoice_audit_log
      4. revalidatePath('/dashboard/sessions')
  → Returns { ok, invoiceWarning? }
      - invoiceWarning = amber banner in UI if step 3 fails
      - Session is still marked completed even if invoice creation fails
```

**DO NOT MODIFY WITHOUT TESTING the complete flow end-to-end.**

---

## 2. Manual Invoice Generation (Backup Only)

Available via "Generate Invoice" button in the Sessions table. Calls `generateInvoiceFromSessions` [app/actions/sessions.ts:571]. Uses the same `generateNextInvoiceNumber` helper. This is backup-only — the auto flow above is the primary path.

---

## 3. Session Creation

```
SessionModal (new session form)
  → createSession(formData)   [app/actions/sessions.ts:325]
      - Validates time conflicts (checkConflict)
      - If status=completed: also calls autoCreateDraftInvoice
      - Returns { ok, sessionId, invoiceWarning? }
```

---

## 4. Invoice Lifecycle

```
draft → sent → paid
              ↘ overdue
              ↘ cancelled
```

- Draft: created automatically on session completion
- Sent: practitioner clicks "Send Invoice" → email via Resend
- Paid/Overdue/Cancelled: manual status update
- All status changes are written to `invoice_audit_log`

---

## 5. Client Note Rendering

Structured notes are stored as JSON in `sessions.notes`. Two formats are supported:
- `__ndis_v1` — NDIS-specific fields (support delivered, goals, etc.)
- `__therapy_v1` — Generic therapy format

Rendered in `CompleteSessionNotesModal` via `NDISNotesFields` and `TherapyNotesFields` components. The format marker (`__ndis_v1` / `__therapy_v1`) is always the first key.
