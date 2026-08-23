jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
)

import AsyncStorage from "@react-native-async-storage/async-storage"
import {
  AUDIO_SETTINGS_STORAGE_KEY,
  DEFAULT_AUDIO_SETTINGS,
  clampVolume,
  loadAudioSettings,
  normalizeAudioSettings,
  saveAudioSettings,
} from "../audioSettings"

beforeEach(async () => {
  jest.clearAllMocks()
  await AsyncStorage.clear()
})

describe("audio settings persistence", () => {
  it("returns safe defaults when no settings have been saved", async () => {
    await expect(loadAudioSettings(["default"])).resolves.toEqual(DEFAULT_AUDIO_SETTINGS)
  })

  it("normalizes malformed and partial settings", () => {
    expect(
      normalizeAudioSettings(
        {
          backgroundMusicMuted: "nope",
          backgroundMusicVolume: 140,
          appSoundsMuted: true,
          appSoundsVolume: -1,
          selectedBackgroundTrackId: "missing",
        },
        ["default", "calm"],
      ),
    ).toEqual({
      ...DEFAULT_AUDIO_SETTINGS,
      backgroundMusicVolume: 1,
      appSoundsMuted: true,
      appSoundsVolume: 0,
      selectedBackgroundTrackId: "default",
    })
  })

  it("normalizes legacy 0-100 volume values to the 0-1 audio engine range", async () => {
    await AsyncStorage.setItem(
      AUDIO_SETTINGS_STORAGE_KEY,
      JSON.stringify({
        backgroundMusicMuted: false,
        backgroundMusicVolume: 35,
        appSoundsMuted: false,
        appSoundsVolume: 80,
        selectedBackgroundTrackId: "default",
      }),
    )

    await expect(loadAudioSettings(["default"])).resolves.toEqual({
      ...DEFAULT_AUDIO_SETTINGS,
      backgroundMusicVolume: 0.35,
      appSoundsVolume: 0.8,
    })
  })

  it("saves and loads normalized settings", async () => {
    await saveAudioSettings(
      {
        backgroundMusicMuted: true,
        backgroundMusicVolume: 0.75,
        appSoundsMuted: true,
        appSoundsVolume: 80,
        selectedBackgroundTrackId: "calm",
      },
      ["default", "calm"],
    )

    await expect(loadAudioSettings(["default", "calm"])).resolves.toEqual({
      backgroundMusicMuted: true,
      backgroundMusicVolume: 0.75,
      appSoundsMuted: true,
      appSoundsVolume: 0.8,
      selectedBackgroundTrackId: "calm",
    })
  })

  it("falls back to defaults when saved JSON is invalid", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined)
    await AsyncStorage.setItem(AUDIO_SETTINGS_STORAGE_KEY, "{bad json")

    await expect(loadAudioSettings(["default"])).resolves.toEqual(DEFAULT_AUDIO_SETTINGS)
    expect(warnSpy).toHaveBeenCalled()
    warnSpy.mockRestore()
  })

  it("keeps engine volume values in the 0-1 range", () => {
    expect(clampVolume(-2, 0.5)).toBe(0)
    expect(clampVolume(0.25, 0.5)).toBe(0.25)
    expect(clampVolume(35, 0.5)).toBe(0.35)
    expect(clampVolume(100, 0.5)).toBe(1)
    expect(clampVolume(150, 0.5)).toBe(1)
    expect(clampVolume("loud", 0.5)).toBe(0.5)
  })
})
