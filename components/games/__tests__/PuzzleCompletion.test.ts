import {
  completePuzzleLocallyFirst,
  getPlayablePuzzleDefinitions,
  runPuzzleAnimationCompletion,
} from "../PuzzleGameComponent";
import type { PuzzleGameDefinition } from "@/content/contentRepository";
import type { PuzzleGameProgress } from "../utils/progressManagerPuzzleGame";

jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock",
  ),
);

jest.mock("@/content/contentRepository", () => ({
  loadContentBundle: jest.fn(),
  resolveImageSource: jest.fn((image: unknown) => image),
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ back: jest.fn() }),
}));

jest.mock("@/context/ChildContext", () => ({
  useChild: () => ({ activeChild: null }),
}));

jest.mock("@/context/ChildNoticeContext", () => ({
  useChildNotice: () => ({ enqueueAchievementUnlocked: jest.fn() }),
}));

jest.mock("../achievements/useAchievements", () => ({
  useAchievements: () => ({
    isLoadingAchievements: false,
    checkAndGrantNewAchievements: jest.fn().mockResolvedValue([]),
  }),
}));

jest.mock("@/lib/audioManager", () => ({
  audioManager: {
    createAppSound: jest.fn().mockResolvedValue(null),
    replayAppSound: jest.fn().mockResolvedValue(undefined),
    unloadAppSound: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock("@/lib/utils", () => ({
  saveActivity: jest.fn().mockResolvedValue(true),
}));

const progress: PuzzleGameProgress = {
  childId: "child-1",
  completedPuzzleIds: [1],
  totalGamesPlayed: 2,
};

const puzzleDefinitions = (): PuzzleGameDefinition[] => [
  {
    description: "Third puzzle",
    id: 3,
    image: "puzzles/third.jpg",
    name: "Third",
    order: 3,
  },
  {
    description: "First puzzle",
    id: 1,
    image: "puzzles/first.jpg",
    name: "First",
    order: 1,
  },
  {
    description: "Second puzzle",
    id: 2,
    image: "puzzles/second.jpg",
    name: "Second",
    order: 2,
  },
];

describe("Puzzle database payload validation", () => {
  it("orders valid database puzzles while preserving numeric progress IDs", () => {
    const definitions = puzzleDefinitions();

    const playable = getPlayablePuzzleDefinitions(definitions);

    expect(playable?.map((puzzle) => puzzle.id)).toEqual([1, 2, 3]);
    expect(definitions.map((puzzle) => puzzle.id)).toEqual([3, 1, 2]);
  });

  it("rejects empty, duplicate-ID, and invalid-image payloads", () => {
    expect(getPlayablePuzzleDefinitions([])).toBeUndefined();

    const duplicate = puzzleDefinitions();
    duplicate[1] = { ...duplicate[1], id: duplicate[0].id };
    expect(getPlayablePuzzleDefinitions(duplicate)).toBeUndefined();

    const invalidImage = puzzleDefinitions();
    invalidImage[0] = { ...invalidImage[0], image: "" };
    expect(getPlayablePuzzleDefinitions(invalidImage)).toBeUndefined();
  });
});

describe("Puzzle completion reliability", () => {
  it("makes local save failure observable while keeping UI and detached work non-blocking", async () => {
    const error = new Error("storage unavailable");
    const revealCompletion = jest.fn();
    const onLocalError = jest.fn();
    const saveCompletionActivity = jest.fn().mockResolvedValue(true);
    const evaluateAchievements = jest.fn().mockResolvedValue(undefined);

    const result = await completePuzzleLocallyFirst({
      progress,
      persistProgress: async () => {
        throw error;
      },
      revealCompletion,
      saveCompletionActivity,
      evaluateAchievements,
      onLocalError,
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(result).toEqual({
      value: progress,
      persistence: { persisted: false, error },
    });
    expect(onLocalError).toHaveBeenCalledWith(error);
    expect(revealCompletion).toHaveBeenCalledWith(
      progress,
      { persisted: false, error },
    );
    expect(saveCompletionActivity).toHaveBeenCalledWith(
      progress,
      { persisted: false, error },
    );
    expect(evaluateAchievements).toHaveBeenCalledWith(
      progress,
      { persisted: false, error },
    );
  });

  it("handles a rejected animation completion promise explicitly", async () => {
    const error = new Error("completion failed");
    const commitAnimatedMove = jest.fn();
    const onError = jest.fn();

    runPuzzleAnimationCompletion(
      true,
      () => true,
      commitAnimatedMove,
      async () => {
        throw error;
      },
      onError,
    );
    await Promise.resolve();
    await Promise.resolve();

    expect(commitAnimatedMove).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(error);
  });

  it("does not commit or complete an animation after unmount", async () => {
    const commitAnimatedMove = jest.fn();
    const checkCompletion = jest.fn().mockResolvedValue(undefined);

    runPuzzleAnimationCompletion(
      true,
      () => false,
      commitAnimatedMove,
      checkCompletion,
      jest.fn(),
    );
    await Promise.resolve();

    expect(commitAnimatedMove).not.toHaveBeenCalled();
    expect(checkCompletion).not.toHaveBeenCalled();
  });
});
