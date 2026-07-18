import {
  getColoringStudioTutorialStorageKey,
} from "@/lib/coloringStudioTutorial"

describe("legacy coloring studio tutorial key", () => {
  it("uses a safe guest key when no child is active", () => {
    expect(getColoringStudioTutorialStorageKey()).toBe(
      "@baby_steps_coloring_studio_tutorial_v2:guest",
    )
  })

  it("encodes child IDs before using them in storage keys", () => {
    expect(getColoringStudioTutorialStorageKey("child/profile 1")).toBe(
      "@baby_steps_coloring_studio_tutorial_v2:child%2Fprofile%201",
    )
  })
})
