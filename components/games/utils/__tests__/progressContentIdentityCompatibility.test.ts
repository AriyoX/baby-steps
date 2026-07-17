/* eslint-disable @typescript-eslint/no-require-imports, import/first */
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

const mockEnsureActivityProgressSnapshot = jest.fn();
const mockGetActivityProgress = jest.fn();
const mockHydrateActivityProgressOnLocalMiss = jest.fn();
const mockHydrateProgressFromRemote = jest.fn();
const mockMarkStageCompleted = jest.fn();
const mockMarkStageStarted = jest.fn();
const mockUpdateActivityProgress = jest.fn();

jest.mock("@/lib/progressRepository", () => ({
  ensureActivityProgressSnapshot: (...args: unknown[]) =>
    mockEnsureActivityProgressSnapshot(...args),
  getActivityProgress: (...args: unknown[]) => mockGetActivityProgress(...args),
  hydrateActivityProgressOnLocalMiss: (...args: unknown[]) =>
    mockHydrateActivityProgressOnLocalMiss(...args),
  hydrateProgressFromRemote: (...args: unknown[]) =>
    mockHydrateProgressFromRemote(...args),
  markStageCompleted: (...args: unknown[]) => mockMarkStageCompleted(...args),
  markStageStarted: (...args: unknown[]) => mockMarkStageStarted(...args),
  updateActivityProgress: (...args: unknown[]) =>
    mockUpdateActivityProgress(...args),
}));

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { LearningGameStage, WordGameLevel } from "@/content/contentRepository";
import {
  createDefaultProgress as createDefaultCountingProgress,
  loadGameProgress as loadCountingProgress,
} from "../progressManagerCountingGame";
import {
  DEFAULT_USER_STATS,
  loadGameProgress as loadLearningProgress,
  saveGameProgress as saveLearningProgress,
} from "../progressManagerLugandaLearning";
import {
  createDefaultProgress as createDefaultWordProgress,
  loadGameProgress as loadWordProgress,
  updateProgressForLevelCompletion,
} from "../progressManagerWordGame";

const childId = "content-history-child";
const learningStages: LearningGameStage[] = [
  {
    id: 1,
    order: 1,
    title: "Current stage one",
    description: "",
    isLocked: false,
    image: null,
    color: "#000000",
    requiredScore: 0,
    levels: [
      {
        id: 10,
        order: 1,
        title: "Current level ten",
        isLocked: false,
        words: [],
      },
    ],
  },
  {
    id: 2,
    order: 2,
    title: "Current stage two",
    description: "",
    isLocked: true,
    image: null,
    color: "#ffffff",
    requiredScore: 10,
    levels: [
      {
        id: 20,
        order: 1,
        title: "Current level twenty",
        isLocked: true,
        words: [],
      },
    ],
  },
];

const wordLevel = (id: string, order: number): WordGameLevel => ({
  id,
  order,
  word: id,
  question: id,
  hint: id,
  subHint: id,
});

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  mockEnsureActivityProgressSnapshot.mockResolvedValue(undefined);
  mockGetActivityProgress.mockResolvedValue(null);
  mockHydrateActivityProgressOnLocalMiss.mockResolvedValue(null);
  mockHydrateProgressFromRemote.mockResolvedValue({ activities: 0, stages: 0 });
  mockMarkStageCompleted.mockResolvedValue(undefined);
  mockMarkStageStarted.mockResolvedValue(undefined);
  mockUpdateActivityProgress.mockResolvedValue(undefined);
});

const flushBackgroundWork = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe("progress compatibility when published content changes", () => {
  it("starts Learning Game progress clean when its progress revision changes", async () => {
    await AsyncStorage.multiSet([
      [`learning_total_score_${childId}_lg`, "20"],
      [`learning_completed_levels_${childId}_lg`, JSON.stringify([10])],
      [`learning_stages_${childId}_lg`, JSON.stringify(learningStages)],
      [`learning_user_stats_${childId}_lg`, JSON.stringify(DEFAULT_USER_STATS)],
      [`learning_content_revision_${childId}_lg`, "learning_game/starter#1"],
    ]);

    const progress = await loadLearningProgress(
      childId,
      "lg",
      learningStages,
      "learning_game/starter#2",
    );

    expect(progress).toEqual(
      expect.objectContaining({
        totalScore: 0,
        completedLevels: [],
        contentRevision: "learning_game/starter#2",
      }),
    );
    expect(
      await AsyncStorage.getItem(`learning_completed_levels_${childId}_lg`),
    ).toBeNull();
  });

  it("commits the Learning Game revision marker after its progress payload", async () => {
    await saveLearningProgress(
      10,
      [10],
      learningStages,
      DEFAULT_USER_STATS,
      childId,
      "lg",
      { contentRevision: "learning_game/starter#2" },
    );

    const setItemMock = AsyncStorage.setItem as jest.Mock;
    const revisionCall = setItemMock.mock.calls.findIndex(
      ([key]) => key === `learning_content_revision_${childId}_lg`,
    );
    const progressCall = setItemMock.mock.calls.findIndex(
      ([key]) => key === `learning_user_stats_${childId}_lg`,
    );

    expect(progressCall).toBeGreaterThanOrEqual(0);
    expect(revisionCall).toBeGreaterThan(progressCall);
  });

  it("starts Word and Counting progress clean when reused IDs belong to a new revision", async () => {
    const wordLevels = [wordLevel("word-a", 1), wordLevel("word-b", 2)];
    await AsyncStorage.setItem(
      `@BabySteps:WordGame:${childId}:lg`,
      JSON.stringify({
        ...createDefaultWordProgress(childId),
        contentRevision: "word_game/levels#1",
        completedLevels: [0],
        completedLevelIds: ["word-a"],
        unlockedLevels: [0, 1],
        unlockedLevelIds: ["word-a", "word-b"],
      }),
    );
    await AsyncStorage.setItem(
      `@BabySteps:CountingGame:${childId}:lg`,
      JSON.stringify({
        ...createDefaultCountingProgress(childId),
        contentRevision: "counting_game/stages#1",
        completedStages: [1],
      }),
    );

    const wordProgress = await loadWordProgress(
      childId,
      "lg",
      wordLevels,
      "word_game/levels#2",
    );
    const countingProgress = await loadCountingProgress(
      childId,
      "lg",
      [1],
      "counting_game/stages#2",
    );

    expect(wordProgress.completedLevels).toEqual([]);
    expect(wordProgress.contentRevision).toBe("word_game/levels#2");
    expect(countingProgress.completedStages).toEqual([]);
    expect(countingProgress.contentRevision).toBe("counting_game/stages#2");
  });

  it("retains retired Learning level IDs while measuring current stages", async () => {
    await AsyncStorage.multiSet([
      [`learning_total_score_${childId}_lg`, "20"],
      [`learning_completed_levels_${childId}_lg`, JSON.stringify([10, 999])],
      [`learning_stages_${childId}_lg`, JSON.stringify(learningStages)],
      [`learning_user_stats_${childId}_lg`, JSON.stringify(DEFAULT_USER_STATS)],
    ]);

    const progress = await loadLearningProgress(childId, "lg", learningStages);
    await flushBackgroundWork();

    expect(progress.completedLevels).toEqual([10, 999]);
    expect(mockEnsureActivityProgressSnapshot).toHaveBeenCalledWith(
      childId,
      "lg",
      "learning",
      expect.objectContaining({
        status: "in_progress",
        completed_stage_count: 1,
        progress_payload: expect.objectContaining({ completedLevels: [10, 999] }),
      }),
    );
  });

  it("retains retired Counting stage history but uses current stages for status", async () => {
    await AsyncStorage.setItem(
      `@BabySteps:CountingGame:${childId}:lg`,
      JSON.stringify({
        ...createDefaultCountingProgress(childId),
        unlockedStages: [1, 2, 99],
        currentStage: 99,
        lastPlayedLevel: { 1: 4, 99: 7 },
        completedStages: [1, 99],
        totalScore: 30,
      }),
    );

    const progress = await loadCountingProgress(childId, "lg", [1, 2]);
    await flushBackgroundWork();

    expect(progress).toEqual(expect.objectContaining({
      currentStage: 1,
      unlockedStages: [1, 2, 99],
      completedStages: [1, 99],
      lastPlayedLevel: { 1: 4, 99: 7 },
    }));
    expect(mockEnsureActivityProgressSnapshot).toHaveBeenCalledWith(
      childId,
      "lg",
      "counting",
      expect.objectContaining({
        status: "in_progress",
        completed_stage_count: 1,
        progress_payload: expect.objectContaining({ completedStages: [1, 99] }),
      }),
    );
  });

  it("migrates legacy Luganda Word positions to stable IDs without deleting the old key", async () => {
    const legacyProgress = {
      ...createDefaultWordProgress(childId),
      unlockedLevels: [0, 1, 2, 49],
      currentLevel: 1,
      completedLevels: [0, 1, 49],
      totalScore: 30,
    };
    const legacyKey = `@BabySteps:WordGame:${childId}`;
    await AsyncStorage.setItem(legacyKey, JSON.stringify(legacyProgress));

    const currentLevels = [
      wordLevel("lg-word-game-level-2", 1),
      wordLevel("lg-word-game-level-1", 2),
      wordLevel("lg-word-game-level-51", 3),
    ];
    const migrated = await loadWordProgress(childId, "lg", currentLevels);
    await flushBackgroundWork();

    expect(new Set(migrated.completedLevels)).toEqual(new Set([0, 1]));
    expect(migrated.currentLevel).toBe(0);
    expect(migrated.historicalCompletedLevels).toEqual([0, 1, 49]);
    expect(migrated.completedLevelIds).toEqual([
      "lg-word-game-level-1",
      "lg-word-game-level-2",
      "lg-word-game-level-50",
    ]);
    expect(migrated.legacyLevelIdSnapshot).toHaveLength(50);
    expect(await AsyncStorage.getItem(legacyKey)).toBe(JSON.stringify(legacyProgress));

    const scopedValue = await AsyncStorage.getItem(
      `@BabySteps:WordGame:${childId}:lg`,
    );
    expect(scopedValue).not.toBeNull();
    expect(JSON.parse(scopedValue ?? "{}")).toEqual(
      expect.objectContaining({
        historicalCompletedLevels: [0, 1, 49],
        completedLevelIds: [
          "lg-word-game-level-1",
          "lg-word-game-level-2",
          "lg-word-game-level-50",
        ],
      }),
    );
    expect(mockEnsureActivityProgressSnapshot).toHaveBeenCalledWith(
      childId,
      "lg",
      "words",
      expect.objectContaining({
        status: "in_progress",
        completed_stage_count: 2,
      }),
    );

    const reorderedLevels = [
      wordLevel("lg-word-game-level-51", 1),
      wordLevel("lg-word-game-level-2", 2),
      wordLevel("lg-word-game-level-1", 3),
    ];
    const restored = await loadWordProgress(childId, "lg", reorderedLevels);

    expect(restored.currentLevel).toBe(1);
    expect(new Set(restored.completedLevels)).toEqual(new Set([1, 2]));
    expect(restored.completedLevelIds).toContain("lg-word-game-level-50");
    expect(restored.historicalCompletedLevels).toEqual([0, 1, 49]);
  });

  it("tracks the stable current Word level when advancing", () => {
    const levels = [wordLevel("word-a", 1), wordLevel("word-b", 2)];

    const progress = updateProgressForLevelCompletion(
      createDefaultWordProgress(childId),
      0,
      "WORD",
      levels,
      childId,
    );

    expect(progress.completedLevelIds).toEqual(["word-a"]);
    expect(progress.unlockedLevelIds).toContain("word-b");
    expect(progress.currentLevelId).toBe("word-b");
  });
});
