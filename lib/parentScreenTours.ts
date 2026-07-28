import type {
  GameTourPositioning,
  GameTourStep,
} from "@/components/games/GameTour"

export const PARENT_SCREEN_TOUR_POSITIONING: GameTourPositioning = {
  androidSpotlightOffsetY: 0,
  includeAndroidStatusBarOffset: true,
  orientation: "portrait",
}

export const PARENT_SETTINGS_TOUR_STEPS: GameTourStep[] = [
  {
    id: "family",
    targetId: "parent-settings-family",
    icon: "people-outline",
    placement: "bottom",
    title: "Your family",
    description: "Update your account, children's profiles, and parent PIN here.",
  },
  {
    id: "preferences",
    targetId: "parent-settings-preferences",
    icon: "options-outline",
    placement: "top",
    title: "Sounds and reminders",
    description: "Choose how Baby Steps sounds and when it reminds you.",
  },
  {
    id: "support",
    targetId: "parent-settings-support",
    icon: "heart-outline",
    placement: "top",
    title: "Safety and help",
    description: "Read about privacy, find answers, or contact the Baby Steps team.",
  },
]

export const PARENT_CHILD_PROFILE_TOUR_STEPS: GameTourStep[] = [
  {
    id: "profile",
    targetId: "parent-child-profile-summary",
    icon: "person-circle-outline",
    placement: "bottom",
    title: "Your child's space",
    description: "See this child's age, learning language, and quick actions.",
  },
  {
    id: "streak",
    targetId: "parent-child-profile-streak",
    icon: "flame-outline",
    placement: "top",
    title: "Learning streak",
    description: "See how often your child has been learning lately.",
  },
  {
    id: "achievements",
    targetId: "parent-child-profile-achievements",
    icon: "trophy-outline",
    placement: "top",
    title: "Proud moments",
    description: "New badges appear here as your child learns and plays.",
  },
]
