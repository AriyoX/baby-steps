import React from "react"
import renderer, { act } from "react-test-renderer"
import { Path as SvgPath } from "react-native-svg"

import {
  GAME_TOUR_LAYOUT,
  GameTour,
  GameTourProvider,
  TourTarget,
  type GameTourStep,
} from "@/components/games/GameTour"

jest.mock("react-native/Libraries/Utilities/useWindowDimensions", () => ({
  __esModule: true,
  default: () => ({
    fontScale: 1,
    height: 640,
    scale: 1,
    width: 360,
  }),
}))

jest.mock("react-native-safe-area-context", () => {
  const actual = jest.requireActual("react-native-safe-area-context")
  return {
    ...actual,
    useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }),
  }
})

type MeasureRect = { height: number; width: number; x: number; y: number }

const steps: GameTourStep[] = [
  {
    id: "first",
    targetId: "first-target",
    title: "First target",
    description: "The first step.",
  },
  {
    id: "second",
    targetId: "second-target",
    title: "Second target",
    description: "The second step.",
  },
]

const flushTargetMeasurement = async () => {
  await act(async () => {
    await Promise.resolve()
    await jest.advanceTimersByTimeAsync(150)
    await Promise.resolve()
  })
}

const renderTour = async (
  rects: Record<string, MeasureRect>,
  overrides?: Partial<React.ComponentProps<typeof GameTour>>,
) => {
  const onComplete = jest.fn()
  const onDismiss = jest.fn()
  const onUnavailable = jest.fn()
  let tree!: renderer.ReactTestRenderer

  await act(async () => {
    tree = renderer.create(
      <GameTourProvider>
        <TourTarget id="first-target">
          {React.createElement("TourTargetHost", { testID: "first-target" })}
        </TourTarget>
        <TourTarget id="second-target">
          {React.createElement("TourTargetHost", { testID: "second-target" })}
        </TourTarget>
        <GameTour
          onComplete={onComplete}
          onDismiss={onDismiss}
          onUnavailable={onUnavailable}
          steps={steps}
          visible
          {...overrides}
        />
      </GameTourProvider>,
      {
        createNodeMock: (element) => {
          const testID = (element.props as { testID?: string }).testID
          const rect = testID ? rects[testID] : undefined
          if (!rect) return null
          return {
            measureInWindow: (
              callback: (
                x: number,
                y: number,
                width: number,
                height: number,
              ) => void,
            ) => {
              callback(rect.x, rect.y, rect.width, rect.height)
            },
          }
        },
      },
    )
    await Promise.resolve()
  })

  return { onComplete, onDismiss, onUnavailable, tree }
}

describe("GameTour runtime target handling", () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.spyOn(console, "warn").mockImplementation(() => undefined)
  })

  afterEach(() => {
    jest.restoreAllMocks()
    jest.useRealTimers()
  })

  it("resets to a preparation overlay while measuring the next step", async () => {
    const { tree } = await renderTour({
      "first-target": { height: 60, width: 120, x: 20, y: 40 },
      "second-target": { height: 60, width: 120, x: 180, y: 120 },
    })

    await flushTargetMeasurement()
    const firstStepOutput = JSON.stringify(tree.toJSON())
    const backdrop = tree.root.findByType(SvgPath)
    expect(backdrop.props.fill).toBe(GAME_TOUR_LAYOUT.dimColor)
    expect(backdrop.props.fillOpacity).toBe(GAME_TOUR_LAYOUT.dimOpacity)
    expect(backdrop.props.fillRule).toBe("evenodd")
    expect(firstStepOutput).not.toContain("game-tour-spotlight-mask")
    expect(tree.root.findByProps({ accessibilityLabel: "Next tour step" })).toBeTruthy()

    act(() => {
      tree.root.findByProps({ accessibilityLabel: "Next tour step" }).props.onPress()
    })
    expect(
      tree.root.findByProps({ accessibilityLabel: "Preparing tour guide" }),
    ).toBeTruthy()

    await flushTargetMeasurement()
    expect(JSON.stringify(tree.toJSON())).toContain("Second target")

    act(() => tree.unmount())
  })

  it("reports an off-screen required target without completing the tour", async () => {
    const { onComplete, onUnavailable, tree } = await renderTour({
      "first-target": { height: 60, width: 120, x: 20, y: 5000 },
      "second-target": { height: 60, width: 120, x: 180, y: 120 },
    })

    await act(async () => {
      await Promise.resolve()
      await jest.runAllTimersAsync()
      await Promise.resolve()
    })

    expect(onUnavailable).toHaveBeenCalledWith(steps[0])
    expect(onComplete).not.toHaveBeenCalled()

    act(() => tree.unmount())
  })
})
