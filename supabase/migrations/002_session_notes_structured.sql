-- Add structured clinical fields to session_notes
-- Run in Supabase SQL Editor after 001_add_buffer_minutes.sql

alter table public.session_notes
  add column if not exists goals_addressed      text,
  add column if not exists observations         text,
  add column if not exists interventions_used   text,
  add column if not exists participant_response text,
  add column if not exists risks_issues         text,
  add column if not exists next_steps           text,
  add column if not exists progress_score       smallint
    check (progress_score >= 1 and progress_score <= 10);
