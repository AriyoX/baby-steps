import { getResponsiveViewport } from "@/lib/responsiveLayout"

export type StoryReaderSizing = {
  footerButtonSize: number
  footerIconSize: number
  headerButtonSize: number
  headerIconSize: number
  imagePanelPadding: number
  isCompact: boolean
  isTablet: boolean
  outerPadding: number
  readerStageOffsetX: number
  readerStageWidth: number
}

export const getStoryReaderSizing = (
  width: number,
  height: number,
  useSplitLayout = width >= 700,
): StoryReaderSizing => {
  const { isShort, isTablet } = getResponsiveViewport(width, height)
  const outerPadding = isShort ? 10 : isTablet ? 24 : 16
  const availableContentWidth = Math.max(0, width - outerPadding * 2)
  const readerStageWidth = useSplitLayout
    ? Math.min(
        availableContentWidth,
        isTablet ? 1100 : isShort ? 800 : 880,
      )
    : Math.min(availableContentWidth, 620)

  return {
    footerButtonSize: isShort ? 44 : isTablet ? 54 : 48,
    footerIconSize: isShort ? 22 : isTablet ? 27 : 24,
    headerButtonSize: isShort ? 44 : isTablet ? 54 : 48,
    headerIconSize: isShort ? 22 : isTablet ? 27 : 24,
    imagePanelPadding: isShort ? 8 : isTablet ? 16 : 12,
    isCompact: isShort,
    isTablet,
    outerPadding,
    readerStageOffsetX: useSplitLayout && !isTablet ? 14 : 0,
    readerStageWidth,
  }
}
