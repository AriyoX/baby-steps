# Child Profiles

## Current Status

Implemented prototype.

## Purpose

Child profiles let a parent create learner records and choose which child enters child mode.

## User Flow

1. Parent opens `/child-list` or taps `Add Child` from `/parent`.
2. The add-child flow starts at `/parent/add-child/gender`.
3. Parent enters/selects name, gender, age, and reason/focus.
4. The flow includes prototype marketing/assessment screens.
5. `/parent/add-child/final` writes the child profile to Supabase.
6. Parent can view profiles in `/child-list` and child detail screens.

## Main Files Involved

- `app/child-list.tsx`
- `app/parent/add-child/_layout.tsx`
- `app/parent/add-child/gender.tsx`
- `app/parent/add-child/age.tsx`
- `app/parent/add-child/reason.tsx`
- `app/parent/add-child/activities.tsx`
- `app/parent/add-child/ourPriority.tsx`
- `app/parent/add-child/knowledge.tsx`
- `app/parent/add-child/mindCapacity.tsx`
- `app/parent/add-child/final.tsx`
- `app/parent/child-detail/[id].tsx`
- `context/UserContext.tsx`
- `context/ChildContext.tsx`

## Key Components, Screens, And Functions

- `UserProvider` stores add-child flow fields.
- `addChildProfile` inserts into the `children` table.
- `ChildListScreen` fetches current user's child profiles.
- `ChildDetailScreen` fetches a child by `childId` and can launch child mode.
- `ChildProvider` stores the active child in React context.

## Data And Content Used

The `children` table stores:

- `parent_id`
- `name`
- `gender`
- `age`
- `reason`
- `created_at`

Several add-child screens contain hardcoded copy, sample community stats, sample testimonials, and simple assessment questions.

## State Management And Logic Notes

- Add-child flow state lives in `UserContext`.
- Active child state lives in `ChildContext`.
- Active child is not persisted across app reloads.
- Child-list and parent dashboard both fetch child profiles from Supabase.

## API Or Database Usage

- Reads and writes `children`.
- Requires an active Supabase Auth session.

## Tests

No tests currently cover child profile creation, listing, or child mode launch.

## Known Limitations Or Bugs

- Child detail navigation uses the route path `/parent/child-detail/1` with `childId` passed as a param.
- Add-child screens include marketing-style/sample claims that are not backed by app data.
- Some UI copy has encoding artifacts.
- There is no edit/delete child profile flow documented in current code.

## Future MVP Improvements

- Persist active child selection or make child mode route recovery explicit.
- Add edit/delete child profile support if in scope.
- Replace sample add-child claims with verified copy or remove them.
- Add tests for adding a child and launching child mode.

## Manual QA Checklist

- [ ] Sign in as a parent.
- [ ] Open `/child-list` with no profiles and confirm empty state.
- [ ] Complete the add-child flow with all fields.
- [ ] Confirm the child appears in `/child-list`.
- [ ] Confirm the child appears in `/parent`.
- [ ] Open child detail and confirm child name, age, and gender.
- [ ] Launch child mode from child detail.
- [ ] Restart the app and confirm behavior when active child context is empty.
