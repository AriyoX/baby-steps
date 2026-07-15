# Network Connectivity And Offline Messaging

## Current Status

Implemented for Android, iOS, and web-compatible runtime detection.

## Purpose

Baby Steps is not completely online-only, but account and synced-data operations require a reachable internet connection. The app explains this near authentication and distinguishes connectivity failures from invalid credentials or form errors.

## User-Facing Behavior

- Login explains that internet is needed for account access, profile syncing, and some updates.
- Signup explains that creating an account and syncing family progress need internet.
- When the device becomes offline, the root layout shows a themed in-app pop-up once and keeps a compact offline banner visible across every route.
- The banner disappears after connectivity returns.
- Saved, bundled, or previously cached activities may remain usable, depending on the feature. The app does not promise that all content is available offline.

## Guarded Online Actions

The following actions check connectivity before calling Supabase:

- Sign in.
- Create an account.
- Send a password-reset email.
- Resend a signup-confirmation email.
- Update a recovered password.
- Save a new child profile.

If connectivity is unavailable, the operation does not call Supabase and a message identifies the attempted action. If the preflight state was inconclusive but the request later returns a common network/fetch failure, the catch path shows the same network-specific guidance.

## Detection Rules

`@react-native-community/netinfo` supplies `isConnected` and `isInternetReachable`.

- Either value being explicitly `false` is treated as offline.
- `null` means the platform has not determined reachability yet; it does not block the operation.
- The root listener subscribes to connectivity changes, performs an initial state fetch, and refreshes whenever the app returns to the foreground.
- The initial offline pop-up waits until the animated splash has finished, preventing it from being hidden during app startup.
- Common failures such as `Failed to fetch`, `Network request failed`, connection refusal, and timeouts are classified as likely network errors.
- Non-network errors continue through the existing friendly auth/profile error mapping.

## Scope And Limitations

- This change does not add a general offline mutation queue.
- It does not change Supabase retry configuration.
- Existing feature-specific local progress and cache behavior remains unchanged.
- A connected network can still fail to reach Supabase because of captive portals, service outages, DNS problems, or server errors; request-level error detection covers common cases but cannot diagnose every upstream failure.
- The global pop-up is shown once per offline transition, while the banner remains visible on every screen. Explicit online actions can show another action-specific alert when the user tries them offline.

## Main Files

- `lib/network.ts`
- `components/common/NetworkStatusNotice.tsx`
- `app/_layout.tsx`
- `app/login.tsx`
- `app/signup.tsx`
- `app/forgot-password.tsx`
- `app/check-email.tsx`
- `app/reset-password.tsx`
- `app/parent/add-child/final.tsx`

## Tests

- `lib/__tests__/network.test.ts` covers offline state, unknown reachability, action-specific alerts, and common fetch failures.
- `app/__tests__/authScreens.test.tsx` verifies that an offline sign-in does not call Supabase.

## Manual QA

- [ ] Open login and signup and confirm the internet explanation is visible.
- [ ] Enable airplane mode on login, parent, child, and settings routes and confirm the global pop-up and offline banner appear.
- [ ] Launch the app while already offline and confirm the pop-up appears after the animated splash.
- [ ] Background the app, change connectivity, return to it, and confirm the global state refreshes.
- [ ] Attempt sign-in offline and confirm the message mentions signing in.
- [ ] Attempt signup offline and confirm no Supabase request is made.
- [ ] Attempt password reset and confirmation resend offline.
- [ ] Attempt to save a new child profile offline and confirm the final screen offers retry/edit actions.
- [ ] Restore connectivity and confirm the banner disappears.
- [ ] Repeat the previously blocked action and confirm it succeeds normally.
- [ ] Confirm bundled/local child activities that support offline use are not globally blocked.
