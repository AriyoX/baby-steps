import {
  GAME_TOUR_LAYOUT,
  getModalCoordinateOffsetY,
} from "@/components/games/GameTour"

describe("shared game tour vertical alignment", () => {
  it("adds the Android status bar and shared tuning offset", () => {
    expect(
      getModalCoordinateOffsetY({
        platform: "android",
        safeAreaTop: 18,
        statusBarHeight: 24,
      }),
    ).toBe(24 + GAME_TOUR_LAYOUT.androidSpotlightOffsetY)
  })

  it("uses the safe-area top when Android has no status bar height", () => {
    expect(
      getModalCoordinateOffsetY({
        platform: "android",
        safeAreaTop: 18,
        statusBarHeight: undefined,
      }),
    ).toBe(18 + GAME_TOUR_LAYOUT.androidSpotlightOffsetY)
  })

  it("does not alter iOS coordinates", () => {
    expect(
      getModalCoordinateOffsetY({
        platform: "ios",
        safeAreaTop: 18,
        statusBarHeight: 24,
      }),
    ).toBe(0)
  })
})
