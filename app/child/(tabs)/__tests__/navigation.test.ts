import fs from "fs"
import path from "path"
import {
  CHILD_GAMES_ROUTE,
  CHILD_HOME_ROUTE,
  CHILD_TAB_ITEMS,
} from "@/constants/ChildNavigation"
import {
  ADULT_SYSTEM_UI_OPTIONS,
  CHILD_FULLSCREEN_OPTIONS,
} from "@/constants/SystemUi"

const readProjectFile = (...segments: string[]) =>
  fs.readFileSync(path.join(process.cwd(), ...segments), "utf8")

describe("child-mode navigation", () => {
  it("keeps the visual order Learning, Games, Stories, Coloring", () => {
    expect(CHILD_TAB_ITEMS.map((item) => item.label)).toEqual([
      "Learning",
      "Games",
      "Stories",
      "Coloring",
    ])

    const layoutSource = readProjectFile("app", "child", "(tabs)", "_layout.tsx")
    expect(layoutSource).toContain("CHILD_TAB_ITEMS.map")
    expect(layoutSource).toContain('initialRouteName="learning"')
  })

  it("routes every child-mode entry point to Learning", () => {
    expect(CHILD_HOME_ROUTE).toBe("/child/learning")

    const profileLaunch = readProjectFile("app", "parent", "child-detail", "[id].tsx")
    const childCreation = readProjectFile("app", "parent", "add-child", "final.tsx")
    const fallback = readProjectFile("app", "+not-found.tsx")

    expect(profileLaunch).toContain("pathname: CHILD_HOME_ROUTE")
    expect(childCreation).toContain("pathname: CHILD_HOME_ROUTE")
    expect(fallback).toContain("activeChild ? CHILD_HOME_ROUTE : '/parent'")
  })

  it("keeps Games as the second tab and maps it to the Games index screen", () => {
    expect(CHILD_TAB_ITEMS[1]).toEqual({
      href: CHILD_GAMES_ROUTE,
      id: "index",
      label: "Games",
      labelKey: "navigation.games",
    })

    const layoutSource = readProjectFile("app", "child", "(tabs)", "_layout.tsx")
    const gamesIndexSource = readProjectFile("app", "child", "(tabs)", "index.tsx")

    expect(layoutSource).toContain("href: item.href")
    expect(gamesIndexSource).toContain("<AfricanThemeGameInterface />")
    expect(gamesIndexSource).not.toContain("Redirect")
    expect(CHILD_GAMES_ROUTE).toBe("/child")
  })

  it("keeps the bottom navigation simple, consistent, and accessible", () => {
    const layoutSource = readProjectFile("app", "child", "(tabs)", "_layout.tsx")

    expect(layoutSource).toContain('tabBarLabelPosition: "below-icon"')
    expect(layoutSource).toContain("tabBarShowLabel: true")
    expect(layoutSource).toContain("tabBarAccessibilityLabel: t(item.labelKey)")
    expect(layoutSource).toContain("adjustsFontSizeToFit")
    expect(layoutSource).toContain('iconName: "game-controller-outline"')
    expect(layoutSource).toContain('iconName: "book-outline"')
    expect(layoutSource).toContain('iconName: "color-palette-outline"')
    expect(layoutSource).not.toContain("activeTabItemContent")
    expect(layoutSource).not.toContain("getChildTabBarMetrics")
    expect(layoutSource).toContain("left: horizontalInset")
    expect(layoutSource).toContain("right: horizontalInset")
    expect(layoutSource).not.toContain("TAB_BAR_MAX_WIDTH")
    expect(layoutSource).not.toContain("useWindowDimensions")
  })

  it("keeps child mode immersive and restores system bars in adult mode", () => {
    expect(CHILD_FULLSCREEN_OPTIONS).toMatchObject({
      autoHideHomeIndicator: true,
      navigationBarHidden: true,
      statusBarHidden: true,
    })
    expect(ADULT_SYSTEM_UI_OPTIONS).toMatchObject({
      autoHideHomeIndicator: false,
      navigationBarHidden: false,
      statusBarHidden: false,
    })

    const rootLayoutSource = readProjectFile("app", "_layout.tsx")
    const childLayoutSource = readProjectFile("app", "child", "_layout.tsx")

    expect(rootLayoutSource).toContain("...ADULT_SYSTEM_UI_OPTIONS")
    expect(rootLayoutSource).toContain("...CHILD_FULLSCREEN_OPTIONS")
    expect(childLayoutSource).toContain("...CHILD_FULLSCREEN_OPTIONS")
    expect(childLayoutSource).toContain("<StatusBar hidden />")
  })

  it("keeps every tab title centered and lifts cards clear of the bottom navigation", () => {
    const interfaceSource = readProjectFile(
      "components",
      "child",
      "AfricanThemeGameInterface.tsx",
    )

    expect(interfaceSource).toContain("const CHILD_TAB_BAR_CLEARANCE = 76")
    expect(interfaceSource).toContain(
      '<View pointerEvents="none" style={styles.titleBlock}>',
    )
    expect(interfaceSource).toMatch(
      /titleBlock:\s*\{[\s\S]*?position: "absolute"[\s\S]*?right: 0/,
    )
    expect(interfaceSource).toMatch(
      /headerActions:\s*\{[\s\S]*?marginLeft: "auto"/,
    )
  })

  it("does not register a nonexistent Learning stack route", () => {
    const childLayoutSource = readProjectFile("app", "child", "_layout.tsx")

    expect(childLayoutSource).not.toContain('name="learning"')
    expect(childLayoutSource).toContain('name="(tabs)"')
    expect(childLayoutSource).toContain('name="games"')
    expect(childLayoutSource).toContain('name="parent-gate"')
  })

  it("prepares the Learning stages target before the tour measures it", () => {
    const interfaceSource = readProjectFile(
      "components",
      "child",
      "AfricanThemeGameInterface.tsx",
    )

    expect(interfaceSource).toContain("isLearningHubTourReady")
    expect(interfaceSource).toContain("isScreenFocused")
    expect(interfaceSource).toContain("!isContentLoading")
    expect(interfaceSource).toContain("learningCards.length > 0")
    expect(interfaceSource).toContain(
      "x: CHILD_LEAD_CARD_WIDTH + CHILD_LEAD_CARD_GAP",
    )
    expect(interfaceSource).toContain(
      "prepareTarget: prepareLearningStagesTarget",
    )
    expect(interfaceSource).toContain(
      "positioning={CHILD_LEARNING_TOUR_POSITIONING}",
    )
  })
})
