import AsyncStorage from "@react-native-async-storage/async-storage"

const COLORING_PROGRESS_KEY = "@baby_steps_coloring_progress_v1"

export interface ColoringProgress {
  savedArtworkCount: number
  savedPages: string[]
  maxColorsInArtwork: number
  unlockedAchievementIds: string[]
  lastSavedAt?: string
}

export interface ColoringAchievement {
  id: "first-masterpiece" | "color-explorer" | "gallery-star"
  title: string
  description: string
  icon: "star" | "color-palette" | "images"
}

export interface ColoringSaveResult {
  progress: ColoringProgress
  newlyUnlockedIds: string[]
  didPersist: boolean
}

export const COLORING_ACHIEVEMENTS: ColoringAchievement[] = [
  {
    id: "first-masterpiece",
    title: "First masterpiece",
    description: "Save your first picture",
    icon: "star",
  },
  {
    id: "color-explorer",
    title: "Color explorer",
    description: "Use 3 colors in one picture",
    icon: "color-palette",
  },
  {
    id: "gallery-star",
    title: "Gallery star",
    description: "Save 3 different pictures",
    icon: "images",
  },
]

export const EMPTY_COLORING_PROGRESS: ColoringProgress = {
  savedArtworkCount: 0,
  savedPages: [],
  maxColorsInArtwork: 0,
  unlockedAchievementIds: [],
}

const normalizeProgress = (value: unknown): ColoringProgress => {
  if (!value || typeof value !== "object") return EMPTY_COLORING_PROGRESS

  const candidate = value as Partial<ColoringProgress>
  return {
    savedArtworkCount:
      typeof candidate.savedArtworkCount === "number"
        ? Math.max(0, Math.floor(candidate.savedArtworkCount))
        : 0,
    savedPages: Array.isArray(candidate.savedPages)
      ? [...new Set(candidate.savedPages.filter((page): page is string => typeof page === "string"))]
      : [],
    maxColorsInArtwork:
      typeof candidate.maxColorsInArtwork === "number"
        ? Math.max(0, Math.floor(candidate.maxColorsInArtwork))
        : 0,
    unlockedAchievementIds: Array.isArray(candidate.unlockedAchievementIds)
      ? [
          ...new Set(
            candidate.unlockedAchievementIds.filter(
              (id): id is string => typeof id === "string",
            ),
          ),
        ]
      : [],
    lastSavedAt:
      typeof candidate.lastSavedAt === "string" ? candidate.lastSavedAt : undefined,
  }
}

const deriveAchievementIds = (progress: ColoringProgress): string[] => {
  const achievementIds: string[] = []
  if (progress.savedArtworkCount >= 1) achievementIds.push("first-masterpiece")
  if (progress.maxColorsInArtwork >= 3) achievementIds.push("color-explorer")
  if (progress.savedPages.length >= 3) achievementIds.push("gallery-star")
  return achievementIds
}

export const buildColoringProgressAfterSave = (
  current: ColoringProgress,
  pageName: string,
  usedColorCount: number,
  savedAt = new Date().toISOString(),
): { progress: ColoringProgress; newlyUnlockedIds: string[] } => {
  const normalized = normalizeProgress(current)
  const savedPages = [...new Set([...normalized.savedPages, pageName])]
  const progressWithoutUnlocks: ColoringProgress = {
    ...normalized,
    savedArtworkCount: normalized.savedArtworkCount + 1,
    savedPages,
    maxColorsInArtwork: Math.max(normalized.maxColorsInArtwork, usedColorCount),
    lastSavedAt: savedAt,
  }
  const unlockedAchievementIds = [
    ...new Set([
      ...normalized.unlockedAchievementIds,
      ...deriveAchievementIds(progressWithoutUnlocks),
    ]),
  ]
  const newlyUnlockedIds = unlockedAchievementIds.filter(
    (id) => !normalized.unlockedAchievementIds.includes(id),
  )

  return {
    progress: { ...progressWithoutUnlocks, unlockedAchievementIds },
    newlyUnlockedIds,
  }
}

const getChildStorageKey = (childId: string): string =>
  `${COLORING_PROGRESS_KEY}:${childId}`

export const getColoringProgress = async (childId: string): Promise<ColoringProgress> => {
  try {
    const stored = await AsyncStorage.getItem(getChildStorageKey(childId))
    return stored ? normalizeProgress(JSON.parse(stored)) : EMPTY_COLORING_PROGRESS
  } catch (error) {
    console.warn("Could not load local coloring progress:", error)
    return EMPTY_COLORING_PROGRESS
  }
}

export const recordColoringSave = async (
  childId: string,
  pageName: string,
  usedColorCount: number,
): Promise<ColoringSaveResult> => {
  const current = await getColoringProgress(childId)
  const result = buildColoringProgressAfterSave(current, pageName, usedColorCount)

  try {
    await AsyncStorage.setItem(getChildStorageKey(childId), JSON.stringify(result.progress))
  } catch (error) {
    console.warn("Could not store local coloring progress:", error)
    return {
      progress: current,
      newlyUnlockedIds: [],
      didPersist: false,
    }
  }

  return { ...result, didPersist: true }
}
