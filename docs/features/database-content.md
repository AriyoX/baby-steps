# Database-Driven Content

## Current Status

Planned. A first content-boundary cleanup exists for some game content, but the app does not yet load curriculum content from a database.

## Purpose

Database-driven content would allow Baby Steps to manage stories, games, lessons, media, localization, publication status, and content updates without editing app component files.

## User Flow

No production user flow exists yet.

Current content flow:

1. App loads bundled component and content files.
2. Game/story/museum screens render hardcoded content.
3. Some interactions write activity/progress records.

Future flow:

1. App loads published content by stable content IDs.
2. App falls back to bundled content when network/database content is unavailable.
3. Activities and progress link to content IDs and content versions.

## Main Files Involved

Current hardcoded content locations:

- `content/games/countingGameStages.ts`
- `content/games/lugandawords.ts`
- `content/games/wordgamewords.ts`
- `components/stories/*Story.tsx`
- `components/games/CardsMatchingComponent.tsx`
- `components/games/PuzzleGameComponent.tsx`
- `components/child/AfricanThemeGameInterface.tsx`
- `app/child/games/museum/*.tsx`
- `app/child/games/coloring/*.tsx`
- `lib/translations.ts`
- `assets/`
- `schema.sql`
- `REFACTOR_REPORT.md`
- `VERIFICATION_REPORT.md`

## Key Components, Screens, And Functions

No database content loader exists yet. Current relevant helpers are content-specific:

- `getWordsForLevel`
- `getLevelsForStage`
- `getLugandaWord`
- `getRandomNumbersForStage`
- game progress managers under `components/games/utils/`

## Data And Content Used

Currently hardcoded:

- Stories, story pages, story quizzes, and story images.
- Games, stages, levels, prompts, answers, and media.
- Luganda lesson words and audio mappings.
- Museum categories, descriptions, sounds, and videos.
- Coloring template route metadata.
- UI translations.

## State Management And Logic Notes

- `content/games/` is a useful first boundary for structured game/lesson content.
- Story and museum content remain embedded in screen components.
- Activities do not yet reference stable content IDs.
- Content versioning and cache behavior do not exist.

## API Or Database Usage

No database content API exists.

`schema.sql` does not contain tables for:

- curricula,
- lessons,
- lesson items,
- stories,
- story pages,
- questions/options,
- games,
- levels/prompts/options,
- media assets,
- localization,
- content versions,
- content publishing workflow,
- creator/admin roles.

## Tests

Existing tests cover only some pure content helpers in `content/games/`.

## Known Limitations Or Bugs

- There is no database content schema.
- There are no content IDs tying activities/progress to content.
- Story content is duplicated across components.
- Museum content is screen-local.
- Media uses bundled `require()` calls rather than asset metadata.

## Future MVP Improvements

- Define TypeScript content contracts before adding database tables.
- Add stable IDs for stories, lessons, games, levels, questions, answers, and media.
- Migrate one low-risk content type first, likely Luganda lesson words or word game levels.
- Keep bundled fallback content while API/database content is introduced.
- Add content versioning before replacing hardcoded content.

## Manual QA Checklist

- [ ] Confirm all current hardcoded content still renders before any migration.
- [ ] Validate new content contracts against existing content files.
- [ ] Migrate one content type only and compare old/new behavior.
- [ ] Confirm activity rows use stable content IDs after migration work begins.
- [ ] Test offline fallback before disabling bundled content.
