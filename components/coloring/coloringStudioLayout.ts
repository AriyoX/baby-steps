export type ColoringStudioLayout = {
  isCompact: boolean
  isSmallPhone: boolean
  showCanvasHint: boolean
  showDockTitles: boolean
}

export const SMALL_PHONE_CONTROL_SIZE = {
  color: 30,
  colorHitSlop: 7,
  header: 44,
  size: 44,
  tool: 48,
} as const

export const getColoringStudioLayout = (
  width: number,
  height: number,
): ColoringStudioLayout => {
  const isCompact = width < 780 || height < 410
  const isSmallPhone = width < 720 || height < 370

  return {
    isCompact,
    isSmallPhone,
    showCanvasHint: !isSmallPhone,
    showDockTitles: !isSmallPhone,
  }
}
