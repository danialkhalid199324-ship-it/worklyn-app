-- =============================================================================
-- PractitionerApp — Supabase Schema
-- Run this in your Supabase SQL editor (Dashboard → SQL Editor → New query)
-- =============================================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- =============================================================================
-- USERS
-- Mirrors auth.users (Supabase Auth). We keep a profile table for extra fields.
-- =============================================================================
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

-- =============================================================================
-- PRACTITIONERS
-- Extended profile for practitioners (linked 1-to-1 with users).
-- =============================================================================
create table if not exists public.practitioners (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null unique references public.users (id) on delete cascade,
  first_name          text not null,
  last_name           text not null,
  display_name        text,
  bio                 text,
  phone               text,
  timezone            text not null default 'UTC',
  booking_page_slug   text unique,
  is_accepting_clients boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists practitioners_user_id_idx on public.practitioners (user_id);
create index if not exists practitioners_slug_idx    on public.practitioners (booking_page_slug);

-- =============================================================================
-- CLIENTS
-- =============================================================================
create table if not exists public.clients (
  id                uuid primary key default gen_random_uuid(),
  practitioner_id   uuid not null references public.practitioners (id) on delete cascade,
  first_name        text not null,
  last_name         text not null,
  email             text,
  phone             text,
  date_of_birth     date,
  address           text,
  notes             text,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists clients_practitioner_id_idx on public.clients (practitioner_id);
create index if not exists clients_email_idx           on public.clients (email);
create index if not exists clients_name_idx            on public.clients (last_name, first_name);

-- =============================================================================
-- SERVICES
-- =============================================================================
create table if not exists public.services (
  id                  uuid primary key default gen_random_uuid(),
  practitioner_id     uuid not null references public.practitioners (id) on delete cascade,
  name                text not null,
  description         text,
  duration_minutes    int not null default 60 check (duration_minutes > 0),
  price_cents         int not null default 0 check (price_cents >= 0),
  currency            char(3) not null default 'USD',
  color               text,
  is_active           boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists services_practitioner_id_idx on public.services (practitioner_id);

-- =============================================================================
-- AVAILABILITY RULES
-- Recurring weekly availability windows per practitioner.
-- =============================================================================
create table if not exists public.availability_rules (
  id               uuid primary key default gen_random_uuid(),
  practitioner_id  uuid not null references public.practitioners (id) on delete cascade,
  day_of_week      smallint not null check (day_of_week between 0 and 6),  -- 0=Sun … 6=Sat
  start_time       time not null,
  end_time         time not null,
  check (end_time > start_time),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists availability_rules_practitioner_id_idx
  on public.availability_rules (practitioner_id);

-- =============================================================================
-- BLOCKED TIMES
-- One-off blocks (holidays, personal time off, etc.)
-- =============================================================================
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

-- =============================================================================
-- APPOINTMENTS
-- =============================================================================
create type appointment_status as enum (
  'scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'
);

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

create index if not exists appointments_practitioner_id_idx
  on public.appointments (practitioner_id);
create index if not exists appointments_client_id_idx
  on public.appointments (client_id);
create index if not exists appointments_start_time_idx
  on public.appointments (practitioner_id, start_time);
create index if not exists appointments_status_idx
  on public.appointments (practitioner_id, status);

-- =============================================================================
-- SESSION NOTES
-- =============================================================================
create table if not exists public.session_notes (
  id               uuid primary key default gen_random_uuid(),
  appointment_id   uuid not null references public.appointments (id) on delete cascade,
  practitioner_id  uuid not null references public.practitioners (id) on delete cascade,
  content          text not null,
  is_private       boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists session_notes_appointment_id_idx
  on public.session_notes (appointment_id);
create index if not exists session_notes_practitioner_id_idx
  on public.session_notes (practitioner_id);

-- =============================================================================
-- REPORTS
-- Persisted/generated report snapshots.
-- =============================================================================
create type report_type as enum (
  'revenue', 'appointments', 'clients', 'invoices', 'custom'
);

create table if not exists public.reports (
  id               uuid primary key default gen_random_uuid(),
  practitioner_id  uuid not null references public.practitioners (id) on delete cascade,
  type             report_type not null,
  title            text not null,
  period_start     date,
  period_end       date,
  data             jsonb not null default '{}',
  created_at       timestamptz not null default now()
);

create index if not exists reports_practitioner_id_idx
  on public.reports (practitioner_id);
create index if not exists reports_type_idx
  on public.reports (practitioner_id, type);

-- =============================================================================
-- INVOICES
-- =============================================================================
create type invoice_status as enum (
  'draft', 'sent', 'paid', 'overdue', 'cancelled'
);

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

-- =============================================================================
-- INVOICE ITEMS
-- =============================================================================
create table if not exists public.invoice_items (
  id            uuid primary key default gen_random_uuid(),
  invoice_id    uuid not null references public.invoices (id) on delete cascade,
  description   text not null,
  quantity      numeric(10, 2) not null default 1 check (quantity > 0),
  unit_price_cents int not null default 0 check (unit_price_cents >= 0),
  total_cents   int not null generated always as
                  (floor(quantity * unit_price_cents)::int) stored,
  created_at    timestamptz not null default now()
);

create index if not exists invoice_items_invoice_id_idx on public.invoice_items (invoice_id);

-- =============================================================================
-- UPDATED_AT TRIGGER
-- Automatically keeps updated_at current for all tables.
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
-- ROW LEVEL SECURITY (RLS)
-- Practitioners can only see their own data.
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

-- users: own row only
create policy "users: own row" on public.users
  for all using (auth.uid() = id);

-- practitioners: own row only
create policy "practitioners: own row" on public.practitioners
  for all using (auth.uid() = user_id);

-- helper to get the practitioner id for the current user
create or replace function public.my_practitioner_id()
returns uuid language sql stable as $$
  select id from public.practitioners where user_id = auth.uid() limit 1;
$$;

-- clients, services, availability_rules, blocked_times, appointments,
-- session_notes, reports, invoices — scoped to own practitioner_id
create policy "clients: own"            on public.clients
  for all using (practitioner_id = public.my_practitioner_id());

create policy "services: own"           on public.services
  for all using (practitioner_id = public.my_practitioner_id());

create policy "availability_rules: own" on public.availability_rules
  for all using (practitioner_id = public.my_practitioner_id());

create policy "blocked_times: own"      on public.blocked_times
  for all using (practitioner_id = public.my_practitioner_id());

create policy "appointments: own"       on public.appointments
  for all using (practitioner_id = public.my_practitioner_id());

create policy "session_notes: own"      on public.session_notes
  for all using (practitioner_id = public.my_practitioner_id());

create policy "reports: own"            on public.reports
  for all using (practitioner_id = public.my_practitioner_id());

create policy "invoices: own"           on public.invoices
  for all using (practitioner_id = public.my_practitioner_id());

-- invoice_items: accessible if parent invoice belongs to practitioner
create policy "invoice_items: own"      on public.invoice_items
  for all using (
    invoice_id in (
      select id from public.invoices where practitioner_id = public.my_practitioner_id()
    )
  );
