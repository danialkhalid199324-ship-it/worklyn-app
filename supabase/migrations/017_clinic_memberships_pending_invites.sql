-- =============================================================================
-- Migration 017: Pending invitations for clinic_memberships
-- Allows inviting practitioners by email before they have a Worklyn account.
-- Apply in Supabase SQL Editor after migration 016.
-- =============================================================================

-- Add status + invite fields
ALTER TABLE public.clinic_memberships
  ADD COLUMN IF NOT EXISTS status       TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('pending', 'active', 'inactive')),
  ADD COLUMN IF NOT EXISTS invited_email TEXT,
  ADD COLUMN IF NOT EXISTS invited_name  TEXT;

-- Make member_id nullable: pending invites have no practitioner row yet
ALTER TABLE public.clinic_memberships
  ALTER COLUMN member_id DROP NOT NULL;

-- Drop the old (clinic_id, member_id) UNIQUE constraint — NULL member_id
-- would collide on multiple pending invites under the original constraint.
ALTER TABLE public.clinic_memberships
  DROP CONSTRAINT IF EXISTS clinic_memberships_clinic_id_member_id_key;

-- Partial unique index: enforce (clinic_id, member_id) uniqueness only when
-- member_id is not null (i.e. active/inactive memberships with a real practitioner)
CREATE UNIQUE INDEX IF NOT EXISTS clinic_memberships_clinic_member_uniq
  ON public.clinic_memberships (clinic_id, member_id)
  WHERE member_id IS NOT NULL;

-- Prevent duplicate pending invites for the same email in the same clinic
CREATE UNIQUE INDEX IF NOT EXISTS clinic_memberships_pending_email_uniq
  ON public.clinic_memberships (clinic_id, lower(invited_email))
  WHERE status = 'pending' AND invited_email IS NOT NULL;

-- Mark all existing memberships as explicitly 'active'
UPDATE public.clinic_memberships
SET status = 'active'
WHERE status = 'active';  -- no-op, ensures DEFAULT is consistent
