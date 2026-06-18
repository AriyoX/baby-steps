# Baby Steps

Baby Steps is an Expo React Native app for early cultural learning. The current prototype helps parents create child profiles, then lets children explore Luganda language practice, Buganda-themed games, stories, coloring pages, and museum-style cultural content.

## Current Status

Baby Steps is in MVP preparation. The app has several working prototype surfaces, but it is not yet a production-ready MVP.

Current implementation:

- Email/password authentication through Supabase.
- Parent dashboard, child profiles, activity history, and achievements.
- Child mode with game, story, coloring, and museum tabs.
- Hardcoded story, lesson, game, museum, image, audio, and translation content.
- Local game progress through AsyncStorage.
- Supabase activity and achievement records for several games and stories.

Not currently implemented as production features:

- Payments, subscriptions, entitlements, or premium access.
- Database-driven content publishing.
- Admin/content creator tools.
- Full offline sync.
- Production analytics, crash monitoring, or store-ready deployment flow.

See [docs/mvp-roadmap.md](docs/mvp-roadmap.md) for the current 8-week MVP preparation plan.

## Tech Stack

| Area | Current implementation |
| --- | --- |
| App framework | Expo SDK 54, React Native 0.81, React 19 |
| Routing | Expo Router 6 file-based routes under `app/` |
| Language | TypeScript with `strict` enabled |
| Styling | NativeWind/Tailwind plus React Native `StyleSheet` and inline styles |
| Backend | Supabase Auth and Supabase tables referenced by `schema.sql` |
| Local storage | `@react-native-async-storage/async-storage` |
| Audio | `expo-av` and `expo-speech` |
| Media/export | `react-native-view-shot`, `expo-media-library`, `expo-sharing` |
| Tests | Jest with `jest-expo` |
| Package manager | npm, with `package-lock.json` |
| Build config | Expo config in `app.json`, EAS profiles in `eas.json` |

Note: `expo-av` is deprecated in current Expo guidance and should be replaced during MVP hardening.

## Main Features

| Feature | Status | Notes |
| --- | --- | --- |
| App onboarding | Implemented prototype | Three-slide intro stored with `@onboarding_completed` in AsyncStorage. |
| Authentication | Implemented prototype | Supabase signup, login, forgot password, and reset password screens exist. |
| Parent dashboard | Partially implemented | Child profiles and activity summaries are Supabase-backed; some progress values and tips are placeholders. |
| Child profiles | Implemented prototype | Multi-screen add-child flow writes to the `children` table. |
| Child mode navigation | Implemented prototype | Selected child is stored in React context; child mode locks landscape and exits through a random PIN parent gate. |
| Games | Implemented prototype | Word, card matching, puzzle, Luganda learning, and Luganda counting games exist. |
| Stories | Implemented prototype | Eight hardcoded story screens with page navigation and 5-question quizzes. |
| Coloring | Implemented prototype | Five drawing templates with brush, eraser, fill, undo/redo, save, and share controls. |
| Museum | Implemented prototype | Hardcoded artifacts, art, instruments, and textiles screens. Museum activity tracking is not wired yet. |
| Progress and achievements | Partially implemented | Game/story activities write to Supabase; achievements depend on seeded `achievements` rows. |
| Language/audio | Partially implemented | Hardcoded Luganda translation map, bundled audio, `expo-speech`, and prototype Sunbird helpers. |
| Payments | Planned only | Discussed in the refactor report, not implemented. |
| Database content | Planned only | `schema.sql` covers children, activities, and achievements, not curriculum content. |

Detailed feature docs live in [docs/features/](docs/features/README.md).

## Project Structure

```text
app/                         Expo Router routes and layouts
app/child/                   Child mode, tabs, games, stories, museum, coloring, parent gate
app/parent/                  Parent dashboard, settings, activities, child details, add-child flow
components/                  Shared UI, story components, game components, achievement logic
content/games/               Hardcoded structured game and Luganda lesson content
context/                     React contexts for active child, add-child flow, and language toggle
lib/                         Supabase client, activity helpers, translations, Sunbird prototype helpers
utils/                       Local storage helpers for activity/progress/session stats
assets/                      Bundled images, fonts, audio, sounds, story media, puzzle media
docs/                        Developer, feature, QA, and MVP documentation
schema.sql                   Context-only Supabase schema snapshot
```

See [docs/development/project-structure.md](docs/development/project-structure.md) for more detail.

## Prerequisites

- Node.js. The GitHub workflow uses Node `22.13.0`; use a current Node 20+ or 22+ runtime for local work.
- npm.
- Expo tooling through `npx expo`.
- Android Studio and an Android emulator/device for Android testing.
- Xcode and an iOS simulator/device for iOS testing on macOS.
- A Supabase project if you need auth, child profiles, activities, or achievements to work.

## Installation

```bash
npm install
```

This repo has `package-lock.json`, so npm is the package manager documented for local development. The current GitHub Android workflow still runs `yarn install`; align the workflow with npm before relying on CI builds.

## Environment Variables

The app reads these public Expo environment variables in `lib/supabase.ts`:

```bash
EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Create a local `.env` file with those values. Do not commit real environment values.
There is currently no committed `.env.example`; use the variable names above when creating local or build-environment config.

Important security note: `lib/lugandaTTS.ts` currently contains a hardcoded Sunbird token. Move language-service credentials to a secure backend or environment-controlled service before any production deployment.

## Run Locally

```bash
npm start
```

This runs:

```bash
expo start
```

## Run On Android

```bash
npm run android
```

This runs:

```bash
expo run:android
```

Use an Android emulator or connected Android device. Because this project uses native modules and EAS/native configuration, test the actual native build path before MVP release.

## Run On iOS

```bash
npm run ios
```

This runs:

```bash
expo run:ios
```

iOS builds require macOS with Xcode.

## Run On Web

```bash
npm run web
```

This runs:

```bash
expo start --web
```

The verification report also confirmed static web export with:

```bash
npx expo export --platform web
```

There is no package script for web export yet.

## Tests, Lint, And Type Check

Commands from `package.json`:

```bash
npm test
npm run test:watch
npm run typecheck
npm run lint
```

Current test coverage is focused on pure game-content helper logic under `content/games/__tests__/`. There are no UI, route, device, or end-to-end tests yet.

## Database Notes

`schema.sql` is a context snapshot, not a guaranteed executable migration. It defines:

- `children`
- `activities`
- `achievements`
- `child_achievements`

Current app code uses Supabase for:

- auth sessions,
- child profile reads/writes,
- activity writes and dashboard reads,
- achievement definitions and earned child achievements.

It does not yet use Supabase for story pages, game definitions, lesson content, media, localization, payments, entitlements, roles, organizations, or content publishing.

See [docs/development/database.md](docs/development/database.md).

## Content And Data Notes

Current content is mostly bundled and hardcoded:

- Stories and story quizzes: `components/stories/*Story.tsx`
- Story routes: `app/child/stories/*.tsx`
- Word game levels: `content/games/wordgamewords.ts`
- Luganda lesson stages/levels/words: `content/games/lugandawords.ts`
- Counting stages and Luganda number labels: `content/games/countingGameStages.ts`
- Card matching content: `components/games/CardsMatchingComponent.tsx`
- Puzzle images/content: `components/games/PuzzleGameComponent.tsx`
- Museum content: `app/child/games/museum/*.tsx`
- Coloring templates: `app/child/games/coloring/*.tsx`
- Translations: `lib/translations.ts`
- Media assets: `assets/`

See [docs/development/content-management.md](docs/development/content-management.md).

## Known Limitations

- Much of the app is prototype-level and hardcoded.
- Parent dashboard progress uses placeholder/random values in some places.
- `app/parent/settings.tsx` links to future routes that do not exist yet: `/content-management`, `/privacy-settings`, `/help-support`, and `/account-info`.
- `components/SkipButtonOnboarding.tsx` points to stale `/add-child` routing and appears unused.
- The active child is held in React context, so child mode can lose state on reloads or cold starts.
- Museum content is not currently saved to the `activities` table.
- Payments and database-driven content are planned only.
- Several UI strings/assets show prototype-era encoding artifacts.
- Lint currently passes with warnings according to `VERIFICATION_REPORT.md`.
- Manual Android/iOS QA is still required before deployment.

## MVP Roadmap Summary

The MVP preparation plan prioritizes:

- stabilizing auth, child profiles, routing, and parent/child switching,
- cleaning high-risk lint warnings,
- defining typed content contracts,
- normalizing progress and activity models,
- adding UI/integration test coverage,
- preparing database-driven content foundations,
- replacing deprecated audio APIs,
- completing device QA and deployment readiness work.

See [docs/mvp-roadmap.md](docs/mvp-roadmap.md).

## Contribution Guidelines

- Treat the current codebase as the source of truth.
- Keep prototype, partial, and planned features clearly labeled.
- Do not describe future payments, subscriptions, admin tools, or database content as implemented.
- Keep content changes close to the existing content boundaries.
- Prefer npm commands from `package.json`.
- Run focused validation before opening a change:

```bash
npm run typecheck
npm test
npm run lint
```

For docs-only changes, also check links and referenced paths.

## Troubleshooting

### Supabase auth or profile screens do not work

Confirm `.env` has `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`, then restart Expo.

### Child mode redirects back to the parent dashboard

Launch child mode from a child detail screen so `ChildContext` has an active child.

### Android build or emulator fails

Confirm Android Studio, SDK, and device/emulator setup. Then retry:

```bash
npm run android
```

### iOS build fails

Confirm macOS and Xcode setup. Then retry:

```bash
npm run ios
```

### Audio warnings appear during export/build

`expo-av` is still used and is deprecated. Plan migration to `expo-audio` / `expo-video` during MVP hardening.

### Coloring save/share fails

Coloring uses `expo-media-library`, `expo-sharing`, and `react-native-view-shot`. Check device permissions and test on native Android/iOS builds.

## Documentation

- [Documentation index](docs/README.md)
- [Feature docs](docs/features/README.md)
- [Developer setup](docs/development/setup.md)
- [Project structure](docs/development/project-structure.md)
- [Testing guide](docs/development/testing.md)
- [Content management](docs/development/content-management.md)
- [Database notes](docs/development/database.md)
- [Deployment readiness](docs/development/deployment.md)
- [Manual QA checklist](docs/qa/manual-qa-checklist.md)
- [MVP roadmap](docs/mvp-roadmap.md)
- [Refactor report](REFACTOR_REPORT.md)
- [Verification report](VERIFICATION_REPORT.md)
- [Documentation verification report](DOCS_VERIFICATION_REPORT.md)
- [Privacy policy](PRIVACY_POLICY.md)
- [Account deletion page](docs/delete-account.html)
