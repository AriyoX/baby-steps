# Authentication

## Current Status

Implemented prototype.

## Purpose

Authentication lets parents create accounts, sign in, sign out, and request password resets through Supabase Auth.

## User Flow

1. After onboarding, unauthenticated users go to `/login`.
2. Parents can sign in with email/password.
3. Parents can navigate to `/signup` to create an account.
4. Parents can request a reset link from `/forgot-password`.
5. Reset links target the app scheme route `babysteps://reset-password`.
6. Signed-in parents reach `/parent`.
7. Parents sign out from `/parent/settings`.

## Main Files Involved

- `app/login.tsx`
- `app/signup.tsx`
- `app/forgot-password.tsx`
- `app/reset-password.tsx`
- `app/parent/settings.tsx`
- `app/_layout.tsx`
- `lib/supabase.ts`
- `app.json`

## Key Components, Screens, And Functions

- `supabase.auth.signInWithPassword` in `app/login.tsx`
- `supabase.auth.signUp` in `app/signup.tsx`
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
- The reset-password screen parses deep links with `expo-linking`, but its `checkUserSession` helper is currently defined and not called.

## API Or Database Usage

- Supabase Auth.
- Environment variables:
  - `EXPO_PUBLIC_SUPABASE_URL`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY`

## Tests

No tests currently cover authentication or password reset flows.

## Known Limitations Or Bugs

- Reset-password deep-link handling needs device testing.
- Auth route guards are prototype-level and concentrated in `app/_layout.tsx`.
- There is no automated coverage for signup confirmation, expired reset links, sign out, or missing environment variables.

## Future MVP Improvements

- Add auth smoke tests or integration tests.
- Harden reset-password deep-link behavior.
- Add clearer error states for missing Supabase config.
- Move auth route-guard logic into focused helpers/hooks.

## Manual QA Checklist

- [ ] Open app with no Supabase env vars and confirm failure mode is understandable.
- [ ] Sign up with a new email.
- [ ] Confirm expected email-verification behavior for the Supabase project.
- [ ] Sign in with valid credentials.
- [ ] Try invalid credentials and confirm the app shows an error.
- [ ] Request a password reset.
- [ ] Open a reset link on device and confirm the reset route works.
- [ ] Sign out from settings and confirm the app returns to the unauthenticated flow.
