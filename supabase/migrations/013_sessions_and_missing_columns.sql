-- =============================================================================
-- Migration 013: sessions table + all missing columns
-- Run in Supabase SQL Editor. Safe to re-run (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- SESSION STATUS ENUM (needed for sessions table)
-- ---------------------------------------------------------------------------
do $$ begin
  create type session_status as enum ('scheduled', 'completed', 'cancelled');
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- SESSIONS TABLE
-- Core billing/session record (separate from appointments calendar).
-- ---------------------------------------------------------------------------
create table if not exists public.sessions (
  id               uuid primary key default gen_random_uuid(),
  practitioner_id  uuid not null references public.practitioners (id) on delete cascade,
  client_id        uuid not null references public.clients (id) on delete restrict,
  appointment_id   uuid references public.appointments (id) on delete set null,
  service_id       uuid references public.services (id) on delete set null,
  service_date     date not null,
  start_time       time,
  end_time         time,
  duration_minutes int not null check (duration_minutes > 0),
  ndis_line_item   text,
  rate             numeric(10, 2) not null check (rate >= 0),
  notes            text,
  status           text not null default 'scheduled'
                     check (status in ('scheduled', 'completed', 'cancelled')),
  invoice_id       uuid references public.invoices (id) on delete set null,
  notes_locked_at  timestamptz,
  notes_locked_by  text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists sessions_practitioner_id_idx on public.sessions (practitioner_id);
create index if not exists sessions_client_id_idx       on public.sessions (client_id);
create index if not exists sessions_service_date_idx    on public.sessions (practitioner_id, service_date);
create index if not exists sessions_invoice_id_idx      on public.sessions (invoice_id);

-- updated_at trigger for sessions
create or replace trigger set_sessions_updated_at
  before update on public.sessions
  for each row execute function public.set_updated_at();

-- RLS for sessions
alter table public.sessions enable row level security;

do $$ begin
  drop policy if exists "sessions: own" on public.sessions;
exception when undefined_object then null;
end $$;

create policy "sessions: own"
  on public.sessions for all
  using (practitioner_id = public.my_practitioner_id());

-- ---------------------------------------------------------------------------
-- Add invoice_id to sessions if it was created without it
-- (safe no-op if column already exists from CREATE TABLE above)
-- ---------------------------------------------------------------------------
alter table public.sessions
  add column if not exists invoice_id      uuid references public.invoices (id) on delete set null,
  add column if not exists notes_locked_at timestamptz,
  add column if not exists notes_locked_by text;

-- ---------------------------------------------------------------------------
-- INVOICES: add recipient routing columns (migration 008)
-- ---------------------------------------------------------------------------
alter table public.invoices
  add column if not exists recipient_type  text
    check (recipient_type in ('client', 'plan_manager', 'self_manager', 'ndia_claim')),
  add column if not exists recipient_name  text,
  add column if not exists recipient_email text,
  add column if not exists recipient_phone text,
  add column if not exists billing_note    text;

-- ---------------------------------------------------------------------------
-- CLIENTS: add funding/NDIS fields (migrations 005, 006, 007)
-- ---------------------------------------------------------------------------
alter table public.clients
  add column if not exists funding_type          text
    check (funding_type in ('NDIS', 'Medicare', 'Private / Other')),
  add column if not exists ndis_number           text,
  add column if not exists ndis_management_type  text
    check (ndis_management_type in ('NDIA-managed', 'Self-managed', 'Plan-managed')),
  add column if not exists self_manager_name     text,
  add column if not exists self_manager_relation text,
  add column if not exists self_manager_email    text,
  add column if not exists self_manager_phone    text,
  add column if not exists plan_manager_name     text,
  add column if not exists plan_manager_email    text,
  add column if not exists plan_manager_phone    text,
  add column if not exists medicare_number       text;

-- ---------------------------------------------------------------------------
-- SERVICES: add NDIS catalogue fields (migration 011)
-- ---------------------------------------------------------------------------
alter table public.services
  add column if not exists category              text,
  add column if not exists ndis_line_item        text,
  add column if not exists support_item_number   text,
  add column if not exists default_rate          numeric(10, 2),
  add column if not exists weekday_rate          numeric(10, 2),
  add column if not exists saturday_rate         numeric(10, 2),
  add column if not exists sunday_rate           numeric(10, 2),
  add column if not exists public_holiday_rate   numeric(10, 2),
  add column if not exists unit_type             text not null default 'hourly'
    check (unit_type in ('hourly', 'session', 'fixed')),
  add column if not exists gst_applicable        boolean not null default false;

-- ---------------------------------------------------------------------------
-- PRACTITIONERS: buffer_minutes (migration 001)
-- ---------------------------------------------------------------------------
alter table public.practitioners
  add column if not exists buffer_minutes int not null default 0
    check (buffer_minutes >= 0 and buffer_minutes <= 120);

-- ---------------------------------------------------------------------------
-- REPORTS: AI fields and pdf_path (migrations 003, 004)
-- ---------------------------------------------------------------------------
alter table public.reports
  add column if not exists client_id   uuid references public.clients (id) on delete set null,
  add column if not exists draft_text  text,
  add column if not exists final_text  text,
  add column if not exists pdf_path    text;

-- ---------------------------------------------------------------------------
-- SESSION NOTIFICATIONS TABLE (migration 009)
-- ---------------------------------------------------------------------------
create table if not exists public.session_notifications (
  id               uuid primary key default gen_random_uuid(),
  practitioner_id  uuid not null references public.practitioners (id) on delete cascade,
  session_id       uuid not null references public.sessions (id) on delete cascade,
  type             text not null check (type in ('confirmation', 'reminder')),
  recipient_name   text,
  recipient_email  text,
  status           text not null default 'pending'
                     check (status in ('pending', 'sent', 'failed')),
  error_message    text,
  sent_at          timestamptz,
  created_at       timestamptz not null default now()
);

create index if not exists session_notifications_practitioner_id_idx
  on public.session_notifications (practitioner_id);
create index if not exists session_notifications_session_id_idx
  on public.session_notifications (session_id);

alter table public.session_notifications enable row level security;

do $$ begin
  drop policy if exists "session_notifications: own" on public.session_notifications;
exception when undefined_object then null;
end $$;

create policy "session_notifications: own"
  on public.session_notifications for all
  using (practitioner_id = public.my_practitioner_id());

-- ---------------------------------------------------------------------------
-- ORG SETTINGS TABLE
-- ---------------------------------------------------------------------------
create table if not exists public.org_settings (
  id                       uuid primary key default gen_random_uuid(),
  practitioner_id          uuid not null unique references public.practitioners (id) on delete cascade,
  business_name            text,
  abn                      text,
  bank_account_name        text,
  bsb                      text,
  account_number           text,
  payment_reference_prefix text,
  logo_url                 text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index if not exists org_settings_practitioner_id_idx on public.org_settings (practitioner_id);

create or replace trigger set_org_settings_updated_at
  before update on public.org_settings
  for each row execute function public.set_updated_at();

alter table public.org_settings enable row level security;

do $$ begin
  drop policy if exists "org_settings: own" on public.org_settings;
exception when undefined_object then null;
end $$;

create policy "org_settings: own"
  on public.org_settings for all
  using (practitioner_id = public.my_practitioner_id());

-- ---------------------------------------------------------------------------
-- NDIS PRICE GUIDE TABLE (migration 011)
-- ---------------------------------------------------------------------------
create table if not exists public.ndis_price_guide (
  id                  uuid primary key default gen_random_uuid(),
  support_item_number text not null,
  support_item_name   text not null,
  support_category    text not null,
  unit                text not null,
  weekday_rate        numeric(10, 2),
  saturday_rate       numeric(10, 2),
  sunday_rate         numeric(10, 2),
  public_holiday_rate numeric(10, 2),
  effective_from      date not null,
  effective_to        date,
  source_version      text not null,
  created_at          timestamptz not null default now()
);

create index if not exists ndis_price_guide_item_number_idx
  on public.ndis_price_guide (support_item_number);
