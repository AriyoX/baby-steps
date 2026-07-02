-- MVP account management and safe child profile archiving.
--
-- This migration intentionally does not hard-delete child-owned records or
-- Supabase auth users. The client archives child profiles with deleted_at and
-- records account deletion requests for a future secure server-side worker.

BEGIN;

ALTER TABLE public.children
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

COMMENT ON COLUMN public.children.deleted_at IS
  'Soft-delete/archive marker. Archived children are hidden from normal parent and child selection flows.';

CREATE INDEX IF NOT EXISTS idx_children_parent_deleted_at_created_at
ON public.children(parent_id, deleted_at, created_at DESC);

ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS children_parent_select ON public.children;
CREATE POLICY children_parent_select
ON public.children
FOR SELECT
USING (parent_id = auth.uid());

DROP POLICY IF EXISTS children_parent_insert ON public.children;
CREATE POLICY children_parent_insert
ON public.children
FOR INSERT
WITH CHECK (parent_id = auth.uid());

DROP POLICY IF EXISTS children_parent_update ON public.children;
CREATE POLICY children_parent_update
ON public.children
FOR UPDATE
USING (parent_id = auth.uid())
WITH CHECK (parent_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.account_deletion_requests (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  email text,
  status text NOT NULL DEFAULT 'requested',
  requested_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  fulfilled_at timestamp with time zone,
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT account_deletion_requests_pkey PRIMARY KEY (id),
  CONSTRAINT account_deletion_requests_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE,
  CONSTRAINT account_deletion_requests_status_check
    CHECK (status IN ('requested', 'processing', 'completed', 'cancelled'))
);

COMMENT ON TABLE public.account_deletion_requests IS
  'Client-created deletion requests. Final Supabase auth user deletion requires a secure server-side admin function.';

CREATE INDEX IF NOT EXISTS idx_account_deletion_requests_user_status
ON public.account_deletion_requests(user_id, status, requested_at DESC);

CREATE OR REPLACE FUNCTION public.set_account_deletion_requests_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_account_deletion_requests_updated_at
ON public.account_deletion_requests;
CREATE TRIGGER set_account_deletion_requests_updated_at
BEFORE UPDATE ON public.account_deletion_requests
FOR EACH ROW
EXECUTE FUNCTION public.set_account_deletion_requests_updated_at();

ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS account_deletion_requests_parent_select
ON public.account_deletion_requests;
CREATE POLICY account_deletion_requests_parent_select
ON public.account_deletion_requests
FOR SELECT
USING (user_id = auth.uid());

DROP POLICY IF EXISTS account_deletion_requests_parent_insert
ON public.account_deletion_requests;
CREATE POLICY account_deletion_requests_parent_insert
ON public.account_deletion_requests
FOR INSERT
WITH CHECK (user_id = auth.uid());

COMMIT;
