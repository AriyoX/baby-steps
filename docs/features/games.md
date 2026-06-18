# Games

## Current Status

Implemented prototype.

## Purpose

Games provide child-facing learning activities for Luganda words, counting, puzzles, and Buganda cultural knowledge.

## User Flow

1. Parent launches child mode for a selected child.
2. Child lands on the Games tab.
3. Child chooses a game card.
4. The selected game opens in the `/child/games/` route group.
5. Most games save local progress and write activity rows to Supabase when milestones are reached.

## Main Files Involved

- `components/child/AfricanThemeGameInterface.tsx`
- `app/child/games/_layout.tsx`
- `app/child/games/wordgame.tsx`
- `app/child/games/cardgame.tsx`
- `app/child/games/puzzlegame.tsx`
- `app/child/games/learninggame.tsx`
- `app/child/games/lugandacountinggame.tsx`
- `app/child/games/ball-trail.tsx`
- `components/games/WordGameComponent.tsx`
- `components/games/CardsMatchingComponent.tsx`
- `components/games/PuzzleGameComponent.tsx`
- `components/games/LearningGameComponent.tsx`
- `components/games/CountingGameComponent.tsx`
- `components/games/utils/`
- `content/games/`

## Key Components, Screens, And Functions

| Game | Route | Main component | Status notes |
| --- | --- | --- | --- |
| Word Game | `/child/games/wordgame` | `WordGameComponent` | 51 hardcoded word levels, local level unlocks, Supabase activity writes. |
| Card Matching | `/child/games/cardgame` | `CardsMatchingComponent` | Buganda cultural matching pairs, local game state and stats, activity writes. |
| Puzzle Game | `/child/games/puzzlegame` | `PuzzleGameComponent` | 3x3 sliding puzzle using 3 bundled puzzle images. |
| Luganda Learning | `/child/games/learninggame` | `LearningGameComponent` | Stage/level Luganda lessons and quizzes. See [luganda-lessons.md](luganda-lessons.md). |
| Luganda Counting | `/child/games/lugandacountinggame` | `CountingGameComponent` | 4 counting stages with local stage progress and Supabase activity writes. |
| Ball Trail | `/child/games/ball-trail` | `BallTrail` | Standalone touch-trail prototype route; not linked from the current Games tab. |

## Data And Content Used

- Word game content: `content/games/wordgamewords.ts`
- Counting content: `content/games/countingGameStages.ts`
- Luganda lesson content: `content/games/lugandawords.ts`
- Card matching content: hardcoded `bugandaItemsCollection` in `components/games/CardsMatchingComponent.tsx`
- Puzzle content: hardcoded `puzzleImages` in `components/games/PuzzleGameComponent.tsx`
- Game media and sounds: `assets/images/`, `assets/puzzles/`, `assets/audio/`, `assets/sounds/`

## State Management And Logic Notes

- Local progress uses AsyncStorage through game-specific progress managers.
- Activities are saved to Supabase with `saveActivity` in `lib/utils.ts`.
- Achievements use `useAchievements` and event payloads from game components.
- Audio uses `expo-av`.
- Game components are large and currently mix UI, scoring, audio, persistence, achievements, and content-specific logic.

## API Or Database Usage

Games may write to the Supabase `activities` table with activity types:

- `words`
- `cultural`
- `puzzle`
- `language`
- `counting`

Game achievements read `achievements` and write `child_achievements`, depending on seeded achievement definitions.

## Tests

Current tests cover pure content/helper behavior only:

- `content/games/__tests__/wordgamewords.test.ts`
- `content/games/__tests__/countingGameStages.test.ts`
- `content/games/__tests__/lugandawords.test.ts`

No tests cover full game interaction, scoring screens, audio playback, activity writes, or achievements.

## Known Limitations Or Bugs

- Game code is still prototype-heavy and large.
- No UI or E2E tests cover game playthroughs.
- `expo-av` is deprecated and still used.
- Game content is mostly hardcoded or component-local.
- Activity writes can fail silently from a user perspective.
- Achievements depend on database seed data not represented in `schema.sql`.

## Future MVP Improvements

- Split each game into content, state, scoring, persistence, audio, and rendering modules.
- Add game interaction tests for core completion flows.
- Normalize activity/progress models before database content or payments.
- Replace `expo-av`.
- Move game content behind typed contracts before database migration.

## Manual QA Checklist

- [ ] Launch each game from the Games tab.
- [ ] Confirm each game shows the active child context where expected.
- [ ] Complete at least one level/stage in each game.
- [ ] Confirm local progress persists after leaving and reopening the game.
- [ ] Confirm Supabase `activities` receives expected rows.
- [ ] Confirm achievements are awarded only when achievement definitions are seeded.
- [ ] Test wrong-answer and success audio.
- [ ] Rotate/reopen on Android and iOS.
- [ ] Confirm the unlinked `ball-trail` route is either intentionally hidden or removed before MVP.
