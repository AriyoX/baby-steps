# Testing Guide

## Current Test Setup

The app uses Jest with `jest-expo`.

```bash
npm test
npm run test:watch
```

## Current Automated Coverage

The suite now includes focused coverage for:

- exact-language Supabase content queries, validation, ordering, publication filters, and no `nyn`-to-`lg` fallback;
- stale-while-revalidate cache hits, offline reuse, background refresh, version replacement, empty-cache failure, and malformed-response retention;
- Learning Hub bundle normalization, routes, mechanics, lesson completion, stable seed IDs, and progress/achievement compatibility;
- standalone game hydration scopes, Cards and Puzzle completion, progress identities, and local-first hydration managers;
- the generic Stories renderer and dynamic story records;
- Coloring direct routes rendering their bundled canvases without a database gate;
- content migrations, RLS/grant statements, and the Stories ordered-menu correction;
- selected navigation, layout, progress, achievement, image-preloading, and reliability behavior.

Representative suites include:

- `content/__tests__/contentRepository.test.ts`
- `content/__tests__/learningHubLoader.test.ts`
- `content/__tests__/learningHubRepository.test.ts`
- `content/__tests__/runtimeContentBoundary.test.ts`
- `components/games/__tests__/GameHydrationScopes.test.tsx`
- `components/games/utils/__tests__/progressContentIdentityCompatibility.test.ts`
- `components/stories/__tests__/GenericStoryRenderer.test.tsx`
- `app/child/games/coloring/__tests__/bundledColoringRoutes.test.tsx`
- `supabase/migrations/__tests__/databaseBackedLearningContentMigration.test.ts`
- `supabase/migrations/__tests__/normalizePublishedStoryMenuOrderMigration.test.ts`

## Remaining Gaps

Automated tests still do not replace end-to-end device QA for:

- real signup, login, reset, add-child, and cold-start route recovery;
- the parent gate PIN and full parent/child switching flow;
- real Supabase network failures and writes through an installed mobile build;
- complete touch interaction for every game, Coloring drawing/save/share, and Museum gestures/media;
- native orientation, audio, media-library permissions, and Android/iOS behavior;
- complete parent dashboard/settings flows and replacement of placeholder metrics.

## Validation Commands

Run the affected tests first, then the complete checks:

```bash
npm test -- --runInBand
npm run typecheck
npm run lint -- --no-color
npx supabase@2.109.1 migration list --linked
npx supabase@2.109.1 db advisors --linked
```

For a database-only Learning Hub update, use the reversible development helper documented in [Content Authoring And New Games](content-authoring-and-new-games.md#reversible-dynamic-stage-smoke-test). Do not run it against production.

A completely fresh local reset is not yet authoritative because the repository is missing its original base-schema migration; see the [database local-reset caveat](database.md#local-reset-caveat).

## Verification Baseline

As of 2026-07-15:

- 58 Jest suites and 430 tests pass with `--runInBand`;
- TypeScript typecheck passes;
- lint completes with 0 errors and 100 warnings;
- Jest can emit a worker force-exit/open-handle warning after successful completion, so teardown remains worth investigating;
- linked migration history matches the repository through `20260714213732`;
- the linked database returns 17 active/published/startable `lg` rows and 0 `nyn` rows through the intended read path;
- child-facing roles can read published content but cannot insert or update it.

Supabase advisors report no content-specific finding for `content_items`. They still report pre-existing security/configuration work elsewhere, summarized in [Database Notes](database.md#security-advisor-snapshot).

## MVP Testing Priorities

1. Add installed-build smoke coverage for auth, child mode entry/exit, and one complete Learning/game/story flow.
2. Verify offline restart behavior and exact-language content recovery on Android and iOS.
3. Exercise Coloring save/share and audio/media permissions on real devices.
4. Close the base-migration gap so `supabase db reset` can validate the full schema from an empty database.
5. Resolve the remaining database/security advisor findings before release.
