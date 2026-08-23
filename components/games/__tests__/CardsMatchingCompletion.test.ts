import {
  buildCardsMatchingCompletionData,
  completeCardsMatchingGameLocallyFirst,
  getPlayableCardGameContent,
  persistCardsMatchingPairLocallyFirst,
} from "../CardsMatchingComponent";
import type { CardGameContent } from "@/content/contentRepository";
import { runCompletionOnce } from "@/lib/completionReliability";
import {
  CardGameStatsSaveError,
  type CardGameOverallStats,
  type CardGameState,
} from "../utils/progressManagerCardGame";

jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock",
  ),
);

jest.mock("@/content/contentRepository", () => ({
  loadContentBundle: jest.fn(),
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
    playAppSound: jest.fn(),
  },
}));

jest.mock("@/lib/utils", () => ({
  saveActivity: jest.fn().mockResolvedValue(true),
}));

const deferred = <T = void>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, reject, resolve };
};

const gameState: CardGameState = {
  childId: "child-1",
  gameStartTime: 100,
  matchedValues: ["Kabaka"],
  moves: 1,
};

const overallStats: CardGameOverallStats = {
  gamesPlayed: 2,
  totalPairsMatched: 9,
};

const cardContent = (): CardGameContent => ({
  title: "Database Cards",
  items: Array.from({ length: 8 }, (_, index) => ({
    id: `card-${index + 1}`,
    imageSymbol: "⭐",
    info: `Card ${index + 1} information`,
    order: 8 - index,
    value: `Value ${index + 1}`,
  })),
});

describe("Cards Matching database payload validation", () => {
  it("orders valid database items without changing their stable values", () => {
    const content = cardContent();

    const playable = getPlayableCardGameContent(content);

    expect(playable?.title).toBe("Database Cards");
    expect(playable?.items.map((item) => item.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(new Set(playable?.items.map((item) => item.value)).size).toBe(8);
    expect(content.items[0].order).toBe(8);
  });

  it("rejects undersized and duplicate-value payloads before a game starts", () => {
    const tooSmall = cardContent();
    tooSmall.items.pop();
    expect(getPlayableCardGameContent(tooSmall)).toBeUndefined();

    const duplicated = cardContent();
    duplicated.items[1] = {
      ...duplicated.items[1],
      value: duplicated.items[0].value,
    };
    expect(getPlayableCardGameContent(duplicated)).toBeUndefined();
  });
});

describe("Cards Matching local-first completion", () => {
  it("persists pair stats and resumable state before delayed achievement work", async () => {
    const achievement = deferred();
    const timeline: string[] = [];

    const result = await persistCardsMatchingPairLocallyFirst({
      gameState,
      persistPairStats: async () => {
        timeline.push("local-pair-stats");
        return overallStats;
      },
      persistGameState: async () => {
        timeline.push("local-game-state");
      },
      revealPersistedPair: () => {
        timeline.push("pair-ui");
      },
      evaluateAchievements: async () => {
        timeline.push("achievement");
        await achievement.promise;
      },
    });

    expect(result).toEqual({
      value: { gameState, overallStats },
      persistence: { persisted: true },
    });
    expect(timeline).toEqual([
      "local-pair-stats",
      "local-game-state",
      "pair-ui",
      "achievement",
    ]);

    achievement.resolve();
    await achievement.promise;
  });

  it("reports local pair failure while revealing the candidate and continuing best-effort work", async () => {
    const attemptedStats = { gamesPlayed: 2, totalPairsMatched: 10 };
    const localError = new Error("storage full");
    const onLocalError = jest.fn();
    const revealPersistedPair = jest.fn();
    const evaluateAchievements = jest.fn().mockResolvedValue(undefined);

    const result = await persistCardsMatchingPairLocallyFirst({
      gameState,
      persistPairStats: async () => {
        throw new CardGameStatsSaveError(attemptedStats, localError);
      },
      persistGameState: jest.fn(),
      revealPersistedPair,
      evaluateAchievements,
      onLocalError,
    });

    expect(result.value).toEqual({ gameState, overallStats: attemptedStats });
    expect(result.persistence).toEqual({
      persisted: false,
      error: expect.any(CardGameStatsSaveError),
    });
    expect(onLocalError).toHaveBeenCalledTimes(1);
    expect(revealPersistedPair).toHaveBeenCalledWith(
      { gameState, overallStats: attemptedStats },
      expect.objectContaining({ persisted: false }),
    );
    expect(evaluateAchievements).toHaveBeenCalledWith(
      { gameState, overallStats: attemptedStats },
      expect.objectContaining({ persisted: false }),
    );
  });

  it("persists and reveals final completion before remote work settles", async () => {
    const activity = deferred();
    const achievement = deferred();
    const timeline: string[] = [];

    const result = await completeCardsMatchingGameLocallyFirst({
      persistGamesPlayed: async () => {
        timeline.push("local-games-played");
        return overallStats;
      },
      clearPersistedGame: async () => {
        timeline.push("local-clear");
      },
      revealCompletion: () => {
        timeline.push("game-over-ui");
      },
      evaluateAchievements: async () => {
        timeline.push("achievement");
        await achievement.promise;
      },
      saveCompletionActivity: async () => {
        timeline.push("activity");
        await activity.promise;
      },
    });

    expect(result).toEqual({
      value: overallStats,
      persistence: { persisted: true },
    });
    expect(timeline).toEqual([
      "local-games-played",
      "local-clear",
      "game-over-ui",
      "achievement",
      "activity",
    ]);

    achievement.resolve();
    activity.resolve();
    await Promise.all([achievement.promise, activity.promise]);
  });

  it("deduplicates rapid final callbacks across local, activity, achievement, and UI work", async () => {
    const lock = { current: null as Promise<void> | null };
    const persistGamesPlayed = jest.fn().mockResolvedValue(overallStats);
    const clearPersistedGame = jest.fn().mockResolvedValue(undefined);
    const revealCompletion = jest.fn();
    const evaluateAchievements = jest.fn().mockResolvedValue(undefined);
    const saveCompletionActivity = jest.fn().mockResolvedValue(true);
    const notice = jest.fn();

    const runCompletion = async () => {
      await completeCardsMatchingGameLocallyFirst({
        persistGamesPlayed,
        clearPersistedGame,
        revealCompletion,
        evaluateAchievements: async (...args) => {
          await evaluateAchievements(...args);
          notice();
        },
        saveCompletionActivity,
      });
    };

    const first = runCompletionOnce(lock, runCompletion);
    const second = runCompletionOnce(lock, runCompletion);

    expect(first).toBe(second);
    await Promise.all([first, second]);
    await Promise.resolve();
    await Promise.resolve();

    expect(persistGamesPlayed).toHaveBeenCalledTimes(1);
    expect(clearPersistedGame).toHaveBeenCalledTimes(1);
    expect(revealCompletion).toHaveBeenCalledTimes(1);
    expect(saveCompletionActivity).toHaveBeenCalledTimes(1);
    expect(evaluateAchievements).toHaveBeenCalledTimes(1);
    expect(notice).toHaveBeenCalledTimes(1);
  });

  it("uses the move that completes the game exactly once in all final payloads", () => {
    const completed = buildCardsMatchingCompletionData(
      "child-1",
      12,
      31,
      "2026-07-14T10:00:00.000Z",
      "Buganda Cultural Cards",
    );

    expect(completed.efficiency).toBe(75);
    expect(completed.achievementEvent.moves).toBe(12);
    expect(completed.activity.score).toBe("75%");
    expect(completed.activity.details).toBe(
      "Completed Buganda Cultural Cards matching game in 12 moves and 31 seconds",
    );
  });

  it.each(["activity", "achievement"] as const)(
    "keeps game over revealed when detached %s work rejects",
    async (rejectedWork) => {
      const rejected = deferred();
      const errorReported = deferred<unknown>();
      const revealCompletion = jest.fn();
      const onNetworkError = jest.fn();

      await expect(
        completeCardsMatchingGameLocallyFirst({
          persistGamesPlayed: async () => overallStats,
          clearPersistedGame: async () => undefined,
          revealCompletion,
          evaluateAchievements: () =>
            rejectedWork === "achievement" ? rejected.promise : Promise.resolve(),
          saveCompletionActivity: () =>
            rejectedWork === "activity" ? rejected.promise : Promise.resolve(),
          onNetworkError: (error) => {
            onNetworkError(error);
            errorReported.resolve(error);
          },
        }),
      ).resolves.toEqual({
        value: overallStats,
        persistence: { persisted: true },
      });

      rejected.reject(new Error("offline"));
      await errorReported.promise;

      expect(revealCompletion).toHaveBeenCalledWith(
        overallStats,
        { persisted: true },
      );
      expect(onNetworkError).toHaveBeenCalledWith(expect.any(Error));
    },
  );
});
