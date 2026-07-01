# Language Content MVP Audit

This audit documents the controlled vertical slice that moves language-specific content into `content_items` while keeping app/game logic in React Native.

## Refactored Entry Points

- `components/child/AfricanThemeGameInterface.tsx` loads child menu cards through `content/contentRepository.ts`.
- `components/games/LearningGameComponent.tsx` loads lesson stages, levels, words, examples, and images through content items or same-language local content.
- `components/games/WordGameComponent.tsx` loads word levels, prompts, hints, and images through content items or same-language local content.
- `components/games/CountingGameComponent.tsx` loads counting stages, number labels, prompts, item labels/images, and currency payloads through content items or same-language local content.
- `components/stories/GenericStoryRenderer.tsx` renders DB/local JSON stories for language-tagged story payloads.

## Naming And Legacy Routes

- `content_items.content_type` and `content_items.slug` values are lowercase.
- The child Stories tab route remains `app/child/(tabs)/Stories.tsx`, but it maps to the lowercase `stories` content slug.
- The route `app/child/games/lugandacountinggame.tsx` is still named for the original Luganda prototype, but the mounted counting game now loads content for the active child language.

## Activity And Progress Writes Touched

- Learning game activity writes now include `language_code`.
- Word game activity writes now include `language_code`.
- Counting game activity writes now include `language_code`.
- Generic story activity writes include `language_code`.
- Shared `StoryProgress` activity writes include `language_code` for existing story components.
- Word, counting, and learning AsyncStorage progress keys now include language code.
- Legacy Luganda progress reads remain explicit compatibility paths only for `lg`.

## Remaining Luganda Or Buganda Hardcoding

- `content/luganda/index.ts` adapts existing Luganda prototype content into the local fallback bundle.
- `components/stories/*Story.tsx` still contain Luganda/Buganda story pages, images, quizzes, and route-specific layout.
- `app/child/stories/*story.tsx` are deprecated compatibility routes that redirect to the generic story route.
- `components/games/CardsMatchingComponent.tsx` still contains Buganda cultural cards and activity details.
- `components/games/PuzzleGameComponent.tsx` still contains Buganda heritage puzzle data.
- `app/child/games/museum/*.tsx` still contains hardcoded museum content.
- Coloring routes still include some Buganda-specific pages; the Runyankole child menu does not expose them unless content is added.
- Achievement definitions and checks still include legacy game keys such as `luganda_learning_game`.

## Fallback Rules

- Runyankole never falls back to Luganda.
- If Runyankole DB content is unavailable, the app can use same-language bundled sample content marked as placeholder.
- If a Runyankole content area has no same-language menu cards or payload, the UI shows a coming-soon state.
- Luganda may use the explicit `local-lg-legacy` fallback so existing prototype behavior remains available while DB content rolls out.
- Partial Luganda DB game payloads are merged with the full legacy Luganda bundle until DB payloads are at least as complete as the bundled prototype data.
