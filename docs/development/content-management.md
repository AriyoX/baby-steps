# Content Management

## Current Status

Content is mostly bundled and hardcoded. Baby Steps does not yet have database-driven content management, admin publishing, creator workflows, or remote content updates.

## Where Content Lives

| Content type | Current location |
| --- | --- |
| Games tab cards | `components/child/AfricanThemeGameInterface.tsx` |
| Word game levels | `content/games/wordgamewords.ts` |
| Luganda lesson stages/levels/words | `content/games/lugandawords.ts` |
| Counting stages and labels | `content/games/countingGameStages.ts` |
| Card matching items | `components/games/CardsMatchingComponent.tsx` |
| Puzzle definitions | `components/games/PuzzleGameComponent.tsx` |
| Stories and quizzes | `components/stories/*Story.tsx` |
| Museum content | `app/child/games/museum/*.tsx` |
| Coloring templates | `app/child/games/coloring/*.tsx` and card list in `components/child/AfricanThemeGameInterface.tsx` |
| UI translations | `lib/translations.ts` |
| Lesson audio map | `components/games/utils/audioManager.ts` |
| Images/audio/sounds | `assets/` |

## How Stories Are Structured

Each story component defines:

- `storyPages`
- `storyQuestions`
- current page state
- highlight state
- quiz state
- page-turn audio
- Supabase activity writes
- story UI layout

There is no shared story content model yet.

## How Games Are Structured

Game content is mixed:

- Some pure content moved to `content/games/`.
- Some content remains inside game components.
- Progress managers live under `components/games/utils/`.
- Achievement logic lives under `components/games/achievements/`.

## How Lessons Are Structured

`content/games/lugandawords.ts` defines stages, levels, words, images, translations, lock state, and helper functions. `LearningGameComponent` consumes that content and manages the lesson/quiz flow.

## How To Add Or Update Content Safely

1. Identify the current source file for the content type.
2. Keep existing IDs and route targets stable unless you update every reference.
3. Add or update bundled media in `assets/`.
4. Update tests if the content has helper tests under `content/games/__tests__/`.
5. Manually test the affected screen on at least one native target.
6. If changing tracked activities, confirm Supabase activity rows still satisfy `schema.sql`.

## Current Limitations

- No content IDs for cross-feature tracking.
- No content versioning.
- No localization content model.
- No media metadata, attribution, alt-text database, or CDN layer.
- No draft/review/publish workflow.
- No role-based creator/admin tools.

## Future Database-Driven Direction

Before introducing database content:

- Define TypeScript content contracts.
- Add stable IDs.
- Add bundled fallback behavior.
- Add content versioning.
- Migrate one content type at a time.
- Connect activity/progress records to content IDs.

Recommended first candidates:

- Luganda lesson words.
- Word game levels.
- Counting stages.

Stories should migrate later because they currently mix page content, quiz data, audio, highlighting, and UI code in each component.
