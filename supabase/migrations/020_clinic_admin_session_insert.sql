-- =============================================================================
-- Migration 020: Allow clinic admins to INSERT sessions for their team members
-- Apply in Supabase SQL Editor. Safe to re-run (DROP POLICY IF EXISTS guard).
-- =============================================================================
--
-- Problem: The existing "sessions: own" policy is FOR ALL and uses
--   USING (practitioner_id = my_practitioner_id())
-- PostgreSQL applies this expression as WITH CHECK on INSERT/UPDATE.
-- When an admin inserts a session with practitioner_id = member.id, the check
-- evaluates to member.id = admin.id → false → blocked.
--
-- Fix: Add a dedicated FOR INSERT policy that uses the existing
-- my_accessible_practitioner_ids() helper (defined in migration 016).
-- That function returns:
--   • For admins:      own practitioner_id + all active member IDs in their clinic
--   • For non-admins:  only their own practitioner_id
-- So non-admins are unaffected — they can still only insert their own sessions.
-- =============================================================================

DO $$ BEGIN
  DROP POLICY IF EXISTS "sessions: clinic_admin_insert" ON public.sessions;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "sessions: clinic_admin_insert"
  ON public.sessions
  FOR INSERT
  WITH CHECK (practitioner_id = ANY(public.my_accessible_practitioner_ids()));
