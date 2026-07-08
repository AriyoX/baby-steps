"use client"

import { Stack, useFocusEffect, useRouter } from "expo-router"
import { useCallback, useEffect, useRef } from "react"
import { AppState } from "react-native"
import * as ScreenOrientation from "expo-screen-orientation"
import { useChild } from "@/context/ChildContext"
import { LanguageProvider } from "@/context/language-context"

const CHILD_ROUTE_ORIENTATION = "landscape_left" as const
const CHILD_ORIENTATION_LOCK = ScreenOrientation.OrientationLock.LANDSCAPE_LEFT

export default function TabLayout() {
  const { activeChild } = useChild()
  const router = useRouter()
  const hasRequestedLandscape = useRef(false)

  const ensureChildLandscape = useCallback(async (forceLock = false) => {
    if (!forceLock && hasRequestedLandscape.current) {
      return
    }

    try {
      const currentLock = await ScreenOrientation.getOrientationLockAsync()
      if (forceLock || currentLock !== CHILD_ORIENTATION_LOCK) {
        await ScreenOrientation.lockAsync(CHILD_ORIENTATION_LOCK)
      }
      hasRequestedLandscape.current = true
    } catch (error) {
      console.error("Failed to lock child layout to landscape:", error)
    }
  }, [])

  useEffect(() => {
    void ensureChildLandscape()
  }, [ensureChildLandscape])

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        void ensureChildLandscape(true)
      }
    })

    return () => {
      subscription.remove()
    }
  }, [ensureChildLandscape])

  // This will run both on initial mount AND when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      void ensureChildLandscape()

      // Redirect to parent dashboard if no active child
      if (!activeChild) {
        router.replace("/parent")
        return
      }

      console.log("Child tabs screen focused - locking to landscape")

      return () => {
        console.log("Child screen unfocused")
      }
    }, [activeChild, router, ensureChildLandscape]),
  )

  if (!activeChild) {
    return null
  }

  return (
    <LanguageProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          orientation: CHILD_ROUTE_ORIENTATION,
        }}
      >
        <Stack.Screen
          name="(tabs)"
          options={{
            animation: "none",
            orientation: CHILD_ROUTE_ORIENTATION,
          }}
        />
        <Stack.Screen
          name="games"
          options={{
            orientation: CHILD_ROUTE_ORIENTATION,
          }}
        />
        <Stack.Screen
          name="learning"
          options={{
            orientation: CHILD_ROUTE_ORIENTATION,
          }}
        />
        <Stack.Screen
          name="parent-gate"
          options={{
            headerShown: false,
            orientation: CHILD_ROUTE_ORIENTATION,
          }}
        />
      </Stack>
    </LanguageProvider>
  )
}
