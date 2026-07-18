import {
  getColoringStudioLayout,
  SMALL_PHONE_CONTROL_SIZE,
} from "@/components/coloring/coloringStudioLayout"

describe("coloring studio mobile layout", () => {
  it.each([
    [568, 320],
    [640, 360],
    [740, 360],
  ])("removes non-essential labels at %sx%s", (width, height) => {
    expect(getColoringStudioLayout(width, height)).toEqual({
      isCompact: true,
      isSmallPhone: true,
      showCanvasHint: false,
      showDockTitles: false,
    })
  })

  it("keeps the fuller labeled layout when a landscape phone has room", () => {
    expect(getColoringStudioLayout(844, 390)).toEqual({
      isCompact: true,
      isSmallPhone: false,
      showCanvasHint: true,
      showDockTitles: true,
    })
  })

  it("keeps the full layout on tablets", () => {
    expect(getColoringStudioLayout(1024, 768)).toEqual({
      isCompact: false,
      isSmallPhone: false,
      showCanvasHint: true,
      showDockTitles: true,
    })
  })

  it("keeps essential child controls at least 44 points including color hit slop", () => {
    expect(SMALL_PHONE_CONTROL_SIZE.header).toBeGreaterThanOrEqual(44)
    expect(SMALL_PHONE_CONTROL_SIZE.tool).toBeGreaterThanOrEqual(44)
    expect(SMALL_PHONE_CONTROL_SIZE.size).toBeGreaterThanOrEqual(44)
    expect(
      SMALL_PHONE_CONTROL_SIZE.color + SMALL_PHONE_CONTROL_SIZE.colorHitSlop * 2,
    ).toBeGreaterThanOrEqual(44)
  })
})
