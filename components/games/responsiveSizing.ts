import { getResponsiveViewport } from "@/lib/responsiveLayout"

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
  contentPadding: number
  gameAreaWidth: number
  hintButtonSize: number
  imageHeight: number
  isSplit: boolean
  isTablet: boolean
  layoutGap: number
  panelPadding: number
  sideVisualSize: number
  titleFontSize: number
  titleLineHeight: number
}

export const getWordGameSizing = (
  windowWidth: number,
  windowHeight: number,
  panelBounds?: { width: number; height: number },
): WordGameSizing => {
  const shortSide = Math.min(windowWidth, windowHeight)
  const { isTablet, isShort } = getResponsiveViewport(windowWidth, windowHeight)
  const titleFontSize = isTablet
    ? clamp(shortSide * 0.045, 27, 34)
    : clamp(shortSide * 0.058, 20, 26)
  const choiceButtonSize = isTablet
    ? clamp(shortSide * 0.115, 72, 88)
    : clamp(shortSide * 0.155, 54, 64)
  const choiceLetterFontSize = isTablet
    ? clamp(choiceButtonSize * 0.46, 33, 40)
    : clamp(choiceButtonSize * 0.47, 26, 30)
  const answerSlotWidth = isTablet
    ? clamp(shortSide * 0.095, 60, 74)
    : clamp(shortSide * 0.135, 46, 56)
  const answerSlotHeight = isTablet
    ? clamp(shortSide * 0.105, 66, 80)
    : clamp(shortSide * 0.145, 50, 60)
  const answerLetterFontSize = isTablet
    ? clamp(answerSlotWidth * 0.58, 34, 42)
    : clamp(answerSlotWidth * 0.58, 26, 32)
  const contentPadding = isTablet ? 24 : 16
  const panelPadding = isShort ? 12 : isTablet ? 24 : 16
  const layoutGap = isShort ? 16 : 24
  const panelWidth = Math.min(1280,
    panelBounds && panelBounds.width > 0 ? panelBounds.width : windowWidth - contentPadding * 2,
  )
  const innerWidth = Math.max(0, panelWidth - panelPadding * 2)
  const isSplit = windowWidth > windowHeight && innerWidth >= 540
  const sideVisualSize = Math.floor(isSplit
    ? Math.min(380, (innerWidth - layoutGap) * 0.34)
    : innerWidth,
  )
  const availableHeight = panelBounds && panelBounds.height > 0
    ? panelBounds.height - panelPadding * 2
    : windowHeight - 170
  const imageHeight = Math.floor(clamp(
    Math.min(sideVisualSize * 0.82, availableHeight * (isSplit ? 1 : 0.42)),
    isShort ? 112 : 180,
    isTablet ? 380 : 260,
  ))

  return {
    answerLetterFontSize,
    answerLetterLineHeight: Math.min(answerSlotHeight - 4, answerLetterFontSize * 1.16),
    answerSlotHeight,
    answerSlotMargin: isTablet
      ? clamp(shortSide * 0.008, 4, 6)
      : clamp(shortSide * 0.008, 2.5, 4),
    answerSlotWidth,
    choiceButtonMargin: isTablet
      ? clamp(shortSide * 0.009, 5, 7)
      : clamp(shortSide * 0.009, 3, 4),
    choiceButtonSize,
    choiceLetterFontSize,
    choiceLetterLineHeight: Math.min(choiceButtonSize - 4, choiceLetterFontSize * 1.15),
    contentPadding,
    gameAreaWidth: isSplit ? innerWidth - sideVisualSize - layoutGap : innerWidth,
    hintButtonSize: isTablet ? clamp(shortSide * 0.1, 64, 76) : isShort ? 56 : 62,
    imageHeight,
    isSplit,
    isTablet,
    layoutGap,
    panelPadding,
    sideVisualSize,
    titleFontSize,
    titleLineHeight: titleFontSize * 1.2,
  }
}

export type GameHeaderSizing = {
  buttonSize: number
  headerMinHeight: number
  horizontalPadding: number
  iconSize: number
  isTablet: boolean
  statChipHeight: number
  statChipIconSize: number
  statChipMinWidth: number
  statChipTextSize: number
  subtitleFontSize: number
  titleFontSize: number
}

export const getGameHeaderSizing = (
  windowWidth: number,
  windowHeight: number,
): GameHeaderSizing => {
  const { isTablet } = getResponsiveViewport(windowWidth, windowHeight)

  return isTablet
    ? {
        buttonSize: 56,
        headerMinHeight: 76,
        horizontalPadding: 24,
        iconSize: 27,
        isTablet,
        statChipHeight: 50,
        statChipIconSize: 21,
        statChipMinWidth: 78,
        statChipTextSize: 17,
        subtitleFontSize: 15,
        titleFontSize: 24,
      }
    : {
        buttonSize: 48,
        headerMinHeight: 64,
        horizontalPadding: 16,
        iconSize: 23,
        isTablet,
        statChipHeight: 44,
        statChipIconSize: 18,
        statChipMinWidth: 68,
        statChipTextSize: 16,
        subtitleFontSize: 14,
        titleFontSize: 20,
      }
}

export type GameStageCarouselSizing = {
  cardBodyHeight: number
  cardGap: number
  cardHeight: number
  cardImageHeight: number
  cardWidth: number
  headerControlSize: number
  headerTitleFontSize: number
  isShort: boolean
  isTablet: boolean
  listEndPadding: number
  screenPadding: number
  stageTitleFontSize: number
  statusIconSize: number
}

export const getGameStageCarouselSizing = (
  windowWidth: number,
  windowHeight: number,
): GameStageCarouselSizing => {
  const landscapeWidth = Math.max(windowWidth, windowHeight)
  const landscapeHeight = Math.min(windowWidth, windowHeight)
  const { isShort, isTablet } = getResponsiveViewport(
    landscapeWidth,
    landscapeHeight,
  )
  const screenPadding = isShort ? 12 : isTablet ? 28 : 24
  const cardGap = isTablet
    ? clamp(landscapeWidth * 0.014, 14, 20)
    : 8
  const cardWidth = isTablet
    ? clamp(landscapeWidth * 0.285, 300, 384)
    : clamp(landscapeWidth * 0.32, 230, 270)
  const cardHeight = isTablet
    ? clamp(landscapeHeight * 0.55, 288, 360)
    : clamp(landscapeHeight * 0.54, 190, 232)
  const cardImageHeight = Math.round(cardHeight * (isTablet ? 0.56 : 0.54))

  return {
    cardBodyHeight: cardHeight - cardImageHeight,
    cardGap,
    cardHeight,
    cardImageHeight,
    cardWidth,
    headerControlSize: isTablet ? 56 : isShort ? 44 : 48,
    headerTitleFontSize: isTablet ? 32 : isShort ? 24 : 30,
    isShort,
    isTablet,
    listEndPadding: Math.max(
      screenPadding,
      landscapeWidth - cardWidth - screenPadding * 2,
    ),
    screenPadding,
    stageTitleFontSize: isTablet ? 22 : 18,
    statusIconSize: isTablet ? 24 : 20,
  }
}

export type LearningGameSizing = {
  isTablet: boolean
  learningControlSize: number
  learningImageHeight: number
  navigationButtonMinWidth: number
  quizAnswerColumns: number
  quizAnswerHeight: number
  quizAnswersFlex: number
  quizGap: number
  quizPromptFlex: number
}

export const getLearningGameSizing = (
  windowWidth: number,
  windowHeight: number,
  optionCount: number,
): LearningGameSizing => {
  const landscapeWidth = Math.max(windowWidth, windowHeight)
  const landscapeHeight = Math.min(windowWidth, windowHeight)
  const { isShort, isTablet } = getResponsiveViewport(
    landscapeWidth,
    landscapeHeight,
  )
  const quizAnswerColumns = Math.max(
    1,
    Math.min(
      optionCount,
      isTablet && landscapeWidth >= 1180 && landscapeHeight >= 600 ? 3 : 2,
    ),
  )

  return {
    isTablet,
    learningControlSize: isTablet ? 52 : 40,
    learningImageHeight: isTablet
      ? clamp(landscapeHeight * 0.5, 290, 390)
      : clamp(landscapeHeight * 0.5, 180, 260),
    navigationButtonMinWidth: isTablet ? 142 : 116,
    quizAnswerColumns,
    quizAnswerHeight: isShort
      ? clamp((landscapeHeight - 176) / 2, 64, 92)
      : isTablet
        ? clamp(landscapeHeight * 0.22, 122, 158)
        : clamp(landscapeHeight * 0.2, 84, 112),
    quizAnswersFlex: isTablet ? 1.28 : 1.2,
    quizGap: isShort ? 8 : isTablet ? 16 : 10,
    quizPromptFlex: isTablet ? 0.72 : 0.8,
  }
}

export type CountingGameSizing = {
  answerButtonSize: number
  answerNumberFontSize: number
  canvasHeight: number
  isTablet: boolean
  itemSize: number
  questionFontSize: number
}

export const getCountingGameSizing = (
  windowWidth: number,
  windowHeight: number,
): CountingGameSizing => {
  const landscapeWidth = Math.max(windowWidth, windowHeight)
  const landscapeHeight = Math.min(windowWidth, windowHeight)
  const { isTablet } = getResponsiveViewport(landscapeWidth, landscapeHeight)

  return {
    answerButtonSize: isTablet
      ? clamp(landscapeHeight * 0.12, 72, 88)
      : 64,
    answerNumberFontSize: isTablet ? 32 : 24,
    canvasHeight: isTablet
      ? clamp(landscapeHeight * 0.56, 300, 430)
      : clamp(landscapeHeight * 0.48, 180, 224),
    isTablet,
    itemSize: isTablet ? clamp(landscapeHeight * 0.105, 68, 80) : 64,
    questionFontSize: isTablet ? 24 : 20,
  }
}

export type PuzzleGameSizing = {
  containerSize: number
  instructionMaxWidth: number | undefined
  isTablet: boolean
}

export const getPuzzleGameSizing = (
  windowWidth: number,
  windowHeight: number,
  verticalInsets = 0,
): PuzzleGameSizing => {
  const landscapeWidth = Math.max(windowWidth, windowHeight)
  const viewportHeight = Math.min(windowWidth, windowHeight)
  const landscapeHeight = Math.max(
    0,
    viewportHeight - verticalInsets,
  )
  const { isTablet } = getResponsiveViewport(landscapeWidth, viewportHeight)
  const containerSize = isTablet
    ? clamp(
        Math.min(landscapeHeight - 70, landscapeWidth * 0.44),
        320,
        500,
      )
    : clamp(
        Math.min(landscapeHeight - 70, landscapeWidth * 0.42),
        196,
        300,
      )

  return {
    containerSize,
    instructionMaxWidth: isTablet ? 420 : undefined,
    isTablet,
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
