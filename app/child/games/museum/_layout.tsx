import { useCallback, useEffect, useRef, useState } from "react"
import { ActivityIndicator, StyleSheet, Text, View } from "react-native"
import { Slot } from "expo-router"

import { ComingSoonState } from "@/components/child/ComingSoonState"
import {
  loadContentBundle,
  type ContentBundle,
} from "@/content/contentRepository"
import {
  DEFAULT_LEARNING_LANGUAGE_CODE,
  normalizeLearningLanguageCode,
} from "@/content/languages"
import { useChild } from "@/context/ChildContext"

type MuseumGateStatus = "loading" | "allowed" | "unavailable"

export const hasExactMuseumContent = (
  bundle: ContentBundle | undefined,
  languageCode: string,
): boolean =>
  bundle?.languageCode === languageCode &&
  (bundle.menuCardsByTab.museum?.length ?? 0) > 0

export default function MuseumRouteLayout() {
  const { activeChild } = useChild()
  const requestSequence = useRef(0)
  const [status, setStatus] = useState<MuseumGateStatus>("loading")

  // Existing child profiles may predate selected_language_code. Their established
  // default is Luganda; any explicit language code is queried exactly as selected.
  const languageCode =
    normalizeLearningLanguageCode(activeChild?.selected_language_code) ??
    DEFAULT_LEARNING_LANGUAGE_CODE

  const load = useCallback(
    async (forceRefresh: boolean) => {
      const requestId = ++requestSequence.current
      setStatus("loading")

      try {
        const result = await loadContentBundle(languageCode, { forceRefresh })
        if (requestId !== requestSequence.current) return

        setStatus(
          result.languageCode === languageCode &&
            hasExactMuseumContent(result.bundle, languageCode)
            ? "allowed"
            : "unavailable",
        )
      } catch {
        if (requestId === requestSequence.current) {
          setStatus("unavailable")
        }
      }
    },
    [languageCode],
  )

  useEffect(() => {
    void load(false)

    return () => {
      requestSequence.current += 1
    }
  }, [load])

  if (status === "allowed") return <Slot />

  if (status === "loading") {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#006D77" />
        <Text style={styles.loadingText}>Loading museum content...</Text>
      </View>
    )
  }

  return (
    <ComingSoonState
      title="Museum is not available yet"
      message="Museum activities are not available in the selected learning language."
      onRetry={() => void load(true)}
    />
  )
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#F7FBFA",
  },
  loadingText: {
    marginTop: 16,
    color: "#194A50",
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
})
