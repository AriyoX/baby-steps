import {
  LEARNING_PLACEHOLDER_SOUND,
  isValidLearningAudioAsset,
  resolveLearningAudioSource,
} from "../audioAssets"

describe("learning audio assets", () => {
  it("resolves known bundled learning audio assets", () => {
    const resolution = resolveLearningAudioSource("webale")

    expect(isValidLearningAudioAsset("webale")).toBe(true)
    expect(isValidLearningAudioAsset("assets/audio/Webale.m4a")).toBe(true)
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
  })
})
