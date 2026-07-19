import { Fragment, useEffect, useRef, useState } from "react";
import { Alert, Switch, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/StyledText";
import { brandColors } from "@/constants/Brand";
import { useChildStreakSnapshot } from "@/context/StreakContext";
import {
  resetChildCurrentStreak,
  setChildReminderParticipation,
  setChildStreakEnabled,
  syncDirtyStreakState,
} from "@/lib/streakRepository";
import { syncRecurringRemindersIfEnabled } from "@/lib/notifications";
import type { StreakPendingTransition } from "@/lib/streakDate";

type ChildStreakSectionMode = "summary" | "settings";

class StreakMutationRejectedError extends Error {}

export function ChildStreakSection({
  childId,
  mode = "settings",
}: {
  childId: string;
  mode?: ChildStreakSectionMode;
}) {
  const { snapshot, loading, error, refresh } = useChildStreakSnapshot(childId);
  const [changing, setChanging] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const mutationInFlightRef = useRef(false);
  const mutationGenerationRef = useRef(0);
  const mountedRef = useRef(false);
  const renderedChildIdRef = useRef(childId);
  renderedChildIdRef.current = childId;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      mutationGenerationRef.current += 1;
      mutationInFlightRef.current = false;
    };
  }, []);

  useEffect(() => {
    mutationGenerationRef.current += 1;
    mutationInFlightRef.current = false;
    setChanging(false);
    setMutationError(null);
  }, [childId]);

  if (!snapshot) {
    return (
      <View
        key={`streak-placeholder-${childId}-${mode}-${loading ? "loading" : "unavailable"}`}
        className="mt-4 overflow-hidden rounded-3xl border border-primary-100 bg-white p-5 shadow-sm"
        testID={loading ? "streak-loading-state" : "streak-error-state"}
      >
        <View className="flex-row items-center">
          <View className="flex-1 pr-3">
            <Text variant="bold" className="text-base text-neutral-800">Learning streaks</Text>
            <Text className="mt-1 text-sm leading-5 text-neutral-500">
              {loading
                ? `Loading this child's learning streak${mode === "settings" ? " setting" : ""}...`
                : `This child's learning streak${mode === "settings" ? " setting" : ""} could not be loaded.`}
            </Text>
          </View>
          {mode === "settings" ? (
            <Switch
              accessibilityLabel={loading ? "Learning streaks loading" : "Learning streaks unavailable"}
              accessibilityRole="switch"
              accessibilityState={{ checked: false, disabled: true }}
              disabled
              value={false}
            />
          ) : (
            <Ionicons
              name={loading ? "hourglass-outline" : "alert-circle-outline"}
              size={24}
              color={brandColors.neutral[400]}
            />
          )}
        </View>
        {!loading ? (
          <TouchableOpacity
            accessibilityRole="button"
            className="mt-4 min-h-[44px] items-center justify-center rounded-2xl border border-primary-200 bg-primary-50"
            onPress={() => void refresh()}
            testID="retry-streak-load"
          >
            <Text variant="bold" className="text-primary-700">Try again</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }

  const { preferences, summary } = snapshot;
  const knownMutationIds = new Set(
    snapshot.pendingTransitions.map((transition) => transition.mutationId),
  );
  const findNewMutationId = (
    nextSnapshot: typeof snapshot,
    matches: (transition: StreakPendingTransition) => boolean,
  ): string | null => {
    for (let index = nextSnapshot.pendingTransitions.length - 1; index >= 0; index -= 1) {
      const transition = nextSnapshot.pendingTransitions[index];
      if (!knownMutationIds.has(transition.mutationId) && matches(transition)) {
        return transition.mutationId;
      }
    }
    return null;
  };
  const dayWord = summary.currentStreak === 1 ? "day" : "days";
  const headline = !preferences.streakEnabled
    ? "Learning streaks are off"
    : summary.currentStreak > 0
      ? `${summary.currentStreak}-${dayWord} learning streak`
      : "Start a new learning streak";
  const status = !preferences.streakEnabled
    ? "Learning can continue without a daily streak counter."
    : summary.todayComplete
      ? "Learning is complete for today. Great work!"
      : summary.currentStreak > 0
        ? "Complete one lesson, game, story, or coloring activity today to keep building the habit."
        : "The next completed lesson, game, story, or coloring activity starts at one.";

  const beginMutation = (targetChildId: string): number | null => {
    if (
      !mountedRef.current ||
      renderedChildIdRef.current !== targetChildId ||
      mutationInFlightRef.current
    ) return null;
    mutationInFlightRef.current = true;
    const generation = mutationGenerationRef.current + 1;
    mutationGenerationRef.current = generation;
    setChanging(true);
    setMutationError(null);
    return generation;
  };

  const isCurrentMutation = (targetChildId: string, generation: number): boolean =>
    mountedRef.current &&
    renderedChildIdRef.current === targetChildId &&
    mutationGenerationRef.current === generation;

  const finishMutation = (targetChildId: string, generation: number) => {
    if (!isCurrentMutation(targetChildId, generation)) return;
    mutationInFlightRef.current = false;
    setChanging(false);
  };

  const syncReminders = (accountId: string) => {
    void syncRecurringRemindersIfEnabled(accountId).catch((syncError) => {
      console.warn("Could not refresh learning reminders after a streak change:", syncError);
    });
  };

  const syncQueuedMutation = async (
    accountId: string,
    targetChildId: string,
    generation: number,
    mutationId: string | null,
  ) => {
    if (!mutationId) {
      syncReminders(accountId);
      return;
    }
    try {
      const result = await syncDirtyStreakState(accountId, targetChildId, mutationId);
      if (result.rejected > 0) {
        throw new StreakMutationRejectedError("The server rejected the learning streak change.");
      }
      if (result.failed > 0 || result.skipped > 0) {
        if (isCurrentMutation(targetChildId, generation)) {
          setMutationError(
            "Saved on this device. The change is queued and will sync when the connection is available.",
          );
        }
        return;
      }
      syncReminders(accountId);
    } catch (error) {
      if (error instanceof StreakMutationRejectedError) throw error;
      console.warn("Could not synchronize the queued learning streak change:", error);
      if (isCurrentMutation(targetChildId, generation)) {
        setMutationError(
          "Saved on this device. The change is queued and will sync when the connection is available.",
        );
      }
    }
  };

  const updateEnabled = async (enabled: boolean) => {
    const targetChildId = childId;
    const generation = beginMutation(targetChildId);
    if (generation === null) return;
    try {
      const next = await setChildStreakEnabled(targetChildId, enabled);
      if (!next || next.childId !== targetChildId) {
        throw new Error("The updated learning streak state was unavailable.");
      }
      if (next.preferences.streakEnabled !== enabled) {
        throw new Error("The learning streak preference did not change.");
      }
      if (next.accountId) {
        const mutationId = findNewMutationId(
          next,
          (transition) => transition.kind === "set_enabled" && transition.enabled === enabled,
        );
        await syncQueuedMutation(next.accountId, targetChildId, generation, mutationId);
      }
    } catch (error) {
      console.warn("Could not update this child's learning streak setting:", error);
      if (isCurrentMutation(targetChildId, generation)) {
        setMutationError(
          error instanceof StreakMutationRejectedError
            ? "The server did not accept the change. The saved setting has been refreshed."
            : "The learning streak setting was not changed. Check the connection and try again.",
        );
        await refresh();
        if (isCurrentMutation(targetChildId, generation)) {
          Alert.alert("Could not update learning streaks", "Please try again in a moment.");
        }
      }
    } finally {
      finishMutation(targetChildId, generation);
    }
  };

  const updateReminderParticipation = async (included: boolean) => {
    const targetChildId = childId;
    const generation = preferences.streakEnabled ? beginMutation(targetChildId) : null;
    if (generation === null) return;
    try {
      const next = await setChildReminderParticipation(targetChildId, included);
      if (!next || next.childId !== targetChildId) {
        throw new Error("The updated reminder state was unavailable.");
      }
      if (next.preferences.includeInReminders !== included) {
        throw new Error("Reminder participation did not change.");
      }
      if (next.accountId) {
        const mutationId = findNewMutationId(
          next,
          (transition) =>
            transition.kind === "set_reminders" &&
            transition.includeInReminders === included,
        );
        await syncQueuedMutation(next.accountId, targetChildId, generation, mutationId);
      }
    } catch (error) {
      console.warn("Could not update reminder participation:", error);
      if (isCurrentMutation(targetChildId, generation)) {
        setMutationError("Reminder participation was not changed. Check the connection and try again.");
        await refresh();
        if (isCurrentMutation(targetChildId, generation)) {
          Alert.alert("Could not update reminders", "Please try again in a moment.");
        }
      }
    } finally {
      finishMutation(targetChildId, generation);
    }
  };

  const confirmReset = () => {
    const targetChildId = childId;
    Alert.alert(
      "Reset current streak?",
      "The current streak will return to zero. Previous learning history and the best streak will remain.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          onPress: () => {
            const generation = beginMutation(targetChildId);
            if (generation === null) return;
            void resetChildCurrentStreak(targetChildId)
              .then(async (next) => {
                if (!next || next.childId !== targetChildId) {
                  throw new Error("The reset learning streak state was unavailable.");
                }
                if (next.accountId) {
                  const mutationId = findNewMutationId(
                    next,
                    (transition) =>
                      transition.kind === "reset" &&
                      transition.newEpochId === next.preferences.currentEpochId,
                  );
                  await syncQueuedMutation(
                    next.accountId,
                    targetChildId,
                    generation,
                    mutationId,
                  );
                }
              })
              .catch(async (resetError) => {
                console.warn("Could not reset the current learning streak:", resetError);
                if (isCurrentMutation(targetChildId, generation)) {
                  setMutationError("The current streak was not reset. Check the connection and try again.");
                  await refresh();
                  if (isCurrentMutation(targetChildId, generation)) {
                    Alert.alert("Could not reset the streak", "Please try again in a moment.");
                  }
                }
              })
              .finally(() => finishMutation(targetChildId, generation));
          },
        },
      ],
    );
  };

  return (
    <View
      key={`streak-content-${childId}-${mode}-${preferences.streakEnabled ? "enabled" : "disabled"}`}
      className="mt-4 overflow-hidden rounded-3xl border border-primary-100 bg-white shadow-sm"
      testID="streak-loaded-state"
    >
      <View className="bg-primary-700 p-5">
        <View className="flex-row items-center">
          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
            <Ionicons
              name={preferences.streakEnabled ? "flame-outline" : "pause-circle-outline"}
              size={25}
              color={preferences.streakEnabled ? brandColors.equatorialGold : brandColors.white}
            />
          </View>
          <View className="ml-3 flex-1">
            <Text variant="bold" className="text-xl text-white">{headline}</Text>
            <Text className="mt-1 text-sm leading-5 text-primary-100">{status}</Text>
          </View>
        </View>
        <View
          className="mt-4 flex-row rounded-2xl bg-white/10 p-3"
          testID={preferences.streakEnabled ? "active-streak-stats" : "historical-streak-stats"}
        >
          {preferences.streakEnabled ? (
            <Fragment key="current-streak-stat">
              <View className="flex-1">
                <Text className="text-xs text-primary-100">Current streak</Text>
                <Text variant="bold" className="mt-0.5 text-lg text-white">
                  {summary.currentStreak} {dayWord}
                </Text>
              </View>
              <View className="mx-3 w-px bg-white/20" />
            </Fragment>
          ) : null}
          <View key="best-streak-stat" className="flex-1">
            <Text className="text-xs text-primary-100">
              {preferences.streakEnabled ? "Best streak" : "Historical best"}
            </Text>
            <Text variant="bold" className="mt-0.5 text-lg text-white">
              {summary.longestStreak} {summary.longestStreak === 1 ? "day" : "days"}
            </Text>
          </View>
        </View>
      </View>

      <View className="p-5">
        {error ? (
          <View
            key="streak-refresh-warning"
            className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-3"
            testID="streak-refresh-warning"
          >
            <Text variant="medium" className="text-amber-900">Showing saved streak information</Text>
            <Text className="mt-1 text-xs leading-5 text-amber-800">
              The latest cross-device state could not be loaded.
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              className="mt-2 self-start"
              onPress={() => void refresh()}
            >
              <Text variant="bold" className="text-primary-700">Retry refresh</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {mutationError ? (
          <View
            key="streak-mutation-error"
            className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-3"
            testID="streak-mutation-error"
          >
            <Text className="text-xs leading-5 text-red-800">{mutationError}</Text>
          </View>
        ) : null}

        {preferences.streakEnabled ? (
          <Fragment key="streak-seven-day-history">
            <Text variant="bold" className="text-sm text-neutral-700">Last seven days</Text>
            <View className="mt-3 flex-row justify-between">
              {summary.lastSevenDays.map((day) => (
                <View
                  key={day.localDate}
                  accessible
                  accessibilityLabel={`${day.localDate}: ${day.completed ? "learning complete" : "no qualifying activity"}`}
                  className="items-center"
                >
                  <View
                    className={`h-9 w-9 items-center justify-center rounded-full ${
                      day.completed ? "bg-green-100" : "bg-neutral-100"
                    }`}
                  >
                    <Ionicons
                      name={day.completed ? "checkmark" : "remove"}
                      size={18}
                      color={day.completed ? brandColors.success : brandColors.neutral[400]}
                    />
                  </View>
                  <Text className="mt-1 text-[10px] text-neutral-500">{day.localDate.slice(5)}</Text>
                </View>
              ))}
            </View>
          </Fragment>
        ) : null}

        {mode === "settings" ? (
          <Fragment key="streak-settings-controls">
            <View className="mt-5 flex-row items-center border-t border-neutral-100 pt-4">
              <View className="flex-1 pr-3">
                <Text variant="medium" className="text-neutral-800">Learning streaks</Text>
                <Text className="mt-0.5 text-xs leading-4 text-neutral-500">
                  One meaningful completed activity can qualify each local calendar day.
                </Text>
              </View>
              <Switch
                accessibilityLabel="Learning streaks"
                accessibilityRole="switch"
                accessibilityState={{ checked: preferences.streakEnabled, disabled: changing || loading }}
                disabled={changing || loading}
                onValueChange={(value) => void updateEnabled(value)}
                testID="child-streak-enabled-switch"
                value={preferences.streakEnabled}
              />
            </View>

            <View className="mt-4 flex-row items-center border-t border-neutral-100 pt-4">
              <View className="flex-1 pr-3">
                <Text variant="medium" className="text-neutral-800">Include in learning reminders</Text>
                <Text className="mt-0.5 text-xs leading-4 text-neutral-500">
                  This preference follows the child. Device reminders remain off until a parent enables them.
                </Text>
              </View>
              <Switch
                accessibilityLabel="Include child in learning reminders"
                accessibilityRole="switch"
                accessibilityState={{
                  checked: preferences.includeInReminders,
                  disabled: changing || loading || !preferences.streakEnabled,
                }}
                disabled={changing || loading || !preferences.streakEnabled}
                onValueChange={(value) => void updateReminderParticipation(value)}
                testID="child-streak-reminder-switch"
                value={preferences.includeInReminders}
              />
            </View>

            {!preferences.streakEnabled ? (
              <Text className="mt-3 text-xs leading-5 text-neutral-500">
                Previous learning history and the best streak are still saved.
              </Text>
            ) : (
              <TouchableOpacity
                accessibilityRole="button"
                className="mt-5 min-h-[48px] items-center justify-center rounded-2xl border border-neutral-200 bg-neutral-50"
                disabled={changing}
                onPress={confirmReset}
              >
                <Text variant="bold" className="text-neutral-700">Reset current streak</Text>
              </TouchableOpacity>
            )}
          </Fragment>
        ) : !preferences.streakEnabled ? (
          <Text
            key="streak-disabled-summary"
            className="mt-4 border-t border-neutral-100 pt-4 text-xs leading-5 text-neutral-500"
          >
            Streak tracking is off for this child. You can turn it back on in child profile settings.
          </Text>
        ) : null}
      </View>
    </View>
  );
}
