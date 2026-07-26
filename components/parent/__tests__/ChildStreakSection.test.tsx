/* eslint-disable import/first */

import React from "react";
import { Alert } from "react-native";
import renderer, { act, type ReactTestRenderer } from "react-test-renderer";
import type { ChildStreakSnapshot } from "@/lib/streakDate";

const mockUseChildStreakSnapshot = jest.fn();
const mockSetChildStreakEnabled = jest.fn();
const mockSetChildReminderParticipation = jest.fn();
const mockResetChildCurrentStreak = jest.fn();
const mockSyncDirtyStreakState = jest.fn();
const mockSyncRecurringReminders = jest.fn(async (_accountId?: string) => undefined);

jest.mock("@/context/StreakContext", () => ({
  useChildStreakSnapshot: (...args: unknown[]) => mockUseChildStreakSnapshot(...args),
}));

jest.mock("@/lib/streakRepository", () => ({
  resetChildCurrentStreak: (...args: unknown[]) => mockResetChildCurrentStreak(...args),
  setChildReminderParticipation: (...args: unknown[]) =>
    mockSetChildReminderParticipation(...args),
  setChildStreakEnabled: (...args: unknown[]) => mockSetChildStreakEnabled(...args),
  syncDirtyStreakState: (...args: unknown[]) => mockSyncDirtyStreakState(...args),
}));

jest.mock("@/lib/notifications", () => ({
  syncRecurringRemindersIfEnabled: (accountId: string) =>
    mockSyncRecurringReminders(accountId),
}));

jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }));

import { ChildStreakSection } from "../ChildStreakSection";

const snapshot = (childId: string, enabled: boolean): ChildStreakSnapshot => ({
  persistenceProtocolVersion: 1,
  accountId: "parent-1",
  childId,
  preferences: {
    childId,
    streakEnabled: enabled,
    includeInReminders: true,
    currentEpochId: enabled ? `epoch-${childId}` : null,
    resetAt: "2026-07-19T08:00:00.000Z",
    updatedAt: "2026-07-19T08:00:00.000Z",
  },
  epochs: [],
  days: [],
  pendingTransitions: [],
  summary: {
    currentStreak: enabled ? 2 : 0,
    longestStreak: 5,
    todayComplete: false,
    lastQualifiedDate: null,
    lastSevenDays: Array.from({ length: 7 }, (_, index) => ({
      localDate: `2026-07-${String(13 + index).padStart(2, "0")}`,
      completed: index < 2,
    })),
  },
  hydratedAt: null,
});

const snapshotWithEnabledMutation = (
  childId: string,
  enabled: boolean,
  mutationId = `mutation-${childId}-${enabled}`,
): ChildStreakSnapshot => {
  const next = snapshot(childId, enabled);
  return {
    ...next,
    pendingTransitions: [{
      kind: "set_enabled",
      mutationId,
      accountId: next.accountId,
      childId,
      enabled,
      expectedEpochId: enabled ? null : `epoch-${childId}`,
      newEpochId: enabled ? `new-epoch-${childId}` : null,
      occurredAt: "2026-07-19T08:01:00.000Z",
      version: mutationId,
    }],
  };
};

const query = (
  childSnapshot: ChildStreakSnapshot | null,
  overrides: Partial<{
    loading: boolean;
    error: Error | null;
    refresh: jest.Mock;
  }> = {},
) => ({
  snapshot: childSnapshot,
  loading: overrides.loading ?? false,
  error: overrides.error ?? null,
  refresh: overrides.refresh ?? jest.fn(async () => undefined),
});

describe("ChildStreakSection rendered states", () => {
  let tree: ReactTestRenderer | null = null;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSetChildStreakEnabled.mockResolvedValue(snapshot("child-1", true));
    mockSetChildReminderParticipation.mockResolvedValue(snapshot("child-1", true));
    mockResetChildCurrentStreak.mockResolvedValue(snapshot("child-1", true));
    mockSyncDirtyStreakState.mockResolvedValue({
      pushed: 1,
      rejected: 0,
      failed: 0,
      skipped: 0,
    });
  });

  afterEach(() => {
    act(() => tree?.unmount());
    tree = null;
    jest.restoreAllMocks();
  });

  it("renders the enabled preference, stats, history, and reminder control", () => {
    mockUseChildStreakSnapshot.mockReturnValue(query(snapshot("child-1", true)));

    act(() => {
      tree = renderer.create(<ChildStreakSection childId="child-1" />);
    });
    const rendered = JSON.stringify(tree!.toJSON());
    const streakSwitch = tree!.root.findByProps({ testID: "child-streak-enabled-switch" });

    expect(streakSwitch.props.value).toBe(true);
    expect(tree!.root.findByProps({ testID: "active-streak-stats" })).toBeTruthy();
    expect(rendered).toContain("Current streak");
    expect(rendered).toContain("Last seven days");
    expect(rendered).toContain("Include in learning reminders");
  });

  it("shows streak stats without preference controls on the child profile", () => {
    mockUseChildStreakSnapshot.mockReturnValue(query(snapshot("child-1", true)));

    act(() => {
      tree = renderer.create(<ChildStreakSection childId="child-1" mode="summary" />);
    });
    const rendered = JSON.stringify(tree!.toJSON());

    expect(tree!.root.findAllByProps({ testID: "child-streak-enabled-switch" })).toHaveLength(0);
    expect(tree!.root.findAllByProps({ testID: "child-streak-reminder-switch" })).toHaveLength(0);
    expect(rendered).toContain("Current streak");
    expect(rendered).toContain("Last seven days");
    expect(rendered).not.toContain("Reset current streak");
  });

  it("keeps the disabled preference and reminder participation visible and can re-enable", async () => {
    mockUseChildStreakSnapshot.mockReturnValue(query(snapshot("child-1", false)));

    act(() => {
      tree = renderer.create(<ChildStreakSection childId="child-1" />);
    });
    const rendered = JSON.stringify(tree!.toJSON());
    const streakSwitch = tree!.root.findByProps({ testID: "child-streak-enabled-switch" });
    const reminderSwitch = tree!.root.findByProps({ testID: "child-streak-reminder-switch" });

    expect(streakSwitch.props.value).toBe(false);
    expect(reminderSwitch.props.disabled).toBe(true);
    expect(tree!.root.findByProps({ testID: "historical-streak-stats" })).toBeTruthy();
    expect(rendered).toContain("Learning streaks are off");
    expect(rendered).toContain("Historical best");
    expect(rendered).toContain("Include in learning reminders");

    await act(async () => {
      streakSwitch.props.onValueChange(true);
      await Promise.resolve();
    });

    expect(mockSetChildStreakEnabled).toHaveBeenCalledTimes(1);
    expect(mockSetChildStreakEnabled).toHaveBeenCalledWith("child-1", true);
  });

  it("disables through the repository once and keeps the parent control visible afterward", async () => {
    mockSetChildStreakEnabled.mockResolvedValueOnce(
      snapshotWithEnabledMutation("child-1", false),
    );
    mockUseChildStreakSnapshot.mockReturnValue(query(snapshot("child-1", true)));

    act(() => {
      tree = renderer.create(<ChildStreakSection childId="child-1" />);
    });

    await act(async () => {
      tree!.root.findByProps({ testID: "child-streak-enabled-switch" }).props.onValueChange(false);
      await Promise.resolve();
    });
    expect(mockSetChildStreakEnabled).toHaveBeenCalledTimes(1);
    expect(mockSetChildStreakEnabled).toHaveBeenCalledWith("child-1", false);

    mockUseChildStreakSnapshot.mockReturnValue(query(snapshot("child-1", false)));
    act(() => {
      tree!.update(<ChildStreakSection childId="child-1" />);
    });
    expect(tree!.root.findByProps({ testID: "child-streak-enabled-switch" }).props.value).toBe(false);
  });

  it("keeps a disabled loading switch visible until the preference is known", () => {
    mockUseChildStreakSnapshot.mockReturnValue(query(null, { loading: true }));

    act(() => {
      tree = renderer.create(<ChildStreakSection childId="child-1" />);
    });

    expect(tree!.root.findByProps({ testID: "streak-loading-state" })).toBeTruthy();
    const loadingSwitch = tree!.root.findByProps({
      accessibilityLabel: "Learning streaks loading",
    });
    expect(loadingSwitch.props.disabled).toBe(true);
  });

  it("remounts the NativeWind card when hydration replaces the loading state", () => {
    let currentQuery = query(null, { loading: true });
    mockUseChildStreakSnapshot.mockImplementation(() => currentQuery);

    act(() => {
      tree = renderer.create(<ChildStreakSection childId="child-1" />);
    });
    const loadingCard = tree!.root.findByProps({ testID: "streak-loading-state" });

    currentQuery = query(snapshot("child-1", true));
    act(() => {
      tree!.update(<ChildStreakSection childId="child-1" />);
    });
    const hydratedCard = tree!.root.findByProps({ testID: "streak-loaded-state" });

    expect(hydratedCard).not.toBe(loadingCard);
  });

  it("keeps an unavailable switch visible and offers retry after a load error", async () => {
    const refresh = jest.fn(async () => undefined);
    mockUseChildStreakSnapshot.mockReturnValue(
      query(null, { error: new Error("offline"), refresh }),
    );

    act(() => {
      tree = renderer.create(<ChildStreakSection childId="child-1" />);
    });

    expect(tree!.root.findByProps({ testID: "streak-error-state" })).toBeTruthy();
    expect(tree!.root.findByProps({
      accessibilityLabel: "Learning streaks unavailable",
    })).toBeTruthy();

    await act(async () => {
      tree!.root.findByProps({ testID: "retry-streak-load" }).props.onPress();
      await Promise.resolve();
    });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("refreshes authoritative state and reports a failed preference mutation", async () => {
    const refresh = jest.fn(async () => undefined);
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
    mockUseChildStreakSnapshot.mockReturnValue(query(snapshot("child-1", true), { refresh }));
    mockSetChildStreakEnabled.mockRejectedValueOnce(new Error("write failed"));

    act(() => {
      tree = renderer.create(<ChildStreakSection childId="child-1" />);
    });

    await act(async () => {
      tree!.root.findByProps({ testID: "child-streak-enabled-switch" }).props.onValueChange(false);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockSetChildStreakEnabled).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(tree!.root.findByProps({ testID: "streak-mutation-error" })).toBeTruthy();
    expect(alert).toHaveBeenCalledWith(
      "Could not update learning streaks",
      "Please try again in a moment.",
    );
  });

  it("keeps an offline preference change queued and tells the parent", async () => {
    const refresh = jest.fn(async () => undefined);
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    mockUseChildStreakSnapshot.mockReturnValue(query(snapshot("child-1", true), { refresh }));
    mockSetChildStreakEnabled.mockResolvedValueOnce(
      snapshotWithEnabledMutation("child-1", false),
    );
    mockSyncDirtyStreakState.mockResolvedValueOnce({
      pushed: 0,
      rejected: 0,
      failed: 1,
      skipped: 0,
    });

    act(() => {
      tree = renderer.create(<ChildStreakSection childId="child-1" />);
    });
    await act(async () => {
      tree!.root.findByProps({ testID: "child-streak-enabled-switch" }).props.onValueChange(false);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(tree!.root.findByProps({ testID: "streak-mutation-error" })).toBeTruthy();
    const rendered = JSON.stringify(tree!.toJSON());
    expect(rendered).toContain("Saved on this device");
    expect(mockSyncDirtyStreakState).toHaveBeenCalledWith(
      "parent-1",
      "child-1",
      "mutation-child-1-false",
    );
    expect(refresh).not.toHaveBeenCalled();
    expect(alert).not.toHaveBeenCalled();
  });

  it("refreshes only this child when the server rejects its queued preference", async () => {
    const refresh = jest.fn(async () => undefined);
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
    mockUseChildStreakSnapshot.mockReturnValue(query(snapshot("child-1", true), { refresh }));
    mockSetChildStreakEnabled.mockResolvedValueOnce(
      snapshotWithEnabledMutation("child-1", false),
    );
    mockSyncDirtyStreakState.mockResolvedValueOnce({
      pushed: 0,
      rejected: 1,
      failed: 0,
      skipped: 0,
    });

    act(() => {
      tree = renderer.create(<ChildStreakSection childId="child-1" />);
    });
    await act(async () => {
      tree!.root.findByProps({ testID: "child-streak-enabled-switch" }).props.onValueChange(false);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockSyncDirtyStreakState).toHaveBeenCalledWith(
      "parent-1",
      "child-1",
      "mutation-child-1-false",
    );
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(tree!.toJSON())).toContain("server did not accept");
    expect(alert).toHaveBeenCalledWith(
      "Could not update learning streaks",
      "Please try again in a moment.",
    );
  });

  it("serializes rapid repeated preference changes", async () => {
    let resolveMutation!: (value: ChildStreakSnapshot) => void;
    mockSetChildStreakEnabled.mockImplementationOnce(
      () => new Promise((resolve) => {
        resolveMutation = resolve;
      }),
    );
    mockUseChildStreakSnapshot.mockReturnValue(query(snapshot("child-1", true)));

    act(() => {
      tree = renderer.create(<ChildStreakSection childId="child-1" />);
    });
    const streakSwitch = tree!.root.findByProps({ testID: "child-streak-enabled-switch" });

    act(() => {
      streakSwitch.props.onValueChange(false);
      streakSwitch.props.onValueChange(false);
    });
    expect(mockSetChildStreakEnabled).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveMutation(snapshot("child-1", false));
      await Promise.resolve();
    });
  });

  it("never renders Child A's preference after switching to Child B", () => {
    mockUseChildStreakSnapshot.mockImplementation((childId: string) =>
      query(snapshot(childId, childId === "child-a")),
    );

    act(() => {
      tree = renderer.create(<ChildStreakSection childId="child-a" />);
    });
    expect(tree!.root.findByProps({ testID: "child-streak-enabled-switch" }).props.value).toBe(true);

    act(() => {
      tree!.update(<ChildStreakSection childId="child-b" />);
    });
    expect(tree!.root.findByProps({ testID: "child-streak-enabled-switch" }).props.value).toBe(false);
    expect(mockUseChildStreakSnapshot).toHaveBeenCalledWith("child-a");
    expect(mockUseChildStreakSnapshot).toHaveBeenCalledWith("child-b");
  });

  it("does not let Child A's late mutation completion clear Child B's lock", async () => {
    let resolveChildA!: (value: ChildStreakSnapshot) => void;
    let resolveChildB!: (value: ChildStreakSnapshot) => void;
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    mockUseChildStreakSnapshot.mockImplementation((childId: string) =>
      query(snapshot(childId, true)),
    );
    mockSetChildStreakEnabled.mockImplementation((targetChildId: string) =>
      new Promise<ChildStreakSnapshot>((resolve) => {
        if (targetChildId === "child-a") resolveChildA = resolve;
        else resolveChildB = resolve;
      }),
    );

    act(() => {
      tree = renderer.create(<ChildStreakSection childId="child-a" />);
    });
    act(() => {
      tree!.root.findByProps({ testID: "child-streak-enabled-switch" }).props.onValueChange(false);
      tree!.update(<ChildStreakSection childId="child-b" />);
    });
    act(() => {
      tree!.root.findByProps({ testID: "child-streak-enabled-switch" }).props.onValueChange(false);
    });
    expect(tree!.root.findByProps({ testID: "child-streak-enabled-switch" }).props.disabled)
      .toBe(true);

    await act(async () => {
      resolveChildA(snapshot("child-a", false));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(tree!.root.findByProps({ testID: "child-streak-enabled-switch" }).props.disabled)
      .toBe(true);
    expect(alert).not.toHaveBeenCalled();

    await act(async () => {
      resolveChildB(snapshot("child-b", false));
      await Promise.resolve();
      await Promise.resolve();
    });
  });
});
