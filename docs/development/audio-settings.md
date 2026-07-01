# Audio Settings

Baby Steps splits audio into two categories:

- Background music: the looping app music. It is managed as a single background track and should not be started directly from screens.
- App sounds: all non-background-music audio, including button effects, game feedback, museum sounds, story cues, and TTS/audio narration.

## Where Settings Live

Audio preferences are stored in AsyncStorage under `@baby_steps/audio_settings/v1`.

The settings model and validation live in `lib/audioSettings.ts`. The live audio manager lives in `lib/audioManager.ts`, and the React provider/hook lives in `context/AudioContext.tsx`.

## Adding Background Music Tracks

Add a track to `BACKGROUND_TRACKS` in `lib/audioAssets.ts`:

```ts
{
  id: "calm",
  title: "Calm",
  source: require("@/assets/audio/calm-background.mp3"),
}
```

The selected track id is persisted in audio settings. If a saved id is missing later, the app falls back to `default`.

## Playing App Sounds

Use the central manager instead of creating `Audio.Sound` directly:

```ts
import { audioManager } from "@/lib/audioManager"

await audioManager.playAppSound(require("@/assets/sounds/correct.mp3"))
```

For sounds that need to be preloaded and replayed:

```ts
const sound = await audioManager.createAppSound(require("@/assets/sounds/correct.mp3"))
await audioManager.replayAppSound(sound)
await audioManager.unloadAppSound(sound)
```

Do not start background music or play app sounds with raw `Audio.Sound.createAsync` in screens. That bypasses mute, volume, lifecycle cleanup, and duplicate-background protection.
