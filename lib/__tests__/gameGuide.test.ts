import AsyncStorage from "@react-native-async-storage/async-storage"

import {
  getGameGuideStorageKey,
  hasSeenGameGuide,
  markGameGuideSeen,
} from "@/lib/gameGuide"

describe("game guide storage", () => {
  beforeEach(async () => {
    await AsyncStorage.clear()
  })

  it("keeps guide state separate for each child and game", async () => {
    await markGameGuideSeen("word", "child-1")

    expect(await hasSeenGameGuide("word", "child-1")).toBe(true)
    expect(await hasSeenGameGuide("word", "child-2")).toBe(false)
    expect(await hasSeenGameGuide("counting", "child-1")).toBe(false)
  })

  it("uses a safe guest key when there is no active child", () => {
    expect(getGameGuideStorageKey("puzzle")).toBe(
      "@BabySteps:GameGuide:v1:guest:puzzle",
    )
  })
})
