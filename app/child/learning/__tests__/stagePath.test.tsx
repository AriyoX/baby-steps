import React from "react";
import { FlatList, TouchableOpacity } from "react-native";
import renderer, { act, type ReactTestInstance } from "react-test-renderer";
import LearningStagePathScreen from "../[stageId]";

const mockRouterBack = jest.fn();
const mockRouterPush = jest.fn();
const mockRouterReplace = jest.fn();
const mockRouterCanGoBack = jest.fn();
const mockUseLocalSearchParams = jest.fn();
const mockGetCompletedLearningLessonIds = jest.fn();

jest.mock("expo-router", () => ({
  Stack: {
    Screen: () => null,
  },
  useFocusEffect: (callback: () => void | (() => void)) => callback(),
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

jest.mock("@/context/ChildContext", () => ({
  useChild: () => ({
    activeChild: {
      id: "child-1",
      selected_language_code: "lg",
    },
  }),
}));

jest.mock("@/lib/learningProgressRepository", () => ({
  getCompletedLearningLessonIds: (...args: unknown[]) =>
    mockGetCompletedLearningLessonIds(...args),
  getLearningProgressChildId: (childId?: string | null) => childId || "local-demo-child",
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
  jest.useFakeTimers();
  jest.clearAllMocks();
  mockRouterCanGoBack.mockReturnValue(false);
  mockUseLocalSearchParams.mockReturnValue({ stageId: "first-words" });
  mockGetCompletedLearningLessonIds.mockResolvedValue([]);
});

afterEach(() => {
  act(() => {
    jest.runOnlyPendingTimers();
  });
  jest.useRealTimers();
});

describe("Learning stage path screen", () => {
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

    expect(lessonRail.props.horizontal).toBe(true);
    expect(lessonRail.props.showsHorizontalScrollIndicator).toBe(false);
    expect(text).toContain("Greetings");
    expect(text).toContain("Listen Practice");
    expect(text).toContain("Word Check");
    expect(text).toContain("Picture Match");
    expect(text).toContain("Tap to learn");
    expect(text).toContain("Listen and choose");
    expect(text).toContain("Pick the word");
    expect(text).toContain("Match pictures");
  });

  it("starts all startable First Words cards", async () => {
    let tree: renderer.ReactTestRenderer | undefined;

    await act(async () => {
      tree = renderer.create(<LearningStagePathScreen />);
    });

    if (!tree) {
      throw new Error("LearningStagePathScreen did not render");
    }

    const greetingsCard = findButtonByAccessibilityLabel(tree.root, "Greetings. Start");
    const wordCheckCard = findButtonByAccessibilityLabel(tree.root, "Word Check. Start");
    const pictureMatchCard = findButtonByAccessibilityLabel(
      tree.root,
      "Picture Match. Start",
    );

    expect(textContent(greetingsCard)).toContain("Start");
    expect(textContent(wordCheckCard)).toContain("Start");
    expect(textContent(pictureMatchCard)).toContain("Start");

    await act(async () => {
      greetingsCard.props.onPress();
    });

    expect(mockRouterPush).toHaveBeenCalledWith({
      pathname: "/child/learning/[stageId]/lesson/[lessonId]",
      params: { stageId: "first-words", lessonId: "greetings-1" },
    });

    await act(async () => {
      pictureMatchCard.props.onPress();
    });

    expect(mockRouterPush).toHaveBeenCalledWith({
      pathname: "/child/learning/[stageId]/lesson/[lessonId]",
      params: { stageId: "first-words", lessonId: "first-words-picture-match" },
    });
  });

  it("keeps planned cards disabled", async () => {
    mockUseLocalSearchParams.mockReturnValue({ stageId: "family-home" });
    let tree: renderer.ReactTestRenderer | undefined;

    await act(async () => {
      tree = renderer.create(<LearningStagePathScreen />);
    });

    if (!tree) {
      throw new Error("LearningStagePathScreen did not render");
    }

    const comingSoonCard = findButtonByAccessibilityLabel(
      tree.root,
      "Things at Home. Coming soon",
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

  it("shows a locally completed match-word-picture lesson as reviewable", async () => {
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
      "Picture Match. Review",
    );

    expect(textContent(pictureMatchCard)).toContain("Review");
    expect(textContent(pictureMatchCard)).toContain("Completed");
    expect(pictureMatchCard.props.disabled).toBe(false);
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

    const practiceCard = findButtonByAccessibilityLabel(
      tree.root,
      "First Words Review. Locked",
    );

    expect(textContent(practiceCard)).toContain("Locked");
    expect(practiceCard.props.disabled).toBe(true);
  });
});
