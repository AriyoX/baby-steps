import {
  PARENT_CHILD_PROFILE_TOUR_STEPS,
  PARENT_SCREEN_TOUR_POSITIONING,
  PARENT_SETTINGS_TOUR_STEPS,
} from "@/lib/parentScreenTours"

describe("parent screen tours", () => {
  it("uses the portrait parent-screen coordinate system", () => {
    expect(PARENT_SCREEN_TOUR_POSITIONING).toEqual({
      androidSpotlightOffsetY: 0,
      includeAndroidStatusBarOffset: true,
      orientation: "portrait",
    })
  })

  it("guides the main Settings groups in plain language", () => {
    expect(PARENT_SETTINGS_TOUR_STEPS.map((step) => step.targetId)).toEqual([
      "parent-settings-family",
      "parent-settings-preferences",
      "parent-settings-support",
    ])
    expect(PARENT_SETTINGS_TOUR_STEPS.map((step) => step.title)).toEqual([
      "Your family",
      "Sounds and reminders",
      "Safety and help",
    ])
  })

  it("guides parents through a child's summary, streak, and achievements", () => {
    expect(PARENT_CHILD_PROFILE_TOUR_STEPS.map((step) => step.targetId)).toEqual([
      "parent-child-profile-summary",
      "parent-child-profile-streak",
      "parent-child-profile-achievements",
    ])
    expect(
      PARENT_CHILD_PROFILE_TOUR_STEPS.every(
        (step) => step.title.length > 0 && step.description.length > 0,
      ),
    ).toBe(true)
  })
})
