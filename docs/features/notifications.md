# Recurring Learning Notifications

## Current Status

Implemented for native Android and iOS builds.

## Purpose

Baby Steps uses gentle, device-local reminders to help families return to short learning activities without sending daily or late-night prompts.

## Default Schedule

The default schedule uses the device's local time zone:

| Day | Time | Intent |
| --- | --- | --- |
| Tuesday | 6:30 PM | Ten-minute story or game prompt after the school day. |
| Thursday | 6:30 PM | Midweek child-choice activity reminder. |
| Saturday | 10:00 AM | Family story and connection moment. |

Weekday numbers passed to Expo follow its `1` through `7` format, where Sunday is `1`. The schedule therefore uses Tuesday `3`, Thursday `5`, and Saturday `7`.

## Permission Flow

1. A new parent completes pre-login onboarding and creates an account.
2. A successful new signup routes to `/notification-permission` before `/check-email`.
3. `Turn on gentle reminders` shows the native notification permission prompt.
4. If permission is granted, the three weekly reminders are scheduled.
5. `Maybe later`, denied permission, or an unavailable platform leaves reminders disabled and continues to email confirmation.
6. Existing-account signup responses skip the notification prompt and continue to the appropriate check-email guidance.

The app explains the schedule before requesting the operating-system permission. It does not request permission during the initial marketing slides.

## Parent Controls

- The dashboard bell opens `/parent/settings/notifications`.
- The same screen is available from `Settings -> Notifications`.
- Parents can pause or resume the whole recurring schedule.
- If permission was denied, the screen offers a route to the device's app settings.
- When reminders are enabled, parents can schedule a test notification that appears after approximately three seconds.
- Development builds and APKs built with the `notification-test` EAS profile also show `Settings -> Developer -> Send test notification`. This action requests permission if necessary and schedules one immediate test without enabling the recurring schedule.

## Notification Content And Navigation

- Copy follows the Baby Steps tone: short, encouraging, and pressure-free.
- Notifications use the learning-reminders Android channel with the primary blue tint and default system sound.
- Tapping a reminder routes through `/`. The root route then chooses login or the parent dashboard from the current auth state.
- Foreground notifications show a banner/list entry and may play the device's default notification sound. App-icon badges are not used.

## Storage And Privacy

- Reminder preferences and Expo schedule identifiers are stored in AsyncStorage under `@baby_steps_notification_preferences`.
- Schedules are local to the device. No Expo push token is requested or stored.
- No child email, phone number, profile data, or notification preference is written to Supabase.
- Disabling reminders cancels only identifiers previously created by Baby Steps; it does not call the global cancel-all API.

## Main Files

- `lib/notifications.ts`
- `app/notification-permission.tsx`
- `app/parent/settings/notifications.tsx`
- `app/signup.tsx`
- `app/_layout.tsx`
- `app/parent/index.tsx`
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

## Automated Tests

`lib/__tests__/notifications.test.ts` verifies:

- The default weekday/time schedule.
- Permission-driven scheduling of all three reminders.
- Cancellation of only stored Baby Steps identifiers.

Auth screen tests verify that a successful new signup enters the notification-permission step.

## Manual QA

- [ ] Create a new account and confirm the explainer appears before the native permission prompt.
- [ ] Choose `Maybe later` and confirm email-check guidance still opens.
- [ ] Grant permission and confirm Settings shows reminders enabled.
- [ ] Deny permission and confirm the app continues without blocking signup.
- [ ] Enable and disable reminders from Settings.
- [ ] Send a test reminder on a physical Android device.
- [ ] Send a test reminder on a physical iOS device.
- [ ] Tap a reminder while signed in and confirm the parent app opens.
- [ ] Tap a reminder while signed out and confirm the login flow opens.
- [ ] Confirm the bell icon opens notification settings.
- [ ] Rebuild the native app after `app.json` notification-plugin changes.
- [ ] Build with `notification-test` and confirm the Developer test action is present.
