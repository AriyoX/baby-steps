# Language Support Plan

> Historical rollout plan: the database-backed content phase described as future work below is now implemented. Do not use the bundled fallback instructions in this plan operationally. Use [Database-Backed Content](features/database-content.md) and [Content Authoring And New Games](development/content-authoring-and-new-games.md#adding-a-language) for current runtime and language-addition rules.

## Current State

Baby Steps is language-aware only in a limited UI-label sense. `context/language-context.tsx` stores a global `isLuganda` boolean in AsyncStorage, and `components/translated-text.tsx` uses exact-string lookups from `lib/translations.ts`. That does not choose learning content for a child.

Learning content is still mostly bundled and hardcoded. Some game content lives under `content/games/`, while stories, museum content, cultural games, and navigation cards are still embedded directly in components. The current database schema has `children`, `activities`, `achievements`, and `child_achievements`, but no selected learning language and no language-specific activity/progress fields.

This pass adds a small local content registry and a required child-profile language field in the add-child flow:

- `content/languages.ts`
- `content/types.ts`
- `content/luganda/index.ts`
- `content/runyankole/index.ts`
- `content/index.ts`
- `content/__tests__/languageContent.test.ts`
- `app/parent/add-child/language.tsx`

The registry supports `lg` for Luganda and `nyn` for Runyankole. Luganda adapts the existing prototype content. Runyankole is tiny, placeholder-only sample content for switching tests.

The add-child flow now asks the parent to choose the child's learning language during profile setup. That value is inserted as `children.selected_language_code`. The app expects the minimal database language schema to be applied before this flow is used against Supabase.

## Hardcoded Luganda And Language Assumptions

The audit found these current content areas and assumptions:

| Area | Current location | Notes |
| --- | --- | --- |
| Luganda lesson stages, levels, words, examples, audio names, images | `content/games/lugandawords.ts` | Uses `LUGANDA_STAGES`, `WordItem.luganda`, and helper names such as `getWordsForLevel`. |
| Luganda learning game screen | `components/games/LearningGameComponent.tsx` | Imports `LUGANDA_STAGES` directly, renders `currentWord.luganda`, uses `luganda_learning_game` achievement key, and writes `activity_type: "language"` without language context. |
| Luganda learning progress | `components/games/utils/progressManagerLugandaLearning.ts` | AsyncStorage keys are `luganda_total_score`, `luganda_completed_levels`, `luganda_stages`, and `luganda_user_stats`, keyed only by child ID. |
| Word game levels | `content/games/wordgamewords.ts` | Targets are Luganda words and Luganda/Buganda clues, hints, images, and level order. |
| Word game screen | `components/games/WordGameComponent.tsx` | Imports `gameLevels` directly and assumes one global word list. |
| Word game progress | `components/games/utils/progressManagerWordGame.ts` | Key is `@BabySteps:WordGame:{childId}` and does not include language. Unlock logic uses the single `gameLevels.length`. |
| Counting game stages and labels | `content/games/countingGameStages.ts` | Uses `LugandaNumber`, `luganda` fields, `COUNTING_GAME_STAGES`, and `getLugandaWord`. |
| Counting game screen | `components/games/CountingGameComponent.tsx` | Imports counting data directly, renders "Luganda Counting Game", calls `getLugandaWord`, and includes Luganda prompt text. |
| Counting game progress | `components/games/utils/progressManagerCountingGame.ts` | Key is `@BabySteps:CountingGame:{childId}` and does not include language. Stage count comes from `COUNTING_GAME_STAGES.length`. |
| Child games/cards menu | `components/child/AfricanThemeGameInterface.tsx` | Static cards say "Learning common Luganda words" and "Count with traditional Luganda number systems". Stories and cultural game cards are Buganda-focused. |
| Stories and quizzes | `components/stories/*Story.tsx` | Story pages, quiz questions, options, images, and activity names are embedded in each component. Most are English stories about Buganda culture, not language-specific Luganda curriculum. |
| Cultural card matching | `components/games/CardsMatchingComponent.tsx` | Hardcoded Buganda terms and explanations include Luganda words and cultural items. |
| Puzzle game | `components/games/PuzzleGameComponent.tsx` | Hardcoded Buganda heritage puzzle data. |
| Museum screens | `app/child/games/museum/*.tsx` | Hardcoded Buganda artifacts, instruments, art, textiles, descriptions, and media. |
| UI translations | `lib/translations.ts` | English-to-Luganda exact-string UI labels. This is separate from learning-content language. |
| Audio mapping | `components/games/utils/audioManager.ts` | Imports `WordItem` from `lugandawords.ts` and maps Luganda words to bundled audio. |
| Activity tracking | `lib/utils.ts` and game/story components | `activities` rows include child, type, score, stage, level, and details, but no `language_code`. |

## How Content Is Chosen Today

Content is chosen by route and direct imports, not by child language:

1. Parent opens a child profile in `app/parent/child-detail/[id].tsx`.
2. `handleLaunchChildMode` stores `id`, `name`, `gender`, and `age` in `ChildContext`.
3. `app/child/_layout.tsx` checks `activeChild`; if it is missing, it redirects to `/parent`.
4. Child screens render static menus and game/story components.
5. Those components import Luganda/Buganda content directly.

The child profile now has an app-level selected learning language concept through `selected_language_code`. The existing `LanguageProvider` still only toggles UI labels globally and should not be treated as the child's learning language preference.

## Why Language Switching Matters

Baby Steps' main product promise is learning through multiple local languages. If a child selects Runyankole, the app should load Runyankole learning content, progression, and prompts. It should not quietly show Luganda words, Luganda stages, or Luganda progress unless the product explicitly chooses a fallback and explains it in the UI.

Luganda and Runyankole should be separate curricula. Some vocabulary can overlap, but stages, word choices, cultural examples, stories, audio, and difficulty should be allowed to differ.

## Local Content First

The MVP-friendly approach is:

1. Keep content local and bundled for now.
2. Organize content by language code.
3. Route screens through simple content helpers.
4. Add child language preference after the schema can support it.
5. Add database content only after the local content contracts are proven.

The new local registry exposes:

- `getContentForLanguage(languageCode, options)`
- `getStoriesForLanguage(languageCode)`
- `getLessonsForLanguage(languageCode)`
- `getGamesForLanguage(languageCode)`
- `hasLocalContentForLanguage(languageCode)`

Fallback behavior is explicit. `getContentForLanguage("fr")` defaults to Luganda only when fallback is allowed. The focused helpers do not fallback; unknown languages return empty or `undefined` content. This is important because Runyankole mode should not accidentally show Luganda content.

## Proposed Content Structure

Current simple structure:

```text
content/
  languages.ts
  types.ts
  index.ts
  luganda/
    index.ts
  runyankole/
    index.ts
  games/
    lugandawords.ts
    wordgamewords.ts
    countingGameStages.ts
```

Future local content can grow like this without a database migration:

```text
content/
  luganda/
    stories.ts
    lessons.ts
    games.ts
    media.ts
  runyankole/
    stories.ts
    lessons.ts
    games.ts
    media.ts
```

Keep stable IDs in local content now so it can later move into seed data.

## Child Language Context

Near-term app state should know:

- active child ID,
- selected learning language code,
- available local content for that language,
- progress and activities for that child and language.

Recommended simple path:

1. Apply the minimal database language schema so `children.selected_language_code` exists.
2. Set `selected_language_code` during child profile creation.
3. Load that field in `app/parent/child-detail/[id].tsx`.
4. Store it on `activeChild` in `ChildContext`.
5. Resolve content with `getContentForLanguage(activeChild.selected_language_code, { allowDefaultFallback: false })`.
6. Show an empty/missing-content state if a language has no content for a screen.
7. Only use Luganda fallback when the product explicitly opts into it.

Do not expose child-mode language switching for now. Language selection belongs to parent sign-up/add-child setup and should remain read-only afterward unless a future parent-only edit flow is intentionally designed.

## Sample Runyankole Content

`content/runyankole/index.ts` includes placeholder Runyankole sample content:

- one sample story shell,
- one lesson stage with two small levels,
- three word-game sample levels,
- one counting stage with numbers 1-5.

This content is marked `status: "placeholder"` and should not ship as final curriculum. It exists to prove that `nyn` can return language-specific local content without falling back to Luganda.

Public references used only for placeholder sanity checks:

- Omniglot Nkore phrases: https://omniglot.com/language/phrases/nkore.htm
- Nkore Kiga Academy counting sample: https://nkorekigaacademy.com/lessons/beginner/counting-numbers
- Uganda Ministry of Education Runyankore-Rukiga sample PDF: https://www.education.go.ug/wp-content/uploads/2020/05/Runyankore-Rukiga-1-Copy.pdf

Final Runyankole content needs review by a qualified speaker/curriculum reviewer.

## Game Levels And Stages

Current level/stage logic assumes one content set:

- Luganda learning stage unlocks use `LUGANDA_STAGES` and `requiredScore`.
- Word game unlocks compare against `gameLevels.length`.
- Counting unlocks compare against `COUNTING_GAME_STAGES.length`.
- Progress keys are child-specific but not language-specific.

Simple adjustment path:

1. Make each game receive `languageCode` and content from the registry.
2. Include language in progress keys, for example `@BabySteps:WordGame:{childId}:{languageCode}`.
3. Let each language define its own number of stages, levels, words, and unlock thresholds.
4. If selected language content is missing, show "content coming soon" instead of substituting Luganda.

Do not force Runyankole to match Luganda's stage count.

## Progress And Activity Tracking

Current activity rows cannot answer "what language did this child learn in?" because `activities` has no language column. AsyncStorage progress also cannot separate Luganda and Runyankole for the same child.

Near-term progress/activity improvements:

- add `language_code` to `activities`,
- include language code in local progress keys,
- include language in achievement checks where achievement meaning is language-specific,
- add language to story/game activity details only as a temporary bridge if schema changes are not ready.

Do not redesign the whole progress system before the MVP needs database content.

## Minimal Database Changes

The required minimal schema step before profile creation can save language is:

1. Add `languages`.
2. Add non-null `children.selected_language_code`.
3. Add `activities.language_code`.

The runnable Supabase migration is `supabase/migrations/20260619000000_add_child_language_support.sql`. The older `docs/database/minimal-language-schema-proposal.sql` remains a proposal/reference copy.

Do not add full story, lesson, game, media, quiz, publishing, admin, or creator tables yet. Those belong to a later content-platform phase.

## Future Database Content Migration

Recommended sequence:

1. Keep hardcoded content but organize it by language.
2. Add a content service/repository layer that wraps local content reads.
3. Add sample Runyankole local content.
4. Test language switching in child mode.
5. Add minimal child language preference support.
6. Track activities/progress with language context.
7. Only then design and seed database content tables.
8. Migrate local content into seed files.
9. Replace local content reads with database/API reads behind the same service.

Luganda stories have since moved into `content_items` story payloads rendered by the generic story route. Future story content should follow that contract, while any remaining legacy story components can stay deprecated until they are safe to delete.

## Risks And Open Questions

- Which language should a new child default to: Luganda, parent-selected, or "choose before child mode"?
- Should UI labels follow the child's learning language, the parent's app language, or remain separate?
- How should missing content be presented to children without creating a bad learning moment?
- Who reviews Runyankole spelling, examples, audio, and cultural context?
- Should achievements be per language or shared across equivalent game types?
- How should existing Luganda progress migrate once language-specific keys are added?
- Which content type should be the first database seed candidate: lesson words, word game levels, or counting stages?

## Manual QA Checklist

- [ ] Existing Luganda learning, word, and counting games still load.
- [ ] Add-child flow requires a learning language before profile save.
- [ ] New child rows persist `selected_language_code`.
- [ ] Parent child-detail reads `selected_language_code` and passes it to child mode.
- [ ] `getContentForLanguage("lg", { allowDefaultFallback: false })` returns Luganda content.
- [ ] `getContentForLanguage("nyn", { allowDefaultFallback: false })` returns only `nyn` sample content.
- [ ] Runyankole story, lesson, word game, and counting helpers return placeholder content.
- [ ] Unknown language helpers do not silently return Luganda when fallback is disabled.
- [ ] If a child language preference is added later, selecting Luganda shows Luganda learning content.
- [ ] If a child language preference is added later, selecting Runyankole does not show Luganda stories/games/lessons unless fallback is intentionally enabled.
- [ ] Missing Runyankole content shows a graceful empty state.
- [ ] Game screens do not crash when a language has fewer stages or levels.
- [ ] Progress keys include language before multiple languages are enabled in production child mode.
- [ ] Activity rows include language before reporting multilingual progress.
- [ ] No UI labels imply Luganda-only learning when a non-Luganda language is selected.
