import React from "react";
import renderer, { act } from "react-test-renderer";
import { ScrollView, TouchableOpacity } from "react-native";
import type { StoryBiteItem } from "@/content/learningHubTypes";
import { StoryBiteCard } from "../StoryBiteCard";

const mockCreateAppSound = jest.fn();
const mockReplayAppSound = jest.fn();
const mockUnloadAppSound = jest.fn();
const mockResolveLearningAudioSource = jest.fn();
const mockSound = { id: "story-sound" };

jest.mock("@/context/AudioContext", () => ({
  useAudio: () => ({
    createAppSound: (...args: unknown[]) => mockCreateAppSound(...args),
    replayAppSound: (...args: unknown[]) => mockReplayAppSound(...args),
    unloadAppSound: (...args: unknown[]) => mockUnloadAppSound(...args),
  }),
}));

jest.mock("@/lib/audioAssets", () => ({
  isValidLearningAudioAsset: (asset: unknown) => asset === "webale",
  resolveLearningAudioSource: (...args: unknown[]) =>
    mockResolveLearningAudioSource(...args),
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: (props: Record<string, unknown>) => {
    const { View } = jest.requireActual("react-native");
    return <View {...props} />;
  },
}));

jest.mock("@/components/common/CachedImage", () => ({
  CachedImage: (props: Record<string, unknown>) => {
    const { View } = jest.requireActual("react-native");
    return <View {...props} />;
  },
}));

const item: StoryBiteItem = {
  id: "thank-you-at-home-pages",
  mechanic: "story_bite",
  order: 1,
  title: "Thank You at Home",
  instructions: "Read each small page.",
  pages: [
    {
      id: "helping-at-home",
      title: "Helping at Home",
      localTitle: "Awaka",
      bodyText: "Ari helps Maama place cups on the table before breakfast.",
      localText: "Awaka means at home.",
      imageKey: "child.png",
    },
    {
      id: "kind-words",
      title: "Kind Words",
      localTitle: "Oluganda",
      bodyText: "Maama smiles and says Webale. Ari says Webale nyo.",
      localText: "Webale means thank you.",
      imageKey: "african-focus.png",
      audioKey: "webale",
      audioAsset: "webale",
    },
  ],
  reflectionPrompt: "Who can you thank at home today?",
  readiness: "placeholder",
};

const textContent = (node: unknown): string => {
  if (Array.isArray(node)) {
    return node.map(textContent).join("");
  }

  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (!node || typeof node !== "object") {
    return "";
  }

  const children =
    (node as { props?: { children?: unknown }; children?: unknown }).props
      ?.children ?? (node as { children?: unknown }).children;
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

const renderCard = (
  onComplete = jest.fn(),
  isLastItem = true,
): renderer.ReactTestRenderer => {
  let tree: renderer.ReactTestRenderer | undefined;

  act(() => {
    tree = renderer.create(
      <StoryBiteCard
        item={item}
        isLastItem={isLastItem}
        stageImageKey="learning-beginner.jpg"
        onComplete={onComplete}
      />,
    );
  });

  if (!tree) {
    throw new Error("StoryBiteCard did not mount");
  }

  return tree;
};

beforeEach(() => {
  jest.clearAllMocks();
  mockCreateAppSound.mockResolvedValue(mockSound);
  mockReplayAppSound.mockResolvedValue(true);
  mockUnloadAppSound.mockResolvedValue(undefined);
  mockResolveLearningAudioSource.mockReturnValue({
    source: "webale-source",
    isPlaceholder: false,
  });
});

describe("StoryBiteCard", () => {
  it("renders the first story page clearly", () => {
    const tree = renderCard();
    const renderedOutput = tree.toJSON();
    const json = JSON.stringify(renderedOutput);
    const text = textContent(renderedOutput);

    expect(json).toContain("Story bite");
    expect(text).toContain("Page 1 of 2");
    expect(json).toContain("Helping at Home");
    expect(json).toContain("Ari helps Maama");
    expect(json).toContain("Awaka means at home.");
  });

  it("moves page by page without completing early", () => {
    const onComplete = jest.fn();
    const tree = renderCard(onComplete);

    act(() => {
      findButtonByText(tree.root, "Next").props.onPress();
    });

    const renderedOutput = tree.toJSON();
    const json = JSON.stringify(renderedOutput);
    const text = textContent(renderedOutput);

    expect(onComplete).not.toHaveBeenCalled();
    expect(text).toContain("Page 2 of 2");
    expect(json).toContain("Kind Words");
    expect(json).toContain("Webale means thank you.");
    expect(json).toContain("Who can you thank at home today?");
  });

  it("replays page audio when the current page has audio", async () => {
    const tree = renderCard();

    act(() => {
      findButtonByText(tree.root, "Next").props.onPress();
    });

    await act(async () => {
      findButtonByAccessibilityLabel(tree.root, "Replay story audio").props.onPress();
      await Promise.resolve();
    });

    expect(mockResolveLearningAudioSource).toHaveBeenCalledWith("webale", "webale");
    expect(mockCreateAppSound).toHaveBeenCalledWith("webale-source");
    expect(mockReplayAppSound).toHaveBeenCalledWith(mockSound);
    expect(mockUnloadAppSound).toHaveBeenCalledWith(mockSound);
  });

  it("emits one completion result on the final page", () => {
    const onComplete = jest.fn();
    const tree = renderCard(onComplete);

    act(() => {
      findButtonByText(tree.root, "Next").props.onPress();
    });
    act(() => {
      findButtonByText(tree.root, "I finished the story").props.onPress();
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        itemId: "thank-you-at-home-pages",
        mechanic: "story_bite",
        completedAt: expect.any(Number),
        attempts: 2,
      }),
    );
    expect(onComplete.mock.calls[0][0]).not.toHaveProperty("correct");
  });

  it("keeps its main content in one bounded scroll area", () => {
    const tree = renderCard();

    expect(tree.root.findAllByType(ScrollView)).toHaveLength(1);
  });
});
