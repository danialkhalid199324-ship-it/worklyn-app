-- =============================================================================
-- Migration 023: Email automation fixes and overdue invoice tracking
--
-- 1. Fix session_notifications.type CHECK constraint.
--    The constraint created in migration 009/013 only allowed 'confirmation'
--    and 'reminder', but the codebase uses 'update', 'cancellation',
--    'reminder_24h', and 'reminder_2h'. INSERTs with those types fail the
--    constraint and are silently dropped — meaning those emails never send.
--
-- 2. Add overdue_reminder_sent_at to invoices for automated overdue email dedup.
--    The cron checks this column to avoid sending duplicate overdue reminders.
--
-- Safe to re-run (IF NOT EXISTS / DROP IF EXISTS).
-- Apply in Supabase SQL Editor.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Fix session_notifications type constraint
-- ---------------------------------------------------------------------------

ALTER TABLE public.session_notifications
  DROP CONSTRAINT IF EXISTS session_notifications_type_check;

ALTER TABLE public.session_notifications
  ADD CONSTRAINT session_notifications_type_check
  CHECK (type IN ('confirmation', 'reminder', 'update', 'cancellation', 'reminder_24h', 'reminder_2h'));

-- ---------------------------------------------------------------------------
-- 2. Overdue invoice reminder tracking
-- ---------------------------------------------------------------------------

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS overdue_reminder_sent_at TIMESTAMPTZ;
