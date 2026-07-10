import React from "react";
import { TouchableOpacity } from "react-native";
import renderer, { act } from "react-test-renderer";
import { AchievementCard } from "../AchievementCard";
import { AchievementUnlockedModal } from "../AchievementUnlockedModal";
import type { AchievementDefinition } from "../achievementTypes";

jest.mock("@expo/vector-icons", () => ({
  Ionicons: (props: Record<string, unknown>) => {
    const { View } = jest.requireActual("react-native");
    return <View {...props} />;
  },
}));

const achievement: AchievementDefinition = {
  id: "7d4f6a00-4b5f-4e00-9a10-000000000101",
  name: "First Learning Step",
  description: "You finished your first Learning Hub lesson.",
  icon_name: "footsteps-outline",
  activity_type: "learning_hub_first_lesson",
  points: 10,
  game_key: "learning_hub",
};

describe("achievement UI components", () => {
  it("renders a clear locked achievement state", async () => {
    let tree: renderer.ReactTestRenderer | undefined;

    await act(async () => {
      tree = renderer.create(
        <AchievementCard achievement={achievement} unlocked={false} />,
      );
    });

    if (!tree) {
      throw new Error("AchievementCard did not render");
    }

    const json = JSON.stringify(tree.toJSON());

    expect(json).toContain("First Learning Step");
    expect(json).toContain("Locked");
    expect(json).toContain("You finished your first Learning Hub lesson.");
  });

  it("renders a clear unlocked achievement state", async () => {
    let tree: renderer.ReactTestRenderer | undefined;

    await act(async () => {
      tree = renderer.create(
        <AchievementCard
          achievement={achievement}
          unlocked
          earnedAtLabel="Jan 1, 2026"
          earnedByChildren={[{ id: "child-1", name: "Ari", avatar: "A" }]}
        />,
      );
    });

    if (!tree) {
      throw new Error("AchievementCard did not render");
    }

    const json = JSON.stringify(tree.toJSON());

    expect(json).toContain("Unlocked");
    expect(json).toContain("Jan 1, 2026");
    expect(json).toContain("Ari");
  });

  it("shows and closes the achievement unlock notification", async () => {
    const onClose = jest.fn();
    let tree: renderer.ReactTestRenderer | undefined;

    await act(async () => {
      tree = renderer.create(
        <AchievementUnlockedModal
          achievement={achievement}
          visible
          onClose={onClose}
        />,
      );
    });

    if (!tree) {
      throw new Error("AchievementUnlockedModal did not render");
    }
    const renderedTree = tree;

    expect(JSON.stringify(renderedTree.toJSON())).toContain("Achievement unlocked!");
    expect(JSON.stringify(renderedTree.toJSON())).toContain("First Learning Step");

    await act(async () => {
      renderedTree.root
        .findAllByType(TouchableOpacity)
        .find(
          (button) =>
            button.props.accessibilityLabel === "Close achievement notification",
        )
        ?.props.onPress();
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not render the unlock notification without a newly earned achievement", async () => {
    let tree: renderer.ReactTestRenderer | undefined;

    await act(async () => {
      tree = renderer.create(
        <AchievementUnlockedModal
          achievement={null}
          visible={false}
          onClose={jest.fn()}
        />,
      );
    });

    if (!tree) {
      throw new Error("AchievementUnlockedModal did not render");
    }

    expect(tree.toJSON()).toBeNull();
  });
});
