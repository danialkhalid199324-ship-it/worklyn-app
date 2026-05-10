-- 018: session_notifications — add columns that were defined in the schema
-- but absent from the live table (originally specified in 009, recreated in 013).
-- Safe to run multiple times; IF NOT EXISTS is a no-op on existing columns.

alter table public.session_notifications
  add column if not exists recipient_name   text,
  add column if not exists recipient_email  text,
  add column if not exists error_message    text,
  add column if not exists sent_at          timestamptz;
