-- Enforce one earned achievement row per child.
--
-- Code already checks child-scoped caches and the exact remote row before
-- awarding. This constraint closes the remaining race window at the database
-- level.

BEGIN;

WITH ranked_child_achievements AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY child_id, achievement_id
      ORDER BY earned_at ASC NULLS LAST, created_at ASC NULLS LAST, id ASC
    ) AS duplicate_rank
  FROM public.child_achievements
)
DELETE FROM public.child_achievements AS child_achievement
USING ranked_child_achievements
WHERE child_achievement.id = ranked_child_achievements.id
  AND ranked_child_achievements.duplicate_rank > 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'child_achievements_unique_child_achievement'
      AND conrelid = 'public.child_achievements'::regclass
  ) THEN
    ALTER TABLE public.child_achievements
    ADD CONSTRAINT child_achievements_unique_child_achievement
    UNIQUE (child_id, achievement_id);
  END IF;
END;
$$;

COMMIT;
