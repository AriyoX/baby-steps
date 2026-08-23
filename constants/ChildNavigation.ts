export const CHILD_HOME_ROUTE = "/child/learning" as const
export const CHILD_GAMES_ROUTE = "/child" as const

export const CHILD_TAB_ITEMS = [
  { href: CHILD_HOME_ROUTE, id: "learning", label: "Learning", labelKey: "navigation.learning" },
  { href: CHILD_GAMES_ROUTE, id: "index", label: "Games", labelKey: "navigation.games" },
  { href: "/child/Stories", id: "Stories", label: "Stories", labelKey: "navigation.stories" },
  { href: "/child/coloring", id: "coloring", label: "Coloring", labelKey: "navigation.coloring" },
] as const

export type ChildTabId = (typeof CHILD_TAB_ITEMS)[number]["id"]
