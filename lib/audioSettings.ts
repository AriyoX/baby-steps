import AsyncStorage from "@react-native-async-storage/async-storage"

export type AudioSettings = {
  backgroundMusicMuted: boolean
  backgroundMusicVolume: number
  appSoundsMuted: boolean
  appSoundsVolume: number
  selectedBackgroundTrackId: string
}

export const AUDIO_SETTINGS_STORAGE_KEY = "@baby_steps/audio_settings/v1"
export const DEFAULT_BACKGROUND_TRACK_ID = "default"

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  backgroundMusicMuted: false,
  backgroundMusicVolume: 0.35,
  appSoundsMuted: false,
  appSoundsVolume: 1,
  selectedBackgroundTrackId: DEFAULT_BACKGROUND_TRACK_ID,
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

export const normalizeVolume = (value: unknown, fallback = 1): number => {
  const numericValue = typeof value === "number" && Number.isFinite(value) ? value : fallback

  if (numericValue <= 0) {
    return 0
  }

  if (numericValue <= 1) {
    return numericValue
  }

  if (numericValue <= 100) {
    return numericValue / 100
  }

  return 1
}

export const clampVolume = normalizeVolume

const normalizeTrackId = (value: unknown, validTrackIds: readonly string[]): string => {
  const fallbackTrackId = validTrackIds.includes(DEFAULT_BACKGROUND_TRACK_ID)
    ? DEFAULT_BACKGROUND_TRACK_ID
    : validTrackIds[0] ?? DEFAULT_BACKGROUND_TRACK_ID

  return typeof value === "string" && validTrackIds.includes(value) ? value : fallbackTrackId
}

export const normalizeAudioSettings = (
  value: unknown,
  validTrackIds: readonly string[] = [DEFAULT_BACKGROUND_TRACK_ID],
): AudioSettings => {
  if (!isRecord(value)) {
    return {
      ...DEFAULT_AUDIO_SETTINGS,
      selectedBackgroundTrackId: normalizeTrackId(
        DEFAULT_AUDIO_SETTINGS.selectedBackgroundTrackId,
        validTrackIds,
      ),
    }
  }

  return {
    backgroundMusicMuted:
      typeof value.backgroundMusicMuted === "boolean"
        ? value.backgroundMusicMuted
        : DEFAULT_AUDIO_SETTINGS.backgroundMusicMuted,
    backgroundMusicVolume: clampVolume(
      value.backgroundMusicVolume,
      DEFAULT_AUDIO_SETTINGS.backgroundMusicVolume,
    ),
    appSoundsMuted:
      typeof value.appSoundsMuted === "boolean"
        ? value.appSoundsMuted
        : DEFAULT_AUDIO_SETTINGS.appSoundsMuted,
    appSoundsVolume: clampVolume(value.appSoundsVolume, DEFAULT_AUDIO_SETTINGS.appSoundsVolume),
    selectedBackgroundTrackId: normalizeTrackId(value.selectedBackgroundTrackId, validTrackIds),
  }
}

export const loadAudioSettings = async (
  validTrackIds: readonly string[] = [DEFAULT_BACKGROUND_TRACK_ID],
): Promise<AudioSettings> => {
  try {
    const savedSettings = await AsyncStorage.getItem(AUDIO_SETTINGS_STORAGE_KEY)
    if (!savedSettings) {
      return normalizeAudioSettings(DEFAULT_AUDIO_SETTINGS, validTrackIds)
    }

    return normalizeAudioSettings(JSON.parse(savedSettings), validTrackIds)
  } catch (error) {
    console.warn("Could not load audio settings:", error)
    return normalizeAudioSettings(DEFAULT_AUDIO_SETTINGS, validTrackIds)
  }
}

export const saveAudioSettings = async (
  settings: AudioSettings,
  validTrackIds: readonly string[] = [DEFAULT_BACKGROUND_TRACK_ID],
): Promise<AudioSettings> => {
  const normalizedSettings = normalizeAudioSettings(settings, validTrackIds)
  await AsyncStorage.setItem(AUDIO_SETTINGS_STORAGE_KEY, JSON.stringify(normalizedSettings))
  return normalizedSettings
}
