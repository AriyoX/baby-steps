import React from "react"
import { Animated, Text, TouchableOpacity } from "react-native"
import renderer, { act } from "react-test-renderer"
import {
  getLearningLanguageContent,
  getLessonStatus,
} from "@/content/learningHubRepository"
import { registerLearningHubTestFixture } from "@/content/testFixtures/learningHubTestFixture"
import LearningTab from "../learning"
import ColoringTab from "../coloring"

const mockRouterPush = jest.fn()
const mockLoadContentBundle = jest.fn()
const mockGetColoringProgress = jest.fn()
let mockSelectedLanguageCode = "lg"
let mockChildId = "child-1"
let mockChildAvatar = "👧"
let mockChildGender = "female"
let mockCompletedLearningLessonIds: string[] = []
let mockPathname = "/child/learning"

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
  usePathname: () => mockPathname,
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
      avatar: mockChildAvatar,
      gender: mockChildGender,
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

jest.mock("@/lib/coloringProgress", () => ({
  COLORING_ACHIEVEMENTS: [
    {
      id: "first-masterpiece",
      title: "First masterpiece",
      description: "Save your first picture",
      icon: "star",
    },
    {
      id: "color-explorer",
      title: "Color explorer",
      description: "Use 3 colors in one picture",
      icon: "color-palette",
    },
    {
      id: "gallery-star",
      title: "Gallery star",
      description: "Save 3 different pictures",
      icon: "images",
    },
  ],
  EMPTY_COLORING_PROGRESS: {
    savedArtworkCount: 0,
    savedPages: [],
    maxColorsInArtwork: 0,
    unlockedAchievementIds: [],
  },
  getColoringProgress: (...args: unknown[]) => mockGetColoringProgress(...args),
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

const renderColoringTab = async () => {
  let tree: renderer.ReactTestRenderer | undefined
  await act(async () => {
    tree = renderer.create(<ColoringTab />)
    await Promise.resolve()
  })
  if (!tree) throw new Error("Coloring tab did not render")
  return tree
}

beforeEach(() => {
  registerLearningHubTestFixture()
  jest.clearAllMocks()
  mockSelectedLanguageCode = "lg"
  mockChildId = "child-1"
  mockChildAvatar = "👧"
  mockChildGender = "female"
  mockCompletedLearningLessonIds = []
  mockPathname = "/child/learning"
  mockGetColoringProgress.mockResolvedValue({
    savedArtworkCount: 0,
    savedPages: [],
    maxColorsInArtwork: 0,
    unlockedAchievementIds: [],
  })
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
  it("uses the same African interface for Coloring and shows local art progress", async () => {
    mockPathname = "/child/coloring"
    mockGetColoringProgress.mockResolvedValue({
      savedArtworkCount: 2,
      savedPages: ["Cow", "Shapes"],
      maxColorsInArtwork: 4,
      unlockedAchievementIds: ["first-masterpiece", "color-explorer"],
    })
    mockLoadContentBundle.mockResolvedValue({
      bundle: {
        contentVersion: "coloring-test",
        languageCode: "lg",
        menuCardsByTab: {
          coloring: [
            {
              id: "cow",
              title: "Friendly Cow",
              description: "Add bright colors to the cow.",
              image: "cow.png",
              targetPage: "child/games/coloring/animals",
            },
          ],
        },
        source: "database",
      },
      languageCode: "lg",
      source: "network",
    })

    const tree = await renderColoringTab()
    const visibleText = tree.root
      .findAllByType(Text)
      .map((node) => React.Children.toArray(node.props.children).join(""))
      .join(" ")

    expect(visibleText).toContain("Coloring")
    expect(visibleText).toContain("Art journey")
    expect(visibleText).toContain("2 saved")
    expect(visibleText).toContain("2/3 badges")
    expect(visibleText).toContain("Creative spark: try 3 colors!")
    expect(visibleText).toContain("Friendly Cow")
    expect(mockGetColoringProgress).toHaveBeenCalledWith("child-1")

    const coloringCard = tree.root.findAllByType(TouchableOpacity).find(
      (candidate) => candidate.props.accessibilityLabel?.startsWith("Friendly Cow. Open."),
    )
    act(() => coloringCard?.props.onPress())
    expect(mockRouterPush).toHaveBeenCalledWith("/child/games/coloring/animals")

    act(() => tree.unmount())
  })

  it("shows the selected child emoji and learning language in profile stats", async () => {
    mockSelectedLanguageCode = "nyn"
    const tree = await renderLearningTab()
    const text = JSON.stringify(tree.toJSON())
    const visibleText = tree.root
      .findAllByType(Text)
      .map((node) => React.Children.toArray(node.props.children).join(""))
      .join(" ")

    expect(text).toContain("👧")
    expect(text).toContain("Age 8")
    expect(visibleText).toContain("Learning Runyankole")
    expect(text).not.toContain("african-avatar.jpg")

    act(() => tree.unmount())
  })

  it("locks later stages until every lesson in the previous stage is complete", async () => {
    const tree = await renderLearningTab()
    const stageButtons = tree.root.findAllByType(TouchableOpacity)
    const firstStage = stageButtons.find((candidate) =>
      candidate.props.accessibilityLabel?.startsWith("First Words. 0/"),
    )
    const nextStage = stageButtons.find((candidate) =>
      candidate.props.accessibilityLabel?.startsWith("Family & Home. Locked."),
    )

    expect(firstStage?.props.accessibilityLabel).toContain("Current")
    expect(firstStage?.props.disabled).toBe(false)
    expect(nextStage?.props.disabled).toBe(true)
    expect(nextStage?.props.accessibilityLabel).toContain(
      "Complete First Words to unlock",
    )

    act(() => nextStage?.props.onPress?.())
    expect(mockRouterPush).not.toHaveBeenCalled()

    act(() => tree.unmount())
  })

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
