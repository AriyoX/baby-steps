export const CHILD_HOME_ROUTE = "/child/learning" as const
export const CHILD_GAMES_ROUTE = "/child" as const

export const CHILD_TAB_ITEMS = [
  { href: CHILD_HOME_ROUTE, id: "learning", label: "Learning" },
  { href: CHILD_GAMES_ROUTE, id: "index", label: "Games" },
  { href: "/child/Stories", id: "Stories", label: "Stories" },
  { href: "/child/coloring", id: "coloring", label: "Coloring" },
] as const

export type ChildTabId = (typeof CHILD_TAB_ITEMS)[number]["id"]
