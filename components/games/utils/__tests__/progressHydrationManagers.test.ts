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
import type { LearningGameStage } from "@/content/contentRepository";
import {
  createDefaultProgress as createDefaultCountingProgress,
  loadGameProgress as loadCountingProgress,
  type CountingGameProgress,
} from "../progressManagerCountingGame";
import {
  createDefaultProgress as createDefaultWordProgress,
  loadGameProgress as loadWordProgress,
  type WordGameProgress,
} from "../progressManagerWordGame";
import {
  DEFAULT_USER_STATS,
  loadGameProgress as loadLearningProgress,
} from "../progressManagerLugandaLearning";

const childId = "child-1";
const stages: LearningGameStage[] = [
  {
    id: 1,
    order: 1,
    title: "Stage one",
    description: "",
    isLocked: false,
    image: null,
    color: "#000000",
    requiredScore: 0,
    levels: [
      {
        id: 10,
        order: 1,
        title: "Level ten",
        isLocked: false,
        words: [],
      },
    ],
  },
  {
    id: 2,
    order: 2,
    title: "Stage two",
    description: "",
    isLocked: true,
    image: null,
    color: "#ffffff",
    requiredScore: 10,
    levels: [
      {
        id: 20,
        order: 1,
        title: "Level twenty",
        isLocked: true,
        words: [],
      },
    ],
  },
];

const deferred = <T>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

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

describe("game progress hydration after a total local miss", () => {
  it("restores remote-only Counting progress before returning", async () => {
    const remoteProgress: CountingGameProgress = {
      unlockedStages: [1, 2],
      currentStage: 2,
      totalScore: 45,
      lastPlayedLevel: { 1: 3, 2: 1 },
      completedStages: [1],
      playHistory: [{ date: "2026-07-11T00:00:00.000Z", score: 45 }],
      childId,
    };
    mockHydrateActivityProgressOnLocalMiss.mockResolvedValueOnce({
      score: 45,
      progress_payload: remoteProgress,
    });

    const restored = await loadCountingProgress(childId, "nyn", [1, 2]);

    expect(restored).toEqual(remoteProgress);
    expect(mockHydrateActivityProgressOnLocalMiss).toHaveBeenCalledWith(
      childId,
      "nyn",
      "counting",
    );
    expect(mockUpdateActivityProgress).toHaveBeenCalledWith(
      childId,
      "nyn",
      "counting",
      expect.objectContaining({ score: 45 }),
      { markDirty: false },
    );
  });

  it("restores remote-only Word progress before returning", async () => {
    const remoteProgress: WordGameProgress = {
      unlockedLevels: [0, 1, 2],
      currentLevel: 2,
      completedLevels: [0, 1],
      totalScore: 20,
      playHistory: [
        {
          date: "2026-07-11T00:00:00.000Z",
          levelCompleted: 1,
          word: "agandi",
        },
      ],
      childId,
    };
    mockHydrateActivityProgressOnLocalMiss.mockResolvedValueOnce({
      score: 20,
      progress_payload: remoteProgress,
    });

    const restored = await loadWordProgress(childId, "nyn", 3);

    expect(restored).toEqual(remoteProgress);
    expect(mockHydrateActivityProgressOnLocalMiss).toHaveBeenCalledWith(
      childId,
      "nyn",
      "words",
    );
    expect(mockUpdateActivityProgress).toHaveBeenCalledWith(
      childId,
      "nyn",
      "words",
      expect.objectContaining({ score: 20 }),
      { markDirty: false },
    );
  });

  it("restores remote-only legacy Learning progress before returning", async () => {
    mockHydrateActivityProgressOnLocalMiss.mockResolvedValueOnce({
      score: 70,
      progress_payload: {
        totalScore: 70,
        completedLevels: [10],
        stages: [
          { ...stages[0], isLocked: false },
          { ...stages[1], isLocked: false },
        ],
        userStats: {
          ...DEFAULT_USER_STATS,
          totalWords: 8,
          correctAnswers: 7,
        },
      },
    });

    const restored = await loadLearningProgress(childId, "nyn", stages);

    expect(restored.totalScore).toBe(70);
    expect(restored.completedLevels).toEqual([10]);
    expect(restored.stages[1].isLocked).toBe(false);
    expect(restored.userStats.totalWords).toBe(8);
    expect(mockHydrateActivityProgressOnLocalMiss).toHaveBeenCalledWith(
      childId,
      "nyn",
      "learning",
    );
    expect(mockUpdateActivityProgress).toHaveBeenCalledWith(
      childId,
      "nyn",
      "learning",
      expect.objectContaining({ score: 70 }),
      { markDirty: false },
    );
  });

  it("does not expose or persist Word defaults while hydration is delayed", async () => {
    const hydration = deferred<{ progress_payload: WordGameProgress } | null>();
    const remoteProgress: WordGameProgress = {
      unlockedLevels: [0, 1],
      currentLevel: 1,
      completedLevels: [0],
      totalScore: 10,
      playHistory: [],
      childId,
    };
    mockHydrateActivityProgressOnLocalMiss.mockReturnValueOnce(hydration.promise);
    let settled = false;
    const loading = loadWordProgress(childId, "nyn", 2).then((progress) => {
      settled = true;
      return progress;
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(settled).toBe(false);
    expect(mockUpdateActivityProgress).not.toHaveBeenCalled();
    expect(await AsyncStorage.getItem(`@BabySteps:WordGame:${childId}:nyn`)).toBeNull();

    hydration.resolve({ progress_payload: remoteProgress });
    await expect(loading).resolves.toEqual(remoteProgress);
    expect(mockUpdateActivityProgress).toHaveBeenCalledWith(
      childId,
      "nyn",
      "words",
      expect.any(Object),
      { markDirty: false },
    );
  });

  it("opens with defaults after failed, unauthenticated, or timed-out hydration without saving them", async () => {
    const warnSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      mockHydrateActivityProgressOnLocalMiss
        .mockResolvedValueOnce(null)
        .mockRejectedValueOnce(new Error("hydration failed"))
        .mockResolvedValueOnce(null);

      await expect(loadCountingProgress(childId, "nyn", [1, 2])).resolves.toEqual(
        createDefaultCountingProgress(childId, 1),
      );
      await expect(loadWordProgress(childId, "nyn", 2)).resolves.toEqual(
        createDefaultWordProgress(childId),
      );
      await expect(loadLearningProgress(childId, "nyn", stages)).resolves.toEqual(
        expect.objectContaining({ totalScore: 0, completedLevels: [] }),
      );

      expect(mockUpdateActivityProgress).not.toHaveBeenCalled();
      expect(await AsyncStorage.getItem(`@BabySteps:CountingGame:${childId}:nyn`)).toBeNull();
      expect(await AsyncStorage.getItem(`@BabySteps:WordGame:${childId}:nyn`)).toBeNull();
      expect(await AsyncStorage.getItem(`learning_total_score_${childId}_nyn`)).toBeNull();
    } finally {
      warnSpy.mockRestore();
    }
  });
});

describe("game progress child and language isolation", () => {
  it("does not read another child's game-specific progress", async () => {
    await AsyncStorage.setItem(
      "@BabySteps:CountingGame:child-a:nyn",
      JSON.stringify({
        ...createDefaultCountingProgress("child-a", 1),
        totalScore: 99,
      }),
    );

    const progress = await loadCountingProgress("child-b", "nyn", [1]);

    expect(progress).toEqual(createDefaultCountingProgress("child-b", 1));
    expect(mockHydrateActivityProgressOnLocalMiss).toHaveBeenCalledWith(
      "child-b",
      "nyn",
      "counting",
    );
  });

  it("never reads Luganda legacy fallbacks for Runyankole", async () => {
    await AsyncStorage.multiSet([
      [
        `@BabySteps:CountingGame:${childId}`,
        JSON.stringify({
          ...createDefaultCountingProgress(childId, 1),
          totalScore: 91,
        }),
      ],
      [
        `@BabySteps:WordGame:${childId}`,
        JSON.stringify({
          ...createDefaultWordProgress(childId),
          totalScore: 92,
        }),
      ],
      [`luganda_total_score_${childId}`, "93"],
      [`luganda_completed_levels_${childId}`, JSON.stringify([10])],
      [`luganda_stages_${childId}`, JSON.stringify(stages)],
      [`luganda_user_stats_${childId}`, JSON.stringify(DEFAULT_USER_STATS)],
    ]);

    const counting = await loadCountingProgress(childId, "nyn", [1]);
    const words = await loadWordProgress(childId, "nyn", 2);
    const learning = await loadLearningProgress(childId, "nyn", stages);

    expect(counting.totalScore).toBe(0);
    expect(words.totalScore).toBe(0);
    expect(learning.totalScore).toBe(0);
    expect(mockHydrateActivityProgressOnLocalMiss.mock.calls).toEqual(
      expect.arrayContaining([
        [childId, "nyn", "counting"],
        [childId, "nyn", "words"],
        [childId, "nyn", "learning"],
      ]),
    );
  });

  it("preserves the explicit legacy fallback for Luganda", async () => {
    const legacyProgress = {
      ...createDefaultWordProgress(childId),
      unlockedLevels: [0, 1],
      completedLevels: [0],
      currentLevel: 1,
      totalScore: 10,
    };
    await AsyncStorage.setItem(
      `@BabySteps:WordGame:${childId}`,
      JSON.stringify(legacyProgress),
    );
    mockGetActivityProgress.mockResolvedValueOnce({ child_id: childId });

    await expect(loadWordProgress(childId, "lg", 2)).resolves.toEqual(legacyProgress);
    expect(mockHydrateActivityProgressOnLocalMiss).not.toHaveBeenCalled();
  });
});
