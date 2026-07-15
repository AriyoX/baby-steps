import React from "react"
import { Animated, TouchableOpacity } from "react-native"
import renderer, { act } from "react-test-renderer"
import {
  getLearningLanguageContent,
  getLessonStatus,
} from "@/content/learningHubRepository"
import { registerLearningHubTestFixture } from "@/content/testFixtures/learningHubTestFixture"
import LearningTab from "../learning"

const mockRouterPush = jest.fn()
const mockLoadContentBundle = jest.fn()
let mockSelectedLanguageCode = "lg"
let mockChildId = "child-1"
let mockCompletedLearningLessonIds: string[] = []

jest.mock("@/content/contentRepository", () => ({
  loadContentBundle: (...args: unknown[]) => mockLoadContentBundle(...args),
  resolveImageSource: (image: unknown, fallback: unknown) => image ?? fallback,
}))

jest.mock("@/content/imagePreloader", () => ({
  preloadContentBundleImages: jest.fn(),
}))

jest.mock("expo-router", () => ({
  useFocusEffect: (callback: () => void | (() => void)) => {
    const ReactModule = jest.requireActual("react")
    ReactModule.useEffect(callback, [callback])
  },
  usePathname: () => "/child/learning",
  useRouter: () => ({ push: mockRouterPush }),
}))

jest.mock("expo-status-bar", () => ({ StatusBar: "StatusBar" }))

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
}))

jest.mock("@expo/vector-icons", () => ({
  Ionicons: (props: Record<string, unknown>) => {
    const { View } = jest.requireActual("react-native")
    return <View {...props} />
  },
}))

jest.mock("@/components/brand/BrandMark", () => ({
  BrandMark: "BrandMark",
}))

jest.mock("@/components/common/CachedImage", () => ({
  CachedImage: (props: Record<string, unknown>) => {
    const { View } = jest.requireActual("react-native")
    return <View {...props} />
  },
}))

jest.mock("@/components/translated-text", () => ({
  TranslatedText: ({ children, ...props }: Record<string, unknown>) => {
    const { Text } = jest.requireActual("react-native")
    return <Text {...props}>{children}</Text>
  },
}))

jest.mock("@/context/AudioContext", () => ({
  useAudio: () => ({
    settings: {
      appSoundsMuted: false,
      backgroundMusicMuted: false,
    },
    toggleAppSoundsMuted: jest.fn(),
    toggleBackgroundMusicMuted: jest.fn(),
  }),
}))

jest.mock("@/context/ChildContext", () => ({
  useChild: () => ({
    activeChild: {
      age: "8",
      id: mockChildId,
      name: "Ayo",
      selected_language_code: mockSelectedLanguageCode,
    },
  }),
}))

jest.mock("@/hooks/useChildLandscapeOrientation", () => ({
  useChildLandscapeOrientation: jest.fn(),
}))

jest.mock("@/hooks/useLearningHubProgress", () => ({
  useLearningHubProgress: () => mockCompletedLearningLessonIds,
}))

jest.mock("@/lib/audioManager", () => ({
  audioManager: { speakAppText: jest.fn() },
}))

jest.mock("@/lib/learningProgressRepository", () => ({
  getLearningProgressChildId: (childId?: string | null) =>
    childId || "local-demo-child",
}))

const bundleFor = (languageCode: string, learningHub: unknown) => ({
  bundle: {
    contentVersion: "learning-test",
    languageCode,
    learningHub,
    menuCardsByTab: {},
    source: "database",
  },
  languageCode,
  source: "network",
})

const renderLearningTab = async () => {
  let tree: renderer.ReactTestRenderer | undefined
  await act(async () => {
    tree = renderer.create(<LearningTab />)
    await Promise.resolve()
  })
  if (!tree) throw new Error("Learning tab did not render")
  return tree
}

beforeEach(() => {
  registerLearningHubTestFixture()
  jest.clearAllMocks()
  mockSelectedLanguageCode = "lg"
  mockChildId = "child-1"
  mockCompletedLearningLessonIds = []
  mockLoadContentBundle.mockImplementation(async (languageCode: string) => {
    const content = getLearningLanguageContent(languageCode)
    return content
      ? bundleFor(languageCode, content)
      : { languageCode, source: "empty" }
  })
  jest.spyOn(Animated, "loop").mockReturnValue({
    start: jest.fn(),
    stop: jest.fn(),
  } as never)
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe("Learning tab shared African interface", () => {
  it("renders the database stage order dynamically and keeps Practice Mix locked", async () => {
    const content = getLearningLanguageContent("lg")!
    const databaseAddedStage = {
      ...content.stages[0],
      description: "A stage added by published curriculum content.",
      id: "database-added-stage",
      lessons: [],
      stageNumber: 99,
      title: "Database Added Stage",
    }
    const databaseStages = [
      content.stages[0],
      databaseAddedStage,
      ...content.stages.slice(1),
    ]
    mockLoadContentBundle.mockResolvedValue(
      bundleFor("lg", { ...content, stages: databaseStages }),
    )
    const tree = await renderLearningTab()
    const text = JSON.stringify(tree.toJSON())

    databaseStages
      .map((stage) => stage.title)
      .reduce((previousIndex, title) => {
        const nextIndex = text.indexOf(title)
        expect(nextIndex).toBeGreaterThan(previousIndex)
        return nextIndex
      }, -1)

    const practiceMix = tree.root.findAllByType(TouchableOpacity).find(
      (candidate) =>
        candidate.props.accessibilityLabel?.startsWith("Practice Mix. Locked."),
    )
    expect(practiceMix).toBeDefined()

    act(() => tree.unmount())
  })

  it("preserves completed/current states and the stable stage route", async () => {
    const stages = getLearningLanguageContent("lg")!.stages
    const firstStageLessonIds = stages[0].lessons
      .filter((lesson) => getLessonStatus(lesson, stages[0]) === "startable")
      .map((lesson) => lesson.id)
    mockCompletedLearningLessonIds = firstStageLessonIds

    const tree = await renderLearningTab()
    const stageButtons = tree.root.findAllByType(TouchableOpacity)
    const completedStage = stageButtons.find((candidate) =>
      candidate.props.accessibilityLabel?.startsWith("First Words. Completed."),
    )
    const currentStage = stageButtons.find((candidate) =>
      candidate.props.accessibilityLabel?.startsWith("Family & Home. 0/"),
    )

    expect(completedStage).toBeDefined()
    expect(currentStage?.props.accessibilityLabel).toContain("Current")

    await act(async () => completedStage?.props.onPress())
    expect(mockRouterPush).toHaveBeenCalledWith({
      pathname: "/child/learning/[stageId]",
      params: { stageId: "first-words" },
    })

    act(() => tree.unmount())
  })

  it("shows exact-language unavailable and empty states without inventing stages", async () => {
    mockSelectedLanguageCode = "nyn"
    let tree = await renderLearningTab()
    let text = JSON.stringify(tree.toJSON())

    expect(text).toContain("Runyankole Learning Hub lessons")
    expect(text).not.toContain("First Words")
    expect(text).not.toContain("Practice Mix")
    act(() => tree.unmount())

    mockSelectedLanguageCode = "lg"
    mockLoadContentBundle.mockResolvedValue(
      bundleFor("lg", {
        displayName: "Luganda",
        languageCode: "lg",
        pathTitle: "Learning path",
        stages: [],
      }),
    )
    tree = await renderLearningTab()
    text = JSON.stringify(tree.toJSON())

    expect(text).toContain("Lessons coming soon")
    expect(text).not.toContain("First Words")
    expect(text).not.toContain("Practice Mix")
    act(() => tree.unmount())
  })

  it("clears child and language scoped UI while replacement data is loading", async () => {
    const stages = getLearningLanguageContent("lg")!.stages
    const firstStageLessonIds = stages[0].lessons
      .filter((lesson) => getLessonStatus(lesson, stages[0]) === "startable")
      .map((lesson) => lesson.id)
    mockCompletedLearningLessonIds = firstStageLessonIds
    const tree = await renderLearningTab()
    expect(JSON.stringify(tree.toJSON())).toContain("Completed")

    mockLoadContentBundle.mockReturnValue(new Promise(() => undefined))
    mockCompletedLearningLessonIds = []
    mockChildId = "child-2"
    mockSelectedLanguageCode = "nyn"
    act(() => tree.update(<LearningTab />))

    const text = JSON.stringify(tree.toJSON())
    expect(text).not.toContain("Completed")
    expect(text).not.toContain("First Words")
    expect(text).not.toContain("Practice Mix")

    act(() => tree.unmount())
  })
})
