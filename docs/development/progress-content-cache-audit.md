# Progress, Content, and Read Cache Audit

Last updated: 2026-07-15

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

Repository-backed through `content/contentRepository.ts` and Supabase `content_items`:

- `AfricanThemeGameInterface` loads exact-language `games`, `stories`, and `coloring` menu rows. Missing `nyn` content does not merge or fall back to Luganda.
- Learning Hub loads its exact-language `learning_hub/curriculum` bundle and performs mechanic-specific normalization before rendering.
- Word, Counting, standalone Learning, Cards, and Puzzle load their published/startable game payloads through the same repository/cache.
- `app/child/stories/[storyId].tsx` renders the eight published Luganda story rows through the generic renderer without a fixed record count.

Intentional code/static flows:

- Coloring discovery is database-backed, but its five direct canvases, palettes, and bundled template resolver map remain code-owned and do not require a database gate to render.
- Museum is archived/hidden; its gallery arrays remain code-owned behind an exact-language publication gate and no Museum menu is currently published.
- Deprecated Luganda story components and old route files remain compatibility code, not the menu-backed production content source.
- `app/parent/child-progress.tsx` still contains hardcoded sample dashboard data.
- Mechanics, scoring, progress, achievements, test fixtures, seed SQL, and static asset maps remain in code by design.

## Read Caches

- `content_items`: `@BabySteps:ContentBundle:v2:{languageCode}`, TTL 6 hours. Fresh or stale valid exact-language data returns immediately and revalidates in the background. A forced refresh queries the database while retaining the last valid exact-language cache on failure. The derived version includes ordered row identity, `content_version`, and `updated_at`; malformed or empty responses never replace a valid cache.
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

1. Decide when to delete deprecated story compatibility components after the generic story flow has enough runway.
2. Replace hardcoded/sample parent dashboard progress and random parent-index progress placeholders.
3. Keep Museum archived until its content and route behavior are deliberately reviewed and published.
4. Close the pre-existing base-migration gap so a clean local reset can validate the entire schema.
