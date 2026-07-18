import { PARENT_DASHBOARD_TOUR_STEPS } from "@/lib/parentDashboardTour"

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
})
