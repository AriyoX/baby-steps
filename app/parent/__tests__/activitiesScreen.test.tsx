import React from "react";
import renderer, { act } from "react-test-renderer";
import type { ReactTestRenderer } from "react-test-renderer";
import { supabase } from "@/lib/supabase";
import {
  getChildActivities,
  getFormattedActivities,
  type FormattedActivity,
} from "@/lib/utils";
import ActivitiesScreen from "../activities";

const mockRouterBack = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({
    back: mockRouterBack,
  }),
}));

jest.mock("expo-status-bar", () => ({
  StatusBar: "StatusBar",
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: (props: Record<string, unknown>) => {
    const { View } = jest.requireActual("react-native");
    return <View {...props} />;
  },
  FontAwesome5: (props: Record<string, unknown>) => {
    const { View } = jest.requireActual("react-native");
    return <View {...props} />;
  },
}));

jest.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
    from: jest.fn(),
    channel: jest.fn(),
    removeChannel: jest.fn(),
  },
}));

jest.mock("@/lib/utils", () => ({
  getChildActivities: jest.fn(),
  getFormattedActivities: jest.fn(),
}));

const textContent = (node: unknown): string => {
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(textContent).join("");
  if (!node || typeof node !== "object") return "";

  const maybeNode = node as { children?: unknown };
  if (Array.isArray(maybeNode.children)) {
    return maybeNode.children.map(textContent).join("");
  }

  return textContent(maybeNode.children);
};

const createChildrenQuery = () => ({
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  is: jest.fn().mockResolvedValue({
    data: [{ id: "child-1", name: "Amina", gender: "female" }],
    error: null,
  }),
});

const createActivitiesChannel = () => ({
  on: jest.fn().mockReturnThis(),
  subscribe: jest.fn().mockReturnThis(),
});

const formattedRows: FormattedActivity[] = [
  {
    id: "story-row",
    icon: "book",
    color: "#0274bb",
    childId: "child-1",
    childName: "Amina",
    category: "stories",
    categoryLabel: "Stories",
    activity: 'Read "The Tale of Kintu"',
    time: "10:00 AM",
    date: "1/1/2026",
    score: "Completed",
    details: "Amina finished a story.",
  },
  {
    id: "game-row",
    icon: "calculator",
    color: "#2f9e44",
    childId: "child-1",
    childName: "Amina",
    category: "counting",
    categoryLabel: "Counting",
    activity: "Counting Stage 1",
    time: "10:05 AM",
    date: "1/1/2026",
    score: "80%",
    details: "Amina counted carefully.",
  },
  {
    id: "learning-row",
    icon: "graduation-cap",
    color: "#0274bb",
    childId: "child-1",
    childName: "Amina",
    category: "language",
    categoryLabel: "Learning",
    activity: 'Completed "Greetings" Lesson',
    time: "10:10 AM",
    date: "1/1/2026",
    score: "100%",
    details: undefined,
  },
  {
    id: "unknown-row",
    icon: "star",
    color: "#f08c00",
    childId: "child-1",
    childName: "Amina",
    category: "mystery_game",
    categoryLabel: "Mystery Game",
    activity: "Mystery activity",
    time: "Recently",
    date: "Unknown Date",
    score: "Completed",
    details: undefined,
  },
];

beforeEach(() => {
  jest.clearAllMocks();
  (supabase.auth.getSession as jest.Mock).mockResolvedValue({
    data: { session: { user: { id: "parent-1" } } },
  });
  (supabase.from as jest.Mock).mockReturnValue(createChildrenQuery());
  (supabase.channel as jest.Mock).mockReturnValue(createActivitiesChannel());
  (getChildActivities as jest.Mock).mockResolvedValue([]);
  (getFormattedActivities as jest.Mock).mockResolvedValue(formattedRows);
});

describe("parent all activities screen", () => {
  it("renders game, story, Learning, and unknown activity rows safely", async () => {
    let tree: ReactTestRenderer | undefined;

    await act(async () => {
      tree = renderer.create(<ActivitiesScreen />);
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    const text = textContent(tree?.toJSON());

    expect(text).toContain('Read "The Tale of Kintu"');
    expect(text).toContain("Stories");
    expect(text).toContain("Counting Stage 1");
    expect(text).toContain("Counting");
    expect(text).toContain('Completed "Greetings" Lesson');
    expect(text).toContain("Learning");
    expect(text).toContain("100%");
    expect(text).toContain("Mystery activity");
    expect(text).toContain("Mystery Game");
    expect(text).not.toContain("source=learning_hub");
    expect(text).not.toContain("stageId=first-words");
  });
});
