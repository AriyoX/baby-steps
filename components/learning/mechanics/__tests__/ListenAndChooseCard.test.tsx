import React from "react";
import renderer, { act } from "react-test-renderer";
import { TouchableOpacity } from "react-native";
import type { ListenAndChooseItem } from "@/content/learningHubTypes";
import { ListenAndChooseCard } from "../ListenAndChooseCard";

const mockCreateAppSound = jest.fn();
const mockReplayAppSound = jest.fn();
const mockUnloadAppSound = jest.fn();
const mockResolveLearningAudioSource = jest.fn();
const mockSound = { id: "listen-sound" };
const mockAudioContextValue = {
  createAppSound: mockCreateAppSound,
  replayAppSound: mockReplayAppSound,
  unloadAppSound: mockUnloadAppSound,
};

jest.mock("@/context/AudioContext", () => ({
  useAudio: () => mockAudioContextValue,
}));

jest.mock("@/lib/audioAssets", () => ({
  LEARNING_PLACEHOLDER_SOUND: "placeholder-sound",
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

const item: ListenAndChooseItem = {
  id: "listen-webale",
  mechanic: "listen_and_choose",
  order: 1,
  promptText: "Tap the word you hear",
  audioKey: "luganda.first_words.greetings.webale",
  audioAsset: "placeholder_learning_cue",
  correctOptionId: "webale",
  options: [
    {
      id: "gyebale-ko",
      order: 1,
      localText: "Gyebale ko",
      englishText: "Hello / well done",
    },
    {
      id: "webale",
      order: 2,
      localText: "Webale",
      englishText: "Thank you",
    },
    {
      id: "amazzi",
      order: 3,
      localText: "Amazzi",
      englishText: "Water",
    },
  ],
  readiness: "placeholder",
};

const flushEffects = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

const waitForReplayCooldown = async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 140));
  });
};

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

const renderCard = async (
  onComplete = jest.fn(),
  isLastItem = false,
): Promise<renderer.ReactTestRenderer> => {
  let tree: renderer.ReactTestRenderer | undefined;

  await act(async () => {
    tree = renderer.create(
      <ListenAndChooseCard
        item={item}
        isLastItem={isLastItem}
        stageImageKey="learning-beginner.jpg"
        onComplete={onComplete}
      />,
    );
  });
  await flushEffects();

  if (!tree) {
    throw new Error("ListenAndChooseCard did not mount");
  }

  return tree;
};

beforeEach(() => {
  jest.clearAllMocks();
  mockCreateAppSound.mockResolvedValue(mockSound);
  mockReplayAppSound.mockResolvedValue(true);
  mockUnloadAppSound.mockResolvedValue(undefined);
  mockResolveLearningAudioSource.mockReturnValue({
    source: "listen-sound",
    isPlaceholder: false,
  });
});

describe("ListenAndChooseCard", () => {
  it("renders the instruction and answer options", async () => {
    const tree = await renderCard();
    const json = JSON.stringify(tree.toJSON());

    expect(json).toContain("Listen and choose");
    expect(json).toContain("Tap the word you hear");
    expect(json).toContain("Webale");
    expect(json).toContain("Amazzi");
  });

  it("replays audio safely when the listen button is pressed", async () => {
    const tree = await renderCard();

    await waitForReplayCooldown();
    mockReplayAppSound.mockClear();

    await act(async () => {
      findButtonByAccessibilityLabel(tree.root, "Replay word").props.onPress();
    });

    expect(mockReplayAppSound).toHaveBeenCalledWith(mockSound);
  });

  it("does not complete when the wrong option is selected", async () => {
    const onComplete = jest.fn();
    const tree = await renderCard(onComplete);

    await act(async () => {
      findButtonByAccessibilityLabel(tree.root, "Choose Amazzi").props.onPress();
    });
    await flushEffects();

    expect(onComplete).not.toHaveBeenCalled();
    expect(JSON.stringify(tree.toJSON())).toContain("Try again");
  });

  it("enables completion after the correct option is selected", async () => {
    const onComplete = jest.fn();
    const tree = await renderCard(onComplete);

    await act(async () => {
      findButtonByAccessibilityLabel(tree.root, "Choose Webale").props.onPress();
    });
    await flushEffects();

    const nextButton = findButtonByText(tree.root, "Next");
    expect(nextButton.props.accessibilityState).toEqual({ disabled: false });

    await act(async () => {
      nextButton.props.onPress();
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        itemId: "listen-webale",
        mechanic: "listen_and_choose",
        completedAt: expect.any(Number),
        correct: true,
        attempts: 1,
      }),
    );
  });

  it("counts answer attempts without counting audio replays", async () => {
    const onComplete = jest.fn();
    const tree = await renderCard(onComplete, true);

    await waitForReplayCooldown();

    await act(async () => {
      findButtonByAccessibilityLabel(tree.root, "Replay word").props.onPress();
    });
    await act(async () => {
      findButtonByAccessibilityLabel(tree.root, "Choose Amazzi").props.onPress();
    });
    await flushEffects();
    await act(async () => {
      findButtonByAccessibilityLabel(tree.root, "Choose Webale").props.onPress();
    });
    await flushEffects();

    await act(async () => {
      findButtonByText(tree.root, "Finish").props.onPress();
    });

    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        itemId: "listen-webale",
        mechanic: "listen_and_choose",
        correct: true,
        attempts: 2,
      }),
    );
  });
});
