# Parent Dashboard And Settings

## Current Status

Partially implemented.

## Purpose

The parent dashboard gives guardians a home screen for child profiles, recent learning activity, achievement navigation, and settings.

## User Flow

1. Signed-in parents route to `/parent`.
2. The dashboard loads child profiles for the current Supabase user.
3. It fetches recent activities and weekly summary values for each child.
4. Parents can open child detail, child list, all activities, all achievements, notification reminders, and settings.
5. The header bell and Settings notification row both open the implemented recurring-reminder controls.

## Main Files Involved

- `app/parent/index.tsx`
- `app/parent/settings.tsx`
- `app/parent/activities.tsx`
- `app/parent/all-achievements.tsx`
- `app/parent/child-detail/[id].tsx`
- `app/parent/child-progress.tsx`
- `app/parent/settings/notifications.tsx`
- `lib/utils.ts`
- `components/translated-text.tsx`
- `context/language-context.tsx`

## Key Components, Screens, And Functions

- `ParentDashboard`
- `ActivitiesScreen`
- `AllAchievementsScreen`
- `ChildDetailScreen`
- `ProgressScreen` in `app/parent/child-progress.tsx`
- `getActivityStats`, `getChildActivities`, and `getFormattedActivities` in `lib/utils.ts`

## Data And Content Used

- Child profile data from Supabase `children`.
- Activity rows from Supabase `activities`.
- Achievement rows from Supabase `achievements` and `child_achievements`.
- Some dashboard child-card progress values are generated locally with placeholder/random values.
- `app/parent/child-progress.tsx` uses hardcoded sample progress, achievements, stats, and weekly activity values.

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

No tests currently cover the parent dashboard, settings, child progress, or activities screens.

## Known Limitations Or Bugs

- `/parent/child-progress` is a static/sample progress screen and does not use live child progress.
- Settings links to unimplemented routes:
  - `/content-management`
  - `/privacy-settings`
  - `/help-support`
  - `/account-info`
- Some settings other than notifications remain placeholders.
- Parent dashboard child progress values are placeholder/random.

## Future MVP Improvements

- Replace placeholder dashboard metrics with normalized progress data.
- Add route placeholders or remove future settings links.
- Decide whether realtime activity subscriptions are required for MVP.
- Add tests for parent navigation and activity rendering.

## Manual QA Checklist

- [ ] Sign in and open `/parent`.
- [ ] Confirm child profiles load for the signed-in account.
- [ ] Confirm dashboard empty states with no children.
- [ ] Play a tracked game/story and confirm recent activity appears.
- [ ] Open all activities and test child/category/search filters.
- [ ] Open all achievements and test game filter tabs.
- [ ] Toggle language and confirm translated text changes only where translations exist.
- [ ] Tap each settings row and confirm implemented routes work and future routes fail visibly or are handled before release.
- [ ] Sign out from settings.
