import {
  areTourMeasurementsStable,
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

  it("allows a portrait tour to override only the Android tuning value", () => {
    expect(
      getModalCoordinateOffsetY({
        androidSpotlightOffsetY: 0,
        platform: "android",
        safeAreaTop: 18,
        statusBarHeight: 24,
      }),
    ).toBe(24)
    expect(
      getModalCoordinateOffsetY({
        androidSpotlightOffsetY: 30,
        platform: "ios",
        safeAreaTop: 18,
        statusBarHeight: 24,
      }),
    ).toBe(0)
  })

  it("accepts consecutive target measurements within the stability tolerance", () => {
    expect(
      areTourMeasurementsStable(
        { height: 40, width: 100, x: 20, y: 30 },
        { height: 40.5, width: 99.5, x: 20.5, y: 29.5 },
      ),
    ).toBe(true)
  })

  it("rejects transient horizontal or vertical target positions", () => {
    const settled = { height: 40, width: 100, x: 20, y: 30 }

    expect(
      areTourMeasurementsStable(settled, { ...settled, x: 24 }),
    ).toBe(false)
    expect(
      areTourMeasurementsStable(settled, { ...settled, y: 34 }),
    ).toBe(false)
  })
})
