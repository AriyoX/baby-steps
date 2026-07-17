import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  CardGameStatsSaveError,
  clearGameState,
  incrementGamesPlayed,
  loadGameState,
  saveGameState,
} from "../progressManagerCardGame";
import {
  loadPuzzleProgress,
  savePuzzleProgress,
} from "../progressManagerPuzzleGame";

jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock",
  ),
);

describe("Cards and Puzzle progress manager write failures", () => {
  let errorSpy: jest.SpyInstance;

  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it("propagates the attempted card stats when their write fails", async () => {
    const error = new Error("storage full");
    (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(error);

    await expect(incrementGamesPlayed("child-1")).rejects.toMatchObject({
      name: "CardGameStatsSaveError",
      attemptedStats: {
        gamesPlayed: 1,
        totalPairsMatched: 0,
      },
      originalError: error,
    } satisfies Partial<CardGameStatsSaveError>);
  });

  it("propagates card game-state and clear failures", async () => {
    const saveError = new Error("save failed");
    const clearError = new Error("clear failed");
    (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(saveError);
    (AsyncStorage.removeItem as jest.Mock).mockRejectedValueOnce(clearError);

    await expect(
      saveGameState(
        {
          childId: "child-1",
          gameStartTime: 10,
          matchedValues: ["Kabaka"],
          moves: 1,
        },
        "child-1",
      ),
    ).rejects.toBe(saveError);
    await expect(clearGameState("child-1")).rejects.toBe(clearError);
  });

  it("propagates Puzzle progress write failure", async () => {
    const error = new Error("puzzle save failed");
    (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(error);

    await expect(
      savePuzzleProgress(
        {
          childId: "child-1",
          completedPuzzleIds: [1],
          totalGamesPlayed: 1,
        },
        "child-1",
      ),
    ).rejects.toBe(error);
  });

  it("does not restore Cards or Puzzle progress from an older content revision", async () => {
    await saveGameState(
      {
        childId: "child-1",
        gameStartTime: 10,
        matchedValues: ["Webale"],
        moves: 1,
      },
      "child-1",
      "lg",
      "card_game/cards#1",
    );
    await savePuzzleProgress(
      {
        childId: "child-1",
        completedPuzzleIds: [1],
        totalGamesPlayed: 1,
      },
      "child-1",
      "lg",
      "puzzle_game/puzzles#1",
    );

    await expect(
      loadGameState("child-1", "lg", "card_game/cards#2"),
    ).resolves.toBeNull();
    await expect(
      loadPuzzleProgress("child-1", "lg", "puzzle_game/puzzles#2"),
    ).resolves.toEqual(
      expect.objectContaining({
        completedPuzzleIds: [],
        totalGamesPlayed: 0,
        contentRevision: "puzzle_game/puzzles#2",
      }),
    );
  });
});
