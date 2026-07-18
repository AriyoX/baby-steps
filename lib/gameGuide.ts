import AsyncStorage from "@react-native-async-storage/async-storage"

import { getColoringStudioTutorialStorageKey } from "@/lib/coloringStudioTutorial"

export type GameGuideId =
  | "cards-matching"
  | "coloring-studio"
  | "counting"
  | "learning-hub"
  | "learning-hub-home"
  | "learning-hub-stage"
  | "learning-quiz"
  | "parent-dashboard"
  | "puzzle"
  | "stories"
  | "word"

const GAME_GUIDE_STORAGE_PREFIX = "@BabySteps:GameGuide:v1"

const normalizeStorageSegment = (value: string | undefined, fallback: string) => {
  const normalized = value?.trim().replace(/[^a-zA-Z0-9_-]/g, "-")
  return normalized || fallback
}

export const getGameGuideStorageKey = (
  gameId: GameGuideId,
  childId?: string,
): string =>
  `${GAME_GUIDE_STORAGE_PREFIX}:${normalizeStorageSegment(childId, "guest")}:${gameId}`

export const hasSeenGameGuide = async (
  gameId: GameGuideId,
  childId?: string,
): Promise<boolean> => {
  const sharedValue = await AsyncStorage.getItem(
    getGameGuideStorageKey(gameId, childId),
  )

  if (sharedValue === "seen") return true

  if (gameId === "coloring-studio") {
    return (
      (await AsyncStorage.getItem(
        getColoringStudioTutorialStorageKey(childId),
      )) === "seen"
    )
  }

  return false
}

export const markGameGuideSeen = async (
  gameId: GameGuideId,
  childId?: string,
): Promise<void> => {
  await AsyncStorage.setItem(getGameGuideStorageKey(gameId, childId), "seen")
}
