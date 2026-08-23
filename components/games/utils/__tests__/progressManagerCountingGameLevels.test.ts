/* eslint-disable @typescript-eslint/no-require-imports, import/first */
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
)

const mockEnsureActivityProgressSnapshot = jest.fn()
const mockGetActivityProgress = jest.fn()
const mockGetStageProgress = jest.fn()
const mockHydrateActivityProgressOnLocalMiss = jest.fn()
const mockHydrateProgressFromRemote = jest.fn()
const mockMarkLevelCompleted = jest.fn()
const mockMarkStageCompleted = jest.fn()
const mockUpdateActivityProgress = jest.fn()

jest.mock("@/lib/progressRepository", () => ({
  ensureActivityProgressSnapshot: (...args: unknown[]) =>
    mockEnsureActivityProgressSnapshot(...args),
  getActivityProgress: (...args: unknown[]) => mockGetActivityProgress(...args),
  getStageProgress: (...args: unknown[]) => mockGetStageProgress(...args),
  hydrateActivityProgressOnLocalMiss: (...args: unknown[]) =>
    mockHydrateActivityProgressOnLocalMiss(...args),
  hydrateProgressFromRemote: (...args: unknown[]) =>
    mockHydrateProgressFromRemote(...args),
  markLevelCompleted: (...args: unknown[]) => mockMarkLevelCompleted(...args),
  markStageCompleted: (...args: unknown[]) => mockMarkStageCompleted(...args),
  updateActivityProgress: (...args: unknown[]) =>
    mockUpdateActivityProgress(...args),
}))

import AsyncStorage from "@react-native-async-storage/async-storage"
import {
  createDefaultProgress,
  getHighestUnlockedCountingLevel,
  isCountingLevelUnlocked,
  loadGameProgress,
  normalizeCountingProgress,
  saveGameProgress,
  updateLastPlayedLevel,
  updateProgressForLevelCompletion,
  type CountingGameProgress,
  type CountingStageProgressDefinition,
} from "../progressManagerCountingGame"

const childId = "counting-child"
const stages: CountingStageProgressDefinition[] = [
  { id: 10, levels: 3 },
  { id: 20, levels: 2 },
]

beforeEach(async () => {
  jest.clearAllMocks()
  await AsyncStorage.clear()
  mockEnsureActivityProgressSnapshot.mockResolvedValue(undefined)
  mockGetActivityProgress.mockResolvedValue(null)
  mockGetStageProgress.mockResolvedValue(null)
  mockHydrateActivityProgressOnLocalMiss.mockResolvedValue(null)
  mockHydrateProgressFromRemote.mockResolvedValue({ activities: 0, stages: 0 })
  mockMarkLevelCompleted.mockResolvedValue(undefined)
  mockMarkStageCompleted.mockResolvedValue(undefined)
  mockUpdateActivityProgress.mockResolvedValue(undefined)
})

describe("Counting level progress", () => {
  it("migrates legacy stage completion and lastPlayedLevel idempotently", () => {
    const legacy = {
      ...createDefaultProgress(childId, 10),
      completedLevelsByStage: undefined,
      completedStages: [10],
      unlockedStages: [10],
      currentStage: 20,
      lastPlayedLevel: { 10: 3, 20: 2 },
      totalScore: 40,
      playHistory: [{ date: "2026-01-01T00:00:00.000Z", score: 40 }],
      achievements: ["counter"],
    } as unknown as CountingGameProgress

    const migrated = normalizeCountingProgress(legacy, childId, stages)

    expect(migrated.completedLevelsByStage).toEqual({
      10: [1, 2, 3],
      20: [1],
    })
    expect(migrated.unlockedStages).toEqual([10, 20])
    expect(migrated).toEqual(expect.objectContaining({
      currentStage: 20,
      lastPlayedLevel: { 10: 3, 20: 2 },
      completedStages: [10],
      totalScore: 40,
      playHistory: legacy.playHistory,
      achievements: ["counter"],
    }))
    expect(normalizeCountingProgress(migrated, childId, stages)).toEqual(migrated)
  })

  it("unlocks exactly the next level and never regresses an earlier replay", () => {
    const initial = createDefaultProgress(childId, 10)
    const afterOne = updateProgressForLevelCompletion(
      initial,
      10,
      1,
      stages,
      childId,
    )

    expect(afterOne.completedLevelsByStage[10]).toEqual([1])
    expect(getHighestUnlockedCountingLevel(afterOne, 10, 3)).toBe(2)
    expect(isCountingLevelUnlocked(afterOne, 10, 2, 3)).toBe(true)
    expect(isCountingLevelUnlocked(afterOne, 10, 3, 3)).toBe(false)

    const replayPosition = updateLastPlayedLevel(afterOne, 10, 1, childId)
    const replayed = updateProgressForLevelCompletion(
      replayPosition,
      10,
      1,
      stages,
      childId,
    )
    expect(replayed.lastPlayedLevel[10]).toBe(2)
    expect(replayed.completedLevelsByStage[10]).toEqual([1])

    const afterTwo = updateProgressForLevelCompletion(
      replayed,
      10,
      2,
      stages,
      childId,
    )
    const afterThree = updateProgressForLevelCompletion(
      afterTwo,
      10,
      3,
      stages,
      childId,
    )
    expect(afterTwo.completedStages).not.toContain(10)
    expect(afterThree.completedStages).toContain(10)
    expect(afterThree.unlockedStages).toEqual([10, 20])
    expect(afterThree.currentStage).toBe(20)
  })

  it("persists individual completion with the stable stage and level identity", async () => {
    const completed = updateProgressForLevelCompletion(
      createDefaultProgress(childId, 10),
      10,
      1,
      stages,
      childId,
    )

    await saveGameProgress(completed, childId, "lg", {
      availableStageIds: stages,
    })

    expect(mockMarkLevelCompleted).toHaveBeenCalledTimes(1)
    expect(mockMarkLevelCompleted).toHaveBeenCalledWith(
      childId,
      "lg",
      "counting",
      10,
      1,
      expect.objectContaining({ progress_payload: { levelNumber: 1 } }),
    )
    expect(mockMarkStageCompleted).not.toHaveBeenCalled()

    const restored = await loadGameProgress(childId, "lg", stages)
    expect(restored.completedLevelsByStage[10]).toEqual([1])
  })

  it("merges hydrated child_stage_progress level rows into local progress", async () => {
    const remoteProgress = createDefaultProgress(childId, 10)
    mockHydrateActivityProgressOnLocalMiss.mockResolvedValueOnce({
      progress_payload: remoteProgress,
      score: 0,
    })
    mockGetStageProgress.mockImplementation(
      async (
        _child: string,
        _language: string,
        _activity: string,
        stageId: number,
        levelId: number | string,
      ) =>
        stageId === 10 && levelId === 1
          ? { status: "completed" }
          : null,
    )

    const restored = await loadGameProgress(childId, "nyn", stages)

    expect(restored.completedLevelsByStage[10]).toEqual([1])
    expect(getHighestUnlockedCountingLevel(restored, 10, 3)).toBe(2)
    expect(mockGetStageProgress).toHaveBeenCalledWith(
      childId,
      "nyn",
      "counting",
      10,
      1,
    )
  })

  it("keeps the old local record while writing the scoped migrated copy", async () => {
    const legacyKey = `@BabySteps:CountingGame:${childId}`
    const legacy = {
      ...createDefaultProgress(childId, 10),
      completedLevelsByStage: undefined,
      lastPlayedLevel: { 10: 2 },
    }
    await AsyncStorage.setItem(legacyKey, JSON.stringify(legacy))

    const restored = await loadGameProgress(
      childId,
      "lg",
      stages,
      "counting#current",
    )

    expect(restored.completedLevelsByStage[10]).toEqual([1])
    expect(restored.contentRevision).toBe("counting#current")
    expect(await AsyncStorage.getItem(legacyKey)).toBe(JSON.stringify(legacy))
    expect(
      await AsyncStorage.getItem(`@BabySteps:CountingGame:${childId}:lg`),
    ).not.toBeNull()
  })
})
