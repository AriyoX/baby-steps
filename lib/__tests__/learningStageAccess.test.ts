import {
  getLearningLanguageContent,
  getLessonStatus,
} from "@/content/learningHubRepository"
import { registerLearningHubTestFixture } from "@/content/testFixtures/learningHubTestFixture"
import {
  getLearningLessonAccessState,
  getLearningLessonAccessStates,
  getLearningStageAccessState,
  getLearningStageAccessStates,
} from "@/lib/learningStageAccess"

beforeEach(() => {
  registerLearningHubTestFixture()
})

describe("Learning Hub sequential stage access", () => {
  it("opens only the first incomplete curriculum stage", () => {
    const stages = getLearningLanguageContent("lg")!.stages
    const access = getLearningStageAccessStates(stages, [])

    expect(access[0]).toEqual(
      expect.objectContaining({
        isCurrent: true,
        isLocked: false,
        stage: expect.objectContaining({ id: "first-words" }),
      }),
    )
    expect(access[1]).toEqual(
      expect.objectContaining({
        isProgressLocked: true,
        lockedByStageId: "first-words",
        stage: expect.objectContaining({ id: "family-home" }),
      }),
    )
  })

  it("unlocks the next stage only after every startable lesson is complete", () => {
    const stages = getLearningLanguageContent("lg")!.stages
    const firstStageLessonIds = stages[0].lessons
      .filter((lesson) => getLessonStatus(lesson, stages[0]) === "startable")
      .map((lesson) => lesson.id)
    const incompleteIds = firstStageLessonIds.slice(0, -1)

    expect(
      getLearningStageAccessState(stages, incompleteIds, "family-home"),
    ).toEqual(expect.objectContaining({ isLocked: true }))
    expect(
      getLearningStageAccessState(stages, firstStageLessonIds, "family-home"),
    ).toEqual(
      expect.objectContaining({
        isCurrent: true,
        isLocked: false,
      }),
    )
  })

  it("keeps explicit locks and Practice Mix locked", () => {
    const stages = getLearningLanguageContent("lg")!.stages
    const allStartableLessonIds = stages.flatMap((stage) =>
      stage.lessons
        .filter((lesson) => getLessonStatus(lesson, stage) === "startable")
        .map((lesson) => lesson.id),
    )
    const practiceAccess = getLearningStageAccessState(
      stages,
      allStartableLessonIds,
      "practice-mix",
    )

    expect(practiceAccess).toEqual(
      expect.objectContaining({
        isExplicitlyLocked: true,
        isLocked: true,
        stage: expect.objectContaining({ isPractice: true }),
      }),
    )
  })

  it("uses database order and blocks after a new incomplete stage", () => {
    const content = getLearningLanguageContent("lg")!
    const firstStageLessonIds = content.stages[0].lessons
      .filter(
        (lesson) =>
          getLessonStatus(lesson, content.stages[0]) === "startable",
      )
      .map((lesson) => lesson.id)
    const insertedStage = {
      ...content.stages[0],
      id: "database-added-stage",
      lessons: content.stages[0].lessons.map((lesson) => ({
        ...lesson,
        id: `database-${lesson.id}`,
      })),
      stageNumber: 99,
      title: "Database Added Stage",
    }
    const stages = [
      content.stages[0],
      insertedStage,
      ...content.stages.slice(1),
    ]
    const access = getLearningStageAccessStates(stages, firstStageLessonIds)

    expect(access[1]).toEqual(
      expect.objectContaining({
        isCurrent: true,
        isLocked: false,
        stage: expect.objectContaining({ id: "database-added-stage" }),
      }),
    )
    expect(access[2]).toEqual(
      expect.objectContaining({
        isLocked: true,
        lockedByStageId: "database-added-stage",
      }),
    )
  })
})

describe("Learning Hub sequential lesson access", () => {
  it("unlocks only the first incomplete lesson", () => {
    const stage = getLearningLanguageContent("lg")!.stages[0]
    const access = getLearningLessonAccessStates(stage, [])

    expect(access[0]).toEqual(
      expect.objectContaining({
        effectiveStatus: "startable",
        isProgressLocked: false,
      }),
    )
    expect(access[1]).toEqual(
      expect.objectContaining({
        effectiveStatus: "locked",
        isProgressLocked: true,
        lockedByLessonId: stage.lessons[0].id,
      }),
    )
  })

  it("unlocks the next lesson after the previous lesson is complete", () => {
    const stage = getLearningLanguageContent("lg")!.stages[0]
    const firstLessonId = stage.lessons[0].id
    const secondLesson = getLearningLessonAccessState(
      stage,
      [firstLessonId],
      stage.lessons[1].id,
    )

    expect(secondLesson).toEqual(
      expect.objectContaining({
        effectiveStatus: "startable",
        isProgressLocked: false,
      }),
    )
  })

  it("keeps repository-defined unavailable lessons and blocks lessons after them", () => {
    const stage = getLearningLanguageContent("lg")!.stages.find(
      ({ id }) => id === "culture-stories",
    )!
    const access = getLearningLessonAccessStates(stage, [])

    expect(access[0].effectiveStatus).toBe(access[0].repositoryStatus)
    if (access.length > 1) {
      expect(access[1]).toEqual(
        expect.objectContaining({
          effectiveStatus: "locked",
          lockedByLessonId: access[0].lesson.id,
        }),
      )
    }
  })
})
