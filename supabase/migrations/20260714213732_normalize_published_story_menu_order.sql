-- Existing story menu rows predate explicit card ordering. Normalize them so
-- the strict content repository can accept the complete published response.

BEGIN;

WITH normalized_story_menus AS (
  SELECT
    content_item.id,
    jsonb_set(
      content_item.payload,
      '{cards}',
      COALESCE(
        (
          SELECT jsonb_agg(
            CASE
              WHEN jsonb_typeof(card.value) = 'object'
                AND NOT card.value ? 'order'
              THEN card.value || jsonb_build_object('order', card.ordinality::integer)
              ELSE card.value
            END
            ORDER BY card.ordinality
          )
          FROM jsonb_array_elements(content_item.payload -> 'cards')
            WITH ORDINALITY AS card(value, ordinality)
        ),
        '[]'::jsonb
      ),
      false
    ) AS normalized_payload
  FROM public.content_items AS content_item
  WHERE content_item.content_type = 'child_menu'
    AND content_item.slug = 'stories'
    AND jsonb_typeof(content_item.payload -> 'cards') = 'array'
)
UPDATE public.content_items AS content_item
SET
  payload = normalized_story_menu.normalized_payload,
  content_version = content_item.content_version + 1
FROM normalized_story_menus AS normalized_story_menu
WHERE content_item.id = normalized_story_menu.id
  AND content_item.payload IS DISTINCT FROM normalized_story_menu.normalized_payload;

COMMIT;
