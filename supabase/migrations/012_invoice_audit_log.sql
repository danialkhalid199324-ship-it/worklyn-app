-- Audit log for edits made to invoices that have already been sent or paid.
-- Captures a full before/after snapshot so changes are traceable.

create table if not exists public.invoice_audit_log (
  id              uuid primary key default gen_random_uuid(),
  invoice_id      uuid not null references public.invoices (id) on delete cascade,
  practitioner_id uuid not null references public.practitioners (id) on delete cascade,
  edited_by       uuid not null references auth.users (id),
  previous_values jsonb not null,
  updated_values  jsonb not null,
  reason          text,
  edited_at       timestamptz not null default now()
);

create index if not exists invoice_audit_log_invoice_id_idx      on public.invoice_audit_log (invoice_id);
create index if not exists invoice_audit_log_practitioner_id_idx on public.invoice_audit_log (practitioner_id);

alter table public.invoice_audit_log enable row level security;

create policy "invoice_audit_log: own"
  on public.invoice_audit_log
  for all
  using (practitioner_id = public.my_practitioner_id());
