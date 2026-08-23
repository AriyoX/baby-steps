import React from "react";
import renderer, { act } from "react-test-renderer";
import { ScrollView, TouchableOpacity } from "react-native";
import type { MiniQuizItem } from "@/content/learningHubTypes";
import { MiniQuizCard } from "../MiniQuizCard";

jest.mock("@expo/vector-icons", () => ({
  Ionicons: (props: Record<string, unknown>) => {
    const { View } = jest.requireActual("react-native");
    return <View {...props} />;
  },
}));

const item: MiniQuizItem = {
  id: "family-words-review",
  mechanic: "mini_quiz",
  order: 1,
  title: "Family Words Review",
  instructions: "Choose the best answer.",
  questions: [
    {
      id: "mother-word",
      promptText: "Which word means Mother?",
      promptEnglishText: "Mother",
      correctOptionId: "maama",
      options: [
        {
          id: "maama",
          text: "Maama",
          englishText: "Mother",
        },
        {
          id: "taata",
          text: "Taata",
          englishText: "Father",
        },
        {
          id: "omwana",
          text: "Omwana",
          englishText: "Child",
        },
      ],
      explanationText: "Maama means Mother.",
    },
    {
      id: "father-word",
      promptText: "Which word means Father?",
      promptEnglishText: "Father",
      correctOptionId: "taata",
      options: [
        {
          id: "maama",
          text: "Maama",
          englishText: "Mother",
        },
        {
          id: "taata",
          text: "Taata",
          englishText: "Father",
        },
        {
          id: "omwana",
          text: "Omwana",
          englishText: "Child",
        },
      ],
      explanationText: "Taata means Father.",
    },
  ],
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
  isLastItem = false,
): renderer.ReactTestRenderer => {
  let tree: renderer.ReactTestRenderer | undefined;

  act(() => {
    tree = renderer.create(
      <MiniQuizCard item={item} isLastItem={isLastItem} onComplete={onComplete} />,
    );
  });

  if (!tree) {
    throw new Error("MiniQuizCard did not mount");
  }

  return tree;
};

describe("MiniQuizCard", () => {
  it("renders the quiz title, current question, and answer options", () => {
    const tree = renderCard();
    const renderedOutput = tree.toJSON();
    const json = JSON.stringify(renderedOutput);
    const text = textContent(renderedOutput);

    expect(json).toContain("Quick quiz");
    expect(json).toContain("Family Words Review");
    expect(text).toContain("Question 1 of 2");
    expect(json).toContain("Which word means Mother?");
    expect(json).toContain("Maama");
    expect(json).toContain("Taata");
    expect(json).toContain("Omwana");
  });

  it("keeps the child on the same question after a wrong answer", () => {
    const onComplete = jest.fn();
    const tree = renderCard(onComplete);

    act(() => {
      findButtonByAccessibilityLabel(tree.root, "Choose Taata").props.onPress();
    });

    expect(onComplete).not.toHaveBeenCalled();
    expect(JSON.stringify(tree.toJSON())).toContain("Nice try");
    expect(JSON.stringify(tree.toJSON())).toContain("Which word means Mother?");

    act(() => {
      findButtonByAccessibilityLabel(tree.root, "Choose Maama").props.onPress();
    });

    expect(onComplete).not.toHaveBeenCalled();
    expect(findButtonByText(tree.root, "Next question").props.accessibilityState).toEqual({
      disabled: false,
    });
  });

  it("progresses to the next question only after a correct answer", () => {
    const onComplete = jest.fn();
    const tree = renderCard(onComplete);

    act(() => {
      findButtonByAccessibilityLabel(tree.root, "Choose Maama").props.onPress();
    });
    act(() => {
      findButtonByText(tree.root, "Next question").props.onPress();
    });

    expect(onComplete).not.toHaveBeenCalled();
    const renderedOutput = tree.toJSON();
    const json = JSON.stringify(renderedOutput);
    expect(textContent(renderedOutput)).toContain("Question 2 of 2");
    expect(json).toContain("Which word means Father?");
  });

  it("emits one completion result after all questions are answered correctly", () => {
    const onComplete = jest.fn();
    const tree = renderCard(onComplete, true);

    act(() => {
      findButtonByAccessibilityLabel(tree.root, "Choose Maama").props.onPress();
    });
    act(() => {
      findButtonByText(tree.root, "Next question").props.onPress();
    });
    act(() => {
      findButtonByAccessibilityLabel(tree.root, "Choose Omwana").props.onPress();
    });
    act(() => {
      findButtonByAccessibilityLabel(tree.root, "Choose Taata").props.onPress();
    });
    act(() => {
      findButtonByText(tree.root, "Finish").props.onPress();
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        itemId: "family-words-review",
        mechanic: "mini_quiz",
        completedAt: expect.any(Number),
        correct: true,
        attempts: 3,
      }),
    );
  });

  it("keeps its main content in one bounded scroll area", () => {
    const tree = renderCard();

    expect(tree.root.findAllByType(ScrollView)).toHaveLength(1);
  });
});
