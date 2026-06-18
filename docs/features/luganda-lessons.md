# Luganda Lessons

## Current Status

Implemented prototype.

## Purpose

The Luganda Learning game teaches common Luganda words through stages, levels, audio playback, and quiz-style practice.

## User Flow

1. Child opens the Games tab.
2. Child selects `Learning`.
3. The app shows stage selection.
4. Child selects an unlocked stage and level.
5. The learning screen presents Luganda words, English meanings, images, and audio.
6. The quiz portion tracks correct/wrong answers.
7. Completing levels updates local progress, writes Supabase activity, and checks achievements.

## Main Files Involved

- `app/child/games/learninggame.tsx`
- `components/games/LearningGameComponent.tsx`
- `content/games/lugandawords.ts`
- `components/games/utils/progressManagerLugandaLearning.ts`
- `components/games/utils/audioManager.ts`
- `content/games/__tests__/lugandawords.test.ts`

## Key Components, Screens, And Functions

- `LugandaLearningGame`
- `LUGANDA_STAGES`
- `getWordsForLevel`
- `unlockNextLevel`
- `unlockNextStage`
- `isStageCompleted`
- `loadGameProgress`
- `saveGameProgress`
- `playWordAudio`

## Data And Content Used

`content/games/lugandawords.ts` defines:

- 5 stages: Beginner, Elementary, Intermediate, Advanced, Expert
- 10 total levels
- 40 Luganda word items
- stage unlock score thresholds
- image references for lesson items

Bundled pronunciation audio is mapped in `components/games/utils/audioManager.ts`.

## State Management And Logic Notes

- Progress is stored in AsyncStorage with child-specific keys.
- Progress includes total score, completed levels, stage lock state, and user stats.
- Level completion can unlock the next level and, when conditions are met, the next stage.
- Achievement checks run after level/stage/score updates.

## API Or Database Usage

- Writes Supabase `activities` rows with `activity_type: "language"`.
- Reads achievement definitions and writes child achievements through the shared achievement system.
- Lesson content itself is not database-backed.

## Tests

`content/games/__tests__/lugandawords.test.ts` covers:

- selecting words and levels by ID,
- returning all configured words,
- handling unknown IDs,
- stage completion checks,
- non-mutating stage/level unlock helpers.

## Known Limitations Or Bugs

- Lesson content and media are bundled in code/assets.
- Audio coverage depends on the static audio map.
- Progress is local-first and not normalized in Supabase.
- No interaction tests cover the full lesson/quiz flow.

## Future MVP Improvements

- Define a typed lesson content contract.
- Move lesson content behind an API/database layer only after preserving bundled fallback behavior.
- Add tests for quiz completion, progress persistence, and activity writes.
- Validate Luganda content and pronunciation with language reviewers.

## Manual QA Checklist

- [ ] Open Learning from the Games tab.
- [ ] Confirm locked and unlocked stage states.
- [ ] Open the first stage and first level.
- [ ] Play pronunciation audio for each visible word.
- [ ] Complete a level quiz with correct and wrong answers.
- [ ] Confirm score and completed-level state update.
- [ ] Leave and reopen the game to confirm local progress persists.
- [ ] Confirm a language activity row is saved.
- [ ] Confirm achievement behavior with seeded achievement definitions.
