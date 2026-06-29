"use client"

import { Stack, useFocusEffect, usePathname, useRouter } from "expo-router"
import { useCallback, useEffect } from "react"
import * as ScreenOrientation from "expo-screen-orientation"
import { useChild } from "@/context/ChildContext"
import { LanguageProvider } from "@/context/language-context"

export default function TabLayout() {
  const { activeChild } = useChild()
  const router = useRouter()
  const pathname = usePathname()

  const lockChildLandscape = useCallback(() => {
    const lockToLandscape = async () => {
      try {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_LEFT)
      } catch (error) {
        console.error("Failed to lock child layout to landscape:", error)
      }
    }

    lockToLandscape()
    const retryAfterTransition = setTimeout(lockToLandscape, 250)
    const retryAfterModalSettle = setTimeout(lockToLandscape, 750)

    return () => {
      clearTimeout(retryAfterTransition)
      clearTimeout(retryAfterModalSettle)
    }
  }, [])

  useEffect(() => {
    if (!activeChild) return
    return lockChildLandscape()
  }, [activeChild, pathname, lockChildLandscape])

  // This will run both on initial mount AND when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      // Redirect to parent dashboard if no active child
      if (!activeChild) {
        router.replace("/parent")
        return
      }

      console.log("Child tabs screen focused - locking to landscape")
      const clearLandscapeRetries = lockChildLandscape()

      return () => {
        clearLandscapeRetries()
        console.log("Child screen unfocused")
      }
    }, [activeChild, router, lockChildLandscape]),
  )

  if (!activeChild) {
    return null
  }

  return (
    <LanguageProvider>
      <Stack screenOptions={{ headerShown: false, orientation: "landscape_left" }}>
        <Stack.Screen
          name="parent-gate"
          options={{
            headerShown: false,
          }}
        />
      </Stack>
    </LanguageProvider>
  )
}
