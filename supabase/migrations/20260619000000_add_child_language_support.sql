-- Adds minimal required language support for child profiles.
--
-- This migration intentionally does not add database-backed content tables.
-- Learning content remains local/bundled for now.

BEGIN;

CREATE TABLE IF NOT EXISTS public.languages (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  code text NOT NULL,
  name text NOT NULL,
  native_name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT languages_pkey PRIMARY KEY (id),
  CONSTRAINT languages_code_key UNIQUE (code),
  CONSTRAINT languages_code_not_blank CHECK (length(trim(code)) > 0)
);

INSERT INTO public.languages (code, name, native_name, is_active)
VALUES
  ('lg', 'Luganda', 'Oluganda', true),
  ('nyn', 'Runyankole', 'Runyankole', true)
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  native_name = EXCLUDED.native_name,
  is_active = EXCLUDED.is_active;

ALTER TABLE public.children
ADD COLUMN IF NOT EXISTS selected_language_code text;

-- Existing children predate language selection. Default them to the current
-- prototype language so the column can become required safely.
UPDATE public.children
SET selected_language_code = 'lg'
WHERE selected_language_code IS NULL
  OR NOT EXISTS (
    SELECT 1
    FROM public.languages
    WHERE languages.code = children.selected_language_code
  );

ALTER TABLE public.children
ALTER COLUMN selected_language_code SET DEFAULT 'lg';

ALTER TABLE public.children
ALTER COLUMN selected_language_code SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'children_selected_language_code_fkey'
      AND conrelid = 'public.children'::regclass
  ) THEN
    ALTER TABLE public.children
    ADD CONSTRAINT children_selected_language_code_fkey
    FOREIGN KEY (selected_language_code)
    REFERENCES public.languages(code)
    ON UPDATE CASCADE
    ON DELETE RESTRICT;
  END IF;
END $$;

ALTER TABLE public.activities
ADD COLUMN IF NOT EXISTS language_code text;

-- Historical activity rows can remain NULL. New multilingual activity writes
-- should pass the active child's selected language.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'activities_language_code_fkey'
      AND conrelid = 'public.activities'::regclass
  ) THEN
    ALTER TABLE public.activities
    ADD CONSTRAINT activities_language_code_fkey
    FOREIGN KEY (language_code)
    REFERENCES public.languages(code)
    ON UPDATE CASCADE
    ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_children_selected_language_code
ON public.children(selected_language_code);

CREATE INDEX IF NOT EXISTS idx_activities_child_language_completed_at
ON public.activities(child_id, language_code, completed_at DESC);

COMMIT;
