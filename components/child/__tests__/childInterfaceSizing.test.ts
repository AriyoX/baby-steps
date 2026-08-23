import {
  CHILD_INTERFACE_CARD_IMAGE_RATIO,
  CHILD_INTERFACE_CARD_TEXT_RATIO,
  getChildInterfaceCardLayout,
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

    expect(tabletLandscape.cardHeight).toBe(210)
    expect(tabletLandscape.cardWidth).toBe(250)
    expect(tabletLandscape.imageHeight + tabletLandscape.textHeight).toBe(
      tabletLandscape.cardHeight,
    )
  })
})
