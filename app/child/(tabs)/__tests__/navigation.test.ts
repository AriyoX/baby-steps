import fs from "fs"
import path from "path"
import {
  CHILD_GAMES_ROUTE,
  CHILD_HOME_ROUTE,
  CHILD_TAB_ITEMS,
} from "@/constants/ChildNavigation"

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
  })
})
