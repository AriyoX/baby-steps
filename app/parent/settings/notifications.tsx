import { useCallback, useState } from "react"
import { Alert, Linking, Switch, TouchableOpacity, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useFocusEffect } from "expo-router"
import { SettingsScaffold } from "@/components/settings/SettingsScaffold"
import { Text } from "@/components/StyledText"
import { brandColors } from "@/constants/Brand"
import {
  DEFAULT_REMINDER_SCHEDULE,
  disableRecurringReminders,
  getNotificationPermissionState,
  getNotificationPreferences,
  requestAndEnableRecurringReminders,
  sendTestLearningReminder,
  type NotificationPermissionState,
} from "@/lib/notifications"

export default function NotificationSettingsScreen() {
  const [enabled, setEnabled] = useState(false)
  const [permission, setPermission] = useState<NotificationPermissionState>("undetermined")
  const [loading, setLoading] = useState(true)
  const [sendingTest, setSendingTest] = useState(false)

  const loadState = useCallback(async () => {
    try {
      const [preferences, permissionState] = await Promise.all([
        getNotificationPreferences(),
        getNotificationPermissionState(),
      ])
      setEnabled(preferences.enabled && permissionState === "granted")
      setPermission(permissionState)
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      void loadState()
    }, [loadState]),
  )

  const updateEnabled = async (nextEnabled: boolean) => {
    setLoading(true)
    try {
      if (!nextEnabled) {
        await disableRecurringReminders()
        setEnabled(false)
        return
      }

      const permissionState = await requestAndEnableRecurringReminders()
      setPermission(permissionState)
      setEnabled(permissionState === "granted")
      if (permissionState === "denied") {
        Alert.alert(
          "Notifications are blocked",
          "Open your device settings to allow Baby Steps reminders.",
          [
            { text: "Not now", style: "cancel" },
            { text: "Open settings", onPress: () => void Linking.openSettings() },
          ],
        )
      } else if (permissionState === "unavailable") {
        Alert.alert("Not available here", "Notifications are available in the iOS and Android apps.")
      }
    } catch (error) {
      console.error("Could not update reminder preferences:", error)
      Alert.alert("Could not update reminders", "Please try again in a moment.")
    } finally {
      setLoading(false)
    }
  }

  const sendTest = async () => {
    setSendingTest(true)
    try {
      await sendTestLearningReminder()
      Alert.alert("Test on the way", "A Baby Steps reminder will appear in about three seconds.")
    } catch (error) {
      console.error("Could not send test reminder:", error)
      Alert.alert("Could not send a test", "Check that notifications are allowed, then try again.")
    } finally {
      setSendingTest(false)
    }
  }

  const permissionLabel =
    permission === "granted"
      ? "Allowed on this device"
      : permission === "denied"
        ? "Blocked in device settings"
        : permission === "unavailable"
          ? "Unavailable on this platform"
          : "Not asked yet"

  return (
    <SettingsScaffold title="Notifications">
      <View className="mt-5 bg-primary-700 rounded-[28px] p-5 overflow-hidden">
        <View className="absolute -right-8 -top-10 w-36 h-36 rounded-full bg-primary-500" />
        <View className="flex-row items-center">
          <View className="w-14 h-14 rounded-2xl bg-white/20 items-center justify-center">
            <Ionicons name="notifications-outline" size={29} color={brandColors.equatorialGold} />
          </View>
          <View className="flex-1 ml-4">
            <Text variant="bold" className="text-xl text-white">Gentle learning reminders</Text>
            <Text className="text-sm leading-5 text-primary-100 mt-1">Three thoughtful prompts each week</Text>
          </View>
        </View>
      </View>

      <View className="mt-4 bg-white rounded-3xl border border-neutral-100 p-5 shadow-sm">
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-4">
            <Text variant="bold" className="text-lg text-neutral-900">Recurring reminders</Text>
            <Text className="text-sm leading-5 text-neutral-500 mt-1">Pause or resume the whole schedule anytime.</Text>
          </View>
          <Switch
            value={enabled}
            onValueChange={(value) => void updateEnabled(value)}
            disabled={loading}
            trackColor={{ false: brandColors.neutral[200], true: brandColors.blue[200] }}
            thumbColor={enabled ? brandColors.victoriaBlue : brandColors.neutral[50]}
            accessibilityLabel="Recurring learning reminders"
          />
        </View>
        <View className="flex-row items-center mt-4 pt-4 border-t border-neutral-100">
          <Ionicons
            name={permission === "granted" ? "checkmark-circle" : "information-circle-outline"}
            size={18}
            color={permission === "granted" ? brandColors.success : brandColors.neutral[500]}
          />
          <Text className="text-xs text-neutral-500 ml-2">{permissionLabel}</Text>
        </View>
      </View>

      <Text variant="bold" className="text-sm uppercase tracking-[1.5px] text-neutral-500 mt-6 mb-2 px-1">
        Your weekly rhythm
      </Text>
      <View className="bg-white rounded-3xl border border-neutral-100 px-5 shadow-sm">
        {DEFAULT_REMINDER_SCHEDULE.map((reminder, index) => (
          <View
            key={reminder.id}
            className={`flex-row items-center py-4 ${index < DEFAULT_REMINDER_SCHEDULE.length - 1 ? "border-b border-neutral-100" : ""}`}
          >
            <View className={`w-11 h-11 rounded-2xl items-center justify-center ${index === 2 ? "bg-accent-50" : "bg-primary-50"}`}>
              <Ionicons
                name={index === 2 ? "book-outline" : "game-controller-outline"}
                size={21}
                color={index === 2 ? brandColors.gold[700] : brandColors.victoriaBlue}
              />
            </View>
            <View className="flex-1 ml-3">
              <Text variant="bold" className="text-neutral-800">{reminder.dayLabel}</Text>
              <Text className="text-sm text-neutral-500">{index === 2 ? "Story and connection" : "Short play session"}</Text>
            </View>
            <Text variant="bold" className="text-sm text-neutral-700">{reminder.timeLabel}</Text>
          </View>
        ))}
      </View>

      <View className="mt-4 bg-secondary-50 border border-secondary-100 rounded-3xl p-4 flex-row items-start">
        <Ionicons name="moon-outline" size={21} color={brandColors.shanaOrange} />
        <View className="flex-1 ml-3">
          <Text variant="bold" className="text-secondary-800">Quiet by design</Text>
          <Text className="text-sm leading-5 text-neutral-600 mt-1">
            No early-morning or late-night prompts. Your device’s Focus, silent mode, and notification settings are always respected.
          </Text>
        </View>
      </View>

      {enabled ? (
        <TouchableOpacity
          className="mt-5 mb-3 min-h-[52px] rounded-2xl border border-primary-200 bg-white flex-row items-center justify-center"
          onPress={() => void sendTest()}
          disabled={sendingTest}
          activeOpacity={0.8}
        >
          <Ionicons name="paper-plane-outline" size={19} color={brandColors.victoriaBlue} />
          <Text variant="bold" className="text-primary-700 ml-2">
            {sendingTest ? "Sending…" : "Send a test reminder"}
          </Text>
        </TouchableOpacity>
      ) : null}
    </SettingsScaffold>
  )
}
