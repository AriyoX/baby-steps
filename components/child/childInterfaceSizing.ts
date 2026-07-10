const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value))

export const CHILD_INTERFACE_CARD_IMAGE_RATIO = 0.6
export const CHILD_INTERFACE_CARD_TEXT_RATIO = 0.4

export type ChildInterfaceCardLayout = {
  cardGap: number
  cardHeight: number
  cardWidth: number
  imageHeight: number
  textHeight: number
}

export const getChildInterfaceCardLayout = (
  windowWidth: number,
  windowHeight: number,
): ChildInterfaceCardLayout => {
  const cardWidth = clamp(windowWidth * 0.32, 220, 250)
  const cardHeight = clamp(windowHeight * 0.48, 166, 210)

  return {
    cardGap: 16,
    cardHeight,
    cardWidth,
    imageHeight: cardHeight * CHILD_INTERFACE_CARD_IMAGE_RATIO,
    textHeight: cardHeight * CHILD_INTERFACE_CARD_TEXT_RATIO,
  }
}
