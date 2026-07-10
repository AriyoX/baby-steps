import React from "react";
import renderer, { act } from "react-test-renderer";
import { AchievementCard } from "../AchievementCard";
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
});
