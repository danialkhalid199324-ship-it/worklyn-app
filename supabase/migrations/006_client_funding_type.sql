-- Add funding_type field to clients table
-- Run in Supabase SQL Editor after 005_client_funding_numbers.sql

alter table public.clients
  add column if not exists funding_type text
    check (funding_type in ('NDIS', 'Medicare', 'Private / Other'));
