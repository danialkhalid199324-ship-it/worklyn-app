-- =============================================================================
-- Migration 022: Client documents table + RLS
-- Apply in Supabase SQL Editor. Safe to re-run (DROP TABLE IF EXISTS guard).
-- =============================================================================
--
-- Also required (manual step in Supabase Dashboard → Storage):
--   Create a private bucket named "client-documents" with no public access.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.client_documents (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id   UUID         NOT NULL REFERENCES public.practitioners (id) ON DELETE CASCADE,
  client_id         UUID         NOT NULL REFERENCES public.clients (id) ON DELETE CASCADE,
  file_name         TEXT         NOT NULL,
  file_path         TEXT         NOT NULL UNIQUE,
  file_type         TEXT         NOT NULL DEFAULT '',
  file_size         BIGINT       NOT NULL DEFAULT 0,
  document_category TEXT         NOT NULL DEFAULT 'Other',
  uploaded_by       UUID         NOT NULL REFERENCES auth.users (id),
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS client_documents_client_id_idx
  ON public.client_documents (client_id);

CREATE INDEX IF NOT EXISTS client_documents_practitioner_id_idx
  ON public.client_documents (practitioner_id);

CREATE OR REPLACE TRIGGER set_client_documents_updated_at
  BEFORE UPDATE ON public.client_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;

-- SELECT: own + clinic admin sees all accessible practitioners' documents
DO $$ BEGIN
  DROP POLICY IF EXISTS "client_documents: select" ON public.client_documents;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
CREATE POLICY "client_documents: select"
  ON public.client_documents FOR SELECT
  USING (practitioner_id = ANY(public.my_accessible_practitioner_ids()));

-- INSERT: own practitioner only
DO $$ BEGIN
  DROP POLICY IF EXISTS "client_documents: insert" ON public.client_documents;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
CREATE POLICY "client_documents: insert"
  ON public.client_documents FOR INSERT
  WITH CHECK (practitioner_id = public.my_practitioner_id());

-- UPDATE: own practitioner only (rename)
DO $$ BEGIN
  DROP POLICY IF EXISTS "client_documents: update" ON public.client_documents;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
CREATE POLICY "client_documents: update"
  ON public.client_documents FOR UPDATE
  USING (practitioner_id = public.my_practitioner_id());

-- DELETE: own practitioner only (app layer restricts further to admin role)
DO $$ BEGIN
  DROP POLICY IF EXISTS "client_documents: delete" ON public.client_documents;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
CREATE POLICY "client_documents: delete"
  ON public.client_documents FOR DELETE
  USING (practitioner_id = public.my_practitioner_id());
