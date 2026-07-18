import {
  BRUSH_SIZES,
  clampCanvasOffset,
  getZoomAdjustedBrushSize,
  getZoomAdjustedEraserRadius,
  stepBrushSize,
  stepCanvasZoom,
  ZOOM_LEVELS,
} from "@/components/coloring/coloringStudioControls"

describe("coloring studio controls", () => {
  it("offers seven ordered brush sizes and stops at either end", () => {
    expect(BRUSH_SIZES).toEqual([6, 10, 14, 18, 24, 32, 42])
    expect(stepBrushSize(18, -1)).toBe(14)
    expect(stepBrushSize(18, 1)).toBe(24)
    expect(stepBrushSize(BRUSH_SIZES[0], -1)).toBe(BRUSH_SIZES[0])
    expect(stepBrushSize(BRUSH_SIZES.at(-1)!, 1)).toBe(BRUSH_SIZES.at(-1))
  })

  it("steps through child-friendly zoom levels", () => {
    expect(ZOOM_LEVELS).toEqual([1, 1.5, 2, 3])
    expect(stepCanvasZoom(1, 1)).toBe(1.5)
    expect(stepCanvasZoom(2, -1)).toBe(1.5)
    expect(stepCanvasZoom(3, 1)).toBe(3)
  })

  it("keeps tools visually small relative to magnified artwork", () => {
    expect(getZoomAdjustedBrushSize(18, 1)).toBe(18)
    expect(getZoomAdjustedBrushSize(18, 2)).toBe(9)
    expect(getZoomAdjustedBrushSize(18, 3)).toBe(6)
    expect(getZoomAdjustedEraserRadius(18, 3)).toBeCloseTo(7.4667, 3)
  })

  it("keeps a panned picture within the visible canvas bounds", () => {
    expect(clampCanvasOffset({ x: 500, y: -500 }, 2, { width: 300, height: 200 })).toEqual({
      x: 150,
      y: -100,
    })
    expect(clampCanvasOffset({ x: 80, y: -40 }, 1, { width: 300, height: 200 })).toEqual({
      x: 0,
      y: 0,
    })
  })
})
