import AsyncStorage from "@react-native-async-storage/async-storage"

export const COLORING_STUDIO_TUTORIAL_STORAGE_PREFIX =
  "@baby_steps_coloring_studio_tutorial_v2"

export const getColoringStudioTutorialStorageKey = (childId?: string): string => {
  const storageOwner = childId?.trim() || "guest"
  return `${COLORING_STUDIO_TUTORIAL_STORAGE_PREFIX}:${encodeURIComponent(storageOwner)}`
}

export const hasSeenColoringStudioTutorial = async (
  childId?: string,
): Promise<boolean> => {
  try {
    return (
      await AsyncStorage.getItem(getColoringStudioTutorialStorageKey(childId))
    ) === "seen"
  } catch (error) {
    console.warn("Could not load coloring tutorial status:", error)
    return true
  }
}

export const markColoringStudioTutorialSeen = async (
  childId?: string,
): Promise<boolean> => {
  try {
    await AsyncStorage.setItem(
      getColoringStudioTutorialStorageKey(childId),
      "seen",
    )
    return true
  } catch (error) {
    console.warn("Could not save coloring tutorial status:", error)
    return false
  }
}
