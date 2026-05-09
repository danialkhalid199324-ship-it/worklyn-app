-- =============================================================================
-- Migration 016: Clinic memberships + admin RLS visibility
-- Apply in Supabase SQL Editor after migration 015.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- CLINIC_MEMBERSHIPS TABLE
-- Links a clinic (represented by the admin/owner practitioner_id) to its
-- staff members.  Each row = one practitioner in one clinic.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clinic_memberships (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id    UUID        NOT NULL REFERENCES public.practitioners (id) ON DELETE CASCADE,
  member_id    UUID        NOT NULL REFERENCES public.practitioners (id) ON DELETE CASCADE,
  role         TEXT        NOT NULL DEFAULT 'practitioner'
                             CHECK (role IN ('admin', 'practitioner', 'receptionist', 'finance')),
  is_active    BOOLEAN     NOT NULL DEFAULT true,
  invited_by   UUID        REFERENCES public.practitioners (id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (clinic_id, member_id)
);

CREATE INDEX IF NOT EXISTS clinic_memberships_clinic_id_idx  ON public.clinic_memberships (clinic_id);
CREATE INDEX IF NOT EXISTS clinic_memberships_member_id_idx  ON public.clinic_memberships (member_id);

CREATE OR REPLACE TRIGGER set_clinic_memberships_updated_at
  BEFORE UPDATE ON public.clinic_memberships
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.clinic_memberships ENABLE ROW LEVEL SECURITY;

-- Clinic admin can fully manage memberships for their clinic
DO $$ BEGIN
  DROP POLICY IF EXISTS "clinic_memberships: admin_owns" ON public.clinic_memberships;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
CREATE POLICY "clinic_memberships: admin_owns"
  ON public.clinic_memberships FOR ALL
  USING (clinic_id = public.my_practitioner_id());

-- Members can see their own membership row (read-only)
DO $$ BEGIN
  DROP POLICY IF EXISTS "clinic_memberships: member_sees_self" ON public.clinic_memberships;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
CREATE POLICY "clinic_memberships: member_sees_self"
  ON public.clinic_memberships FOR SELECT
  USING (member_id = public.my_practitioner_id());

-- ---------------------------------------------------------------------------
-- HELPER FUNCTION: my_accessible_practitioner_ids()
-- Returns an array of practitioner IDs the current user may read.
--   • Solo practitioners (or non-admins): returns only their own ID.
--   • Clinic admins (role = 'admin'):     returns own ID + all active member IDs.
-- All existing RLS policies checking practitioner_id = my_practitioner_id()
-- remain intact for INSERT/UPDATE/DELETE (practitioners only write their own data).
-- The SELECT policies added below give admins cross-practitioner read access.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.my_accessible_practitioner_ids()
RETURNS UUID[]
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT ARRAY(
    SELECT public.my_practitioner_id()
    UNION
    SELECT cm.member_id
    FROM   public.clinic_memberships cm
    WHERE  cm.clinic_id = public.my_practitioner_id()
    AND    cm.is_active  = true
    AND    (
      SELECT role FROM public.practitioners
      WHERE  id = public.my_practitioner_id()
    ) = 'admin'
  )
$$;

-- ---------------------------------------------------------------------------
-- ADMIN SELECT POLICIES — core tables
-- These are additive; they do NOT replace or alter existing own-data policies.
-- Supabase uses OR logic across multiple permissive SELECT policies.
-- Non-admins: my_accessible_practitioner_ids() returns only their own ID,
--             so the new policies return exactly the same rows as existing ones.
-- ---------------------------------------------------------------------------

-- SESSIONS
DO $$ BEGIN
  DROP POLICY IF EXISTS "sessions: clinic_admin_select" ON public.sessions;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
CREATE POLICY "sessions: clinic_admin_select"
  ON public.sessions FOR SELECT
  USING (practitioner_id = ANY(public.my_accessible_practitioner_ids()));

-- CLIENTS
DO $$ BEGIN
  DROP POLICY IF EXISTS "clients: clinic_admin_select" ON public.clients;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
CREATE POLICY "clients: clinic_admin_select"
  ON public.clients FOR SELECT
  USING (practitioner_id = ANY(public.my_accessible_practitioner_ids()));

-- INVOICES
DO $$ BEGIN
  DROP POLICY IF EXISTS "invoices: clinic_admin_select" ON public.invoices;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
CREATE POLICY "invoices: clinic_admin_select"
  ON public.invoices FOR SELECT
  USING (practitioner_id = ANY(public.my_accessible_practitioner_ids()));

-- CLIENT FUNDING ALLOCATIONS
DO $$ BEGIN
  DROP POLICY IF EXISTS "client_funding_allocations: clinic_admin_select"
    ON public.client_funding_allocations;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
CREATE POLICY "client_funding_allocations: clinic_admin_select"
  ON public.client_funding_allocations FOR SELECT
  USING (practitioner_id = ANY(public.my_accessible_practitioner_ids()));

-- SESSION NOTIFICATIONS
DO $$ BEGIN
  DROP POLICY IF EXISTS "session_notifications: clinic_admin_select"
    ON public.session_notifications;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
CREATE POLICY "session_notifications: clinic_admin_select"
  ON public.session_notifications FOR SELECT
  USING (practitioner_id = ANY(public.my_accessible_practitioner_ids()));
