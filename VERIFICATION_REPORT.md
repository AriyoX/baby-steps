# Baby Steps Refactor Verification Report

Date: 2026-06-18

## Summary Verdict

The refactor is safe to continue from, with caution. The changed code typechecks, tests pass, lint has no errors, and Expo web export succeeds. The main refactor moves hardcoded game content into `content/games/` without changing the moved content itself, and the updated imports resolve correctly.

This is not yet a clean MVP foundation. The prototype still has large components, many lint warnings, no UI/E2E regression coverage, stale settings links, hardcoded story/game/media content, and no real database/API content layer.

## What Was Reviewed

- Full working-tree diff, including modified, added, deleted, and moved files.
- Moved game content under `content/games/`.
- Updated imports in game components, audio utilities, and progress managers.
- JSX text escaping and story timeout type changes.
- `lib/supabase.ts` static-render storage fallback.
- `package.json`, `package-lock.json`, `eslint.config.js`, and test scripts.
- Added Jest tests under `content/games/__tests__/`.
- `schema.sql` database feasibility context.
- `REFACTOR_REPORT.md`, including payment and database feasibility sections.

## Existing Functionality Check

The file-based routes still exist for onboarding/auth, parent dashboard, add-child flow, child dashboard tabs, games, stories, coloring, museum screens, settings, activities, progress, and achievements. `npx expo export --platform web` found and exported 55 static routes.

The three deleted files under `components/games/utils/` were content moves, not behavior removal. I compared each old file from `HEAD` to its new `content/games/` counterpart and found no content differences:

- `countingGameStages.ts`
- `lugandawords.ts`
- `wordgamewords.ts`

The removed duplicate `chicken.jpg` switch case was safe; `components/games/WordGameComponent.tsx` still handles `chicken.jpg` once, and `content/games/wordgamewords.ts` still references that image.

## Issues Fixed During Verification

- Fixed the child Games tab card list in `components/child/AfricanThemeGameInterface.tsx`. The tab route is `index`, but the switch only handled `profile`, so the Games tab could fall through to placeholder `tester` targets. The fix maps `index` to the real games card list.
- Removed unreachable code after a `return` and an unused imported type in `components/games/utils/progressManagerLugandaLearning.ts`.
- Updated `REFACTOR_REPORT.md` to correct stale Google Play Billing Library deadline guidance. Current official Google docs list Play Billing Library 9.0.0 as available, with version 7's new app/update deadline on 2026-08-31, version 8's on 2027-08-31, and version 9's on 2028-08-31.
- Updated `REFACTOR_REPORT.md` lint result from 155 warnings to the current 153 warnings after verification fixes.

## Commands Run

- `npm ls --depth=0` - passed.
- `npm run typecheck` - passed.
- `npm test -- --runInBand` - passed: 3 suites, 15 tests.
- `npm run lint -- --no-color` - passed with 0 errors and 153 warnings.
- `npx expo export --platform web` - passed and exported `dist/`; still warns that `expo-av` is deprecated.

## Test Quality

The added tests are useful and focused on real existing behavior for pure content/helper logic:

- counting stage number generation and Luganda/currency labels,
- Luganda lesson word selection and unlock helpers,
- word game content integrity.

They are not superficial, but they are narrow. They do not cover navigation, story rendering, game interaction, scoring/completion flows, Supabase activity writes, audio playback, orientation behavior, or parent/child switching. No extra tests were added because the safest missing coverage now is UI/integration coverage, not another small pure-data test.

## REFACTOR_REPORT.md Accuracy

The report is mostly accurate after correction. It correctly describes the architecture, content moves, tests added, remaining warnings, database feasibility, and major risks.

Corrections made:

- Google Play Billing Library deadline wording was stale.
- Lint warning count changed after verification fixes.

No payment implementation or database content migration was added.

## Payment Feasibility Verification

The payment feasibility section is realistic after the Google deadline correction. For mobile digital content such as premium lessons, stories, games, packs, subscriptions, or in-app unlocks, Baby Steps should assume platform billing requirements:

- iOS: Apple In-App Purchase/StoreKit for in-app digital content and auto-renewable subscriptions.
- Android: Google Play Billing for Play-distributed in-app digital products/subscriptions, with current library requirements tracked before implementation.
- Backend verification is required for both platforms; the client must not be the source of truth for entitlements.
- Future tables/entities should include products, plans, prices, purchases, subscriptions, transactions, platform receipts, entitlements, organizations/schools, and access-control rules.
- School/institution plans may be possible outside consumer IAP if sold as organization-level services, but app access still needs server-owned identity and entitlement checks.

Official sources checked:

- Apple App Store Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Apple auto-renewable subscriptions: https://developer.apple.com/app-store/subscriptions/
- Google Play Billing: https://developer.android.com/google/play/billing
- Google Play subscriptions: https://developer.android.com/google/play/billing/subscriptions
- Google Play Payments policy: https://support.google.com/googleplay/android-developer/answer/10281818
- Google Play Billing release notes: https://developer.android.com/google/play/billing/release-notes
- Google Play Billing deprecation FAQ: https://developer.android.com/google/play/billing/deprecation-faq

## Database Content Feasibility Verification

The database feasibility section is accurate. Current `schema.sql` supports child profiles, activities, achievements, and child-achievement joins. It does not yet model stories, story pages, games, game levels, lesson items, questions, options, media assets, localization, versioning, publication workflow, creators, roles, schools, subscriptions, or entitlements.

Hardcoded content remains in:

- `content/games/` for moved game/lesson content,
- `components/stories/*Story.tsx` for story pages and quizzes,
- `components/child/AfricanThemeGameInterface.tsx` for dashboard cards,
- museum screens and translations/media maps.

The recommended phased migration is sensible: define typed content contracts first, migrate one content type at a time, keep bundled fallback content, then add API/database-driven loading and cache/version behavior.

## Remaining Risks Not Fixed

- Lint still has 153 warnings, mostly unused imports/variables, duplicate imports, hook dependency issues, and old prototype cruft.
- Settings still links to routes that do not exist: `/content-management`, `/privacy-settings`, `/help-support`, and `/account-info`.
- `components/SkipButtonOnboarding.tsx` appears unused and still points to stale `/add-child` routing.
- No device/simulator/manual UI pass was performed in this verification. Static export is not a substitute for tapping through the games and stories on iOS/Android.
- `expo-av` is deprecated and should be replaced during MVP work before it becomes a blocking SDK issue.
- Auth, parent/child switching, progress writes, achievements, story quizzes, audio playback, and orientation behavior need UI/integration regression coverage.

## Recommended Next Steps

- Before Week 1: manually smoke test onboarding, login/signup, add-child, parent dashboard, child mode, all child tabs, each game, each story, museum screens, and settings on at least Android.
- In Week 1: reduce high-risk lint warnings in auth/routing/progress/game files first.
- In Week 1 or 2: add route placeholders or remove links for future settings screens.
- In Week 2: define content contracts for stories, games, lessons, media, and progress records before database migration.
- Before payments: add backend/API identity and entitlement foundations; do not attempt store billing client-only.
