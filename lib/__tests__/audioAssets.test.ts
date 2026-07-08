import {
  LEARNING_AUDIO_ASSETS,
  LEARNING_PLACEHOLDER_SOUND,
  isValidLearningAudioAsset,
  resolveLearningAudioSource,
} from "../audioAssets"

describe("learning audio assets", () => {
  it("resolves the placeholder cue to the bundled spoken fallback", () => {
    const resolution = resolveLearningAudioSource("placeholder_learning_cue")

    expect(isValidLearningAudioAsset("placeholder_learning_cue")).toBe(true)
    expect(resolution).toEqual({
      source: LEARNING_PLACEHOLDER_SOUND,
      isPlaceholder: true,
    })
  })

  it("resolves Bulungi mp3 aliases as bundled learning audio", () => {
    const resolution = resolveLearningAudioSource("assets/audio/Bulungi.mp3")

    expect(isValidLearningAudioAsset("Bulungi.mp3")).toBe(true)
    expect(isValidLearningAudioAsset("assets/audio/Bulungi.mp3")).toBe(true)
    expect(resolution).toEqual(
      expect.objectContaining({
        isPlaceholder: false,
      }),
    )
  })

  it("resolves known bundled learning audio assets", () => {
    const resolution = resolveLearningAudioSource("webale")

    expect(LEARNING_AUDIO_ASSETS.webale).toEqual(
      expect.objectContaining({
        source: expect.anything(),
      }),
    )
    expect(isValidLearningAudioAsset("webale")).toBe(true)
    expect(isValidLearningAudioAsset("assets/audio/Webale.m4a")).toBe(true)
    expect(resolution).toEqual(
      expect.objectContaining({
        isPlaceholder: false,
      }),
    )
  })

  it("resolves a mapped audio key even when no local asset is provided", () => {
    const resolution = resolveLearningAudioSource(undefined, "webale")

    expect(resolution).toEqual(
      expect.objectContaining({
        isPlaceholder: false,
      }),
    )
  })

  it("prefers a mapped audio key over the placeholder asset", () => {
    const resolution = resolveLearningAudioSource("placeholder_learning_cue", "webale")

    expect(resolution).toEqual(
      expect.objectContaining({
        isPlaceholder: false,
      }),
    )
  })

  it("falls back to the bundled placeholder for missing or unsupported audio", () => {
    expect(isValidLearningAudioAsset(undefined)).toBe(false)
    expect(isValidLearningAudioAsset("https://example.com/audio.mp3")).toBe(false)

    expect(resolveLearningAudioSource(undefined)).toEqual({
      source: LEARNING_PLACEHOLDER_SOUND,
      isPlaceholder: true,
    })
    expect(resolveLearningAudioSource("missing-audio")).toEqual({
      source: LEARNING_PLACEHOLDER_SOUND,
      isPlaceholder: true,
    })
    expect(resolveLearningAudioSource(undefined, "missing-audio-key")).toEqual({
      source: LEARNING_PLACEHOLDER_SOUND,
      isPlaceholder: true,
    })
  })
})
