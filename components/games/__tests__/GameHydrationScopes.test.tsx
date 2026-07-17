import React from "react";
import renderer, { act } from "react-test-renderer";
import { TouchableOpacity } from "react-native";
import WordGame from "../WordGameComponent";
import CountingGame from "../CountingGameComponent";
import LearningGame from "../LearningGameComponent";
import {
  completeLocallyFirst,
  runCompletionOnce,
} from "@/lib/completionReliability";

type Child = { id: string; selected_language_code: string };

let mockActiveChild: Child | null = null;
const mockLoadContentBundle = jest.fn();
const mockLoadWordProgress = jest.fn();
const mockLoadCountingProgress = jest.fn();
const mockLoadLearningProgress = jest.fn();
const mockLoadGameSounds = jest.fn();
const mockUnloadAppSound = jest.fn().mockResolvedValue(undefined);
const mockSaveWordProgress = jest.fn();
const mockSaveCountingProgress = jest.fn();
const mockSaveLearningProgress = jest.fn();
const mockSaveActivity = jest.fn();
const mockSyncProgressNow = jest.fn();
const mockCheckAndGrantNewAchievements = jest.fn();
const mockEnqueueAchievementUnlocked = jest.fn();
let mockIsLoadingAchievements = false;

const deferred = <T,>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
};

const wordProgress = (childId: string, currentLevel: number) => ({
  childId,
  completedLevels: [],
  currentLevel,
  playHistory: [],
  totalScore: 0,
  unlockedLevels: [0, 1],
});

const countingProgress = (
  childId: string,
  completedStages: number[] = [],
) => ({
  childId,
  completedStages,
  currentStage: 1,
  lastPlayedLevel: { 1: 1 },
  playHistory: [],
  totalScore: 0,
  unlockedStages: [1],
});

const learningStages = (prefix: string) => [
  {
    color: "#fff",
    description: `${prefix} description`,
    id: 1,
    image: "learning-beginner.jpg",
    isLocked: false,
    levels: [
      {
        id: 1,
        isLocked: false,
        title: `${prefix} level`,
        words: [
          { id: "1", targetText: "A", english: "one" },
          { id: "2", targetText: "B", english: "two" },
          { id: "3", targetText: "C", english: "three" },
          { id: "4", targetText: "D", english: "four" },
        ],
      },
    ],
    requiredScore: 0,
    title: `${prefix} stage`,
  },
];

const contentResult = (languageCode: "lg" | "nyn") => {
  const prefix = languageCode === "lg" ? "Luganda" : "Runyankole";
  return {
    bundle: {
      countingGame: {
        culturalItems: [{ image: "coin.png", name: "coins" }],
        currency: [],
        numbers: [
          { number: 1, targetText: "one" },
          { number: 2, targetText: "two" },
        ],
        stages: [
          {
            description: `${prefix} counting stage`,
            id: 1,
            levels: 1,
            numbersRange: { min: 1, max: 2 },
            title: `${prefix} Stage One`,
            useBunches: false,
            usesCurrency: false,
          },
        ],
        title: `${prefix} Counting`,
      },
      languageCode,
      learningGame: {
        stages: learningStages(prefix),
        title: `${prefix} Learning`,
      },
      menuCardsByTab: {},
      source: languageCode === "lg" ? "local-lg-legacy" : "local-same-language-sample",
      stories: [],
      wordGame: {
        levels: [
          {
            firstLetter: "A",
            hint: "first",
            question: `${prefix} first question`,
            subHint: "first",
            word: "APE",
          },
          {
            firstLetter: "B",
            hint: "second",
            question: `${prefix} second question`,
            subHint: "second",
            word: "BEE",
          },
        ],
        title: `${prefix} Words`,
      },
    },
    languageCode,
    source: languageCode === "lg" ? "local-lg-legacy" : "local-same-language-sample",
  };
};

const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

const textContent = (node: unknown): string => {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (!node || typeof node !== "object") return "";
  const children = (node as { props?: { children?: unknown } }).props?.children;
  return Array.isArray(children)
    ? children.map(textContent).join("")
    : textContent(children);
};

const renderedText = (node: unknown): string => {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (!node || typeof node !== "object") return "";
  const children = (node as { children?: unknown[] }).children;
  return Array.isArray(children) ? children.map(renderedText).join("") : "";
};

const findButtonByText = (
  tree: renderer.ReactTestRenderer,
  label: string,
): renderer.ReactTestInstance => {
  const button = tree.root.findAllByType(TouchableOpacity).find((candidate) =>
    textContent(candidate).includes(label),
  );
  if (!button) throw new Error(`Could not find button with text: ${label}`);
  return button;
};

jest.mock("expo-router", () => ({
  useRouter: () => ({ back: jest.fn() }),
}));

jest.mock("expo-status-bar", () => ({ StatusBar: () => null }));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: (props: Record<string, unknown>) => {
    const ReactModule = jest.requireActual("react");
    const { View } = jest.requireActual("react-native");
    return ReactModule.createElement(View, props);
  },
}));

jest.mock("expo-linear-gradient", () => ({
  LinearGradient: (props: Record<string, unknown>) => {
    const ReactModule = jest.requireActual("react");
    const { View } = jest.requireActual("react-native");
    return ReactModule.createElement(View, props);
  },
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: (props: Record<string, unknown>) => {
    const ReactModule = jest.requireActual("react");
    const { View } = jest.requireActual("react-native");
    return ReactModule.createElement(View, props);
  },
  useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }),
}));

jest.mock("@/components/common/CachedImage", () => ({
  CachedImage: (props: Record<string, unknown>) => {
    const ReactModule = jest.requireActual("react");
    const { View } = jest.requireActual("react-native");
    return ReactModule.createElement(View, props);
  },
}));

jest.mock("@/context/ChildContext", () => ({
  useChild: () => ({ activeChild: mockActiveChild }),
}));

jest.mock("@/context/ChildNoticeContext", () => ({
  useChildNotice: () => ({
    enqueueAchievementUnlocked: (...args: unknown[]) =>
      mockEnqueueAchievementUnlocked(...args),
  }),
}));

jest.mock("@/content/contentRepository", () => ({
  loadContentBundle: (...args: unknown[]) => mockLoadContentBundle(...args),
  resolveImageSource: (value: unknown) => value ?? 1,
}));

jest.mock("@/content/imagePreloader", () => ({
  preloadContentBundleImages: jest.fn().mockResolvedValue({
    attempted: 0,
    fulfilled: 0,
    rejected: 0,
  }),
}));

jest.mock("../achievements/useAchievements", () => ({
  useAchievements: () => ({
    checkAndGrantNewAchievements: (...args: unknown[]) =>
      mockCheckAndGrantNewAchievements(...args),
    definedAchievements: [],
    earnedChildAchievements: [],
    isLoadingAchievements: mockIsLoadingAchievements,
  }),
}));

jest.mock("@/lib/audioManager", () => ({
  audioManager: {
    createAppSound: jest.fn().mockResolvedValue(null),
    playAppSound: jest.fn().mockResolvedValue(null),
    replayAppSound: jest.fn().mockResolvedValue(undefined),
    unloadAppSound: (...args: unknown[]) => mockUnloadAppSound(...args),
  },
}));

jest.mock("../utils/audioManager", () => ({
  loadGameSounds: (...args: unknown[]) => mockLoadGameSounds(...args),
  playWordAudio: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/lib/utils", () => ({
  saveActivity: (...args: unknown[]) => mockSaveActivity(...args),
}));

jest.mock("@/lib/progressRepository", () => ({
  syncProgressNow: (...args: unknown[]) => mockSyncProgressNow(...args),
}));

jest.mock("../utils/progressManagerWordGame", () => ({
  DEFAULT_PROGRESS: {
    childId: "default",
    completedLevels: [],
    currentLevel: 0,
    playHistory: [],
    totalScore: 0,
    unlockedLevels: [0],
  },
  isLevelUnlocked: jest.fn().mockReturnValue(true),
  loadGameProgress: (...args: unknown[]) => mockLoadWordProgress(...args),
  saveGameProgress: (...args: unknown[]) => mockSaveWordProgress(...args),
  updateProgressForLevelCompletion: jest.fn(
    (progress: Record<string, unknown>, levelIndex: number) => ({
      ...progress,
      completedLevels: [levelIndex],
      totalScore: Number(progress.totalScore ?? 0) + 10,
    }),
  ),
}));

jest.mock("../utils/progressManagerCountingGame", () => ({
  DEFAULT_PROGRESS: {
    childId: "default",
    completedStages: [],
    currentStage: 1,
    lastPlayedLevel: { 1: 1 },
    playHistory: [],
    totalScore: 0,
    unlockedStages: [1],
  },
  isStageUnlocked: jest.fn().mockReturnValue(true),
  loadGameProgress: (...args: unknown[]) => mockLoadCountingProgress(...args),
  saveGameProgress: (...args: unknown[]) => mockSaveCountingProgress(...args),
  updateLastPlayedLevel: jest.fn((progress: Record<string, unknown>) => progress),
  updateProgressForStageCompletion: jest.fn(
    (progress: Record<string, unknown>, stageId: number, score: number) => ({
      ...progress,
      completedStages: [stageId],
      totalScore: score,
    }),
  ),
}));

jest.mock("../utils/progressManagerLugandaLearning", () => ({
  DEFAULT_USER_STATS: {
    correctAnswers: 0,
    lastPlayed: "2026-07-14T00:00:00.000Z",
    streakDays: 1,
    totalWords: 0,
    wrongAnswers: 0,
  },
  loadGameProgress: (...args: unknown[]) => mockLoadLearningProgress(...args),
  saveGameProgress: (...args: unknown[]) => mockSaveLearningProgress(...args),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockIsLoadingAchievements = false;
  mockActiveChild = { id: "child-a", selected_language_code: "lg" };
  mockLoadContentBundle.mockImplementation((languageCode: "lg" | "nyn") =>
    Promise.resolve(contentResult(languageCode)),
  );
  mockLoadGameSounds.mockResolvedValue({
    correctSound: { id: "correct" },
    wrongSound: { id: "wrong" },
  });
  mockSaveWordProgress.mockResolvedValue(undefined);
  mockSaveCountingProgress.mockResolvedValue(undefined);
  mockSaveLearningProgress.mockResolvedValue(true);
  mockSaveActivity.mockResolvedValue(true);
  mockSyncProgressNow.mockResolvedValue({ failed: 0, pushed: 0, skipped: 0 });
  mockCheckAndGrantNewAchievements.mockResolvedValue([]);
});

describe("game hydration request scopes", () => {
  it("discards an older child request that resolves after the newer Word request", async () => {
    const older = deferred<ReturnType<typeof wordProgress>>();
    const newer = deferred<ReturnType<typeof wordProgress>>();
    mockLoadWordProgress.mockImplementation((childId: string) =>
      childId === "child-a" ? older.promise : newer.promise,
    );

    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<WordGame />);
      await flush();
    });

    mockActiveChild = { id: "child-b", selected_language_code: "lg" };
    await act(async () => {
      tree.update(<WordGame />);
      await flush();
    });

    await act(async () => {
      newer.resolve(wordProgress("child-b", 1));
      await newer.promise;
      await flush();
    });
    expect(JSON.stringify(tree.toJSON())).toContain("Luganda second question");

    await act(async () => {
      older.resolve(wordProgress("child-a", 0));
      await older.promise;
      await flush();
    });

    expect(JSON.stringify(tree.toJSON())).toContain("Luganda second question");
    expect(JSON.stringify(tree.toJSON())).not.toContain("Luganda first question");
    expect(mockLoadWordProgress).toHaveBeenCalledWith(
      "child-a",
      "lg",
      expect.arrayContaining([expect.objectContaining({ word: "APE" })]),
    );
    expect(mockLoadWordProgress).toHaveBeenCalledWith(
      "child-b",
      "lg",
      expect.arrayContaining([expect.objectContaining({ word: "BEE" })]),
    );

    act(() => tree.unmount());
  });

  it("discards delayed old-language Counting progress after a language switch", async () => {
    const luganda = deferred<ReturnType<typeof countingProgress>>();
    const runyankole = deferred<ReturnType<typeof countingProgress>>();
    mockLoadCountingProgress.mockImplementation(
      (_childId: string, languageCode: string) =>
        languageCode === "lg" ? luganda.promise : runyankole.promise,
    );

    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<CountingGame />);
      await flush();
    });

    mockActiveChild = { id: "child-a", selected_language_code: "nyn" };
    await act(async () => {
      tree.update(<CountingGame />);
      await flush();
    });

    await act(async () => {
      runyankole.resolve(countingProgress("child-a"));
      await runyankole.promise;
      await flush();
    });

    const stageButton = tree.root.findAllByType(TouchableOpacity).find(
      (candidate) =>
        typeof candidate.props.accessibilityLabel === "string" &&
        candidate.props.accessibilityLabel.startsWith("Runyankole Stage One."),
    );
    expect(stageButton?.props.accessibilityLabel).toContain("Lvl 1");

    await act(async () => {
      luganda.resolve(countingProgress("child-a", [1]));
      await luganda.promise;
      await flush();
    });

    const currentStageButton = tree.root.findAllByType(TouchableOpacity).find(
      (candidate) =>
        typeof candidate.props.accessibilityLabel === "string" &&
        candidate.props.accessibilityLabel.startsWith("Runyankole Stage One."),
    );
    expect(currentStageButton?.props.accessibilityLabel).toContain("Lvl 1");
    expect(currentStageButton?.props.accessibilityLabel).not.toContain("Done");
    expect(mockLoadCountingProgress).toHaveBeenCalledWith("child-a", "lg", [1]);
    expect(mockLoadCountingProgress).toHaveBeenCalledWith("child-a", "nyn", [1]);

    act(() => tree.unmount());
  });

  it("does not update legacy Learning state after unmount during progress hydration", async () => {
    const pendingProgress = deferred<{
      completedLevels: number[];
      stages: ReturnType<typeof learningStages>;
      totalScore: number;
      userStats: Record<string, unknown>;
    }>();
    mockLoadLearningProgress.mockReturnValue(pendingProgress.promise);

    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<LearningGame />);
      await flush();
    });
    expect(mockLoadLearningProgress).toHaveBeenCalledWith(
      "child-a",
      "lg",
      expect.any(Array),
    );

    act(() => tree.unmount());

    await act(async () => {
      pendingProgress.resolve({
        completedLevels: [],
        stages: learningStages("late"),
        totalScore: 99,
        userStats: {
          correctAnswers: 4,
          lastPlayed: "2026-07-14T00:00:00.000Z",
          streakDays: 1,
          totalWords: 4,
          wrongAnswers: 0,
        },
      });
      await pendingProgress.promise;
      await flush();
    });

    expect(tree.toJSON()).toBeNull();
    expect(mockUnloadAppSound).toHaveBeenCalledWith({ id: "correct" });
    expect(mockUnloadAppSound).toHaveBeenCalledWith({ id: "wrong" });
  });

  it("unloads stale legacy Learning sounds when an older language request resolves last", async () => {
    const oldSounds = deferred<{ correctSound: object; wrongSound: object }>();
    const newSounds = deferred<{ correctSound: object; wrongSound: object }>();
    mockLoadGameSounds
      .mockReturnValueOnce(oldSounds.promise)
      .mockReturnValueOnce(newSounds.promise);
    mockLoadLearningProgress.mockImplementation(
      (_childId: string, languageCode: string) =>
        Promise.resolve({
          completedLevels: [],
          stages: learningStages(languageCode),
          totalScore: 0,
          userStats: {
            correctAnswers: 0,
            lastPlayed: "2026-07-14T00:00:00.000Z",
            streakDays: 1,
            totalWords: 0,
            wrongAnswers: 0,
          },
        }),
    );

    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<LearningGame />);
      await flush();
    });

    mockActiveChild = { id: "child-a", selected_language_code: "nyn" };
    await act(async () => {
      tree.update(<LearningGame />);
      await flush();
    });

    const currentCorrect = { id: "current-correct" };
    const currentWrong = { id: "current-wrong" };
    await act(async () => {
      newSounds.resolve({ correctSound: currentCorrect, wrongSound: currentWrong });
      await newSounds.promise;
      await flush();
    });

    const staleCorrect = { id: "stale-correct" };
    const staleWrong = { id: "stale-wrong" };
    await act(async () => {
      oldSounds.resolve({ correctSound: staleCorrect, wrongSound: staleWrong });
      await oldSounds.promise;
      await flush();
    });

    expect(JSON.stringify(tree.toJSON())).toContain("Runyankole Learning");
    expect(mockUnloadAppSound).toHaveBeenCalledWith(staleCorrect);
    expect(mockUnloadAppSound).toHaveBeenCalledWith(staleWrong);
    expect(mockUnloadAppSound).not.toHaveBeenCalledWith(currentCorrect);
    expect(mockUnloadAppSound).not.toHaveBeenCalledWith(currentWrong);

    act(() => tree.unmount());
  });

  it("does not rehydrate Counting content when achievement loading changes", async () => {
    mockLoadCountingProgress.mockResolvedValue(countingProgress("child-a"));

    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<CountingGame />);
      await flush();
    });

    expect(mockLoadContentBundle).toHaveBeenCalledTimes(1);
    expect(mockLoadCountingProgress).toHaveBeenCalledTimes(1);

    mockIsLoadingAchievements = true;
    await act(async () => {
      tree.update(<CountingGame />);
      await flush();
    });

    expect(mockLoadContentBundle).toHaveBeenCalledTimes(1);
    expect(mockLoadCountingProgress).toHaveBeenCalledTimes(1);

    act(() => tree.unmount());
  });

  it("shows legacy Learning content without waiting for optional sounds", async () => {
    const pendingSounds = deferred<{ correctSound: object; wrongSound: object }>();
    mockLoadGameSounds.mockReturnValue(pendingSounds.promise);
    mockLoadLearningProgress.mockResolvedValue({
      completedLevels: [],
      stages: learningStages("Luganda"),
      totalScore: 0,
      userStats: {
        correctAnswers: 0,
        lastPlayed: "2026-07-14T00:00:00.000Z",
        streakDays: 1,
        totalWords: 0,
        wrongAnswers: 0,
      },
    });

    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<LearningGame />);
      await flush();
    });

    expect(JSON.stringify(tree.toJSON())).toContain("Luganda Learning");

    await act(async () => {
      pendingSounds.resolve({
        correctSound: { id: "late-correct" },
        wrongSound: { id: "late-wrong" },
      });
      await pendingSounds.promise;
      await flush();
    });

    act(() => tree.unmount());
  });

  it("shows a recoverable state instead of spinning forever for an empty Learning level", async () => {
    const stages = learningStages("Luganda");
    stages[0].levels[0].words = [];
    mockLoadContentBundle.mockResolvedValue({
      ...contentResult("lg"),
      bundle: {
        ...contentResult("lg").bundle,
        learningGame: { title: "Luganda Learning", stages },
      },
    });
    mockLoadLearningProgress.mockResolvedValue({
      completedLevels: [],
      stages,
      totalScore: 0,
      userStats: {
        correctAnswers: 0,
        lastPlayed: "2026-07-14T00:00:00.000Z",
        streakDays: 1,
        totalWords: 0,
        wrongAnswers: 0,
      },
    });

    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<LearningGame />);
      await flush();
    });

    act(() => findButtonByText(tree, "Luganda stage").props.onPress());
    act(() => findButtonByText(tree, "Luganda level").props.onPress());

    expect(JSON.stringify(tree.toJSON())).toContain("This level is not ready");
    expect(JSON.stringify(tree.toJSON())).toContain("Choose another level");

    act(() => tree.unmount());
  });

  it("shows a recoverable state when a Counting question has no visual items", async () => {
    const result = contentResult("lg");
    result.bundle.countingGame.culturalItems = [];
    mockLoadContentBundle.mockResolvedValue(result);
    mockLoadCountingProgress.mockResolvedValue(countingProgress("child-a"));

    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<CountingGame />);
      await flush();
    });

    const stage = tree.root.findAllByType(TouchableOpacity).find(
      (candidate) =>
        typeof candidate.props.accessibilityLabel === "string" &&
        candidate.props.accessibilityLabel.startsWith("Luganda Stage One."),
    );

    await act(async () => {
      stage!.props.onPress();
      await flush();
    });

    expect(JSON.stringify(tree.toJSON())).toContain(
      "This counting question is not ready",
    );
    expect(JSON.stringify(tree.toJSON())).toContain("Choose another stage");

    act(() => tree.unmount());
  });
});

describe("synchronous game completion locks", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it("deduplicates rapid Word Next Level taps across save, activity, achievements, transition, and notice", async () => {
    const localSave = deferred<void>();
    const lock = { current: null as Promise<void> | null };
    const persistLocal = jest.fn(() => localSave.promise.then(() => "saved"));
    const activity = jest.fn().mockResolvedValue(undefined);
    const achievement = jest.fn().mockResolvedValue(undefined);
    const transition = jest.fn();
    const notice = jest.fn();
    const performWordNextLevel = async () => {
      await completeLocallyFirst({
        persistLocal,
        fallbackValue: "unsaved",
        revealCompletion: () => transition(),
        runBestEffortNetworkWork: async () => {
          await Promise.all([activity(), achievement()]);
          notice();
        },
      });
    };

    const first = runCompletionOnce(lock, performWordNextLevel);
    const second = runCompletionOnce(lock, performWordNextLevel);
    expect(first).toBe(second);
    await Promise.resolve();
    expect(persistLocal).toHaveBeenCalledTimes(1);

    localSave.resolve();
    await Promise.all([first, second]);
    await flush();

    expect(persistLocal).toHaveBeenCalledTimes(1);
    expect(activity).toHaveBeenCalledTimes(1);
    expect(achievement).toHaveBeenCalledTimes(1);
    expect(transition).toHaveBeenCalledTimes(1);
    expect(notice).toHaveBeenCalledTimes(1);
  });

  it("deduplicates rapid Counting final answers and produces one stage completion", async () => {
    const localSave = deferred<void>();
    mockLoadCountingProgress.mockResolvedValue(countingProgress("child-a"));
    const achievement = {
      description: "one notice",
      game_key: "counting_game",
      icon: "star",
      id: "count-lock",
      name: "Counting lock",
      points: 0,
      requirement: {},
    };
    mockCheckAndGrantNewAchievements.mockResolvedValue([achievement]);

    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<CountingGame />);
      await flush();
    });

    const stage = tree.root.findAllByType(TouchableOpacity).find(
      (candidate) =>
        typeof candidate.props.accessibilityLabel === "string" &&
        candidate.props.accessibilityLabel.startsWith("Luganda Stage One."),
    );
    expect(stage).toBeDefined();
    act(() => stage!.props.onPress());
    mockSaveCountingProgress.mockClear();
    mockSaveCountingProgress.mockReturnValue(localSave.promise);

    const answerLabel = tree.root
      .findAll((candidate) => / = \d+$/.test(textContent(candidate)))
      .map(textContent)[0];
    const target = Number(answerLabel?.match(/ = (\d+)$/)?.[1]);
    expect(Number.isFinite(target)).toBe(true);
    const answer = tree.root.findAllByType(TouchableOpacity).find(
      (candidate) =>
        typeof candidate.props.className === "string" &&
        candidate.props.className.includes("w-16 h-16") &&
        textContent(candidate).startsWith(String(target)),
    );
    expect(answer).toBeDefined();

    act(() => {
      answer!.props.onPress();
      answer!.props.onPress();
      jest.advanceTimersByTime(1500);
    });
    expect(mockSaveCountingProgress).toHaveBeenCalledTimes(1);

    await act(async () => {
      localSave.resolve();
      await localSave.promise;
      await flush();
    });

    expect(mockSaveActivity).toHaveBeenCalledTimes(1);
    expect(mockCheckAndGrantNewAchievements).toHaveBeenCalledTimes(2);
    expect(mockCheckAndGrantNewAchievements.mock.calls.map(([event]) => event.type)).toEqual([
      "score_updated",
      "stage_completed",
    ]);
    expect(mockEnqueueAchievementUnlocked).toHaveBeenCalledTimes(1);
    expect((renderedText(tree.toJSON()).match(/Stage 1 Complete!/g) ?? [])).toHaveLength(1);

    act(() => tree.unmount());
  });

  it("deduplicates the legacy final answer and saves the actual final score once", async () => {
    const localSave = deferred<boolean>();
    const stages = learningStages("Luganda");
    mockLoadLearningProgress.mockResolvedValue({
      completedLevels: [],
      stages,
      totalScore: 0,
      userStats: {
        correctAnswers: 0,
        lastPlayed: "2026-07-14T00:00:00.000Z",
        streakDays: 1,
        totalWords: 0,
        wrongAnswers: 0,
      },
    });
    mockSaveLearningProgress.mockReturnValue(localSave.promise);
    const achievement = {
      description: "one notice",
      game_key: "luganda_learning_game",
      icon: "star",
      id: "learning-lock",
      name: "Learning lock",
      points: 0,
      requirement: {},
    };
    mockCheckAndGrantNewAchievements.mockResolvedValue([achievement]);

    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<LearningGame />);
      await flush();
    });

    const stage = tree.root.findAllByType(TouchableOpacity).find(
      (candidate) =>
        typeof candidate.props.accessibilityLabel === "string" &&
        candidate.props.accessibilityLabel.startsWith("Luganda stage."),
    );
    expect(stage).toBeDefined();
    act(() => stage!.props.onPress());

    const level = tree.root.findAllByType(TouchableOpacity).find(
      (candidate) =>
        typeof candidate.props.accessibilityLabel === "string" &&
        candidate.props.accessibilityLabel.startsWith("Luganda level."),
    );
    expect(level).toBeDefined();
    act(() => level!.props.onPress());
    act(() => findButtonByText(tree, "Play Game").props.onPress());

    for (const answerText of ["one", "two", "three"]) {
      const answer = findButtonByText(tree, answerText);
      act(() => {
        answer.props.onPress();
        jest.advanceTimersByTime(1800);
      });
    }

    const finalAnswer = findButtonByText(tree, "four");
    act(() => {
      finalAnswer.props.onPress();
      finalAnswer.props.onPress();
      jest.advanceTimersByTime(1500);
    });
    expect(mockSaveLearningProgress).toHaveBeenCalledTimes(1);
    expect(mockSaveLearningProgress.mock.calls[0][0]).toBe(40);

    await act(async () => {
      localSave.resolve(true);
      await localSave.promise;
      await flush();
    });

    expect(mockSaveActivity).toHaveBeenCalledTimes(1);
    expect(mockSaveActivity).toHaveBeenCalledWith(
      expect.objectContaining({ score: "40" }),
    );
    expect(mockCheckAndGrantNewAchievements).toHaveBeenCalledTimes(5);
    expect(new Set(mockCheckAndGrantNewAchievements.mock.calls.map(([event]) => event.type))).toEqual(
      new Set([
        "level_completed",
        "level_perfect_clear",
        "stage_completed",
        "score_updated",
        "stats_updated",
      ]),
    );
    expect(mockEnqueueAchievementUnlocked).toHaveBeenCalledTimes(1);
    expect((renderedText(tree.toJSON()).match(/Level Complete!/g) ?? [])).toHaveLength(1);

    act(() => tree.unmount());
  });

  it("keeps legacy completion non-blocking when its local save result is false", async () => {
    const stages = learningStages("Luganda");
    mockLoadLearningProgress.mockResolvedValue({
      completedLevels: [],
      stages,
      totalScore: 0,
      userStats: {
        correctAnswers: 0,
        lastPlayed: "2026-07-14T00:00:00.000Z",
        streakDays: 1,
        totalWords: 0,
        wrongAnswers: 0,
      },
    });
    mockSaveLearningProgress.mockResolvedValue(false);
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);

    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<LearningGame />);
      await flush();
    });

    const stage = tree.root.findAllByType(TouchableOpacity).find(
      (candidate) =>
        typeof candidate.props.accessibilityLabel === "string" &&
        candidate.props.accessibilityLabel.startsWith("Luganda stage."),
    );
    act(() => stage!.props.onPress());
    const level = tree.root.findAllByType(TouchableOpacity).find(
      (candidate) =>
        typeof candidate.props.accessibilityLabel === "string" &&
        candidate.props.accessibilityLabel.startsWith("Luganda level."),
    );
    act(() => level!.props.onPress());
    act(() => findButtonByText(tree, "Play Game").props.onPress());

    for (const answerText of ["one", "two", "three", "four"]) {
      const answer = findButtonByText(tree, answerText);
      act(() => {
        answer.props.onPress();
        jest.advanceTimersByTime(answerText === "four" ? 1500 : 1800);
      });
    }
    await act(async () => {
      await flush();
    });

    expect(mockSaveLearningProgress).toHaveBeenCalledTimes(1);
    expect(mockSaveLearningProgress.mock.calls[0][0]).toBe(40);
    expect(warnSpy).toHaveBeenCalledWith(
      "Legacy Learning completion was not durably saved locally:",
      expect.any(Error),
    );
    expect(mockSaveActivity).toHaveBeenCalledTimes(1);
    expect(mockCheckAndGrantNewAchievements).toHaveBeenCalledTimes(5);
    expect(renderedText(tree.toJSON())).toContain("Level Complete!");

    warnSpy.mockRestore();
    act(() => tree.unmount());
  });
});
