# Progress, Content, and Read Cache Audit

Last updated: 2026-07-14

## Progress Sync

The current progress system is local-first and MVP-safe.

- Game managers read their child/language-scoped AsyncStorage state first. On a total game-specific and shared-local miss, Counting, Word, and legacy Learning await a bounded exact-slice hydration before returning an unsaved default.
- Progress storage keys include child, language, and activity identifiers.
- Hydration cooldown keys are scoped by `childId + languageCode + activityType`.
- A remote hydration result writes its exact normalized snapshot only while the snapshot is still absent or clean and byte-for-byte unchanged from the state observed by that hydration request. Repository mutations for the same child/language/activity identity share the same narrow serializer, so a mutation that appears or changes while the remote read is pending remains authoritative.
- Failed sync keeps dirty queue items for a later retry.
- Sync verifies queued child IDs against the current authenticated parent, uploads only owned rows, and retains foreign-account rows without letting them poison the owned batch.
- Sync completion only clears dirty records when the local `local_updated_at` still matches the record that was pushed.
- Child and language switches are isolated by storage keys and queue identity.
- Child switches flush/sync the previous child, hydrate the new child's known activity types, then merge hydrated Learning Hub rows into the Learning Hub summary cache.
- Meaningful completions call `syncProgressNow`; smaller progress changes remain local/dirty and use the debounced sync path.
- Normal sign-out immediately clears active-child memory, invalidates scheduled/stale child work, and allows only a short best-effort current-child sync. The attempt is aborted at its timeout, and each sync phase remains pinned to the parent session that verified child ownership. Timeout, session change, or failure does not block sign-out or delete dirty progress.
- `child_activity_progress` and `child_stage_progress` are the current/restorable progress sources. `activities` remains a recent-history log.
- Learning Hub whole-lesson completions reuse this path with `activity_type = "language"`, `source = "learning_hub"`, lesson rows in `child_stage_progress`, optional stage-complete rows in `child_stage_progress`, and an aggregate in `child_activity_progress`.

## Active Content Flows

Repository-backed through `content/contentRepository.ts` and Supabase `content_items` when usable:

- Child menu/activity menu: `AfricanThemeGameInterface` loads `child_menu` cards by language. Luganda `games` and `stories` have DB rows, while Luganda `coloring` and `museum` still come from the legacy merged local menu. Runyankole currently has DB-backed `games` and `stories` menu rows.
- Learning game: `LearningGameComponent` loads `learning_game` through the repository. Runyankole uses the DB seed when available. Luganda keeps the fuller legacy local payload until DB content is at least as complete as the existing bundled stages.
- Counting game: `CountingGameComponent` loads `counting_game` through the repository. Runyankole uses the DB seed when available. Luganda keeps the fuller legacy local payload while the DB seed is partial.
- Word game: `WordGameComponent` loads `word_game` through the repository. Runyankole uses the DB seed when available. Luganda keeps the fuller legacy local payload while the DB seed is partial.
- Dynamic story renderer: `app/child/stories/[storyId].tsx` renders stories from the loaded bundle. It is active for the Runyankole seeded story and the migrated Luganda story rows in `content_items`.

Local/static or legacy flows still present:

- Luganda and Runyankole story menu payloads use the generic DB/content-repository story route.
- Deprecated Luganda story components and old route files still exist as compatibility code, but they are no longer the menu-backed story flow.
- Puzzle, card matching, museum, and coloring content remain code/local-asset backed. Coloring writes progress when artwork is saved but the templates are route-local assets.
- `app/parent/child-progress.tsx` still contains hardcoded sample dashboard data.
- Story completion/progress logic is duplicated between the generic renderer and legacy `StoryProgress` wrapper. This remains acceptable while deprecated Luganda components exist, but can be removed when the legacy story components are deleted.

Luganda story migration status: Luganda story rows have been seeded in `content_items`, and Luganda story menu `targetPage` values now point to `child/stories/{storyId}` so the generic renderer is the active flow.

## Read Caches

- `content_items`: `@BabySteps:ContentBundle:v1:{languageCode}`, TTL 6 hours. Fresh cache returns immediately; stale cache returns immediately and refreshes in the background. Forced refresh bypasses cache and falls back to same-language cached DB content if Supabase fails.
- `achievements`: `cache:achievements:definitions`, TTL 24 hours. Definitions are cached globally and filtered in memory by game key.
- `child_achievements`: `cache:child_achievements:{childId}`, TTL 15 minutes. Cache is child-scoped and updated after successful award writes. Awarding also checks the exact remote child/achievement pair before insert, and the `20260701000000_add_child_achievements_unique_constraint.sql` migration enforces one row per child/achievement at the database level.
- Recent `activities`: `cache:activities:recent:{childId}` or `cache:activities:recent:{childId}:{languageCode}`, TTL 10 minutes, default limit 50. Activity writes invalidate both child-wide and language-scoped recent caches. Parent activity realtime refreshes bypass cache, and parent dashboard stats use the bounded recent-activity reader instead of fetching all history rows.

## Activity And Achievement Notes

- Card matching no longer writes an activity row for each matched pair.
- Puzzle no longer writes unfinished attempt rows on reset/back; completion rows remain.
- Recent activity reads use `.limit(...)` and no longer fetch unbounded child activity history.
- Earned achievements are child-scoped in code, cache keys, and the database unique constraint.
- Learning Hub achievements use the same `achievements` and `child_achievements` tables/cache. Achievement writes are attempted live and are not added to a new offline queue in this pass.
- Reachable completion paths attempt authoritative local progress first and report a failed local write through the existing internal warning path. Completion UI remains non-blocking, so a successful-looking completion is not itself proof of durable local persistence. Game and story sequencers still run their explicitly chosen activity-feed, achievement, and sync work best effort after a local failure. Learning Hub award/feed work requires a saved lesson completion and does not start when its summary write rejects. Detached requests are not added to retry queues.

Hydration cancellation has a deliberately narrow boundary. Abort and timeout are checked before the repository issues its local snapshot write, but JavaScript cancellation cannot undo an `AsyncStorage.setItem` already issued, and it cannot guarantee cancellation of a Supabase request already accepted by the server. If a fresh device times out with no local progress and the child immediately plays from defaults, this MVP does not merge that new play with richer remote progress; later conflict handling continues to use the existing timestamp policy.

## Remaining MVP TODOs

1. Decide when to delete the deprecated Luganda story components and legacy route files after the generic story flow has enough compatibility runway.
2. Replace hardcoded/sample parent dashboard progress in `app/parent/child-progress.tsx` and the random progress placeholders on the parent index.
3. Review whether puzzle, card matching, museum, and coloring should stay code/local-asset backed for MVP or move later into a content strategy.
