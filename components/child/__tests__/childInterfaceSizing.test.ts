import fs from "fs"
import path from "path"
import {
  CHILD_INTERFACE_CARD_IMAGE_RATIO,
  CHILD_INTERFACE_CARD_TEXT_RATIO,
  getChildInterfaceCardLayout,
} from "../childInterfaceSizing"

const readProjectFile = (...segments: string[]) =>
  fs.readFileSync(path.join(process.cwd(), ...segments), "utf8")

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

  it("is consumed by Learning and the Games, Stories, and Coloring interface", () => {
    const learningSource = readProjectFile("app", "child", "(tabs)", "learning.tsx")
    const childInterfaceSource = readProjectFile(
      "components",
      "child",
      "AfricanThemeGameInterface.tsx",
    )

    for (const source of [learningSource, childInterfaceSource]) {
      expect(source).toContain("useWindowDimensions")
      expect(source).toContain("getChildInterfaceCardLayout(width, height)")
      expect(source).not.toContain('Dimensions.get("window")')
    }

    expect(learningSource).toContain('numberOfLines={2}')
  })
})
