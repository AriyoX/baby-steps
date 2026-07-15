import React from "react";
import { FlatList, TouchableOpacity } from "react-native";
import renderer, { act, type ReactTestInstance } from "react-test-renderer";
import { registerLearningHubTestFixture } from "@/content/testFixtures/learningHubTestFixture";
import {
  getLearningContentVersion,
  getLearningLanguageContent,
  getLessonStatus,
} from "@/content/learningHubRepository";
import LearningStagePathScreen from "../[stageId]";

const mockRouterBack = jest.fn();
const mockRouterPush = jest.fn();
const mockRouterReplace = jest.fn();
const mockRouterCanGoBack = jest.fn();
const mockUseLocalSearchParams = jest.fn();
const mockGetCompletedLearningLessonIds = jest.fn();
const mockHydrateLearningProgressFromRemote = jest.fn();
const mockLoadLearningHubLanguageContent = jest.fn();
let mockSelectedLanguageCode = "lg";

jest.mock("@/content/learningHubLoader", () => ({
  loadLearningHubLanguageContent: (...args: unknown[]) =>
    mockLoadLearningHubLanguageContent(...args),
}));

jest.mock("expo-router", () => ({
  Stack: {
    Screen: () => null,
  },
  useFocusEffect: (callback: () => void | (() => void)) => {
    const ReactModule = jest.requireActual("react");
    ReactModule.useEffect(callback, [callback]);
  },
  useLocalSearchParams: () => mockUseLocalSearchParams(),
  useRouter: () => ({
    back: mockRouterBack,
    canGoBack: mockRouterCanGoBack,
    push: mockRouterPush,
    replace: mockRouterReplace,
  }),
}));

jest.mock("expo-status-bar", () => ({
  StatusBar: "StatusBar",
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: (props: Record<string, unknown>) => {
    const { View } = jest.requireActual("react-native");
    return <View {...props} />;
  },
}));

jest.mock("@/components/brand/BrandMark", () => ({
  BrandMark: "BrandMark",
}));

jest.mock("@/context/ChildContext", () => ({
  useChild: () => ({
    activeChild: {
      id: "child-1",
      selected_language_code: mockSelectedLanguageCode,
    },
  }),
}));

jest.mock("@/lib/learningProgressRepository", () => ({
  getCompletedLearningLessonIds: (...args: unknown[]) =>
    mockGetCompletedLearningLessonIds(...args),
  getLearningProgressChildId: (childId?: string | null) => childId || "local-demo-child",
  hydrateLearningProgressFromRemote: (...args: unknown[]) =>
    mockHydrateLearningProgressFromRemote(...args),
}));

jest.mock("@/hooks/useChildLandscapeOrientation", () => ({
  useChildLandscapeOrientation: jest.fn(),
}));

const textContent = (node: unknown): string => {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (!node || typeof node !== "object") {
    return "";
  }

  const children = (node as { props?: { children?: unknown } }).props?.children;
  if (Array.isArray(children)) {
    return children.map(textContent).join("");
  }

  return textContent(children);
};

const findButtonByAccessibilityLabel = (
  root: ReactTestInstance,
  labelPart: string,
): ReactTestInstance => {
  const button = root.findAllByType(TouchableOpacity).find((candidate) => {
    const label = candidate.props.accessibilityLabel;
    return typeof label === "string" && label.includes(labelPart);
  });

  if (!button) {
    throw new Error(`Could not find button with accessibility label: ${labelPart}`);
  }

  return button;
};

beforeEach(() => {
  registerLearningHubTestFixture();
  jest.useFakeTimers();
  jest.clearAllMocks();
  mockRouterCanGoBack.mockReturnValue(false);
  mockSelectedLanguageCode = "lg";
  mockUseLocalSearchParams.mockReturnValue({ stageId: "first-words" });
  mockGetCompletedLearningLessonIds.mockResolvedValue([]);
  mockHydrateLearningProgressFromRemote.mockResolvedValue({
    completedLessonIds: [],
  });
  mockLoadLearningHubLanguageContent.mockImplementation(
    async (languageCode: string) => {
      const content = getLearningLanguageContent(languageCode);
      const contentVersion = getLearningContentVersion(languageCode);
      return content && contentVersion
        ? {
            status: "ready",
            languageCode,
            content,
            contentVersion,
            source: "database",
            retainedPrevious: true,
          }
        : {
            status: "unavailable",
            languageCode,
            source: "empty",
            retainedPrevious: false,
          };
    },
  );
});

afterEach(() => {
  act(() => {
    jest.runOnlyPendingTimers();
  });
  jest.useRealTimers();
});

describe("Learning stage path screen", () => {
  it("blocks a direct route to the next stage until the previous stage is complete", async () => {
    mockUseLocalSearchParams.mockReturnValue({ stageId: "family-home" });
    let tree: renderer.ReactTestRenderer | undefined;

    await act(async () => {
      tree = renderer.create(<LearningStagePathScreen />);
      await Promise.resolve();
    });

    if (!tree) {
      throw new Error("LearningStagePathScreen did not render");
    }

    const text = JSON.stringify(tree.toJSON());
    expect(text).toContain("Stage locked");
    expect(text).toContain("Complete First Words to unlock Family & Home");
    expect(tree.root.findAllByType(FlatList)).toHaveLength(0);
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it("renders lesson cards in a horizontal rail", async () => {
    let tree: renderer.ReactTestRenderer | undefined;

    await act(async () => {
      tree = renderer.create(<LearningStagePathScreen />);
    });

    if (!tree) {
      throw new Error("LearningStagePathScreen did not render");
    }

    const text = JSON.stringify(tree.toJSON());
    const lessonRail = tree.root.findByType(FlatList);
    const backButton = findButtonByAccessibilityLabel(
      tree.root,
      "Back to Learning",
    );

    expect(mockHydrateLearningProgressFromRemote).toHaveBeenCalledWith(
      "child-1",
      "lg",
    );
    expect(mockGetCompletedLearningLessonIds).toHaveBeenCalledWith("child-1", "lg");
    expect(lessonRail.props.horizontal).toBe(true);
    expect(lessonRail.props.showsHorizontalScrollIndicator).toBe(false);
    expect(backButton.props.className).toContain("w-12 h-12");
    expect(text).toContain("Choose a lesson");
    expect(text).toContain("Stage 1");
    expect(text).toContain("Greetings");
    expect(text).toContain("Listen Practice");
    expect(text).toContain("Word Check");
    expect(text).toContain("Picture Match");
    expect(text).toContain("First Words Quiz");
    expect(text).toContain("Tap to learn");
    expect(text).toContain("Listen and choose");
    expect(text).toContain("Pick the word");
    expect(text).toContain("Match pictures");
    expect(text).toContain("Quick quiz");
  });

  it("starts only the first incomplete First Words lesson", async () => {
    let tree: renderer.ReactTestRenderer | undefined;

    await act(async () => {
      tree = renderer.create(<LearningStagePathScreen />);
    });

    if (!tree) {
      throw new Error("LearningStagePathScreen did not render");
    }

    const greetingsCard = findButtonByAccessibilityLabel(tree.root, "Greetings. Start");
    const listenPracticeCard = findButtonByAccessibilityLabel(
      tree.root,
      "Listen Practice. Locked",
    );
    const wordCheckCard = findButtonByAccessibilityLabel(tree.root, "Word Check. Locked");
    const pictureMatchCard = findButtonByAccessibilityLabel(
      tree.root,
      "Picture Match. Locked",
    );
    const quickReviewCard = findButtonByAccessibilityLabel(
      tree.root,
      "First Words Quiz. Locked",
    );

    expect(textContent(greetingsCard)).toContain("Start");
    expect(textContent(listenPracticeCard)).toContain("Complete Greetings first");
    expect(wordCheckCard.props.disabled).toBe(true);
    expect(pictureMatchCard.props.disabled).toBe(true);
    expect(quickReviewCard.props.disabled).toBe(true);

    await act(async () => {
      greetingsCard.props.onPress();
    });

    expect(mockRouterPush).toHaveBeenCalledWith({
      pathname: "/child/learning/[stageId]/lesson/[lessonId]",
      params: { stageId: "first-words", lessonId: "greetings-1" },
    });

    expect(mockRouterPush).toHaveBeenCalledTimes(1);
  });

  it("unlocks the next lesson after the previous lesson is completed", async () => {
    mockGetCompletedLearningLessonIds.mockResolvedValue(["greetings-1"]);
    let tree: renderer.ReactTestRenderer | undefined;

    await act(async () => {
      tree = renderer.create(<LearningStagePathScreen />);
      await Promise.resolve();
    });

    if (!tree) {
      throw new Error("LearningStagePathScreen did not render");
    }

    const greetingsCard = findButtonByAccessibilityLabel(tree.root, "Greetings. Review");
    const listenPracticeCard = findButtonByAccessibilityLabel(
      tree.root,
      "Listen Practice. Start",
    );
    const wordCheckCard = findButtonByAccessibilityLabel(
      tree.root,
      "Word Check. Locked",
    );

    expect(greetingsCard.props.disabled).toBe(false);
    expect(listenPracticeCard.props.disabled).toBe(false);
    expect(wordCheckCard.props.accessibilityLabel).toContain(
      "Complete Listen Practice first",
    );
  });

  it("keeps planned Culture & Stories cards disabled", async () => {
    const stages = getLearningLanguageContent("lg")!.stages;
    const cultureStageIndex = stages.findIndex(
      (stage) => stage.id === "culture-stories",
    );
    mockGetCompletedLearningLessonIds.mockResolvedValue(
      stages.slice(0, cultureStageIndex).flatMap((stage) =>
        stage.lessons
          .filter((lesson) => getLessonStatus(lesson, stage) === "startable")
          .map((lesson) => lesson.id),
      ),
    );
    mockUseLocalSearchParams.mockReturnValue({ stageId: "culture-stories" });
    let tree: renderer.ReactTestRenderer | undefined;

    await act(async () => {
      tree = renderer.create(<LearningStagePathScreen />);
    });

    if (!tree) {
      throw new Error("LearningStagePathScreen did not render");
    }

    const comingSoonCard = findButtonByAccessibilityLabel(
      tree.root,
      "A Story Bite. Coming soon",
    );

    expect(textContent(comingSoonCard)).toContain("Coming soon");
    expect(comingSoonCard.props.disabled).toBe(true);
  });

  it("shows locally completed startable lessons as reviewable", async () => {
    mockGetCompletedLearningLessonIds.mockResolvedValue(["greetings-1"]);
    let tree: renderer.ReactTestRenderer | undefined;

    await act(async () => {
      tree = renderer.create(<LearningStagePathScreen />);
      await Promise.resolve();
    });

    if (!tree) {
      throw new Error("LearningStagePathScreen did not render");
    }

    const greetingsCard = findButtonByAccessibilityLabel(tree.root, "Greetings. Review");

    expect(textContent(greetingsCard)).toContain("Review");
    expect(textContent(greetingsCard)).toContain("Completed");
    expect(greetingsCard.props.disabled).toBe(false);

    await act(async () => {
      greetingsCard.props.onPress();
    });

    expect(mockRouterPush).toHaveBeenCalledWith({
      pathname: "/child/learning/[stageId]/lesson/[lessonId]",
      params: { stageId: "first-words", lessonId: "greetings-1" },
    });
  });

  it("does not bypass lesson order for an out-of-order completion id", async () => {
    mockGetCompletedLearningLessonIds.mockResolvedValue(["first-words-picture-match"]);
    let tree: renderer.ReactTestRenderer | undefined;

    await act(async () => {
      tree = renderer.create(<LearningStagePathScreen />);
      await Promise.resolve();
    });

    if (!tree) {
      throw new Error("LearningStagePathScreen did not render");
    }

    const pictureMatchCard = findButtonByAccessibilityLabel(
      tree.root,
      "Picture Match. Locked",
    );

    expect(textContent(pictureMatchCard)).toContain("Locked");
    expect(pictureMatchCard.props.disabled).toBe(true);
  });

  it("keeps Practice Mix locked", async () => {
    mockUseLocalSearchParams.mockReturnValue({ stageId: "practice-mix" });
    let tree: renderer.ReactTestRenderer | undefined;

    await act(async () => {
      tree = renderer.create(<LearningStagePathScreen />);
      await Promise.resolve();
    });

    if (!tree) {
      throw new Error("LearningStagePathScreen did not render");
    }

    const text = JSON.stringify(tree.toJSON());
    expect(text).toContain("Stage locked");
    expect(text).toContain("Practice Mix is locked for now");
    expect(tree.root.findAllByType(FlatList)).toHaveLength(0);
  });

  it("does not render Luganda lessons for a direct Runyankole stage route", async () => {
    mockSelectedLanguageCode = "nyn";
    let tree: renderer.ReactTestRenderer | undefined;

    await act(async () => {
      tree = renderer.create(<LearningStagePathScreen />);
    });

    if (!tree) {
      throw new Error("LearningStagePathScreen did not render");
    }

    const text = JSON.stringify(tree.toJSON());

    expect(text).toContain("Runyankole lessons");
    expect(text).toContain("coming soon");
    expect(text).not.toContain("Greetings");
    expect(text).not.toContain("Listen Practice");
    expect(tree.root.findAllByType(FlatList)).toHaveLength(0);
    expect(mockHydrateLearningProgressFromRemote).not.toHaveBeenCalled();
    expect(mockGetCompletedLearningLessonIds).not.toHaveBeenCalled();
    expect(mockRouterPush).not.toHaveBeenCalled();
  });
});
