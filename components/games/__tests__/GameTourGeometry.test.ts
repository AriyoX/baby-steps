import {
  areTourMeasurementsStable,
  GAME_TOUR_LAYOUT,
  getModalCoordinateOffsetY,
  getTourSpotlightPath,
  getTourTooltipSize,
  isTourTargetVisible,
  isTourOrientationReady,
} from "@/components/games/GameTour"

describe("shared game tour vertical alignment", () => {
  it("adds the Android status bar only when a parent screen opts in", () => {
    expect(
      getModalCoordinateOffsetY({
        includeAndroidStatusBarOffset: true,
        platform: "android",
        safeAreaTop: 18,
        statusBarHeight: 24,
      }),
    ).toBe(24 + GAME_TOUR_LAYOUT.androidSpotlightOffsetY)
  })

  it("uses the safe-area top when Android has no status bar height", () => {
    expect(
      getModalCoordinateOffsetY({
        includeAndroidStatusBarOffset: true,
        platform: "android",
        safeAreaTop: 18,
        statusBarHeight: undefined,
      }),
    ).toBe(18 + GAME_TOUR_LAYOUT.androidSpotlightOffsetY)
  })

  it("keeps fullscreen child targets in the same window coordinate system", () => {
    expect(
      getModalCoordinateOffsetY({
        platform: "android",
        safeAreaTop: 18,
        statusBarHeight: 24,
      }),
    ).toBe(GAME_TOUR_LAYOUT.androidSpotlightOffsetY)
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
        includeAndroidStatusBarOffset: true,
        platform: "android",
        safeAreaTop: 18,
        statusBarHeight: 24,
      }),
    ).toBe(24)
    expect(
      getModalCoordinateOffsetY({
        androidSpotlightOffsetY: 30,
        includeAndroidStatusBarOffset: true,
        platform: "ios",
        safeAreaTop: 18,
        statusBarHeight: 24,
      }),
    ).toBe(0)
  })

  it("allows parent portrait and child landscape tours explicitly", () => {
    expect(isTourOrientationReady("portrait", 390, 844)).toBe(true)
    expect(isTourOrientationReady("portrait", 844, 390)).toBe(false)
    expect(isTourOrientationReady("landscape", 844, 390)).toBe(true)
    expect(isTourOrientationReady("landscape", 390, 844)).toBe(false)
    expect(isTourOrientationReady("any", 390, 844)).toBe(true)
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

  it("accepts targets with a useful visible area", () => {
    expect(
      isTourTargetVisible(
        { height: 80, width: 120, x: 20, y: 30 },
        360,
        640,
      ),
    ).toBe(true)
    expect(
      isTourTargetVisible(
        { height: 80, width: 120, x: -108, y: 30 },
        360,
        640,
      ),
    ).toBe(true)
  })

  it("rejects off-screen targets and one-pixel edge slivers", () => {
    expect(
      isTourTargetVisible(
        { height: 80, width: 120, x: 20, y: 700 },
        360,
        640,
      ),
    ).toBe(false)
    expect(
      isTourTargetVisible(
        { height: 80, width: 120, x: 20, y: 639 },
        360,
        640,
      ),
    ).toBe(false)
  })

  it("builds one even-odd backdrop path with a rounded spotlight cutout", () => {
    const path = getTourSpotlightPath(
      { height: 60, width: 120, x: 20, y: 40 },
      360,
      640,
    )

    expect(path).toContain("M 0 0 H 360 V 640 H 0 Z")
    expect(path).toContain("M 36 40")
    expect(path).toContain("A 16 16")
    expect(path.endsWith("Z")).toBe(true)
  })

  it("gives the tooltip a usable size before native layout measurement arrives", () => {
    expect(
      getTourTooltipSize({
        availableHeight: 600,
        measuredSize: null,
        width: 340,
      }),
    ).toEqual({
      height: GAME_TOUR_LAYOUT.tooltipEstimatedHeight,
      width: 340,
    })
  })

  it("uses the measured tooltip size once it is available", () => {
    expect(
      getTourTooltipSize({
        availableHeight: 600,
        measuredSize: { height: 214, width: 340 },
        width: 340,
      }),
    ).toEqual({ height: 214, width: 340 })
  })
})
