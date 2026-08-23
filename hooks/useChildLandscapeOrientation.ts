import { useCallback } from "react"
import { AppState } from "react-native"
import { useFocusEffect } from "expo-router"
import * as ScreenOrientation from "expo-screen-orientation"

const CHILD_ORIENTATION_LOCK = ScreenOrientation.OrientationLock.LANDSCAPE_LEFT
const LOCK_RETRY_DELAYS_MS = [250, 700]

export const lockChildLandscapeOrientation = async (source: string, force = false) => {
  try {
    const currentLock = await ScreenOrientation.getOrientationLockAsync()
    if (!force && currentLock === CHILD_ORIENTATION_LOCK) {
      return
    }

    await ScreenOrientation.lockAsync(CHILD_ORIENTATION_LOCK)
  } catch (error) {
    console.error(`Failed to lock ${source} to landscape:`, error)
  }
}

export const queueChildLandscapeOrientationLock = (source: string, force = false) => {
  void lockChildLandscapeOrientation(source, force)

  const retryTimeouts = LOCK_RETRY_DELAYS_MS.map((delay) =>
    setTimeout(() => {
      void lockChildLandscapeOrientation(source)
    }, delay),
  )

  return () => {
    retryTimeouts.forEach(clearTimeout)
  }
}

export function useChildLandscapeOrientation(source: string) {
  const queueLandscapeLock = useCallback(() => queueChildLandscapeOrientationLock(source), [source])

  useFocusEffect(
    useCallback(() => {
      let clearLandscapeRetries = queueLandscapeLock()

      const subscription = AppState.addEventListener("change", (nextAppState) => {
        if (nextAppState === "active") {
          clearLandscapeRetries()
          clearLandscapeRetries = queueChildLandscapeOrientationLock(source, true)
        }
      })

      return () => {
        clearLandscapeRetries()
        subscription.remove()
      }
    }, [queueLandscapeLock]),
  )
}
