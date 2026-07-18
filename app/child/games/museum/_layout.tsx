import { useCallback, useEffect, useRef, useState } from "react"
import { Slot } from "expo-router"

import { ChildLoadingState } from "@/components/child/ChildLoadingState"
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
import { useChildUiLanguage } from "@/context/ChildUiLanguageContext"

type MuseumGateStatus = "loading" | "allowed" | "unavailable"

export const hasExactMuseumContent = (
  bundle: ContentBundle | undefined,
  languageCode: string,
): boolean =>
  bundle?.languageCode === languageCode &&
  (bundle.menuCardsByTab.museum?.length ?? 0) > 0

export default function MuseumRouteLayout() {
  const { activeChild } = useChild()
  const { t } = useChildUiLanguage()
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
      <ChildLoadingState
        title={t("museum.gettingReady")}
        message={t("museum.loadingExhibits")}
        icon="business-outline"
      />
    )
  }

  return (
    <ComingSoonState
      title={t("museum.notAvailable")}
      message={t("museum.languageUnavailable")}
      onRetry={() => void load(true)}
    />
  )
}
