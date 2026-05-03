-- Add AI report fields to reports table
-- Run in Supabase SQL Editor after 002_session_notes_structured.sql

alter table public.reports
  add column if not exists client_id  uuid references public.clients(id) on delete set null,
  add column if not exists draft_text text,
  add column if not exists final_text text;

create index if not exists reports_client_id_idx on public.reports(client_id);
