# Parent Dashboard And Settings

## Current Status

Closed-beta scoped implementation.

## Purpose

The parent dashboard gives guardians a home screen for child profiles, recent learning activity, achievement navigation, and settings.

## User Flow

1. Signed-in parents route to `/parent`.
2. The dashboard loads child profiles for the current Supabase user.
3. It fetches persisted recent activities for each active child.
4. Parents can open child detail, child list, all activities, all achievements, notification reminders, and settings.
5. The header bell and Settings notification row both open the implemented recurring-reminder controls.

## Main Files Involved

- `app/parent/index.tsx`
- `app/parent/settings.tsx`
- `app/parent/activities.tsx`
- `app/parent/all-achievements.tsx`
- `app/parent/child-detail/[id].tsx`
- `app/parent/settings/notifications.tsx`
- `lib/utils.ts`
- `components/translated-text.tsx`
- `context/language-context.tsx`

## Key Components, Screens, And Functions

- `ParentDashboard`
- `ActivitiesScreen`
- `AllAchievementsScreen`
- `ChildDetailScreen`
- `getActivityStats`, `getChildActivities`, and `getFormattedActivities` in `lib/utils.ts`

## Data And Content Used

- Child profile data from Supabase `children`.
- Activity rows from Supabase `activities`.
- Achievement rows from Supabase `achievements` and `child_achievements`.
- Child cards show saved profile facts only.
- Recent activity and achievement surfaces use repository/database-backed records and show empty states when no records exist.

## State Management And Logic Notes

- Dashboard data is fetched in component effects.
- Recent activities refresh every 30 seconds in `app/parent/index.tsx`.
- Activities screen subscribes to Supabase realtime changes on `activities`.
- Notification preferences are device-local and control real Expo weekly schedules. See `notifications.md`.
- The language toggle persists `isLuganda` in AsyncStorage.

## API Or Database Usage

- Supabase Auth session lookup.
- Reads `children`.
- Reads `activities`.
- Reads `achievements` and `child_achievements`.
- Settings logout calls `supabase.auth.signOut`.

## Tests

Focused tests cover parent route gating, settings actions, account deletion reauthentication, missing/invalid child IDs, and critical navigation helpers. Full installed-device navigation still requires manual QA.

## Known Limitations Or Bugs

- The dashboard intentionally omits aggregate weekly metrics that do not yet have an authoritative source.
- Parent activity and achievement results depend on the production Supabase policies and data being correct.

## Future MVP Improvements

- Decide whether realtime activity subscriptions are required for MVP.
- Add installed-device navigation and activity rendering coverage.

## Manual QA Checklist

- [ ] Sign in and open `/parent`.
- [ ] Confirm child profiles load for the signed-in account.
- [ ] Confirm dashboard empty states with no children.
- [ ] Play a tracked game/story and confirm recent activity appears.
- [ ] Open all activities and test child/category/search filters.
- [ ] Open all achievements and test game filter tabs.
- [ ] Toggle language and confirm translated text changes only where translations exist.
- [ ] Tap every visible settings row and confirm it performs the described action.
- [ ] Sign out from settings.
