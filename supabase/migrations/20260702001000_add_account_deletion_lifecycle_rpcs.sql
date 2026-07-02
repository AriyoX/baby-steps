-- Adds transactional account deletion lifecycle helpers.
--
-- These functions keep the 30-day grace-period strategy intact. They do not
-- delete Supabase Auth users and do not mutate shared/global content.

BEGIN;

WITH ranked_open_requests AS (
  SELECT
    id,
    user_id,
    first_value(id) OVER (
      PARTITION BY user_id
      ORDER BY requested_at DESC, created_at DESC, id DESC
    ) AS keeper_id,
    row_number() OVER (
      PARTITION BY user_id
      ORDER BY requested_at DESC, created_at DESC, id DESC
    ) AS duplicate_rank
  FROM public.account_deletion_requests
  WHERE status IN ('requested', 'processing')
)
UPDATE public.children AS child
SET archived_by_account_deletion_request_id = ranked_open_requests.keeper_id
FROM ranked_open_requests
WHERE ranked_open_requests.duplicate_rank > 1
  AND child.parent_id = ranked_open_requests.user_id
  AND child.archived_by_account_deletion_request_id = ranked_open_requests.id;

WITH ranked_open_requests AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY user_id
      ORDER BY requested_at DESC, created_at DESC, id DESC
    ) AS duplicate_rank
  FROM public.account_deletion_requests
  WHERE status IN ('requested', 'processing')
)
UPDATE public.account_deletion_requests AS request
SET
  status = 'cancelled',
  cancelled_at = COALESCE(cancelled_at, now())
FROM ranked_open_requests
WHERE ranked_open_requests.duplicate_rank > 1
  AND request.id = ranked_open_requests.id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_account_deletion_requests_one_open_per_user
ON public.account_deletion_requests(user_id)
WHERE status IN ('requested', 'processing');

DROP POLICY IF EXISTS account_deletion_requests_parent_insert
ON public.account_deletion_requests;

DROP POLICY IF EXISTS account_deletion_requests_parent_update
ON public.account_deletion_requests;

CREATE OR REPLACE FUNCTION public.request_account_deletion_with_grace(
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text := NULLIF(auth.jwt() ->> 'email', '');
  v_requested_at timestamp with time zone := now();
  v_grace_ends_at timestamp with time zone := v_requested_at + interval '30 days';
  v_latest_blocking_request public.account_deletion_requests%ROWTYPE;
  v_open_request public.account_deletion_requests%ROWTYPE;
  v_request public.account_deletion_requests%ROWTYPE;
  v_open_request_ids uuid[] := ARRAY[]::uuid[];
  v_archived_child_ids uuid[] := ARRAY[]::uuid[];
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'You need to be signed in to request account deletion.';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtext('account_deletion_requests'),
    hashtext(v_user_id::text)
  );

  PERFORM 1
  FROM public.account_deletion_requests
  WHERE user_id = v_user_id
    AND status IN ('requested', 'processing', 'completed')
  FOR UPDATE;

  SELECT *
  INTO v_latest_blocking_request
  FROM public.account_deletion_requests
  WHERE user_id = v_user_id
    AND status IN ('requested', 'processing', 'completed')
  ORDER BY requested_at DESC, created_at DESC, id DESC
  LIMIT 1;

  IF v_latest_blocking_request.id IS NOT NULL
     AND v_latest_blocking_request.status = 'completed' THEN
    RAISE EXCEPTION 'This account is already waiting for final removal.';
  END IF;

  SELECT COALESCE(
    array_agg(id ORDER BY requested_at DESC, created_at DESC, id DESC),
    ARRAY[]::uuid[]
  )
  INTO v_open_request_ids
  FROM public.account_deletion_requests
  WHERE user_id = v_user_id
    AND status IN ('requested', 'processing');

  SELECT *
  INTO v_open_request
  FROM public.account_deletion_requests
  WHERE user_id = v_user_id
    AND status IN ('requested', 'processing')
  ORDER BY requested_at DESC, created_at DESC, id DESC
  LIMIT 1;

  IF v_open_request.id IS NOT NULL THEN
    IF COALESCE(
      v_open_request.grace_ends_at,
      v_open_request.requested_at + interval '30 days'
    ) <= v_requested_at THEN
      RAISE EXCEPTION 'The account deletion grace period has ended.';
    END IF;

    UPDATE public.account_deletion_requests
    SET
      email = v_email,
      status = 'requested',
      requested_at = v_requested_at,
      grace_ends_at = v_grace_ends_at,
      cancelled_at = NULL,
      reactivated_at = NULL,
      completed_at = NULL,
      fulfilled_at = NULL,
      note = p_note
    WHERE id = v_open_request.id
      AND user_id = v_user_id
    RETURNING * INTO v_request;
  ELSE
    INSERT INTO public.account_deletion_requests (
      user_id,
      email,
      status,
      requested_at,
      grace_ends_at,
      archived_child_ids,
      note
    )
    VALUES (
      v_user_id,
      v_email,
      'requested',
      v_requested_at,
      v_grace_ends_at,
      ARRAY[]::uuid[],
      p_note
    )
    RETURNING * INTO v_request;

    v_open_request_ids := ARRAY[v_request.id];
  END IF;

  IF array_length(v_open_request_ids, 1) > 1 THEN
    UPDATE public.children
    SET archived_by_account_deletion_request_id = v_request.id
    WHERE parent_id = v_user_id
      AND archived_by_account_deletion_request_id = ANY(v_open_request_ids)
      AND archived_by_account_deletion_request_id <> v_request.id;

    UPDATE public.account_deletion_requests
    SET
      status = 'cancelled',
      cancelled_at = COALESCE(cancelled_at, v_requested_at)
    WHERE user_id = v_user_id
      AND id = ANY(v_open_request_ids)
      AND id <> v_request.id
      AND status IN ('requested', 'processing');
  END IF;

  UPDATE public.children
  SET
    deleted_at = v_requested_at,
    archived_by_account_deletion_request_id = v_request.id
  WHERE parent_id = v_user_id
    AND deleted_at IS NULL;

  SELECT COALESCE(array_agg(id ORDER BY created_at DESC, id), ARRAY[]::uuid[])
  INTO v_archived_child_ids
  FROM public.children
  WHERE parent_id = v_user_id
    AND archived_by_account_deletion_request_id = v_request.id;

  UPDATE public.account_deletion_requests
  SET archived_child_ids = v_archived_child_ids
  WHERE id = v_request.id
    AND user_id = v_user_id
  RETURNING * INTO v_request;

  RETURN jsonb_build_object(
    'request', to_jsonb(v_request),
    'requestId', v_request.id,
    'archivedChildIds', v_archived_child_ids,
    'requestedAt', v_request.requested_at,
    'graceEndsAt', v_request.grace_ends_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.reactivate_account_deletion()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_reactivated_at timestamp with time zone := now();
  v_request public.account_deletion_requests%ROWTYPE;
  v_latest_request public.account_deletion_requests%ROWTYPE;
  v_open_request_ids uuid[] := ARRAY[]::uuid[];
  v_restored_child_ids uuid[] := ARRAY[]::uuid[];
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'You need to be signed in to reactivate this account.';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtext('account_deletion_requests'),
    hashtext(v_user_id::text)
  );

  PERFORM 1
  FROM public.account_deletion_requests
  WHERE user_id = v_user_id
  FOR UPDATE;

  SELECT COALESCE(
    array_agg(id ORDER BY requested_at DESC, created_at DESC, id DESC),
    ARRAY[]::uuid[]
  )
  INTO v_open_request_ids
  FROM public.account_deletion_requests
  WHERE user_id = v_user_id
    AND status IN ('requested', 'processing');

  SELECT *
  INTO v_request
  FROM public.account_deletion_requests
  WHERE user_id = v_user_id
    AND status IN ('requested', 'processing')
  ORDER BY requested_at DESC, created_at DESC, id DESC
  LIMIT 1;

  IF v_request.id IS NULL THEN
    SELECT *
    INTO v_latest_request
    FROM public.account_deletion_requests
    WHERE user_id = v_user_id
    ORDER BY requested_at DESC, created_at DESC, id DESC
    LIMIT 1;

    IF v_latest_request.id IS NULL THEN
      RAISE EXCEPTION 'There is no account deletion request to reactivate.';
    ELSIF v_latest_request.status = 'completed' THEN
      RAISE EXCEPTION 'This account deletion request has already been completed.';
    ELSIF v_latest_request.status = 'cancelled'
       OR v_latest_request.reactivated_at IS NOT NULL THEN
      RAISE EXCEPTION 'This account deletion request has already been cancelled.';
    ELSE
      RAISE EXCEPTION 'This account deletion request cannot be reactivated.';
    END IF;
  END IF;

  IF COALESCE(
    v_request.grace_ends_at,
    v_request.requested_at + interval '30 days'
  ) <= v_reactivated_at THEN
    RAISE EXCEPTION 'The account deletion grace period has ended.';
  END IF;

  IF array_length(v_open_request_ids, 1) > 1 THEN
    UPDATE public.children
    SET archived_by_account_deletion_request_id = v_request.id
    WHERE parent_id = v_user_id
      AND archived_by_account_deletion_request_id = ANY(v_open_request_ids)
      AND archived_by_account_deletion_request_id <> v_request.id;
  END IF;

  WITH restored_children AS (
    UPDATE public.children
    SET
      deleted_at = NULL,
      archived_by_account_deletion_request_id = NULL
    WHERE parent_id = v_user_id
      AND archived_by_account_deletion_request_id = v_request.id
    RETURNING id
  )
  SELECT COALESCE(array_agg(id ORDER BY id), ARRAY[]::uuid[])
  INTO v_restored_child_ids
  FROM restored_children;

  UPDATE public.account_deletion_requests
  SET
    status = 'cancelled',
    cancelled_at = v_reactivated_at,
    reactivated_at = v_reactivated_at
  WHERE user_id = v_user_id
    AND id = ANY(v_open_request_ids)
    AND status IN ('requested', 'processing');

  SELECT *
  INTO v_request
  FROM public.account_deletion_requests
  WHERE id = v_request.id
    AND user_id = v_user_id;

  RETURN jsonb_build_object(
    'request', to_jsonb(v_request),
    'restoredChildIds', v_restored_child_ids,
    'reactivatedAt', v_request.reactivated_at
  );
END;
$$;

COMMENT ON FUNCTION public.request_account_deletion_with_grace(text) IS
  'Creates or reuses the authenticated user account deletion request and archives active child profiles in one transaction.';
COMMENT ON FUNCTION public.reactivate_account_deletion() IS
  'Reactivates the authenticated user account during the grace period and restores only child profiles archived by that request in one transaction.';

REVOKE ALL ON FUNCTION public.request_account_deletion_with_grace(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reactivate_account_deletion() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_account_deletion_with_grace(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reactivate_account_deletion() TO authenticated;

COMMIT;
