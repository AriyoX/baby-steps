const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value))

const roundToTenth = (value: number) => Math.floor(value * 10) / 10

export type WordGameSizing = {
  answerLetterFontSize: number
  answerLetterLineHeight: number
  answerSlotHeight: number
  answerSlotMargin: number
  answerSlotWidth: number
  choiceButtonMargin: number
  choiceButtonSize: number
  choiceLetterFontSize: number
  choiceLetterLineHeight: number
  titleFontSize: number
  titleLineHeight: number
}

export const getWordGameSizing = (
  windowWidth: number,
  windowHeight: number,
): WordGameSizing => {
  const shortSide = Math.min(windowWidth, windowHeight)
  const titleFontSize = clamp(shortSide * 0.058, 20, 26)
  const choiceButtonSize = clamp(shortSide * 0.155, 54, 64)
  const choiceLetterFontSize = clamp(choiceButtonSize * 0.47, 26, 30)
  const answerSlotWidth = clamp(shortSide * 0.135, 46, 56)
  const answerSlotHeight = clamp(shortSide * 0.145, 50, 60)
  const answerLetterFontSize = clamp(answerSlotWidth * 0.58, 26, 32)

  return {
    answerLetterFontSize,
    answerLetterLineHeight: Math.min(answerSlotHeight - 4, answerLetterFontSize * 1.16),
    answerSlotHeight,
    answerSlotMargin: clamp(shortSide * 0.008, 2.5, 4),
    answerSlotWidth,
    choiceButtonMargin: clamp(shortSide * 0.009, 3, 4),
    choiceButtonSize,
    choiceLetterFontSize,
    choiceLetterLineHeight: Math.min(choiceButtonSize - 4, choiceLetterFontSize * 1.15),
    titleFontSize,
    titleLineHeight: titleFontSize * 1.2,
  }
}

export type CardsMatchingGridSizing = {
  cardHeight: number
  cardWidth: number
  columnGap: number
  gridHeight: number
  gridWidth: number
  numColumns: number
  rowCount: number
  rowGap: number
}

export const getCardsMatchingGridSizing = (
  availableWidth: number,
  availableHeight: number,
  cardCount: number,
): CardsMatchingGridSizing => {
  const isLandscape = availableWidth > availableHeight
  const numColumns = isLandscape ? 8 : 4
  const rowCount = Math.max(1, Math.ceil(cardCount / numColumns))
  const columnGap = isLandscape ? 4 : 6
  const rowGap = isLandscape ? 6 : 8
  const cardAspectRatio = isLandscape ? 1.2 : 1.08
  const widthForCards = Math.max(0, availableWidth - columnGap * (numColumns - 1))
  const heightForCards = Math.max(0, availableHeight - rowGap * (rowCount - 1))
  const maxCardWidth = widthForCards / numColumns
  const maxCardWidthFromHeight = heightForCards / rowCount / cardAspectRatio
  const cardWidth = roundToTenth(Math.max(0, Math.min(maxCardWidth, maxCardWidthFromHeight)))
  const cardHeight = roundToTenth(cardWidth * cardAspectRatio)

  return {
    cardHeight,
    cardWidth,
    columnGap,
    gridHeight: cardHeight * rowCount + rowGap * (rowCount - 1),
    gridWidth: cardWidth * numColumns + columnGap * (numColumns - 1),
    numColumns,
    rowCount,
    rowGap,
  }
}
