# Standalone Learning Game

## Current Status

The supplementary standalone Learning game keeps its existing stage/level/card/quiz mechanics and progress identity, but loads its language-specific stages, levels, words, copy, image keys, and audio references from the published `content_items` `learning_game` bundle.

Learning Hub remains the main curriculum. This game is reachable supplementary practice.

## Runtime

- Route: `app/child/games/learninggame.tsx`
- Renderer/mechanics: `components/games/LearningGameComponent.tsx`
- Content validation/cache: `content/contentRepository.ts`
- Progress: `components/games/utils/progressManagerLugandaLearning.ts` and the shared progress repository
- Bundled audio mechanics/map: `components/games/utils/audioManager.ts`

The screen calls `loadContentBundle` for the active child's exact language and uses `bundle.learningGame.stages`. It does not import the former Luganda stage array. Missing, malformed, or unavailable content blocks game start and shows the shared retry/coming-soon state; `nyn` never substitutes the `lg` bundle.

The canonical `lg` seed preserves the previous five stage IDs, ten globally unique level IDs, forty word IDs, order, locks, and scoring configuration. Rendering, stage/level unlock rules, quiz behavior, score calculation, audio playback, progress, activities, and achievements remain code-owned.

Stable numeric stage/level IDs and word IDs must never be renamed or reused. Progress is local-first and language-scoped, then mirrored through the existing shared progress synchronization path. Content-fetch failures do not erase progress or achievement caches.

Payload and migration instructions are in [Content Authoring And New Games](../development/content-authoring-and-new-games.md#learning_game).

## Manual QA

- Open Learning from a child whose language has a published bundle.
- Confirm stage/level order, locks, cards, images, and pronunciation playback.
- Complete a quiz and confirm existing score, progress, activity, and achievement behavior.
- Reopen the game offline after one successful load and confirm cached content and progress restore.
- Select a language without a published bundle and confirm the game does not start or display Luganda.
