import * as Haptics from "expo-haptics";

export type ChildHapticFeedback =
  | "selection"
  | "tap"
  | "success"
  | "warning"
  | "error";

const feedbackActions: Record<ChildHapticFeedback, () => Promise<void>> = {
  selection: () => Haptics.selectionAsync(),
  tap: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  success: () =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  warning: () =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  error: () =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
};

/**
 * Fire-and-forget haptics for child-mode interactions.
 *
 * Feedback must never delay or break the action it accompanies. Expo Haptics
 * already follows the device's haptic/system settings; unavailable hardware
 * and rejected native calls are intentionally treated as a no-op.
 */
export const triggerChildHaptic = (
  feedback: ChildHapticFeedback = "tap",
): void => {
  try {
    void feedbackActions[feedback]().catch(() => undefined);
  } catch {
    // Some platforms can throw synchronously when haptics are unavailable.
  }
};

export const childHaptics = {
  selection: () => triggerChildHaptic("selection"),
  tap: () => triggerChildHaptic("tap"),
  success: () => triggerChildHaptic("success"),
  warning: () => triggerChildHaptic("warning"),
  error: () => triggerChildHaptic("error"),
} as const;

export const withChildHaptic = <Args extends unknown[], Result>(
  action: (...args: Args) => Result,
  feedback: ChildHapticFeedback = "tap",
) =>
  (...args: Args): Result => {
    triggerChildHaptic(feedback);
    return action(...args);
  };
