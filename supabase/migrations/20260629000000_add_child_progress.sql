-- Local-first child progress sync for Baby Steps.
--
-- Activities remain the append-only history/log table. These tables store the
-- current progress snapshot used to restore a child's game state on another
-- device without writing a Supabase row for every small game action.

BEGIN;

CREATE TABLE IF NOT EXISTS public.child_activity_progress (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  child_id uuid NOT NULL,
  language_code text NOT NULL,
  activity_type text NOT NULL,
  status text NOT NULL DEFAULT 'not_started',
  score integer,
  stars integer,
  attempts integer NOT NULL DEFAULT 0,
  last_stage_id text,
  highest_unlocked_stage integer,
  completed_stage_count integer NOT NULL DEFAULT 0,
  progress_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  local_updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  server_updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT child_activity_progress_pkey PRIMARY KEY (id),
  CONSTRAINT child_activity_progress_child_id_fkey
    FOREIGN KEY (child_id)
    REFERENCES public.children(id)
    ON DELETE CASCADE,
  CONSTRAINT child_activity_progress_language_code_fkey
    FOREIGN KEY (language_code)
    REFERENCES public.languages(code)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT child_activity_progress_unique_child_language_activity
    UNIQUE (child_id, language_code, activity_type),
  CONSTRAINT child_activity_progress_language_code_not_blank
    CHECK (length(trim(language_code)) > 0),
  CONSTRAINT child_activity_progress_activity_type_not_blank
    CHECK (length(trim(activity_type)) > 0),
  CONSTRAINT child_activity_progress_payload_is_object
    CHECK (jsonb_typeof(progress_payload) = 'object'),
  CONSTRAINT child_activity_progress_status_check
    CHECK (status IN ('not_started', 'in_progress', 'completed')),
  CONSTRAINT child_activity_progress_attempts_non_negative
    CHECK (attempts >= 0),
  CONSTRAINT child_activity_progress_completed_stage_count_non_negative
    CHECK (completed_stage_count >= 0),
  CONSTRAINT child_activity_progress_score_non_negative
    CHECK (score IS NULL OR score >= 0),
  CONSTRAINT child_activity_progress_stars_non_negative
    CHECK (stars IS NULL OR stars >= 0),
  CONSTRAINT child_activity_progress_highest_unlocked_stage_positive
    CHECK (highest_unlocked_stage IS NULL OR highest_unlocked_stage >= 0)
);

CREATE TABLE IF NOT EXISTS public.child_stage_progress (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  child_id uuid NOT NULL,
  language_code text NOT NULL,
  activity_type text NOT NULL,
  stage_id text NOT NULL,
  level_id text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'not_started',
  score integer,
  stars integer,
  attempts integer NOT NULL DEFAULT 0,
  progress_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  completed_at timestamp with time zone,
  local_updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  server_updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT child_stage_progress_pkey PRIMARY KEY (id),
  CONSTRAINT child_stage_progress_child_id_fkey
    FOREIGN KEY (child_id)
    REFERENCES public.children(id)
    ON DELETE CASCADE,
  CONSTRAINT child_stage_progress_language_code_fkey
    FOREIGN KEY (language_code)
    REFERENCES public.languages(code)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT child_stage_progress_unique_child_language_activity_stage_level
    UNIQUE (child_id, language_code, activity_type, stage_id, level_id),
  CONSTRAINT child_stage_progress_language_code_not_blank
    CHECK (length(trim(language_code)) > 0),
  CONSTRAINT child_stage_progress_activity_type_not_blank
    CHECK (length(trim(activity_type)) > 0),
  CONSTRAINT child_stage_progress_stage_id_not_blank
    CHECK (length(trim(stage_id)) > 0),
  CONSTRAINT child_stage_progress_payload_is_object
    CHECK (jsonb_typeof(progress_payload) = 'object'),
  CONSTRAINT child_stage_progress_status_check
    CHECK (status IN ('not_started', 'in_progress', 'completed')),
  CONSTRAINT child_stage_progress_attempts_non_negative
    CHECK (attempts >= 0),
  CONSTRAINT child_stage_progress_score_non_negative
    CHECK (score IS NULL OR score >= 0),
  CONSTRAINT child_stage_progress_stars_non_negative
    CHECK (stars IS NULL OR stars >= 0)
);

COMMENT ON TABLE public.child_activity_progress IS
  'Current child progress by language and activity type. Local clients batch dirty snapshots here; activities remains the history log.';
COMMENT ON COLUMN public.child_activity_progress.progress_payload IS
  'Flexible MVP payload for existing game manager state, such as completed levels, unlocked stages, stats, and last played data.';
COMMENT ON TABLE public.child_stage_progress IS
  'Optional per-stage or per-level progress detail for games that need finer restoration than the activity summary.';

CREATE INDEX IF NOT EXISTS idx_child_activity_progress_child_language
ON public.child_activity_progress(child_id, language_code, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_child_activity_progress_activity
ON public.child_activity_progress(activity_type, language_code);

CREATE INDEX IF NOT EXISTS idx_child_stage_progress_child_language_activity
ON public.child_stage_progress(child_id, language_code, activity_type, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_child_stage_progress_stage
ON public.child_stage_progress(activity_type, stage_id, level_id);

CREATE OR REPLACE FUNCTION public.set_progress_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  NEW.server_updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_child_activity_progress_updated_at ON public.child_activity_progress;
CREATE TRIGGER set_child_activity_progress_updated_at
BEFORE UPDATE ON public.child_activity_progress
FOR EACH ROW
EXECUTE FUNCTION public.set_progress_updated_at();

DROP TRIGGER IF EXISTS set_child_stage_progress_updated_at ON public.child_stage_progress;
CREATE TRIGGER set_child_stage_progress_updated_at
BEFORE UPDATE ON public.child_stage_progress
FOR EACH ROW
EXECUTE FUNCTION public.set_progress_updated_at();

ALTER TABLE public.child_activity_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.child_stage_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS child_activity_progress_parent_select ON public.child_activity_progress;
CREATE POLICY child_activity_progress_parent_select
ON public.child_activity_progress
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.children
    WHERE children.id = child_activity_progress.child_id
      AND children.parent_id = auth.uid()
  )
);

DROP POLICY IF EXISTS child_activity_progress_parent_insert ON public.child_activity_progress;
CREATE POLICY child_activity_progress_parent_insert
ON public.child_activity_progress
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.children
    WHERE children.id = child_activity_progress.child_id
      AND children.parent_id = auth.uid()
  )
);

DROP POLICY IF EXISTS child_activity_progress_parent_update ON public.child_activity_progress;
CREATE POLICY child_activity_progress_parent_update
ON public.child_activity_progress
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.children
    WHERE children.id = child_activity_progress.child_id
      AND children.parent_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.children
    WHERE children.id = child_activity_progress.child_id
      AND children.parent_id = auth.uid()
  )
);

DROP POLICY IF EXISTS child_stage_progress_parent_select ON public.child_stage_progress;
CREATE POLICY child_stage_progress_parent_select
ON public.child_stage_progress
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.children
    WHERE children.id = child_stage_progress.child_id
      AND children.parent_id = auth.uid()
  )
);

DROP POLICY IF EXISTS child_stage_progress_parent_insert ON public.child_stage_progress;
CREATE POLICY child_stage_progress_parent_insert
ON public.child_stage_progress
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.children
    WHERE children.id = child_stage_progress.child_id
      AND children.parent_id = auth.uid()
  )
);

DROP POLICY IF EXISTS child_stage_progress_parent_update ON public.child_stage_progress;
CREATE POLICY child_stage_progress_parent_update
ON public.child_stage_progress
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.children
    WHERE children.id = child_stage_progress.child_id
      AND children.parent_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.children
    WHERE children.id = child_stage_progress.child_id
      AND children.parent_id = auth.uid()
  )
);

COMMIT;
