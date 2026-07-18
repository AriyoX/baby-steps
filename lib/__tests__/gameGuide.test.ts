import AsyncStorage from "@react-native-async-storage/async-storage"

import {
  getGameGuideStorageKey,
  hasSeenGameGuide,
  markGameGuideSeen,
} from "@/lib/gameGuide"
import { getColoringStudioTutorialStorageKey } from "@/lib/coloringStudioTutorial"

describe("game guide storage", () => {
  beforeEach(async () => {
    await AsyncStorage.clear()
  })

  it("keeps guide state separate for each child and game", async () => {
    await markGameGuideSeen("word", "child-1")
    await markGameGuideSeen("stories", "child-1")

    expect(await hasSeenGameGuide("word", "child-1")).toBe(true)
    expect(await hasSeenGameGuide("stories", "child-1")).toBe(true)
    expect(await hasSeenGameGuide("learning-hub", "child-1")).toBe(false)
    expect(await hasSeenGameGuide("word", "child-2")).toBe(false)
    expect(await hasSeenGameGuide("counting", "child-1")).toBe(false)
  })

  it("uses a safe guest key when there is no active child", () => {
    expect(getGameGuideStorageKey("puzzle")).toBe(
      "@BabySteps:GameGuide:v1:guest:puzzle",
    )
  })

  it("builds stable keys for story and Learning Hub onboarding", () => {
    expect(getGameGuideStorageKey("stories", "child-1")).toBe(
      "@BabySteps:GameGuide:v1:child-1:stories",
    )
    expect(getGameGuideStorageKey("learning-hub", "child-1")).toBe(
      "@BabySteps:GameGuide:v1:child-1:learning-hub",
    )
  })

  it("preserves legacy Coloring Studio seen state without rewriting it", async () => {
    const legacyKey = getColoringStudioTutorialStorageKey("child-1")
    await AsyncStorage.setItem(legacyKey, "seen")

    expect(await hasSeenGameGuide("coloring-studio", "child-1")).toBe(true)
    expect(
      await AsyncStorage.getItem(
        getGameGuideStorageKey("coloring-studio", "child-1"),
      ),
    ).toBeNull()

    await markGameGuideSeen("coloring-studio", "child-1")
    expect(
      await AsyncStorage.getItem(
        getGameGuideStorageKey("coloring-studio", "child-1"),
      ),
    ).toBe("seen")
  })

  it("does not share Coloring Studio seen state between children", async () => {
    await AsyncStorage.setItem(
      getColoringStudioTutorialStorageKey("child-1"),
      "seen",
    )

    expect(await hasSeenGameGuide("coloring-studio", "child-2")).toBe(false)
  })
})
