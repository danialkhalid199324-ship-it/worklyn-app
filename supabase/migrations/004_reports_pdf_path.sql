-- Add PDF storage path to reports table
-- Run in Supabase SQL Editor after 003_reports_ai_fields.sql

alter table public.reports
  add column if not exists pdf_path text;

-- Create storage bucket for report PDFs (run once in Supabase dashboard
-- or via this SQL if using storage API):
-- insert into storage.buckets (id, name, public) values ('reports', 'reports', false);
