-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.achievements (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text NOT NULL,
  icon_name text NOT NULL,
  activity_type text NOT NULL,
  points integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  trigger_value integer,
  game_key text,
  CONSTRAINT achievements_pkey PRIMARY KEY (id)
);
CREATE TABLE public.activities (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  child_id uuid,
  activity_type text CHECK (activity_type = ANY (ARRAY['stories'::text, 'counting'::text, 'museum'::text, 'other'::text, 'cultural'::text, 'words'::text, 'puzzle'::text, 'language'::text])),
  activity_name text NOT NULL,
  score text,
  duration integer,
  completed_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  details text,
  stage integer,
  level integer,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  language_code text,
  CONSTRAINT activities_pkey PRIMARY KEY (id),
  CONSTRAINT activities_child_id_fkey FOREIGN KEY (child_id) REFERENCES public.children(id),
  CONSTRAINT activities_language_code_fkey FOREIGN KEY (language_code) REFERENCES public.languages(code)
);
CREATE TABLE public.child_achievements (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  child_id uuid NOT NULL,
  achievement_id uuid NOT NULL,
  earned_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT child_achievements_pkey PRIMARY KEY (id),
  CONSTRAINT child_achievements_achievement_id_fkey FOREIGN KEY (achievement_id) REFERENCES public.achievements(id),
  CONSTRAINT child_achievements_child_id_fkey FOREIGN KEY (child_id) REFERENCES public.children(id)
);
CREATE TABLE public.children (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  parent_id uuid NOT NULL,
  name text NOT NULL,
  gender text NOT NULL,
  age text NOT NULL,
  reason text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  selected_language_code text NOT NULL DEFAULT 'lg'::text,
  deleted_at timestamp with time zone,
  archived_by_account_deletion_request_id uuid,
  CONSTRAINT children_pkey PRIMARY KEY (id),
  CONSTRAINT children_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES auth.users(id),
  CONSTRAINT children_selected_language_code_fkey FOREIGN KEY (selected_language_code) REFERENCES public.languages(code),
  CONSTRAINT children_archived_by_account_deletion_request_id_fkey FOREIGN KEY (archived_by_account_deletion_request_id) REFERENCES public.account_deletion_requests(id) ON DELETE SET NULL
);
CREATE TABLE public.languages (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  code text NOT NULL UNIQUE CHECK (length(TRIM(BOTH FROM code)) > 0),
  name text NOT NULL,
  native_name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT languages_pkey PRIMARY KEY (id)
);
CREATE TABLE public.content_items (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  language_code text NOT NULL CHECK (length(TRIM(BOTH FROM language_code)) > 0),
  content_type text NOT NULL CHECK (length(TRIM(BOTH FROM content_type)) > 0),
  slug text NOT NULL CHECK (length(TRIM(BOTH FROM slug)) > 0),
  title text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(payload) = 'object'::text),
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT content_items_pkey PRIMARY KEY (id),
  CONSTRAINT content_items_language_code_fkey FOREIGN KEY (language_code) REFERENCES public.languages(code)
);
CREATE TABLE public.child_activity_progress (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  child_id uuid NOT NULL,
  language_code text NOT NULL CHECK (length(TRIM(BOTH FROM language_code)) > 0),
  activity_type text NOT NULL CHECK (length(TRIM(BOTH FROM activity_type)) > 0),
  status text NOT NULL DEFAULT 'not_started'::text CHECK (status = ANY (ARRAY['not_started'::text, 'in_progress'::text, 'completed'::text])),
  score integer CHECK (score IS NULL OR score >= 0),
  stars integer CHECK (stars IS NULL OR stars >= 0),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  last_stage_id text,
  highest_unlocked_stage integer CHECK (highest_unlocked_stage IS NULL OR highest_unlocked_stage >= 0),
  completed_stage_count integer NOT NULL DEFAULT 0 CHECK (completed_stage_count >= 0),
  progress_payload jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(progress_payload) = 'object'::text),
  local_updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  server_updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT child_activity_progress_pkey PRIMARY KEY (id),
  CONSTRAINT child_activity_progress_child_id_fkey FOREIGN KEY (child_id) REFERENCES public.children(id),
  CONSTRAINT child_activity_progress_language_code_fkey FOREIGN KEY (language_code) REFERENCES public.languages(code)
);
CREATE TABLE public.child_stage_progress (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  child_id uuid NOT NULL,
  language_code text NOT NULL CHECK (length(TRIM(BOTH FROM language_code)) > 0),
  activity_type text NOT NULL CHECK (length(TRIM(BOTH FROM activity_type)) > 0),
  stage_id text NOT NULL CHECK (length(TRIM(BOTH FROM stage_id)) > 0),
  level_id text NOT NULL DEFAULT ''::text,
  status text NOT NULL DEFAULT 'not_started'::text CHECK (status = ANY (ARRAY['not_started'::text, 'in_progress'::text, 'completed'::text])),
  score integer CHECK (score IS NULL OR score >= 0),
  stars integer CHECK (stars IS NULL OR stars >= 0),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  progress_payload jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(progress_payload) = 'object'::text),
  completed_at timestamp with time zone,
  local_updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  server_updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT child_stage_progress_pkey PRIMARY KEY (id),
  CONSTRAINT child_stage_progress_child_id_fkey FOREIGN KEY (child_id) REFERENCES public.children(id),
  CONSTRAINT child_stage_progress_language_code_fkey FOREIGN KEY (language_code) REFERENCES public.languages(code)
);
CREATE TABLE public.account_deletion_requests (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  email text,
  status text NOT NULL DEFAULT 'requested'::text CHECK (status = ANY (ARRAY['requested'::text, 'processing'::text, 'completed'::text, 'cancelled'::text])),
  requested_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  fulfilled_at timestamp with time zone,
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  grace_ends_at timestamp with time zone,
  cancelled_at timestamp with time zone,
  reactivated_at timestamp with time zone,
  completed_at timestamp with time zone,
  archived_child_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  CONSTRAINT account_deletion_requests_pkey PRIMARY KEY (id),
  CONSTRAINT account_deletion_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Account deletion lifecycle RPCs in the intended final schema:
-- public.request_account_deletion_with_grace(p_note text DEFAULT NULL) RETURNS jsonb
-- public.reactivate_account_deletion() RETURNS jsonb
