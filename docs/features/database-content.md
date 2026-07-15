# Database-Backed Content

## Architecture

Baby Steps uses `public.content_items` as a small, versioned bundle store. It is deliberately not a CMS. One row contains one exact-language JSON payload, and React Native code still owns routes, renderers, game mechanics, scoring, progress, achievements, and static asset resolution.

The runtime path is:

1. `content/contentRepository.ts` queries active, published, startable rows for one exact `language_code`.
2. Type-specific validators normalize the rows and reject malformed or duplicate bundles.
3. The repository returns one ordered `ContentBundle` and registers its Learning Hub payload with `content/learningHubRepository.ts`.
4. Screens start only when their required content exists; otherwise they show a retry/coming-soon state.
5. Raw validated rows are cached in memory and AsyncStorage through the existing stale-while-revalidate cache.

The supported `content_type` values are:

| Type | Payload role | Cardinality per language |
| --- | --- | --- |
| `child_menu` | Cards for a menu tab such as `games`, `stories`, or `coloring` | One row per tab slug |
| `learning_hub` | Main curriculum stages, lessons, and mechanic items | One published/startable row |
| `learning_game` | Standalone legacy Learning stages, levels, and words | One published/startable row |
| `word_game` | Ordered Word levels | One published/startable row |
| `counting_game` | Counting stages, labels, objects, and currency | One published/startable row |
| `card_game` | Matching-card learning items | One published/startable row |
| `puzzle_game` | Ordered puzzle definitions | One published/startable row |
| `story` | One generic story and optional quiz | Many rows, one per story slug |

Learning Hub is the curriculum. The standalone games remain supplementary practice.

## Schema, Publication, And Security

The base table was introduced by `20260619001000_add_mvp_content_items.sql`. The deployed content phase is in `20260714182326_database_backed_learning_content.sql`, which adds:

- `editorial_status`: `draft`, `reviewed`, or `published`;
- `is_startable`: whether the app may launch the row;
- `content_version`: a positive, monotonically increasing bundle revision;
- `published_at`: publication timestamp;
- a published-language/order index, RLS policy, and explicit Data API grants.

`language_code`, `content_type`, `slug`, `payload`, `sort_order`, and `is_active` remain required storage fields. `(language_code, content_type, slug)` is unique.

RLS allows `anon` and `authenticated` to select only active, published rows. The app query further requires `is_startable = true`. Data API privileges grant those roles `SELECT` only; they cannot insert, update, publish, or delete content. Authoring is performed through reviewed SQL migrations with a trusted server/admin role. Never put a service-role key in the Expo app.

`20260714213732_normalize_published_story_menu_order.sql` is the follow-up compatibility migration. The older Stories menu predated required explicit card ordering; this migration preserves its array order, adds missing `order` values, and bumps `content_version`. Without that correction, the repository's atomic validation correctly rejects the malformed row and retains last-known-good content, but a first install has no cache to retain.

Row publication and payload readiness are separate. A published MVP bundle may still contain lessons or items honestly marked `draft` or `placeholder`; those values must not be changed to `production` merely to make the bundle readable. Locked or unsupported content remains non-startable through payload validation and mechanic rules. Practice Mix is always locked and has no renderer.

## Language Isolation And Identity

Every query and cache key is scoped to the exact normalized language code. `lg` is Luganda and `nyn` is Runyankole. An explicit `nyn` or other-language request never substitutes `lg`, another database row, or a bundled legacy array. Missing content produces the friendly unavailable/retry state.

Stable IDs are compatibility keys, not display copy. Do not rename or reuse shipped row slugs, stage IDs, lesson IDs, item IDs, game level IDs, card values, or puzzle IDs. Existing progress and achievements continue to resolve those IDs even when later bundles remove content. Current completion percentages use only current published/startable content; historic completion records are not deleted.

## Seed And Updates

`20260714182326_database_backed_learning_content.sql` remains the immutable initial deployed content migration. The later Stories-order migration is part of that historical migration chain.

`supabase/seed.sql` is now a generated **development reset seed** for the Luganda Stage 1–2 curriculum cut. Its source is `scripts/build-luganda-stage-1-2-content.mjs`, and its reviewable manifest is `content/curriculum/lg-stage-1-2.json`. On a local reset it purges obsolete Luganda runtime rows and inserts the two-stage Hub, aligned menus/games, two stories, and explicit placeholder-media references. It does not delete child profiles, progress, activity history, achievements, auth users, or Runyankole editorial rows.

The Stage 1–2 seed is not a production migration and must not be used with a linked production database. Its image/audio files are intentionally empty and every affected payload remains review-required. Run `npm run content:build:lg-stage-1-2` after editing its source and `npm run content:validate:lg-stage-1-2` before review. A later production deployment requires approved media/language/curriculum gates and a new migration created with `supabase migration new`; never edit the applied initial migration.

Do not edit an applied migration. Create a new migration with `supabase migration new <descriptive_name>`, upsert the changed exact-language row, preserve all stable IDs and ordering, and increment `content_version`. Linked/deployed environments receive the same data through the migration chain. Fresh local resets will do the same after the repository's pre-existing [base-schema migration gap](../development/database.md#local-reset-caveat) is restored.

## Verified Deployment State

As of 2026-07-15, the repository and linked Baby-Steps project migration histories match through `20260714213732`. An anonymous Data API query can read 17 active/published/startable Luganda rows: three menus, Learning Hub, five standalone game bundles, and eight Stories. There are zero published/startable Runyankole rows. `anon` and `authenticated` cannot insert or update `content_items`.

The generated Stage 1–2 `seed.sql` has not been applied to that linked project. The verified deployment state above therefore describes the historical deployed migration content, not the local development seed.

The reversible [Learning Hub dynamic-stage smoke test](../database/learning-hub-dynamic-stage-smoke-test.sql) demonstrates that a new valid stage appears after a database-only payload/version update. It is a test helper, not a production migration; use its separate cleanup SQL after verification.

Payload examples, the language-addition checklist, and validation commands are in [Content Authoring And New Games](../development/content-authoring-and-new-games.md). Cache and asset details are in [Content Cache and Image Loading](../development/content-cache-and-images.md). Educational review and content-provider responsibilities remain in [Learning Hub curriculum analysis](../learning-hub-curriculum-analysis.md#19-content-production-and-approval-workflow); this document describes only the technical delivery path.

## Official Supabase References

- [Securing your data](https://supabase.com/docs/guides/database/secure-data): combine RLS with the minimum database privileges required by each role.
- [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security): exposed client tables require enabled RLS and appropriate policies.
- [Database migrations](https://supabase.com/docs/guides/deployment/database-migrations): create and deploy tracked migration files instead of making untracked remote edits.
- [Data API exposure breaking change](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically): Data API grants remain a separate requirement from RLS.
