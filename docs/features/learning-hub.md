# Learning Hub

## Current Status

MVP content-backed hub with the first local lesson renderer.

## Purpose

The Learning tab is the child-facing hub for the upcoming structured lesson path. It replaces the visible Museum tab in child navigation, but it does not route stage cards into the older standalone Luganda learning, counting, stories, or games.

## Current MVP Stages

- First Words
- Family & Home
- Everyday Things
- Culture & Stories
- Practice Mix

Practice Mix is marked as practice content and remains locked until future progress-aware lesson completion exists.

## Content Source

Learning hub content is local JSON-backed for now:

- `content/learningHubContent.json`
- `content/learningHubRepository.ts`

The JSON models stage data, placeholder lessons, lesson items, learning goals, status, lock state, estimated minutes, and planned mechanics. This shape is intended to mimic future DB-backed content while keeping the current app offline-safe and small.

If a selected child language has no Learning hub path yet, the repository falls back to the default Luganda hub content.

## Implemented Mechanics

`tap_to_learn` is the first implemented lesson mechanic. The lesson screen loads a stage from `learningHubRepository`, finds the first tap-to-learn lesson, and shows one local JSON item at a time with a large tappable card.

The card body is a replay/listen surface only. Tapping it reveals the meaning and replays the item's bundled `audioAsset` when that key resolves through `lib/audioAssets.ts`. If the item has no valid bundled audio key, or a declared sound cannot be loaded, the lesson falls back to a short local placeholder cue (`assets/sounds/touch-1.mp3`) or visual feedback. The card body does not advance the lesson; only the separate `Next` / `Finish` action moves forward.

TODO: Replace placeholder learning cues with reviewed native-speaker recorded Luganda/Runyankole audio before production.

Progress saving is intentionally future work. The current renderer does not write local progress, sync progress, or call Supabase.

## Placeholder Mechanics

The hub still defines the remaining mechanics as data/config only:

- `listen_and_choose`
- `match_word_picture`
- `choose_correct_word`
- `mini_quiz`
- `story_bite`
- `cultural_card`
- `practice_mix`

The repository maps these keys to child-facing labels for the stage modal. Future renderers can be added behind the same local JSON shape before replacing or augmenting it with DB-backed content.

## Screen Behavior

`app/child/(tabs)/learning.tsx` consumes the repository and keeps the existing horizontal card layout. Each card shows the stage title, description, and image. Tapping a card opens a friendly stage notice with:

- stage title and description
- learning goals
- planned practice mechanics
- the stage-specific placeholder message

If a stage has unlocked `tap_to_learn` content with items, the action button starts the lesson route:

- `app/child/learning/[stageId].tsx`

Stages without startable tap-to-learn content still show `Start soon` or `Locked for now`.

## Future Work

- Connect completed lessons to local-first progress records.
- Sync lesson progress to Supabase once the lesson session model is clear.
- Replace or augment the local JSON with reviewed `content_items` payloads.
- Build the next lesson mechanic renderer.
- Add AI recommendations only after real lesson completion and weak-word data exist.

Museum remains archived and hidden for possible future redesign.
