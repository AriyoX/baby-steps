-- PROPOSAL ONLY: Review before running in production.
-- Minimal language support for Baby Steps. This intentionally avoids
-- database-driven stories, games, lessons, media, admin, and publishing tables.

-- Assumes uuid_generate_v4() already exists in this Supabase project because
-- the current schema uses it. If not, review whether gen_random_uuid() is the
-- right project default instead.

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

UPDATE public.children
SET selected_language_code = 'lg'
WHERE selected_language_code IS NULL;

ALTER TABLE public.children
ALTER COLUMN selected_language_code SET DEFAULT 'lg';

ALTER TABLE public.children
ALTER COLUMN selected_language_code SET NOT NULL;

-- Add after confirming no invalid child language codes exist.
ALTER TABLE public.children
ADD CONSTRAINT children_selected_language_code_fkey
FOREIGN KEY (selected_language_code)
REFERENCES public.languages(code)
ON UPDATE CASCADE
ON DELETE RESTRICT;

ALTER TABLE public.activities
ADD COLUMN IF NOT EXISTS language_code text;

-- Keep nullable for historical activity rows. New app writes should send a
-- language code once child language preference is wired.
ALTER TABLE public.activities
ADD CONSTRAINT activities_language_code_fkey
FOREIGN KEY (language_code)
REFERENCES public.languages(code)
ON UPDATE CASCADE
ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_children_selected_language_code
ON public.children(selected_language_code);

CREATE INDEX IF NOT EXISTS idx_activities_child_language_completed_at
ON public.activities(child_id, language_code, completed_at DESC);

COMMIT;

-- Future only, not part of this proposal:
-- content tables for stories, pages, lessons, words, quizzes, games, levels,
-- media assets, localization variants, publication status, creator workflows,
-- and content versioning.
