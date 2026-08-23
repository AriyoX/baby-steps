-- Secure server-side finalization for expired account deletion requests.
--
-- The React Native client schedules deletion and handles reactivation during
-- the 30-day grace period. These helpers are intentionally service-role only:
-- a trusted Edge Function claims expired requests, removes user-owned app data,
-- deletes the Supabase Auth user with admin privileges, then marks the request
-- completed. Shared/global learning content is never deleted here.

BEGIN;

ALTER TABLE public.account_deletion_requests
ALTER COLUMN user_id DROP NOT NULL,
ADD COLUMN IF NOT EXISTS finalization_started_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS finalization_attempted_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS finalization_attempt_count integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS finalization_error text,
ADD COLUMN IF NOT EXISTS app_data_deleted_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS auth_user_deleted_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS finalized_at timestamp with time zone;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'account_deletion_requests_finalization_attempt_count_check'
      AND conrelid = 'public.account_deletion_requests'::regclass
  ) THEN
    ALTER TABLE public.account_deletion_requests
    ADD CONSTRAINT account_deletion_requests_finalization_attempt_count_check
      CHECK (finalization_attempt_count >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'account_deletion_requests_user_id_fkey'
      AND conrelid = 'public.account_deletion_requests'::regclass
  ) THEN
    ALTER TABLE public.account_deletion_requests
    DROP CONSTRAINT account_deletion_requests_user_id_fkey;
  END IF;
END $$;

ALTER TABLE public.account_deletion_requests
ADD CONSTRAINT account_deletion_requests_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;

COMMENT ON COLUMN public.account_deletion_requests.user_id IS
  'Auth user id while the account exists. Set to NULL automatically after the Supabase Auth user is deleted so a minimal deletion log row can remain.';
COMMENT ON COLUMN public.account_deletion_requests.finalization_started_at IS
  'First timestamp when a trusted server-side finalizer claimed this request.';
COMMENT ON COLUMN public.account_deletion_requests.finalization_attempted_at IS
  'Most recent timestamp when a trusted server-side finalizer attempted this request.';
COMMENT ON COLUMN public.account_deletion_requests.finalization_attempt_count IS
  'Number of trusted server-side finalization attempts. Incremented when a request is claimed.';
COMMENT ON COLUMN public.account_deletion_requests.finalization_error IS
  'Sanitized non-sensitive error from the last failed finalization attempt.';
COMMENT ON COLUMN public.account_deletion_requests.app_data_deleted_at IS
  'Timestamp when Baby Steps user-owned app data was deleted or anonymized.';
COMMENT ON COLUMN public.account_deletion_requests.auth_user_deleted_at IS
  'Timestamp when the trusted finalizer confirmed Supabase Auth user deletion.';
COMMENT ON COLUMN public.account_deletion_requests.finalized_at IS
  'Timestamp when final app-data cleanup, Auth deletion, and deletion-request completion were confirmed.';

CREATE INDEX IF NOT EXISTS idx_account_deletion_requests_finalizer_ready
ON public.account_deletion_requests(status, grace_ends_at, requested_at)
WHERE status IN ('requested', 'processing')
  AND completed_at IS NULL;

CREATE OR REPLACE FUNCTION public.claim_expired_account_deletion_requests(
  p_limit integer DEFAULT 25,
  p_dry_run boolean DEFAULT false
)
RETURNS TABLE (
  request_id uuid,
  user_id uuid,
  status text,
  requested_at timestamp with time zone,
  grace_ends_at timestamp with time zone,
  app_data_deleted_at timestamp with time zone,
  auth_user_deleted_at timestamp with time zone,
  finalization_attempt_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 25), 1), 100);
BEGIN
  IF p_dry_run THEN
    RETURN QUERY
    SELECT
      request.id AS request_id,
      request.user_id,
      request.status,
      request.requested_at,
      request.grace_ends_at,
      request.app_data_deleted_at,
      request.auth_user_deleted_at,
      request.finalization_attempt_count
    FROM public.account_deletion_requests AS request
    WHERE request.status IN ('requested', 'processing')
      AND request.completed_at IS NULL
      AND COALESCE(request.grace_ends_at, request.requested_at + interval '30 days') <= now()
      AND (
        request.user_id IS NOT NULL
        OR request.app_data_deleted_at IS NOT NULL
      )
    ORDER BY
      COALESCE(request.grace_ends_at, request.requested_at + interval '30 days'),
      request.requested_at,
      request.id
    LIMIT v_limit;

    RETURN;
  END IF;

  RETURN QUERY
  WITH eligible AS (
    SELECT request.id
    FROM public.account_deletion_requests AS request
    WHERE request.status IN ('requested', 'processing')
      AND request.completed_at IS NULL
      AND COALESCE(request.grace_ends_at, request.requested_at + interval '30 days') <= now()
      AND (
        request.user_id IS NOT NULL
        OR request.app_data_deleted_at IS NOT NULL
      )
    ORDER BY
      COALESCE(request.grace_ends_at, request.requested_at + interval '30 days'),
      request.requested_at,
      request.id
    FOR UPDATE SKIP LOCKED
    LIMIT v_limit
  ),
  claimed AS (
    UPDATE public.account_deletion_requests AS request
    SET
      status = 'processing',
      finalization_started_at = COALESCE(request.finalization_started_at, now()),
      finalization_attempted_at = now(),
      finalization_attempt_count = request.finalization_attempt_count + 1,
      finalization_error = NULL
    FROM eligible
    WHERE request.id = eligible.id
    RETURNING
      request.id AS request_id,
      request.user_id,
      request.status,
      request.requested_at,
      request.grace_ends_at,
      request.app_data_deleted_at,
      request.auth_user_deleted_at,
      request.finalization_attempt_count
  )
  SELECT
    claimed.request_id,
    claimed.user_id,
    claimed.status,
    claimed.requested_at,
    claimed.grace_ends_at,
    claimed.app_data_deleted_at,
    claimed.auth_user_deleted_at,
    claimed.finalization_attempt_count
  FROM claimed;
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_expired_account_deletion_request_app_data(
  p_request_id uuid,
  p_dry_run boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_request public.account_deletion_requests%ROWTYPE;
  v_now timestamp with time zone := now();
  v_child_ids uuid[] := ARRAY[]::uuid[];
  v_activities_count integer := 0;
  v_child_achievements_count integer := 0;
  v_child_activity_progress_count integer := 0;
  v_child_stage_progress_count integer := 0;
  v_children_count integer := 0;
  v_counts jsonb;
BEGIN
  IF p_request_id IS NULL THEN
    RAISE EXCEPTION 'Account deletion request id is required.';
  END IF;

  SELECT *
  INTO v_request
  FROM public.account_deletion_requests AS request
  WHERE request.id = p_request_id
  FOR UPDATE;

  IF v_request.id IS NULL THEN
    RAISE EXCEPTION 'Account deletion request was not found.';
  END IF;

  IF v_request.status = 'completed' THEN
    RETURN jsonb_build_object(
      'requestId', v_request.id,
      'alreadyCompleted', true,
      'dryRun', p_dry_run
    );
  END IF;

  IF v_request.status NOT IN ('requested', 'processing') THEN
    RAISE EXCEPTION 'Account deletion request is not eligible for finalization.';
  END IF;

  IF COALESCE(v_request.grace_ends_at, v_request.requested_at + interval '30 days') > v_now THEN
    RAISE EXCEPTION 'Account deletion grace period has not ended.';
  END IF;

  IF v_request.user_id IS NULL THEN
    IF v_request.app_data_deleted_at IS NOT NULL THEN
      RETURN jsonb_build_object(
        'requestId', v_request.id,
        'userId', NULL,
        'dryRun', p_dry_run,
        'requiresAuthDeletion', false,
        'appDataDeletedAt', v_request.app_data_deleted_at,
        'counts', jsonb_build_object(
          'activities', 0,
          'childAchievements', 0,
          'childActivityProgress', 0,
          'childStageProgress', 0,
          'children', 0
        )
      );
    END IF;

    RAISE EXCEPTION 'Account deletion request no longer has a user id and app data cleanup is not recorded.';
  END IF;

  SELECT COALESCE(array_agg(child.id ORDER BY child.id), ARRAY[]::uuid[])
  INTO v_child_ids
  FROM public.children AS child
  WHERE child.parent_id = v_request.user_id;

  SELECT COUNT(*)
  INTO v_activities_count
  FROM public.activities AS activity
  WHERE activity.child_id = ANY(v_child_ids);

  SELECT COUNT(*)
  INTO v_child_achievements_count
  FROM public.child_achievements AS child_achievement
  WHERE child_achievement.child_id = ANY(v_child_ids);

  SELECT COUNT(*)
  INTO v_child_activity_progress_count
  FROM public.child_activity_progress AS progress
  WHERE progress.child_id = ANY(v_child_ids);

  SELECT COUNT(*)
  INTO v_child_stage_progress_count
  FROM public.child_stage_progress AS progress
  WHERE progress.child_id = ANY(v_child_ids);

  SELECT COUNT(*)
  INTO v_children_count
  FROM public.children AS child
  WHERE child.parent_id = v_request.user_id;

  v_counts := jsonb_build_object(
    'activities', v_activities_count,
    'childAchievements', v_child_achievements_count,
    'childActivityProgress', v_child_activity_progress_count,
    'childStageProgress', v_child_stage_progress_count,
    'children', v_children_count
  );

  IF p_dry_run THEN
    RETURN jsonb_build_object(
      'requestId', v_request.id,
      'userId', v_request.user_id,
      'dryRun', true,
      'requiresAuthDeletion', true,
      'counts', v_counts
    );
  END IF;

  UPDATE public.account_deletion_requests AS request
  SET
    status = 'processing',
    finalization_started_at = COALESCE(request.finalization_started_at, v_now),
    finalization_attempted_at = COALESCE(request.finalization_attempted_at, v_now),
    finalization_error = NULL
  WHERE request.id = v_request.id;

  DELETE FROM public.child_achievements AS child_achievement
  WHERE child_achievement.child_id = ANY(v_child_ids);
  GET DIAGNOSTICS v_child_achievements_count = ROW_COUNT;

  DELETE FROM public.child_stage_progress AS progress
  WHERE progress.child_id = ANY(v_child_ids);
  GET DIAGNOSTICS v_child_stage_progress_count = ROW_COUNT;

  DELETE FROM public.child_activity_progress AS progress
  WHERE progress.child_id = ANY(v_child_ids);
  GET DIAGNOSTICS v_child_activity_progress_count = ROW_COUNT;

  DELETE FROM public.activities AS activity
  WHERE activity.child_id = ANY(v_child_ids);
  GET DIAGNOSTICS v_activities_count = ROW_COUNT;

  DELETE FROM public.children AS child
  WHERE child.parent_id = v_request.user_id;
  GET DIAGNOSTICS v_children_count = ROW_COUNT;

  v_counts := jsonb_build_object(
    'activities', v_activities_count,
    'childAchievements', v_child_achievements_count,
    'childActivityProgress', v_child_activity_progress_count,
    'childStageProgress', v_child_stage_progress_count,
    'children', v_children_count
  );

  UPDATE public.account_deletion_requests AS request
  SET
    email = NULL,
    note = NULL,
    archived_child_ids = ARRAY[]::uuid[],
    app_data_deleted_at = COALESCE(request.app_data_deleted_at, v_now),
    finalization_error = NULL
  WHERE request.id = v_request.id
  RETURNING *
  INTO v_request;

  RETURN jsonb_build_object(
    'requestId', v_request.id,
    'userId', v_request.user_id,
    'dryRun', false,
    'requiresAuthDeletion', true,
    'appDataDeletedAt', v_request.app_data_deleted_at,
    'counts', v_counts
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_finalized_account_deletion_request(
  p_request_id uuid,
  p_auth_user_deleted_at timestamp with time zone DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_request public.account_deletion_requests%ROWTYPE;
  v_now timestamp with time zone := now();
  v_auth_user_deleted_at timestamp with time zone := COALESCE(p_auth_user_deleted_at, now());
BEGIN
  IF p_request_id IS NULL THEN
    RAISE EXCEPTION 'Account deletion request id is required.';
  END IF;

  SELECT *
  INTO v_request
  FROM public.account_deletion_requests AS request
  WHERE request.id = p_request_id
  FOR UPDATE;

  IF v_request.id IS NULL THEN
    RAISE EXCEPTION 'Account deletion request was not found.';
  END IF;

  IF v_request.status = 'completed' THEN
    RETURN jsonb_build_object(
      'requestId', v_request.id,
      'alreadyCompleted', true,
      'completedAt', v_request.completed_at,
      'finalizedAt', v_request.finalized_at
    );
  END IF;

  IF v_request.status NOT IN ('requested', 'processing') THEN
    RAISE EXCEPTION 'Account deletion request is not eligible for completion.';
  END IF;

  IF v_request.app_data_deleted_at IS NULL THEN
    RAISE EXCEPTION 'Account app data cleanup must complete before request completion.';
  END IF;

  UPDATE public.account_deletion_requests AS request
  SET
    status = 'completed',
    user_id = NULL,
    email = NULL,
    note = NULL,
    archived_child_ids = ARRAY[]::uuid[],
    completed_at = COALESCE(request.completed_at, v_now),
    fulfilled_at = COALESCE(request.fulfilled_at, v_now),
    finalized_at = COALESCE(request.finalized_at, v_now),
    auth_user_deleted_at = COALESCE(request.auth_user_deleted_at, v_auth_user_deleted_at),
    finalization_error = NULL
  WHERE request.id = v_request.id
  RETURNING *
  INTO v_request;

  RETURN jsonb_build_object(
    'requestId', v_request.id,
    'alreadyCompleted', false,
    'completedAt', v_request.completed_at,
    'finalizedAt', v_request.finalized_at,
    'authUserDeletedAt', v_request.auth_user_deleted_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.record_account_deletion_finalization_failure(
  p_request_id uuid,
  p_error text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_request public.account_deletion_requests%ROWTYPE;
  v_error text := left(
    regexp_replace(
      COALESCE(NULLIF(p_error, ''), 'Unknown account deletion finalization error.'),
      '[\r\n\t]+',
      ' ',
      'g'
    ),
    1000
  );
BEGIN
  IF p_request_id IS NULL THEN
    RAISE EXCEPTION 'Account deletion request id is required.';
  END IF;

  SELECT *
  INTO v_request
  FROM public.account_deletion_requests AS request
  WHERE request.id = p_request_id
  FOR UPDATE;

  IF v_request.id IS NULL THEN
    RAISE EXCEPTION 'Account deletion request was not found.';
  END IF;

  IF v_request.status = 'completed' THEN
    RETURN jsonb_build_object(
      'requestId', v_request.id,
      'alreadyCompleted', true,
      'finalizationError', NULL
    );
  END IF;

  UPDATE public.account_deletion_requests AS request
  SET
    status = 'processing',
    finalization_attempted_at = now(),
    finalization_error = v_error,
    email = CASE
      WHEN request.app_data_deleted_at IS NOT NULL THEN NULL
      ELSE request.email
    END,
    note = CASE
      WHEN request.app_data_deleted_at IS NOT NULL THEN NULL
      ELSE request.note
    END,
    archived_child_ids = CASE
      WHEN request.app_data_deleted_at IS NOT NULL THEN ARRAY[]::uuid[]
      ELSE request.archived_child_ids
    END
  WHERE request.id = v_request.id
  RETURNING *
  INTO v_request;

  RETURN jsonb_build_object(
    'requestId', v_request.id,
    'alreadyCompleted', false,
    'finalizationError', v_request.finalization_error,
    'finalizationAttemptCount', v_request.finalization_attempt_count
  );
END;
$$;

COMMENT ON FUNCTION public.claim_expired_account_deletion_requests(integer, boolean) IS
  'Service-role-only helper that finds expired pending account deletion requests and, unless dry-run, claims them for finalization with row locks.';
COMMENT ON FUNCTION public.finalize_expired_account_deletion_request_app_data(uuid, boolean) IS
  'Service-role-only helper that validates an expired request, deletes/anonymizes Baby Steps user-owned app data, and returns non-sensitive counts.';
COMMENT ON FUNCTION public.complete_finalized_account_deletion_request(uuid, timestamp with time zone) IS
  'Service-role-only helper that marks an app-data-cleaned request completed after the Edge Function confirms Supabase Auth user deletion.';
COMMENT ON FUNCTION public.record_account_deletion_finalization_failure(uuid, text) IS
  'Service-role-only helper that stores a sanitized finalization error while keeping the request blocked and retryable.';

REVOKE ALL ON FUNCTION public.claim_expired_account_deletion_requests(integer, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.finalize_expired_account_deletion_request_app_data(uuid, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_finalized_account_deletion_request(uuid, timestamp with time zone) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_account_deletion_finalization_failure(uuid, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.claim_expired_account_deletion_requests(integer, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.finalize_expired_account_deletion_request_app_data(uuid, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_finalized_account_deletion_request(uuid, timestamp with time zone) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_account_deletion_finalization_failure(uuid, text) TO service_role;

COMMIT;
