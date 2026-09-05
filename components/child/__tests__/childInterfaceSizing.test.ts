import {
  CHILD_INTERFACE_CARD_IMAGE_RATIO,
  CHILD_INTERFACE_CARD_TEXT_RATIO,
  getChildInterfaceCardLayout,
  getChildNavigationLayout,
  getLearningPathCardLayout,
} from "../childInterfaceSizing"

describe("shared child-interface card sizing", () => {
  it("uses the established card dimensions and proportions responsively", () => {
    const iphoneLandscape = getChildInterfaceCardLayout(844, 390)
    const smallAndroidLandscape = getChildInterfaceCardLayout(640, 360)

    expect(iphoneLandscape.cardWidth).toBe(250)
    expect(iphoneLandscape.cardHeight).toBeCloseTo(187.2)
    expect(iphoneLandscape.cardGap).toBe(16)
    expect(iphoneLandscape.imageHeight).toBeCloseTo(
      iphoneLandscape.cardHeight * CHILD_INTERFACE_CARD_IMAGE_RATIO,
    )
    expect(iphoneLandscape.textHeight).toBeCloseTo(
      iphoneLandscape.cardHeight * CHILD_INTERFACE_CARD_TEXT_RATIO,
    )

    expect(smallAndroidLandscape.cardWidth).toBe(220)
    expect(smallAndroidLandscape.cardHeight).toBeCloseTo(172.8)
  })

  it("keeps the complete image and text regions inside small-screen cards", () => {
    const smallPhoneLandscape = getChildInterfaceCardLayout(568, 320)
    const tabletLandscape = getChildInterfaceCardLayout(1024, 768)

    expect(smallPhoneLandscape.cardHeight).toBe(166)
    expect(smallPhoneLandscape.imageHeight + smallPhoneLandscape.textHeight).toBe(
      smallPhoneLandscape.cardHeight,
    )
    expect(smallPhoneLandscape.cardWidth).toBe(220)

    expect(tabletLandscape.cardHeight).toBe(320)
    expect(tabletLandscape.cardWidth).toBe(280)
    expect(tabletLandscape.leadCardWidth).toBe(240)
    expect(tabletLandscape.cardGap).toBeGreaterThan(16)
    expect(tabletLandscape.imageHeight + tabletLandscape.textHeight).toBe(
      tabletLandscape.cardHeight,
    )
  })

  it("scales navigation and lesson-path cards only when tablet space is available", () => {
    expect(getChildNavigationLayout(844, 390)).toMatchObject({
      barHeight: 58,
      iconSize: 22,
      labelFontSize: 10,
    })
    expect(getChildNavigationLayout(1366, 768)).toMatchObject({
      barHeight: 68,
      iconSize: 26,
      labelFontSize: 12,
    })

    expect(getLearningPathCardLayout(844, 390)).toMatchObject({
      cardWidth: 250,
      isTablet: false,
    })
    expect(getLearningPathCardLayout(1366, 768)).toMatchObject({
      cardWidth: 336,
      cardHeight: 304,
      isTablet: true,
    })
  })
})
