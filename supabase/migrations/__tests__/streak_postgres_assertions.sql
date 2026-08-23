\set ON_ERROR_STOP on

DO $$
DECLARE
  v_launch_at timestamp with time zone;
BEGIN
  SELECT preference.reset_at INTO v_launch_at
  FROM public.child_streak_preferences preference
  WHERE preference.child_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  IF v_launch_at IS NULL OR v_launch_at = '2020-01-01T00:00:00Z' THEN
    RAISE EXCEPTION 'existing child launch boundary was not the migration transaction';
  END IF;
  IF EXISTS (SELECT 1 FROM public.child_streak_days) THEN
    RAISE EXCEPTION 'migration synthesized historical streak days';
  END IF;
END;
$$;

DO $$
DECLARE
  v_table text;
BEGIN
  IF (SELECT count(*) FROM pg_catalog.pg_tables
      WHERE schemaname = 'public' AND tablename LIKE 'child_streak_%') <> 3 THEN
    RAISE EXCEPTION 'expected three streak tables';
  END IF;
  IF (SELECT count(*) FROM pg_catalog.pg_policies
      WHERE schemaname = 'public' AND tablename LIKE 'child_streak_%') <> 3 THEN
    RAISE EXCEPTION 'expected one parent SELECT policy on every streak table';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint
    WHERE conname = 'child_streak_preferences_current_epoch_fk'
      AND condeferrable AND condeferred
      AND confdeltype = 'a'
  ) THEN
    RAISE EXCEPTION 'active epoch reference is not deferred NO ACTION';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'child_streak_days'
      AND column_name = 'first_timezone'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'child_streak_days'
      AND column_name = 'last_timezone'
  ) OR EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'child_streak_days'
      AND column_name = 'timezone'
  ) THEN
    RAISE EXCEPTION 'timestamp/timezone boundary columns are ambiguous';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_proc procedure
    JOIN pg_catalog.pg_namespace namespace ON namespace.oid = procedure.pronamespace
    WHERE namespace.nspname = 'public'
      AND procedure.proname IN (
        'create_child_streak_state',
        'set_child_streak_enabled',
        'reset_child_streak',
        'set_child_streak_reminder_participation',
        'upsert_child_streak_day'
      )
      AND NOT (procedure.proconfig @> ARRAY['search_path=""'])
  ) THEN
    RAISE EXCEPTION 'exposed RPC search_path is not empty';
  END IF;
  IF (
    SELECT count(*)
    FROM pg_catalog.pg_proc procedure
    JOIN pg_catalog.pg_namespace namespace ON namespace.oid = procedure.pronamespace
    WHERE namespace.nspname = 'public'
      AND procedure.proname IN (
        'create_child_streak_state',
        'set_child_streak_enabled',
        'reset_child_streak',
        'set_child_streak_reminder_participation',
        'upsert_child_streak_day'
      )
      AND procedure.prosecdef
      AND pg_catalog.has_function_privilege('authenticated', procedure.oid, 'EXECUTE')
      AND NOT pg_catalog.has_function_privilege('anon', procedure.oid, 'EXECUTE')
      AND pg_catalog.pg_get_userbyid(procedure.proowner) NOT IN ('anon', 'authenticated')
  ) <> 5 THEN
    RAISE EXCEPTION 'exposed RPC security-definer ownership or grants are unsafe';
  END IF;
  FOREACH v_table IN ARRAY ARRAY[
    'child_streak_preferences', 'child_streak_epochs', 'child_streak_days'
  ] LOOP
    IF NOT pg_catalog.has_table_privilege('authenticated', 'public.' || v_table, 'SELECT')
      OR pg_catalog.has_table_privilege('authenticated', 'public.' || v_table, 'INSERT')
      OR pg_catalog.has_table_privilege('authenticated', 'public.' || v_table, 'UPDATE')
      OR pg_catalog.has_table_privilege('authenticated', 'public.' || v_table, 'DELETE')
      OR pg_catalog.has_table_privilege('anon', 'public.' || v_table, 'SELECT')
    THEN
      RAISE EXCEPTION 'streak table grants are unsafe for %', v_table;
    END IF;
  END LOOP;
END;
$$;

SET ROLE anon;
DO $$
BEGIN
  BEGIN
    PERFORM public.reset_child_streak(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000002',
      now()
    );
    RAISE EXCEPTION 'anonymous RPC execution unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END;
$$;

RESET ROLE;

SET ROLE authenticated;
SET request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

DO $$
BEGIN
  BEGIN
    INSERT INTO public.child_streak_days(
      child_id, streak_epoch_id, local_date,
      first_completed_at, first_timezone, last_completed_at, last_timezone,
      source_type
    ) VALUES (
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      (SELECT current_epoch_id FROM public.child_streak_preferences
       WHERE child_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
      current_date, now(), 'UTC', now(), 'UTC', 'game'
    );
    RAISE EXCEPTION 'direct authenticated streak write unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.child_streak_preferences
    WHERE child_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
  ) OR EXISTS (
    SELECT 1 FROM public.child_streak_epochs
    WHERE child_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
  ) OR EXISTS (
    SELECT 1 FROM public.child_streak_days
    WHERE child_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
  ) THEN
    RAISE EXCEPTION 'cross-account streak rows were visible';
  END IF;
END;
$$;

DO $$
DECLARE
  v_result jsonb;
BEGIN
  v_result := public.set_child_streak_reminder_participation(
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', false
  );
  IF v_result->>'status' IS DISTINCT FROM 'rejected'
    OR v_result->>'reason' IS DISTINCT FROM 'child_not_owned' THEN
    RAISE EXCEPTION 'cross-account RPC was not rejected: %', v_result;
  END IF;
END;
$$;

DO $$
DECLARE
  v_child uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  v_epoch uuid;
  v_boundary timestamp with time zone;
  v_result jsonb;
BEGIN
  SELECT current_epoch_id, reset_at INTO v_epoch, v_boundary
  FROM public.child_streak_preferences WHERE child_id = v_child;

  v_result := public.set_child_streak_enabled(
    v_child, false, v_epoch, NULL,
    v_boundary + interval '10 minutes'
  );
  IF v_result->>'status' IS DISTINCT FROM 'applied' THEN
    RAISE EXCEPTION 'owned disable failed: %', v_result;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.child_streak_preferences preference
    WHERE preference.child_id = v_child
      AND (preference.streak_enabled OR preference.current_epoch_id IS NOT NULL)
  ) OR NOT EXISTS (
    SELECT 1 FROM public.child_streak_epochs epoch
    WHERE epoch.child_id = v_child
      AND epoch.id = v_epoch
      AND epoch.ended_at = v_boundary + interval '10 minutes'
      AND epoch.end_reason = 'disabled'
  ) THEN
    RAISE EXCEPTION 'owned disable was not persisted consistently';
  END IF;

  v_result := public.set_child_streak_enabled(
    v_child, true, NULL, '00000000-0000-4000-8000-000000000011',
    v_boundary + interval '5 minutes'
  );
  IF v_result->>'status' IS DISTINCT FROM 'stale' THEN
    RAISE EXCEPTION 'older enable overrode newer disable: %', v_result;
  END IF;

  v_result := public.set_child_streak_enabled(
    v_child, true, NULL, '00000000-0000-4000-8000-000000000012',
    v_boundary + interval '20 minutes'
  );
  IF v_result->>'status' IS DISTINCT FROM 'applied' THEN
    RAISE EXCEPTION 'newer re-enable failed: %', v_result;
  END IF;

  v_result := public.set_child_streak_enabled(
    v_child, false, '00000000-0000-4000-8000-000000000012', NULL,
    v_boundary + interval '15 minutes'
  );
  IF v_result->>'status' IS DISTINCT FROM 'stale' THEN
    RAISE EXCEPTION 'older disable overrode newer re-enable: %', v_result;
  END IF;

  v_result := public.reset_child_streak(
    v_child, '00000000-0000-4000-8000-000000000012',
    '00000000-0000-4000-8000-000000000013',
    v_boundary + interval '30 minutes'
  );
  IF v_result->>'status' IS DISTINCT FROM 'applied' THEN
    RAISE EXCEPTION 'reset failed: %', v_result;
  END IF;

  v_result := public.reset_child_streak(
    v_child, '00000000-0000-4000-8000-000000000012',
    '00000000-0000-4000-8000-000000000013',
    v_boundary + interval '30 minutes'
  );
  IF v_result->>'status' IS DISTINCT FROM 'no_op' THEN
    RAISE EXCEPTION 'exact reset retry was not idempotent: %', v_result;
  END IF;

  v_result := public.set_child_streak_enabled(
    v_child, false, '00000000-0000-4000-8000-000000000013', NULL,
    v_boundary + interval '30 minutes'
  );
  IF v_result->>'status' IS DISTINCT FROM 'stale'
    OR v_result->>'reason' IS DISTINCT FROM 'equal_timestamp_conflict' THEN
    RAISE EXCEPTION 'equal timestamp conflict replaced accepted reset: %', v_result;
  END IF;

  v_result := public.set_child_streak_enabled(
    v_child, true, NULL, '00000000-0000-4000-8000-000000000014',
    v_boundary + interval '25 minutes'
  );
  IF v_result->>'status' IS DISTINCT FROM 'stale' THEN
    RAISE EXCEPTION 'reset did not reject stale enable: %', v_result;
  END IF;

  IF (SELECT reset_at FROM public.child_streak_preferences WHERE child_id = v_child)
     IS DISTINCT FROM v_boundary + interval '30 minutes' THEN
    RAISE EXCEPTION 'reset_at moved backwards';
  END IF;
  IF (SELECT count(*) FROM public.child_streak_epochs
      WHERE child_id = v_child AND ended_at IS NULL) <> 1 THEN
    RAISE EXCEPTION 'more than one active epoch exists';
  END IF;
END;
$$;

RESET ROLE;

UPDATE public.children
SET deleted_at = now()
WHERE id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

SET ROLE authenticated;
SET request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
DO $$
DECLARE
  v_result jsonb;
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.child_streak_preferences
    WHERE child_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  ) THEN
    RAISE EXCEPTION 'soft-deleted child streak state remained visible through RLS';
  END IF;
  v_result := public.set_child_streak_reminder_participation(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', false
  );
  IF v_result->>'status' IS DISTINCT FROM 'rejected'
    OR v_result->>'reason' IS DISTINCT FROM 'child_not_owned' THEN
    RAISE EXCEPTION 'soft-deleted child accepted an RPC: %', v_result;
  END IF;
END;
$$;
RESET ROLE;

UPDATE public.children
SET deleted_at = NULL
WHERE id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

SET ROLE authenticated;
SET request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
DO $$
DECLARE
  v_result jsonb;
BEGIN
  v_result := public.set_child_streak_reminder_participation(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', false
  );
  IF v_result->>'status' IS DISTINCT FROM 'applied'
    AND v_result->>'status' IS DISTINCT FROM 'no_op' THEN
    RAISE EXCEPTION 'reactivated child did not regain owned RPC access: %', v_result;
  END IF;
END;
$$;
RESET ROLE;

-- Fixed-boundary child for timezone and boundary normalization tests.
INSERT INTO public.children(id, parent_id, name, created_at) VALUES (
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  '11111111-1111-4111-8111-111111111111',
  'Timezone child',
  '2026-01-01T00:00:00Z'
);

SET ROLE authenticated;
SET request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

DO $$
DECLARE
  v_child uuid := 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  v_epoch uuid;
  v_result jsonb;
BEGIN
  SELECT current_epoch_id INTO v_epoch
  FROM public.child_streak_preferences WHERE child_id = v_child;

  v_result := public.upsert_child_streak_day(
    v_child, v_epoch, '2026-03-08',
    'Africa/Kampala', '2026-03-07T22:30:00Z',
    'America/New_York', '2026-03-08T10:00:00Z',
    'game', 'tz-forward'
  );
  IF v_result->>'status' IS DISTINCT FROM 'applied' THEN
    RAISE EXCEPTION 'cross-timezone merge insert failed: %', v_result;
  END IF;

  v_result := public.upsert_child_streak_day(
    v_child, v_epoch, '2026-03-08',
    'America/New_York', '2026-03-08T10:00:00Z',
    'Africa/Kampala', '2026-03-07T22:30:00Z',
    'story', 'tz-reverse'
  );
  IF v_result->>'status' IS DISTINCT FROM 'applied' THEN
    RAISE EXCEPTION 'reverse timezone retry failed: %', v_result;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.child_streak_days day
    WHERE day.child_id = v_child
      AND day.local_date = '2026-03-08'
      AND day.first_completed_at = '2026-03-07T22:30:00Z'
      AND day.first_timezone = 'Africa/Kampala'
      AND day.last_completed_at = '2026-03-08T10:00:00Z'
      AND day.last_timezone = 'America/New_York'
  ) THEN
    RAISE EXCEPTION 'timezone pair was detached during merge';
  END IF;

  v_result := public.reset_child_streak(
    v_child, v_epoch, '00000000-0000-4000-8000-000000000021',
    '2026-03-08T08:00:00Z'
  );
  IF v_result->>'status' IS DISTINCT FROM 'applied' THEN
    RAISE EXCEPTION 'same-day boundary reset failed: %', v_result;
  END IF;

  -- The first pair maps to the wrong local date; the independently valid last
  -- pair must still qualify in the new epoch.
  v_result := public.upsert_child_streak_day(
    v_child, '00000000-0000-4000-8000-000000000021', '2026-03-08',
    'Africa/Kampala', '2026-03-08T22:30:00Z',
    'America/New_York', '2026-03-08T09:00:00Z',
    'game', 'boundary-last'
  );
  IF v_result->>'status' IS DISTINCT FROM 'applied' OR
     (v_result->'day'->>'first_completed_at')::timestamptz
       IS DISTINCT FROM '2026-03-08T09:00:00Z'::timestamptz OR
     (v_result->'day'->>'last_completed_at')::timestamptz
       IS DISTINCT FROM '2026-03-08T09:00:00Z'::timestamptz OR
     v_result->'day'->>'first_timezone' IS DISTINCT FROM 'America/New_York' OR
     v_result->'day'->>'last_timezone' IS DISTINCT FROM 'America/New_York' THEN
    RAISE EXCEPTION 'invalid first / valid last was not normalized: %', v_result;
  END IF;

  -- Both timestamps represent 31 December in their recorded zones even
  -- though the latter is already 1 January in UTC.
  v_result := public.upsert_child_streak_day(
    v_child, '00000000-0000-4000-8000-000000000021', '2026-12-31',
    'Africa/Kampala', '2026-12-30T21:30:00Z',
    'America/New_York', '2027-01-01T04:30:00Z',
    'story', 'year-boundary'
  );
  IF v_result->>'status' IS DISTINCT FROM 'applied' THEN
    RAISE EXCEPTION 'cross-timezone year-boundary day failed: %', v_result;
  END IF;

  -- First boundary is valid in the closed epoch; last is after the boundary.
  v_result := public.upsert_child_streak_day(
    v_child, v_epoch, '2026-03-08',
    'America/New_York', '2026-03-08T07:00:00Z',
    'America/New_York', '2026-03-08T09:00:00Z',
    'game', 'boundary-first'
  );
  IF v_result->>'status' IS DISTINCT FROM 'applied' OR
     (v_result->'day'->>'last_completed_at')::timestamptz
       IS DISTINCT FROM '2026-03-08T07:00:00Z'::timestamptz OR
     (v_result->'day'->>'last_completed_at')::timestamptz >= '2026-03-08T08:00:00Z' THEN
    RAISE EXCEPTION 'valid first / invalid last was not normalized: %', v_result;
  END IF;

  -- Neither boundary belongs to the closed epoch.
  v_result := public.upsert_child_streak_day(
    v_child, v_epoch, '2026-03-08',
    'America/New_York', '2026-03-08T08:00:00Z',
    'America/New_York', '2026-03-08T09:00:00Z',
    'game', 'boundary-none'
  );
  IF v_result->>'status' IS DISTINCT FROM 'rejected'
    OR v_result->>'reason' IS DISTINCT FROM 'no_valid_boundary' THEN
    RAISE EXCEPTION 'day with no valid boundary was accepted: %', v_result;
  END IF;
END;
$$;

RESET ROLE;

-- The deferred active-epoch reference must permit an atomic parent cascade.
DELETE FROM public.children WHERE id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.child_streak_preferences WHERE child_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc')
    OR EXISTS (SELECT 1 FROM public.child_streak_epochs WHERE child_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc')
    OR EXISTS (SELECT 1 FROM public.child_streak_days WHERE child_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc')
  THEN
    RAISE EXCEPTION 'child hard deletion left streak rows behind';
  END IF;
END;
$$;

BEGIN;
DO $$
DECLARE
  v_epoch uuid;
BEGIN
  SELECT current_epoch_id INTO v_epoch
  FROM public.child_streak_preferences
  WHERE child_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  DELETE FROM public.child_streak_epochs WHERE id = v_epoch;
  BEGIN
    SET CONSTRAINTS child_streak_preferences_current_epoch_fk IMMEDIATE;
    RAISE EXCEPTION 'independent deletion of referenced active epoch unexpectedly succeeded';
  EXCEPTION WHEN foreign_key_violation THEN
    NULL;
  END;
END;
$$;
ROLLBACK;

SELECT 'streak postgres assertions passed' AS result;
