# Content Management

Baby Steps has migration-managed, database-backed content, not an admin CMS. Content authors prepare reviewed JSON payloads; a developer validates and ships them through an idempotent Supabase migration. The child and parent apps have no authoring or publishing capability.

For payload contracts and the update procedure, see [Content Authoring And New Games](./content-authoring-and-new-games.md). For educator, linguist, cultural-reviewer, and content-provider responsibilities, use [Learning Hub curriculum analysis](../learning-hub-curriculum-analysis.md#19-content-production-and-approval-workflow) rather than duplicating that guidance here.

## Ownership Boundary

| Stored in `content_items` | Remains in application code |
| --- | --- |
| Exact-language display copy | React Native renderers and routes |
| Learning Hub stages, lessons, ordering, and mechanic payloads | Mechanic registry and interaction behavior |
| Standalone Learning/Word/Counting/Card/Puzzle records | Scoring, randomization, animation, and unlock algorithms |
| Menu cards and generic Stories | Progress synchronization and achievement evaluation |
| Image/audio keys and optional URIs | Static image/audio resolver maps and bundled binaries |
| Editorial status, startability, and content version | Payload types, normalization, and validation |

## Current Dynamic Areas

| Area | Database type | Notes |
| --- | --- | --- |
| Learning Hub | `learning_hub` | Main curriculum; exact-language bundle registered with `learningHubRepository` |
| Games menu | `child_menu/games` | Determines which game routes are exposed for that language |
| Coloring menu | `child_menu/coloring` | Menu metadata is dynamic; drawing templates, palettes, and interaction remain bundled |
| Stories menu and stories | `child_menu/stories`, `story` | Generic renderer handles any valid number of rows/pages/questions |
| Standalone Learning | `learning_game` | Stages, levels, words, images, and audio references |
| Word | `word_game` | Ordered levels; existing progress order is preserved |
| Counting | `counting_game` | Stages, number labels, items, and currency |
| Cards | `card_game` | Stable matching items and exact values |
| Puzzle | `puzzle_game` | Stable numeric puzzle IDs and image references |

Museum content and the drawing mechanics/assets inside individual Coloring routes remain code-owned. Achievement definitions, UI translations, and static media maps are not curriculum rows.

## Editorial Lifecycle

- `draft`: incomplete, placeholder, or not yet reviewed; not child-readable.
- `reviewed`: editorial review recorded, but not yet published; not child-readable.
- `published`: eligible for RLS reads when active; the app also requires `is_startable = true`.

Set `published_at` when publishing and increase `content_version` for every released payload/order/startability revision. Progress-bearing payloads also declare `progressRevision`. Keep `progressRevision` unchanged for compatible copy, media, or ordering corrections; increment it only when existing stage/lesson/game identities now represent incompatible playable content and prior completion must not unlock the replacement. `is_active = false` retires a row. A Learning Hub bundle can be published while individual lessons/items honestly remain `draft` or `placeholder`; internal readiness and lock rules still control what can launch. Do not publish the known Runyankole sample rows as real curriculum.

## Safe Change Process

1. Start from the current published payload and retain every shipped stable ID.
2. Obtain the language/curriculum/cultural review appropriate to the change.
3. Create a migration with `supabase migration new <descriptive_name>`.
4. Add an `INSERT ... ON CONFLICT (language_code, content_type, slug) DO UPDATE` upsert. Do not edit an applied migration.
5. Increment `content_version`; change `payload.progressRevision` only for an incompatible progress boundary; set editorial, active, startable, and publication fields explicitly.
6. Add static image/audio keys in code when the payload references new bundled media.
7. Validate against a safe development database, then run repository/component tests, typecheck, and lint. A fresh local reset currently needs the repository's missing pre-2026 baseline schema; see [Database Notes](./database.md#local-reset-caveat).
8. Deploy the migration through the normal Supabase migration workflow. Do not hand-edit or paste a divergent copy into the generated Stage 1–2 `seed.sql`.

The production migration chain remains canonical for deployed environments: the earlier story migration owns its historical story payloads, `20260714182326_database_backed_learning_content.sql` owns the initial Hub/game/menu payloads plus publication state, and `20260714213732_normalize_published_story_menu_order.sql` normalizes the pre-existing Stories menu to the strict ordered-card contract. Future production changes belong in later migrations.

For local curriculum replacement work, `supabase/seed.sql` is generated from `scripts/build-luganda-stage-1-2-content.mjs`. It is deliberately destructive only to Luganda `content_items` rows and must not be applied to production. Edit the generator source, regenerate, validate, and then create a separate reviewed migration when the content and media are genuinely deployable.

For a reversible database-only proof, use the [Learning Hub dynamic-stage smoke test](../database/learning-hub-dynamic-stage-smoke-test.sql). It is intentionally not a migration and must not be treated as production curriculum.

Stable IDs remain the preferred permanent progress identities. Retiring current content may change current completion percentages, but it must not delete or rewrite historic progress/achievement records. Never reuse an old ID for different content within the same `progressRevision`. When a deliberate full curriculum replacement must reuse route-compatible IDs, increment `progressRevision`; the app keeps the historic records but excludes them from current completion and unlock calculations.

## Out Of Scope

This MVP does not add a visual editor, app-side content mutation, service-role credentials, media uploads, approval dashboards, scheduled publishing, or executable logic in JSON. Those should be considered only when the migration-based workflow is no longer practical.
