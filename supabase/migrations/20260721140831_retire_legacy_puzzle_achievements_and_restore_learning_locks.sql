BEGIN;

-- The puzzle curriculum no longer contains the heritage puzzle set these
-- definitions described (including Kasubi Tombs). Remove both the awards and
-- their definitions so replaced puzzle IDs cannot grant misleading badges.
WITH retired_puzzle_achievements AS (
  SELECT achievement.id
  FROM public.achievements AS achievement
  WHERE achievement.game_key = 'puzzle_game'
), deleted_child_awards AS (
  DELETE FROM public.child_achievements AS child_achievement
  USING retired_puzzle_achievements AS retired
  WHERE child_achievement.achievement_id = retired.id
  RETURNING child_achievement.id
)
DELETE FROM public.achievements AS achievement
USING retired_puzzle_achievements AS retired
WHERE achievement.id = retired.id;

-- Restore the authored lock defaults for the legacy Learning Game row. The
-- client also derives effective locks from completion data, so existing
-- children keep legitimate completions while stale all-unlocked snapshots are
-- repaired when they next load.
UPDATE public.content_items AS content_item
SET
  payload = jsonb_set(
    content_item.payload,
    '{stages}',
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_set(
            jsonb_set(
              stage_entry.stage,
              '{isLocked}',
              to_jsonb(stage_entry.stage_position > 1),
              true
            ),
            '{levels}',
            COALESCE(
              (
                SELECT jsonb_agg(
                  jsonb_set(
                    level_entry.level,
                    '{isLocked}',
                    to_jsonb(
                      stage_entry.stage_position > 1
                      OR level_entry.level_position > 1
                    ),
                    true
                  )
                  ORDER BY level_entry.level_position
                )
                FROM jsonb_array_elements(
                  COALESCE(stage_entry.stage -> 'levels', '[]'::jsonb)
                ) WITH ORDINALITY AS level_entry(level, level_position)
              ),
              '[]'::jsonb
            ),
            true
          )
          ORDER BY stage_entry.stage_position
        )
        FROM jsonb_array_elements(content_item.payload -> 'stages')
          WITH ORDINALITY AS stage_entry(stage, stage_position)
      ),
      '[]'::jsonb
    ),
    true
  ),
  updated_at = timezone('utc'::text, now())
WHERE content_item.language_code = 'lg'
  AND content_item.content_type = 'learning_game'
  AND content_item.slug = 'starter'
  AND jsonb_typeof(content_item.payload -> 'stages') = 'array';

COMMIT;
