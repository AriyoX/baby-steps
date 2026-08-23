import React from "react"
import { Animated, TouchableOpacity } from "react-native"
import renderer, { act } from "react-test-renderer"

import CountingGame from "../../CountingGameComponent"

const mockRouterBack = jest.fn()
const mockLoadContentBundle = jest.fn()
const mockLoadCountingProgress = jest.fn()
const mockSaveCountingProgress = jest.fn()
const mockSaveActivity = jest.fn()
const mockSyncProgressNow = jest.fn()
const mockRecordQualifiedStreakActivity = jest.fn()
const mockCheckAndGrantNewAchievements = jest.fn()
const mockTap = jest.fn()

jest.mock("expo-router", () => ({
  useRouter: () => ({ back: mockRouterBack }),
}))

jest.mock("expo-status-bar", () => ({ StatusBar: "StatusBar" }))

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }),
}))

jest.mock("@/context/ChildContext", () => ({
  useChild: () => ({
    activeChild: {
      id: "child-1",
      name: "Ayo",
      selected_language_code: "lg",
    },
  }),
}))

const translations: Record<string, string> = {
  "common.done": "Done",
  "common.great": "Great",
  "common.correct": "Correct",
  "common.levels": "Levels",
  "common.locked": "Locked",
  "common.next": "Next",
  "common.retry": "Try again",
  "common.score": "Score",
  "common.start": "Start",
  "games.chooseAnotherLevel": "Choose another level",
  "games.countPictures": "Count the pictures",
  "games.countedRange": "Counted {min} to {max}",
  "games.howMany": "How many?",
  "games.levelProgress": "Stage {stage}, level {level} of {total}",
  "games.nextStage": "Next stage",
  "games.stageDone": "Stage {stage} done!",
  "learning.chooseLevel": "Pick a level",
  "learning.chooseStage": "Pick a stage",
  "learning.current": "Current",
  "learning.level": "Level",
  "learning.stage": "Stage",
}

jest.mock("@/context/ChildUiLanguageContext", () => ({
  useChildUiLanguage: () => ({
    t: (key: string, values?: Record<string, string | number>) => {
      let value = translations[key] ?? key
      Object.entries(values ?? {}).forEach(([name, replacement]) => {
        value = value.replace(`{${name}}`, String(replacement))
      })
      return value
    },
  }),
}))

jest.mock("@/context/ChildNoticeContext", () => ({
  useChildNotice: () => ({ enqueueAchievementUnlocked: jest.fn() }),
}))

jest.mock("@/content/contentRepository", () => ({
  loadContentBundle: (...args: unknown[]) => mockLoadContentBundle(...args),
  resolveImageSource: () => ({ uri: "test-image" }),
}))

jest.mock("@/content/imagePreloader", () => ({
  preloadContentBundleImages: jest.fn().mockResolvedValue(undefined),
}))

jest.mock("@/components/common/CachedImage", () => {
  const { View: MockView } = jest.requireActual("react-native")
  return {
    CachedImage: (props: Record<string, unknown>) => <MockView {...props} />,
  }
})

jest.mock("@/components/child/ChildLoadingState", () => {
  const { Text: MockText } = jest.requireActual("react-native")
  return { ChildLoadingState: () => <MockText>Loading</MockText> }
})

jest.mock("@/components/child/ComingSoonState", () => {
  const { Text: MockText } = jest.requireActual("react-native")
  return {
    ComingSoonState: ({ title }: { title: string }) => <MockText>{title}</MockText>,
  }
})

jest.mock("../../utils/progressManagerCountingGame", () => {
  const actual = jest.requireActual("../../utils/progressManagerCountingGame")
  return {
    ...actual,
    loadGameProgress: (...args: unknown[]) => mockLoadCountingProgress(...args),
    saveGameProgress: (...args: unknown[]) => mockSaveCountingProgress(...args),
  }
})

jest.mock("../../achievements/useAchievements", () => ({
  useAchievements: () => ({
    checkAndGrantNewAchievements: (...args: unknown[]) =>
      mockCheckAndGrantNewAchievements(...args),
  }),
}))

jest.mock("@/lib/utils", () => ({
  saveActivity: (...args: unknown[]) => mockSaveActivity(...args),
}))

jest.mock("@/lib/progressRepository", () => ({
  syncProgressNow: (...args: unknown[]) => mockSyncProgressNow(...args),
}))

jest.mock("@/lib/streakRepository", () => ({
  recordQualifiedStreakActivity: (...args: unknown[]) =>
    mockRecordQualifiedStreakActivity(...args),
}))

jest.mock("@/lib/childHaptics", () => ({
  childHaptics: {
    error: jest.fn(),
    success: jest.fn(),
    tap: (...args: unknown[]) => mockTap(...args),
  },
}))

jest.mock("@/lib/audioManager", () => ({
  audioManager: { unloadAppSound: jest.fn().mockResolvedValue(undefined) },
}))

jest.mock("../../utils/audioManager", () => ({
  playWordAudio: jest.fn().mockResolvedValue(undefined),
}))

jest.mock("../../GameTour", () => {
  const {
    Text: MockText,
    TouchableOpacity: MockTouchableOpacity,
    View: MockView,
  } = jest.requireActual("react-native")
  return {
  GameHeader: ({
    onBack,
    subtitle,
    title,
  }: {
    onBack: () => void
    subtitle: string
    title: string
  }) => (
    <MockView testID="counting-game-header">
      <MockTouchableOpacity testID="counting-game-back" onPress={onBack} />
      <MockText>{title}</MockText>
      <MockText>{subtitle}</MockText>
    </MockView>
  ),
  GameStatChip: ({ label }: { label: string }) => <MockText>{label}</MockText>,
  GameTour: () => null,
  GameTourProvider: ({ children }: { children: React.ReactNode }) => children,
  TourTarget: ({ children }: { children: React.ReactNode }) => children,
  useGameTour: () => ({
    close: jest.fn(),
    complete: jest.fn(),
    dismiss: jest.fn(),
    open: jest.fn(),
    visible: false,
  }),
  }
})

const stages = [
  {
    description: "Count one and two",
    id: 10,
    levels: 2,
    numbersRange: { min: 1, max: 2 },
    order: 1,
    title: "Stage One",
    useBunches: false,
    usesCurrency: false,
  },
  {
    description: "Count again",
    id: 20,
    levels: 1,
    numbersRange: { min: 1, max: 1 },
    order: 2,
    title: "Stage Two",
    useBunches: false,
    usesCurrency: false,
  },
]

const initialProgress = {
  childId: "child-1",
  completedLevelsByStage: {},
  completedStages: [],
  currentStage: 10,
  lastPlayedLevel: { 10: 1 },
  playHistory: [],
  totalScore: 0,
  unlockedStages: [10],
}

const flush = async () => {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}

const textContent = (node: renderer.ReactTestInstance): string =>
  node.children
    .map((child) =>
      typeof child === "string"
        ? child
        : typeof child === "number"
          ? String(child)
          : textContent(child),
    )
    .join("")

const findAnswerButton = (
  tree: renderer.ReactTestRenderer,
  answer: number,
) => {
  const button = tree.root.findAllByType(TouchableOpacity).find(
    (candidate) =>
      typeof candidate.props.className === "string" &&
      candidate.props.className.includes("w-16 h-16") &&
      textContent(candidate).includes(String(answer)),
  )
  if (!button) throw new Error(`Could not find answer ${answer}`)
  return button
}

beforeEach(() => {
  jest.useFakeTimers()
  jest.clearAllMocks()
  mockLoadContentBundle.mockResolvedValue({
    bundle: {
      countingGame: {
        culturalItems: [{ id: "coin", image: "coin.png", name: "coin", order: 1 }],
        currency: [],
        numbers: [
          { number: 1, order: 1, targetText: "one" },
          { number: 2, order: 2, targetText: "two" },
        ],
        stages,
        title: "Counting Game",
      },
      progressRevisions: { counting_game: "counting#1" },
    },
    languageCode: "lg",
    source: "test",
  })
  mockLoadCountingProgress.mockResolvedValue(initialProgress)
  mockSaveCountingProgress.mockResolvedValue(undefined)
  mockSaveActivity.mockResolvedValue(true)
  mockSyncProgressNow.mockResolvedValue({ failed: 0, pushed: 1, skipped: 0 })
  mockRecordQualifiedStreakActivity.mockResolvedValue(undefined)
  mockCheckAndGrantNewAchievements.mockResolvedValue([])
  let randomCall = 0
  jest.spyOn(Math, "random").mockImplementation(() => {
    randomCall += 1
    return randomCall % 2 === 0 ? 0.99 : 0
  })
  jest.spyOn(Animated, "timing").mockReturnValue({
    start: (callback?: () => void) => callback?.(),
    stop: jest.fn(),
  } as never)
  jest.spyOn(Animated, "spring").mockReturnValue({
    start: (callback?: () => void) => callback?.(),
    stop: jest.fn(),
  } as never)
  jest.spyOn(Animated, "sequence").mockReturnValue({
    start: (callback?: () => void) => callback?.(),
    stop: jest.fn(),
  } as never)
})

afterEach(() => {
  jest.useRealTimers()
  jest.restoreAllMocks()
})

describe("Counting Game selection flow", () => {
  it("opens level selection once, starts the exact level once, and completes once", async () => {
    let tree!: renderer.ReactTestRenderer
    await act(async () => {
      tree = renderer.create(<CountingGame />)
      await flush()
    })

    const stageButton = tree.root.findAllByType(TouchableOpacity).find(
      (candidate) => candidate.props.accessibilityLabel?.startsWith("Stage One."),
    )
    const lockedStage = tree.root.findAllByType(TouchableOpacity).find(
      (candidate) => candidate.props.accessibilityLabel?.startsWith("Stage Two."),
    )
    expect(stageButton).toBeDefined()
    expect(textContent(stageButton!)).toContain("0/2 levels")
    expect(lockedStage?.props.disabled).toBe(true)
    expect(lockedStage?.props.accessibilityState.disabled).toBe(true)
    act(() => {
      stageButton?.props.onPress()
      stageButton?.props.onPress()
    })

    expect(tree.root.findByProps({ testID: "counting-level-selector" })).toBeDefined()
    expect(mockSaveCountingProgress).toHaveBeenCalledTimes(1)

    mockSaveCountingProgress.mockClear()
    const levelOne = tree.root.findByProps({ testID: "counting-level-1" })
    act(() => {
      levelOne.props.onPress()
      levelOne.props.onPress()
    })
    await act(async () => {
      await flush()
    })

    expect(textContent(tree.root.findByProps({ testID: "counting-game-header" })))
      .toContain("Stage 10, level 1 of 2")
    expect(mockSaveCountingProgress).toHaveBeenCalledTimes(1)

    mockSaveCountingProgress.mockClear()
    const answerOne = findAnswerButton(tree, 1)
    act(() => {
      answerOne.props.onPress()
      answerOne.props.onPress()
      jest.runOnlyPendingTimers()
    })
    await act(async () => {
      await flush()
    })

    expect(textContent(tree.root)).toContain("Level 1 done!")
    expect(mockSaveCountingProgress).toHaveBeenCalledTimes(1)
    expect(mockSaveActivity).toHaveBeenCalledTimes(1)

    const nextLevel = tree.root.findByProps({
      accessibilityLabel: "Start counting level 2",
    })
    act(() => {
      nextLevel.props.onPress()
      nextLevel.props.onPress()
    })
    await act(async () => {
      await flush()
    })
    expect(textContent(tree.root.findByProps({ testID: "counting-game-header" })))
      .toContain("Stage 10, level 2 of 2")

    mockSaveCountingProgress.mockClear()
    const answerTwo = findAnswerButton(tree, 2)
    act(() => {
      answerTwo.props.onPress()
      answerTwo.props.onPress()
      jest.runOnlyPendingTimers()
    })
    await act(async () => {
      await flush()
    })

    expect(textContent(tree.root)).toContain("Stage 10 done!")
    expect(mockSaveCountingProgress).toHaveBeenCalledTimes(1)
    expect(mockRecordQualifiedStreakActivity).toHaveBeenCalledTimes(1)

    const nextStage = tree.root.findByProps({ accessibilityLabel: "Open Stage Two" })
    act(() => {
      nextStage.props.onPress()
      nextStage.props.onPress()
    })
    expect(textContent(tree.root)).toContain("Stage Two")
    expect(tree.root.findByProps({ testID: "counting-level-selector" })).toBeDefined()

    act(() => tree.unmount())
  })
})
