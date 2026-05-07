# Claude Instructions — Worklyn

## Read Docs First

Before making any changes, read the relevant doc(s):

- `/docs/PROJECT_OVERVIEW.md` — architecture, stack, directory layout
- `/docs/CORE_WORKFLOWS.md` — critical workflows (session completion, auto invoice)
- `/docs/SESSION_FLOW.md` — session creation, completion, note formats
- `/docs/INVOICE_LOGIC.md` — invoice numbering, recipient routing, auto-creation
- `/docs/DATABASE_SCHEMA.md` — tables, key fields, constraints, migrations
- `/docs/KNOWN_ISSUES.md` — resolved bugs and active constraints
- `/docs/DEPLOYMENT.md` — env vars, migration checklist

Do **not** scan the entire codebase unless the task genuinely requires it. Read only the files directly related to the requested fix or feature.

---

## Minimal Targeted Changes Only

- Fix the specific thing requested. Do not refactor surrounding code.
- Do not add features while fixing bugs.
- Do not add error handling, logging, or validation beyond what the task requires.
- Do not create new abstractions unless the task explicitly calls for one.
- Do not add comments explaining what the code does — only add one if the WHY is non-obvious.

---

## Schema Changes

Do not modify the database schema unless the error clearly proves a schema issue. If a migration is needed, write it as a new numbered file in `supabase/migrations/` and instruct the user to apply it manually in the Supabase SQL Editor.

---

## Stable Workflows — Do Not Refactor Casually

The following end-to-end flow is **STABLE**. Do not change any part of it without explicit instruction and end-to-end testing:

```
Session creation
→ session completion (completeSession / createSession with status=completed)
→ structured note save (validateCompletionNotes → sessions.notes JSON)
→ draft invoice auto-generation (autoCreateDraftInvoice)
→ invoice linked to session (sessions.invoice_id)
→ invoice visible in sessions and invoices tables
```

**Manual "Generate Invoice" is backup-only.** Do not promote it to the primary path.

**Invoice numbering uses `generateNextInvoiceNumber` (max-sequence scan).** Do not replace it with `count()+1` — that breaks on deleted invoices.

---

## Key Files

| Concern | File |
|---|---|
| Session CRUD + auto-invoice | `app/actions/sessions.ts` |
| Invoice CRUD | `app/actions/invoices.ts` |
| Invoice recipient routing | `lib/invoice-routing.ts` |
| DB helpers | `lib/db.ts` |
| TypeScript types | `types/database.ts` |
| Session UI (modal, notes) | `app/dashboard/sessions/` |
| Invoice UI | `app/dashboard/invoices/` |

---

## Stale / Do Not Use

- `getNextInvoiceNumber()` in `app/actions/invoices.ts:382` — still uses `count()+1`. Do not call it from any new invoice-creation path.
