import AsyncStorage from "@react-native-async-storage/async-storage"
import React from "react"
import { View } from "react-native"
import renderer, { act } from "react-test-renderer"

import {
  resetGameTourAutomaticOpenAttempts,
  useGameTour,
} from "@/components/games/GameTour"
import { getGameGuideStorageKey, type GameGuideId } from "@/lib/gameGuide"

type TourState = ReturnType<typeof useGameTour>

let latestTour: TourState | undefined

function TourStateHarness({
  childId = "child-1",
  enabled = true,
  guideId = "word",
}: {
  childId?: string
  enabled?: boolean
  guideId?: GameGuideId
}) {
  latestTour = useGameTour(guideId, childId, enabled)
  return <View />
}

const renderTourState = async (props?: React.ComponentProps<typeof TourStateHarness>) => {
  let tree: renderer.ReactTestRenderer | undefined

  await act(async () => {
    tree = renderer.create(<TourStateHarness {...props} />)
    await Promise.resolve()
    await Promise.resolve()
  })

  return tree!
}

describe("shared game tour state", () => {
  beforeEach(async () => {
    latestTour = undefined
    jest.clearAllMocks()
    resetGameTourAutomaticOpenAttempts()
    await AsyncStorage.clear()
  })

  it("opens an unseen tour and stores completion per child and guide", async () => {
    const tree = await renderTourState()

    expect(latestTour?.visible).toBe(true)

    await act(async () => {
      latestTour?.complete()
      await Promise.resolve()
    })

    expect(latestTour?.visible).toBe(false)
    expect(
      await AsyncStorage.getItem(getGameGuideStorageKey("word", "child-1")),
    ).toBe("seen")

    act(() => tree.unmount())
  })

  it("suppresses automatic opening after a storage read failure but keeps Help available", async () => {
    const warning = jest.spyOn(console, "warn").mockImplementation(() => undefined)
    ;(AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(
      new Error("storage unavailable"),
    )

    const tree = await renderTourState()

    expect(latestTour?.visible).toBe(false)
    expect(warning).toHaveBeenCalledWith(
      "Could not load the word tour status:",
      expect.any(Error),
    )

    act(() => latestTour?.open())
    expect(latestTour?.visible).toBe(true)

    warning.mockRestore()
    act(() => tree.unmount())
  })

  it("closes normally when saving seen state fails", async () => {
    const warning = jest.spyOn(console, "warn").mockImplementation(() => undefined)
    const tree = await renderTourState()
    ;(AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(
      new Error("storage unavailable"),
    )

    await act(async () => {
      latestTour?.complete()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(latestTour?.visible).toBe(false)
    expect(warning).toHaveBeenCalledWith(
      "Could not save the word tour status:",
      expect.any(Error),
    )

    warning.mockRestore()
    act(() => tree.unmount())
  })

  it("keeps unavailable closure retryable but persists an intentional dismissal", async () => {
    const tree = await renderTourState()

    act(() => latestTour?.close())
    expect(latestTour?.visible).toBe(false)
    expect(
      await AsyncStorage.getItem(getGameGuideStorageKey("word", "child-1")),
    ).toBeNull()

    act(() => latestTour?.open())
    await act(async () => {
      latestTour?.dismiss()
      await Promise.resolve()
    })

    expect(latestTour?.visible).toBe(false)
    expect(
      await AsyncStorage.getItem(getGameGuideStorageKey("word", "child-1")),
    ).toBe("seen")

    act(() => tree.unmount())
  })

  it("does not automatically reopen an unavailable tour when its screen is focused again", async () => {
    const tree = await renderTourState()

    expect(latestTour?.visible).toBe(true)
    act(() => latestTour?.close())
    expect(latestTour?.visible).toBe(false)

    await act(async () => {
      tree.update(<TourStateHarness enabled={false} />)
      await Promise.resolve()
    })
    await act(async () => {
      tree.update(<TourStateHarness enabled />)
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(latestTour?.visible).toBe(false)

    act(() => tree.unmount())
    const remountedTree = await renderTourState()
    expect(latestTour?.visible).toBe(false)

    act(() => latestTour?.open())
    expect(latestTour?.visible).toBe(true)

    act(() => remountedTree.unmount())
  })
})
