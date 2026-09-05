import { getStoryReaderSizing } from "@/components/stories/storyReaderSizing"

describe("story reader responsive sizing", () => {
  it("preserves the compact landscape phone reader", () => {
    expect(getStoryReaderSizing(844, 390)).toMatchObject({
      headerButtonSize: 44,
      isCompact: true,
      isTablet: false,
      readerStageWidth: 800,
    })
  })

  it.each([
    [1024, 600, 976],
    [1366, 768, 1100],
  ])("uses a wider centered tablet stage at %sx%s", (width, height, stageWidth) => {
    const sizing = getStoryReaderSizing(width, height)

    expect(sizing.isTablet).toBe(true)
    expect(sizing.readerStageWidth).toBe(stageWidth)
    expect(sizing.readerStageOffsetX).toBe(0)
    expect(sizing.headerButtonSize).toBeGreaterThan(48)
    expect(sizing.readerStageWidth).toBeLessThan(width)
  })

  it("keeps a bounded single-column reader on portrait phones", () => {
    const sizing = getStoryReaderSizing(390, 844, false)

    expect(sizing.readerStageWidth).toBe(358)
    expect(sizing.readerStageOffsetX).toBe(0)
  })
})
