# Progress, Content, and Read Cache Audit

Last updated: 2026-07-01

## Progress Sync

The current progress system is local-first and MVP-safe.

- Game managers load AsyncStorage/default state first, then call `hydrateProgressFromRemote` without blocking gameplay.
- Progress storage keys include child, language, and activity identifiers.
- Hydration cooldown keys are scoped by `childId + languageCode + activityType`.
- Remote hydration does not overwrite dirty local progress.
- Failed sync keeps dirty queue items for a later retry.
- Sync completion only clears dirty records when the local `local_updated_at` still matches the record that was pushed.
- Child and language switches are isolated by storage keys and queue identity.
- Meaningful completions call `syncProgressNow`; smaller progress changes remain local/dirty and use the debounced sync path.
- `child_activity_progress` and `child_stage_progress` are the current/restorable progress sources. `activities` remains a recent-history log.

## Active Content Flows

Repository-backed through `content/contentRepository.ts` and Supabase `content_items` when usable:

- Child menu/activity menu: `AfricanThemeGameInterface` loads `child_menu` cards by language. Luganda `games` and `stories` have DB rows, while Luganda `coloring` and `museum` still come from the legacy merged local menu. Runyankole currently has DB-backed `games` and `stories` menu rows.
- Learning game: `LearningGameComponent` loads `learning_game` through the repository. Runyankole uses the DB seed when available. Luganda keeps the fuller legacy local payload until DB content is at least as complete as the existing bundled stages.
- Counting game: `CountingGameComponent` loads `counting_game` through the repository. Runyankole uses the DB seed when available. Luganda keeps the fuller legacy local payload while the DB seed is partial.
- Word game: `WordGameComponent` loads `word_game` through the repository. Runyankole uses the DB seed when available. Luganda keeps the fuller legacy local payload while the DB seed is partial.
- Dynamic story renderer: `app/child/stories/[storyId].tsx` renders stories from the loaded bundle. It is active for the Runyankole seeded story and ready for Luganda once Luganda story rows are seeded.

Local/static or legacy flows still present:

- Luganda story menu payloads currently point to legacy routes such as `child/stories/kintustory`, which render hardcoded components like `KintuStory.tsx`.
- Runyankole story menu uses the generic DB/content-repository story route.
- Puzzle, card matching, museum, and coloring content remain code/local-asset backed. Coloring writes progress when artwork is saved but the templates are route-local assets.
- `app/parent/child-progress.tsx` still contains hardcoded sample dashboard data.
- Story completion/progress logic is duplicated between the generic renderer and legacy `StoryProgress` wrapper. This is acceptable for the current compatibility pass, but should be centralized during the Luganda story migration.

Smallest story cleanup still needed: seed Luganda story rows in `content_items` and update Luganda story menu `targetPage` values to `child/stories/{storyId}` so the generic renderer is the active flow for all languages.

## Read Caches

- `content_items`: `@BabySteps:ContentBundle:v1:{languageCode}`, TTL 6 hours. Fresh cache returns immediately; stale cache returns immediately and refreshes in the background. Forced refresh bypasses cache and falls back to same-language cached DB content if Supabase fails.
- `achievements`: `cache:achievements:definitions`, TTL 24 hours. Definitions are cached globally and filtered in memory by game key.
- `child_achievements`: `cache:child_achievements:{childId}`, TTL 15 minutes. Cache is child-scoped and updated after successful award writes. Awarding also checks the exact remote child/achievement pair before insert, which reduces duplicate rows while the DB unique constraint is still pending.
- Recent `activities`: `cache:activities:recent:{childId}` or `cache:activities:recent:{childId}:{languageCode}`, TTL 10 minutes, default limit 50. Activity writes invalidate both child-wide and language-scoped recent caches. Parent activity realtime refreshes bypass cache, and parent dashboard stats use the bounded recent-activity reader instead of fetching all history rows.

## Activity And Achievement Notes

- Card matching no longer writes an activity row for each matched pair.
- Puzzle no longer writes unfinished attempt rows on reset/back; completion rows remain.
- Recent activity reads use `.limit(...)` and no longer fetch unbounded child activity history.
- Earned achievements are child-scoped in code and cache keys.
- The schema snapshot does not show a unique constraint on `child_achievements(child_id, achievement_id)`. Add one in a migration before relying on database-level duplicate prevention.

## Remaining MVP TODOs

1. Add a unique `child_achievements(child_id, achievement_id)` migration after checking existing duplicate rows.
2. Seed Luganda story rows into `content_items`, then update Luganda story menu targets to the generic `child/stories/{storyId}` route.
3. Replace hardcoded/sample parent dashboard progress in `app/parent/child-progress.tsx` and the random progress placeholders on the parent index.
4. Review whether puzzle, card matching, museum, and coloring should stay code/local-asset backed for MVP or move later into a content strategy.
