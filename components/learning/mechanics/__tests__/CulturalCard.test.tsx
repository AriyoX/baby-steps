import React from "react";
import renderer, { act } from "react-test-renderer";
import { ScrollView, TouchableOpacity } from "react-native";
import type { CulturalCardItem } from "@/content/learningHubTypes";
import { CulturalCard } from "../CulturalCard";

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

const item: CulturalCardItem = {
  id: "morning-greeting-home",
  mechanic: "cultural_card",
  order: 1,
  title: "Morning Greeting at Home",
  localTitle: "Oluganda",
  localText: "Wasuze otya?",
  bodyText:
    "In many Ugandan homes, morning greetings are a caring way to begin the day.",
  funFact: "Wasuze otya? means How did you sleep?",
  reflectionPrompt: "Who could you greet kindly this morning?",
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

const renderCard = (
  onComplete = jest.fn(),
  isLastItem = false,
): renderer.ReactTestRenderer => {
  let tree: renderer.ReactTestRenderer | undefined;

  act(() => {
    tree = renderer.create(
      <CulturalCard
        item={item}
        isLastItem={isLastItem}
        stageImageKey="learning-beginner.jpg"
        onComplete={onComplete}
      />,
    );
  });

  if (!tree) {
    throw new Error("CulturalCard did not mount");
  }

  return tree;
};

describe("CulturalCard", () => {
  it("renders the card title, body, local text, and fallback visual", () => {
    const tree = renderCard();
    const renderedOutput = tree.toJSON();
    const json = JSON.stringify(renderedOutput);

    expect(json).toContain("Morning Greeting at Home");
    expect(json).toContain("Wasuze otya?");
    expect(json).toContain("In many Ugandan homes");
    expect(json).toContain("Fun fact");
    expect(tree.root.findByProps({ testID: "cultural-card-fallback-visual" })).toBeTruthy();
  });

  it("calls onComplete when Continue is pressed", () => {
    const onComplete = jest.fn();
    const tree = renderCard(onComplete);

    act(() => {
      findButtonByText(tree.root, "Continue").props.onPress();
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        itemId: "morning-greeting-home",
        mechanic: "cultural_card",
        completedAt: expect.any(Number),
        attempts: 1,
      }),
    );
  });

  it("omits correctness from its completion result", () => {
    const onComplete = jest.fn();
    const tree = renderCard(onComplete, true);

    act(() => {
      findButtonByText(tree.root, "Finish").props.onPress();
    });

    expect(onComplete.mock.calls[0][0]).not.toHaveProperty("correct");
  });

  it("keeps its main content in one bounded scroll area", () => {
    const tree = renderCard();

    expect(tree.root.findAllByType(ScrollView)).toHaveLength(1);
  });
});
