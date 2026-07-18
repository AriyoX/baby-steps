import AsyncStorage from "@react-native-async-storage/async-storage"

import {
  COLORING_STUDIO_TUTORIAL_KEY,
  hasSeenColoringStudioTutorial,
  markColoringStudioTutorialSeen,
} from "@/lib/coloringStudioTutorial"

jest.mock("@react-native-async-storage/async-storage", () => {
  const store = new Map<string, string>()
  return {
    __esModule: true,
    default: {
      clear: jest.fn(async () => store.clear()),
      getItem: jest.fn(async (key: string) => store.get(key) ?? null),
      setItem: jest.fn(async (key: string, value: string) => {
        store.set(key, value)
      }),
    },
  }
})

describe("coloring studio tutorial persistence", () => {
  beforeEach(async () => {
    jest.clearAllMocks()
    await AsyncStorage.clear()
  })

  it("is unseen until the child finishes or skips it", async () => {
    expect(await hasSeenColoringStudioTutorial()).toBe(false)
    expect(await markColoringStudioTutorialSeen()).toBe(true)
    expect(await AsyncStorage.getItem(COLORING_STUDIO_TUTORIAL_KEY)).toBe("seen")
    expect(await hasSeenColoringStudioTutorial()).toBe(true)
  })

  it("fails open when tutorial storage cannot be read", async () => {
    const warning = jest.spyOn(console, "warn").mockImplementation(() => undefined)
    ;(AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error("storage unavailable"))

    expect(await hasSeenColoringStudioTutorial()).toBe(true)
    expect(warning).toHaveBeenCalledWith(
      "Could not load coloring tutorial status:",
      expect.any(Error),
    )
    warning.mockRestore()
  })
})
