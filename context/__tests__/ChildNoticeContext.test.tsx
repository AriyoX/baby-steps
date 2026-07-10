import React from "react";
import { Animated, TouchableOpacity, View } from "react-native";
import renderer, { act } from "react-test-renderer";
import type { AchievementDefinition } from "@/components/games/achievements/achievementTypes";
import {
  ChildNoticeProvider,
  useChildNotice,
} from "../ChildNoticeContext";

let mockReducedMotion = true;

jest.mock("@/hooks/useReducedMotion", () => ({
  useReducedMotion: () => mockReducedMotion,
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 10 }),
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: (props: Record<string, unknown>) => {
    const { View } = jest.requireActual("react-native");
    return <View {...props} />;
  },
}));

const achievement = (id: string, name: string): AchievementDefinition => ({
  id,
  name,
  description: `${name} has a safely wrapping achievement description.`,
  icon_name: "star-outline",
  activity_type: "test",
  points: 10,
  game_key: "test-game",
});

const firstAchievement = achievement("achievement-1", "First badge");
const secondAchievement = achievement("achievement-2", "Second badge");
const thirdAchievement = achievement("achievement-3", "Third badge");

let noticeApi: ReturnType<typeof useChildNotice> | undefined;
let tree: renderer.ReactTestRenderer | undefined;

function NoticeHarness({ onUnderlyingPress = jest.fn() }) {
  noticeApi = useChildNotice();

  return (
    <View>
      <TouchableOpacity
        accessibilityLabel="Underlying child control"
        onPress={onUnderlyingPress}
      />
    </View>
  );
}

const getNoticeApi = (): ReturnType<typeof useChildNotice> => {
  if (!noticeApi) {
    throw new Error("Notice harness did not receive the notice API");
  }
  return noticeApi;
};

const renderProvider = async (onUnderlyingPress = jest.fn()) => {
  await act(async () => {
    tree = renderer.create(
      <ChildNoticeProvider childId="child-1" defaultDurationMs={1000}>
        <NoticeHarness onUnderlyingPress={onUnderlyingPress} />
      </ChildNoticeProvider>,
    );
  });

  if (!tree) {
    throw new Error("ChildNoticeProvider did not render");
  }

  return tree;
};

const renderedText = (): string => JSON.stringify(tree?.toJSON());

const dismissVisibleNotice = async () => {
  if (!tree) {
    throw new Error("ChildNoticeProvider did not render");
  }

  const closeButton = tree.root
    .findAllByType(TouchableOpacity)
    .find((button) => button.props.accessibilityLabel === "Dismiss achievement notice");

  if (!closeButton) {
    throw new Error("Visible notice did not have a dismiss button");
  }

  await act(async () => {
    closeButton.props.onPress();
  });
};

beforeEach(() => {
  jest.useFakeTimers();
  mockReducedMotion = true;
  noticeApi = undefined;
  tree = undefined;
});

afterEach(async () => {
  if (tree) {
    await act(async () => {
      tree?.unmount();
    });
  }
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe("ChildNoticeProvider", () => {
  it("renders one achievement notice", async () => {
    await renderProvider();

    await act(async () => {
      getNoticeApi().enqueueAchievementUnlocked(firstAchievement);
    });

    expect(renderedText()).toContain("Achievement unlocked");
    expect(renderedText()).toContain("First badge");
    expect(
      tree?.root.findByProps({ testID: "achievement-unlocked-notice" }).props
        .accessibilityLabel,
    ).toBe("Achievement unlocked: First badge");
  });

  it("dismisses a notice automatically", async () => {
    await renderProvider();

    await act(async () => {
      getNoticeApi().enqueueAchievementUnlocked(firstAchievement);
    });
    expect(renderedText()).toContain("First badge");

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    expect(renderedText()).not.toContain("First badge");
  });

  it("supports manual dismissal", async () => {
    await renderProvider();

    await act(async () => {
      getNoticeApi().enqueueAchievementUnlocked(firstAchievement);
    });
    await dismissVisibleNotice();

    expect(renderedText()).not.toContain("First badge");
  });

  it("shows every achievement in FIFO order without stacking", async () => {
    await renderProvider();

    await act(async () => {
      expect(
        getNoticeApi().enqueueAchievementUnlocks([
          firstAchievement,
          secondAchievement,
          thirdAchievement,
        ]),
      ).toBe(3);
    });

    expect(renderedText()).toContain("First badge");
    expect(renderedText()).not.toContain("Second badge");

    await dismissVisibleNotice();
    expect(renderedText()).toContain("Second badge");
    expect(renderedText()).not.toContain("Third badge");

    await dismissVisibleNotice();
    expect(renderedText()).toContain("Third badge");

    await dismissVisibleNotice();
    expect(renderedText()).not.toContain("Third badge");
  });

  it("ignores duplicate keys that are visible or queued", async () => {
    await renderProvider();

    await act(async () => {
      expect(
        getNoticeApi().enqueueAchievementUnlocks([
          firstAchievement,
          secondAchievement,
          firstAchievement,
          secondAchievement,
        ]),
      ).toBe(2);
      expect(
        getNoticeApi().enqueueAchievementUnlocked(firstAchievement),
      ).toBe(false);
      expect(
        getNoticeApi().enqueueAchievementUnlocked(secondAchievement),
      ).toBe(false);
    });

    await dismissVisibleNotice();
    expect(renderedText()).toContain("Second badge");
    await dismissVisibleNotice();
    expect(renderedText()).not.toContain("badge");
  });

  it("does not replay a displayed notice during the mounted child session", async () => {
    await renderProvider();

    await act(async () => {
      getNoticeApi().enqueueAchievementUnlocked(firstAchievement);
    });
    await dismissVisibleNotice();

    await act(async () => {
      expect(
        getNoticeApi().enqueueAchievementUnlocked(firstAchievement),
      ).toBe(false);
    });

    expect(renderedText()).not.toContain("First badge");
  });

  it("resets session deduplication after child mode unmounts", async () => {
    const firstSession = await renderProvider();

    await act(async () => {
      getNoticeApi().enqueueAchievementUnlocked(firstAchievement);
    });
    await dismissVisibleNotice();
    await act(async () => {
      firstSession.unmount();
    });
    tree = undefined;
    noticeApi = undefined;

    await renderProvider();
    await act(async () => {
      expect(
        getNoticeApi().enqueueAchievementUnlocked(firstAchievement),
      ).toBe(true);
    });

    expect(renderedText()).toContain("First badge");
  });

  it("cleans its automatic-dismiss timer on unmount", async () => {
    const clearTimeoutSpy = jest.spyOn(global, "clearTimeout");
    const renderedProvider = await renderProvider();

    await act(async () => {
      getNoticeApi().enqueueAchievementUnlocked(firstAchievement);
    });
    expect(jest.getTimerCount()).toBeGreaterThan(0);
    const clearsBeforeUnmount = clearTimeoutSpy.mock.calls.length;

    await act(async () => {
      renderedProvider.unmount();
    });
    tree = undefined;

    expect(clearTimeoutSpy.mock.calls.length).toBeGreaterThan(clearsBeforeUnmount);
  });

  it("leaves non-card areas interactive", async () => {
    const onUnderlyingPress = jest.fn();
    const renderedProvider = await renderProvider(onUnderlyingPress);

    await act(async () => {
      getNoticeApi().enqueueAchievementUnlocked(firstAchievement);
    });

    expect(
      renderedProvider.root.findByProps({ testID: "child-notice-host" }).props
        .pointerEvents,
    ).toBe("box-none");

    await act(async () => {
      renderedProvider.root
        .findByProps({ accessibilityLabel: "Underlying child control" })
        .props.onPress();
    });
    expect(onUnderlyingPress).toHaveBeenCalledTimes(1);
  });

  it("skips enter and exit animations when reduced motion is enabled", async () => {
    const timingSpy = jest.spyOn(Animated, "timing");
    await renderProvider();

    await act(async () => {
      getNoticeApi().enqueueAchievementUnlocked(firstAchievement);
    });
    await dismissVisibleNotice();

    expect(timingSpy).not.toHaveBeenCalled();
  });
});
