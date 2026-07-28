const mockImpactAsync = jest.fn();
const mockNotificationAsync = jest.fn();
const mockSelectionAsync = jest.fn();

jest.mock("expo-haptics", () => ({
  ImpactFeedbackStyle: { Light: "light" },
  NotificationFeedbackType: {
    Error: "error",
    Success: "success",
    Warning: "warning",
  },
  impactAsync: (...args: unknown[]) => mockImpactAsync(...args),
  notificationAsync: (...args: unknown[]) => mockNotificationAsync(...args),
  selectionAsync: (...args: unknown[]) => mockSelectionAsync(...args),
}));

import {
  childHaptics,
  triggerChildHaptic,
  withChildHaptic,
} from "../childHaptics";

describe("child haptics", () => {
  beforeEach(() => {
    mockImpactAsync.mockReset().mockResolvedValue(undefined);
    mockNotificationAsync.mockReset().mockResolvedValue(undefined);
    mockSelectionAsync.mockReset().mockResolvedValue(undefined);
  });

  it("maps interaction feedback to the intended native patterns", () => {
    childHaptics.selection();
    childHaptics.tap();
    childHaptics.success();
    childHaptics.warning();
    childHaptics.error();

    expect(mockSelectionAsync).toHaveBeenCalledTimes(1);
    expect(mockImpactAsync).toHaveBeenCalledWith("light");
    expect(mockNotificationAsync.mock.calls).toEqual([
      ["success"],
      ["warning"],
      ["error"],
    ]);
  });

  it("does not block or replace the wrapped action result", () => {
    const action = jest.fn((value: number) => value * 2);
    const wrapped = withChildHaptic(action, "selection");

    expect(wrapped(4)).toBe(8);
    expect(action).toHaveBeenCalledWith(4);
    expect(mockSelectionAsync).toHaveBeenCalledTimes(1);
  });

  it("treats unavailable or rejected native haptics as a no-op", async () => {
    mockImpactAsync.mockImplementationOnce(() => {
      throw new Error("unavailable");
    });
    expect(() => triggerChildHaptic("tap")).not.toThrow();

    mockNotificationAsync.mockRejectedValueOnce(new Error("not supported"));
    expect(() => triggerChildHaptic("success")).not.toThrow();
    await Promise.resolve();
  });
});
