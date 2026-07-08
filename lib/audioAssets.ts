import type { AVPlaybackSource } from "expo-av"

export type BackgroundTrack = {
  id: string
  title: string
  source: AVPlaybackSource
}

export const BACKGROUND_TRACKS: readonly BackgroundTrack[] = [
  {
    id: "default",
    title: "Default",
    source: require("@/assets/audio/background-music.mp3"),
  },
]

export const BACKGROUND_TRACK_IDS = BACKGROUND_TRACKS.map((track) => track.id)

export const getBackgroundTrackById = (trackId: string): BackgroundTrack =>
  BACKGROUND_TRACKS.find((track) => track.id === trackId) ?? BACKGROUND_TRACKS[0]

export type LearningAudioResolution = {
  source: AVPlaybackSource
  isPlaceholder: boolean
}

// TODO: Replace placeholder learning cues with reviewed native-speaker recorded audio before production.
export const LEARNING_PLACEHOLDER_SOUND: AVPlaybackSource = require("@/assets/sounds/touch-1.mp3")

const LEARNING_WORD_AUDIO_SOURCES = {
  amazzi: require("@/assets/audio/Amazzi.mp3"),
  bulungi: require("@/assets/audio/bulungi.m4a"),
  "oli-otya": require("@/assets/audio/oli-otya.m4a"),
  omwana: require("@/assets/audio/omwana.m4a"),
  webale: require("@/assets/audio/webale.m4a"),
} satisfies Record<string, AVPlaybackSource>

const normalizeAudioAssetKey = (audioAsset: unknown): string | null => {
  if (typeof audioAsset !== "string") {
    return null
  }

  const trimmedAsset = audioAsset.trim()
  if (!trimmedAsset) {
    return null
  }

  return trimmedAsset
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .toLowerCase()
}

const buildLearningAudioAssetMap = (): Record<string, AVPlaybackSource> => {
  const entries: Array<[string, AVPlaybackSource]> = []

  for (const [key, source] of Object.entries(LEARNING_WORD_AUDIO_SOURCES)) {
    entries.push([key, source])
    entries.push([`audio/${key}.mp3`, source])
    entries.push([`audio/${key}.m4a`, source])
    entries.push([`assets/audio/${key}.mp3`, source])
    entries.push([`assets/audio/${key}.m4a`, source])
  }

  entries.push(["amazzi.mp3", LEARNING_WORD_AUDIO_SOURCES.amazzi])
  entries.push(["assets/audio/amazzi.mp3", LEARNING_WORD_AUDIO_SOURCES.amazzi])
  entries.push(["bulungi.m4a", LEARNING_WORD_AUDIO_SOURCES.bulungi])
  entries.push(["assets/audio/bulungi.m4a", LEARNING_WORD_AUDIO_SOURCES.bulungi])
  entries.push(["oli-otya.m4a", LEARNING_WORD_AUDIO_SOURCES["oli-otya"]])
  entries.push(["assets/audio/oli-otya.m4a", LEARNING_WORD_AUDIO_SOURCES["oli-otya"]])
  entries.push(["omwana.m4a", LEARNING_WORD_AUDIO_SOURCES.omwana])
  entries.push(["assets/audio/omwana.m4a", LEARNING_WORD_AUDIO_SOURCES.omwana])
  entries.push(["webale.m4a", LEARNING_WORD_AUDIO_SOURCES.webale])
  entries.push(["assets/audio/webale.m4a", LEARNING_WORD_AUDIO_SOURCES.webale])

  return Object.fromEntries(entries)
}

const LEARNING_AUDIO_ASSETS = buildLearningAudioAssetMap()

export const isValidLearningAudioAsset = (audioAsset: unknown): boolean => {
  const normalizedAsset = normalizeAudioAssetKey(audioAsset)
  return Boolean(normalizedAsset && LEARNING_AUDIO_ASSETS[normalizedAsset])
}

export const resolveLearningAudioSource = (
  audioAsset: unknown,
): LearningAudioResolution => {
  const normalizedAsset = normalizeAudioAssetKey(audioAsset)
  const source = normalizedAsset ? LEARNING_AUDIO_ASSETS[normalizedAsset] : undefined

  if (source) {
    return { source, isPlaceholder: false }
  }

  return { source: LEARNING_PLACEHOLDER_SOUND, isPlaceholder: true }
}
