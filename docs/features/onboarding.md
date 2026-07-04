# App Onboarding

## Current Status

Implemented prototype.

## Purpose

The app onboarding introduces Baby Steps with three simple slides before sending the user to authentication.

## User Flow

1. A first-time user lands on `/`.
2. The user can swipe through three onboarding slides or tap `Skip`.
3. On completion, the app stores `@onboarding_completed=true` in AsyncStorage.
4. The app routes to `/login`.

## Main Files Involved

- `app/index.tsx`
- `app/_layout.tsx`
- `lib/utils.ts`
- `components/SkipButtonOnboarding.tsx`

## Key Components, Screens, And Functions

- `OnboardingScreen` in `app/index.tsx`
- `checkOnboardingStatus` in `app/_layout.tsx`
- `hasCompletedOnboarding`, `setOnboardingCompleted`, and `resetOnboardingForDev` in `lib/onboarding.ts`

## Data And Content Used

Onboarding slide data is hardcoded in `app/index.tsx`. It includes slide title, description, emoji/image placeholder, and color metadata.

## State Management And Logic Notes

- Onboarding completion is stored locally in AsyncStorage.
- The root layout checks the onboarding flag before deciding whether `/` should remain on onboarding or redirect to `/login`.
- If a valid session already exists, the root route sends the parent to the app instead of showing pre-login onboarding.
- `components/SkipButtonOnboarding.tsx` appears unused and points to stale `/add-child` routing.

## Developer Reset

In development builds only, go to `Settings -> Developer -> Reset onboarding`.

This calls `resetOnboardingForDev`, which clears only `@onboarding_completed`. It does not sign out, delete child profiles, or clear progress. To view onboarding again, sign out or restart the app while signed out.

## API Or Database Usage

None. Onboarding status is local-only.

## Tests

No tests currently cover onboarding.

## Known Limitations Or Bugs

- Some emoji/text in the onboarding file shows encoding artifacts in the source.
- There is no automated test for the first-run or returning-user route behavior.
- The unused skip button component should be removed or updated during cleanup.

## Future MVP Improvements

- Add a route-level smoke test for first launch and completed onboarding.
- Clean encoding artifacts in copy and visual placeholders.

## Manual QA Checklist

- [ ] Clear app storage and open the app.
- [ ] Confirm `/` shows onboarding.
- [ ] Swipe through each slide.
- [ ] Tap `Next` on non-final slides.
- [ ] Tap `Get started` on the final slide and confirm `/login`.
- [ ] Clear storage again and confirm `Skip` also routes to `/login`.
- [ ] Restart the app and confirm onboarding is not shown after completion.
