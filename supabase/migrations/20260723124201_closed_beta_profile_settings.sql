-- Minimum closed-beta parent and child profile settings.
--
-- This migration intentionally follows 20260723100638. It creates only the
-- parent display-name record required by the app, narrows generic child writes
-- to editable profile columns, and moves child archiving behind an
-- ownership-checking RPC.

BEGIN;

CREATE TABLE public.parent_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  CONSTRAINT parent_profiles_display_name_check
    CHECK (
      display_name IS NULL
      OR (
        display_name = btrim(display_name)
        AND char_length(display_name) BETWEEN 1 AND 80
        AND display_name !~ '[[:cntrl:]]'
      )
    )
);

ALTER TABLE public.parent_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY parent_profiles_parent_select
ON public.parent_profiles
FOR SELECT
TO authenticated
USING (id = (SELECT auth.uid()));

CREATE POLICY parent_profiles_parent_insert
ON public.parent_profiles
FOR INSERT
TO authenticated
WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY parent_profiles_parent_update
ON public.parent_profiles
FOR UPDATE
TO authenticated
USING (id = (SELECT auth.uid()))
WITH CHECK (id = (SELECT auth.uid()));

REVOKE ALL ON TABLE public.parent_profiles
FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.parent_profiles TO authenticated;
GRANT INSERT (id, display_name) ON TABLE public.parent_profiles TO authenticated;
GRANT UPDATE (display_name) ON TABLE public.parent_profiles TO authenticated;
GRANT ALL ON TABLE public.parent_profiles TO service_role;

-- Keep ordinary parent writes away from ownership, lifecycle, and timestamp
-- columns. Existing account lifecycle SECURITY DEFINER functions retain their
-- owner-level access.
REVOKE INSERT, UPDATE ON TABLE public.children FROM authenticated;
GRANT INSERT (
  parent_id,
  name,
  gender,
  age,
  reason,
  selected_language_code
) ON TABLE public.children TO authenticated;
GRANT UPDATE (
  name,
  gender,
  age,
  reason,
  selected_language_code
) ON TABLE public.children TO authenticated;

CREATE OR REPLACE FUNCTION public.enforce_child_profile_edit_contract()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.name IS DISTINCT FROM OLD.name
    AND (
      NEW.name <> btrim(NEW.name)
      OR char_length(NEW.name) NOT BETWEEN 1 AND 80
      OR NEW.name ~ '[[:cntrl:]]'
    )
  THEN
    RAISE EXCEPTION 'Child name must be trimmed and contain 1 to 80 characters.'
      USING ERRCODE = '22023';
  END IF;

  IF NEW.age IS DISTINCT FROM OLD.age
    AND NEW.age NOT IN ('3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '12+')
  THEN
    RAISE EXCEPTION 'Child age is not supported.'
      USING ERRCODE = '22023';
  END IF;

  IF NEW.gender IS DISTINCT FROM OLD.gender
    AND NEW.gender NOT IN ('', 'male', 'female')
  THEN
    RAISE EXCEPTION 'Child gender is not supported.'
      USING ERRCODE = '22023';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_child_profile_edit_contract
ON public.children;
CREATE TRIGGER enforce_child_profile_edit_contract
BEFORE UPDATE OF name, age, gender ON public.children
FOR EACH ROW
EXECUTE FUNCTION public.enforce_child_profile_edit_contract();

REVOKE ALL ON FUNCTION public.enforce_child_profile_edit_contract()
FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.archive_child_profile(p_child_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_parent_id uuid := (SELECT auth.uid());
  v_archived_at timestamp with time zone := timezone('utc'::text, now());
BEGIN
  IF v_parent_id IS NULL THEN
    RETURN jsonb_build_object(
      'status', 'rejected',
      'reason', 'not_authenticated'
    );
  END IF;

  IF p_child_id IS NULL THEN
    RETURN jsonb_build_object(
      'status', 'rejected',
      'reason', 'invalid_input'
    );
  END IF;

  UPDATE public.children
  SET
    deleted_at = v_archived_at,
    archived_by_account_deletion_request_id = NULL
  WHERE id = p_child_id
    AND parent_id = v_parent_id
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'status', 'rejected',
      'reason', 'child_not_owned_or_active'
    );
  END IF;

  RETURN jsonb_build_object(
    'status', 'applied',
    'archived_at', v_archived_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.archive_child_profile(uuid)
FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.archive_child_profile(uuid)
TO authenticated, service_role;

COMMIT;
