# Stories

## Current Status

Implemented prototype.

## Purpose

Stories teach Buganda folklore, history, and cultural topics through illustrated pages, word highlighting, page navigation, and quizzes.

## User Flow

1. Child opens the Stories tab.
2. Child selects a story card.
3. The story route opens a story component.
4. Child reads through 8 pages.
5. Reaching the final page records a read activity.
6. Child can take a 5-question quiz.
7. Quiz completion records a quiz activity with score.

## Main Files Involved

- `components/child/AfricanThemeGameInterface.tsx`
- `app/child/stories/*.tsx`
- `components/stories/*Story.tsx`
- `components/stories/StoryProgress.tsx`
- `assets/story/`
- `assets/images/`
- `assets/audio/page-turn.mp3`

## Key Components, Screens, And Functions

- `StoryProgress`
- Individual story components:
  - `FigTreeStory`
  - `KasokambiryeStory`
  - `KasubiTombsStory`
  - `KintuStory`
  - `MilletStory`
  - `MwangaStory`
  - `SsezibwaStory`
  - `WalumbeStory`
- `saveActivity` from `lib/utils.ts`

## Data And Content Used

| Story component | Story title | Pages | Quiz questions |
| --- | --- | ---: | ---: |
| `components/stories/FigTreeStory.tsx` | The Generous Fig Tree | 8 | 5 |
| `components/stories/KasokambiryeStory.tsx` | Kasokambirye and the Moon | 8 | 5 |
| `components/stories/KasubiTombsStory.tsx` | Kasubi Tombs Story | 8 | 5 |
| `components/stories/KintuStory.tsx` | The Tale of Kintu | 8 | 5 |
| `components/stories/MilletStory.tsx` | Nnambi and the Millet | 8 | 5 |
| `components/stories/MwangaStory.tsx` | Kabaka Mwanga II | 8 | 5 |
| `components/stories/SsezibwaStory.tsx` | Ssezibwa Falls | 8 | 5 |
| `components/stories/WalumbeStory.tsx` | The Tale of Walumbe | 8 | 5 |

Story pages, image references, alt text, and quiz questions are hardcoded in each story component.

## State Management And Logic Notes

- Story screens keep local state for current page, highlighted word index, quiz visibility, answers, score, and quiz completion.
- Page-turn sounds use `expo-av`.
- `StoryProgress` records reading completion when `currentPage === totalPages - 1`.
- Each story component separately handles quiz scoring and quiz activity writes.
- `StoryProgress` contains a `handleQuizComplete` helper, but current story components do not appear to call it.

## API Or Database Usage

- Story read and quiz completion activities write to Supabase `activities` with `activity_type: "stories"`.
- Stories themselves are not database-backed.

## Tests

No tests currently cover story rendering, navigation, read tracking, quiz scoring, or story activity writes.

## Known Limitations Or Bugs

- Story code is duplicated across eight large components.
- Story content, quiz data, and media are hardcoded.
- There is no shared story content model.
- Some source text/media references show encoding artifacts.
- No automated test catches inconsistent story behavior.

## Future MVP Improvements

- Define a story content contract with pages, media, quiz questions, and localization fields.
- Build a shared story player.
- Migrate one story to the shared model before changing all stories.
- Add story smoke tests and quiz scoring tests.

## Manual QA Checklist

- [ ] Open every story from the Stories tab.
- [ ] Navigate forward and backward through every page.
- [ ] Confirm images render and alt text/accessibility labels are present where expected.
- [ ] Confirm page-turn audio does not crash the app.
- [ ] Reach the final page and confirm a read activity is saved.
- [ ] Take each quiz.
- [ ] Confirm score display and retry behavior.
- [ ] Confirm quiz completion activity is saved.
- [ ] Check text for encoding artifacts and cultural/content accuracy.
