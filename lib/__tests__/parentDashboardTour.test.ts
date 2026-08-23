import {
  PARENT_DASHBOARD_TARGET_ADJUSTMENTS,
  PARENT_DASHBOARD_TOUR_POSITIONING,
  PARENT_DASHBOARD_TOUR_STEPS,
} from "@/lib/parentDashboardTour"

describe("Parent Dashboard tour", () => {
  it("guides parents through profiles, progress, languages, and settings", () => {
    expect(PARENT_DASHBOARD_TOUR_STEPS.map((step) => step.targetId)).toEqual([
      "parent-dashboard-profiles",
      "parent-dashboard-progress",
      "parent-dashboard-language",
      "parent-dashboard-settings",
    ])
    expect(
      PARENT_DASHBOARD_TOUR_STEPS.every(
        (step) => step.title.length > 0 && step.description.length > 0,
      ),
    ).toBe(true)
  })

  it("uses portrait positioning while retaining per-target tuning controls", () => {
    expect(PARENT_DASHBOARD_TOUR_POSITIONING).toEqual({
      androidSpotlightOffsetY: 0,
      includeAndroidStatusBarOffset: true,
      orientation: "portrait",
    })
    expect(Object.keys(PARENT_DASHBOARD_TARGET_ADJUSTMENTS)).toEqual([
      "profiles",
      "progress",
      "language",
      "settings",
    ])
    expect(
      PARENT_DASHBOARD_TOUR_STEPS.map((step) => step.targetAdjustment),
    ).toEqual([
      PARENT_DASHBOARD_TARGET_ADJUSTMENTS.profiles,
      PARENT_DASHBOARD_TARGET_ADJUSTMENTS.progress,
      PARENT_DASHBOARD_TARGET_ADJUSTMENTS.language,
      PARENT_DASHBOARD_TARGET_ADJUSTMENTS.settings,
    ])
  })
})
