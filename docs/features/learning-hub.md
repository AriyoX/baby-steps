# Learning Hub

## Current Status

MVP JSON-backed Learning hub with a DB-ready local content contract, a two-step learning-area path, mechanic-driven lesson renderers for tap-to-learn, listen-and-choose practice, choose-correct-word practice, match-word-picture practice, mini-quiz review, cultural cards, story bites, and local-first lesson completion tracking.

## Purpose

The Learning tab is the child-facing hub for the structured lesson path. Top-level Learning cards open a stage/path overview for that learning area, then individual path cards launch specific mechanic-driven lessons.

It replaces the visible Museum tab in child navigation, but Museum remains archived/hidden and must not be deleted or re-enabled during Learning work.

The Learning hub does not route stage cards into the older standalone Luganda learning, counting, stories, or games.

## Content Source

Learning hub content is local JSON-backed for now:

- `content/learningHubContent.json`
- `content/learningHubRepository.ts`
- `content/learningHubTypes.ts`

The JSON models a versioned content bundle with languages, stages, lessons, lesson items, mechanics, order, lock state, readiness, and startable state. This shape is intended to stay close to future DB-backed content while keeping the current MVP offline-safe.

Learning Hub content is currently available locally only when a language has an explicit bundle in `content/learningHubContent.json`. Missing or unsupported languages never fall back to another language's Learning Hub bundle. This is intentionally separate from the generic DB-backed content system, which already keeps Luganda and Runyankole content distinct.

`content/learningHubRepository.ts` is the content adapter. UI and renderer components should consume normalized repository objects instead of raw JSON. The adapter handles:

- explicit local-bundle language resolution with no cross-language fallback
- stage, lesson, and item ordering
- mechanic-specific item normalization
- legacy `word` / `translation` compatibility
- logical `audioKey` / `imageKey` asset references
- local `audioAsset` / `imageAsset` fallbacks
- lesson status rules
- implemented mechanic checks

The current default language is Luganda (`lg`) when a child has no selected language. Luganda continues to load its explicit local bundle normally. If a child selects Runyankole (`nyn`), or any other language without an explicit Learning Hub bundle, the Learning tab and direct stage/lesson routes show a language-specific unavailable state and do not load Luganda stages, lessons, mechanics, or progress in that language namespace. The selected language is not changed automatically.

Runyankole should remain in this unavailable/coming-soon state until its DB-backed Learning Hub bundle is introduced. This is a temporary safety behavior before the planned Supabase content migration; it does not add placeholder Runyankole lessons and does not change the separate generic content registry.

The current DB language code for Luganda is `lg`, matching `children.selected_language_code`. Temporary bridge helpers map legacy labels such as `luganda` / `oluganda` to `lg` and Runyankole / Runyankore labels to `nyn` so local progress uses DB-style language codes without breaking bundled content lookup.

TODO: Replace placeholder vocabulary/audio with reviewed curriculum content and native-speaker recordings before production.

## Navigation Model

Learning now uses two child-facing steps:

- `app/child/(tabs)/learning.tsx` shows top-level Learning cards such as First Words and Family & Home.
- `app/child/learning/[stageId].tsx` shows the stage/path overview for one Learning area.
- `app/child/learning/[stageId]/lesson/[lessonId].tsx` runs the generic mechanic-driven lesson session.

Top-level cards no longer start the first lesson directly. Locked or planned work is represented in the stage/path overview through Locked or Coming soon lesson cards.

The stage/path overview uses a horizontally scrollable lesson-card rail, following the stage-card rhythm used by the existing Counting and Luganda Learning games. Lesson cards show the stage/lesson number, lesson title, mechanic label, short description, item count, and Start / Review / Coming soon / Locked state.

When a lesson has been completed locally on the device, the path card can show a Completed marker and a Review action. Completed lessons remain openable for review. Completion state does not unlock new lessons yet, and locked/planned cards remain locked or Coming soon.

## Lesson Architecture

Lessons are mechanic-driven. The lesson session route loads the selected stage and exact lesson by `stageId` and `lessonId`, reads that lesson's ordered items, and renders the current item through the mechanic registry:

- `components/learning/mechanics/mechanicRegistry.tsx`
- `components/learning/mechanics/TapToLearnCard.tsx`
- `components/learning/mechanics/ListenAndChooseCard.tsx`
- `components/learning/mechanics/ChooseCorrectWordCard.tsx`
- `components/learning/mechanics/MatchWordPictureCard.tsx`
- `components/learning/mechanics/MiniQuizCard.tsx`
- `components/learning/mechanics/CulturalCard.tsx`
- `components/learning/mechanics/StoryBiteCard.tsx`

The route keeps only generic session state:

- current item index
- in-memory `ItemResult[]`
- generic completion state
- navigation back to the stage/path overview

When the final lesson item completes, the route saves one lesson-completion record through `lib/learningProgressRepository.ts`. It does not save on every tap, does not log audio replays, and does not block the completion screen if local storage or shared progress logging fails.

The same full-lesson completion also writes a parent-feed activity through the existing `saveActivity(...)` path used by games and stories. Learning does not write a feed row for each tap or answer.

Individual lesson mechanics should fit within one screen during normal child use. `tap_to_learn`, `listen_and_choose`, `choose_correct_word`, `match_word_picture`, `mini_quiz`, `cultural_card`, and `story_bite` should keep the primary content, answer choices or card copy, feedback when applicable, and advance action visible without normal vertical scrolling. Future mechanics should follow the same layout rule and only use vertical scroll as a last-resort safety fallback for unusually small screens.

## Content Contract

The public content types live in `content/learningHubTypes.ts`:

- `LearningContentBundle`
- `LearningLanguageContent`
- `LearningStage`
- `LearningLesson`
- `LearningLessonItem`
- `MechanicType`
- `ContentReadiness`
- `LessonStatus`

Lesson items use a discriminated union by mechanic. `tap_to_learn` is normalized to stable `localText` and `englishText` fields while keeping `word` and `translation` aliases for the current renderer. `listen_and_choose` uses stable option IDs, `correctOptionId`, logical `audioKey`, and local `audioAsset` fallback fields so correctness does not depend on array order. `choose_correct_word` uses `promptText`, optional `questionText`, stable option IDs, and `correctOptionId`; no audio is required for this mechanic. `match_word_picture` uses `promptText`, `targetText`, optional `targetEnglishText`, stable option IDs, `correctOptionId`, and option-level `imageKey`, `imageAsset`, or `emoji` fallback fields. `mini_quiz` uses an item-level `title`, optional `instructions`, and nested `questions[]` with stable question IDs, `promptText`, optional `promptEnglishText`, stable option IDs, `correctOptionId`, option `text`, optional option `englishText`, and optional `explanationText`. `cultural_card` uses `title`, optional `localTitle`, required `bodyText`, optional `localText`, optional `imageKey` / `imageAsset` / `emoji`, optional `funFact`, and optional `reflectionPrompt`; no answer key or correctness field is used. `story_bite` uses an item-level `title`, optional `instructions`, ordered `pages[]`, and optional `reflectionPrompt`; each page has a stable `id`, required `bodyText`, optional `title`, optional `localTitle`, optional `localText`, optional `imageKey` / `imageAsset` / `emoji`, and optional `audioKey` / `audioAsset`. Planned mechanics have typed placeholder payloads so content can be added safely before renderers exist.

`LessonStatus` values:

- `startable`
- `coming_soon`
- `locked`
- `unsupported`
- `empty`

Only `startable` lessons launch the generic session.

## Implemented Mechanics

`tap_to_learn` is implemented.

The card shows one item at a time with:

- local-language word
- English translation
- bundled image or fallback visual
- bundled/default local audio
- a separate `Next` / `Finish` action

The card body replays audio only and never advances the lesson. Missing or broken audio falls back safely and does not block completion. The implementation does not use device TTS and does not fetch internet audio.

`listen_and_choose` is implemented as the first correctness-based Learning Hub mechanic.

The card shows one item at a time with:

- a child-friendly listen-and-choose instruction
- a large replay/listen button
- 2-4 answer options
- gentle feedback for wrong answers
- a separate `Next` / `Finish` action after the correct answer

It resolves audio through the same local bundled/default audio path used by tap-to-learn. Current Listen Practice content uses placeholder/default bundled audio; real native-speaker recordings are required before production. It does not use device TTS and does not fetch internet audio.

When the child eventually chooses correctly and advances, the renderer emits an in-memory `ItemResult` with `mechanic: "listen_and_choose"`, `correct: true`, and `attempts` equal to answer attempts. Audio replays are not counted as answer attempts.

`choose_correct_word` is implemented as a correctness-based Learning Hub mechanic.

The card shows one item at a time with:

- a child-friendly choose-the-word instruction
- a prompt and optional question/meaning cue
- 2-4 answer options with stable option IDs
- gentle feedback for wrong answers
- a separate `Next` / `Finish` action after the correct answer

Correctness is determined only by matching the tapped option ID to `correctOptionId`; it does not depend on option array position. When the child eventually chooses correctly and advances, the renderer emits an in-memory `ItemResult` with `mechanic: "choose_correct_word"`, `correct: true`, and `attempts` equal to answer taps.

`match_word_picture` is implemented as a correctness-based visual association mechanic.

The card shows one item at a time with:

- a child-friendly match-the-word instruction
- a clear target word and optional English helper text
- 2-4 picture options
- image support through `imageAsset` / `imageKey` when local or future CDN references are available
- emoji fallback visuals for the current MVP content
- label fallback if a picture or emoji is unavailable
- gentle feedback for wrong answers
- a separate `Next` / `Finish` action after the correct answer

Correctness is determined only by matching the tapped option ID to `correctOptionId`; it does not depend on option array position. When the child eventually chooses correctly and advances, the renderer emits an in-memory `ItemResult` with `mechanic: "match_word_picture"`, `correct: true`, and `attempts` equal to answer taps. No audio is required for this mechanic.

Current MVP picture-match content uses bundled local `imageKey` references where a suitable reviewed asset is already available, with emoji fallbacks left in place. Remaining placeholder options should stay marked as placeholder until reviewed production artwork is added.

`mini_quiz` is implemented as a short multi-question review mechanic inside one generic lesson item.

The card shows one quiz question at a time with:

- a child-friendly quick-quiz instruction
- current question progress
- 2-4 answer options with stable option IDs
- gentle retry feedback for wrong answers
- positive feedback and optional explanation text for correct answers
- a separate action to move to the next quiz question, then `Next` / `Finish` after the final question

Wrong answer taps do not advance the quiz. Correctness is determined only by matching the tapped option ID to that question's `correctOptionId`; it does not depend on option array position. The renderer emits one in-memory `ItemResult` only after every required quiz question has been answered correctly, with `mechanic: "mini_quiz"`, `correct: true`, and `attempts` equal to total answer taps across the whole quiz item. It does not log activity per quiz question.

Current mini-quiz content includes small First Words, Family & Home, and Everyday Things placeholder drafts. It uses text only, no new images or audio, and must remain marked placeholder until reviewed production quiz copy is ready.

`cultural_card` is implemented as a short, non-graded culture/language card.

The card shows one concept at a time with:

- a friendly title
- a short explanation
- optional local-language title and text
- an optional image or emoji, with a safe icon fallback
- optional fun fact and reflection prompt
- a single `Continue` / `Finish` action

There is no right or wrong answer. Tapping the action emits one in-memory `ItemResult` with `mechanic: "cultural_card"`, `attempts: 1`, and no `correct` field. The generic lesson shell still saves progress and activity only after the final lesson item completes.

Current cultural-card content is one Family & Home placeholder draft about a Luganda morning greeting. It uses no new images or audio and must remain marked placeholder until reviewed production culture/language copy is ready.

`story_bite` is implemented as a short, non-graded story/excerpt mechanic inside the generic lesson session.

The card shows one story page at a time with:

- a story-bite label and page progress
- optional page title and local title
- required short body copy
- optional local-language helper text
- optional image or emoji, with a safe icon fallback
- optional audio replay when the page references an existing local learning audio asset
- `Next` between pages, then `I finished the story` on the final page

There is no right or wrong answer. Tapping the final-page action emits one in-memory `ItemResult` with `mechanic: "story_bite"`, `attempts` equal to pages viewed, and no `correct` field. The generic lesson shell still saves progress and activity only after the final lesson item completes. Story pages do not log activity individually.

Current story-bite content is one Family & Home placeholder draft, `Thank You at Home`, with two pages about helping at home and saying `Webale`. It uses only existing bundled image/audio assets and must remain marked placeholder until reviewed production story copy is ready.

## Local-First Progress

Learning Hub lesson completion is local-first:

- `lib/learningProgressTypes.ts`
- `lib/learningProgressRepository.ts`
- `lib/progressRepository.ts`

The Learning-specific local summary remains the source for immediate Review / Completed UI in the stage path. After that local save succeeds, the repository records the completion through the existing app progress pattern used by games and stories:

- `saveActivity(...)` writes an append-only `activities` feed entry for each completed lesson.
- If the current completion finishes all startable lessons in that Learning area, `saveActivity(...)` also writes one stage-complete feed entry.
- `updateActivityProgress(...)` queues a `child_activity_progress` aggregate for `activity_type = "language"`.
- `markLevelCompleted(...)` queues a `child_stage_progress` lesson row with the Learning area in `stage_id` and lesson ID in `level_id`.
- If all startable lessons in that Learning area are complete, `markStageCompleted(...)` also queues a stage-level `child_stage_progress` row for the same `stage_id` with an empty `level_id`.
- `syncProgressNow(childId)` attempts an immediate Supabase sync when a session is available.

Each `LearningLessonCompletion` maps cleanly to a `child_stage_progress` row:

- `childId` -> `child_stage_progress.child_id`
- `languageCode` -> `child_stage_progress.language_code`
- `activityType: "language"` -> `child_stage_progress.activity_type`
- `stageId` -> top-level Learning area, such as `first-words`
- `levelId` -> lesson ID, such as `greetings-1`
- `status`, `score`, `stars`, `attempts`, `completedAt`
- `progressPayload` -> `child_stage_progress.progress_payload`

`progressPayload` stores `source: "learning_hub"`, the lesson ID again for clarity, stage/lesson titles, mechanic types, summarized item-level `ItemResult[]`, total item count, correct item count, completion time, and the local content version when available.

`LearningProgressSummary` is shaped like a `child_activity_progress` aggregate for `activity_type = "language"`: status, attempts, last stage ID, completed stage count, completed lesson IDs, and a local lookup by lesson ID. In this pass, `completedStageCount` counts completed lesson rows because lesson completion is represented with `stageId` plus `levelId`.

The storage key includes child ID and DB language code so children and languages do not share progress. The Learning screens normalize legacy labels such as `luganda` to DB-style codes such as `lg` before reading or writing progress. If an active child ID is unexpectedly unavailable, the local-only fallback ID is `local-demo-child`; that value is not synced as a real DB UUID.

Hydration also reuses the existing progress repository. `ChildProvider` syncs the previous child, syncs/hydrates the new child, then calls `hydrateLearningProgressFromSharedProgress(...)` so hydrated `child_stage_progress` / `child_activity_progress` rows are merged back into the Learning summary cache. The Learning stage screen calls `hydrateLearningProgressFromRemote(...)` on focus, which delegates to `hydrateProgressFromRemote(childId, languageCode, { activityType: "language" })` and then merges the shared rows. The generic repository keeps the 20-minute hydration cooldown under `progress:lastHydratedAt:{childId}:{languageCode}:{activityType}`, so repeated stage opens do not repeatedly read Supabase. Remote rows are merged only when they represent `source: "learning_hub"` completions, and older hydrated rows do not replace newer local Learning summary completions.

Offline and failure behavior follows the existing app patterns. Dirty `child_activity_progress` and `child_stage_progress` rows are stored locally and queued for later sync under the shared progress queue. The append-only `activities` feed write follows the same immediate Supabase insert pattern used by games and stories, so a failed or offline feed insert is not queued in this pass. If an activity feed write, progress write, hydration attempt, or sync attempt fails, the child still reaches the completion screen and the local Learning summary remains saved.

No migration was needed for this pass. The existing progress tables already support `activity_type = "language"`, text `stage_id` / `level_id`, attempts, score, completion time, and JSON `progress_payload`.

Append-only `activities` feed rows use `activity_type = "language"`, `activity_name` values such as `Completed "Greetings" Lesson` or `Completed "First Words" Stage`, DB language code, percent score when available, and numeric `stage` / `level` values when the local content provides `stageNumber` and lesson `order`. Stage and lesson string IDs are included in `details` because the existing `activities.stage` and `activities.level` columns are numeric.

Learning Hub activity rows are compatible with the existing parent/recent activity feed. The parent-facing formatter labels `activity_type = "language"` rows as Learning, shows the activity name, time, and score, and hides Learning Hub raw `details` metadata from the UI.

The queued Supabase progress rows are intended for cross-session progress restoration and future history/dashboard readiness. Parent dashboard summaries beyond the existing activity feed are still not implemented for Learning Hub.

## Learning Hub Achievements

Learning Hub achievements reuse the existing Baby Steps achievement system instead of adding a new one:

- Achievement definitions are global/static badge definitions: ID, name, description, icon, `activity_type`, points, optional `trigger_value`, and `game_key`.
- Child achievement records are child-specific earned rows in `child_achievements`, keyed by `child_id` and `achievement_id`.
- Learning Hub content provides context only, such as `stageId`, `lessonId`, `mechanic`, and `languageCode`. Achievement state is not stored in `content/learningHubContent.json`.

The first Learning Hub badges are built into the achievement manager with stable UUIDs and `game_key = "learning_hub"`:

- First Learning Step: complete any Learning Hub lesson.
- Learning Starter: complete 3 Learning Hub lessons.
- First Words Explorer: complete all currently startable First Words lessons.
- Quiz Helper: complete a Learning Hub lesson containing `mini_quiz`.
- Story Listener: complete a Learning Hub lesson containing `story_bite`.

Achievements are checked only after the whole-lesson completion save path runs. The lesson screen calls `saveLearningLessonCompletionWithAchievements(...)`, which first saves the local Learning completion through the existing `saveLearningLessonCompletion(...)` flow, then passes the saved completion and updated completed-lesson summary to `checkAndGrantLearningHubAchievements(...)`. Individual taps, answer attempts, quiz questions, story pages, and audio replays do not award achievements.

The stage-complete condition derives the currently startable lessons from `content/learningHubRepository.ts` through `getStartableLessonsForStage(...)`. The completion payload's `stageLessonIds` is only a fallback. This keeps the achievement condition aligned with the same repository/validator logic used by the Learning Hub UI and avoids hand-duplicating lesson arrays in achievement code.

Stable IDs matter:

- `stageId` identifies the Learning area, for example `first-words`.
- `lessonId` / `levelId` identifies the completed lesson, for example `greetings-1`.
- `mechanic` / `mechanicTypes` identifies lesson mechanics such as `mini_quiz` and `story_bite`.
- `languageCode` identifies the DB-style learning language, for example `lg`.

If future content renames `stageId`, `lessonId`, or mechanic keys, existing local progress summaries and achievement conditions may no longer line up. Add content migrations or compatibility aliases before changing those IDs in shipped content.

Achievement caching stays in the existing achievement manager:

- Definitions use memory plus AsyncStorage under `cache:achievements:definitions` with a 24-hour TTL.
- Child achievements use memory plus AsyncStorage under `cache:child_achievements:{childId}` with a 15-minute TTL.
- Built-in Learning Hub definitions are merged into cached and remote definition results, so an older definitions cache does not hide the new local badges.
- After a successful child achievement insert, the child achievement cache is updated immediately.
- Duplicate unlocks are prevented by the in-memory/AsyncStorage child cache, an exact remote row check, and the existing unique database constraint on `(child_id, achievement_id)`.

The existing schema supports these achievements without new tables or columns. The `20260709225210_seed_learning_hub_achievements.sql` data migration seeds the five global Learning Hub rows into `achievements` with stable UUIDs, so `child_achievements.achievement_id` can reference them through the existing foreign key. The app keeps the built-in definitions for cache/UI resilience, but child award writes only insert into `child_achievements`.

If Supabase is offline or an achievement save fails, lesson completion still succeeds. The local Learning summary, activity attempt, and progress queue continue through their existing paths. Achievement unlocks are not added to a new offline queue in this pass; if the child-achievement insert cannot complete, no unlock notification is shown and the badge can be earned later when the completion condition is checked again.

The child completion screen shows a lightweight in-app unlock modal only for newly earned achievements returned from the award check. It is not a device push notification, does not request notification permissions, and does not run in the background.

## Audio Readiness

Learning audio is resolved through `lib/audioAssets.ts`.

`audioKey` is the logical future DB/CDN content key, for example `luganda.first_words.greetings.gyebale_ko`. `audioAsset` is the current local bundled fallback key, for example `placeholder_learning_cue` or `webale`.

Placeholder audio is only for MVP mechanic testing. The current placeholder cue resolves to an existing bundled spoken file so playback is audible offline, but it must not be treated as reviewed production pronunciation. Real native-speaker recordings are required before production.

To add a local reviewed recording safely:

- Add the audio file under `assets/audio` or a future structured `assets/audio/learning/...` path.
- Add one entry to `LEARNING_AUDIO_ASSETS` in `lib/audioAssets.ts`, using the logical `audioKey` when available.
- Keep `audioKey` in content as the stable logical reference and use `audioAsset` only for bundled fallback compatibility.
- Run the audio resolver and mechanic tests before shipping.

Audio key naming should use lowercase dot-separated content scope, such as `luganda.first_words.greetings.webale`, with underscores only inside a term when needed for readability.

Before a recording is marked production-ready, review it for native-speaker pronunciation, child-safety/content suitability, volume normalization, short file duration, and offline playback.

## Planned Mechanics

The content model and labels still include planned mechanics, but they are not startable until a renderer and valid content exist:

- `practice_mix`

Unimplemented mechanics are not treated as startable. Unsupported mechanics should show a safe coming-soon state instead of crashing.

## Stage Behavior

Current MVP stages:

- First Words
- Family & Home
- Everyday Things
- Culture & Stories
- Practice Mix

First Words currently has startable `tap_to_learn`, `listen_and_choose`, `choose_correct_word`, `match_word_picture`, and placeholder `mini_quiz` lessons. Family & Home currently has startable `tap_to_learn`, placeholder `match_word_picture`, placeholder `choose_correct_word`, placeholder `mini_quiz`, placeholder `cultural_card`, and placeholder `story_bite` lessons. Everyday Things currently has short placeholder `choose_correct_word`, `match_word_picture`, and `mini_quiz` lessons for familiar food, animal, water, and object words using existing bundled images or emoji fallbacks. Culture & Stories remains planned placeholder content. Practice Mix is marked as practice content and remains locked until a future pass has enough reviewed completion history and runtime review logic.

## Future DB Mapping

No migrations have been added for Learning Hub progress. Content remains local JSON but DB-ready. The current completion logging uses the existing child progress schema:

- Learning content can map through `content_items` using content types such as `learning_stage`, `learning_lesson`, or `learning_bundle`, with stable IDs in `slug`, ordered rows through `sort_order`, and stage/lesson/item data in `payload jsonb`.
- Lesson completion can map to `child_stage_progress`, with the top-level Learning area in `stage_id`, lesson ID in `level_id`, and item-level details in `progress_payload`.
- Aggregate Learning summary can map to `child_activity_progress` with `activity_type = "language"`.
- Append-only activity feed entries map to `activities` with `activity_type = "language"` and `language_code = "lg"` or another DB language code.

`audioKey` and `imageKey` should become logical content asset references. `audioAsset` and `imageAsset` remain local bundled fallback references for now. Current match-word-picture content uses existing bundled images where clearly suitable, keeps emoji fallback visuals for placeholder options, and remains local JSON, but its option shape is DB-ready for future image records or CDN references. Current mini-quiz content is also local JSON, with nested question/option payloads that can map cleanly into future `content_items.payload` JSON. Current cultural-card content is local JSON with simple text fields and optional visual fields that can map cleanly into future `content_items.payload` JSON. Current story-bite content is local JSON with ordered page payloads that can map cleanly into future `content_items.payload` JSON.

## Future Passes

Intentionally deferred:

- parent dashboard summaries
- Practice Mix runtime recommendations
- Practice Mix runtime logic
- AI recommendations
- Supabase content fetching for Learning Hub
- Supabase progress syncing beyond the existing progress repository path
- Learning Hub content/progress schema migrations
- full recommendation algorithm

Museum remains archived and hidden for possible future redesign. No Museum routes or WebView surfaces are re-enabled by Learning Hub work.

## TODO: DB Migration Planning

- Decide canonical language codes for Luganda, Runyankole / Runyankore, and future Ugandan languages.
- Define reviewed asset records for `audioKey` and `imageKey`.
- Map readiness and lesson status rules into server-side content validation.
- Add content/progress schema migrations only after the local contract and implemented mechanics are stable.
