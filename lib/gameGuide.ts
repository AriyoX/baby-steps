import AsyncStorage from "@react-native-async-storage/async-storage"

export type GameGuideId =
  | "cards-matching"
  | "counting"
  | "learning-hub"
  | "learning-quiz"
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
): Promise<boolean> =>
  (await AsyncStorage.getItem(getGameGuideStorageKey(gameId, childId))) === "seen"

export const markGameGuideSeen = async (
  gameId: GameGuideId,
  childId?: string,
): Promise<void> => {
  await AsyncStorage.setItem(getGameGuideStorageKey(gameId, childId), "seen")
}
