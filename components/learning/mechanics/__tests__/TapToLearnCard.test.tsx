import React from "react";
import renderer, { act } from "react-test-renderer";
import { TouchableOpacity } from "react-native";
import type { TapToLearnItem } from "@/content/learningHubTypes";
import { TapToLearnCard } from "../TapToLearnCard";

const mockCreateAppSound = jest.fn();
const mockReplayAppSound = jest.fn();
const mockUnloadAppSound = jest.fn();
const mockResolveLearningAudioSource = jest.fn();
const mockSound = { id: "sound" };

jest.mock("@/context/AudioContext", () => ({
  useAudio: () => ({
    createAppSound: (...args: unknown[]) => mockCreateAppSound(...args),
    replayAppSound: (...args: unknown[]) => mockReplayAppSound(...args),
    unloadAppSound: (...args: unknown[]) => mockUnloadAppSound(...args),
  }),
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

const item: TapToLearnItem = {
  id: "thank-you",
  mechanic: "tap_to_learn",
  order: 1,
  localText: "Webale",
  englishText: "Thank you",
  word: "Webale",
  translation: "Thank you",
  imageKey: "learning-beginner.jpg",
  audioKey: "webale",
  audioAsset: "webale",
  readiness: "draft",
};

const flushEffects = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
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
      <TapToLearnCard
        item={item}
        isLastItem={isLastItem}
        stageImageKey="learning-beginner.jpg"
        onComplete={onComplete}
      />,
    );
  });
  await flushEffects();

  if (!tree) {
    throw new Error("TapToLearnCard did not mount");
  }

  return tree;
};

beforeEach(() => {
  jest.clearAllMocks();
  mockCreateAppSound.mockResolvedValue(mockSound);
  mockReplayAppSound.mockResolvedValue(true);
  mockUnloadAppSound.mockResolvedValue(undefined);
  mockResolveLearningAudioSource.mockReturnValue({
    source: "webale-sound",
    isPlaceholder: false,
  });
});

describe("TapToLearnCard", () => {
  it("renders the local-language word and English translation", async () => {
    const tree = await renderCard();

    expect(JSON.stringify(tree.toJSON())).toContain("Webale");
    expect(JSON.stringify(tree.toJSON())).toContain("Thank you");
    expect(mockResolveLearningAudioSource).toHaveBeenCalledWith("webale", "webale");
  });

  it("calls onComplete once when Next is pressed", async () => {
    const onComplete = jest.fn();
    const tree = await renderCard(onComplete);

    await act(async () => {
      findButtonByText(tree.root, "Next").props.onPress();
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        itemId: "thank-you",
        mechanic: "tap_to_learn",
        completedAt: expect.any(Number),
        attempts: 0,
      }),
    );
    expect(onComplete.mock.calls[0][0]).not.toHaveProperty("correct");
  });

  it("still renders and completes when audio cannot be loaded", () => {
    mockCreateAppSound.mockReturnValue(new Promise(() => undefined));
    mockResolveLearningAudioSource.mockReturnValue({
      source: "placeholder-sound",
      isPlaceholder: true,
    });
    const onComplete = jest.fn();
    let tree: renderer.ReactTestRenderer | undefined;

    act(() => {
      tree = renderer.create(
        <TapToLearnCard
          item={item}
          isLastItem={false}
          stageImageKey="learning-beginner.jpg"
          onComplete={onComplete}
        />,
      );
    });

    if (!tree) {
      throw new Error("TapToLearnCard did not mount");
    }

    const mountedTree = tree;

    expect(JSON.stringify(mountedTree.toJSON())).toContain("Webale");

    act(() => {
      findButtonByText(mountedTree.root, "Next").props.onPress();
    });

    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        itemId: "thank-you",
        mechanic: "tap_to_learn",
      }),
    );
  });

  it("includes replay attempts when Finish is pressed", async () => {
    const onComplete = jest.fn();
    const tree = await renderCard(onComplete, true);

    await act(async () => {
      findButtonByAccessibilityLabel(tree.root, "Listen to Webale").props.onPress();
    });

    await act(async () => {
      findButtonByText(tree.root, "Finish").props.onPress();
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        itemId: "thank-you",
        mechanic: "tap_to_learn",
        attempts: 1,
      }),
    );
  });
});
