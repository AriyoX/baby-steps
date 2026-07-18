import type { GameTourStep } from "@/components/games/GameTour"

export const PARENT_DASHBOARD_TOUR_STEPS: GameTourStep[] = [
  {
    id: "profiles",
    targetId: "parent-dashboard-profiles",
    icon: "people-outline",
    placement: "bottom",
    title: "Child profiles",
    description: "Open a child profile or add another learner here.",
  },
  {
    id: "progress",
    targetId: "parent-dashboard-progress",
    icon: "stats-chart-outline",
    placement: "top",
    title: "Track progress",
    description: "Review recent learning and open the full activity history.",
  },
  {
    id: "language",
    targetId: "parent-dashboard-language",
    icon: "language-outline",
    placement: "bottom",
    title: "Language selection",
    description: "View each child profile to check their learning language.",
  },
  {
    id: "settings",
    targetId: "parent-dashboard-settings",
    icon: "settings-outline",
    placement: "bottom",
    title: "Family settings",
    description: "Manage profiles, audio, reminders, privacy, and support.",
  },
]
