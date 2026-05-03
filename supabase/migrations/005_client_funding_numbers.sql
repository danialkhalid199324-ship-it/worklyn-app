-- Add NDIS and Medicare number fields to clients table
-- Run in Supabase SQL Editor after 004_reports_pdf_path.sql

alter table public.clients
  add column if not exists ndis_number     text,
  add column if not exists medicare_number text;
