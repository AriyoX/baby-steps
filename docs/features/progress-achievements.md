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
- `lib/progressRepository.ts`
- `lib/learningProgressRepository.ts`
- `utils/storage.ts`
- `context/ChildContext.tsx`
- `components/games/achievements/achievementTypes.ts`
- `components/games/achievements/achievementManager.ts`
- `components/games/achievements/useAchievements.ts`
- `context/ChildNoticeContext.tsx`
- `app/child/_layout.tsx`
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
- `ChildNoticeProvider`
- `useChildNotice`

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

## Achievement Identity, Awarding, And Notices

Achievement state has two distinct layers:

- `achievements` contains the stable achievement definitions: UUID, name, description, icon, points, `game_key`, and award condition metadata.
- `child_achievements` contains child-earned records. Each row links one child UUID to one achievement UUID, and the database unique constraint on `(child_id, achievement_id)` prevents duplicate earned records.

Definitions and earned records are child/account data, not language-specific content. Changing a child's learning language does not create another achievement identity or earned row.

`awardAchievementToChild` returns an explicit result contract:

- `status: "newly-awarded"` and `newlyAwarded: true` only when this call successfully inserts the database row.
- `status: "already-earned"` and `newlyAwarded: false` when the child-scoped cache already contains the row, an exact remote lookup finds it, or a concurrent insert loses the unique-constraint race.
- `status: "failed"` and `newlyAwarded: false` when the award cannot be checked or inserted.

`checkAndGrantNewAchievements` returns definitions only for `newlyAwarded: true` results. Existing remote rows are therefore never interpreted as fresh unlocks. Successful and already-existing remote rows update the child-achievement cache immediately, merging by `achievement_id` so the cache does not contain duplicates. Award failures return no new achievement and do not block the lesson or game completion flow.

Achievement cache behavior:

- Definitions use `cache:achievements:definitions`, with a 24-hour TTL and stale-cache fallback/background refresh.
- Earned records use `cache:child_achievements:{childId}`, with a 15-minute TTL and stale-cache fallback/background refresh.
- A successful award writes the child cache immediately. Parent achievement screens continue to read these same cached/database records.
- Reading or hydrating definitions/earned rows never produces an unlock notice. Only the result of a live completion-time award check can enqueue one.

Child-facing presentation is mounted once in `app/child/_layout.tsx` through `ChildNoticeProvider`. The provider accepts already-decided notices and is not an achievement source of truth. Achievement unlocks are compact, non-blocking cards shown one at a time in FIFO order. Multiple awards from one completion are retained and shown sequentially.

Notice deduplication is session-only. The stable key contains the active child ID, notice type, and achievement ID. A key is ignored if it is visible, queued, or was already displayed during the current mounted child session. The provider is keyed by active child and unmounts outside child mode, so changing children/accounts or leaving child mode resets this in-memory set. Notice queues and displayed keys are deliberately not persisted to AsyncStorage; reloads and hydration must not replay old unlocks.

Current offline limitation: failed achievement checks/inserts are not queued for later retry or evaluation. Progress and completion can still save, but an achievement whose insert fails while offline may require a later qualifying evaluation. Device notifications are a separate feature: `expo-notifications`, notification permissions, local/push notifications, and a notification inbox are not implemented here.

## Remote Progress Sync Audit

Implemented on 2026-06-29 as a local-first MVP sync layer.

Current local progress handling:

- Learning game: `components/games/utils/progressManagerLugandaLearning.ts` stores `totalScore`, `completedLevels`, saved stage/level lock state, and `userStats` in AsyncStorage. Keys are scoped by `childId` and `languageCode`, with explicit legacy Luganda progress-key reads. The screen reads progress in `LearningGameComponent` after loading exact-language `content_items` and updates it on level completion.
- Learning Hub: `lib/learningProgressRepository.ts` stores a local lesson-completion summary under `@BabySteps:LearningProgress:v1:summary:{childId}:{languageCode}:language`, mirrors whole-lesson completions into `child_activity_progress` and `child_stage_progress`, and rebuilds that local summary from hydrated shared progress rows. Curriculum content comes from the exact-language `learning_hub` database bundle/cache.
- Counting game: `components/games/utils/progressManagerCountingGame.ts` stores `unlockedStages`, `currentStage`, `totalScore`, `lastPlayedLevel`, `completedStages`, `playHistory`, and `childId` in AsyncStorage. Keys are scoped by `childId` and `languageCode`, with a legacy Luganda fallback. `CountingGameComponent` reads on child/language load and saves on stage selection, level changes, score achievements, and stage completion.
- Word game: `components/games/utils/progressManagerWordGame.ts` keeps the legacy unlocked/current/completed indexes for compatibility and also stores stable level IDs, the immutable Luganda migration snapshot, score, play history, and `childId`. Keys are scoped by `childId` and `languageCode`; old Luganda positional progress is projected onto current published IDs without deleting the legacy key.
- Stories: legacy story components use `StoryProgress`; DB-backed stories use `GenericStoryRenderer`. They wrote `activities` rows on read/quiz completion and now also write normalized story progress only on completion.
- Coloring: drawing state is in component memory and completed artwork is saved to the device/gallery. A normalized coloring progress row is now written only when artwork is saved.
- Card and puzzle games have child-scoped AsyncStorage managers but are not language-scoped yet. They were left out of the first remote-sync pass except as future work.
- Achievements use Supabase `achievements` and `child_achievements`; no duplicate achievement table was added.

Per-child/language safety:

- Learning, counting, and word progress keys include `childId` and `languageCode`, which avoids mixing the same child's progress across Luganda/Runyankole.
- Puzzle/card progress remains child-scoped only and should be language-scoped if those games become language-specific.
- Learning progress still identifies completed levels by numeric level ID only. Current content uses globally unique level IDs; if future content repeats level IDs inside each stage, progress should store `{ stageId, levelId }` pairs.

Stage expansion findings:

- Learning and counting stages are loaded from `loadContentBundle(languageCode)`, which reads published/startable exact-language `content_items` with last-known-good offline cache and no bundled content fallback.
- Learning now merges saved lock state onto the current content stages, so newly added DB/content stages are not hidden by an old saved `stages` array.
- Learning next-stage unlock now follows loaded stage order instead of `stageId + 1`.
- Counting now passes loaded stage IDs into the progress manager, so unlocks follow content order instead of only `1..stageCount`.
- Remaining expansion risk: standalone Learning completed levels are numeric-only, so published level IDs must remain globally unique and stable.

Supabase usage found:

- `lib/utils.ts`: inserts/fetches `activities`, fetches `children` names, and computes activity stats.
- `components/games/achievements/achievementManager.ts`: fetches `achievements`, fetches/inserts `child_achievements`.
- `content/contentRepository.ts`: fetches, validates, and stale-while-revalidate caches exact-language `content_items` in memory and AsyncStorage.
- Parent dashboard/screens fetch `children`, `activities`, `achievements`, and `child_achievements`; some dashboard progress values are still placeholders.

## Remote Progress Schema

Migration: `supabase/migrations/20260629000000_add_child_progress.sql`.

Chosen design:

- `child_activity_progress`: one current summary row per `child_id`, `language_code`, and `activity_type`.
- `child_stage_progress`: optional per-stage/per-level detail keyed by `child_id`, `language_code`, `activity_type`, `stage_id`, and `level_id`.

Why this shape:

- `activities` remains an append-only activity history/log and is not used as the current-progress source.
- Existing `achievements` and `child_achievements` remain the achievement system.
- The summary table restores most MVP game state quickly; the stage table gives future games detail without a new table per game.
- Both tables include `local_updated_at`, `server_updated_at`, JSON payloads, unique constraints, indexes, and parent-owned-child RLS policies.
- `status` is constrained to `not_started`, `in_progress`, or `completed` so app typos do not become permanent DB state.
- Score, stars, attempts, completed-stage counts, and unlocked-stage values use simple non-negative checks.
- `child_stage_progress.completed_at` records semantic completion time separately from `updated_at`.
- `local_updated_at` has a database default as MVP safety, although clients should still send their own local timestamp.
- JSON GIN indexes are intentionally not created for progress payloads yet. Progress is write-heavy, and the MVP does not query inside `progress_payload`; add GIN indexes later only when JSON containment queries become real.

Scalability impact:

- The current indexes optimize the expected reads: current progress by child/language/activity and stage detail by child/language/activity.
- The schema avoids one table per game, so a new game usually adds only an `activity_type` string plus payload conventions.
- The flexible payload keeps early product changes cheap, while summary columns preserve efficient parent/dashboard queries.
- App-level stale protection remains required. The repository compares remote and local `local_updated_at` before pushing and hydrates remote only when local is missing or not dirty.

## Local-First Sync Behavior

Shared repository: `lib/progressRepository.ts`.

- UI continues reading existing local AsyncStorage progress first.
- Existing game-specific managers keep their old keys and mirror snapshots to normalized progress records.
- Existing local progress is not deleted. Legacy unscoped keys are still read as compatibility fallbacks only when the requested language is Luganda (`lg`); Runyankole (`nyn`) never reads them.
- Dirty progress is queued in AsyncStorage and pushed in batches by `syncProgressNow`.
- Before a batch is pushed, queued child IDs are filtered through the current authenticated parent's `children` rows. Foreign rows stay dirty and discoverable for their owning account while owned rows continue independently.
- Remote sync is triggered after meaningful completions and child/profile load, and debounced after local saves.
- Supabase failures or missing auth sessions leave dirty local records queued and do not erase progress.
- Hydration only writes remote progress locally if the exact child/language/activity snapshot is still absent or clean and unchanged from the raw state observed for that request, and the existing remote-newer policy allows the write.
- Repository mutations and hydration's final check/write share a per-snapshot serializer. A local mutation that appears, becomes dirty, or changes while the remote read is pending therefore wins for that exact identity.
- Sync completion re-reads the local snapshot before clearing `dirty`, so newer local progress made while an upsert is in flight stays dirty and queued.

Final hydration and sync rules:

- Game screens load child/language-scoped local progress first. When both game-manager and shared local progress are absent, Counting, Word, and legacy Learning await an exact remote hydration attempt bounded to two seconds. They restore a returned remote snapshot as clean local state; auth failure, query failure, or timeout returns an unsaved default so the game still opens.
- Timed-out hydration is aborted, and signal checks prevent the repository from starting a local snapshot write after the timeout has won. This cannot undo an `AsyncStorage` write already issued or guarantee cancellation of a Supabase request already accepted by the server.
- A remote row that has already been hydrated into normalized local progress can be restored immediately from local storage on game load.
- Hydration timestamps are scoped by `childId`, `languageCode`, and `activityType` with keys shaped like `progress:lastHydratedAt:{childId}:{languageCode}:{activityType}`.
- Default hydration cooldown is 20 minutes. Within that window, opening the same game/profile does not refetch remote progress unless hydration is forced because local progress is missing or a manual sync path is added.
- If local progress exists, background freshness checks only run when the cooldown is stale.
- Child/profile switching starts by flushing the previous child’s dirty queue in the background, then syncs/hydrates the new child’s known activity types with cooldown checks.
- Child/profile switching also merges hydrated Learning Hub `activity_type = "language"` rows back into the Learning Hub summary cache so the stage path can show Review/Completed after login or child switch.
- Small progress mutations, such as stage selection or last-played level updates, save locally, mark dirty, and rely on the 15-second debounced sync.
- Immediate `syncProgressNow(childId)` is reserved for meaningful events: learning/word level completion, counting stage completion, story read/quiz completion, artwork saved, child switch, and the short bounded normal-sign-out attempt.
- Normal sign-out clears active-child state and invalidates pending scheduled child work before attempting that bounded sync. The sign-out flush is aborted on timeout, and sync rechecks that the same parent session remains active before each remote phase. Timeout, account change, or failure never blocks Supabase sign-out and never clears dirty records.
- Sync reconciliation fetches only the child/language/activity slices represented by dirty records before upserting, then skips local records when the remote `local_updated_at` is newer.

MVP boundary: there is no general remote/local merge. If a fresh device has no local progress, bounded hydration times out, and the child immediately starts from defaults, this pass does not guarantee reconciliation with richer remote progress. It also does not make activity inserts exactly-once, add server revisions, correct clock skew, or promise cancellation of an already-issued Supabase upsert.

Integrated now:

- Learning Hub: local lesson summary, remote hydration fallback from `child_activity_progress` / `child_stage_progress`, child/language-scoped cache keys, stage-path Review/Completed restoration, normalized progress mirror, and immediate sync attempt after whole-lesson completion.
- Legacy Learning game: local load, remote hydration fallback on new device, normalized summary/stage mirror, background sync after completion.
- Counting: local load, remote hydration fallback, content-order stage unlocks, normalized summary/stage mirror, background sync after stage completion.
- Word game: normalized summary mirror and remote hydration fallback.
- Stories: normalized completion rows for reads/quizzes.
- Coloring: normalized completion row when saved artwork is written.

## Adding A New Game

For a future game, progress should be added through the shared repository instead of creating another Supabase table.

Recommended steps:

1. Choose a stable `activity_type`, for example `memory`, `tracing`, or `music`.
2. Keep gameplay local-first. Store the game’s immediate state in AsyncStorage first, preferably with keys scoped like `@BabySteps:{Game}:{childId}:{languageCode}` if language-specific.
3. On screen load, read local progress first. If both game-specific and normalized local progress are missing, use the shared bounded local-miss hydration helper for the exact child/language/activity slice, then re-read normalized progress before deciding whether to return a default.
4. Use `updateActivityProgress(childId, languageCode, activityType, data)` for the game summary. Put dashboard-friendly values in columns (`status`, `score`, `stars`, `attempts`, `last_stage_id`, `highest_unlocked_stage`, `completed_stage_count`) and game-specific details in `progress_payload`.
5. Use `markStageStarted` and `markStageCompleted` only for meaningful stage/level milestones, not every tap.
6. Trigger `syncProgressNow(childId)` after meaningful completions or screen exit. Let normal saves rely on the repository debounce.
7. Keep achievement unlocking separate: use existing `achievements` and `child_achievements`, and pass progress events into `useAchievements` if the game has awards.
8. If the game is not language-specific, still pass the active child language for consistency unless product decides that activity should use a global language code.
9. Add a small manager test that verifies local save, dirty queueing, remote hydration, and child/language isolation.

Example summary payload shape:

```ts
await updateActivityProgress(childId, languageCode, "memory", {
  status: "in_progress",
  score: totalScore,
  attempts,
  last_stage_id: String(currentStageId),
  highest_unlocked_stage: highestUnlockedStage,
  completed_stage_count: completedStages.length,
  progress_payload: {
    completedStages,
    unlockedStages,
    lastPlayedLevelByStage,
    gameVersion: 1,
  },
});
```

## Caching Next Plan

| Area | Fetched From | Safe To Cache? | Suggested Cache Key | Invalidation | Priority |
| --- | --- | --- | --- | --- | --- |
| `achievements` | `achievementManager.fetchAllDefinedAchievements` | Yes; definitions change rarely | `@BabySteps:Achievements:v1:{gameKeyOrAll}` | TTL plus manual clear after seed changes | High |
| `child_achievements` | `fetchChildEarnedAchievements`, child detail, all achievements | Yes per child | `@BabySteps:ChildAchievements:v1:{childId}` | Refresh after award, profile load, and short TTL | High |
| `activities` | `getChildActivities`, `getActivityStats`, parent dashboard/activity screen | Yes for recent lists/stats | `@BabySteps:Activities:v1:{childId}` | Refresh after `saveActivity`, realtime event, pull-to-refresh, short TTL | Medium |
| `content_items` | `contentRepository.loadContentBundle` | Already cached | `@BabySteps:ContentBundle:v2:{languageCode}` | 6-hour stale-while-revalidate plus row `content_version`/`updated_at`; malformed refresh retention | Done |
| Game metadata/menus | Derived from `content_items` | Yes through content bundle cache | same as content bundle | Same as content bundle | Medium |
| Parent child list | Parent screens query `children` | Yes per parent session | `@BabySteps:Children:v1:{parentId}` | Add/edit child, app foreground, short TTL | Medium |

Do not implement broad caching until progress sync is stable. The highest-impact next step is caching achievements and child achievements because the game hook fetches them repeatedly.

## API Or Database Usage

- Inserts and selects from `activities`.
- Selects from `achievements`.
- Inserts and selects from `child_achievements`.
- Selects from `children`.

## Tests

Current focused coverage:

- `lib/__tests__/progressRepository.test.ts` covers local dirty queueing, no-session sync preservation, upsert payload sanitization, dirty-safe hydration, hydration cooldown scoping, partial hydration failure behavior, and in-flight sync races.
- `supabase/migrations/__tests__/progressMigration.test.ts` covers the normalized progress migration shape, constraints, indexes, and RLS policy intent.
- `components/games/achievements/__tests__/achievementManager.test.ts` covers newly inserted, cached, remote-existing, concurrent unique-race, cache-update, and failed award results.
- `context/__tests__/ChildNoticeContext.test.tsx` covers render, automatic/manual dismissal, FIFO ordering, multiple notices, session deduplication, timer cleanup, touch pass-through structure, and reduced motion.
- Learning Hub completion tests cover full-batch notice handoff and continuing from the completion screen, while source integration tests keep every standalone game on the shared notice path.
- Existing content-helper tests indirectly cover some stage/content unlock behavior.

Remaining gaps: Supabase activity writes and parent activity dashboard behavior are not yet covered by end-to-end tests. Standalone game notice wiring has focused source-level integration coverage rather than full gameplay rendering for every game.

## Known Limitations Or Bugs

- Progress is still split between game-specific AsyncStorage keys and the normalized `child_activity_progress` / `child_stage_progress` tables.
- Existing game-specific managers still own immediate gameplay state and mirror snapshots into the normalized progress repository.
- `activities.score` is text in `schema.sql`.
- `activities.details` is text, not structured JSON.
- Achievement definitions are not seeded in the schema file.
- Parent progress screen contains hardcoded sample data.
- Failed/offline achievement inserts are not queued for later evaluation.

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
- [ ] Confirm `child_activity_progress` and `child_stage_progress` rows appear after meaningful completions.
- [ ] Confirm activities screen filters and search still work.
- [ ] Seed achievement definitions and confirm expected achievements unlock.
- [ ] Trigger one achievement and confirm its compact card dismisses automatically without blocking game controls or navigation.
- [ ] Trigger multiple achievements in one completion and confirm every card appears once in FIFO order without stacking.
- [ ] Dismiss a notice manually and confirm gameplay/completion controls remain usable.
- [ ] Repeat the same completion and confirm an already-earned achievement notice does not replay.
- [ ] Switch child profiles and confirm notices and earned records do not mix between children.
- [ ] Enable reduced motion and confirm unlock notices avoid enter/exit animation.
- [ ] Confirm device notification permission is not requested.
- [ ] Confirm child detail shows earned achievements.
- [ ] Confirm all-achievements groups definitions by game.
- [ ] Confirm progress survives app restart for local-progress games.
- [ ] First launch with no progress shows default unlocked content.
- [ ] Complete one learning stage, close/reopen, and confirm progress remains.
- [ ] Complete one counting stage, close/reopen, and confirm progress remains.
- [ ] Clear local storage or test another device and confirm progress hydrates from Supabase.
- [ ] Go offline, complete a stage, reconnect, and confirm pending progress syncs.
- [ ] Switch language and confirm Luganda/Runyankole progress does not mix.
- [ ] Switch child/profile and confirm progress does not mix.
- [ ] Add a counting stage in content and confirm the next-stage unlock follows content order.
- [ ] Add a learning stage in content and confirm old local progress does not hide the new stage.
