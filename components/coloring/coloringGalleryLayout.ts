import { getResponsiveViewport } from "@/lib/responsiveLayout"

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value))

export type ColoringGalleryLayout = {
  cardGap: number
  clubPanelWidth: number
  headerControlSize: number
  isCompact: boolean
  isTablet: boolean
  pictureCardMaxHeight: number
  pictureCardWidth: number
}

export const getColoringGalleryLayout = (
  width: number,
  height: number,
): ColoringGalleryLayout => {
  const { isTablet } = getResponsiveViewport(width, height)
  const isCompact = width < 820 || height < 430
  const pictureCardMaxHeight = isTablet
    ? clamp(height - 260, 350, 460)
    : 350

  return {
    cardGap: isTablet ? clamp(width * 0.014, 14, 20) : 12,
    clubPanelWidth: isTablet ? clamp(width * 0.22, 260, 300) : isCompact ? 204 : 248,
    headerControlSize: isTablet ? 48 : 42,
    isCompact,
    isTablet,
    pictureCardMaxHeight,
    pictureCardWidth: isTablet
      ? clamp(pictureCardMaxHeight * 0.61, 230, 282)
      : isCompact
        ? 178
        : 214,
  }
}
