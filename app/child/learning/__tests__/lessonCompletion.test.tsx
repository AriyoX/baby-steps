import React from "react";
import { Text, TouchableOpacity } from "react-native";
import renderer, { act, type ReactTestInstance } from "react-test-renderer";
import LearningLessonSessionScreen from "../[stageId]/lesson/[lessonId]";

const mockRouterBack = jest.fn();
const mockRouterReplace = jest.fn();
const mockRouterCanGoBack = jest.fn();
const mockUseLocalSearchParams = jest.fn();
const mockSaveLearningLessonCompletion = jest.fn();
const mockGetLearningLessonCompletion = jest.fn();
const mockMechanicRenderer = ({
  item,
  onComplete,
}: {
  item: { id: string; mechanic: string };
  onComplete: (result: unknown) => void;
}) => (
  <TouchableOpacity
    accessibilityRole="button"
    accessibilityLabel={`Complete ${item.id}`}
    onPress={() =>
      onComplete({
        itemId: item.id,
        mechanic: item.mechanic,
        completedAt: Date.now(),
        attempts: item.mechanic === "tap_to_learn" ? 0 : 1,
        ...(item.mechanic === "tap_to_learn" ? {} : { correct: true }),
      })
    }
  >
    <Text>{item.id}</Text>
  </TouchableOpacity>
);

jest.mock("expo-router", () => ({
  Stack: {
    Screen: () => null,
  },
  useLocalSearchParams: () => mockUseLocalSearchParams(),
  useRouter: () => ({
    back: mockRouterBack,
    canGoBack: mockRouterCanGoBack,
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
      selected_language_code: "luganda",
    },
  }),
}));

jest.mock("@/hooks/useChildLandscapeOrientation", () => ({
  useChildLandscapeOrientation: jest.fn(),
}));

jest.mock("@/lib/learningProgressRepository", () => ({
  LEARNING_ACTIVITY_TYPE: "language",
  buildLearningCompletionLocalId: (
    childId: string,
    languageCode: string,
    stageId: string,
    lessonId: string,
  ) => `learning:${childId}:${languageCode}:language:${stageId}:${lessonId}`,
  getLearningLessonCompletion: (...args: unknown[]) =>
    mockGetLearningLessonCompletion(...args),
  getLearningProgressChildId: (childId?: string | null) => childId || "local-demo-child",
  saveLearningLessonCompletion: (...args: unknown[]) =>
    mockSaveLearningLessonCompletion(...args),
}));

jest.mock("@/components/learning/mechanics/mechanicRegistry", () => ({
  getMechanicRenderer: () => mockMechanicRenderer,
}));

const findButtonByAccessibilityLabel = (
  root: ReactTestInstance,
  label: string,
): ReactTestInstance => {
  const button = root.findAllByType(TouchableOpacity).find((candidate) =>
    candidate.props.accessibilityLabel === label,
  );

  if (!button) {
    throw new Error(`Could not find button with accessibility label: ${label}`);
  }

  return button;
};

const completeRenderedItem = async (
  tree: renderer.ReactTestRenderer,
  itemId: string,
) => {
  await act(async () => {
    findButtonByAccessibilityLabel(tree.root, `Complete ${itemId}`).props.onPress();
    await Promise.resolve();
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  mockRouterCanGoBack.mockReturnValue(false);
  mockUseLocalSearchParams.mockReturnValue({
    stageId: "first-words",
    lessonId: "greetings-1",
  });
  mockGetLearningLessonCompletion.mockResolvedValue(null);
  mockSaveLearningLessonCompletion.mockResolvedValue(undefined);
});

describe("Learning lesson completion persistence", () => {
  it("saves a child/language-scoped completion payload after the final item", async () => {
    let tree: renderer.ReactTestRenderer | undefined;

    await act(async () => {
      tree = renderer.create(<LearningLessonSessionScreen />);
    });

    if (!tree) {
      throw new Error("LearningLessonSessionScreen did not render");
    }

    for (const itemId of ["well-done", "thank-you", "mother", "father", "water"]) {
      await completeRenderedItem(tree, itemId);
    }

    expect(mockSaveLearningLessonCompletion).toHaveBeenCalledTimes(1);
    expect(mockSaveLearningLessonCompletion).toHaveBeenCalledWith(
      expect.objectContaining({
        childId: "child-1",
        languageCode: "lg",
        activityType: "language",
        stageId: "first-words",
        levelId: "greetings-1",
        status: "completed",
        attempts: 1,
        progressPayload: expect.objectContaining({
          lessonId: "greetings-1",
          mechanicTypes: ["tap_to_learn"],
          totalItems: 5,
          correctItems: 5,
          contentVersion: "1.1",
          itemResults: expect.arrayContaining([
            expect.objectContaining({
              itemId: "well-done",
              mechanic: "tap_to_learn",
            }),
            expect.objectContaining({
              itemId: "water",
              mechanic: "tap_to_learn",
            }),
          ]),
        }),
        readiness: "local_only",
      }),
    );
    expect(JSON.stringify(tree.toJSON())).toContain("Great learning!");
  });

  it("keeps the completion screen visible when local storage fails", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    mockSaveLearningLessonCompletion.mockRejectedValueOnce(new Error("storage failed"));
    let tree: renderer.ReactTestRenderer | undefined;

    await act(async () => {
      tree = renderer.create(<LearningLessonSessionScreen />);
    });

    if (!tree) {
      throw new Error("LearningLessonSessionScreen did not render");
    }

    for (const itemId of ["well-done", "thank-you", "mother", "father", "water"]) {
      await completeRenderedItem(tree, itemId);
    }

    expect(JSON.stringify(tree.toJSON())).toContain("Great learning!");
    expect(warnSpy).toHaveBeenCalledWith(
      "Could not save local Learning lesson completion:",
      expect.any(Error),
    );

    warnSpy.mockRestore();
  });
});
