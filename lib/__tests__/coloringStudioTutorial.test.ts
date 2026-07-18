import AsyncStorage from "@react-native-async-storage/async-storage"

import {
  getColoringStudioTutorialStorageKey,
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

  it("keeps tutorial state separate for each child", async () => {
    expect(await hasSeenColoringStudioTutorial("child-1")).toBe(false)
    expect(await markColoringStudioTutorialSeen("child-1")).toBe(true)
    expect(
      await AsyncStorage.getItem(
        getColoringStudioTutorialStorageKey("child-1"),
      ),
    ).toBe("seen")
    expect(await hasSeenColoringStudioTutorial("child-1")).toBe(true)
    expect(await hasSeenColoringStudioTutorial("child-2")).toBe(false)
  })

  it("uses a safe guest key when no child is active", () => {
    expect(getColoringStudioTutorialStorageKey()).toBe(
      "@baby_steps_coloring_studio_tutorial_v2:guest",
    )
  })

  it("encodes child IDs before using them in storage keys", () => {
    expect(getColoringStudioTutorialStorageKey("child/profile 1")).toBe(
      "@baby_steps_coloring_studio_tutorial_v2:child%2Fprofile%201",
    )
  })

  it("fails open when tutorial storage cannot be read", async () => {
    const warning = jest.spyOn(console, "warn").mockImplementation(() => undefined)
    ;(AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error("storage unavailable"))

    expect(await hasSeenColoringStudioTutorial("child-1")).toBe(true)
    expect(warning).toHaveBeenCalledWith(
      "Could not load coloring tutorial status:",
      expect.any(Error),
    )
    warning.mockRestore()
  })
})
