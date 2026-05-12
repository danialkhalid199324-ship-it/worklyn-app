-- =============================================================================
-- Migration 024: Invoice reconciliation columns — complete catch-up
--
-- Adds every invoice column that exists in types/database.ts but may be
-- missing from the live database. All statements use ADD COLUMN IF NOT EXISTS,
-- making this fully safe to run against any state of the database, including
-- instances where some of these columns were already added by earlier
-- migrations (019, 013, 023).
--
-- Columns covered:
--   Recipient routing    (originally migration 008 / 013 catch-up)
--   Payment tracking     (originally migration 019)
--   Overdue reminder     (originally migration 023)
--
-- Safe for existing production data:
--   - All columns are nullable with no DEFAULT — zero impact on existing rows.
--   - No existing columns are modified or dropped.
--   - No constraints are changed on existing columns.
--   - The session_notifications CHECK fix is included here so this single
--     file fully resolves the schema cache error reported in production.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Invoice recipient routing fields
--    (needed by invoice-routing.ts and the invoice detail UI)
-- ---------------------------------------------------------------------------

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS recipient_type  TEXT
    CHECK (recipient_type IN ('client', 'plan_manager', 'self_manager', 'ndia_claim')),
  ADD COLUMN IF NOT EXISTS recipient_name  TEXT,
  ADD COLUMN IF NOT EXISTS recipient_email TEXT,
  ADD COLUMN IF NOT EXISTS recipient_phone TEXT,
  ADD COLUMN IF NOT EXISTS billing_note    TEXT;

-- ---------------------------------------------------------------------------
-- 2. Invoice send / payment tracking fields
--    (needed by sendInvoice, markAsPaid, updatePaymentDetails)
-- ---------------------------------------------------------------------------

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS invoice_sent_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_reference     TEXT,
  ADD COLUMN IF NOT EXISTS payment_notes         TEXT,
  ADD COLUMN IF NOT EXISTS remittance_received_at TIMESTAMPTZ;

-- ---------------------------------------------------------------------------
-- 3. Overdue reminder tracking field
--    (needed by /api/reminders/send cron to prevent duplicate reminders)
-- ---------------------------------------------------------------------------

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS overdue_reminder_sent_at TIMESTAMPTZ;

-- ---------------------------------------------------------------------------
-- 4. Fix session_notifications type CHECK constraint
--    The original constraint only allowed 'confirmation' and 'reminder'.
--    The codebase also uses 'update', 'cancellation', 'reminder_24h',
--    'reminder_2h'. Without this fix those INSERTs fail silently and the
--    emails are never sent.
-- ---------------------------------------------------------------------------

ALTER TABLE public.session_notifications
  DROP CONSTRAINT IF EXISTS session_notifications_type_check;

ALTER TABLE public.session_notifications
  ADD CONSTRAINT session_notifications_type_check
  CHECK (type IN ('confirmation', 'reminder', 'update', 'cancellation', 'reminder_24h', 'reminder_2h'));
