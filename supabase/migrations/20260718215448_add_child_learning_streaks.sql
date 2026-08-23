-- One child-wide, language-independent learning streak with explicit epochs.
-- Client writes use guarded RPCs; direct table writes stay revoked.

BEGIN;

DO $$
DECLARE
  v_column text;
BEGIN
  IF to_regclass('public.children') IS NULL THEN
    RAISE EXCEPTION 'public.children is required before learning streaks';
  END IF;

  FOREACH v_column IN ARRAY ARRAY['id', 'parent_id', 'created_at', 'deleted_at'] LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_catalog.pg_attribute attribute
      WHERE attribute.attrelid = 'public.children'::regclass
        AND attribute.attname = v_column
        AND attribute.attnum > 0
        AND NOT attribute.attisdropped
    ) THEN
      RAISE EXCEPTION 'public.children.% is required before learning streaks', v_column;
    END IF;
  END LOOP;

  IF to_regprocedure('auth.uid()') IS NULL THEN
    RAISE EXCEPTION 'auth.uid() is required before learning streaks';
  END IF;
END;
$$;

CREATE TABLE public.child_streak_epochs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL
    REFERENCES public.children(id)
    ON DELETE CASCADE,
  started_at timestamp with time zone NOT NULL,
  ended_at timestamp with time zone,
  end_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT child_streak_epochs_end_reason_check
    CHECK (end_reason IS NULL OR end_reason IN ('reset', 'disabled', 'replaced')),
  CONSTRAINT child_streak_epochs_interval_check
    CHECK (ended_at IS NULL OR ended_at >= started_at),
  CONSTRAINT child_streak_epochs_child_id_id_unique UNIQUE (child_id, id)
);

CREATE TABLE public.child_streak_preferences (
  child_id uuid PRIMARY KEY
    REFERENCES public.children(id)
    ON DELETE CASCADE,
  streak_enabled boolean NOT NULL DEFAULT true,
  include_in_reminders boolean NOT NULL DEFAULT true,
  current_epoch_id uuid,
  reset_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT child_streak_preferences_current_epoch_fk
    FOREIGN KEY (child_id, current_epoch_id)
    REFERENCES public.child_streak_epochs(child_id, id)
    ON DELETE NO ACTION
    DEFERRABLE INITIALLY DEFERRED,
  CONSTRAINT child_streak_preferences_enabled_epoch_check
    CHECK (
      (streak_enabled AND current_epoch_id IS NOT NULL)
      OR (NOT streak_enabled AND current_epoch_id IS NULL)
    )
);

CREATE TABLE public.child_streak_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL
    REFERENCES public.children(id)
    ON DELETE CASCADE,
  streak_epoch_id uuid NOT NULL,
  local_date date NOT NULL,
  first_completed_at timestamp with time zone NOT NULL,
  first_timezone text NOT NULL CHECK (length(btrim(first_timezone)) BETWEEN 1 AND 100),
  last_completed_at timestamp with time zone NOT NULL,
  last_timezone text NOT NULL CHECK (length(btrim(last_timezone)) BETWEEN 1 AND 100),
  source_type text NOT NULL,
  source_ref text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT child_streak_days_epoch_fk
    FOREIGN KEY (child_id, streak_epoch_id)
    REFERENCES public.child_streak_epochs(child_id, id)
    ON DELETE CASCADE,
  CONSTRAINT child_streak_days_child_epoch_date_unique
    UNIQUE (child_id, streak_epoch_id, local_date),
  CONSTRAINT child_streak_days_source_type_check
    CHECK (source_type IN ('learning_hub', 'game', 'story', 'coloring')),
  CONSTRAINT child_streak_days_completion_order_check
    CHECK (last_completed_at >= first_completed_at),
  CONSTRAINT child_streak_days_source_ref_length_check
    CHECK (source_ref IS NULL OR length(source_ref) <= 128)
);

CREATE UNIQUE INDEX child_streak_epochs_one_active_per_child_idx
  ON public.child_streak_epochs(child_id)
  WHERE ended_at IS NULL;

CREATE INDEX child_streak_epochs_child_started_at_idx
  ON public.child_streak_epochs(child_id, started_at DESC);

CREATE INDEX child_streak_days_child_local_date_idx
  ON public.child_streak_days(child_id, local_date DESC);

CREATE INDEX child_streak_days_epoch_local_date_idx
  ON public.child_streak_days(streak_epoch_id, local_date DESC);

CREATE OR REPLACE FUNCTION public.set_child_streak_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_child_streak_epochs_updated_at
BEFORE UPDATE ON public.child_streak_epochs
FOR EACH ROW EXECUTE FUNCTION public.set_child_streak_updated_at();

CREATE TRIGGER set_child_streak_preferences_updated_at
BEFORE UPDATE ON public.child_streak_preferences
FOR EACH ROW EXECUTE FUNCTION public.set_child_streak_updated_at();

CREATE TRIGGER set_child_streak_days_updated_at
BEFORE UPDATE ON public.child_streak_days
FOR EACH ROW EXECUTE FUNCTION public.set_child_streak_updated_at();

ALTER TABLE public.child_streak_epochs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.child_streak_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.child_streak_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY child_streak_epochs_parent_select
ON public.child_streak_epochs
FOR SELECT
TO authenticated
USING (
  (SELECT auth.uid()) IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.children child
    WHERE child.id = child_streak_epochs.child_id
      AND child.parent_id = (SELECT auth.uid())
      AND child.deleted_at IS NULL
  )
);

CREATE POLICY child_streak_preferences_parent_select
ON public.child_streak_preferences
FOR SELECT
TO authenticated
USING (
  (SELECT auth.uid()) IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.children child
    WHERE child.id = child_streak_preferences.child_id
      AND child.parent_id = (SELECT auth.uid())
      AND child.deleted_at IS NULL
  )
);

CREATE POLICY child_streak_days_parent_select
ON public.child_streak_days
FOR SELECT
TO authenticated
USING (
  (SELECT auth.uid()) IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.children child
    WHERE child.id = child_streak_days.child_id
      AND child.parent_id = (SELECT auth.uid())
      AND child.deleted_at IS NULL
  )
);

REVOKE ALL ON public.child_streak_epochs FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.child_streak_preferences FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.child_streak_days FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.child_streak_epochs TO authenticated;
GRANT SELECT ON public.child_streak_preferences TO authenticated;
GRANT SELECT ON public.child_streak_days TO authenticated;

-- Internal response helper. The semantic boundary stays in reset_at and the
-- epoch interval; updated_at remains server acceptance metadata.
CREATE OR REPLACE FUNCTION public.child_streak_state_result(
  p_child_id uuid,
  p_status text,
  p_reason text DEFAULT NULL,
  p_affected_epoch_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'status', p_status,
    'reason', p_reason,
    'preferences', (
      SELECT to_jsonb(preference)
      FROM public.child_streak_preferences preference
      WHERE preference.child_id = p_child_id
    ),
    'current_epoch', (
      SELECT to_jsonb(epoch)
      FROM public.child_streak_preferences preference
      JOIN public.child_streak_epochs epoch
        ON epoch.child_id = preference.child_id
       AND epoch.id = preference.current_epoch_id
      WHERE preference.child_id = p_child_id
    ),
    'affected_epoch', (
      SELECT to_jsonb(epoch)
      FROM public.child_streak_epochs epoch
      WHERE epoch.child_id = p_child_id
        AND epoch.id = p_affected_epoch_id
    )
  );
$$;

-- Closing an epoch can bisect a previously accepted same-day aggregate. Keep
-- only real supplied boundaries inside [started_at, ended_at); never invent a
-- completion and never bridge the closed epoch.
CREATE OR REPLACE FUNCTION public.normalize_child_streak_epoch_days(
  p_child_id uuid,
  p_epoch_id uuid
)
RETURNS void
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_epoch public.child_streak_epochs%ROWTYPE;
BEGIN
  SELECT * INTO STRICT v_epoch
  FROM public.child_streak_epochs epoch
  WHERE epoch.child_id = p_child_id
    AND epoch.id = p_epoch_id;

  IF v_epoch.ended_at IS NULL THEN
    RETURN;
  END IF;

  DELETE FROM public.child_streak_days day
  WHERE day.child_id = p_child_id
    AND day.streak_epoch_id = p_epoch_id
    AND NOT (
      day.first_completed_at >= v_epoch.started_at
      AND day.first_completed_at < v_epoch.ended_at
    )
    AND NOT (
      day.last_completed_at >= v_epoch.started_at
      AND day.last_completed_at < v_epoch.ended_at
    );

  UPDATE public.child_streak_days day
  SET first_completed_at = day.last_completed_at,
      first_timezone = day.last_timezone
  WHERE day.child_id = p_child_id
    AND day.streak_epoch_id = p_epoch_id
    AND NOT (
      day.first_completed_at >= v_epoch.started_at
      AND day.first_completed_at < v_epoch.ended_at
    )
    AND day.last_completed_at >= v_epoch.started_at
    AND day.last_completed_at < v_epoch.ended_at;

  UPDATE public.child_streak_days day
  SET last_completed_at = day.first_completed_at,
      last_timezone = day.first_timezone
  WHERE day.child_id = p_child_id
    AND day.streak_epoch_id = p_epoch_id
    AND day.first_completed_at >= v_epoch.started_at
    AND day.first_completed_at < v_epoch.ended_at
    AND NOT (
      day.last_completed_at >= v_epoch.started_at
      AND day.last_completed_at < v_epoch.ended_at
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_child_streak_state(
  p_child_id uuid,
  p_epoch_id uuid,
  p_started_at timestamp with time zone
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_owner uuid;
  v_deleted_at timestamp with time zone;
  v_preferences public.child_streak_preferences%ROWTYPE;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RETURN jsonb_build_object('status', 'rejected', 'reason', 'not_authenticated');
  END IF;
  IF p_child_id IS NULL OR p_epoch_id IS NULL OR p_started_at IS NULL THEN
    RETURN jsonb_build_object('status', 'rejected', 'reason', 'invalid_input');
  END IF;

  SELECT child.parent_id, child.deleted_at
  INTO v_owner, v_deleted_at
  FROM public.children child
  WHERE child.id = p_child_id
  FOR UPDATE;
  IF NOT FOUND OR v_owner IS DISTINCT FROM (SELECT auth.uid()) OR v_deleted_at IS NOT NULL THEN
    RETURN jsonb_build_object('status', 'rejected', 'reason', 'child_not_owned');
  END IF;

  SELECT * INTO v_preferences
  FROM public.child_streak_preferences preference
  WHERE preference.child_id = p_child_id
  FOR UPDATE;
  IF FOUND THEN
    RETURN public.child_streak_state_result(p_child_id, 'no_op', 'already_initialized');
  END IF;

  IF EXISTS (SELECT 1 FROM public.child_streak_epochs epoch WHERE epoch.id = p_epoch_id) THEN
    RETURN jsonb_build_object('status', 'rejected', 'reason', 'epoch_id_conflict');
  END IF;

  INSERT INTO public.child_streak_epochs(id, child_id, started_at)
  VALUES (p_epoch_id, p_child_id, p_started_at);

  INSERT INTO public.child_streak_preferences(
    child_id, streak_enabled, include_in_reminders, current_epoch_id, reset_at
  ) VALUES (p_child_id, true, true, p_epoch_id, p_started_at);

  RETURN public.child_streak_state_result(p_child_id, 'applied', 'initialized');
END;
$$;

CREATE OR REPLACE FUNCTION public.set_child_streak_enabled(
  p_child_id uuid,
  p_enabled boolean,
  p_expected_epoch_id uuid,
  p_new_epoch_id uuid,
  p_occurred_at timestamp with time zone
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_owner uuid;
  v_deleted_at timestamp with time zone;
  v_preferences public.child_streak_preferences%ROWTYPE;
  v_epoch public.child_streak_epochs%ROWTYPE;
  v_exact_retry boolean := false;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RETURN jsonb_build_object('status', 'rejected', 'reason', 'not_authenticated');
  END IF;
  IF p_child_id IS NULL OR p_enabled IS NULL OR p_occurred_at IS NULL THEN
    RETURN jsonb_build_object('status', 'rejected', 'reason', 'invalid_input');
  END IF;

  SELECT child.parent_id, child.deleted_at
  INTO v_owner, v_deleted_at
  FROM public.children child
  WHERE child.id = p_child_id
  FOR UPDATE;
  IF NOT FOUND OR v_owner IS DISTINCT FROM (SELECT auth.uid()) OR v_deleted_at IS NOT NULL THEN
    RETURN jsonb_build_object('status', 'rejected', 'reason', 'child_not_owned');
  END IF;

  SELECT * INTO v_preferences
  FROM public.child_streak_preferences preference
  WHERE preference.child_id = p_child_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'rejected', 'reason', 'missing_preferences');
  END IF;

  IF p_occurred_at < v_preferences.reset_at THEN
    RETURN public.child_streak_state_result(
      p_child_id, 'stale', 'occurred_before_reset_at', p_expected_epoch_id
    );
  END IF;

  IF p_occurred_at = v_preferences.reset_at THEN
    IF p_enabled AND p_new_epoch_id IS NOT NULL THEN
      SELECT EXISTS (
        SELECT 1 FROM public.child_streak_epochs epoch
        WHERE epoch.child_id = p_child_id
          AND epoch.id = p_new_epoch_id
          AND epoch.started_at = p_occurred_at
          AND epoch.ended_at IS NULL
          AND v_preferences.streak_enabled
          AND v_preferences.current_epoch_id = p_new_epoch_id
      ) INTO v_exact_retry;
    ELSIF NOT p_enabled AND p_expected_epoch_id IS NOT NULL THEN
      SELECT EXISTS (
        SELECT 1 FROM public.child_streak_epochs epoch
        WHERE epoch.child_id = p_child_id
          AND epoch.id = p_expected_epoch_id
          AND epoch.ended_at = p_occurred_at
          AND epoch.end_reason = 'disabled'
          AND NOT v_preferences.streak_enabled
          AND v_preferences.current_epoch_id IS NULL
      ) INTO v_exact_retry;
    END IF;

    RETURN public.child_streak_state_result(
      p_child_id,
      CASE WHEN v_exact_retry THEN 'no_op' ELSE 'stale' END,
      CASE WHEN v_exact_retry THEN 'idempotent_retry' ELSE 'equal_timestamp_conflict' END,
      p_expected_epoch_id
    );
  END IF;

  IF p_enabled THEN
    IF v_preferences.streak_enabled
      OR v_preferences.current_epoch_id IS NOT NULL
      OR p_expected_epoch_id IS NOT NULL
    THEN
      RETURN public.child_streak_state_result(
        p_child_id, 'rejected', 'current_state_mismatch', v_preferences.current_epoch_id
      );
    END IF;
    IF p_new_epoch_id IS NULL THEN
      RETURN public.child_streak_state_result(p_child_id, 'rejected', 'missing_new_epoch');
    END IF;
    IF EXISTS (SELECT 1 FROM public.child_streak_epochs epoch WHERE epoch.id = p_new_epoch_id) THEN
      RETURN public.child_streak_state_result(p_child_id, 'rejected', 'epoch_id_conflict');
    END IF;

    INSERT INTO public.child_streak_epochs(id, child_id, started_at)
    VALUES (p_new_epoch_id, p_child_id, p_occurred_at);

    UPDATE public.child_streak_preferences
    SET streak_enabled = true,
        current_epoch_id = p_new_epoch_id,
        reset_at = p_occurred_at
    WHERE child_id = p_child_id;

    RETURN public.child_streak_state_result(p_child_id, 'applied', 'enabled');
  END IF;

  IF NOT v_preferences.streak_enabled
    OR v_preferences.current_epoch_id IS NULL
    OR v_preferences.current_epoch_id IS DISTINCT FROM p_expected_epoch_id
  THEN
    RETURN public.child_streak_state_result(
      p_child_id, 'stale', 'expected_epoch_mismatch', v_preferences.current_epoch_id
    );
  END IF;

  SELECT * INTO v_epoch
  FROM public.child_streak_epochs epoch
  WHERE epoch.child_id = p_child_id
    AND epoch.id = v_preferences.current_epoch_id
  FOR UPDATE;
  IF NOT FOUND OR v_epoch.ended_at IS NOT NULL THEN
    RETURN public.child_streak_state_result(
      p_child_id, 'stale', 'epoch_not_active', v_preferences.current_epoch_id
    );
  END IF;
  IF p_occurred_at < v_epoch.started_at THEN
    RETURN public.child_streak_state_result(
      p_child_id, 'rejected', 'occurred_before_epoch', v_preferences.current_epoch_id
    );
  END IF;

  UPDATE public.child_streak_epochs
  SET ended_at = p_occurred_at,
      end_reason = 'disabled'
  WHERE child_id = p_child_id AND id = v_preferences.current_epoch_id;
  PERFORM public.normalize_child_streak_epoch_days(p_child_id, v_preferences.current_epoch_id);

  UPDATE public.child_streak_preferences
  SET streak_enabled = false,
      current_epoch_id = NULL,
      reset_at = p_occurred_at
  WHERE child_id = p_child_id;

  RETURN public.child_streak_state_result(
    p_child_id, 'applied', 'disabled', p_expected_epoch_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.reset_child_streak(
  p_child_id uuid,
  p_expected_epoch_id uuid,
  p_new_epoch_id uuid,
  p_occurred_at timestamp with time zone
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_owner uuid;
  v_deleted_at timestamp with time zone;
  v_preferences public.child_streak_preferences%ROWTYPE;
  v_epoch public.child_streak_epochs%ROWTYPE;
  v_exact_retry boolean := false;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RETURN jsonb_build_object('status', 'rejected', 'reason', 'not_authenticated');
  END IF;
  IF p_child_id IS NULL OR p_expected_epoch_id IS NULL
    OR p_new_epoch_id IS NULL OR p_occurred_at IS NULL
  THEN
    RETURN jsonb_build_object('status', 'rejected', 'reason', 'invalid_input');
  END IF;

  SELECT child.parent_id, child.deleted_at
  INTO v_owner, v_deleted_at
  FROM public.children child
  WHERE child.id = p_child_id
  FOR UPDATE;
  IF NOT FOUND OR v_owner IS DISTINCT FROM (SELECT auth.uid()) OR v_deleted_at IS NOT NULL THEN
    RETURN jsonb_build_object('status', 'rejected', 'reason', 'child_not_owned');
  END IF;

  SELECT * INTO v_preferences
  FROM public.child_streak_preferences preference
  WHERE preference.child_id = p_child_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'rejected', 'reason', 'missing_preferences');
  END IF;

  IF p_occurred_at < v_preferences.reset_at THEN
    RETURN public.child_streak_state_result(
      p_child_id, 'stale', 'occurred_before_reset_at', p_expected_epoch_id
    );
  END IF;

  IF p_occurred_at = v_preferences.reset_at THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.child_streak_epochs old_epoch
      JOIN public.child_streak_epochs new_epoch
        ON new_epoch.child_id = old_epoch.child_id
      WHERE old_epoch.child_id = p_child_id
        AND old_epoch.id = p_expected_epoch_id
        AND old_epoch.ended_at = p_occurred_at
        AND old_epoch.end_reason = 'reset'
        AND new_epoch.id = p_new_epoch_id
        AND new_epoch.started_at = p_occurred_at
        AND new_epoch.ended_at IS NULL
        AND v_preferences.streak_enabled
        AND v_preferences.current_epoch_id = p_new_epoch_id
    ) INTO v_exact_retry;

    RETURN public.child_streak_state_result(
      p_child_id,
      CASE WHEN v_exact_retry THEN 'no_op' ELSE 'stale' END,
      CASE WHEN v_exact_retry THEN 'idempotent_retry' ELSE 'equal_timestamp_conflict' END,
      p_expected_epoch_id
    );
  END IF;

  IF NOT v_preferences.streak_enabled
    OR v_preferences.current_epoch_id IS NULL
    OR v_preferences.current_epoch_id IS DISTINCT FROM p_expected_epoch_id
  THEN
    RETURN public.child_streak_state_result(
      p_child_id, 'stale', 'expected_epoch_mismatch', v_preferences.current_epoch_id
    );
  END IF;

  SELECT * INTO v_epoch
  FROM public.child_streak_epochs epoch
  WHERE epoch.child_id = p_child_id
    AND epoch.id = p_expected_epoch_id
  FOR UPDATE;
  IF NOT FOUND OR v_epoch.ended_at IS NOT NULL THEN
    RETURN public.child_streak_state_result(
      p_child_id, 'stale', 'epoch_not_active', p_expected_epoch_id
    );
  END IF;
  IF p_occurred_at < v_epoch.started_at THEN
    RETURN public.child_streak_state_result(
      p_child_id, 'rejected', 'occurred_before_epoch', p_expected_epoch_id
    );
  END IF;
  IF EXISTS (SELECT 1 FROM public.child_streak_epochs epoch WHERE epoch.id = p_new_epoch_id) THEN
    RETURN public.child_streak_state_result(p_child_id, 'rejected', 'epoch_id_conflict');
  END IF;

  UPDATE public.child_streak_epochs
  SET ended_at = p_occurred_at,
      end_reason = 'reset'
  WHERE child_id = p_child_id AND id = p_expected_epoch_id;
  PERFORM public.normalize_child_streak_epoch_days(p_child_id, p_expected_epoch_id);

  INSERT INTO public.child_streak_epochs(id, child_id, started_at)
  VALUES (p_new_epoch_id, p_child_id, p_occurred_at);

  UPDATE public.child_streak_preferences
  SET current_epoch_id = p_new_epoch_id,
      reset_at = p_occurred_at
  WHERE child_id = p_child_id;

  RETURN public.child_streak_state_result(
    p_child_id, 'applied', 'reset', p_expected_epoch_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.set_child_streak_reminder_participation(
  p_child_id uuid,
  p_include_in_reminders boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_owner uuid;
  v_deleted_at timestamp with time zone;
  v_preferences public.child_streak_preferences%ROWTYPE;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RETURN jsonb_build_object('status', 'rejected', 'reason', 'not_authenticated');
  END IF;
  IF p_child_id IS NULL OR p_include_in_reminders IS NULL THEN
    RETURN jsonb_build_object('status', 'rejected', 'reason', 'invalid_input');
  END IF;

  SELECT child.parent_id, child.deleted_at
  INTO v_owner, v_deleted_at
  FROM public.children child
  WHERE child.id = p_child_id
  FOR UPDATE;
  IF NOT FOUND OR v_owner IS DISTINCT FROM (SELECT auth.uid()) OR v_deleted_at IS NOT NULL THEN
    RETURN jsonb_build_object('status', 'rejected', 'reason', 'child_not_owned');
  END IF;

  SELECT * INTO v_preferences
  FROM public.child_streak_preferences preference
  WHERE preference.child_id = p_child_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'rejected', 'reason', 'missing_preferences');
  END IF;
  IF v_preferences.include_in_reminders = p_include_in_reminders THEN
    RETURN public.child_streak_state_result(
      p_child_id, 'no_op', 'idempotent_retry', v_preferences.current_epoch_id
    );
  END IF;

  UPDATE public.child_streak_preferences
  SET include_in_reminders = p_include_in_reminders
  WHERE child_id = p_child_id;

  RETURN public.child_streak_state_result(
    p_child_id, 'applied', 'reminder_participation_updated'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_child_streak_day(
  p_child_id uuid,
  p_epoch_id uuid,
  p_local_date date,
  p_first_timezone text,
  p_first_completed_at timestamp with time zone,
  p_last_timezone text,
  p_last_completed_at timestamp with time zone,
  p_source_type text,
  p_source_ref text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_owner uuid;
  v_deleted_at timestamp with time zone;
  v_preferences public.child_streak_preferences%ROWTYPE;
  v_epoch public.child_streak_epochs%ROWTYPE;
  v_first_valid boolean;
  v_last_valid boolean;
  v_normalized_first_at timestamp with time zone;
  v_normalized_first_timezone text;
  v_normalized_last_at timestamp with time zone;
  v_normalized_last_timezone text;
  v_day jsonb;
  v_inserted boolean;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RETURN jsonb_build_object('status', 'rejected', 'reason', 'not_authenticated');
  END IF;
  IF p_child_id IS NULL
    OR p_epoch_id IS NULL
    OR p_local_date IS NULL
    OR p_first_timezone IS NULL
    OR length(btrim(p_first_timezone)) NOT BETWEEN 1 AND 100
    OR p_first_completed_at IS NULL
    OR p_last_timezone IS NULL
    OR length(btrim(p_last_timezone)) NOT BETWEEN 1 AND 100
    OR p_last_completed_at IS NULL
    OR p_source_type NOT IN ('learning_hub', 'game', 'story', 'coloring')
    OR (p_source_ref IS NOT NULL AND length(p_source_ref) > 128)
  THEN
    RETURN jsonb_build_object('status', 'rejected', 'reason', 'invalid_input');
  END IF;

  SELECT child.parent_id, child.deleted_at
  INTO v_owner, v_deleted_at
  FROM public.children child
  WHERE child.id = p_child_id
  FOR UPDATE;
  IF NOT FOUND OR v_owner IS DISTINCT FROM (SELECT auth.uid()) OR v_deleted_at IS NOT NULL THEN
    RETURN jsonb_build_object('status', 'rejected', 'reason', 'child_not_owned');
  END IF;

  SELECT * INTO v_preferences
  FROM public.child_streak_preferences preference
  WHERE preference.child_id = p_child_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'rejected', 'reason', 'missing_preferences');
  END IF;

  SELECT * INTO v_epoch
  FROM public.child_streak_epochs epoch
  WHERE epoch.child_id = p_child_id AND epoch.id = p_epoch_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'stale', 'reason', 'unknown_epoch');
  END IF;

  IF v_epoch.ended_at IS NULL AND (
    NOT v_preferences.streak_enabled
    OR v_preferences.current_epoch_id IS DISTINCT FROM p_epoch_id
  ) THEN
    RETURN jsonb_build_object('status', 'stale', 'reason', 'epoch_not_current');
  END IF;

  BEGIN
    v_first_valid :=
      (p_first_completed_at AT TIME ZONE p_first_timezone)::date = p_local_date
      AND p_first_completed_at >= v_epoch.started_at
      AND (v_epoch.ended_at IS NULL OR p_first_completed_at < v_epoch.ended_at)
      AND (
        v_preferences.current_epoch_id IS DISTINCT FROM p_epoch_id
        OR p_first_completed_at >= v_preferences.reset_at
      );
  EXCEPTION WHEN invalid_parameter_value THEN
    v_first_valid := false;
  END;

  BEGIN
    v_last_valid :=
      (p_last_completed_at AT TIME ZONE p_last_timezone)::date = p_local_date
      AND p_last_completed_at >= v_epoch.started_at
      AND (v_epoch.ended_at IS NULL OR p_last_completed_at < v_epoch.ended_at)
      AND (
        v_preferences.current_epoch_id IS DISTINCT FROM p_epoch_id
        OR p_last_completed_at >= v_preferences.reset_at
      );
  EXCEPTION WHEN invalid_parameter_value THEN
    v_last_valid := false;
  END;

  IF NOT v_first_valid AND NOT v_last_valid THEN
    RETURN jsonb_build_object('status', 'rejected', 'reason', 'no_valid_boundary');
  ELSIF v_first_valid AND NOT v_last_valid THEN
    v_normalized_first_at := p_first_completed_at;
    v_normalized_first_timezone := p_first_timezone;
    v_normalized_last_at := p_first_completed_at;
    v_normalized_last_timezone := p_first_timezone;
  ELSIF NOT v_first_valid AND v_last_valid THEN
    v_normalized_first_at := p_last_completed_at;
    v_normalized_first_timezone := p_last_timezone;
    v_normalized_last_at := p_last_completed_at;
    v_normalized_last_timezone := p_last_timezone;
  ELSIF p_first_completed_at <= p_last_completed_at THEN
    v_normalized_first_at := p_first_completed_at;
    v_normalized_first_timezone := p_first_timezone;
    v_normalized_last_at := p_last_completed_at;
    v_normalized_last_timezone := p_last_timezone;
  ELSE
    v_normalized_first_at := p_last_completed_at;
    v_normalized_first_timezone := p_last_timezone;
    v_normalized_last_at := p_first_completed_at;
    v_normalized_last_timezone := p_first_timezone;
  END IF;

  INSERT INTO public.child_streak_days AS streak_day(
    child_id,
    streak_epoch_id,
    local_date,
    first_completed_at,
    first_timezone,
    last_completed_at,
    last_timezone,
    source_type,
    source_ref
  ) VALUES (
    p_child_id,
    p_epoch_id,
    p_local_date,
    v_normalized_first_at,
    v_normalized_first_timezone,
    v_normalized_last_at,
    v_normalized_last_timezone,
    p_source_type,
    p_source_ref
  )
  ON CONFLICT (child_id, streak_epoch_id, local_date)
  DO UPDATE SET
    first_completed_at = CASE
      WHEN EXCLUDED.first_completed_at < streak_day.first_completed_at
        THEN EXCLUDED.first_completed_at
      ELSE streak_day.first_completed_at
    END,
    first_timezone = CASE
      WHEN EXCLUDED.first_completed_at < streak_day.first_completed_at
        THEN EXCLUDED.first_timezone
      ELSE streak_day.first_timezone
    END,
    last_completed_at = CASE
      WHEN EXCLUDED.last_completed_at > streak_day.last_completed_at
        THEN EXCLUDED.last_completed_at
      ELSE streak_day.last_completed_at
    END,
    last_timezone = CASE
      WHEN EXCLUDED.last_completed_at > streak_day.last_completed_at
        THEN EXCLUDED.last_timezone
      ELSE streak_day.last_timezone
    END
  RETURNING (xmax = 0), to_jsonb(streak_day)
  INTO v_inserted, v_day;

  RETURN jsonb_build_object(
    'status', 'applied',
    'operation', CASE WHEN v_inserted THEN 'inserted' ELSE 'updated' END,
    'inserted', v_inserted,
    'day', v_day
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.initialize_child_streak_after_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_epoch_id uuid := gen_random_uuid();
  v_started_at timestamp with time zone := COALESCE(NEW.created_at, now());
BEGIN
  INSERT INTO public.child_streak_epochs(id, child_id, started_at)
  VALUES (v_epoch_id, NEW.id, v_started_at);
  INSERT INTO public.child_streak_preferences(
    child_id, streak_enabled, include_in_reminders, current_epoch_id, reset_at
  ) VALUES (NEW.id, true, true, v_epoch_id, v_started_at);
  RETURN NEW;
END;
$$;

CREATE TRIGGER initialize_child_streak_on_insert
AFTER INSERT ON public.children
FOR EACH ROW EXECUTE FUNCTION public.initialize_child_streak_after_insert();

-- Existing active children become eligible at this feature-launch transaction,
-- never at their historical profile creation time. No historical days exist.
WITH launch_boundary AS MATERIALIZED (
  SELECT transaction_timestamp() AS launched_at
), missing_children AS MATERIALIZED (
  SELECT child.id AS child_id,
         gen_random_uuid() AS epoch_id,
         launch_boundary.launched_at AS started_at
  FROM public.children child
  CROSS JOIN launch_boundary
  WHERE child.deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.child_streak_preferences preference
      WHERE preference.child_id = child.id
    )
), inserted_epochs AS (
  INSERT INTO public.child_streak_epochs(id, child_id, started_at)
  SELECT epoch_id, child_id, started_at
  FROM missing_children
  RETURNING child_id, id, started_at
)
INSERT INTO public.child_streak_preferences(
  child_id, streak_enabled, include_in_reminders, current_epoch_id, reset_at
)
SELECT child_id, true, true, id, started_at
FROM inserted_epochs;

REVOKE ALL ON FUNCTION public.child_streak_state_result(uuid, text, text, uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.normalize_child_streak_epoch_days(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_child_streak_state(uuid, uuid, timestamp with time zone)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_child_streak_enabled(uuid, boolean, uuid, uuid, timestamp with time zone)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reset_child_streak(uuid, uuid, uuid, timestamp with time zone)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_child_streak_reminder_participation(uuid, boolean)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.upsert_child_streak_day(uuid, uuid, date, text, timestamp with time zone, text, timestamp with time zone, text, text)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_child_streak_state(uuid, uuid, timestamp with time zone)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_child_streak_enabled(uuid, boolean, uuid, uuid, timestamp with time zone)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_child_streak(uuid, uuid, uuid, timestamp with time zone)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_child_streak_reminder_participation(uuid, boolean)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_child_streak_day(uuid, uuid, date, text, timestamp with time zone, text, timestamp with time zone, text, text)
  TO authenticated;

REVOKE EXECUTE ON FUNCTION public.set_child_streak_updated_at()
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.initialize_child_streak_after_insert()
  FROM PUBLIC, anon, authenticated;

COMMENT ON TABLE public.child_streak_preferences IS
  'Per-child streak and reminder-participation preferences. Device notification permission and identifiers are never stored here.';
COMMENT ON TABLE public.child_streak_epochs IS
  'Reset and enable boundaries for a child-wide learning streak. Intervals are half-open and history is retained.';
COMMENT ON TABLE public.child_streak_days IS
  'One qualified local date per child and epoch. Each timestamp is atomically paired with its validating IANA timezone.';
COMMENT ON COLUMN public.child_streak_preferences.reset_at IS
  'Monotonic semantic occurrence boundary for initialization, reset, disable, and re-enable transitions.';

COMMIT;
