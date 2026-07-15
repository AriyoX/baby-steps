import {
  getLessonStatus,
  type LearningHubLesson,
  type LearningHubStage,
} from "@/content/learningHubRepository"
import type { LessonStatus } from "@/content/learningHubTypes"

export type LearningLessonAccessState = {
  effectiveStatus: LessonStatus
  isCompleted: boolean
  isProgressLocked: boolean
  lesson: LearningHubLesson
  lockedByLessonId?: string
  lockedByLessonTitle?: string
  repositoryStatus: LessonStatus
}

export const getLearningLessonAccessStates = (
  stage: LearningHubStage,
  completedLessonIds: string[],
): LearningLessonAccessState[] => {
  const completedIds = new Set(completedLessonIds)
  let blockingLesson: LearningHubLesson | undefined

  return stage.lessons.map((lesson) => {
    const repositoryStatus = getLessonStatus(lesson, stage)
    const isCompleted =
      repositoryStatus === "startable" && completedIds.has(lesson.id)
    const isProgressLocked = Boolean(blockingLesson)
    const accessState: LearningLessonAccessState = {
      effectiveStatus: isProgressLocked ? "locked" : repositoryStatus,
      isCompleted,
      isProgressLocked,
      lesson,
      lockedByLessonId: blockingLesson?.id,
      lockedByLessonTitle: blockingLesson?.title,
      repositoryStatus,
    }

    if (!blockingLesson && !isCompleted) {
      blockingLesson = lesson
    }

    return accessState
  })
}

export const getLearningLessonAccessState = (
  stage: LearningHubStage,
  completedLessonIds: string[],
  lessonId: string,
): LearningLessonAccessState | undefined =>
  getLearningLessonAccessStates(stage, completedLessonIds).find(
    ({ lesson }) => lesson.id === lessonId,
  )

export type LearningStageAccessState = {
  completedLessonCount: number
  isCompleted: boolean
  isCurrent: boolean
  isExplicitlyLocked: boolean
  isLocked: boolean
  isProgressLocked: boolean
  lockedByStageId?: string
  lockedByStageTitle?: string
  stage: LearningHubStage
  startableLessonIds: string[]
  totalLessonCount: number
}

export const getLearningStageAccessStates = (
  stages: LearningHubStage[],
  completedLessonIds: string[],
): LearningStageAccessState[] => {
  const completedIds = new Set(completedLessonIds)
  let blockingStage: LearningHubStage | undefined
  let hasCurrentStage = false

  return stages.map((stage) => {
    const startableLessonIds = stage.lessons
      .filter((lesson) => getLessonStatus(lesson, stage) === "startable")
      .map((lesson) => lesson.id)
    const completedLessonCount = startableLessonIds.filter((lessonId) =>
      completedIds.has(lessonId),
    ).length
    const totalLessonCount = startableLessonIds.length
    const isCompleted =
      totalLessonCount > 0 && completedLessonCount === totalLessonCount
    const isProgressLocked = Boolean(blockingStage)
    const isExplicitlyLocked = stage.isLocked
    const isLocked = isExplicitlyLocked || isProgressLocked
    const isCurrent =
      !hasCurrentStage &&
      !isLocked &&
      !isCompleted &&
      totalLessonCount > 0

    if (isCurrent) {
      hasCurrentStage = true
    }

    const accessState: LearningStageAccessState = {
      completedLessonCount,
      isCompleted,
      isCurrent,
      isExplicitlyLocked,
      isLocked,
      isProgressLocked,
      lockedByStageId: blockingStage?.id,
      lockedByStageTitle: blockingStage?.title,
      stage,
      startableLessonIds,
      totalLessonCount,
    }

    if (
      !stage.isPractice &&
      !blockingStage &&
      (isExplicitlyLocked || !isCompleted)
    ) {
      blockingStage = stage
    }

    return accessState
  })
}

export const getLearningStageAccessState = (
  stages: LearningHubStage[],
  completedLessonIds: string[],
  stageId: string,
): LearningStageAccessState | undefined =>
  getLearningStageAccessStates(stages, completedLessonIds).find(
    ({ stage }) => stage.id === stageId,
  )
