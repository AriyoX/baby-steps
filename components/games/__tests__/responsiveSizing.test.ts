import {
  getCardsMatchingGridSizing,
  getCountingGameSizing,
  getGameHeaderSizing,
  getGameStageCarouselSizing,
  getLearningGameSizing,
  getPuzzleGameSizing,
  getWordGameSizing,
} from "../responsiveSizing"

describe("Word Game responsive sizing", () => {
  it.each([
    ["small Android landscape", 640, 360],
    ["notched iPhone landscape", 844, 390],
  ])("keeps the title and letters readable on %s", (_name, width, height) => {
    const sizing = getWordGameSizing(width as number, height as number)

    expect(sizing.titleFontSize).toBeGreaterThanOrEqual(20)
    expect(sizing.choiceButtonSize).toBeGreaterThan(48)
    expect(sizing.choiceLetterFontSize).toBeGreaterThan(18)
    expect(sizing.answerLetterFontSize).toBeGreaterThan(24)
    expect(sizing.choiceLetterLineHeight).toBeLessThan(sizing.choiceButtonSize)
    expect(sizing.answerLetterLineHeight).toBeLessThan(sizing.answerSlotHeight)

    const twoChoiceRowsHeight =
      (sizing.choiceButtonSize + sizing.choiceButtonMargin * 2) * 2
    expect(twoChoiceRowsHeight).toBeLessThan(height as number * 0.45)
  })

  it("uses larger, bounded game objects on tablets", () => {
    const phone = getWordGameSizing(844, 390)
    const tablet = getWordGameSizing(1366, 768)

    expect(tablet.isTablet).toBe(true)
    expect(tablet.choiceButtonSize).toBeGreaterThan(phone.choiceButtonSize)
    expect(tablet.answerSlotWidth).toBeGreaterThan(phone.answerSlotWidth)
    expect(tablet.sideVisualSize).toBeGreaterThan(phone.sideVisualSize)
    expect(tablet.choiceButtonSize).toBeLessThanOrEqual(88)
    expect(tablet.sideVisualSize).toBeLessThanOrEqual(380)
  })

  it.each([
    [640, 360, 568, 184],
    [844, 390, 744, 208],
    [1024, 600, 960, 420],
    [1366, 768, 1280, 560],
    [768, 1024, 704, 820],
  ])("fits the measured word board at %i × %i", (width, height, panelWidth, panelHeight) => {
    const sizing = getWordGameSizing(width, height, {
      width: panelWidth,
      height: panelHeight,
    })
    const contentWidth = sizing.isSplit
      ? sizing.sideVisualSize + sizing.layoutGap + sizing.gameAreaWidth
      : Math.max(sizing.sideVisualSize, sizing.gameAreaWidth)

    expect(contentWidth + sizing.panelPadding * 2).toBeLessThanOrEqual(panelWidth)
    expect(sizing.gameAreaWidth).toBeGreaterThanOrEqual(240)
    expect(sizing.imageHeight).toBeGreaterThanOrEqual(112)
    expect(sizing.imageHeight).toBeLessThanOrEqual(380)
  })

  it("stacks the clue above the letters in portrait and narrow tablet panels", () => {
    const portrait = getWordGameSizing(768, 1024, { width: 704, height: 820 })
    const narrowPanel = getWordGameSizing(1024, 768, { width: 500, height: 550 })

    expect(portrait.isSplit).toBe(false)
    expect(portrait.sideVisualSize).toBe(portrait.gameAreaWidth)
    expect(portrait.imageHeight).toBeGreaterThanOrEqual(260)
    expect(narrowPanel.isSplit).toBe(false)
    expect(narrowPanel.gameAreaWidth + narrowPanel.panelPadding * 2).toBeLessThanOrEqual(500)
  })
})

describe("shared game viewport sizing", () => {
  it.each([
    ["small landscape phone", 640, 360, false],
    ["typical landscape phone", 844, 390, false],
    ["small tablet", 1024, 600, true],
    ["large tablet", 1366, 768, true],
  ])("classifies and bounds %s", (_name, width, height, isTablet) => {
    const stage = getGameStageCarouselSizing(width as number, height as number)
    const header = getGameHeaderSizing(width as number, height as number)
    const counting = getCountingGameSizing(width as number, height as number)
    const puzzle = getPuzzleGameSizing(width as number, height as number)

    expect(stage.isTablet).toBe(isTablet)
    expect(header.isTablet).toBe(isTablet)
    expect(counting.isTablet).toBe(isTablet)
    expect(puzzle.isTablet).toBe(isTablet)
    expect(stage.cardHeight).toBeLessThan(height as number * 0.65)
    expect(stage.cardWidth).toBeLessThan(width as number * 0.4)
    expect(counting.canvasHeight).toBeLessThan(height as number * 0.65)
    expect(puzzle.containerSize).toBeLessThan(height as number - 48)
  })

  it("uses the extra tablet area without turning cards into full-width panels", () => {
    const phoneStage = getGameStageCarouselSizing(844, 390)
    const tabletStage = getGameStageCarouselSizing(1366, 768)
    const smallTabletLearning = getLearningGameSizing(1024, 600, 3)
    const largeTabletLearning = getLearningGameSizing(1366, 768, 3)

    expect(tabletStage.cardWidth).toBeGreaterThan(phoneStage.cardWidth)
    expect(tabletStage.cardHeight).toBeGreaterThan(phoneStage.cardHeight)
    expect(tabletStage.cardWidth).toBeLessThanOrEqual(384)
    expect(smallTabletLearning.quizAnswerColumns).toBe(2)
    expect(largeTabletLearning.quizAnswerColumns).toBe(3)
    expect(largeTabletLearning.learningImageHeight).toBeGreaterThan(300)
  })
})

describe("Cards Matching responsive sizing", () => {
  const cases = [
    { availableHeight: 240, availableWidth: 624, name: "small Android landscape" },
    { availableHeight: 260, availableWidth: 732, name: "notched iPhone landscape" },
  ]

  it.each(cases)("grows all 16 cards while fitting $name", ({ availableHeight, availableWidth }) => {
    const sizing = getCardsMatchingGridSizing(availableWidth, availableHeight, 16)
    const legacyGap = 3
    const legacyWidth = Math.min(
      (availableWidth - 32) / 8 - legacyGap * 2,
      (availableHeight / 2 - legacyGap * 2) / 1.08,
    )
    const legacyHeight = legacyWidth * 1.08

    expect(sizing.numColumns).toBe(8)
    expect(sizing.rowCount).toBe(2)
    expect(sizing.gridWidth).toBeLessThanOrEqual(availableWidth)
    expect(sizing.gridHeight).toBeLessThanOrEqual(availableHeight)
    expect(sizing.cardWidth * sizing.cardHeight).toBeGreaterThan(legacyWidth * legacyHeight)
  })

  it.each([
    { availableHeight: 500, availableWidth: 1000, name: "small tablet" },
    { availableHeight: 620, availableWidth: 1320, name: "large tablet" },
  ])("fills the measured $name board without overflowing", ({ availableHeight, availableWidth }) => {
    const sizing = getCardsMatchingGridSizing(availableWidth, availableHeight, 16)

    expect(sizing.gridWidth).toBeLessThanOrEqual(availableWidth)
    expect(sizing.gridHeight).toBeLessThanOrEqual(availableHeight)
    expect(sizing.cardWidth).toBeGreaterThan(100)
    expect(sizing.cardHeight).toBeGreaterThan(sizing.cardWidth)
  })
})
