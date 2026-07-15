import React from "react"
import { Text } from "react-native"
import renderer, { act } from "react-test-renderer"
import { useLearningHubProgress } from "@/hooks/useLearningHubProgress"

const mockGetCompletedLearningLessonIds = jest.fn()
const mockHydrateLearningProgressFromRemote = jest.fn()

jest.mock("expo-router", () => ({
  useFocusEffect: (callback: () => void | (() => void)) => {
    const ReactModule = jest.requireActual("react")
    ReactModule.useEffect(callback, [callback])
  },
}))

jest.mock("@/lib/learningProgressRepository", () => ({
  getCompletedLearningLessonIds: (...args: unknown[]) =>
    mockGetCompletedLearningLessonIds(...args),
  hydrateLearningProgressFromRemote: (...args: unknown[]) =>
    mockHydrateLearningProgressFromRemote(...args),
}))

type HarnessProps = {
  childId: string
  contentReady?: boolean
  languageCode: string
}

const ProgressHarness = ({
  childId,
  contentReady = true,
  languageCode,
}: HarnessProps) => {
  const completedLessonIds = useLearningHubProgress(
    childId,
    languageCode,
    contentReady,
  )
  return <Text>{completedLessonIds.join(",")}</Text>
}

beforeEach(() => {
  jest.clearAllMocks()
  mockHydrateLearningProgressFromRemote.mockResolvedValue({
    completedLessonIds: [],
  })
  mockGetCompletedLearningLessonIds.mockResolvedValue([])
})

describe("useLearningHubProgress", () => {
  it("hydrates progress using the exact child and language scope", async () => {
    mockGetCompletedLearningLessonIds.mockResolvedValue(["greetings-1"])
    let tree: renderer.ReactTestRenderer | undefined

    await act(async () => {
      tree = renderer.create(
        <ProgressHarness childId="child-1" languageCode="nyn" />,
      )
      await Promise.resolve()
    })

    expect(mockHydrateLearningProgressFromRemote).toHaveBeenCalledWith(
      "child-1",
      "nyn",
    )
    expect(mockGetCompletedLearningLessonIds).toHaveBeenCalledWith(
      "child-1",
      "nyn",
    )
    expect(JSON.stringify(tree?.toJSON())).toContain("greetings-1")

    act(() => tree?.unmount())
  })

  it("hides prior progress immediately when the child or language changes", async () => {
    mockGetCompletedLearningLessonIds.mockResolvedValue(["greetings-1"])
    let tree: renderer.ReactTestRenderer | undefined

    await act(async () => {
      tree = renderer.create(
        <ProgressHarness childId="child-1" languageCode="lg" />,
      )
      await Promise.resolve()
    })
    expect(JSON.stringify(tree?.toJSON())).toContain("greetings-1")

    mockGetCompletedLearningLessonIds.mockReturnValue(
      new Promise(() => undefined),
    )
    act(() => {
      tree?.update(
        <ProgressHarness childId="child-2" languageCode="nyn" />,
      )
    })

    expect(JSON.stringify(tree?.toJSON())).not.toContain("greetings-1")
    act(() => tree?.unmount())
  })

  it("does not hydrate before exact-language content is ready", async () => {
    let tree: renderer.ReactTestRenderer | undefined

    await act(async () => {
      tree = renderer.create(
        <ProgressHarness
          childId="child-1"
          contentReady={false}
          languageCode="nyn"
        />,
      )
    })

    expect(mockHydrateLearningProgressFromRemote).not.toHaveBeenCalled()
    expect(mockGetCompletedLearningLessonIds).not.toHaveBeenCalled()
    act(() => tree?.unmount())
  })
})
