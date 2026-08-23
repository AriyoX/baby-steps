# App Onboarding

## Current Status

Implemented and visually standardized.

## Purpose

The app onboarding introduces Baby Steps with three simple slides before sending the user to authentication.

## User Flow

1. A first-time user lands on `/`.
2. The user can swipe through three onboarding slides, use `Continue`, or tap `Skip`.
3. On completion, the app stores `@onboarding_completed=true` in AsyncStorage.
4. The app routes to `/login`.

## Main Files Involved

- `app/index.tsx`
- `app/_layout.tsx`
- `lib/onboarding.ts`
- `components/onboarding/OnboardingArtwork.tsx`

## Key Components, Screens, And Functions

- `OnboardingScreen` in `app/index.tsx`
- `checkOnboardingStatus` in `app/_layout.tsx`
- `hasCompletedOnboarding`, `setOnboardingCompleted`, and `resetOnboardingForDev` in `lib/onboarding.ts`

## Data And Content Used

Onboarding slide data is defined in `app/index.tsx`. Each slide includes concise copy, a brand color treatment, and an illustration variant. The illustrations reuse the bundled Shana mascot and native icons, so onboarding does not depend on remote artwork.

All three slides share the same visual structure:

- a safe-area-aware wordmark and `Skip` action;
- a pale illustrated hero;
- a warm cream copy sheet;
- compact progress indicators; and
- one primary action that becomes `Get started` on the final slide.

## State Management And Logic Notes

- Onboarding completion is stored locally in AsyncStorage.
- The root layout checks the onboarding flag before deciding whether `/` should remain on onboarding or redirect to `/login`.
- If a valid session already exists, the root route sends the parent to the app instead of showing pre-login onboarding.
- Both `Skip` and `Get started` persist completion before routing to `/login`.
- The screen guards against duplicate completion requests and exposes a retryable message if local persistence fails.
- Paging preserves the active page after a width change and honors the operating system's reduced-motion setting.

## Developer Reset

In development builds only, go to `Settings -> Developer -> Reset onboarding`.

This calls `resetOnboardingForDev`, which clears only `@onboarding_completed`. It does not sign out, delete child profiles, or clear progress. To view onboarding again, sign out or restart the app while signed out.

## API Or Database Usage

None. Onboarding status is local-only.

## Tests

`app/__tests__/onboardingScreen.test.tsx` covers the three-slide presentation, Continue paging, accessible controls, final completion, Skip, duplicate-tap protection, persistence-before-navigation ordering, and the local-storage failure state.

## Known Limitations Or Bugs

- Root-level first-run versus returning-user routing still relies primarily on integration and manual QA.

## Future MVP Improvements

- Add a root route-decision integration matrix for signed-out first-run, signed-out returning, and authenticated launches.

## Manual QA Checklist

- [ ] Clear app storage and open the app.
- [ ] Confirm `/` shows onboarding.
- [ ] Swipe through each slide.
- [ ] Tap `Continue` on non-final slides.
- [ ] Tap `Get started` on the final slide and confirm `/login`.
- [ ] Clear storage again and confirm `Skip` also routes to `/login`.
- [ ] Restart the app and confirm onboarding is not shown after completion.
