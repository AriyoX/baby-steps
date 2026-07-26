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

const PLACEHOLDER_LEARNING_ENTRY = {
  source: LEARNING_PLACEHOLDER_SOUND,
  isPlaceholder: true,
} as const

export const LEARNING_AUDIO_ASSETS = {
  placeholder_learning_cue: PLACEHOLDER_LEARNING_ENTRY,

  // Initial Stage 1 curriculum keys. Keep these stable when replacing the cue
  // with reviewed native-speaker recordings.
  "lg-s1-oli-otya": PLACEHOLDER_LEARNING_ENTRY,
  "lg-s1-gyendi": PLACEHOLDER_LEARNING_ENTRY,
  "lg-s1-wasuze-otya-nno": PLACEHOLDER_LEARNING_ENTRY,
  "lg-s1-osiibye-otya-nno": PLACEHOLDER_LEARNING_ENTRY,
  "lg-s1-weebale": PLACEHOLDER_LEARNING_ENTRY,
  "lg-s1-nsonyiwa": PLACEHOLDER_LEARNING_ENTRY,
  "lg-s1-weeraba": PLACEHOLDER_LEARNING_ENTRY,
  "lg-s1-nze-amina": PLACEHOLDER_LEARNING_ENTRY,
  "lg-s1-ggwe-ani": PLACEHOLDER_LEARNING_ENTRY,
  "lg-s1-story-p01": PLACEHOLDER_LEARNING_ENTRY,
  "lg-s1-story-p02": PLACEHOLDER_LEARNING_ENTRY,
  "lg-s1-story-p03": PLACEHOLDER_LEARNING_ENTRY,
  "lg-s1-story-p04": PLACEHOLDER_LEARNING_ENTRY,

  // Initial Stage 2 curriculum keys.
  "lg-s2-omutwe": PLACEHOLDER_LEARNING_ENTRY,
  "lg-s2-amaaso": PLACEHOLDER_LEARNING_ENTRY,
  "lg-s2-amatu": PLACEHOLDER_LEARNING_ENTRY,
  "lg-s2-ennyindo": PLACEHOLDER_LEARNING_ENTRY,
  "lg-s2-akamwa": PLACEHOLDER_LEARNING_ENTRY,
  "lg-s2-omukono": PLACEHOLDER_LEARNING_ENTRY,
  "lg-s2-okugulu": PLACEHOLDER_LEARNING_ENTRY,
  "lg-s2-ekigere": PLACEHOLDER_LEARNING_ENTRY,
  "lg-s2-ndi-musanyufu": PLACEHOLDER_LEARNING_ENTRY,
  "lg-s2-ndi-munakuwavu": PLACEHOLDER_LEARNING_ENTRY,
  "lg-s2-nkooye": PLACEHOLDER_LEARNING_ENTRY,
  "lg-s2-ntya": PLACEHOLDER_LEARNING_ENTRY,
  "lg-s2-story-p01": PLACEHOLDER_LEARNING_ENTRY,
  "lg-s2-story-p02": PLACEHOLDER_LEARNING_ENTRY,
  "lg-s2-story-p03": PLACEHOLDER_LEARNING_ENTRY,
  "lg-s2-story-p04": PLACEHOLDER_LEARNING_ENTRY,

  // Compatibility aliases for older cached development bundles.
  "lg.stage1.oli_otya": PLACEHOLDER_LEARNING_ENTRY,
  "lg.stage1.gyendi": PLACEHOLDER_LEARNING_ENTRY,
  "lg.stage1.gyebale_ko": PLACEHOLDER_LEARNING_ENTRY,
  "lg.stage1.webale": PLACEHOLDER_LEARNING_ENTRY,
  "lg.stage1.story.1": PLACEHOLDER_LEARNING_ENTRY,
  "lg.stage1.story.2": PLACEHOLDER_LEARNING_ENTRY,
  "lg.stage1.story.3": PLACEHOLDER_LEARNING_ENTRY,
  "lg.stage2.maama": PLACEHOLDER_LEARNING_ENTRY,
  "lg.stage2.taata": PLACEHOLDER_LEARNING_ENTRY,
  "lg.stage2.omwana": PLACEHOLDER_LEARNING_ENTRY,
  "lg.stage2.ennyumba": PLACEHOLDER_LEARNING_ENTRY,
  "lg.stage2.amazzi": PLACEHOLDER_LEARNING_ENTRY,
  "lg.stage2.ekitabo": PLACEHOLDER_LEARNING_ENTRY,
  "lg.stage2.story.1": PLACEHOLDER_LEARNING_ENTRY,
  "lg.stage2.story.2": PLACEHOLDER_LEARNING_ENTRY,
  "lg.stage2.story.3": PLACEHOLDER_LEARNING_ENTRY,
  "lg.stage2.story.4": PLACEHOLDER_LEARNING_ENTRY,
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

export const isProductionReadyLearningAudioAsset = (
  audioAsset: unknown,
  audioKey?: unknown,
): boolean => {
  const normalizedAsset = normalizeAudioAssetKey(audioAsset)
  const normalizedAudioKey = normalizeAudioAssetKey(audioKey)
  const assetEntry = normalizedAsset
    ? LEARNING_AUDIO_ASSET_LOOKUP[normalizedAsset]
    : undefined
  const audioKeyEntry = normalizedAudioKey
    ? LEARNING_AUDIO_ASSET_LOOKUP[normalizedAudioKey]
    : undefined

  return Boolean(
    (assetEntry && !assetEntry.isPlaceholder) ||
      (audioKeyEntry && !audioKeyEntry.isPlaceholder),
  )
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
