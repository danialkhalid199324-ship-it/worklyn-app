-- Funding allocation tracking layer.
-- Invoices and sessions remain the financial source of truth.
-- These columns (used_amount, remaining_amount, utilisation_percentage) are
-- recomputed from invoice_items/sessions after every invoice event — never
-- edited directly by users.

create table if not exists client_funding_allocations (
  id                     uuid primary key default gen_random_uuid(),
  practitioner_id        uuid not null references practitioners(id) on delete cascade,
  client_id              uuid not null references clients(id) on delete cascade,
  plan_name              text not null,
  funding_type           text not null,
  management_type        text,
  support_category       text,
  service_category       text,
  ndis_line_item         text,
  plan_start_date        date not null,
  plan_end_date          date not null,
  allocated_amount       integer not null default 0,      -- cents
  used_amount            integer not null default 0,      -- cents; recomputed from invoices
  remaining_amount       integer not null default 0,      -- cents; = allocated - used
  utilisation_percentage numeric(6,2) not null default 0, -- 0.00–100.00+
  is_active              boolean not null default true,
  notes                  text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- Prevent duplicate plan periods for the same client
create unique index if not exists cfa_client_plan_start_uniq
  on client_funding_allocations(client_id, plan_start_date);

-- Indexes
create index if not exists idx_cfa_practitioner_id
  on client_funding_allocations(practitioner_id);

create index if not exists idx_cfa_client_active
  on client_funding_allocations(client_id, is_active);

create index if not exists idx_cfa_plan_dates
  on client_funding_allocations(plan_start_date, plan_end_date);

-- updated_at trigger (reuses the public.set_updated_at() function from migration 013)
create trigger cfa_set_updated_at
  before update on client_funding_allocations
  for each row execute function public.set_updated_at();

-- RLS
alter table client_funding_allocations enable row level security;

create policy "practitioner_owns_allocation"
  on client_funding_allocations
  for all
  using (practitioner_id = public.my_practitioner_id())
  with check (practitioner_id = public.my_practitioner_id());
