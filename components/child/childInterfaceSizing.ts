const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value))

export const CHILD_INTERFACE_CARD_IMAGE_RATIO = 0.6
export const CHILD_INTERFACE_CARD_TEXT_RATIO = 0.4

export type ChildInterfaceCardLayout = {
  cardGap: number
  cardHeight: number
  cardWidth: number
  imageHeight: number
  isTablet: boolean
  leadCardGap: number
  leadCardWidth: number
  textHeight: number
  uiScale: number
}

export const getChildInterfaceCardLayout = (
  windowWidth: number,
  windowHeight: number,
): ChildInterfaceCardLayout => {
  const isTablet = Math.min(windowWidth, windowHeight) >= 600
  const cardWidth = isTablet
    ? clamp(windowWidth * 0.255, 280, 340)
    : clamp(windowWidth * 0.32, 220, 250)
  const cardHeight = isTablet
    ? clamp(windowHeight * 0.43, 240, 320)
    : clamp(windowHeight * 0.48, 166, 210)
  const uiScale = isTablet
    ? clamp(Math.min(windowWidth, windowHeight) / 680, 1.12, 1.28)
    : 1

  return {
    cardGap: isTablet ? clamp(windowWidth * 0.018, 20, 28) : 16,
    cardHeight,
    cardWidth,
    imageHeight: cardHeight * CHILD_INTERFACE_CARD_IMAGE_RATIO,
    isTablet,
    leadCardGap: isTablet ? 22 : 14,
    leadCardWidth: isTablet ? clamp(cardWidth * 0.82, 240, 286) : 204,
    textHeight: cardHeight * CHILD_INTERFACE_CARD_TEXT_RATIO,
    uiScale,
  }
}

export type ChildNavigationLayout = {
  barHeight: number
  clearance: number
  edgeGap: number
  iconPillHeight: number
  iconPillWidth: number
  iconSize: number
  labelFontSize: number
  labelLineHeight: number
}

export const getChildNavigationLayout = (
  windowWidth: number,
  windowHeight: number,
): ChildNavigationLayout => {
  const isTablet = Math.min(windowWidth, windowHeight) >= 600

  return isTablet
    ? {
        barHeight: 68,
        clearance: 88,
        edgeGap: 18,
        iconPillHeight: 32,
        iconPillWidth: 46,
        iconSize: 26,
        labelFontSize: 12,
        labelLineHeight: 14,
      }
    : {
        barHeight: 58,
        clearance: 76,
        edgeGap: 10,
        iconPillHeight: 27,
        iconPillWidth: 38,
        iconSize: 22,
        labelFontSize: 10,
        labelLineHeight: 12,
      }
}

export type LearningPathCardLayout = {
  cardGap: number
  cardHeight: number
  cardWidth: number
  isTablet: boolean
}

export const getLearningPathCardLayout = (
  windowWidth: number,
  windowHeight: number,
): LearningPathCardLayout => {
  const isTablet = Math.min(windowWidth, windowHeight) >= 600

  return {
    cardGap: isTablet ? clamp(windowWidth * 0.02, 20, 28) : 16,
    cardHeight: isTablet
      ? clamp(windowHeight * 0.42, 236, 304)
      : clamp(windowHeight * 0.48, 166, 198),
    cardWidth: isTablet
      ? clamp(windowWidth * 0.26, 280, 336)
      : clamp(windowWidth * 0.3, 220, 250),
    isTablet,
  }
}
