-- 009: session_notifications
-- Tracks confirmation and reminder emails sent for sessions.
-- Run in Supabase SQL Editor → New query.

create table if not exists public.session_notifications (
  id               uuid primary key default gen_random_uuid(),
  practitioner_id  uuid not null references public.practitioners (id) on delete cascade,
  session_id       uuid not null references public.sessions (id) on delete cascade,
  type             text not null check (type in ('confirmation', 'reminder')),
  recipient_name   text,
  recipient_email  text,              -- null when no email address is known
  status           text not null default 'pending'
                       check (status in ('pending', 'sent', 'failed')),
  error_message    text,
  sent_at          timestamptz,
  created_at       timestamptz not null default now()
);

create index if not exists session_notifications_session_id_idx
  on public.session_notifications (session_id);

create index if not exists session_notifications_practitioner_id_idx
  on public.session_notifications (practitioner_id);

alter table public.session_notifications enable row level security;

create policy "session_notifications: own"
  on public.session_notifications
  for all using (practitioner_id = public.my_practitioner_id());
