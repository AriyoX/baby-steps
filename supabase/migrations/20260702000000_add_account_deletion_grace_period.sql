-- Adds the account deletion grace period and safe reactivation markers.
--
-- Permanent deletion remains a future secure server-side process. A trusted
-- worker or Edge Function should run after grace_ends_at, delete/anonymize
-- user-owned app data according to policy, and delete the Supabase Auth user
-- with admin privileges. Shared/global content must never be deleted.

BEGIN;

ALTER TABLE public.account_deletion_requests
ADD COLUMN IF NOT EXISTS grace_ends_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS cancelled_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS reactivated_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS archived_child_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[];

UPDATE public.account_deletion_requests
SET grace_ends_at = requested_at + interval '30 days'
WHERE grace_ends_at IS NULL
  AND status IN ('requested', 'processing');

COMMENT ON COLUMN public.account_deletion_requests.grace_ends_at IS
  'End of the account deletion grace period. Requests become eligible for final server-side cleanup after this timestamp.';
COMMENT ON COLUMN public.account_deletion_requests.cancelled_at IS
  'Timestamp when the deletion request was cancelled.';
COMMENT ON COLUMN public.account_deletion_requests.reactivated_at IS
  'Timestamp when the user reactivated the account during the grace period.';
COMMENT ON COLUMN public.account_deletion_requests.completed_at IS
  'Timestamp a future trusted cleanup process marks final deletion/anonymization complete.';
COMMENT ON COLUMN public.account_deletion_requests.archived_child_ids IS
  'Child profile ids archived by the deletion request for audit and reactivation support.';

CREATE INDEX IF NOT EXISTS idx_account_deletion_requests_status_grace
ON public.account_deletion_requests(status, grace_ends_at)
WHERE status IN ('requested', 'processing');

DROP POLICY IF EXISTS account_deletion_requests_parent_update
ON public.account_deletion_requests;
CREATE POLICY account_deletion_requests_parent_update
ON public.account_deletion_requests
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

ALTER TABLE public.children
ADD COLUMN IF NOT EXISTS archived_by_account_deletion_request_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'children_archived_by_account_deletion_request_id_fkey'
  ) THEN
    ALTER TABLE public.children
    ADD CONSTRAINT children_archived_by_account_deletion_request_id_fkey
      FOREIGN KEY (archived_by_account_deletion_request_id)
      REFERENCES public.account_deletion_requests(id)
      ON DELETE SET NULL;
  END IF;
END $$;

COMMENT ON COLUMN public.children.archived_by_account_deletion_request_id IS
  'Deletion request that archived this child profile. Used to safely restore only profiles archived by account deletion.';

CREATE INDEX IF NOT EXISTS idx_children_account_deletion_archive
ON public.children(archived_by_account_deletion_request_id)
WHERE archived_by_account_deletion_request_id IS NOT NULL;

COMMIT;
