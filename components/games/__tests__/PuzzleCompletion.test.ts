import {
  completePuzzleLocallyFirst,
  runPuzzleAnimationCompletion,
} from "../PuzzleGameComponent";
import type { PuzzleGameProgress } from "../utils/progressManagerPuzzleGame";

jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock",
  ),
);

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
