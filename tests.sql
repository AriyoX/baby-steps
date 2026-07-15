WITH
params AS (
  SELECT 'nyn'::text AS language_code, 'curriculum'::text AS slug
),
expected(mechanic) AS (
  VALUES
    ('tap_to_learn'),
    ('listen_and_choose'),
    ('choose_correct_word'),
    ('match_word_picture'),
    ('mini_quiz'),
    ('cultural_card'),
    ('story_bite')
),
hub AS (
  SELECT payload
  FROM public.content_items, params
  WHERE content_items.language_code = params.language_code
    AND content_type = 'learning_hub'
    AND content_items.slug = params.slug
    AND is_active
    AND editorial_status = 'published'
    AND is_startable
),
lessons AS (
  SELECT
    stage ->> 'id' AS stage_id,
    lesson ->> 'id' AS lesson_id,
    lesson ->> 'mechanic' AS mechanic,
    stage,
    lesson
  FROM hub
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE
      WHEN jsonb_typeof(payload -> 'stages') = 'array'
        THEN payload -> 'stages'
      ELSE '[]'::jsonb
    END
  ) AS stage
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE
      WHEN jsonb_typeof(stage -> 'lessons') = 'array'
        THEN stage -> 'lessons'
      ELSE '[]'::jsonb
    END
  ) AS lesson
),
summary AS (
  SELECT
    expected.mechanic,
    count(lessons.lesson_id) AS lesson_count,
    coalesce(sum(jsonb_array_length(
      CASE
        WHEN jsonb_typeof(lessons.lesson -> 'items') = 'array'
          THEN lessons.lesson -> 'items'
        ELSE '[]'::jsonb
      END
    )), 0) AS item_count,
    coalesce(bool_or(
      coalesce(lessons.stage ->> 'isLocked', 'false') <> 'true'
      AND coalesce(lessons.lesson ->> 'isLocked', 'false') <> 'true'
      AND coalesce(lessons.lesson ->> 'isStartable', 'true') <> 'false'
    ), false) AS has_startable_lesson
  FROM expected
  LEFT JOIN lessons USING (mechanic)
  GROUP BY expected.mechanic
)
SELECT
  mechanic,
  lesson_count,
  item_count,
  has_startable_lesson,
  lesson_count > 0
    AND item_count > 0
    AND has_startable_lesson AS passes
FROM summary
ORDER BY mechanic;

WITH
hub AS (
  SELECT payload
  FROM public.content_items
  WHERE language_code = 'nyn'
    AND content_type = 'learning_hub'
    AND slug = 'curriculum'
    AND is_active
    AND editorial_status = 'published'
    AND is_startable
),
lessons AS (
  SELECT
    stage ->> 'id' AS stage_id,
    lesson ->> 'id' AS lesson_id,
    lesson ->> 'mechanic' AS lesson_mechanic,
    lesson
  FROM hub
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(payload -> 'stages') = 'array'
      THEN payload -> 'stages' ELSE '[]'::jsonb END
  ) AS stage
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(stage -> 'lessons') = 'array'
      THEN stage -> 'lessons' ELSE '[]'::jsonb END
  ) AS lesson
),
items AS (
  SELECT
    stage_id,
    lesson_id,
    lesson_mechanic,
    item,
    CASE WHEN jsonb_typeof(item -> 'options') = 'array'
      THEN item -> 'options' ELSE '[]'::jsonb END AS options,
    CASE WHEN jsonb_typeof(item -> 'questions') = 'array'
      THEN item -> 'questions' ELSE '[]'::jsonb END AS questions,
    CASE WHEN jsonb_typeof(item -> 'pages') = 'array'
      THEN item -> 'pages' ELSE '[]'::jsonb END AS pages
  FROM lessons
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(lesson -> 'items') = 'array'
      THEN lesson -> 'items' ELSE '[]'::jsonb END
  ) AS item
),
checks AS (
  SELECT
    stage_id,
    lesson_id,
    item ->> 'id' AS item_id,
    lesson_mechanic AS mechanic,
    nullif(btrim(item ->> 'id'), '') IS NOT NULL
    AND (
      item ->> 'mechanic' IS NULL
      OR item ->> 'mechanic' = lesson_mechanic
    )
    AND CASE lesson_mechanic
      WHEN 'tap_to_learn' THEN
        nullif(btrim(coalesce(item ->> 'localText', item ->> 'word')), '') IS NOT NULL
        AND nullif(btrim(coalesce(item ->> 'englishText', item ->> 'translation')), '') IS NOT NULL

      WHEN 'listen_and_choose' THEN
        jsonb_array_length(options) BETWEEN 2 AND 4
        AND EXISTS (
          SELECT 1 FROM jsonb_array_elements(options) option
          WHERE option ->> 'id' = item ->> 'correctOptionId'
        )

      WHEN 'choose_correct_word' THEN
        nullif(btrim(coalesce(item ->> 'promptText', item ->> 'prompt')), '') IS NOT NULL
        AND jsonb_array_length(options) BETWEEN 2 AND 4
        AND EXISTS (
          SELECT 1 FROM jsonb_array_elements(options) option
          WHERE option ->> 'id' = item ->> 'correctOptionId'
        )

      WHEN 'match_word_picture' THEN
        nullif(btrim(item ->> 'targetText'), '') IS NOT NULL
        AND jsonb_array_length(options) BETWEEN 2 AND 4
        AND EXISTS (
          SELECT 1 FROM jsonb_array_elements(options) option
          WHERE option ->> 'id' = item ->> 'correctOptionId'
        )

      WHEN 'mini_quiz' THEN
        nullif(btrim(item ->> 'title'), '') IS NOT NULL
        AND jsonb_array_length(questions) BETWEEN 1 AND 5
        AND NOT EXISTS (
          SELECT 1
          FROM jsonb_array_elements(questions) question
          WHERE nullif(btrim(question ->> 'id'), '') IS NULL
             OR nullif(btrim(coalesce(
                  question ->> 'promptText',
                  question ->> 'prompt',
                  question ->> 'questionText'
                )), '') IS NULL
             OR jsonb_typeof(question -> 'options') <> 'array'
             OR jsonb_array_length(question -> 'options') NOT BETWEEN 2 AND 4
             OR NOT EXISTS (
                  SELECT 1
                  FROM jsonb_array_elements(question -> 'options') option
                  WHERE option ->> 'id' = question ->> 'correctOptionId'
                )
        )

      WHEN 'cultural_card' THEN
        nullif(btrim(coalesce(
          item ->> 'title',
          item ->> 'localTitle',
          item ->> 'englishText'
        )), '') IS NOT NULL
        AND nullif(btrim(coalesce(
          item ->> 'bodyText',
          item ->> 'culturalNote',
          item ->> 'englishText'
        )), '') IS NOT NULL

      WHEN 'story_bite' THEN
        nullif(btrim(item ->> 'title'), '') IS NOT NULL
        AND jsonb_array_length(pages) BETWEEN 1 AND 5
        AND NOT EXISTS (
          SELECT 1
          FROM jsonb_array_elements(pages) page
          WHERE nullif(btrim(page ->> 'id'), '') IS NULL
             OR nullif(btrim(coalesce(
                  page ->> 'bodyText',
                  page ->> 'text',
                  page ->> 'englishText'
                )), '') IS NULL
        )

      ELSE false
    END AS passes
  FROM items
)
SELECT *
FROM checks
WHERE NOT passes
ORDER BY stage_id, lesson_id, item_id;