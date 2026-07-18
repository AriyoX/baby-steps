import AsyncStorage from "@react-native-async-storage/async-storage"

export const COLORING_STUDIO_TUTORIAL_KEY =
  "@baby_steps_coloring_studio_tutorial_v1"

export const hasSeenColoringStudioTutorial = async (): Promise<boolean> => {
  try {
    return (await AsyncStorage.getItem(COLORING_STUDIO_TUTORIAL_KEY)) === "seen"
  } catch (error) {
    console.warn("Could not load coloring tutorial status:", error)
    return true
  }
}

export const markColoringStudioTutorialSeen = async (): Promise<boolean> => {
  try {
    await AsyncStorage.setItem(COLORING_STUDIO_TUTORIAL_KEY, "seen")
    return true
  } catch (error) {
    console.warn("Could not save coloring tutorial status:", error)
    return false
  }
}
