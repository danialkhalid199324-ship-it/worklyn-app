# Session Flow

## Session Statuses
`scheduled` → `completed` | `cancelled`

---

## Creating a Session

**Entry point:** `SessionModal` → `createSession(formData)` [app/actions/sessions.ts:325]

1. Parse form data: client, service, date, start/end time, duration, rate, status, notes
2. Derive `end_time` from `start_time + duration_minutes` if blank
3. Check for scheduling conflicts (`checkConflict`) — only if start_time and end_time are present
4. INSERT into `sessions`
5. If `status === 'completed'`: call `autoCreateDraftInvoice`
6. Return `{ ok, sessionId, invoiceWarning? }`

---

## Completing a Session

**Entry point:** `CompleteSessionNotesModal` → `completeSession(sessionId, notesJson)` [app/actions/sessions.ts:704]

1. `requireAuth()` → resolve practitioner
2. Validate notes JSON via `validateCompletionNotes`
3. UPDATE session: `status=completed`, `notes=<json>`
4. Call `autoCreateDraftInvoice` → returns null (ok) or error string
5. `revalidatePath('/dashboard/sessions')`
6. Return `{ ok, invoiceWarning? }`

**If invoice creation fails:** Session is still completed. `invoiceWarning` is set. Amber banner shown in modal. Manual "Generate Invoice" remains available.

---

## Structured Notes Format

Notes are stored as JSON in `sessions.notes`. The format marker is always the first key.

**`__therapy_v1`** (generic therapy):
```json
{
  "__therapy_v1": true,
  "presenting_concerns": "...",
  "session_summary": "...",
  "interventions_used": "...",
  "client_response": "...",
  "goals_progress": "...",
  "homework_tasks": "...",
  "next_session_plan": "...",
  "risk_notes": "..."
}
```

**`__ndis_v1`** (NDIS-specific):
Support delivered, goals addressed, participant response, barriers, next steps, NDIS line item reference.

Validated by `validateCompletionNotes` [app/actions/sessions.ts:82] before save.

---

## Conflict Detection

`checkConflict` [app/actions/sessions.ts:42] — called on create and update.

Overlap condition: `existing.start_time < newEnd AND existing.end_time > newStart`
- Only `scheduled` and `completed` sessions are checked (not `cancelled`)
- Only sessions with both `start_time` and `end_time` set are compared
- Query failure does not block the save (returns null — permissive on error)

---

## Key Files

| Concern | File |
|---|---|
| Session CRUD, completion, auto-invoice | `app/actions/sessions.ts` |
| Session list page | `app/dashboard/sessions/page.tsx` |
| Session list client component | `app/dashboard/sessions/SessionsClient.tsx` |
| Complete session modal | `app/dashboard/sessions/CompleteSessionNotesModal.tsx` |
| Session create/edit modal | `app/dashboard/sessions/SessionModal.tsx` |
| Manual invoice modal | `app/dashboard/sessions/GenerateInvoiceModal.tsx` |
| NDIS note fields | `app/dashboard/sessions/NDISNotesFields.tsx` |
| Therapy note fields | `app/dashboard/sessions/TherapyNotesFields.tsx` |
