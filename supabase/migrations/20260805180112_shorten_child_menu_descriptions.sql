BEGIN;

WITH replacements(menu_slug, card_id, description) AS (
  VALUES
    ('games', 'learning', 'Practice words and phrases'),
    ('games', 'words', 'Build Luganda words'),
    ('games', 'cards', 'Match cultural pairs'),
    ('games', 'puzzles', 'Solve picture puzzles'),
    ('games', 'numbers', 'Count pictures in steps'),

    ('stories', 'morning-greeting', 'Practice a morning greeting'),
    ('stories', 'kato-and-the-ball', 'Explore words and feelings'),

    ('coloring', 'greeting', 'Color a greeting scene'),
    ('coloring', 'me', 'Color a child portrait')
),
rebuilt AS (
  SELECT
    content_item.id,
    jsonb_set(
      content_item.payload,
      '{cards}',
      (
        SELECT jsonb_agg(
          CASE
            WHEN replacement.description IS NULL THEN card.value
            ELSE jsonb_set(
              card.value,
              '{description}',
              to_jsonb(replacement.description),
              true
            )
          END
          ORDER BY card.position
        )
        FROM jsonb_array_elements(content_item.payload -> 'cards')
          WITH ORDINALITY AS card(value, position)
        LEFT JOIN replacements AS replacement
          ON replacement.menu_slug = content_item.slug
         AND replacement.card_id = card.value ->> 'id'
      ),
      false
    ) AS payload
  FROM public.content_items AS content_item
  WHERE content_item.language_code = 'lg'
    AND content_item.content_type = 'child_menu'
    AND content_item.slug IN ('games', 'stories', 'coloring')
)
UPDATE public.content_items AS content_item
SET
  payload = rebuilt.payload,
  content_version = content_item.content_version + 1,
  published_at = timezone('utc', now())
FROM rebuilt
WHERE content_item.id = rebuilt.id
  AND content_item.payload IS DISTINCT FROM rebuilt.payload;

COMMIT;