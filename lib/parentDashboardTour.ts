import type {
  GameTourPositioning,
  GameTourStep,
} from "@/components/games/GameTour"

// Parent Dashboard tour positioning controls.
//
// - androidSpotlightOffsetY moves every dashboard spotlight vertically after
//   the Android status-bar correction.
// - Each targetAdjustment below can move or resize only that target's
//   spotlight without changing the dashboard component itself.
export const PARENT_DASHBOARD_TOUR_POSITIONING: GameTourPositioning = {
  androidSpotlightOffsetY: 0,
  includeAndroidStatusBarOffset: true,
  orientation: "portrait",
}

export const PARENT_DASHBOARD_TARGET_ADJUSTMENTS = {
  profiles: { offsetX: 0, offsetY: 0, spotlightPadding: 8 },
  progress: { offsetX: 0, offsetY: 0, spotlightPadding: 8 },
  language: { offsetX: 0, offsetY: 0, spotlightPadding: 8 },
  settings: { offsetX: 0, offsetY: 0, spotlightPadding: 8 },
} satisfies Record<
  "language" | "profiles" | "progress" | "settings",
  NonNullable<GameTourStep["targetAdjustment"]>
>

export const PARENT_DASHBOARD_TOUR_STEPS: GameTourStep[] = [
  {
    id: "profiles",
    targetId: "parent-dashboard-profiles",
    icon: "people-outline",
    placement: "bottom",
    targetAdjustment: PARENT_DASHBOARD_TARGET_ADJUSTMENTS.profiles,
    title: "Child profiles",
    description: "Open a child profile or add another learner here.",
  },
  {
    id: "progress",
    targetId: "parent-dashboard-progress",
    icon: "stats-chart-outline",
    placement: "top",
    targetAdjustment: PARENT_DASHBOARD_TARGET_ADJUSTMENTS.progress,
    title: "Track progress",
    description: "Review recent learning and open the full activity history.",
  },
  {
    id: "language",
    targetId: "parent-dashboard-language",
    icon: "language-outline",
    placement: "bottom",
    targetAdjustment: PARENT_DASHBOARD_TARGET_ADJUSTMENTS.language,
    title: "Language selection",
    description: "View each child profile to check their learning language.",
  },
  {
    id: "settings",
    targetId: "parent-dashboard-settings",
    icon: "settings-outline",
    placement: "bottom",
    targetAdjustment: PARENT_DASHBOARD_TARGET_ADJUSTMENTS.settings,
    title: "Family settings",
    description: "Manage profiles, audio, reminders, privacy, and support.",
  },
]
