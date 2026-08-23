# Recurring Learning Notifications

## Current Status

Implemented for native Android and iOS builds.

## Purpose

Baby Steps uses gentle, device-local reminders to help families return to short learning activities without sending daily or late-night prompts.

## Grouped Schedule

The schedule uses the device's local time zone and defaults to 18:00. The parent
can choose a different local reminder time in Notifications settings.

Baby Steps schedules at most one learning reminder for the signed-in account on
the current device, not one reminder per child. Eligible children are active
profiles whose streak and per-child reminder participation are both enabled.
When at least one eligible child is incomplete today, one daily trigger uses
grouped copy. If every eligible child is complete, that trigger is replaced by
one congratulatory date trigger for tomorrow.

The all-complete trigger is intentionally one-shot. The OS does not run the
app's JavaScript at midnight to calculate a new day's eligibility, so the app
must next start or return to the foreground before it can restore the
appropriate future schedule.

## Permission Flow

1. A new parent completes pre-login onboarding and creates an account.
2. A successful new signup routes to `/notification-permission` before `/check-email`.
3. `Turn on gentle reminders` shows the native notification permission prompt.
4. If permission is granted, the current grouped learning reminder is evaluated
   and scheduled when an eligible child exists.
5. `Maybe later`, denied permission, or an unavailable platform leaves reminders disabled and continues to email confirmation.
6. Existing-account signup responses skip the notification prompt and continue to the appropriate check-email guidance.

The app explains the tone, usefulness, privacy, and parent controls before requesting the operating-system permission. User-facing copy intentionally avoids promising fixed days or limiting notifications to particular feature categories, so the notification experience can evolve without becoming misleading. It does not request permission during the initial marketing slides.

## Parent Controls

- The dashboard bell opens `/parent/settings/notifications`.
- The same screen is available from `Settings -> Notifications`.
- Parents can pause or resume the whole recurring schedule.
- Parents can choose the local reminder time and opt in to safe child first
  names; names are hidden by default.
- Per-child participation is managed only from that child's parent-facing
  profile. Disabling the child's streak also removes that child from reminder
  eligibility.
- If permission was denied, the screen offers a route to the device's app settings.
- Normal production and `groceries` builds do not show manual test-notification actions on the Notifications screen.
- Development builds and APKs built with the `notification-test` EAS profile can show `Send a test reminder` on the Notifications screen when reminders are enabled. They also show `Settings -> Developer -> Send test notification`, which can request permission and schedule one immediate test without enabling the recurring schedule.

## Notification Content And Navigation

- Copy follows the Baby Steps tone: short, encouraging, grouped, and
  pressure-free. Generic copy is the privacy default; first names require an
  explicit parent opt-in.
- Notifications use the internal `learning-reminders` Android channel ID, displayed to users as `Baby Steps reminders`, with the primary blue tint and default system sound. The stable internal ID preserves existing schedules while the visible label remains broad enough for the notification experience to evolve.
- Tapping a reminder routes through `/`. The root route then chooses login or the parent dashboard from the current auth state.
- Foreground notifications show a banner/list entry and may play the device's default notification sound. App-icon badges are not used.

## Storage And Privacy

- Account-scoped reminder settings and Expo identifiers are stored under
  `@BabySteps:LearningReminderSettings:v1:<encoded account id>`.
- A bounded durable cancellation ledger uses
  `@BabySteps:LearningReminderCancellationLedger:v1`. The old
  `@baby_steps_notification_preferences` value is read only for migration.
- Schedules are local to the device. No Expo push token is requested or stored.
- On startup, foreground return, preference change, or streak change, an enabled
  installation re-evaluates eligible children and keeps one matching trigger.
- Device-level reminder time, name-display preference, permission, and schedule
  identifiers are not written to Supabase. Per-child participation is part of
  the guarded streak preference stored in Supabase.
- Disabling reminders cancels only identifiers owned by Baby Steps for the
  current account; it does not call the global cancel-all API.

## Main Files

- `lib/notifications.ts`
- `app/notification-permission.tsx`
- `app/parent/settings/notifications.tsx`
- `app/signup.tsx`
- `app/_layout.tsx`
- `app/parent/index.tsx`
- `components/parent/ChildStreakSection.tsx`
- `lib/streakRepository.ts`
- `app.json`
- `eas.json`

## Native Configuration

`expo-notifications` is registered in `app.json` with:

- Android notification tint: `#0274BB`
- Default Android channel: `learning-reminders`

Native configuration changes require a new development or production build. Web returns an unavailable permission state and does not schedule reminders.

## Delivery Notes

- The schedule respects the device's local time zone, Focus/Do Not Disturb, silent mode, notification settings, and platform battery behavior.
- Delivery timing can vary on devices with aggressive battery optimization.
- The app intentionally does not request Android's restricted exact-alarm permission; these are learning prompts, not alarms requiring exact-to-the-minute delivery.
- The all-complete reminder is a one-shot date trigger and needs a later app
  start/foreground sync to calculate subsequent days.

## Automated Tests

`lib/__tests__/notifications.test.ts` verifies:

- Default and selected local reminder time behavior.
- Grouping, streak eligibility, generic/private copy, and first-name opt-in.
- Daily incomplete and one-shot all-complete scheduling.
- Missing permission and repository failures without startup crashes.
- Account isolation and cancellation of only stored/scoped Baby Steps
  identifiers.

Auth screen tests verify that a successful new signup enters the notification-permission step.

## Manual QA

- [ ] Create a new account and confirm the explainer appears before the native permission prompt.
- [ ] Choose `Maybe later` and confirm email-check guidance still opens.
- [ ] Grant permission and confirm Settings shows reminders enabled.
- [ ] Deny permission and confirm the app continues without blocking signup.
- [ ] Enable and disable reminders from Settings.
- [ ] Confirm two incomplete children produce one generic grouped reminder.
- [ ] Opt in to names and confirm only safe first names appear.
- [ ] Disable one child's participation/streak and confirm that child is omitted.
- [ ] Complete every eligible child's day and confirm the daily trigger becomes
  one congratulatory reminder for tomorrow.
- [ ] Return the app to the foreground the next day and confirm scheduling is
  recalculated.
- [ ] In a test-tools build, send a test reminder on a physical Android or iOS device.
- [ ] Tap a reminder while signed in and confirm the parent app opens.
- [ ] Tap a reminder while signed out and confirm the login flow opens.
- [ ] Confirm the bell icon opens notification settings.
- [ ] Rebuild the native app after `app.json` notification-plugin changes.
- [ ] Build with `notification-test` and confirm the Developer test action is present.
- [ ] Build with `groceries` or `production` and confirm the Notifications screen has no test-reminder button.

The child eligibility, cache, and privacy contract is canonical in
[Child Learning Streaks](child-streaks.md).
