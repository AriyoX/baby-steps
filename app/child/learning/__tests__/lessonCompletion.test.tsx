import React from "react";
import { Text, TouchableOpacity } from "react-native";
import renderer, { act, type ReactTestInstance } from "react-test-renderer";
import { registerLearningHubTestFixture } from "@/content/testFixtures/learningHubTestFixture";
import {
  getLearningContentVersion,
  getLearningLanguageContent,
  getLessonStatus,
} from "@/content/learningHubRepository";
import LearningLessonSessionScreen from "../[stageId]/lesson/[lessonId]";

const mockRouterBack = jest.fn();
const mockRouterReplace = jest.fn();
const mockRouterCanGoBack = jest.fn();
const mockUseLocalSearchParams = jest.fn();
const mockSaveLearningLessonCompletion = jest.fn();
const mockAwardLearningLessonCompletionAchievements = jest.fn();
const mockGetLearningLessonCompletion = jest.fn();
const mockGetMechanicRenderer = jest.fn();
const mockEnqueueAchievementUnlocks = jest.fn();
const mockLoadLearningHubLanguageContent = jest.fn();
let mockSelectedLanguageCode = "luganda";
let mockCompletedLearningLessonIds: string[] = [];

jest.mock("@/content/learningHubLoader", () => ({
  loadLearningHubLanguageContent: (...args: unknown[]) =>
    mockLoadLearningHubLanguageContent(...args),
}));

const deferred = <T = void>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};
const MockMechanicRenderer = ({
  item,
  onComplete,
}: {
  item: { id: string; mechanic: string };
  onComplete: (result: unknown) => void;
}) => {
  const [miniQuizQuestionAnswered, setMiniQuizQuestionAnswered] =
    React.useState(false);
  const [storyPageRead, setStoryPageRead] = React.useState(false);

  if (item.mechanic === "mini_quiz") {
    return (
      <>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Answer first mini quiz question"
          onPress={() => setMiniQuizQuestionAnswered(true)}
        >
          <Text>Answer first mini quiz question</Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Finish mini quiz"
          accessibilityState={{ disabled: !miniQuizQuestionAnswered }}
          onPress={() => {
            if (!miniQuizQuestionAnswered) {
              return;
            }

            onComplete({
              itemId: item.id,
              mechanic: item.mechanic,
              completedAt: Date.now(),
              attempts: 2,
              correct: true,
            });
          }}
        >
          <Text>Finish mini quiz</Text>
        </TouchableOpacity>
      </>
    );
  }

  if (item.mechanic === "story_bite") {
    return (
      <>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Read first story page"
          onPress={() => setStoryPageRead(true)}
        >
          <Text>Read first story page</Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Finish story bite"
          accessibilityState={{ disabled: !storyPageRead }}
          onPress={() => {
            if (!storyPageRead) {
              return;
            }

            onComplete({
              itemId: item.id,
              mechanic: item.mechanic,
              completedAt: Date.now(),
              attempts: 2,
            });
          }}
        >
          <Text>Finish story bite</Text>
        </TouchableOpacity>
      </>
    );
  }

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`Complete ${item.id}`}
      onPress={() => {
        const isCorrectnessMechanic =
          item.mechanic !== "tap_to_learn" &&
          item.mechanic !== "cultural_card" &&
          item.mechanic !== "story_bite";

        onComplete({
          itemId: item.id,
          mechanic: item.mechanic,
          completedAt: Date.now(),
          attempts: item.mechanic === "tap_to_learn" ? 0 : 1,
          ...(isCorrectnessMechanic ? { correct: true } : {}),
        });
      }}
    >
      <Text>{item.id}</Text>
    </TouchableOpacity>
  );
};

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

jest.mock("@/hooks/useChildLandscapeOrientation", () => ({
  useChildLandscapeOrientation: jest.fn(),
}));

jest.mock("@/hooks/useLearningHubProgress", () => ({
  useLearningHubProgress: () => mockCompletedLearningLessonIds,
}));

jest.mock("@/lib/learningProgressRepository", () => ({
  LEARNING_ACTIVITY_TYPE: "language",
  awardLearningLessonCompletionAchievements: (...args: unknown[]) =>
    mockAwardLearningLessonCompletionAchievements(...args),
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

jest.mock("@/context/ChildNoticeContext", () => ({
  useChildNotice: () => ({
    enqueueAchievementUnlocks: mockEnqueueAchievementUnlocks,
  }),
}));

jest.mock("@/components/learning/mechanics/mechanicRegistry", () => ({
  getMechanicRenderer: (...args: unknown[]) => mockGetMechanicRenderer(...args),
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
  registerLearningHubTestFixture();
  jest.clearAllMocks();
  mockSelectedLanguageCode = "luganda";
  mockCompletedLearningLessonIds = getLearningLanguageContent("lg")!.stages.flatMap(
    (stage) =>
      stage.lessons
        .filter((lesson) => getLessonStatus(lesson, stage) === "startable")
        .map((lesson) => lesson.id),
  );
  mockGetMechanicRenderer.mockReturnValue(MockMechanicRenderer);
  mockRouterCanGoBack.mockReturnValue(false);
  mockUseLocalSearchParams.mockReturnValue({
    stageId: "first-words",
    lessonId: "greetings-1",
  });
  mockGetLearningLessonCompletion.mockResolvedValue(null);
  mockEnqueueAchievementUnlocks.mockReturnValue(0);
  mockSaveLearningLessonCompletion.mockImplementation((completion) =>
    Promise.resolve(completion),
  );
  mockAwardLearningLessonCompletionAchievements.mockResolvedValue([]);
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

describe("Learning lesson completion persistence", () => {
  it("does not start a Luganda mechanic for a direct Runyankole lesson route", async () => {
    mockSelectedLanguageCode = "nyn";
    let tree: renderer.ReactTestRenderer | undefined;

    await act(async () => {
      tree = renderer.create(<LearningLessonSessionScreen />);
    });

    if (!tree) {
      throw new Error("LearningLessonSessionScreen did not render");
    }

    const text = JSON.stringify(tree.toJSON());

    expect(text).toContain("Runyankole lessons");
    expect(text).toContain("coming soon");
    expect(text).not.toContain("well-done");
    expect(mockGetMechanicRenderer).not.toHaveBeenCalled();
    expect(mockGetLearningLessonCompletion).not.toHaveBeenCalled();
    expect(mockSaveLearningLessonCompletion).not.toHaveBeenCalled();
  });

  it("does not allow a direct lesson route to bypass sequential stage locking", async () => {
    mockCompletedLearningLessonIds = [];
    mockUseLocalSearchParams.mockReturnValue({
      stageId: "family-home",
      lessonId: "family-names-1",
    });
    let tree: renderer.ReactTestRenderer | undefined;

    await act(async () => {
      tree = renderer.create(<LearningLessonSessionScreen />);
    });

    if (!tree) {
      throw new Error("LearningLessonSessionScreen did not render");
    }

    const text = JSON.stringify(tree.toJSON());
    expect(text).toContain("Locked for now");
    expect(text).toContain("Complete First Words to unlock Family & Home");
    expect(mockGetMechanicRenderer).not.toHaveBeenCalled();
    expect(mockSaveLearningLessonCompletion).not.toHaveBeenCalled();
  });

  it("does not allow a direct lesson route to bypass sequential lesson locking", async () => {
    mockCompletedLearningLessonIds = [];
    mockUseLocalSearchParams.mockReturnValue({
      stageId: "first-words",
      lessonId: "listen-greetings-1",
    });
    let tree: renderer.ReactTestRenderer | undefined;

    await act(async () => {
      tree = renderer.create(<LearningLessonSessionScreen />);
    });

    if (!tree) {
      throw new Error("LearningLessonSessionScreen did not render");
    }

    const text = JSON.stringify(tree.toJSON());
    expect(text).toContain("Locked for now");
    expect(text).toContain("Complete Greetings to unlock Listen Practice");
    expect(mockGetMechanicRenderer).not.toHaveBeenCalled();
    expect(mockSaveLearningLessonCompletion).not.toHaveBeenCalled();
  });

  it("does not save or log activity before the final lesson item", async () => {
    let tree: renderer.ReactTestRenderer | undefined;

    await act(async () => {
      tree = renderer.create(<LearningLessonSessionScreen />);
    });

    if (!tree) {
      throw new Error("LearningLessonSessionScreen did not render");
    }

    await completeRenderedItem(tree, "well-done");

    expect(mockSaveLearningLessonCompletion).not.toHaveBeenCalled();
    expect(JSON.stringify(tree.toJSON())).not.toContain("Great learning!");
  });

  it("does not save or log activity before a mini quiz item fully completes", async () => {
    mockUseLocalSearchParams.mockReturnValue({
      stageId: "family-home",
      lessonId: "family-mini-quiz",
    });
    let tree: renderer.ReactTestRenderer | undefined;

    await act(async () => {
      tree = renderer.create(<LearningLessonSessionScreen />);
    });

    if (!tree) {
      throw new Error("LearningLessonSessionScreen did not render");
    }
    const renderedTree = tree;

    await act(async () => {
      findButtonByAccessibilityLabel(
        renderedTree.root,
        "Answer first mini quiz question",
      ).props.onPress();
      await Promise.resolve();
    });

    expect(mockSaveLearningLessonCompletion).not.toHaveBeenCalled();
    expect(JSON.stringify(renderedTree.toJSON())).not.toContain("Great learning!");

    await act(async () => {
      findButtonByAccessibilityLabel(
        renderedTree.root,
        "Finish mini quiz",
      ).props.onPress();
      await Promise.resolve();
    });

    expect(mockSaveLearningLessonCompletion).toHaveBeenCalledTimes(1);
    expect(mockSaveLearningLessonCompletion).toHaveBeenCalledWith(
      expect.objectContaining({
        childId: "child-1",
        languageCode: "lg",
        activityType: "language",
        stageId: "family-home",
        levelId: "family-mini-quiz",
        status: "completed",
        attempts: 1,
        progressPayload: expect.objectContaining({
          lessonId: "family-mini-quiz",
          stageTitle: "Family & Home",
          lessonTitle: "Family Mini Quiz",
          mechanicTypes: ["mini_quiz"],
          totalItems: 1,
          correctItems: 1,
          itemResults: [
            expect.objectContaining({
              itemId: "family-words-review",
              mechanic: "mini_quiz",
              correct: true,
              attempts: 2,
            }),
          ],
        }),
      }),
    );
  });

  it("does not save or log activity before a story bite item fully completes", async () => {
    mockUseLocalSearchParams.mockReturnValue({
      stageId: "family-home",
      lessonId: "thank-you-at-home-story",
    });
    let tree: renderer.ReactTestRenderer | undefined;

    await act(async () => {
      tree = renderer.create(<LearningLessonSessionScreen />);
    });

    if (!tree) {
      throw new Error("LearningLessonSessionScreen did not render");
    }
    const renderedTree = tree;

    await act(async () => {
      findButtonByAccessibilityLabel(
        renderedTree.root,
        "Read first story page",
      ).props.onPress();
      await Promise.resolve();
    });

    expect(mockSaveLearningLessonCompletion).not.toHaveBeenCalled();
    expect(JSON.stringify(renderedTree.toJSON())).not.toContain("Great learning!");

    await act(async () => {
      findButtonByAccessibilityLabel(
        renderedTree.root,
        "Finish story bite",
      ).props.onPress();
      await Promise.resolve();
    });

    expect(mockSaveLearningLessonCompletion).toHaveBeenCalledTimes(1);
    const savedCompletion = mockSaveLearningLessonCompletion.mock.calls[0][0];

    expect(savedCompletion).toEqual(
      expect.objectContaining({
        childId: "child-1",
        languageCode: "lg",
        activityType: "language",
        stageId: "family-home",
        levelId: "thank-you-at-home-story",
        status: "completed",
        attempts: 1,
        progressPayload: expect.objectContaining({
          source: "learning_hub",
          lessonId: "thank-you-at-home-story",
          stageTitle: "Family & Home",
          lessonTitle: "Thank You at Home",
          mechanicTypes: ["story_bite"],
          totalItems: 1,
          correctItems: 1,
          itemResults: [
            expect.objectContaining({
              itemId: "thank-you-at-home-pages",
              mechanic: "story_bite",
              attempts: 2,
            }),
          ],
        }),
      }),
    );
    expect(savedCompletion.progressPayload.itemResults[0]).not.toHaveProperty("correct");
  });

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
          source: "learning_hub",
          lessonId: "greetings-1",
          stageTitle: "First Words",
          lessonTitle: "Greetings",
          stageNumber: 1,
          lessonOrder: 1,
          stageLessonIds: [
            "greetings-1",
            "listen-greetings-1",
            "first-words-word-check",
            "first-words-picture-match",
            "first-words-quick-review",
          ],
          mechanicTypes: ["tap_to_learn"],
          totalItems: 5,
          correctItems: 5,
          completedAt: expect.any(Number),
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

  it("reveals completion while local persistence is pending and waits to evaluate achievements", async () => {
    const localPersistence = deferred<unknown>();
    mockSaveLearningLessonCompletion.mockReturnValueOnce(localPersistence.promise);
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
    expect(JSON.stringify(tree.toJSON())).toContain("Great learning!");
    expect(mockAwardLearningLessonCompletionAchievements).not.toHaveBeenCalled();

    const savedCompletion = mockSaveLearningLessonCompletion.mock.calls[0][0];
    await act(async () => {
      localPersistence.resolve(savedCompletion);
      await localPersistence.promise;
      await Promise.resolve();
    });

    expect(mockAwardLearningLessonCompletionAchievements).toHaveBeenCalledTimes(1);
    expect(mockAwardLearningLessonCompletionAchievements).toHaveBeenCalledWith(
      savedCompletion,
    );
  });

  it("saves match-word-picture completion through the generic session flow", async () => {
    mockUseLocalSearchParams.mockReturnValue({
      stageId: "first-words",
      lessonId: "first-words-picture-match",
    });
    let tree: renderer.ReactTestRenderer | undefined;

    await act(async () => {
      tree = renderer.create(<LearningLessonSessionScreen />);
    });

    if (!tree) {
      throw new Error("LearningLessonSessionScreen did not render");
    }

    for (const itemId of ["match-water-picture", "match-mother-picture"]) {
      await completeRenderedItem(tree, itemId);
    }

    expect(mockSaveLearningLessonCompletion).toHaveBeenCalledTimes(1);
    expect(mockSaveLearningLessonCompletion).toHaveBeenCalledWith(
      expect.objectContaining({
        childId: "child-1",
        languageCode: "lg",
        activityType: "language",
        stageId: "first-words",
        levelId: "first-words-picture-match",
        status: "completed",
        attempts: 1,
        progressPayload: expect.objectContaining({
          source: "learning_hub",
          lessonId: "first-words-picture-match",
          stageTitle: "First Words",
          lessonTitle: "Picture Match",
          stageNumber: 1,
          lessonOrder: 4,
          stageLessonIds: [
            "greetings-1",
            "listen-greetings-1",
            "first-words-word-check",
            "first-words-picture-match",
            "first-words-quick-review",
          ],
          mechanicTypes: ["match_word_picture"],
          totalItems: 2,
          correctItems: 2,
          completedAt: expect.any(Number),
          contentVersion: "1.1",
          itemResults: expect.arrayContaining([
            expect.objectContaining({
              itemId: "match-water-picture",
              mechanic: "match_word_picture",
              correct: true,
              attempts: 1,
            }),
            expect.objectContaining({
              itemId: "match-mother-picture",
              mechanic: "match_word_picture",
              correct: true,
              attempts: 1,
            }),
          ]),
        }),
        readiness: "local_only",
      }),
    );
    expect(JSON.stringify(tree.toJSON())).toContain("Great learning!");
  });

  it("saves cultural-card completion without correctness after the card completes", async () => {
    mockUseLocalSearchParams.mockReturnValue({
      stageId: "family-home",
      lessonId: "home-greeting-card",
    });
    let tree: renderer.ReactTestRenderer | undefined;

    await act(async () => {
      tree = renderer.create(<LearningLessonSessionScreen />);
    });

    if (!tree) {
      throw new Error("LearningLessonSessionScreen did not render");
    }

    expect(mockSaveLearningLessonCompletion).not.toHaveBeenCalled();

    await completeRenderedItem(tree, "morning-greeting-home");

    expect(mockSaveLearningLessonCompletion).toHaveBeenCalledTimes(1);
    const savedCompletion = mockSaveLearningLessonCompletion.mock.calls[0][0];

    expect(savedCompletion).toEqual(
      expect.objectContaining({
        childId: "child-1",
        languageCode: "lg",
        activityType: "language",
        stageId: "family-home",
        levelId: "home-greeting-card",
        status: "completed",
        attempts: 1,
        progressPayload: expect.objectContaining({
          source: "learning_hub",
          lessonId: "home-greeting-card",
          stageTitle: "Family & Home",
          lessonTitle: "Morning Greeting",
          mechanicTypes: ["cultural_card"],
          totalItems: 1,
          correctItems: 1,
          itemResults: [
            expect.objectContaining({
              itemId: "morning-greeting-home",
              mechanic: "cultural_card",
              attempts: 1,
            }),
          ],
        }),
      }),
    );
    expect(savedCompletion.progressPayload.itemResults[0]).not.toHaveProperty("correct");
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
    expect(mockAwardLearningLessonCompletionAchievements).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it("does not show an unlock notification when no new achievement is earned", async () => {
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
    expect(mockEnqueueAchievementUnlocks).not.toHaveBeenCalled();
  });

  it("keeps authoritative local completion and UI independent of delayed achievement evaluation", async () => {
    const achievementEvaluation = deferred<unknown[]>();
    mockAwardLearningLessonCompletionAchievements.mockReturnValueOnce(
      achievementEvaluation.promise,
    );
    let tree: renderer.ReactTestRenderer | undefined;

    await act(async () => {
      tree = renderer.create(<LearningLessonSessionScreen />);
    });
    if (!tree) throw new Error("LearningLessonSessionScreen did not render");

    for (const itemId of ["well-done", "thank-you", "mother", "father", "water"]) {
      await completeRenderedItem(tree, itemId);
    }

    expect(mockSaveLearningLessonCompletion).toHaveBeenCalledTimes(1);
    expect(mockAwardLearningLessonCompletionAchievements).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(tree.toJSON())).toContain("Great learning!");
    expect(mockEnqueueAchievementUnlocks).not.toHaveBeenCalled();

    achievementEvaluation.resolve([]);
    await act(async () => {
      await achievementEvaluation.promise;
    });
  });

  it("keeps completion visible when achievement evaluation rejects", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    const achievementEvaluation = deferred<unknown[]>();
    mockAwardLearningLessonCompletionAchievements.mockReturnValueOnce(
      achievementEvaluation.promise,
    );
    let tree: renderer.ReactTestRenderer | undefined;

    await act(async () => {
      tree = renderer.create(<LearningLessonSessionScreen />);
    });
    if (!tree) throw new Error("LearningLessonSessionScreen did not render");

    for (const itemId of ["well-done", "thank-you", "mother", "father", "water"]) {
      await completeRenderedItem(tree, itemId);
    }

    achievementEvaluation.reject(new Error("offline"));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockSaveLearningLessonCompletion).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(tree.toJSON())).toContain("Great learning!");
    expect(mockEnqueueAchievementUnlocks).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      "Could not award Learning Hub achievements:",
      expect.any(Error),
    );
    warnSpy.mockRestore();
  });

  it("does not enqueue a delayed achievement after the lesson unmounts", async () => {
    const achievementEvaluation = deferred<unknown[]>();
    const achievement = {
      id: "delayed-achievement",
      name: "Delayed",
      description: "Delayed achievement",
      icon_name: "star-outline",
      activity_type: "learning_hub_first_lesson",
      points: 10,
      game_key: "learning_hub",
    };
    mockAwardLearningLessonCompletionAchievements.mockReturnValueOnce(
      achievementEvaluation.promise,
    );
    let tree: renderer.ReactTestRenderer | undefined;

    await act(async () => {
      tree = renderer.create(<LearningLessonSessionScreen />);
    });
    if (!tree) throw new Error("LearningLessonSessionScreen did not render");

    for (const itemId of ["well-done", "thank-you", "mother", "father", "water"]) {
      await completeRenderedItem(tree, itemId);
    }

    await act(async () => {
      tree?.unmount();
    });
    await act(async () => {
      achievementEvaluation.resolve([achievement]);
      await achievementEvaluation.promise;
    });

    expect(mockEnqueueAchievementUnlocks).not.toHaveBeenCalled();
  });

  it("queues every newly earned Learning Hub achievement without blocking completion", async () => {
    const newlyEarnedAchievements = [
      {
        id: "7d4f6a00-4b5f-4e00-9a10-000000000101",
        name: "First Learning Step",
        description: "You finished your first Learning Hub lesson.",
        icon_name: "footsteps-outline",
        activity_type: "learning_hub_first_lesson",
        points: 10,
        game_key: "learning_hub",
      },
      {
        id: "7d4f6a00-4b5f-4e00-9a10-000000000104",
        name: "Quiz Helper",
        description: "You finished a Learning Hub quiz lesson.",
        icon_name: "help-circle-outline",
        activity_type: "learning_hub_mini_quiz_lesson",
        points: 15,
        game_key: "learning_hub",
      },
    ];
    mockAwardLearningLessonCompletionAchievements.mockResolvedValueOnce(
      newlyEarnedAchievements,
    );
    let tree: renderer.ReactTestRenderer | undefined;

    await act(async () => {
      tree = renderer.create(<LearningLessonSessionScreen />);
    });

    if (!tree) {
      throw new Error("LearningLessonSessionScreen did not render");
    }
    const renderedTree = tree;

    for (const itemId of ["well-done", "thank-you", "mother", "father", "water"]) {
      await completeRenderedItem(renderedTree, itemId);
    }

    expect(mockSaveLearningLessonCompletion).toHaveBeenCalledTimes(1);
    expect(mockEnqueueAchievementUnlocks).toHaveBeenCalledTimes(1);
    expect(mockEnqueueAchievementUnlocks).toHaveBeenCalledWith(
      newlyEarnedAchievements,
    );

    await act(async () => {
      findButtonByAccessibilityLabel(renderedTree.root, "Continue").props.onPress();
    });
    expect(mockRouterReplace).toHaveBeenCalledWith({
      pathname: "/child/learning/[stageId]",
      params: { stageId: "first-words" },
    });
  });
});
