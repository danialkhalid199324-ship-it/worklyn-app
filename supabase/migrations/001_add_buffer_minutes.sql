-- Add buffer_minutes column to practitioners table
-- Run this in Supabase SQL Editor after the initial schema.sql

alter table public.practitioners
  add column if not exists buffer_minutes int not null default 0
    check (buffer_minutes >= 0 and buffer_minutes <= 120);

comment on column public.practitioners.buffer_minutes is
  'Gap (in minutes) to leave between consecutive appointments';
