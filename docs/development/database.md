# Database Notes

## Current Status

Baby Steps uses Supabase for auth-backed app data, account deletion lifecycle tracking, and MVP language content. `schema.sql` is a context snapshot and warns that it is not meant to be run as-is; production schema changes should be made with migrations.

## Schema Snapshot

`schema.sql` currently describes these public tables:

| Table | Purpose |
| --- | --- |
| `languages` | Supported learning languages such as Luganda and Runyankole. |
| `children` | Child profiles linked to Supabase `auth.users`. |
| `activities` | Activity history for stories and games. |
| `achievements` | Achievement definitions. |
| `child_achievements` | Earned achievement records per child. |
| `content_items` | Shared MVP language content payloads. |
| `child_activity_progress` | Current child progress by language and activity type. |
| `child_stage_progress` | Optional per-stage child progress. |
| `account_deletion_requests` | Account deletion grace-period, reactivation, and finalization log. |

## Current App Usage

| Area | Supabase usage |
| --- | --- |
| Auth | `supabase.auth.signUp`, `signInWithPassword`, `resetPasswordForEmail`, `updateUser`, `signOut`, sessions. |
| Child profiles | Reads/writes `children`. |
| Activities | Writes and reads `activities`. |
| Achievements | Reads `achievements`, reads/writes `child_achievements`. |
| Content | Reads shared `content_items` by active child language. |
| Account deletion | Uses RPCs for grace-period requests/reactivation and a service-role Edge Function for final deletion. |
| Payments | Not implemented. |

## Main Files

- `schema.sql`
- `lib/supabase.ts`
- `lib/utils.ts`
- `context/UserContext.tsx`
- `app/child-list.tsx`
- `app/parent/index.tsx`
- `app/parent/activities.tsx`
- `app/parent/all-achievements.tsx`
- `app/parent/child-detail/[id].tsx`
- `components/games/achievements/achievementManager.ts`

## Environment Variables

`lib/supabase.ts` reads:

```bash
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
```

Permanent account deletion finalization also needs these variables only in the Supabase/server environment:

```bash
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
BABY_STEPS_ACCOUNT_DELETION_ADMIN_SECRET
```

Do not add service-role keys to Expo or React Native client environment variables.

## Table Notes

### `children`

Current fields:

- `id`
- `parent_id`
- `name`
- `gender`
- `age`
- `reason`
- `selected_language_code`
- `created_at`
- `deleted_at`
- `archived_by_account_deletion_request_id`

Used by child list, parent dashboard, child detail, and add-child flow. `selected_language_code` is set during child profile creation and is not currently editable in child mode.

### `content_items`

Stores exact-language, versioned JSON bundles for Learning Hub, menus, Stories,
and supplementary games. Runtime reads require the exact `language_code`,
`is_active = true`, `editorial_status = 'published'`, and `is_startable = true`.
The row identity is `(language_code, content_type, slug)`; nested stage, lesson,
item, level, card, puzzle, page, question, and option IDs remain progress/content
compatibility keys.

RLS permits `anon` and `authenticated` to select active published rows. Explicit
Data API grants give those roles `SELECT` only; content mutation is reserved for
trusted migration/admin paths. The Expo app contains no service-role key.

See [Database-Backed Content](../features/database-content.md) for architecture
and [Content Authoring And New Games](./content-authoring-and-new-games.md) for
payload contracts.

### `activities`

Current activity types allowed by the check constraint:

- `stories`
- `counting`
- `museum`
- `other`
- `cultural`
- `words`
- `puzzle`
- `language`

The code currently writes several game/story activity types. Museum activity tracking is not wired yet.

`activities.language_code` is available for language-specific progress tracking. It may remain nullable for historical rows, but new multilingual activity writes should include the child's selected language.

### `achievements`

Current fields include:

- `name`
- `description`
- `icon_name`
- `activity_type`
- `points`
- `trigger_value`
- `game_key`

The app expects seed data in this table for achievements to work.

### `child_achievements`

Links a child to an achievement definition. Migration `20260701000000_add_child_achievements_unique_constraint.sql` enforces one row per `(child_id, achievement_id)`.

### `account_deletion_requests`

Tracks deletion requests from the app and finalization by the trusted server process.

Important fields include:

- `user_id`
- `email`
- `status`
- `requested_at`
- `grace_ends_at`
- `cancelled_at`
- `reactivated_at`
- `completed_at`
- `archived_child_ids`
- `finalization_started_at`
- `finalization_attempted_at`
- `finalization_attempt_count`
- `finalization_error`
- `app_data_deleted_at`
- `auth_user_deleted_at`
- `finalized_at`

`user_id` becomes nullable during final deletion because the Supabase Auth user is deleted and the foreign key uses `ON DELETE SET NULL`. The retained row is a minimal operational deletion log and should not keep email, notes, or child ids after finalization.

### Account deletion RPCs and Edge Function

Client-accessible lifecycle RPCs:

- `request_account_deletion_with_grace`
- `reactivate_account_deletion`

Service-role-only finalization RPCs:

- `claim_expired_account_deletion_requests`
- `finalize_expired_account_deletion_request_app_data`
- `complete_finalized_account_deletion_request`
- `record_account_deletion_finalization_failure`

Edge Function:

- `supabase/functions/finalize-account-deletions`

See [account deletion finalization](account-deletion-finalization.md) for deployment and QA steps.

## Known Schema Gaps

- No stable content IDs in `activities`.
- `activities.score` is text.
- `activities.details` is text rather than structured JSON.
- Historical activity rows may lack `language_code`; current multilingual writes should populate it.
- No parent profile table separate from `auth.users`.
- No roles, schools, organizations, or class/group tables.
- No media asset table.
- No localization tables.
- No payment or entitlement tables.
- No separate content workflow/audit tables beyond the MVP editorial fields on `content_items`.
- No Supabase Storage bucket or user-owned storage metadata table.

## Future Migration Notes

Current migrations include:

- `supabase/migrations/20260619000000_add_child_language_support.sql`
- `supabase/migrations/20260619001000_add_mvp_content_items.sql`
- `supabase/migrations/20260629000000_add_child_progress.sql`
- `supabase/migrations/20260701000000_add_child_achievements_unique_constraint.sql`
- `supabase/migrations/20260701001000_migrate_luganda_stories_to_content_items.sql`
- `supabase/migrations/20260701002000_add_account_management_soft_deletion.sql`
- `supabase/migrations/20260702000000_add_account_deletion_grace_period.sql`
- `supabase/migrations/20260702001000_add_account_deletion_lifecycle_rpcs.sql`
- `supabase/migrations/20260702002000_add_account_deletion_finalizer.sql`
- `supabase/migrations/20260709225210_seed_learning_hub_achievements.sql`
- `supabase/migrations/20260714182326_database_backed_learning_content.sql`
- `supabase/migrations/20260714213732_normalize_published_story_menu_order.sql`

This chain adds language selection, shared content, progress, account-deletion lifecycle support, Learning Hub achievements, database-backed curriculum/game seeds, strict content security metadata, and the Stories ordered-menu correction. As of 2026-07-15, local and linked Baby-Steps migration histories align through `20260714213732`.

## Local Reset Caveat

The checked-in migrations begin after the original application base schema. A
completely empty `supabase db reset` currently fails at
`20260619000000_add_child_language_support.sql` because `public.children` is not
created by an earlier repository migration. This is a pre-existing migration
history gap, not a content-bundle fallback requirement. Restore a proper base
schema migration before treating fresh local resets as authoritative; until
then, validate against an existing development schema or a disposable database
bootstrapped with the base tables.

## Security Advisor Snapshot

As of 2026-07-15, the linked-project advisors report no content-specific finding for `public.content_items`; its child-facing read policy and separate Data API grants are in place. Pre-existing findings elsewhere still need release review: RLS is disabled on `activities`, `achievements`, `child_achievements`, and `languages`; two functions have mutable search paths; account-deletion `SECURITY DEFINER` execution grants need review; `uuid-ossp` is installed in `public`; leaked-password protection is disabled; and database patches are available. These are not reasons to add a service-role key or weaken the content policy.

## Change Guidance

When adding database-driven content:

1. Define TypeScript content contracts.
2. Preserve every shipped stable ID and exact language code.
3. Reuse the versioned `content_items` bundle model unless a type truly cannot fit it.
4. Add validation/rendering code before publishing a new content type or mechanic.
5. Use exact-language last-known-good caching; do not add bundled learning-content fallback.
6. Add idempotent migrations instead of treating `schema.sql` as executable source of truth.

Before adding payments:

1. Add backend/API verification.
2. Add entitlement tables.
3. Tie entitlements to stable content IDs.
4. Add server-owned purchase/subscription state.

## Manual Database QA

- [ ] Confirm Supabase env vars are set.
- [ ] Sign up/sign in.
- [ ] Create a child and confirm `children` row.
- [ ] Complete a tracked game/story and confirm `activities` row.
- [ ] Seed achievement definitions and confirm achievement awarding.
- [ ] Confirm all parent dashboard queries work for a new user with no children.
- [ ] Confirm activity screens handle empty and populated states.
- [ ] Query `content_items` as `anon`: active/published rows are readable, draft rows are hidden, and writes are denied.
- [ ] Run the reversible [Learning Hub dynamic-stage smoke test](../database/learning-hub-dynamic-stage-smoke-test.sql), verify it appears for `lg`, then run its cleanup SQL.
