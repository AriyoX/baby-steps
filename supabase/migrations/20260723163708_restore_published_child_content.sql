-- Restore the child content unintentionally removed from the runtime by the
-- closed-beta hardening pass. Top-level publication fields remain the Data API
-- boundary; nested readiness/media labels are authoring metadata and the
-- mobile client already resolves known placeholder media to bundled fallbacks.

BEGIN;

UPDATE public.content_items
SET
  editorial_status = 'published',
  is_startable = true,
  published_at = timezone('utc'::text, now())
WHERE language_code = 'lg'
  AND is_active = true
  AND (
    (content_type = 'learning_hub' AND slug = 'curriculum')
    OR (
      content_type = 'story'
      AND slug IN ('family-at-home', 'greetings-at-work')
    )
  )
  AND (
    editorial_status IS DISTINCT FROM 'published'
    OR is_startable IS DISTINCT FROM true
    OR published_at IS NULL
  );

COMMIT;
