# Authentication

## Current Status

Implemented prototype.

## Purpose

Authentication lets parents create accounts, sign in, sign out, and request password resets through Supabase Auth.

## User Flow

1. After onboarding, unauthenticated users go to `/login`.
2. Parents can sign in with email/password.
3. Parents can navigate to `/signup` to create an account.
4. Accepted signup attempts route to `/check-email` so parents know to confirm their Baby Steps account; if Supabase returns a session during signup, the app clears the local session and still shows the confirmation step.
5. Parents can request a reset link from `/forgot-password`.
6. Reset links target the app scheme route `babysteps://auth/callback`; legacy `babysteps://reset-password` links remain supported.
7. Recovery callbacks route to `/reset-password`.
8. Login attempts for unconfirmed accounts route to the same `/check-email` guidance with a resend action when the email is available.
9. Signed-in parents reach `/parent`.
10. Parents sign out from `/parent/settings`.

## Main Files Involved

- `app/login.tsx`
- `app/signup.tsx`
- `app/check-email.tsx`
- `app/forgot-password.tsx`
- `app/reset-password.tsx`
- `app/auth/callback.tsx`
- `app/parent/settings.tsx`
- `app/_layout.tsx`
- `lib/authMessages.ts`
- `lib/authRedirects.ts`
- `lib/supabase.ts`
- `app.json`

## Key Components, Screens, And Functions

- `supabase.auth.signInWithPassword` in `app/login.tsx`
- `supabase.auth.signUp` in `app/signup.tsx`
- `supabase.auth.resend` in `app/check-email.tsx`
- `supabase.auth.resetPasswordForEmail` in `app/forgot-password.tsx`
- `supabase.auth.updateUser` in `app/reset-password.tsx`
- `supabase.auth.signOut` in `app/parent/settings.tsx`
- Auth session listener in `app/_layout.tsx`

## Data And Content Used

The auth screens use local component state for form fields and Supabase Auth for account/session state.

## State Management And Logic Notes

- Supabase session state is loaded in `app/_layout.tsx`.
- Supabase auth persistence uses AsyncStorage on device.
- During static rendering, `lib/supabase.ts` uses an in-memory storage fallback so web export can complete.
- Auth errors are mapped through `lib/authMessages.ts` before being shown to parents.
- Unconfirmed-email login errors reuse the check-email screen instead of a transient alert.
- Password reset and signup confirmation links are parsed in `lib/authRedirects.ts`.
- The reset-password screen can process legacy reset-password links and validate an existing recovery session.

## API Or Database Usage

- Supabase Auth.
- Environment variables:
  - `EXPO_PUBLIC_SUPABASE_URL`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY`

## Tests

- `lib/__tests__/authMessages.test.ts` covers friendly auth error mapping, resend-confirmation copy, and validation helpers.
- `app/__tests__/authScreens.test.tsx` covers accepted signup routing, session-returning signup routing, unconfirmed-login guidance, forgot-password check-email routing, and reset-password visibility toggles.
- `lib/__tests__/accountManagement.test.ts` covers the compatibility signup error helper exported from account management.

## Known Limitations Or Bugs

- Reset-password deep-link handling needs device testing.
- Auth route guards are prototype-level and concentrated in `app/_layout.tsx`.
- There is no automated device-level coverage for real Supabase email delivery, signup confirmation clicks, sign out, or missing environment variables.

## Future MVP Improvements

- Add auth smoke tests or integration tests.
- Harden reset-password deep-link behavior.
- Add clearer error states for missing Supabase config.
- Move auth route-guard logic into focused helpers/hooks.

## Manual QA Checklist

- [ ] Open app with no Supabase env vars and confirm failure mode is understandable.
- [ ] Sign up with a new email.
- [ ] Confirm signup always leaves the form and shows the check-email screen.
- [ ] Try sign-in before email confirmation and confirm the app shows confirmation guidance.
- [ ] Resend confirmation email from check-email when an email is available.
- [ ] Confirm expected email-verification behavior for the Supabase project.
- [ ] Sign in with valid credentials.
- [ ] Try invalid credentials and confirm the app shows an error.
- [ ] Request a password reset.
- [ ] Open a reset link on device and confirm the reset route works.
- [ ] Sign out from settings and confirm the app returns to the unauthenticated flow.
