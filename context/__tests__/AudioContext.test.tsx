import React from "react"
import renderer, { act } from "react-test-renderer"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { AUDIO_SETTINGS_STORAGE_KEY, DEFAULT_AUDIO_SETTINGS } from "@/lib/audioSettings"

const mockUpdateSettings = jest.fn().mockResolvedValue(undefined)
const mockSetAppIsActive = jest.fn().mockResolvedValue(undefined)
const mockStartBackgroundMusic = jest.fn().mockResolvedValue(undefined)
const mockUnloadBackgroundMusic = jest.fn().mockResolvedValue(undefined)
const mockStopAppSpeech = jest.fn()
const mockPlayAppSound = jest.fn()
const mockCreateAppSound = jest.fn()
const mockReplayAppSound = jest.fn()
const mockUnloadAppSound = jest.fn()
const mockGetSettingsSnapshot = jest.fn(() => DEFAULT_AUDIO_SETTINGS)

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
)

jest.mock("@/lib/audioAssets", () => ({
  BACKGROUND_TRACKS: [{ id: "default", title: "Default", source: "background-source" }],
  BACKGROUND_TRACK_IDS: ["default"],
}))

jest.mock("@/lib/audioManager", () => ({
  audioManager: {
    updateSettings: (...args: unknown[]) => mockUpdateSettings(...args),
    setAppIsActive: (...args: unknown[]) => mockSetAppIsActive(...args),
    startBackgroundMusic: (...args: unknown[]) => mockStartBackgroundMusic(...args),
    unloadBackgroundMusic: (...args: unknown[]) => mockUnloadBackgroundMusic(...args),
    stopAppSpeech: (...args: unknown[]) => mockStopAppSpeech(...args),
    getSettingsSnapshot: () => mockGetSettingsSnapshot(),
    playAppSound: (...args: unknown[]) => mockPlayAppSound(...args),
    createAppSound: (...args: unknown[]) => mockCreateAppSound(...args),
    replayAppSound: (...args: unknown[]) => mockReplayAppSound(...args),
    unloadAppSound: (...args: unknown[]) => mockUnloadAppSound(...args),
  },
}))

const { AudioProvider, useAudio }: typeof import("../AudioContext") = require("../AudioContext")

type AudioApi = ReturnType<typeof useAudio>

const flushAudioEffects = async () => {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
  })
}

describe("AudioProvider", () => {
  let parentAudio: AudioApi | undefined
  let childAudio: AudioApi | undefined
  let tree: renderer.ReactTestRenderer | undefined

  const ParentProbe = () => {
    parentAudio = useAudio()
    return null
  }

  const ChildProbe = () => {
    childAudio = useAudio()
    return null
  }

  const renderProvider = async () => {
    await act(async () => {
      tree = renderer.create(
        <AudioProvider>
          <ParentProbe />
          <ChildProbe />
        </AudioProvider>,
      )
    })

    await flushAudioEffects()
  }

  beforeEach(async () => {
    jest.clearAllMocks()
    await AsyncStorage.clear()
    parentAudio = undefined
    childAudio = undefined
    tree = undefined
    mockGetSettingsSnapshot.mockReturnValue(DEFAULT_AUDIO_SETTINGS)
  })

  afterEach(() => {
    act(() => {
      tree?.unmount()
    })
  })

  it("loads persisted audio settings for every consumer", async () => {
    await AsyncStorage.setItem(
      AUDIO_SETTINGS_STORAGE_KEY,
      JSON.stringify({
        backgroundMusicMuted: true,
        backgroundMusicVolume: 65,
        appSoundsMuted: true,
        appSoundsVolume: 25,
        selectedBackgroundTrackId: "default",
      }),
    )

    await renderProvider()

    expect(parentAudio?.isSettingsLoaded).toBe(true)
    expect(parentAudio?.settings).toEqual({
      ...DEFAULT_AUDIO_SETTINGS,
      backgroundMusicMuted: true,
      backgroundMusicVolume: 0.65,
      appSoundsMuted: true,
      appSoundsVolume: 0.25,
    })
    expect(childAudio?.settings).toEqual(parentAudio?.settings)
  })

  it("shares Settings changes and child quick-control changes through one source of truth", async () => {
    await renderProvider()

    await act(async () => {
      parentAudio?.setAppSoundsMuted(true)
    })
    await flushAudioEffects()

    expect(childAudio?.settings.appSoundsMuted).toBe(true)
    expect(childAudio?.settings.backgroundMusicMuted).toBe(false)

    await act(async () => {
      childAudio?.toggleBackgroundMusicMuted()
    })
    await flushAudioEffects()

    expect(parentAudio?.settings.backgroundMusicMuted).toBe(true)
    expect(parentAudio?.settings.appSoundsMuted).toBe(true)

    const savedSettings = JSON.parse((await AsyncStorage.getItem(AUDIO_SETTINGS_STORAGE_KEY)) ?? "{}")
    expect(savedSettings).toEqual({
      ...DEFAULT_AUDIO_SETTINGS,
      backgroundMusicMuted: true,
      appSoundsMuted: true,
    })
  })
})
