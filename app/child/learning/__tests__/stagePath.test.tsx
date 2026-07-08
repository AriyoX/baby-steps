import React from "react";
import { FlatList, TouchableOpacity } from "react-native";
import renderer, { act, type ReactTestInstance } from "react-test-renderer";
import LearningStagePathScreen from "../[stageId]";

const mockRouterBack = jest.fn();
const mockRouterPush = jest.fn();
const mockRouterReplace = jest.fn();
const mockRouterCanGoBack = jest.fn();
const mockUseLocalSearchParams = jest.fn();

jest.mock("expo-router", () => ({
  Stack: {
    Screen: () => null,
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

jest.mock("@/context/ChildContext", () => ({
  useChild: () => ({
    activeChild: {
      selected_language_code: "lg",
    },
  }),
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
  jest.clearAllMocks();
  mockRouterCanGoBack.mockReturnValue(false);
  mockUseLocalSearchParams.mockReturnValue({ stageId: "first-words" });
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
    expect(text).toContain("Tap to learn");
    expect(text).toContain("Listen and choose");
    expect(text).toContain("Pick the word");
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

    expect(textContent(greetingsCard)).toContain("Start");
    expect(textContent(wordCheckCard)).toContain("Start");

    await act(async () => {
      greetingsCard.props.onPress();
    });

    expect(mockRouterPush).toHaveBeenCalledWith({
      pathname: "/child/learning/[stageId]/lesson/[lessonId]",
      params: { stageId: "first-words", lessonId: "greetings-1" },
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
});
