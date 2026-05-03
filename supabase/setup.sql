-- =============================================================================
-- PractitionerApp — FULL SETUP (schema + all migrations combined)
-- Paste this entire file into Supabase SQL Editor and run once.
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE throughout.
-- =============================================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- =============================================================================
-- ENUM TYPES (wrapped to avoid errors if already exist)
-- =============================================================================
do $$ begin
  create type appointment_status as enum (
    'scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type report_type as enum (
    'revenue', 'appointments', 'clients', 'invoices', 'custom'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type invoice_status as enum (
    'draft', 'sent', 'paid', 'overdue', 'cancelled'
  );
exception when duplicate_object then null;
end $$;

-- =============================================================================
-- TABLES
-- =============================================================================

-- USERS
create table if not exists public.users (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null unique,
  full_name   text,
  avatar_url  text,
  role        text not null default 'practitioner' check (role in ('practitioner', 'admin')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists users_email_idx on public.users (email);

-- PRACTITIONERS
create table if not exists public.practitioners (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null unique references public.users (id) on delete cascade,
  first_name           text not null,
  last_name            text not null,
  display_name         text,
  bio                  text,
  phone                text,
  timezone             text not null default 'UTC',
  booking_page_slug    text unique,
  is_accepting_clients boolean not null default true,
  buffer_minutes       int not null default 0 check (buffer_minutes >= 0 and buffer_minutes <= 120),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index if not exists practitioners_user_id_idx on public.practitioners (user_id);
create index if not exists practitioners_slug_idx    on public.practitioners (booking_page_slug);

-- CLIENTS
create table if not exists public.clients (
  id               uuid primary key default gen_random_uuid(),
  practitioner_id  uuid not null references public.practitioners (id) on delete cascade,
  first_name       text not null,
  last_name        text not null,
  email            text,
  phone            text,
  date_of_birth    date,
  address          text,
  notes            text,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists clients_practitioner_id_idx on public.clients (practitioner_id);
create index if not exists clients_email_idx           on public.clients (email);
create index if not exists clients_name_idx            on public.clients (last_name, first_name);

-- SERVICES
create table if not exists public.services (
  id               uuid primary key default gen_random_uuid(),
  practitioner_id  uuid not null references public.practitioners (id) on delete cascade,
  name             text not null,
  description      text,
  duration_minutes int not null default 60 check (duration_minutes > 0),
  price_cents      int not null default 0 check (price_cents >= 0),
  currency         char(3) not null default 'USD',
  color            text,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists services_practitioner_id_idx on public.services (practitioner_id);

-- AVAILABILITY RULES
create table if not exists public.availability_rules (
  id               uuid primary key default gen_random_uuid(),
  practitioner_id  uuid not null references public.practitioners (id) on delete cascade,
  day_of_week      smallint not null check (day_of_week between 0 and 6),
  start_time       time not null,
  end_time         time not null,
  check (end_time > start_time),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists availability_rules_practitioner_id_idx
  on public.availability_rules (practitioner_id);

-- BLOCKED TIMES
create table if not exists public.blocked_times (
  id               uuid primary key default gen_random_uuid(),
  practitioner_id  uuid not null references public.practitioners (id) on delete cascade,
  start_time       timestamptz not null,
  end_time         timestamptz not null,
  reason           text,
  check (end_time > start_time),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists blocked_times_practitioner_id_idx on public.blocked_times (practitioner_id);
create index if not exists blocked_times_range_idx
  on public.blocked_times (practitioner_id, start_time, end_time);

-- APPOINTMENTS
create table if not exists public.appointments (
  id               uuid primary key default gen_random_uuid(),
  practitioner_id  uuid not null references public.practitioners (id) on delete cascade,
  client_id        uuid not null references public.clients (id) on delete restrict,
  service_id       uuid references public.services (id) on delete set null,
  start_time       timestamptz not null,
  end_time         timestamptz not null,
  status           appointment_status not null default 'scheduled',
  location         text,
  client_notes     text,
  internal_notes   text,
  price_cents      int check (price_cents >= 0),
  currency         char(3) not null default 'USD',
  check (end_time > start_time),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists appointments_practitioner_id_idx on public.appointments (practitioner_id);
create index if not exists appointments_client_id_idx       on public.appointments (client_id);
create index if not exists appointments_start_time_idx      on public.appointments (practitioner_id, start_time);
create index if not exists appointments_status_idx          on public.appointments (practitioner_id, status);

-- SESSION NOTES (includes structured fields from migration 002)
create table if not exists public.session_notes (
  id                   uuid primary key default gen_random_uuid(),
  appointment_id       uuid not null references public.appointments (id) on delete cascade,
  practitioner_id      uuid not null references public.practitioners (id) on delete cascade,
  content              text not null default '',
  is_private           boolean not null default true,
  goals_addressed      text,
  observations         text,
  interventions_used   text,
  participant_response text,
  risks_issues         text,
  next_steps           text,
  progress_score       smallint check (progress_score >= 1 and progress_score <= 10),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index if not exists session_notes_appointment_id_idx on public.session_notes (appointment_id);
create index if not exists session_notes_practitioner_id_idx on public.session_notes (practitioner_id);

-- REPORTS (includes AI fields from migration 003 and pdf_path from 004)
create table if not exists public.reports (
  id               uuid primary key default gen_random_uuid(),
  practitioner_id  uuid not null references public.practitioners (id) on delete cascade,
  client_id        uuid references public.clients (id) on delete set null,
  type             report_type not null,
  title            text not null,
  period_start     date,
  period_end       date,
  data             jsonb not null default '{}',
  draft_text       text,
  final_text       text,
  pdf_path         text,
  created_at       timestamptz not null default now()
);
create index if not exists reports_practitioner_id_idx on public.reports (practitioner_id);
create index if not exists reports_type_idx            on public.reports (practitioner_id, type);
create index if not exists reports_client_id_idx       on public.reports (client_id);

-- INVOICES
create table if not exists public.invoices (
  id               uuid primary key default gen_random_uuid(),
  practitioner_id  uuid not null references public.practitioners (id) on delete cascade,
  client_id        uuid not null references public.clients (id) on delete restrict,
  appointment_id   uuid references public.appointments (id) on delete set null,
  invoice_number   text not null,
  status           invoice_status not null default 'draft',
  subtotal_cents   int not null default 0 check (subtotal_cents >= 0),
  tax_cents        int not null default 0 check (tax_cents >= 0),
  total_cents      int not null default 0 check (total_cents >= 0),
  currency         char(3) not null default 'USD',
  notes            text,
  issued_at        date,
  due_at           date,
  paid_at          timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (practitioner_id, invoice_number)
);
create index if not exists invoices_practitioner_id_idx on public.invoices (practitioner_id);
create index if not exists invoices_client_id_idx       on public.invoices (client_id);
create index if not exists invoices_status_idx          on public.invoices (practitioner_id, status);

-- INVOICE ITEMS
create table if not exists public.invoice_items (
  id               uuid primary key default gen_random_uuid(),
  invoice_id       uuid not null references public.invoices (id) on delete cascade,
  description      text not null,
  quantity         numeric(10, 2) not null default 1 check (quantity > 0),
  unit_price_cents int not null default 0 check (unit_price_cents >= 0),
  total_cents      int not null generated always as (floor(quantity * unit_price_cents)::int) stored,
  created_at       timestamptz not null default now()
);
create index if not exists invoice_items_invoice_id_idx on public.invoice_items (invoice_id);

-- =============================================================================
-- UPDATED_AT TRIGGER
-- =============================================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'users', 'practitioners', 'clients', 'services',
    'availability_rules', 'blocked_times', 'appointments',
    'session_notes', 'invoices'
  ]
  loop
    execute format(
      'create or replace trigger set_%I_updated_at
       before update on public.%I
       for each row execute function public.set_updated_at();',
      t, t
    );
  end loop;
end;
$$;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
alter table public.users              enable row level security;
alter table public.practitioners      enable row level security;
alter table public.clients            enable row level security;
alter table public.services           enable row level security;
alter table public.availability_rules enable row level security;
alter table public.blocked_times      enable row level security;
alter table public.appointments       enable row level security;
alter table public.session_notes      enable row level security;
alter table public.reports            enable row level security;
alter table public.invoices           enable row level security;
alter table public.invoice_items      enable row level security;

-- Helper function: returns current practitioner's id
create or replace function public.my_practitioner_id()
returns uuid language sql stable as $$
  select id from public.practitioners where user_id = auth.uid() limit 1;
$$;

-- Policies (drop first to allow re-runs)
do $$ begin
  drop policy if exists "users: own row"            on public.users;
  drop policy if exists "practitioners: own row"    on public.practitioners;
  drop policy if exists "clients: own"              on public.clients;
  drop policy if exists "services: own"             on public.services;
  drop policy if exists "availability_rules: own"   on public.availability_rules;
  drop policy if exists "blocked_times: own"        on public.blocked_times;
  drop policy if exists "appointments: own"         on public.appointments;
  drop policy if exists "session_notes: own"        on public.session_notes;
  drop policy if exists "reports: own"              on public.reports;
  drop policy if exists "invoices: own"             on public.invoices;
  drop policy if exists "invoice_items: own"        on public.invoice_items;
  -- public booking read policies
  drop policy if exists "practitioners: public read" on public.practitioners;
  drop policy if exists "services: public read"      on public.services;
  drop policy if exists "availability_rules: public read" on public.availability_rules;
  drop policy if exists "blocked_times: public read" on public.blocked_times;
  drop policy if exists "appointments: public read"  on public.appointments;
end $$;

-- Authenticated practitioner policies
create policy "users: own row"
  on public.users for all using (auth.uid() = id);

create policy "practitioners: own row"
  on public.practitioners for all using (auth.uid() = user_id);

create policy "clients: own"
  on public.clients for all using (practitioner_id = public.my_practitioner_id());

create policy "services: own"
  on public.services for all using (practitioner_id = public.my_practitioner_id());

create policy "availability_rules: own"
  on public.availability_rules for all using (practitioner_id = public.my_practitioner_id());

create policy "blocked_times: own"
  on public.blocked_times for all using (practitioner_id = public.my_practitioner_id());

create policy "appointments: own"
  on public.appointments for all using (practitioner_id = public.my_practitioner_id());

create policy "session_notes: own"
  on public.session_notes for all using (practitioner_id = public.my_practitioner_id());

create policy "reports: own"
  on public.reports for all using (practitioner_id = public.my_practitioner_id());

create policy "invoices: own"
  on public.invoices for all using (practitioner_id = public.my_practitioner_id());

create policy "invoice_items: own"
  on public.invoice_items for all using (
    invoice_id in (
      select id from public.invoices where practitioner_id = public.my_practitioner_id()
    )
  );

-- Public booking: anon users can read these tables to display the booking page
-- (writes go through the admin/service-role client in the server action)
create policy "practitioners: public read"
  on public.practitioners for select using (true);

create policy "services: public read"
  on public.services for select using (is_active = true);

create policy "availability_rules: public read"
  on public.availability_rules for select using (true);

create policy "blocked_times: public read"
  on public.blocked_times for select using (true);

create policy "appointments: public read"
  on public.appointments for select using (true);

-- =============================================================================
-- STORAGE BUCKET for report PDFs
-- =============================================================================
insert into storage.buckets (id, name, public)
values ('reports', 'reports', false)
on conflict (id) do nothing;
