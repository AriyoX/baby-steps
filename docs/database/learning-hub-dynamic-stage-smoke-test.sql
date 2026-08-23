-- Learning Hub dynamic-content smoke test.
--
-- Run the ADD block in the Supabase SQL Editor or with:
--   npx supabase@2.109.1 db query --linked --file docs/database/learning-hub-dynamic-stage-smoke-test.sql
--
-- The linked command mutates the selected database. Use only a safe development
-- project, confirm the target first, and run the cleanup block after testing.
--
-- This is an idempotent test helper, not a production seed migration. It adds
-- one clearly marked placeholder stage to the published Luganda bundle. The
-- sample reuses an already verified Luganda word; it does not invent content.

DO $block$
DECLARE
  hub_id uuid;
BEGIN
  SELECT id
  INTO hub_id
  FROM public.content_items
  WHERE language_code = 'lg'
    AND content_type = 'learning_hub'
    AND slug = 'curriculum'
    AND is_active = true
    AND editorial_status = 'published'
    AND is_startable = true;

  IF hub_id IS NULL THEN
    RAISE EXCEPTION 'Published Luganda Learning Hub bundle was not found';
  END IF;

  UPDATE public.content_items
  SET
    payload = jsonb_set(
      payload,
      '{stages}',
      (payload -> 'stages') || jsonb_build_array(
        $stage$
        {
          "id": "database-content-smoke-test",
          "order": 99,
          "stageNumber": 99,
          "title": "Database Content Test",
          "description": "A temporary stage loaded dynamically from Supabase.",
          "imageKey": "learning-beginner.jpg",
          "status": "preview",
          "estimatedMinutes": 1,
          "lessonCount": 1,
          "isPractice": false,
          "isLocked": false,
          "readiness": "placeholder",
          "mechanics": ["tap_to_learn"],
          "learningGoals": ["Confirm that published database content appears without an app code change"],
          "placeholderMessage": "Temporary database-content smoke test.",
          "metadata": {
            "testOnly": true,
            "removeAfterVerification": true
          },
          "lessons": [
            {
              "id": "database-content-smoke-test-lesson",
              "order": 1,
              "title": "Dynamic Content Check",
              "description": "Open this lesson to confirm the payload was fetched from Supabase.",
              "mechanic": "tap_to_learn",
              "isStartable": true,
              "isLocked": false,
              "readiness": "placeholder",
              "items": [
                {
                  "id": "database-content-smoke-test-webale",
                  "order": 1,
                  "mechanic": "tap_to_learn",
                  "localText": "Webale",
                  "englishText": "Thank you",
                  "imageKey": "learning-beginner.jpg",
                  "audioKey": "webale",
                  "audioAsset": "webale",
                  "readiness": "placeholder",
                  "metadata": {
                    "testOnly": true
                  }
                }
              ]
            }
          ]
        }
        $stage$::jsonb
      ),
      false
    ),
    content_version = content_version + 1
  WHERE id = hub_id
    AND jsonb_typeof(payload -> 'stages') = 'array'
    AND NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(payload -> 'stages') AS stage
      WHERE stage ->> 'id' = 'database-content-smoke-test'
    );
END
$block$;

-- The result should be one row with test_stage_present = true.
SELECT
  content_version,
  updated_at,
  EXISTS (
    SELECT 1
    FROM jsonb_array_elements(payload -> 'stages') AS stage
    WHERE stage ->> 'id' = 'database-content-smoke-test'
  ) AS test_stage_present
FROM public.content_items
WHERE language_code = 'lg'
  AND content_type = 'learning_hub'
  AND slug = 'curriculum';

-- CLEANUP (run separately after the visual test):
--
-- UPDATE public.content_items
-- SET
--   payload = jsonb_set(
--     payload,
--     '{stages}',
--     COALESCE(
--       (
--         SELECT jsonb_agg(stage.value ORDER BY stage.ordinality)
--         FROM jsonb_array_elements(payload -> 'stages')
--           WITH ORDINALITY AS stage(value, ordinality)
--         WHERE stage.value ->> 'id' <> 'database-content-smoke-test'
--       ),
--       '[]'::jsonb
--     ),
--     false
--   ),
--   content_version = content_version + 1
-- WHERE language_code = 'lg'
--   AND content_type = 'learning_hub'
--   AND slug = 'curriculum'
--   AND EXISTS (
--     SELECT 1
--     FROM jsonb_array_elements(payload -> 'stages') AS stage
--     WHERE stage ->> 'id' = 'database-content-smoke-test'
--   );
