import React from "react";
import { Animated, TouchableOpacity } from "react-native";
import renderer, { act } from "react-test-renderer";
import LearningHubScreen from "../learning";

const mockRouterPush = jest.fn();
const mockRouterReplace = jest.fn();
const mockToggleBackgroundMusicMuted = jest.fn();
const mockToggleAppSoundsMuted = jest.fn();
let mockSelectedLanguageCode = "lg";

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockRouterPush,
    replace: mockRouterReplace,
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
}));

jest.mock("@/components/brand/BrandMark", () => ({
  BrandMark: "BrandMark",
}));

jest.mock("@/components/common/CachedImage", () => ({
  CachedImage: (props: Record<string, unknown>) => {
    const { View } = jest.requireActual("react-native");
    return <View {...props} />;
  },
}));

jest.mock("@/context/AudioContext", () => ({
  useAudio: () => ({
    settings: {
      appSoundsMuted: false,
      backgroundMusicMuted: false,
    },
    toggleAppSoundsMuted: mockToggleAppSoundsMuted,
    toggleBackgroundMusicMuted: mockToggleBackgroundMusicMuted,
  }),
}));

jest.mock("@/context/ChildContext", () => ({
  useChild: () => ({
    activeChild: {
      age: "8",
      id: "child-1",
      name: "Ayo",
      selected_language_code: mockSelectedLanguageCode,
    },
  }),
}));

jest.mock("@/hooks/useChildLandscapeOrientation", () => ({
  useChildLandscapeOrientation: jest.fn(),
}));

jest.mock("@/lib/audioManager", () => ({
  audioManager: {
    speakAppText: jest.fn(),
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockSelectedLanguageCode = "lg";
  jest.spyOn(Animated, "loop").mockReturnValue({
    start: jest.fn(),
    stop: jest.fn(),
  } as never);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("Learning tab", () => {
  it("shows a friendly Runyankole unavailable state without Luganda stages", async () => {
    mockSelectedLanguageCode = "nyn";
    let tree: renderer.ReactTestRenderer | undefined;

    await act(async () => {
      tree = renderer.create(<LearningHubScreen />);
    });

    if (!tree) {
      throw new Error("LearningHubScreen did not render");
    }

    const text = JSON.stringify(tree.toJSON());
    const backButton = tree.root.findAllByType(TouchableOpacity).find(
      (candidate) => candidate.props.accessibilityLabel === "Back to Games",
    );

    expect(text).toContain("Runyankole lessons");
    expect(text).toContain("coming soon");
    expect(text).not.toContain("First Words");
    expect(text).not.toContain("Family & Home");
    expect(text).not.toContain("Practice Mix");
    expect(backButton).toBeDefined();

    await act(async () => {
      backButton?.props.onPress();
    });

    expect(mockRouterReplace).toHaveBeenCalledWith("/child");

    act(() => {
      tree?.unmount();
    });
  });

  it("keeps the explicit Luganda stage cards unchanged", async () => {
    let tree: renderer.ReactTestRenderer | undefined;

    await act(async () => {
      tree = renderer.create(<LearningHubScreen />);
    });

    if (!tree) {
      throw new Error("LearningHubScreen did not render");
    }

    const text = JSON.stringify(tree.toJSON());

    expect(text).toContain("First Words");
    expect(text).toContain("Family & Home");
    expect(text).toContain("Everyday Things");
    expect(text).toContain("Culture & Stories");
    expect(text).toContain("Practice Mix");
    expect(text).not.toContain("lessons are coming soon");

    act(() => {
      tree?.unmount();
    });
  });
});
