# Deployment Readiness

## Current Status

Baby Steps is not yet production-deployment ready. Static web export has passed in a verification session, and EAS build profiles exist, but several app, security, QA, and workflow items remain before MVP launch.

## Build And Run Commands

Commands in `package.json`:

```bash
npm start
npm run android
npm run ios
npm run web
npm test
npm run test:watch
npm run typecheck
npm run lint
```

Verified but not scripted in `package.json`:

```bash
npx expo export --platform web
```

EAS profiles are defined in `eas.json`:

- `development`
- `preview`
- `production`
- `groceries`

The `groceries` profile builds an Android APK using:

```bash
eas build --platform android --profile groceries --non-interactive
```

## App Config Notes

`app.json` includes:

- App name: `Baby Steps`
- Slug: `baby-steps`
- Scheme: `babysteps`
- Android package: `com.babysteps.babysteps_prototype`
- iOS tablet support and full-screen requirement
- Static web output with Metro
- Expo Router, font, splash screen, screen orientation, and asset plugins
- Typed routes experiment enabled

## Environment And Config Requirements

Required for current Supabase-backed app behavior:

```bash
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
```

Required only in Supabase/server-side configuration for final account deletion:

```bash
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
BABY_STEPS_ACCOUNT_DELETION_ADMIN_SECRET
```

Do not expose `SUPABASE_SERVICE_ROLE_KEY` or `BABY_STEPS_ACCOUNT_DELETION_ADMIN_SECRET` through Expo public variables or React Native client code.

Language-service credential note:

- Prototype Sunbird helpers are disabled. Keep third-party language-service credentials out of Expo and React Native client code unless calls are routed through a secure server-side endpoint.

## Current CI/Workflow Notes

`.github/workflows/android-apk-build.yml`:

- Runs on pushes to `main`.
- Uses Node `22.13.0`.
- Installs EAS with `expo/expo-github-action@v8`.
- Requires `secrets.EAS_ACCESS_TOKEN`.
- Runs `yarn install`.
- Builds Android with the `groceries` EAS profile.

Mismatch to fix:

- Local docs and lockfile use npm, but CI uses Yarn.

## Known Deployment Blockers

- No full Android/iOS manual QA pass documented.
- Focused route/component coverage exists, but there is no installed-build E2E suite for the complete parent/child journey.
- `expo-av` is deprecated.
- Prototype Sunbird helpers are disabled until a secure server-side endpoint exists.
- Settings links point to missing routes.
- Some app copy/media has encoding artifacts.
- Parent dashboard and progress screens contain placeholders.
- Content and later application schema changes are migration-managed, but the checked-in chain is missing the original base-schema migration, so a clean local reset fails before `public.children` exists.
- Supabase advisors still report pre-existing RLS/function/auth configuration findings outside `content_items` that need release review.
- No production privacy, support, analytics, crash reporting, or monitoring workflow is complete.
- Payments remain planned only. Database-backed Learning, game, menu, and Story content is implemented, but placeholder curriculum/media must not be described as reviewed production content.

## MVP Launch Preparation Notes

Before release:

1. Run typecheck, tests, lint, and export.
2. Complete Android device QA.
3. Complete iOS device QA if iOS is in scope.
4. Remove or secure hardcoded third-party credentials.
5. Replace missing settings routes with real screens or remove links.
6. Restore/verify the full Supabase migration baseline, align the linked history, and review database/security advisors.
7. Validate privacy policy and account deletion page.
8. Review app store metadata so it matches implemented features.
9. Prepare rollback and support process.

## Manual Deployment Checklist

- [ ] `npm install` succeeds from a clean checkout.
- [ ] `npm run typecheck` passes.
- [ ] `npm test` passes.
- [ ] `npm run lint` has no errors.
- [ ] `npx expo export --platform web` passes if web remains in scope.
- [ ] Android EAS build succeeds.
- [ ] iOS EAS/build succeeds if in scope.
- [ ] Required env vars exist in build environment.
- [ ] No hardcoded secrets remain.
- [ ] Linked migrations match the repository and published `content_items` are readable but not writable by child-facing roles.
- [ ] A fresh database can be recreated after the missing base migration is restored.
- [ ] `finalize-account-deletions` is deployed, has its admin secret set, and has a daily scheduled invocation or documented manual admin run.
- [ ] All app store claims match implemented features.
- [ ] Privacy policy and deletion instructions are reachable.
- [ ] Manual QA checklist is complete.
