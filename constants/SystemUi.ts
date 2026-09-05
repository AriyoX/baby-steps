export const ADULT_SYSTEM_UI_OPTIONS = {
  autoHideHomeIndicator: false,
  navigationBarHidden: false,
  statusBarHidden: false,
} as const

export const CHILD_FULLSCREEN_OPTIONS = {
  autoHideHomeIndicator: true,
  navigationBarHidden: true,
  statusBarAnimation: "fade",
  statusBarHidden: true,
} as const

// Landscape game screens use their own horizontal spacing, including beside cutouts.
export const CHILD_GAME_SAFE_AREA_EDGES = ["top", "bottom"] as const
