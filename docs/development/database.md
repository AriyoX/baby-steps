# Database Notes

## Current Status

Baby Steps uses Supabase for auth-backed app data, but `schema.sql` is a context snapshot and warns that it is not meant to be run as-is.

## Schema Snapshot

`schema.sql` defines four tables:

| Table | Purpose |
| --- | --- |
| `children` | Child profiles linked to Supabase `auth.users`. |
| `activities` | Activity history for stories and games. |
| `achievements` | Achievement definitions. |
| `child_achievements` | Earned achievement records per child. |

## Current App Usage

| Area | Supabase usage |
| --- | --- |
| Auth | `supabase.auth.signUp`, `signInWithPassword`, `resetPasswordForEmail`, `updateUser`, `signOut`, sessions. |
| Child profiles | Reads/writes `children`. |
| Activities | Writes and reads `activities`. |
| Achievements | Reads `achievements`, reads/writes `child_achievements`. |
| Content | Not database-backed. |
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

## Table Notes

### `children`

Current fields:

- `id`
- `parent_id`
- `name`
- `gender`
- `age`
- `reason`
- `created_at`

Used by child list, parent dashboard, child detail, and add-child flow.

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

Links a child to an achievement definition. The code attempts to handle duplicate awards if a unique constraint exists, but the snapshot does not show a unique constraint.

## Known Schema Gaps

- No content tables.
- No stable content IDs in `activities`.
- `activities.score` is text.
- `activities.details` is text rather than structured JSON.
- No parent profile table separate from `auth.users`.
- No roles, schools, organizations, or class/group tables.
- No media asset table.
- No localization tables.
- No payment or entitlement tables.
- No content workflow tables.

## Future Migration Notes

Before adding database-driven content:

1. Define TypeScript content contracts.
2. Add stable IDs to existing hardcoded content.
3. Normalize activity/progress data.
4. Add content tables one feature at a time.
5. Keep bundled fallback content.
6. Add migrations instead of treating `schema.sql` as executable source of truth.

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
