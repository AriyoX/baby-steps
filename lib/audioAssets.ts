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

type LearningAudioAssetEntry = {
  source: AVPlaybackSource
  isPlaceholder?: boolean
}

// TODO: Replace placeholder learning cues with reviewed native-speaker recorded audio before production.
export const LEARNING_PLACEHOLDER_SOUND: AVPlaybackSource = require("@/assets/audio/Bulungi.mp3")

export const LEARNING_AUDIO_ASSETS = {
  placeholder_learning_cue: {
    source: LEARNING_PLACEHOLDER_SOUND,
    isPlaceholder: true,
  },
  "lg.stage1.oli_otya": {
    source: LEARNING_PLACEHOLDER_SOUND,
    isPlaceholder: true,
  },
  "lg.stage1.gyendi": {
    source: LEARNING_PLACEHOLDER_SOUND,
    isPlaceholder: true,
  },
  "lg.stage1.gyebale_ko": {
    source: LEARNING_PLACEHOLDER_SOUND,
    isPlaceholder: true,
  },
  "lg.stage1.webale": {
    source: LEARNING_PLACEHOLDER_SOUND,
    isPlaceholder: true,
  },
  "lg.stage1.story.1": {
    source: LEARNING_PLACEHOLDER_SOUND,
    isPlaceholder: true,
  },
  "lg.stage1.story.2": {
    source: LEARNING_PLACEHOLDER_SOUND,
    isPlaceholder: true,
  },
  "lg.stage1.story.3": {
    source: LEARNING_PLACEHOLDER_SOUND,
    isPlaceholder: true,
  },
  "lg.stage2.maama": {
    source: LEARNING_PLACEHOLDER_SOUND,
    isPlaceholder: true,
  },
  "lg.stage2.taata": {
    source: LEARNING_PLACEHOLDER_SOUND,
    isPlaceholder: true,
  },
  "lg.stage2.omwana": {
    source: LEARNING_PLACEHOLDER_SOUND,
    isPlaceholder: true,
  },
  "lg.stage2.ennyumba": {
    source: LEARNING_PLACEHOLDER_SOUND,
    isPlaceholder: true,
  },
  "lg.stage2.amazzi": {
    source: LEARNING_PLACEHOLDER_SOUND,
    isPlaceholder: true,
  },
  "lg.stage2.ekitabo": {
    source: LEARNING_PLACEHOLDER_SOUND,
    isPlaceholder: true,
  },
  "lg.stage2.story.1": {
    source: LEARNING_PLACEHOLDER_SOUND,
    isPlaceholder: true,
  },
  "lg.stage2.story.2": {
    source: LEARNING_PLACEHOLDER_SOUND,
    isPlaceholder: true,
  },
  "lg.stage2.story.3": {
    source: LEARNING_PLACEHOLDER_SOUND,
    isPlaceholder: true,
  },
  "lg.stage2.story.4": {
    source: LEARNING_PLACEHOLDER_SOUND,
    isPlaceholder: true,
  },
  amazzi: { source: require("@/assets/audio/Amazzi.mp3") },
  bulungi: { source: require("@/assets/audio/Bulungi.mp3") },
  "oli-otya": { source: require("@/assets/audio/oli-otya.m4a") },
  omwana: { source: require("@/assets/audio/omwana.m4a") },
  webale: { source: require("@/assets/audio/webale.m4a") },
  // Register future reviewed recordings here only after a non-empty file is bundled.
} satisfies Record<string, LearningAudioAssetEntry>

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

const buildLearningAudioAssetMap = (): Record<string, LearningAudioAssetEntry> => {
  const entries: [string, LearningAudioAssetEntry][] = []

  const addEntry = (
    key: string,
    entry: LearningAudioAssetEntry,
  ) => {
    entries.push([key, entry])
  }

  const manifestEntries = Object.entries(LEARNING_AUDIO_ASSETS) as [
    string,
    LearningAudioAssetEntry,
  ][]

  for (const [key, entry] of manifestEntries) {
    addEntry(key, entry)

    if (!entry.isPlaceholder) {
      addEntry(`audio/${key}.mp3`, entry)
      addEntry(`audio/${key}.m4a`, entry)
      addEntry(`assets/audio/${key}.mp3`, entry)
      addEntry(`assets/audio/${key}.m4a`, entry)
    }
  }

  addEntry("amazzi.mp3", LEARNING_AUDIO_ASSETS.amazzi)
  addEntry("assets/audio/amazzi.mp3", LEARNING_AUDIO_ASSETS.amazzi)
  addEntry("bulungi.mp3", LEARNING_AUDIO_ASSETS.bulungi)
  addEntry("assets/audio/bulungi.mp3", LEARNING_AUDIO_ASSETS.bulungi)
  addEntry("bulungi.m4a", LEARNING_AUDIO_ASSETS.bulungi)
  addEntry("assets/audio/bulungi.m4a", LEARNING_AUDIO_ASSETS.bulungi)
  addEntry("oli-otya.m4a", LEARNING_AUDIO_ASSETS["oli-otya"])
  addEntry("assets/audio/oli-otya.m4a", LEARNING_AUDIO_ASSETS["oli-otya"])
  addEntry("omwana.m4a", LEARNING_AUDIO_ASSETS.omwana)
  addEntry("assets/audio/omwana.m4a", LEARNING_AUDIO_ASSETS.omwana)
  addEntry("webale.m4a", LEARNING_AUDIO_ASSETS.webale)
  addEntry("assets/audio/webale.m4a", LEARNING_AUDIO_ASSETS.webale)

  return Object.fromEntries(entries)
}

const LEARNING_AUDIO_ASSET_LOOKUP = buildLearningAudioAssetMap()

export const isValidLearningAudioAsset = (audioAsset: unknown): boolean => {
  const normalizedAsset = normalizeAudioAssetKey(audioAsset)
  return Boolean(normalizedAsset && LEARNING_AUDIO_ASSET_LOOKUP[normalizedAsset])
}

export const resolveLearningAudioSource = (
  audioAsset: unknown,
  audioKey?: unknown,
): LearningAudioResolution => {
  const normalizedAsset = normalizeAudioAssetKey(audioAsset)
  const normalizedAudioKey = normalizeAudioAssetKey(audioKey)
  const assetEntry = normalizedAsset ? LEARNING_AUDIO_ASSET_LOOKUP[normalizedAsset] : undefined
  const audioKeyEntry = normalizedAudioKey ? LEARNING_AUDIO_ASSET_LOOKUP[normalizedAudioKey] : undefined

  if (assetEntry && !assetEntry.isPlaceholder) {
    return { source: assetEntry.source, isPlaceholder: false }
  }

  if (audioKeyEntry && !audioKeyEntry.isPlaceholder) {
    return { source: audioKeyEntry.source, isPlaceholder: false }
  }

  if (assetEntry) {
    return {
      source: assetEntry.source,
      isPlaceholder: Boolean(assetEntry.isPlaceholder),
    }
  }

  if (audioKeyEntry) {
    return {
      source: audioKeyEntry.source,
      isPlaceholder: Boolean(audioKeyEntry.isPlaceholder),
    }
  }

  return { source: LEARNING_PLACEHOLDER_SOUND, isPlaceholder: true }
}
