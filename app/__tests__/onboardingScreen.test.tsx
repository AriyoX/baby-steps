import React from "react";
import { TouchableOpacity } from "react-native";
import renderer, { act, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer";

const mockRouterReplace = jest.fn();
const mockSetOnboardingCompleted = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockRouterReplace }),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ bottom: 24, left: 0, right: 0, top: 44 }),
}));

jest.mock("@/hooks/useReducedMotion", () => ({
  useReducedMotion: () => true,
}));

jest.mock("@/lib/onboarding", () => ({
  setOnboardingCompleted: (...args: unknown[]) => mockSetOnboardingCompleted(...args),
}));

jest.mock("@/components/brand/BrandMark", () => ({
  BrandMark: ({ kind }: { kind: string }) => {
    const { View: MockView } = jest.requireActual("react-native");
    return <MockView testID={`brand-${kind}`} />;
  },
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: (props: Record<string, unknown>) => {
    const { View: MockView } = jest.requireActual("react-native");
    return <MockView {...props} />;
  },
}));

/* eslint-disable @typescript-eslint/no-require-imports */
const OnboardingScreen = require("../index").default;
const { ONBOARDING_SLIDES } = require("../index");
/* eslint-enable @typescript-eslint/no-require-imports */

const mountedTrees: ReactTestRenderer[] = [];

const findTouchable = (root: ReactTestInstance, testID: string): ReactTestInstance => {
  const target = root
    .findAllByType(TouchableOpacity)
    .find((candidate) => candidate.props.testID === testID);

  if (!target) throw new Error(`Could not find touchable ${testID}`);
  return target;
};

const renderScreen = (): ReactTestRenderer => {
  let tree: ReactTestRenderer | null = null;
  act(() => {
    tree = renderer.create(<OnboardingScreen />);
  });
  if (!tree) throw new Error("Onboarding screen did not render.");
  mountedTrees.push(tree);
  return tree;
};

const moveToLastSlide = (tree: ReactTestRenderer) => {
  const carousel = tree.root.findByProps({ testID: "onboarding-carousel" });
  const pageWidth = carousel.props.getItemLayout(null, 1).length;

  act(() => {
    carousel.props.onMomentumScrollEnd({
      nativeEvent: { contentOffset: { x: pageWidth * (ONBOARDING_SLIDES.length - 1) } },
    });
  });
};

describe("startup onboarding", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSetOnboardingCompleted.mockResolvedValue(undefined);
  });

  afterEach(() => {
    act(() => {
      mountedTrees.forEach((tree) => tree.unmount());
    });
    mountedTrees.length = 0;
    jest.restoreAllMocks();
  });

  it("uses one cohesive three-screen introduction with the mascot and accessible controls", () => {
    const tree = renderScreen();
    const rendered = JSON.stringify(tree.toJSON());

    expect(ONBOARDING_SLIDES).toHaveLength(3);
    expect(rendered).toContain("Little steps, big adventures");
    expect(rendered).toContain("Learn through stories and play");
    expect(rendered).toContain("Their journey stays with you");
    expect(rendered).toContain("\u00A0WELCOME TO BABY STEPS\u00A0");
    expect(rendered).toContain("\u00A0Stories, words and play — all together!\u00A0");
    expect(rendered).toContain("\u00A0Skip\u00A0");
    expect(rendered).toContain("\u00A0Continue\u00A0");
    expect(tree.root.findAllByProps({ testID: "brand-mascot" }).length).toBeGreaterThanOrEqual(3);
    expect(
      findTouchable(tree.root, "onboarding-skip").props.accessibilityLabel,
    ).toBe("Skip introduction and continue to sign in");
    expect(tree.root.findByProps({ accessibilityLabel: "Page 1 of 3" })).toBeTruthy();
  });

  it("moves Continue to the next introduction screen", () => {
    const tree = renderScreen();

    act(() => {
      findTouchable(tree.root, "onboarding-primary-action").props.onPress();
    });

    expect(tree.root.findByProps({ accessibilityLabel: "Page 2 of 3" })).toBeTruthy();
    expect(mockSetOnboardingCompleted).not.toHaveBeenCalled();
    expect(mockRouterReplace).not.toHaveBeenCalled();
  });

  it("persists completion before replacing onboarding with login", async () => {
    const order: string[] = [];
    mockSetOnboardingCompleted.mockImplementation(async () => {
      order.push("persisted");
    });
    mockRouterReplace.mockImplementation(() => {
      order.push("navigated");
    });
    const tree = renderScreen();

    moveToLastSlide(tree);
    expect(JSON.stringify(tree.toJSON())).toContain("Get started");

    await act(async () => {
      findTouchable(tree.root, "onboarding-primary-action").props.onPress();
      await Promise.resolve();
    });

    expect(order).toEqual(["persisted", "navigated"]);
    expect(mockRouterReplace).toHaveBeenCalledWith("/login");
  });

  it("uses the same persisted handoff when Skip is pressed", async () => {
    const tree = renderScreen();

    await act(async () => {
      findTouchable(tree.root, "onboarding-skip").props.onPress();
      await Promise.resolve();
    });

    expect(mockSetOnboardingCompleted).toHaveBeenCalledTimes(1);
    expect(mockRouterReplace).toHaveBeenCalledWith("/login");
  });

  it("ignores duplicate completion taps while persistence is in flight", async () => {
    let resolvePersistence: (() => void) | undefined;
    mockSetOnboardingCompleted.mockImplementation(
      () => new Promise<void>((resolve) => {
        resolvePersistence = resolve;
      }),
    );
    const tree = renderScreen();
    const skip = findTouchable(tree.root, "onboarding-skip");

    await act(async () => {
      void skip.props.onPress();
      void skip.props.onPress();
      await Promise.resolve();
    });

    expect(mockSetOnboardingCompleted).toHaveBeenCalledTimes(1);
    expect(mockRouterReplace).not.toHaveBeenCalled();

    await act(async () => {
      resolvePersistence?.();
      await Promise.resolve();
    });

    expect(mockRouterReplace).toHaveBeenCalledTimes(1);
  });

  it("stays on onboarding and presents a retryable message when persistence fails", async () => {
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    mockSetOnboardingCompleted.mockRejectedValueOnce(new Error("storage unavailable"));
    const tree = renderScreen();

    await act(async () => {
      findTouchable(tree.root, "onboarding-skip").props.onPress();
      await Promise.resolve();
    });

    expect(mockRouterReplace).not.toHaveBeenCalled();
    expect(tree.root.findByProps({ testID: "onboarding-completion-error" })).toBeTruthy();
    expect(JSON.stringify(tree.toJSON())).toContain("Please try again");
  });
});
