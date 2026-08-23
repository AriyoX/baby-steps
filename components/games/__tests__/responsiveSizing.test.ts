import {
  getCardsMatchingGridSizing,
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
})
