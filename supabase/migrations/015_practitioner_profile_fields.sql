-- =============================================================================
-- Migration 015: Practitioner profile extension
-- Adds role, provider_number, calendar_color, is_active to practitioners.
-- Safe to re-run (ADD COLUMN IF NOT EXISTS).
-- Apply in Supabase SQL Editor.
-- =============================================================================

ALTER TABLE public.practitioners
  ADD COLUMN IF NOT EXISTS provider_number TEXT,
  ADD COLUMN IF NOT EXISTS calendar_color  TEXT NOT NULL DEFAULT '#6366F1',
  ADD COLUMN IF NOT EXISTS is_active       BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS role            TEXT NOT NULL DEFAULT 'practitioner'
    CHECK (role IN ('admin', 'practitioner', 'receptionist', 'finance'));

-- Every existing practitioner is the sole owner/admin of their own practice.
-- New staff members added via clinic_memberships will be 'practitioner' by default.
UPDATE public.practitioners
SET role = 'admin'
WHERE role = 'practitioner';
