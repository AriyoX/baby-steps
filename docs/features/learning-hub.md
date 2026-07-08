# Learning Hub

## Current Status

MVP JSON-backed Learning hub with a DB-ready local content contract, a two-step learning-area path, and mechanic-driven lesson renderers for tap-to-learn plus listen-and-choose practice.

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

`content/learningHubRepository.ts` is the content adapter. UI and renderer components should consume normalized repository objects instead of raw JSON. The adapter handles:

- default language fallback
- stage, lesson, and item ordering
- mechanic-specific item normalization
- legacy `word` / `translation` compatibility
- logical `audioKey` / `imageKey` asset references
- local `audioAsset` / `imageAsset` fallbacks
- lesson status rules
- implemented mechanic checks

The current default language is Luganda (`lg`). If a selected child language has no Learning hub path yet, the repository falls back to the default Luganda hub content. The model is ready for future language bundles such as Runyankole / Runyankore and other Ugandan languages.

TODO: Replace placeholder vocabulary/audio with reviewed curriculum content and native-speaker recordings before production.

## Navigation Model

Learning now uses two child-facing steps:

- `app/child/(tabs)/learning.tsx` shows top-level Learning cards such as First Words and Family & Home.
- `app/child/learning/[stageId].tsx` shows the stage/path overview for one Learning area.
- `app/child/learning/[stageId]/lesson/[lessonId].tsx` runs the generic mechanic-driven lesson session.

Top-level cards no longer start the first lesson directly. Locked or planned work is represented in the stage/path overview through Locked or Coming soon lesson cards.

## Lesson Architecture

Lessons are mechanic-driven. The lesson session route loads the selected stage and exact lesson by `stageId` and `lessonId`, reads that lesson's ordered items, and renders the current item through the mechanic registry:

- `components/learning/mechanics/mechanicRegistry.tsx`
- `components/learning/mechanics/TapToLearnCard.tsx`
- `components/learning/mechanics/ListenAndChooseCard.tsx`

The route keeps only generic session state:

- current item index
- in-memory `ItemResult[]`
- generic completion state
- navigation back to the stage/path overview

Progress persistence is intentionally not implemented yet. Item results are kept in memory only for the current lesson session.

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

Lesson items use a discriminated union by mechanic. `tap_to_learn` is normalized to stable `localText` and `englishText` fields while keeping `word` and `translation` aliases for the current renderer. `listen_and_choose` uses stable option IDs, `correctOptionId`, logical `audioKey`, and local `audioAsset` fallback fields so correctness does not depend on array order. Planned mechanics have typed placeholder payloads so content can be added safely before renderers exist.

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

## Planned Mechanics

The content model and labels include planned mechanics, but they are not startable until a renderer and valid content exist:

- `cultural_card`
- `choose_correct_word`
- `match_word_picture`
- `mini_quiz`
- `story_bite`
- `practice_mix`

Unimplemented mechanics are not treated as startable. Unsupported mechanics should show a safe coming-soon state instead of crashing.

## Stage Behavior

Current MVP stages:

- First Words
- Family & Home
- Everyday Things
- Culture & Stories
- Practice Mix

First Words currently has startable `tap_to_learn` and `listen_and_choose` lessons. Its `choose_correct_word` path card remains Coming soon. Family & Home currently has a startable `tap_to_learn` lesson; its other path cards use planned mechanics and remain Coming soon. Everyday Things and Culture & Stories remain planned placeholders. Practice Mix is marked as practice content and remains locked until future progress-aware lesson completion exists.

## Future DB Mapping

No migrations have been added yet. Content remains local JSON but DB-ready. A future Supabase-backed pass can map the local contract toward tables such as:

- `learning_languages`
- `learning_stages`
- `learning_lessons`
- `learning_lesson_items`
- `learning_assets`
- `child_lesson_progress`
- `child_item_results`

`audioKey` and `imageKey` should become logical content asset references. `audioAsset` and `imageAsset` remain local bundled fallback references for now.

## Future Passes

Intentionally deferred:

- progress persistence
- activities and activity logging
- achievements
- parent dashboard summaries
- Practice Mix runtime recommendations
- AI recommendations
- Supabase sync
- database migrations

Museum remains archived and hidden for possible future redesign. No Museum routes or WebView surfaces are re-enabled by Learning Hub work.

## TODO: DB Migration Planning

- Decide canonical language codes for Luganda, Runyankole / Runyankore, and future Ugandan languages.
- Define reviewed asset records for `audioKey` and `imageKey`.
- Map readiness and lesson status rules into server-side content validation.
- Add migrations only after the local contract and first two mechanics are stable.
