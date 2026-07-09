import React from "react";
import renderer, { act } from "react-test-renderer";
import { ScrollView, TouchableOpacity } from "react-native";
import type { MatchWordPictureItem } from "@/content/learningHubTypes";
import { MatchWordPictureCard } from "../MatchWordPictureCard";

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

const item: MatchWordPictureItem = {
  id: "match-water-picture",
  mechanic: "match_word_picture",
  order: 1,
  promptText: "Tap the picture that matches",
  targetText: "Amazzi",
  targetEnglishText: "Water",
  correctOptionId: "water",
  options: [
    {
      id: "water",
      localText: "Amazzi",
      englishText: "Water",
      emoji: "💧",
    },
    {
      id: "mother",
      localText: "Maama",
      englishText: "Mother",
      emoji: "👩",
    },
    {
      id: "father",
      localText: "Taata",
      englishText: "Father",
      emoji: "👨",
    },
  ],
  readiness: "placeholder",
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

const renderCard = (
  onComplete = jest.fn(),
  isLastItem = false,
  cardItem: MatchWordPictureItem = item,
): renderer.ReactTestRenderer => {
  let tree: renderer.ReactTestRenderer | undefined;

  act(() => {
    tree = renderer.create(
      <MatchWordPictureCard
        item={cardItem}
        isLastItem={isLastItem}
        stageImageKey="learning-beginner.jpg"
        onComplete={onComplete}
      />,
    );
  });

  if (!tree) {
    throw new Error("MatchWordPictureCard did not mount");
  }

  return tree;
};

describe("MatchWordPictureCard", () => {
  it("renders the instruction, target word, options, and emoji fallback visuals", () => {
    const tree = renderCard();
    const json = JSON.stringify(tree.toJSON());

    expect(json).toContain("Match the word");
    expect(json).toContain("Tap the picture that matches");
    expect(json).toContain("Amazzi");
    expect(json).toContain("Water");
    expect(json).toContain("Mother");
    expect(json).toContain("💧");
    expect(json).toContain("👩");
  });

  it("renders image-backed options while keeping emoji fallback options", () => {
    const imageBackedItem: MatchWordPictureItem = {
      ...item,
      options: item.options.map((option) =>
        option.id === "water" ? { ...option, imageKey: "rain.jpg" } : option,
      ),
    };
    const tree = renderCard(jest.fn(), false, imageBackedItem);
    const waterPicture = tree.root
      .findAll(
        (node) =>
          node.props.accessibilityLabel === "Water picture" &&
          Boolean(node.props.source),
      )[0];
    const motherFallback = tree.root
      .findAll(
        (node) =>
          node.props.accessibilityLabel === "Mother picture" &&
          !node.props.source,
      )[0];

    expect(waterPicture?.props.source).toBeTruthy();
    expect(motherFallback).toBeTruthy();
  });

  it("does not complete when the wrong option is selected", () => {
    const onComplete = jest.fn();
    const tree = renderCard(onComplete);

    act(() => {
      findButtonByAccessibilityLabel(tree.root, "Choose Mother").props.onPress();
    });

    expect(onComplete).not.toHaveBeenCalled();
    expect(JSON.stringify(tree.toJSON())).toContain("Nice try");
  });

  it("enables completion after the correct option is selected", () => {
    const onComplete = jest.fn();
    const tree = renderCard(onComplete);

    act(() => {
      findButtonByAccessibilityLabel(tree.root, "Choose Water").props.onPress();
    });

    const nextButton = findButtonByText(tree.root, "Next");
    expect(nextButton.props.accessibilityState).toEqual({ disabled: false });

    act(() => {
      nextButton.props.onPress();
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        itemId: "match-water-picture",
        mechanic: "match_word_picture",
        completedAt: expect.any(Number),
        correct: true,
        attempts: 1,
      }),
    );
  });

  it("counts answer taps before finishing", () => {
    const onComplete = jest.fn();
    const tree = renderCard(onComplete, true);

    act(() => {
      findButtonByAccessibilityLabel(tree.root, "Choose Mother").props.onPress();
    });
    act(() => {
      findButtonByAccessibilityLabel(tree.root, "Choose Water").props.onPress();
    });
    act(() => {
      findButtonByText(tree.root, "Finish").props.onPress();
    });

    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        itemId: "match-water-picture",
        mechanic: "match_word_picture",
        correct: true,
        attempts: 2,
      }),
    );
  });

  it("does not depend on vertical scrolling", () => {
    const tree = renderCard();

    expect(tree.root.findAllByType(ScrollView)).toHaveLength(0);
  });
});
