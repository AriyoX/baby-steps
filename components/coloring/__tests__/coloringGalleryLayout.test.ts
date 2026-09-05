import { getColoringGalleryLayout } from "@/components/coloring/coloringGalleryLayout"

describe("coloring gallery responsive layout", () => {
  it("preserves compact phone cards", () => {
    expect(getColoringGalleryLayout(844, 390)).toMatchObject({
      clubPanelWidth: 204,
      isCompact: true,
      isTablet: false,
      pictureCardMaxHeight: 350,
      pictureCardWidth: 178,
    })
  })

  it.each([
    [1024, 600],
    [1366, 768],
  ])("grows the art shelf at %sx%s without stretching it edge to edge", (width, height) => {
    const layout = getColoringGalleryLayout(width, height)

    expect(layout.isTablet).toBe(true)
    expect(layout.clubPanelWidth).toBeGreaterThanOrEqual(260)
    expect(layout.pictureCardWidth).toBeGreaterThan(214)
    expect(layout.pictureCardWidth).toBeLessThanOrEqual(282)
    expect(layout.pictureCardMaxHeight).toBeLessThan(height - 180)
  })
})
