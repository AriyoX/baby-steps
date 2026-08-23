# Developer Setup

## Current Status

This project is an Expo React Native prototype using npm, Expo Router, Supabase, NativeWind, TypeScript, and Jest.

## Prerequisites

- Node.js. The GitHub workflow uses Node `22.13.0`; a current Node 20+ or 22+ runtime is recommended.
- npm.
- Android Studio and Android SDK for Android builds.
- Xcode for iOS builds on macOS.
- A Supabase project for auth/profile/activity/achievement flows.

## Install Dependencies

```bash
npm install
```

The repo has `package-lock.json`, so npm is the documented package manager.

## Environment Setup

Create `.env` locally:

```bash
EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Restart Expo after changing `.env`.

Do not commit real environment values.

There is currently no committed `.env.example`; use the two variable names above when setting up a local `.env` file or build environment.

## Run The App

```bash
npm start
```

Equivalent command from `package.json`:

```bash
expo start
```

## Android

```bash
npm run android
```

Equivalent command:

```bash
expo run:android
```

Use an emulator from Android Studio or a connected Android device.

## iOS

```bash
npm run ios
```

Equivalent command:

```bash
expo run:ios
```

iOS requires macOS and Xcode.

## Web

```bash
npm run web
```

Equivalent command:

```bash
expo start --web
```

Static export is not a package script, but the verification report confirms this command passed:

```bash
npx expo export --platform web
```

## Tests, Lint, And Type Check

Commands from `package.json`:

```bash
npm test
npm run test:watch
npm run typecheck
npm run lint
```

## Common Setup Issues

### Supabase screens do not work

Check `.env` and restart Expo. The app expects `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

### Child mode redirects to parent dashboard

Open child mode from a child detail screen so `ChildContext` has an active child.

### Android build fails

Confirm emulator/device setup, Android SDK installation, and environment variables for Android tooling.

### iOS build fails

Confirm Xcode command-line tools and simulator/device setup.

### Audio warnings appear

`expo-av` is used throughout the app and is deprecated. This is a known MVP hardening task.

### CI package manager mismatch

`.github/workflows/android-apk-build.yml` uses `yarn install`, but the repo has `package-lock.json` and the docs use npm. Align CI before relying on the workflow.
