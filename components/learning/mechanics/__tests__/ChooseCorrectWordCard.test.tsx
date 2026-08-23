import React from "react";
import renderer, { act } from "react-test-renderer";
import { ScrollView, TouchableOpacity } from "react-native";
import type { ChooseCorrectWordItem } from "@/content/learningHubTypes";
import { ChooseCorrectWordCard } from "../ChooseCorrectWordCard";

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

const item: ChooseCorrectWordItem = {
  id: "choose-thank-you",
  mechanic: "choose_correct_word",
  order: 1,
  promptText: "Which word means Thank you?",
  questionText: "Thank you",
  correctOptionId: "webale",
  options: [
    {
      id: "webale",
      localText: "Webale",
      englishText: "Thank you",
    },
    {
      id: "amazzi",
      localText: "Amazzi",
      englishText: "Water",
    },
    {
      id: "maama",
      localText: "Maama",
      englishText: "Mother",
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
): renderer.ReactTestRenderer => {
  let tree: renderer.ReactTestRenderer | undefined;

  act(() => {
    tree = renderer.create(
      <ChooseCorrectWordCard
        item={item}
        isLastItem={isLastItem}
        stageImageKey="learning-beginner.jpg"
        onComplete={onComplete}
      />,
    );
  });

  if (!tree) {
    throw new Error("ChooseCorrectWordCard did not mount");
  }

  return tree;
};

describe("ChooseCorrectWordCard", () => {
  it("renders the instruction, question, and answer options", () => {
    const tree = renderCard();
    const json = JSON.stringify(tree.toJSON());

    expect(json).toContain("Choose the correct word");
    expect(json).toContain("Which word means Thank you?");
    expect(json).toContain("Thank you");
    expect(json).toContain("Webale");
    expect(json).toContain("Amazzi");
    expect(json).toContain("Maama");
  });

  it("does not complete when the wrong option is selected", () => {
    const onComplete = jest.fn();
    const tree = renderCard(onComplete);

    act(() => {
      findButtonByAccessibilityLabel(tree.root, "Choose Amazzi").props.onPress();
    });

    expect(onComplete).not.toHaveBeenCalled();
    expect(JSON.stringify(tree.toJSON())).toContain("Try again");
  });

  it("enables completion after the correct option is selected", () => {
    const onComplete = jest.fn();
    const tree = renderCard(onComplete);

    act(() => {
      findButtonByAccessibilityLabel(tree.root, "Choose Webale").props.onPress();
    });

    const nextButton = findButtonByText(tree.root, "Next");
    expect(nextButton.props.accessibilityState).toEqual({ disabled: false });

    act(() => {
      nextButton.props.onPress();
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        itemId: "choose-thank-you",
        mechanic: "choose_correct_word",
        completedAt: expect.any(Number),
        correct: true,
        attempts: 1,
      }),
    );
  });

  it("counts answer taps as attempts before finishing", () => {
    const onComplete = jest.fn();
    const tree = renderCard(onComplete, true);

    act(() => {
      findButtonByAccessibilityLabel(tree.root, "Choose Amazzi").props.onPress();
    });
    act(() => {
      findButtonByAccessibilityLabel(tree.root, "Choose Webale").props.onPress();
    });
    act(() => {
      findButtonByText(tree.root, "Finish").props.onPress();
    });

    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        itemId: "choose-thank-you",
        mechanic: "choose_correct_word",
        correct: true,
        attempts: 2,
      }),
    );
  });

  it("keeps its main content in one bounded scroll area", () => {
    const tree = renderCard();

    expect(tree.root.findAllByType(ScrollView)).toHaveLength(1);
  });
});
