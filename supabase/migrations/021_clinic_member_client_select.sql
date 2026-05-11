-- =============================================================================
-- Migration 021: Allow clinic members to SELECT clients owned by their clinic admin
-- Apply in Supabase SQL Editor. Safe to re-run (DROP POLICY IF EXISTS guard).
-- =============================================================================
--
-- Problem:
--   When a session is created by an admin and assigned to a member practitioner
--   (e.g. Ayesha), the session's client_id points to a client row whose
--   practitioner_id is the admin's ID.
--
--   When Ayesha views her sessions page, getSessions() runs a PostgREST query
--   with clients(first_name, last_name) embedded. PostgreSQL evaluates the
--   clients RLS for Ayesha. The existing "clients: clinic_admin_select" policy
--   uses my_accessible_practitioner_ids(), which for a non-admin returns only
--   [ayesha.id]. Since the client has practitioner_id = admin.id, the join
--   returns null — and the client name column shows "—".
--
-- Fix:
--   Add a FOR SELECT policy that lets an active clinic member read any client
--   whose practitioner_id is the clinic_id they belong to (i.e. the admin).
--   This is read-only and scoped to active memberships only.
-- =============================================================================

DO $$ BEGIN
  DROP POLICY IF EXISTS "clients: clinic_member_select" ON public.clients;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "clients: clinic_member_select"
  ON public.clients
  FOR SELECT
  USING (
    practitioner_id IN (
      SELECT clinic_id
      FROM   public.clinic_memberships
      WHERE  member_id = public.my_practitioner_id()
      AND    is_active  = true
    )
  );
