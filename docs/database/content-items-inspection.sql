-- MVP content_items inspection queries.
-- Run these in Supabase SQL editor when checking language-specific content.

-- 1. View active content by language.
-- Change 'nyn' to 'lg' when inspecting Luganda.
SELECT
  language_code,
  content_type,
  slug,
  title,
  sort_order,
  is_active,
  jsonb_object_keys(payload) AS payload_key
FROM public.content_items
WHERE language_code = 'nyn'
ORDER BY language_code, content_type, sort_order, slug;

-- 2. Inspect the exact active payloads for one language.
SELECT
  language_code,
  content_type,
  slug,
  title,
  payload
FROM public.content_items
WHERE language_code = 'nyn'
  AND is_active = true
ORDER BY sort_order, content_type, slug;

-- 3. Check that Runyankole rows are not carrying Luganda/Buganda content.
-- Expected result: zero rows unless a reviewed nyn item explicitly contains
-- comparison text in its payload.
SELECT
  language_code,
  content_type,
  slug,
  title,
  payload ->> 'languageCode' AS payload_language_code,
  payload
FROM public.content_items
WHERE language_code = 'nyn'
  AND (
    payload ->> 'languageCode' = 'lg'
    OR payload::text ILIKE '%legacy-lg%'
    OR payload::text ILIKE '%Luganda%'
    OR payload::text ILIKE '%Buganda%'
  )
ORDER BY sort_order, content_type, slug;

-- 4. Check menu cards for legacy Luganda availability tags in Runyankole rows.
-- Expected result: zero rows.
SELECT
  ci.language_code,
  ci.slug,
  card ->> 'id' AS card_id,
  card ->> 'title' AS card_title,
  card ->> 'availability' AS availability,
  card ->> 'targetPage' AS target_page
FROM public.content_items AS ci
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(ci.payload -> 'cards', '[]'::jsonb)) AS card
WHERE ci.language_code = 'nyn'
  AND card ->> 'availability' = 'legacy-lg'
ORDER BY ci.slug, card_id;

-- 5. Summarize activity writes by language.
SELECT
  language_code,
  activity_type,
  COUNT(*) AS activity_count,
  MAX(completed_at) AS latest_completed_at
FROM public.activities
GROUP BY language_code, activity_type
ORDER BY language_code, activity_type;

-- 6. Find activity rows whose language_code is missing or differs from the child.
-- Expected result: zero rows for the DB-backed MVP game/story flows.
SELECT
  a.id,
  a.child_id,
  c.name AS child_name,
  c.selected_language_code,
  a.language_code AS activity_language_code,
  a.activity_type,
  a.activity_name,
  a.completed_at
FROM public.activities AS a
JOIN public.children AS c ON c.id = a.child_id
WHERE a.language_code IS NULL
  OR a.language_code <> c.selected_language_code
ORDER BY a.completed_at DESC NULLS LAST;
