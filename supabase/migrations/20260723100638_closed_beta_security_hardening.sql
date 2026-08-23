-- Closed-beta security and publication hardening.
--
-- This migration is intentionally safe to prepare without applying remotely.
-- It closes the four live RLS gaps observed on 2026-07-23, replaces broad
-- Data API grants with least-privilege grants, restricts SECURITY DEFINER
-- helpers to their intended roles, scopes earned achievements by learning
-- language, protects progress identity columns, and withdraws content that
-- was accidentally marked published.

BEGIN;

-- All content that could award an achievement before this migration was
-- Luganda-only. Preserve those existing awards under that exact language,
-- then require every new award to name its language explicitly.
ALTER TABLE public.child_achievements
ADD COLUMN language_code text;

UPDATE public.child_achievements
SET language_code = 'lg'
WHERE language_code IS NULL;

ALTER TABLE public.child_achievements
ALTER COLUMN language_code SET NOT NULL;

ALTER TABLE public.child_achievements
ADD CONSTRAINT child_achievements_language_code_fkey
FOREIGN KEY (language_code)
REFERENCES public.languages(code)
ON UPDATE CASCADE
ON DELETE RESTRICT;

ALTER TABLE public.child_achievements
DROP CONSTRAINT child_achievements_unique_child_achievement;

ALTER TABLE public.child_achievements
ADD CONSTRAINT child_achievements_unique_child_language_achievement
UNIQUE (child_id, language_code, achievement_id);

ALTER TABLE public.languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.child_achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS languages_reference_select ON public.languages;
CREATE POLICY languages_reference_select
ON public.languages
FOR SELECT
TO anon, authenticated
USING (is_active = true);

DROP POLICY IF EXISTS achievements_authenticated_select ON public.achievements;
CREATE POLICY achievements_authenticated_select
ON public.achievements
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS activities_parent_select ON public.activities;
CREATE POLICY activities_parent_select
ON public.activities
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.children AS child
    WHERE child.id = activities.child_id
      AND child.parent_id = (SELECT auth.uid())
      AND child.deleted_at IS NULL
  )
);

DROP POLICY IF EXISTS activities_parent_insert ON public.activities;
CREATE POLICY activities_parent_insert
ON public.activities
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.children AS child
    WHERE child.id = activities.child_id
      AND child.parent_id = (SELECT auth.uid())
      AND child.deleted_at IS NULL
  )
);

DROP POLICY IF EXISTS child_achievements_parent_select ON public.child_achievements;
CREATE POLICY child_achievements_parent_select
ON public.child_achievements
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.children AS child
    WHERE child.id = child_achievements.child_id
      AND child.parent_id = (SELECT auth.uid())
      AND child.deleted_at IS NULL
  )
);

DROP POLICY IF EXISTS child_achievements_parent_insert ON public.child_achievements;
CREATE POLICY child_achievements_parent_insert
ON public.child_achievements
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.children AS child
    WHERE child.id = child_achievements.child_id
      AND child.parent_id = (SELECT auth.uid())
      AND child.deleted_at IS NULL
  )
);

-- Recreate older policies with explicit roles and one auth.uid() init plan.
DROP POLICY IF EXISTS children_parent_select ON public.children;
CREATE POLICY children_parent_select
ON public.children
FOR SELECT
TO authenticated
USING (parent_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS children_parent_insert ON public.children;
CREATE POLICY children_parent_insert
ON public.children
FOR INSERT
TO authenticated
WITH CHECK (parent_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS children_parent_update ON public.children;
CREATE POLICY children_parent_update
ON public.children
FOR UPDATE
TO authenticated
USING (parent_id = (SELECT auth.uid()))
WITH CHECK (parent_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS child_activity_progress_parent_select
ON public.child_activity_progress;
CREATE POLICY child_activity_progress_parent_select
ON public.child_activity_progress
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.children AS child
    WHERE child.id = child_activity_progress.child_id
      AND child.parent_id = (SELECT auth.uid())
      AND child.deleted_at IS NULL
  )
);

DROP POLICY IF EXISTS child_activity_progress_parent_insert
ON public.child_activity_progress;
CREATE POLICY child_activity_progress_parent_insert
ON public.child_activity_progress
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.children AS child
    WHERE child.id = child_activity_progress.child_id
      AND child.parent_id = (SELECT auth.uid())
      AND child.deleted_at IS NULL
  )
);

DROP POLICY IF EXISTS child_activity_progress_parent_update
ON public.child_activity_progress;
CREATE POLICY child_activity_progress_parent_update
ON public.child_activity_progress
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.children AS child
    WHERE child.id = child_activity_progress.child_id
      AND child.parent_id = (SELECT auth.uid())
      AND child.deleted_at IS NULL
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.children AS child
    WHERE child.id = child_activity_progress.child_id
      AND child.parent_id = (SELECT auth.uid())
      AND child.deleted_at IS NULL
  )
);

DROP POLICY IF EXISTS child_stage_progress_parent_select
ON public.child_stage_progress;
CREATE POLICY child_stage_progress_parent_select
ON public.child_stage_progress
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.children AS child
    WHERE child.id = child_stage_progress.child_id
      AND child.parent_id = (SELECT auth.uid())
      AND child.deleted_at IS NULL
  )
);

DROP POLICY IF EXISTS child_stage_progress_parent_insert
ON public.child_stage_progress;
CREATE POLICY child_stage_progress_parent_insert
ON public.child_stage_progress
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.children AS child
    WHERE child.id = child_stage_progress.child_id
      AND child.parent_id = (SELECT auth.uid())
      AND child.deleted_at IS NULL
  )
);

DROP POLICY IF EXISTS child_stage_progress_parent_update
ON public.child_stage_progress;
CREATE POLICY child_stage_progress_parent_update
ON public.child_stage_progress
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.children AS child
    WHERE child.id = child_stage_progress.child_id
      AND child.parent_id = (SELECT auth.uid())
      AND child.deleted_at IS NULL
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.children AS child
    WHERE child.id = child_stage_progress.child_id
      AND child.parent_id = (SELECT auth.uid())
      AND child.deleted_at IS NULL
  )
);

DROP POLICY IF EXISTS account_deletion_requests_parent_select
ON public.account_deletion_requests;
CREATE POLICY account_deletion_requests_parent_select
ON public.account_deletion_requests
FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS content_items_published_select ON public.content_items;
CREATE POLICY content_items_published_select
ON public.content_items
FOR SELECT
TO anon, authenticated
USING (
  is_active = true
  AND editorial_status = 'published'
  AND is_startable = true
);

-- Progress upserts legitimately repeat their identity columns. Reject only
-- attempts that reassign a stored row to another child/language/activity.
CREATE OR REPLACE FUNCTION public.enforce_child_activity_progress_identity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.child_id IS DISTINCT FROM OLD.child_id
    OR NEW.language_code IS DISTINCT FROM OLD.language_code
    OR NEW.activity_type IS DISTINCT FROM OLD.activity_type
  THEN
    RAISE EXCEPTION 'Progress identity columns cannot be changed.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_child_activity_progress_identity
ON public.child_activity_progress;
CREATE TRIGGER enforce_child_activity_progress_identity
BEFORE UPDATE ON public.child_activity_progress
FOR EACH ROW
EXECUTE FUNCTION public.enforce_child_activity_progress_identity();

CREATE OR REPLACE FUNCTION public.enforce_child_stage_progress_identity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.child_id IS DISTINCT FROM OLD.child_id
    OR NEW.language_code IS DISTINCT FROM OLD.language_code
    OR NEW.activity_type IS DISTINCT FROM OLD.activity_type
    OR NEW.stage_id IS DISTINCT FROM OLD.stage_id
    OR NEW.level_id IS DISTINCT FROM OLD.level_id
  THEN
    RAISE EXCEPTION 'Progress identity columns cannot be changed.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_child_stage_progress_identity
ON public.child_stage_progress;
CREATE TRIGGER enforce_child_stage_progress_identity
BEFORE UPDATE ON public.child_stage_progress
FOR EACH ROW
EXECUTE FUNCTION public.enforce_child_stage_progress_identity();

-- Data API privileges are an independent layer from RLS.
REVOKE ALL ON TABLE public.languages
FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.languages TO anon, authenticated;

REVOKE ALL ON TABLE public.achievements
FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.achievements TO authenticated;

REVOKE ALL ON TABLE public.activities
FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.activities TO authenticated;

REVOKE ALL ON TABLE public.child_achievements
FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.child_achievements TO authenticated;

REVOKE ALL ON TABLE public.children
FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.children TO authenticated;

REVOKE ALL ON TABLE public.child_activity_progress
FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.child_activity_progress
TO authenticated;

REVOKE ALL ON TABLE public.child_stage_progress
FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.child_stage_progress
TO authenticated;

REVOKE ALL ON TABLE public.account_deletion_requests
FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.account_deletion_requests TO authenticated;

REVOKE ALL ON TABLE public.content_items
FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.content_items TO anon, authenticated;

REVOKE ALL ON TABLE public.child_streak_epochs
FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.child_streak_preferences
FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.child_streak_days
FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.child_streak_epochs TO authenticated;
GRANT SELECT ON TABLE public.child_streak_preferences TO authenticated;
GRANT SELECT ON TABLE public.child_streak_days TO authenticated;

GRANT ALL ON TABLE public.languages TO service_role;
GRANT ALL ON TABLE public.achievements TO service_role;
GRANT ALL ON TABLE public.activities TO service_role;
GRANT ALL ON TABLE public.child_achievements TO service_role;
GRANT ALL ON TABLE public.children TO service_role;
GRANT ALL ON TABLE public.child_activity_progress TO service_role;
GRANT ALL ON TABLE public.child_stage_progress TO service_role;
GRANT ALL ON TABLE public.account_deletion_requests TO service_role;
GRANT ALL ON TABLE public.content_items TO service_role;
GRANT ALL ON TABLE public.child_streak_epochs TO service_role;
GRANT ALL ON TABLE public.child_streak_preferences TO service_role;
GRANT ALL ON TABLE public.child_streak_days TO service_role;

-- Parent lifecycle RPCs require a signed-in parent and enforce auth.uid()
-- internally. Anonymous callers and PUBLIC must never execute them.
REVOKE ALL ON FUNCTION public.request_account_deletion_with_grace(text)
FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reactivate_account_deletion()
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.request_account_deletion_with_grace(text)
TO authenticated;
GRANT EXECUTE ON FUNCTION public.reactivate_account_deletion()
TO authenticated;

-- Finalizer helpers are called only by the server-side deletion worker.
REVOKE ALL ON FUNCTION public.claim_expired_account_deletion_requests(integer, boolean)
FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finalize_expired_account_deletion_request_app_data(uuid, boolean)
FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_finalized_account_deletion_request(uuid, timestamp with time zone)
FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_account_deletion_finalization_failure(uuid, text)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_expired_account_deletion_requests(integer, boolean)
TO service_role;
GRANT EXECUTE ON FUNCTION public.finalize_expired_account_deletion_request_app_data(uuid, boolean)
TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_finalized_account_deletion_request(uuid, timestamp with time zone)
TO service_role;
GRANT EXECUTE ON FUNCTION public.record_account_deletion_finalization_failure(uuid, text)
TO service_role;

-- Streak mutations remain authenticated RPCs; internal helpers stay private.
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

ALTER FUNCTION public.set_progress_updated_at() SET search_path = '';
ALTER FUNCTION public.set_account_deletion_requests_updated_at() SET search_path = '';

REVOKE ALL ON FUNCTION public.set_progress_updated_at()
FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_account_deletion_requests_updated_at()
FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_content_items_updated_at()
FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_child_streak_updated_at()
FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.initialize_child_streak_after_insert()
FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_child_activity_progress_identity()
FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_child_stage_progress_identity()
FROM PUBLIC, anon, authenticated;

CREATE INDEX IF NOT EXISTS activities_language_code_idx
ON public.activities(language_code);
CREATE INDEX IF NOT EXISTS child_achievements_achievement_id_idx
ON public.child_achievements(achievement_id);
CREATE INDEX IF NOT EXISTS child_achievements_language_code_idx
ON public.child_achievements(language_code);
CREATE INDEX IF NOT EXISTS child_activity_progress_language_code_idx
ON public.child_activity_progress(language_code);
CREATE INDEX IF NOT EXISTS child_stage_progress_language_code_idx
ON public.child_stage_progress(language_code);
CREATE INDEX IF NOT EXISTS child_streak_preferences_current_epoch_idx
ON public.child_streak_preferences(child_id, current_epoch_id);

-- The row remains available to editors as a draft; no draft curriculum or
-- placeholder media is deleted.
UPDATE public.content_items
SET
  editorial_status = 'draft',
  is_startable = false,
  published_at = NULL
WHERE language_code = 'lg'
  AND content_type = 'learning_hub'
  AND slug = 'curriculum'
  AND (
    editorial_status = 'published'
    OR is_startable = true
  );

-- Legacy story rows identify themselves as prototypes and include unreviewed
-- cultural claims or placeholder art. Preserve them for editorial work, but
-- remove them from the beta publication set until their payload says reviewed.
UPDATE public.content_items
SET
  editorial_status = 'draft',
  is_startable = false,
  published_at = NULL,
  updated_at = timezone('utc'::text, now())
WHERE content_type = 'story'
  AND COALESCE(payload #>> '{metadata,status}', '') <> 'reviewed'
  AND (
    editorial_status IS DISTINCT FROM 'draft'
    OR is_startable IS DISTINCT FROM false
    OR published_at IS NOT NULL
  );

COMMIT;
