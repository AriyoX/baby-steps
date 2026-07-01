const mockSetAudioModeAsync = jest.fn()
const mockCreateAsync = jest.fn()
const mockSpeechStop = jest.fn()

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
)

jest.mock("expo-av", () => ({
  Audio: {
    setAudioModeAsync: (...args: unknown[]) => mockSetAudioModeAsync(...args),
    Sound: {
      createAsync: (...args: unknown[]) => mockCreateAsync(...args),
    },
  },
}))

jest.mock("expo-speech", () => ({
  speak: jest.fn(),
  stop: () => mockSpeechStop(),
}))

jest.mock("@/lib/audioAssets", () => ({
  BACKGROUND_TRACKS: [{ id: "default", title: "Default", source: "background-source" }],
}))

import { BabyStepsAudioManager } from "../audioManager"
import { DEFAULT_AUDIO_SETTINGS } from "../audioSettings"

const createMockSound = () => ({
  setOnPlaybackStatusUpdate: jest.fn(),
  setVolumeAsync: jest.fn().mockResolvedValue(undefined),
  replayAsync: jest.fn().mockResolvedValue(undefined),
  playAsync: jest.fn().mockResolvedValue(undefined),
  pauseAsync: jest.fn().mockResolvedValue(undefined),
  stopAsync: jest.fn().mockResolvedValue(undefined),
  unloadAsync: jest.fn().mockResolvedValue(undefined),
})

beforeEach(() => {
  jest.clearAllMocks()
  mockSetAudioModeAsync.mockResolvedValue(undefined)
})

describe("BabyStepsAudioManager", () => {
  it("does not create app sounds when app sounds are muted", async () => {
    const manager = new BabyStepsAudioManager([
      { id: "default", title: "Default", source: "background-source" as any },
    ])

    await manager.updateSettings({
      ...DEFAULT_AUDIO_SETTINGS,
      appSoundsMuted: true,
    })

    await expect(manager.playAppSound("tap-source" as any)).resolves.toBeNull()
    expect(mockCreateAsync).not.toHaveBeenCalled()
    expect(mockSpeechStop).toHaveBeenCalled()
  })

  it("updates background music volume and pauses when muted", async () => {
    const backgroundSound = createMockSound()
    mockCreateAsync.mockResolvedValueOnce({ sound: backgroundSound })
    const manager = new BabyStepsAudioManager([
      { id: "default", title: "Default", source: "background-source" as any },
    ])

    await manager.updateSettings({
      ...DEFAULT_AUDIO_SETTINGS,
      backgroundMusicVolume: 0.4,
    })
    await manager.startBackgroundMusic()

    expect(mockCreateAsync).toHaveBeenCalledWith(
      "background-source",
      expect.objectContaining({
        isLooping: true,
        shouldPlay: true,
        volume: 0.4,
      }),
    )

    await manager.updateSettings({
      ...DEFAULT_AUDIO_SETTINGS,
      backgroundMusicVolume: 0.8,
    })
    expect(backgroundSound.setVolumeAsync).toHaveBeenLastCalledWith(0.8)

    await manager.updateSettings({
      ...DEFAULT_AUDIO_SETTINGS,
      backgroundMusicMuted: true,
      backgroundMusicVolume: 0.8,
    })
    expect(backgroundSound.setVolumeAsync).toHaveBeenLastCalledWith(0)
    expect(backgroundSound.pauseAsync).toHaveBeenCalled()
  })

  it("applies app sound volume changes to managed app sounds", async () => {
    const appSound = createMockSound()
    mockCreateAsync.mockResolvedValueOnce({ sound: appSound })
    const manager = new BabyStepsAudioManager([
      { id: "default", title: "Default", source: "background-source" as any },
    ])

    await manager.createAppSound("effect-source" as any)
    await manager.updateSettings({
      ...DEFAULT_AUDIO_SETTINGS,
      appSoundsVolume: 0.25,
    })

    expect(appSound.setVolumeAsync).toHaveBeenLastCalledWith(0.25)

    await manager.updateSettings({
      ...DEFAULT_AUDIO_SETTINGS,
      appSoundsMuted: true,
      appSoundsVolume: 0.25,
    })

    expect(appSound.setVolumeAsync).toHaveBeenLastCalledWith(0)
  })

  it("muting app sounds does not mute background music", async () => {
    const backgroundSound = createMockSound()
    mockCreateAsync.mockResolvedValueOnce({ sound: backgroundSound })
    const manager = new BabyStepsAudioManager([
      { id: "default", title: "Default", source: "background-source" as any },
    ])

    await manager.startBackgroundMusic()
    jest.clearAllMocks()

    await manager.updateSettings({
      ...DEFAULT_AUDIO_SETTINGS,
      appSoundsMuted: true,
    })

    expect(mockSpeechStop).toHaveBeenCalled()
    expect(backgroundSound.setVolumeAsync).toHaveBeenLastCalledWith(DEFAULT_AUDIO_SETTINGS.backgroundMusicVolume)
    expect(backgroundSound.playAsync).toHaveBeenCalled()
    expect(backgroundSound.pauseAsync).not.toHaveBeenCalled()
  })

  it("muting background music does not mute app sounds", async () => {
    const backgroundSound = createMockSound()
    const appSound = createMockSound()
    mockCreateAsync.mockResolvedValueOnce({ sound: backgroundSound }).mockResolvedValueOnce({ sound: appSound })
    const manager = new BabyStepsAudioManager([
      { id: "default", title: "Default", source: "background-source" as any },
    ])

    await manager.startBackgroundMusic()
    await manager.createAppSound("effect-source" as any)
    jest.clearAllMocks()

    await manager.updateSettings({
      ...DEFAULT_AUDIO_SETTINGS,
      backgroundMusicMuted: true,
    })

    expect(backgroundSound.setVolumeAsync).toHaveBeenLastCalledWith(0)
    expect(backgroundSound.pauseAsync).toHaveBeenCalled()
    expect(appSound.setVolumeAsync).toHaveBeenLastCalledWith(DEFAULT_AUDIO_SETTINGS.appSoundsVolume)

    await expect(manager.replayAppSound(appSound as any)).resolves.toBe(true)
    expect(appSound.replayAsync).toHaveBeenCalled()
  })

  it("does not create duplicate background music when start is called concurrently", async () => {
    const backgroundSound = createMockSound()
    let resolveCreate: (value: { sound: ReturnType<typeof createMockSound> }) => void = () => undefined
    mockCreateAsync.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveCreate = resolve
        }),
    )
    const manager = new BabyStepsAudioManager([
      { id: "default", title: "Default", source: "background-source" as any },
    ])

    const firstStart = manager.startBackgroundMusic()
    const secondStart = manager.startBackgroundMusic()
    await Promise.resolve()

    resolveCreate({ sound: backgroundSound })
    await Promise.all([firstStart, secondStart])

    expect(mockCreateAsync).toHaveBeenCalledTimes(1)
  })
})
