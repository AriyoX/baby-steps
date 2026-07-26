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

  it("registers every stable initial-curriculum audio key as a placeholder", () => {
    const initialCurriculumKeys = [
      "lg-s1-oli-otya",
      "lg-s1-gyendi",
      "lg-s1-wasuze-otya-nno",
      "lg-s1-osiibye-otya-nno",
      "lg-s1-weebale",
      "lg-s1-nsonyiwa",
      "lg-s1-weeraba",
      "lg-s1-nze-amina",
      "lg-s1-ggwe-ani",
      "lg-s1-story-p01",
      "lg-s1-story-p02",
      "lg-s1-story-p03",
      "lg-s1-story-p04",
      "lg-s2-omutwe",
      "lg-s2-amaaso",
      "lg-s2-amatu",
      "lg-s2-ennyindo",
      "lg-s2-akamwa",
      "lg-s2-omukono",
      "lg-s2-okugulu",
      "lg-s2-ekigere",
      "lg-s2-ndi-musanyufu",
      "lg-s2-ndi-munakuwavu",
      "lg-s2-nkooye",
      "lg-s2-ntya",
      "lg-s2-story-p01",
      "lg-s2-story-p02",
      "lg-s2-story-p03",
      "lg-s2-story-p04",
    ]

    for (const audioKey of initialCurriculumKeys) {
      expect(isValidLearningAudioAsset(audioKey)).toBe(true)
      expect(resolveLearningAudioSource(undefined, audioKey)).toEqual({
        source: LEARNING_PLACEHOLDER_SOUND,
        isPlaceholder: true,
      })
    }
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
