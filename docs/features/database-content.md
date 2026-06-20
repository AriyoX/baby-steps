# Database-Backed Content

## Current Status

Implemented as a controlled MVP vertical slice using one flexible `content_items` table. This is not a CMS.

The app now loads language-specific menu cards and the primary language gameplay payloads for:

- child home/menu cards,
- learning game stages,
- word game levels,
- counting game stages and number labels,
- generic DB/local JSON stories.

Game rules, route definitions, rendering, scoring, progress, achievements, and fallback decisions remain in React Native code.

## Main Files

- `supabase/migrations/20260619001000_add_mvp_content_items.sql`
- `content/contentRepository.ts`
- `components/child/AfricanThemeGameInterface.tsx`
- `components/games/LearningGameComponent.tsx`
- `components/games/WordGameComponent.tsx`
- `components/games/CountingGameComponent.tsx`
- `components/stories/GenericStoryRenderer.tsx`
- `app/child/stories/[storyId].tsx`
- `docs/development/mvp-content-items.md`
- `docs/database/content-items-inspection.sql`

## Rules

- `content_type` and `slug` values are lowercase.
- `nyn` content never silently falls back to `lg`.
- Luganda can use the explicit `local-lg-legacy` fallback while existing prototype behavior is preserved.
- Malformed DB payloads are skipped by the repository and should surface as coming-soon states.
- Legacy route names such as `Stories` and `lugandacountinggame` are kept for now, but their screens can render language-aware content.

See [MVP Content Items](../development/mvp-content-items.md) for payload contracts and future normalization guidance.

## Remaining Hardcoded Areas

- Legacy Luganda story components under `components/stories/*Story.tsx`.
- Buganda-focused card matching and puzzle content.
- Museum and coloring content.
- Some achievement labels and legacy achievement game keys.

## Manual QA

- Log in as a Luganda child and verify Games, Stories, Learning, Words, and Counting still render.
- Log in as a Runyankole child and verify only Runyankole menu cards or coming-soon states appear.
- Open the Runyankole story card and confirm the generic story renderer is used.
- Complete one learning, word, and counting activity for each language and inspect `activities.language_code`.
- Run the inspection queries in `docs/database/content-items-inspection.sql`.
