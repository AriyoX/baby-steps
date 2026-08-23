import { useCallback, useState } from "react"
import { useFocusEffect } from "expo-router"
import {
  getCompletedLearningLessonIds,
  hydrateLearningProgressFromRemote,
} from "@/lib/learningProgressRepository"

type ProgressScope = {
  completedLessonIds: string[]
  key: string
}

const EMPTY_COMPLETED_LESSON_IDS: string[] = []

const sameLessonIds = (left: string[], right: string[]): boolean =>
  left.length === right.length &&
  left.every((lessonId, index) => lessonId === right[index])

export function useLearningHubProgress(
  childId: string,
  languageCode: string,
  contentReady: boolean,
  contentRevision?: string,
): string[] {
  const scopeKey = `${childId}:${languageCode}:${contentRevision ?? "unversioned"}`
  const [progressScope, setProgressScope] = useState<ProgressScope>({
    completedLessonIds: [],
    key: scopeKey,
  })

  useFocusEffect(
    useCallback(() => {
      let isActive = true

      if (!contentReady) {
        return () => {
          isActive = false
        }
      }

      void (async () => {
        await hydrateLearningProgressFromRemote(childId, languageCode)
        return getCompletedLearningLessonIds(childId, languageCode)
      })()
        .then((completedLessonIds) => {
          if (isActive) {
            setProgressScope((current) =>
              current.key === scopeKey &&
              sameLessonIds(current.completedLessonIds, completedLessonIds)
                ? current
                : { completedLessonIds, key: scopeKey },
            )
          }
        })
        .catch((error) => {
          console.warn("Could not load local Learning lesson progress:", error)
          if (isActive) {
            setProgressScope((current) =>
              current.key === scopeKey && current.completedLessonIds.length === 0
                ? current
                : { completedLessonIds: [], key: scopeKey },
            )
          }
        })

      return () => {
        isActive = false
      }
    }, [childId, contentReady, languageCode, scopeKey]),
  )

  return progressScope.key === scopeKey
    ? progressScope.completedLessonIds
    : EMPTY_COMPLETED_LESSON_IDS
}
