import React from "react";
import renderer, { act } from "react-test-renderer";
import { TouchableOpacity } from "react-native";
import * as Speech from "expo-speech";
import { GenericStoryRenderer } from "../GenericStoryRenderer";
import { lugandaStories } from "@/content/luganda/stories";
import {
  getStageProgress,
  markStageStarted,
  markStageCompleted,
  syncProgressNow,
  updateActivityProgress,
} from "@/lib/progressRepository";
import { saveActivity } from "@/lib/utils";
import type { LocalStory } from "@/content/types";

const runyankoleStoryFixture: LocalStory = {
  id: "nyn-sample-morning-greeting",
  title: "Agandi Omuka",
  summary: "Testing-only exact-language story fixture.",
  languageCode: "nyn",
  metadata: { status: "placeholder" },
  pages: [
    {
      id: "nyn-sample-morning-greeting-page-1",
      text: "Agandi? Nimarungi. A learner greets the family at home.",
      translation: "How are you? I am fine.",
      image: "learning-beginner.jpg",
    },
    {
      id: "nyn-sample-morning-greeting-page-2",
      text: "Webare, Mama. The learner helps at home.",
      translation: "Thank you, Mama.",
      image: "learning-beginner.jpg",
    },
  ],
  questions: [
    {
      id: "nyn-sample-morning-greeting-question-1",
      question: "Which greeting appears?",
      options: ["Agandi", "Oli otya"],
      correctAnswer: 0,
    },
  ],
};

const mockSpeakAppText = jest.fn((text: string, options: Record<string, unknown>) => {
  Speech.speak(text, options);
  return true;
});

let mockActiveChild: { id: string; selected_language_code?: string } | null = null;
const mockBack = jest.fn();
let mockStageProgress: {
  status: "in_progress" | "completed";
  progress_payload: Record<string, unknown>;
} | null = null;

const deferred = <T,>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, reject, resolve };
};

jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock",
  ),
);

jest.mock("@/lib/supabase", () => ({
  supabase: {
    from: jest.fn(),
  },
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ back: mockBack }),
}));

jest.mock("expo-speech", () => ({
  speak: jest.fn(),
  stop: jest.fn(),
}));

jest.mock("@/context/AudioContext", () => ({
  useAudio: () => ({
    settings: {
      backgroundMusicMuted: false,
      backgroundMusicVolume: 0.35,
      appSoundsMuted: false,
      appSoundsVolume: 1,
      selectedBackgroundTrackId: "default",
    },
  }),
}));

jest.mock("@/lib/audioManager", () => ({
  audioManager: {
    speakAppText: (text: string, options: Record<string, unknown>) =>
      mockSpeakAppText(text, options),
  },
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: (props: Record<string, unknown>) => {
    const { View } = jest.requireActual("react-native");
    return <View {...props} />;
  },
}));

jest.mock("@/context/ChildContext", () => ({
  useChild: () => ({ activeChild: mockActiveChild }),
}));

jest.mock("@/content/imagePreloader", () => ({
  preloadStoryImages: jest.fn().mockResolvedValue({
    attempted: 0,
    fulfilled: 0,
    rejected: 0,
  }),
}));

jest.mock("@/lib/progressRepository", () => ({
  getStageProgress: jest.fn(() => Promise.resolve(mockStageProgress)),
  markStageCompleted: jest.fn().mockResolvedValue(undefined),
  markStageStarted: jest.fn().mockResolvedValue(undefined),
  syncProgressNow: jest.fn().mockResolvedValue({ pushed: 0, skipped: 0, failed: 0 }),
  updateActivityProgress: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/lib/utils", () => ({
  saveActivity: jest.fn().mockResolvedValue(true),
}));

jest.mock("@/components/common/CachedImage", () => ({
  CachedImage: (props: Record<string, unknown>) => {
    const { View } = jest.requireActual("react-native");
    return <View {...props} />;
  },
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

const findButtonByText = (
  root: renderer.ReactTestInstance,
  label: string,
): renderer.ReactTestInstance => {
  const button = root.findAllByType(TouchableOpacity).find((candidate) =>
    textContent(candidate).includes(label),
  );

  if (!button) {
    throw new Error(`Could not find button with text: ${label}`);
  }

  return button;
};

const findButtonByAccessibilityLabel = (
  root: renderer.ReactTestInstance,
  label: string,
): renderer.ReactTestInstance => {
  const button = root.findAllByType(TouchableOpacity).find((candidate) =>
    candidate.props.accessibilityLabel === label,
  );

  if (!button) {
    throw new Error(`Could not find button with accessibility label: ${label}`);
  }

  return button;
};

const renderStory = (story: LocalStory) => {
  let tree: renderer.ReactTestRenderer | undefined;

  act(() => {
    tree = renderer.create(<GenericStoryRenderer story={story} />);
  });

  if (!tree) {
    throw new Error("Story renderer did not mount");
  }

  return tree;
};

beforeEach(() => {
  jest.clearAllMocks();
  mockActiveChild = null;
  mockStageProgress = null;
});

describe("GenericStoryRenderer", () => {
  it("renders a seeded Luganda story with non-empty page and quiz content", async () => {
    const story = {
      ...lugandaStories.find((item) => item.id === "fig-tree")!,
      pages: [lugandaStories.find((item) => item.id === "fig-tree")!.pages[0]],
    };

    const tree = renderStory(story);

    expect(JSON.stringify(tree.toJSON())).toContain("Mutuba fig tree");
    expect(JSON.stringify(tree.toJSON())).toContain("What was special");
    expect(JSON.stringify(tree.toJSON())).toContain("It produced bark cloth");
    expect(saveActivity).not.toHaveBeenCalled();
  });

  it("renders the Runyankole generic story with non-empty text", () => {
    const tree = renderStory(runyankoleStoryFixture);

    expect(JSON.stringify(tree.toJSON())).toContain("Agandi");
    expect(JSON.stringify(tree.toJSON())).not.toContain("Story not ready");
  });

  it("restores language-scoped in-progress page state without logging activity", async () => {
    mockActiveChild = {
      id: "child-1",
      selected_language_code: "nyn",
    };
    mockStageProgress = {
      status: "in_progress",
      progress_payload: { currentPageIndex: 1 },
    };

    const tree = renderStory(runyankoleStoryFixture);

    await act(async () => {
      await Promise.resolve();
    });

    expect(getStageProgress).toHaveBeenCalledWith(
      "child-1",
      "nyn",
      "stories",
      "nyn-sample-morning-greeting",
    );
    expect(JSON.stringify(tree.toJSON())).toContain("Webare,");
    expect(JSON.stringify(tree.toJSON())).toContain("Mama.");
    expect(markStageStarted).toHaveBeenCalledWith(
      "child-1",
      "nyn",
      "stories",
      "nyn-sample-morning-greeting",
      expect.objectContaining({
        progress_payload: expect.objectContaining({
          currentPageIndex: 1,
          currentPage: 2,
        }),
      }),
    );
    expect(saveActivity).not.toHaveBeenCalled();
  });

  it("does not restore story progress from another content revision", async () => {
    mockActiveChild = {
      id: "child-1",
      selected_language_code: "nyn",
    };
    mockStageProgress = {
      status: "in_progress",
      progress_payload: {
        currentPageIndex: 1,
        contentRevision: "story/nyn-sample-morning-greeting#1",
      },
    };
    const revisedStory: LocalStory = {
      ...runyankoleStoryFixture,
      progressRevision: "story/nyn-sample-morning-greeting#2",
    };

    const tree = renderStory(revisedStory);

    await act(async () => {
      await Promise.resolve();
    });

    expect(JSON.stringify(tree.toJSON())).toContain("Agandi?");
    expect(JSON.stringify(tree.toJSON())).not.toContain("Webare,");
    expect(markStageStarted).toHaveBeenCalledWith(
      "child-1",
      "nyn",
      "stories",
      "nyn-sample-morning-greeting",
      expect.objectContaining({
        progress_payload: expect.objectContaining({
          currentPageIndex: 0,
          contentRevision: "story/nyn-sample-morning-greeting#2",
        }),
      }),
    );
  });

  it("waits for quiz answers before enabling story completion", async () => {
    mockActiveChild = {
      id: "child-1",
      selected_language_code: "lg",
    };
    const story = {
      ...lugandaStories.find((item) => item.id === "kintu")!,
      pages: [lugandaStories.find((item) => item.id === "kintu")!.pages[0]],
      questions: [lugandaStories.find((item) => item.id === "kintu")!.questions![0]],
    };
    const tree = renderStory(story);

    await act(async () => {
      await Promise.resolve();
    });

    expect(findButtonByText(tree.root, "Finish").props.disabled).toBe(true);
    expect(saveActivity).not.toHaveBeenCalled();
    expect(markStageStarted).toHaveBeenCalledWith(
      "child-1",
      "lg",
      "stories",
      "kintu",
      expect.objectContaining({
        progress_payload: expect.objectContaining({
          currentPageIndex: 0,
          currentPage: 1,
        }),
      }),
    );

    await act(async () => {
      findButtonByText(tree.root, "The first person on Earth").props.onPress();
    });

    const finishButton = findButtonByText(tree.root, "Finish");
    expect(finishButton.props.disabled).toBe(false);

    await act(async () => {
      await Promise.all([finishButton.props.onPress(), finishButton.props.onPress()]);
    });

    expect(saveActivity).toHaveBeenCalledTimes(1);
    expect(saveActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        child_id: "child-1",
        activity_type: "stories",
        activity_name: 'Read "The Tale of Kintu"',
        score: "1/1",
        language_code: "lg",
      }),
    );
    expect(updateActivityProgress).toHaveBeenCalledWith(
      "child-1",
      "lg",
      "stories",
      expect.objectContaining({
        status: "completed",
        score: 100,
        last_stage_id: "kintu",
        progress_payload: expect.objectContaining({
          storyId: "kintu",
          quizScore: 1,
          quizTotal: 1,
        }),
      }),
    );
    expect(markStageCompleted).toHaveBeenCalledWith(
      "child-1",
      "lg",
      "stories",
      "kintu",
      expect.objectContaining({ score: 100 }),
    );
    expect(syncProgressNow).toHaveBeenCalledWith("child-1");
    expect(mockBack).not.toHaveBeenCalled();
    expect(JSON.stringify(tree.toJSON())).toContain("story-completion-card");
    expect(JSON.stringify(tree.toJSON())).toContain("Story complete!");
    expect(JSON.stringify(tree.toJSON())).toContain("Quiz result");
    expect(JSON.stringify(tree.toJSON())).toContain("1/1");

    await act(async () => {
      findButtonByAccessibilityLabel(tree.root, "Back to Stories").props.onPress();
    });

    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it("queues local story progress and reveals completion while activity insertion is delayed", async () => {
    mockActiveChild = {
      id: "child-1",
      selected_language_code: "lg",
    };
    const story = {
      ...lugandaStories.find((item) => item.id === "kintu")!,
      pages: [lugandaStories.find((item) => item.id === "kintu")!.pages[0]],
      questions: [],
    };
    const delayedActivity = deferred<boolean>();
    const timeline: string[] = [];
    let activitySettled = false;
    let completionSettled = false;

    (updateActivityProgress as jest.Mock).mockImplementationOnce(async () => {
      timeline.push("local-activity-progress");
    });
    (markStageCompleted as jest.Mock).mockImplementationOnce(async () => {
      timeline.push("local-stage-progress");
    });
    (saveActivity as jest.Mock).mockImplementationOnce(() => {
      timeline.push("activity-insert");
      void delayedActivity.promise.then(() => {
        activitySettled = true;
      }).catch(() => {
        activitySettled = true;
      });
      return delayedActivity.promise;
    });
    (syncProgressNow as jest.Mock).mockImplementationOnce(async () => {
      timeline.push("progress-sync");
      return { pushed: 0, skipped: 0, failed: 0 };
    });

    const tree = renderStory(story);
    await act(async () => {
      await Promise.resolve();
    });

    let completionPromise!: Promise<void>;
    act(() => {
      completionPromise = Promise.resolve(
        findButtonByText(tree.root, "Finish").props.onPress(),
      );
      void completionPromise.then(() => {
        completionSettled = true;
      }).catch(() => {
        completionSettled = true;
      });
    });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(timeline).toEqual([
      "local-activity-progress",
      "local-stage-progress",
      "activity-insert",
      "progress-sync",
    ]);
    expect(completionSettled).toBe(true);
    expect(activitySettled).toBe(false);
    expect(JSON.stringify(tree.toJSON())).toContain("story-completion-card");

    await act(async () => {
      delayedActivity.resolve(true);
      await delayedActivity.promise;
      await completionPromise;
    });
  });

  it("keeps story completion visible when detached activity insertion rejects", async () => {
    mockActiveChild = {
      id: "child-1",
      selected_language_code: "nyn",
    };
    const story = {
      ...runyankoleStoryFixture,
      pages: [runyankoleStoryFixture.pages[0]],
      questions: [],
    };
    const rejectedActivity = deferred<boolean>();
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    (saveActivity as jest.Mock).mockReturnValueOnce(rejectedActivity.promise);

    const tree = renderStory(story);
    await act(async () => {
      await Promise.resolve();
    });

    let completionPromise!: Promise<void>;
    act(() => {
      completionPromise = Promise.resolve(
        findButtonByText(tree.root, "Finish").props.onPress(),
      );
    });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(updateActivityProgress).toHaveBeenCalledWith(
      "child-1",
      "nyn",
      "stories",
      expect.objectContaining({ status: "completed" }),
    );
    expect(markStageCompleted).toHaveBeenCalled();
    expect(JSON.stringify(tree.toJSON())).toContain("story-completion-card");
    await expect(completionPromise).resolves.toBeUndefined();

    await act(async () => {
      rejectedActivity.reject(new Error("offline"));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(warnSpy).toHaveBeenCalledWith(
      "Could not finish background story completion work:",
      expect.any(Error),
    );
    expect(JSON.stringify(tree.toJSON())).toContain("story-completion-card");
    warnSpy.mockRestore();
  });

  it("does not reveal story completion after unmount while local completion is pending", async () => {
    mockActiveChild = {
      id: "child-1",
      selected_language_code: "lg",
    };
    const story = {
      ...lugandaStories.find((item) => item.id === "kintu")!,
      pages: [lugandaStories.find((item) => item.id === "kintu")!.pages[0]],
      questions: [],
    };
    const delayedLocalWrite = deferred<void>();
    (updateActivityProgress as jest.Mock).mockReturnValueOnce(delayedLocalWrite.promise);

    const tree = renderStory(story);
    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      findButtonByText(tree.root, "Finish").props.onPress();
    });
    expect(updateActivityProgress).toHaveBeenCalledTimes(1);

    act(() => tree.unmount());

    await act(async () => {
      delayedLocalWrite.resolve();
      await delayedLocalWrite.promise;
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(tree.toJSON()).toBeNull();
    expect(markStageCompleted).toHaveBeenCalledTimes(1);
    expect(saveActivity).toHaveBeenCalledTimes(1);
    expect(syncProgressNow).toHaveBeenCalledTimes(1);
  });

  it("reports a local story write failure while keeping completion and later work non-blocking", async () => {
    mockActiveChild = {
      id: "child-1",
      selected_language_code: "nyn",
    };
    const story = {
      ...runyankoleStoryFixture,
      pages: [runyankoleStoryFixture.pages[0]],
      questions: [],
    };
    const localError = new Error("storage unavailable");
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    (updateActivityProgress as jest.Mock).mockRejectedValueOnce(localError);

    const tree = renderStory(story);
    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      findButtonByText(tree.root, "Finish").props.onPress();
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(warnSpy).toHaveBeenCalledWith(
      "Could not persist story completion locally:",
      localError,
    );
    expect(markStageCompleted).not.toHaveBeenCalled();
    expect(saveActivity).toHaveBeenCalledTimes(1);
    expect(syncProgressNow).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(tree.toJSON())).toContain("story-completion-card");
    expect(JSON.stringify(tree.toJSON())).toContain("Story complete!");

    warnSpy.mockRestore();
    act(() => tree.unmount());
  });

  it("reads the current story page aloud at the selected speed", async () => {
    const story = {
      ...lugandaStories.find((item) => item.id === "kintu")!,
      pages: [lugandaStories.find((item) => item.id === "kintu")!.pages[0]],
      questions: [],
    };
    const tree = renderStory(story);

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      findButtonByAccessibilityLabel(tree.root, "Open accessibility options").props.onPress();
    });

    await act(async () => {
      findButtonByText(tree.root, "Fast").props.onPress();
    });

    await act(async () => {
      findButtonByAccessibilityLabel(tree.root, "Read page aloud").props.onPress();
    });

    expect(Speech.speak).toHaveBeenCalledWith(
      expect.stringContaining("Long ago, Kintu"),
      expect.objectContaining({
        rate: 1,
      }),
    );

    const speechOptions = (Speech.speak as jest.Mock).mock.calls[0][1] as {
      onBoundary: (event: { charIndex: number; charLength: number }) => void;
      onDone: () => void;
    };

    await act(async () => {
      speechOptions.onBoundary({
        charIndex: story.pages[0].text.indexOf("Kintu"),
        charLength: "Kintu".length,
      });
    });

    expect(JSON.stringify(tree.toJSON())).toContain("#FDE68A");

    await act(async () => {
      speechOptions.onDone();
    });
  });

  it("does not log or downgrade progress when reopening an already completed story", async () => {
    mockActiveChild = {
      id: "child-1",
      selected_language_code: "lg",
    };
    mockStageProgress = {
      status: "completed",
      progress_payload: { currentPageIndex: 0 },
    };
    const story = {
      ...lugandaStories.find((item) => item.id === "walumbe")!,
      pages: [lugandaStories.find((item) => item.id === "walumbe")!.pages[0]],
      questions: [],
    };
    const tree = renderStory(story);

    await act(async () => {
      await Promise.resolve();
    });

    expect(getStageProgress).toHaveBeenCalledWith(
      "child-1",
      "lg",
      "stories",
      "walumbe",
    );
    expect(markStageStarted).not.toHaveBeenCalled();

    await act(async () => {
      await findButtonByText(tree.root, "Finish").props.onPress();
    });

    expect(saveActivity).not.toHaveBeenCalled();
    expect(updateActivityProgress).not.toHaveBeenCalled();
    expect(markStageCompleted).not.toHaveBeenCalled();
    expect(syncProgressNow).not.toHaveBeenCalled();
    expect(mockBack).not.toHaveBeenCalled();
    expect(JSON.stringify(tree.toJSON())).toContain("story-completion-card");

    await act(async () => {
      findButtonByAccessibilityLabel(tree.root, "Read Again").props.onPress();
    });

    expect(JSON.stringify(tree.toJSON())).not.toContain("story-completion-card");

    await act(async () => {
      await findButtonByText(tree.root, "Finish").props.onPress();
    });

    expect(saveActivity).not.toHaveBeenCalled();
    expect(markStageCompleted).not.toHaveBeenCalled();
    expect(JSON.stringify(tree.toJSON())).toContain("story-completion-card");
  });
});
