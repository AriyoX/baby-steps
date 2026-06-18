# Progress And Achievements

## Current Status

Partially implemented.

## Purpose

Progress and achievements help parents see what children have completed and reward children for game milestones.

## User Flow

1. Child plays games or stories.
2. Some completions write `activities` rows.
3. Some game milestones call achievement checks.
4. Earned achievements are written to `child_achievements`.
5. Parent dashboard and activities screens show activity summaries.
6. Child detail and all-achievements screens show achievement progress.

## Main Files Involved

- `lib/utils.ts`
- `utils/storage.ts`
- `components/games/achievements/achievementTypes.ts`
- `components/games/achievements/achievementManager.ts`
- `components/games/achievements/useAchievements.ts`
- `components/games/utils/progressManagerWordGame.ts`
- `components/games/utils/progressManagerCountingGame.ts`
- `components/games/utils/progressManagerLugandaLearning.ts`
- `components/games/utils/progressManagerCardGame.ts`
- `components/games/utils/progressManagerPuzzleGame.ts`
- `app/parent/index.tsx`
- `app/parent/activities.tsx`
- `app/parent/all-achievements.tsx`
- `app/parent/child-detail/[id].tsx`
- `app/parent/child-progress.tsx`

## Key Components, Screens, And Functions

- `saveActivity`
- `getChildActivities`
- `getFormattedActivities`
- `getActivityStats`
- `fetchAllDefinedAchievements`
- `fetchChildEarnedAchievements`
- `awardAchievementToChild`
- `checkAndGrantNewAchievements`
- `useAchievements`

## Data And Content Used

Supabase tables from `schema.sql`:

- `activities`
- `achievements`
- `child_achievements`
- `children`

Local AsyncStorage progress keys are game-specific. Examples include:

- `@BabySteps:WordGame:{childId}`
- `@BabySteps:CountingGame:{childId}`
- `@BabySteps:CardGame:{childId}`
- `@BabySteps:CardGameOverallStats:{childId}`
- `@BabySteps:PuzzleGameProgress:{childId}`
- `luganda_total_score_{childId}`
- `luganda_completed_levels_{childId}`
- `luganda_stages_{childId}`
- `luganda_user_stats_{childId}`

## State Management And Logic Notes

- Activity history is Supabase-backed for tracked games/stories.
- Game progress is mostly local AsyncStorage.
- Achievements require Supabase-defined achievement rows.
- `app/parent/child-progress.tsx` is a static/sample progress screen and is not wired to live child data.
- `utils/storage.ts` contains generic local progress/activity/session helpers, but current screens also use game-specific managers and Supabase utilities.

## API Or Database Usage

- Inserts and selects from `activities`.
- Selects from `achievements`.
- Inserts and selects from `child_achievements`.
- Selects from `children`.

## Tests

No tests currently cover Supabase activity writes, achievement awarding, parent activity dashboards, or local progress persistence. Existing content-helper tests indirectly cover some unlock helper behavior.

## Known Limitations Or Bugs

- Progress is split between Supabase and AsyncStorage.
- There is no normalized progress table.
- `activities.score` is text in `schema.sql`.
- `activities.details` is text, not structured JSON.
- Achievement definitions are not seeded in the schema file.
- Parent progress screen contains hardcoded sample data.

## Future MVP Improvements

- Define a canonical progress/completion model.
- Add content IDs to activities and progress records.
- Add structured metadata for score, max score, percent, outcome, stage, and level.
- Add tests for achievement awarding and activity writes.
- Replace static progress screen with live data or remove it.

## Manual QA Checklist

- [ ] Complete one story read.
- [ ] Complete one story quiz.
- [ ] Complete one level/stage in each tracked game.
- [ ] Confirm rows appear in `activities`.
- [ ] Confirm activities screen filters and search still work.
- [ ] Seed achievement definitions and confirm expected achievements unlock.
- [ ] Confirm child detail shows earned achievements.
- [ ] Confirm all-achievements groups definitions by game.
- [ ] Confirm progress survives app restart for local-progress games.
