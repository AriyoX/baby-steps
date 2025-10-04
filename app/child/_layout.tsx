"use client"

import { Stack, useFocusEffect } from "expo-router"
import { useCallback } from "react"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import * as ScreenOrientation from "expo-screen-orientation"
import { useChild } from "@/context/ChildContext"
import { useRouter } from "expo-router"
import { LanguageProvider } from "@/context/language-context"

export default function TabLayout() {
  const insets = useSafeAreaInsets()
  const { activeChild } = useChild()
  const router = useRouter()

  // This will run both on initial mount AND when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      // Redirect to parent dashboard if no active child
      if (!activeChild) {
        router.replace("/parent")
        return
      }

      console.log("Child tabs screen focused - locking to landscape")
      const lockToLandscape = async () => {
        try {
          await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_LEFT)
        } catch (error) {
          console.error("Failed to lock orientation:", error)
        }
      }

      lockToLandscape()

      // Cleanup function when screen loses focus
      return () => {
        console.log("Child screen unfocused")
        const resetOrientation = async () => {
          await ScreenOrientation.unlockAsync()
        }

        resetOrientation()
      }
    }, [activeChild]),
  )

  if (!activeChild) {
    return null
  }

  return (
    <LanguageProvider>
      <Stack screenOptions={{ headerShown: false }}>
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
