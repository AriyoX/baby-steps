import AsyncStorage from "@react-native-async-storage/async-storage"
import {
  buildColoringProgressAfterSave,
  EMPTY_COLORING_PROGRESS,
  recordColoringSave,
} from "../coloringProgress"

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
  },
}))

describe("coloring achievements", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(AsyncStorage.getItem as jest.Mock).mockResolvedValue(null)
    ;(AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined)
  })

  it("unlocks the first-save and color achievements together", () => {
    const result = buildColoringProgressAfterSave(
      EMPTY_COLORING_PROGRESS,
      "Friendly Cow",
      3,
      "2026-07-18T00:00:00.000Z",
    )

    expect(result.progress.savedArtworkCount).toBe(1)
    expect(result.newlyUnlockedIds).toEqual([
      "first-masterpiece",
      "color-explorer",
    ])
  })

  it("unlocks the gallery achievement after three different pages", () => {
    let progress = EMPTY_COLORING_PROGRESS
    for (const pageName of ["Cow", "Shapes", "Pattern Mask"]) {
      progress = buildColoringProgressAfterSave(progress, pageName, 1).progress
    }

    expect(progress.unlockedAchievementIds).toContain("gallery-star")
    expect(progress.savedArtworkCount).toBe(3)
    expect(progress.savedPages).toHaveLength(3)
  })

  it("does not announce an achievement that failed to persist", async () => {
    const warning = jest.spyOn(console, "warn").mockImplementation(() => undefined)
    ;(AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error("storage full"))

    try {
      const result = await recordColoringSave("child-1", "Friendly Cow", 3)

      expect(result.didPersist).toBe(false)
      expect(result.newlyUnlockedIds).toEqual([])
      expect(result.progress).toEqual(EMPTY_COLORING_PROGRESS)
    } finally {
      warning.mockRestore()
    }
  })

  it("returns newly unlocked achievements after progress is stored", async () => {
    const result = await recordColoringSave("child-1", "Friendly Cow", 3)

    expect(result.didPersist).toBe(true)
    expect(result.newlyUnlockedIds).toEqual(["first-masterpiece", "color-explorer"])
    expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1)
  })
})
