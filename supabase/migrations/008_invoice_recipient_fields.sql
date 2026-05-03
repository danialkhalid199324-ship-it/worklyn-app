-- Add invoice recipient routing fields to invoices table
-- Run in Supabase SQL Editor after 007_ndis_management_fields.sql

alter table public.invoices
  add column if not exists recipient_type  text
    check (recipient_type in ('client', 'plan_manager', 'self_manager', 'ndia_claim')),
  add column if not exists recipient_name  text,
  add column if not exists recipient_email text,
  add column if not exists recipient_phone text,
  add column if not exists billing_note    text;
