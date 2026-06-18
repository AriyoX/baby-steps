# Testing Guide

## Current Test Setup

The app uses Jest with `jest-expo`.

`package.json` scripts:

```bash
npm test
npm run test:watch
```

Jest config:

```json
"jest": {
  "preset": "jest-expo"
}
```

## Current Test Files

- `content/games/__tests__/countingGameStages.test.ts`
- `content/games/__tests__/lugandawords.test.ts`
- `content/games/__tests__/wordgamewords.test.ts`

## What Is Covered

Current tests cover pure content/helper behavior:

- Luganda number lookup and currency labels.
- Random counting stage value constraints.
- Luganda lesson word/level selection.
- Stage and level unlock helper behavior.
- Word game content integrity.

## What Is Not Covered

There is no automated coverage yet for:

- Auth signup/login/reset flows.
- Add-child flow.
- Parent dashboard rendering.
- Child mode route guards.
- Parent gate PIN behavior.
- Game interaction flows.
- Story page navigation and quiz scoring.
- Supabase activity writes.
- Achievement awarding.
- Coloring drawing/save/share.
- Museum modals, sounds, videos, and gestures.
- Device orientation behavior.
- Android/iOS native behavior.

## Recommended Testing Priorities

1. Add route smoke tests for auth, parent dashboard, child profile, and child mode launch.
2. Add interaction tests for one game completion flow.
3. Add story quiz scoring tests around a shared story model after refactor.
4. Add tests for `saveActivity` and achievement awarding with mocked Supabase.
5. Add manual or automated device smoke tests for orientation, audio, and media permissions.

## Validation Commands

Run before broad code changes:

```bash
npm run typecheck
npm test
npm run lint
```

For docs-only changes, tests are usually not required, but link/path validation is still useful.

## Current Verification Baseline

According to `VERIFICATION_REPORT.md` and the 2026-06-18 documentation verification pass:

- `npm run typecheck` passed.
- `npm test -- --runInBand` passed with 3 suites and 15 tests.
- `npm run lint -- --no-color` passed with 0 errors and 153 warnings.
- `npx expo export --platform web` passed.

## Testing Gaps For MVP

- UI regression coverage is the largest gap.
- Supabase behavior should be tested with mocks or a test project.
- Game and story completion flows need smoke coverage before refactoring.
- Device-specific features need manual QA until automated E2E is introduced.
