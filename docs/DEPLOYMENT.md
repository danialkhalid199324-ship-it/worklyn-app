# Deployment

## Environment Variables

Required in `.env.local` (dev) and the hosting platform (prod):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
NEXT_PUBLIC_APP_URL=
```

Optional (only needed if AI note generation is re-enabled):
```
ANTHROPIC_API_KEY=
```

## Database Migrations

Migrations are NOT applied automatically. Apply in order via the Supabase SQL Editor:

```
supabase/migrations/001_add_buffer_minutes.sql
supabase/migrations/002_session_notes_structured.sql
...
supabase/migrations/012_invoice_audit_log.sql   ← required for audit log
supabase/migrations/013_sessions_and_missing_columns.sql  ← required for sessions table
```

If the `sessions` or `invoice_audit_log` tables are missing, apply 013 and 012 respectively.

## Pre-Deploy Checklist

- [ ] All migrations applied in Supabase
- [ ] `RESEND_API_KEY` set (invoices/notifications require email)
- [ ] `lib/email.ts` — confirm no sandbox recipient override (`TO_OVERRIDE` or similar)
- [ ] `NEXT_PUBLIC_APP_URL` matches the production domain (used in email links)
- [ ] RLS policies active on all tables
- [ ] Test session completion → invoice auto-generation end-to-end

## Build

```bash
npm run build
```

No custom build scripts. Standard Next.js static/SSR build.
