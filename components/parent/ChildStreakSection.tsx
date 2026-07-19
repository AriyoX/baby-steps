import { useState } from "react";
import { Alert, Switch, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/StyledText";
import { brandColors } from "@/constants/Brand";
import { useChildStreakSnapshot } from "@/context/StreakContext";
import {
  resetChildCurrentStreak,
  setChildReminderParticipation,
  setChildStreakEnabled,
} from "@/lib/streakRepository";
import { syncRecurringRemindersIfEnabled } from "@/lib/notifications";

export function ChildStreakSection({ childId }: { childId: string }) {
  const { snapshot, loading } = useChildStreakSnapshot(childId);
  const [changing, setChanging] = useState(false);

  if (loading || !snapshot) {
    return (
      <View className="mt-4 rounded-3xl border border-neutral-100 bg-white p-5">
        <Text className="text-neutral-500">Loading learning streak...</Text>
      </View>
    );
  }

  const { preferences, summary } = snapshot;
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

  const updateEnabled = async (enabled: boolean) => {
    if (changing) return;
    setChanging(true);
    try {
      const next = await setChildStreakEnabled(childId, enabled);
      if (next?.accountId) void syncRecurringRemindersIfEnabled(next.accountId);
    } catch (error) {
      console.warn("Could not update this child's learning streak setting:", error);
      Alert.alert("Could not update learning streaks", "Please try again in a moment.");
    } finally {
      setChanging(false);
    }
  };

  const updateReminderParticipation = async (included: boolean) => {
    if (changing || !preferences.streakEnabled) return;
    setChanging(true);
    try {
      const next = await setChildReminderParticipation(childId, included);
      if (next?.accountId) void syncRecurringRemindersIfEnabled(next.accountId);
    } catch (error) {
      console.warn("Could not update reminder participation:", error);
      Alert.alert("Could not update reminders", "Please try again in a moment.");
    } finally {
      setChanging(false);
    }
  };

  const confirmReset = () => {
    Alert.alert(
      "Reset current streak?",
      "The current streak will return to zero. Previous learning history and the best streak will remain.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          onPress: () => {
            setChanging(true);
            void resetChildCurrentStreak(childId)
              .then((next) => {
                if (next?.accountId) void syncRecurringRemindersIfEnabled(next.accountId);
              })
              .catch((error) => {
                console.warn("Could not reset the current learning streak:", error);
                Alert.alert("Could not reset the streak", "Please try again in a moment.");
              })
              .finally(() => setChanging(false));
          },
        },
      ],
    );
  };

  return (
    <View className="mt-4 overflow-hidden rounded-3xl border border-primary-100 bg-white shadow-sm">
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
            <>
              <View className="flex-1">
                <Text className="text-xs text-primary-100">Current streak</Text>
                <Text variant="bold" className="mt-0.5 text-lg text-white">
                  {summary.currentStreak} {dayWord}
                </Text>
              </View>
              <View className="mx-3 w-px bg-white/20" />
            </>
          ) : null}
          <View className="flex-1">
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
        {preferences.streakEnabled ? (
          <>
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
          </>
        ) : null}

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
            accessibilityState={{ checked: preferences.streakEnabled, disabled: changing }}
            disabled={changing}
            onValueChange={(value) => void updateEnabled(value)}
            value={preferences.streakEnabled}
          />
        </View>

        {preferences.streakEnabled ? (
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
              disabled: changing || !preferences.streakEnabled,
            }}
            disabled={changing || !preferences.streakEnabled}
            onValueChange={(value) => void updateReminderParticipation(value)}
            value={preferences.includeInReminders}
          />
        </View>
        ) : null}

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
      </View>
    </View>
  );
}
