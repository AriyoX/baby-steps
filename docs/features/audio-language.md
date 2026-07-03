# Audio And Language

## Current Status

Partially implemented.

## Purpose

Audio and language features support child-friendly feedback, Luganda learning, and optional Luganda UI translations.

## User Flow

1. Root layout starts background music after fonts and session state load.
2. Games and stories play bundled sounds for feedback, page turns, pronunciation, and completion.
3. Parent settings includes a language toggle.
4. When Luganda is enabled, `TranslatedText` looks up exact string matches in a hardcoded translation map.
5. Prototype Sunbird translation and text-to-speech helpers are disabled and are not the main UI translation path.

## Main Files Involved

- `app/_layout.tsx`
- `app/parent/settings.tsx`
- `context/language-context.tsx`
- `components/translated-text.tsx`
- `components/test-translation.tsx`
- `components/games/utils/audioManager.ts`
- `lib/translations.ts`
- `lib/sunbirdApi.ts`
- `lib/lugandaTTS.ts`
- `assets/audio/`
- `assets/sounds/`

## Key Components, Screens, And Functions

- `LanguageProvider`
- `TranslatedText`
- `translate`
- `playBackgroundMusic`
- `playWordAudio`
- `loadGameSounds`
- `translateText`
- `speakLuganda`
- `TestTranslation`

## Data And Content Used

- Hardcoded UI translations in `lib/translations.ts`.
- Bundled word audio in `assets/audio/`.
- Bundled game/museum/story sounds in `assets/sounds/` and `assets/audio/`.
- Disabled prototype Sunbird helper functions.

## State Management And Logic Notes

- Language preference is stored in AsyncStorage as `isLuganda`.
- Translations are exact-string lookups. Dynamic strings, changed punctuation, or concatenated text often fall back to English.
- Background music uses `expo-av` in the root layout and pauses/resumes with app state.
- Games and museum screens create and unload local `Audio.Sound` instances.
- Settings has a `soundEffects` toggle, but it does not appear to control global game/audio behavior.

## API Or Database Usage

- Normal UI translation does not use a database or API.
- Sunbird translation and TTS helpers are disabled until a server-side endpoint exists.

## Tests

No tests currently cover translation lookup, audio playback, app-state audio behavior, or Sunbird helpers.

## Known Limitations Or Bugs

- `expo-av` is deprecated and should be replaced.
- Hardcoded exact-string translations are brittle.
- Sunbird helper behavior and API response shapes are not verified by integration tests.
- Some source strings show encoding artifacts.

## Future MVP Improvements

- Replace `expo-av` with supported Expo audio APIs.
- If Sunbird becomes part of MVP, route it through a secure server-side endpoint.
- Decide whether Sunbird is part of MVP or remove the disabled prototype helpers.
- Define a localization strategy with stable keys instead of exact source strings.
- Add audio error handling and tests for non-network translation paths.

## Manual QA Checklist

- [ ] Start the app and confirm background music behavior.
- [ ] Send app to background and foreground and confirm audio pauses/resumes safely.
- [ ] Toggle language in settings.
- [ ] Confirm translated text changes where exact translations exist.
- [ ] Confirm untranslated strings fall back gracefully.
- [ ] Play word pronunciation audio in Luganda Learning.
- [ ] Play story page-turn audio.
- [ ] Play museum item sounds.
- [ ] Confirm no audio continues unexpectedly after leaving screens.
