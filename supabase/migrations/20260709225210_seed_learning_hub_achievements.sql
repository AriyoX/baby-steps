-- Seed Learning Hub achievement definitions.
-- Child achievement rows reference these stable IDs through achievements.id.

BEGIN;

INSERT INTO public.achievements (
  id,
  name,
  description,
  icon_name,
  activity_type,
  points,
  trigger_value,
  game_key
)
VALUES
  (
    '7d4f6a00-4b5f-4e00-9a10-000000000101'::uuid,
    'First Learning Step',
    'You finished your first Learning Hub lesson.',
    'footsteps-outline',
    'learning_hub_first_lesson',
    10,
    NULL,
    'learning_hub'
  ),
  (
    '7d4f6a00-4b5f-4e00-9a10-000000000102'::uuid,
    'Learning Starter',
    'You completed 3 Learning Hub lessons.',
    'school-outline',
    'learning_hub_lessons_completed',
    15,
    3,
    'learning_hub'
  ),
  (
    '7d4f6a00-4b5f-4e00-9a10-000000000103'::uuid,
    'First Words Explorer',
    'You completed every startable First Words lesson.',
    'ribbon-outline',
    'learning_hub_first_words_complete',
    25,
    NULL,
    'learning_hub'
  ),
  (
    '7d4f6a00-4b5f-4e00-9a10-000000000104'::uuid,
    'Quiz Helper',
    'You finished a Learning Hub quiz lesson.',
    'help-circle-outline',
    'learning_hub_mini_quiz_lesson',
    15,
    NULL,
    'learning_hub'
  ),
  (
    '7d4f6a00-4b5f-4e00-9a10-000000000105'::uuid,
    'Story Listener',
    'You finished a Learning Hub story bite.',
    'book-outline',
    'learning_hub_story_bite_lesson',
    15,
    NULL,
    'learning_hub'
  )
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon_name = EXCLUDED.icon_name,
  activity_type = EXCLUDED.activity_type,
  points = EXCLUDED.points,
  trigger_value = EXCLUDED.trigger_value,
  game_key = EXCLUDED.game_key;

COMMIT;
