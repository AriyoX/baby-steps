import { useCallback, useState } from "react"
import { Alert, Linking, Switch, TouchableOpacity, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useFocusEffect } from "expo-router"
import { SettingsScaffold } from "@/components/settings/SettingsScaffold"
import { Text } from "@/components/StyledText"
import { brandColors } from "@/constants/Brand"
import {
  disableRecurringReminders,
  getNotificationPermissionState,
  getNotificationPreferences,
  requestAndEnableRecurringReminders,
  sendTestLearningReminder,
  type NotificationPermissionState,
} from "@/lib/notifications"

const NOTIFICATION_PRINCIPLES = [
  {
    icon: "sparkles-outline" as const,
    title: "Useful, timely nudges",
    description: "Friendly messages that help your family reconnect with Baby Steps.",
  },
  {
    icon: "heart-outline" as const,
    title: "Encouragement without pressure",
    description: "Positive prompts that celebrate small moments and keep things light.",
  },
  {
    icon: "phone-portrait-outline" as const,
    title: "Private to this device",
    description: "Your notification preference and recurring reminders stay on this device.",
  },
]

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
            <Text variant="bold" className="text-xl text-white">Gentle Baby Steps nudges</Text>
            <Text className="text-sm leading-5 text-primary-100 mt-1">Helpful moments, thoughtfully delivered</Text>
          </View>
        </View>
      </View>

      <View className="mt-4 bg-white rounded-3xl border border-neutral-100 p-5 shadow-sm">
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-4">
            <Text variant="bold" className="text-lg text-neutral-900">Recurring reminders</Text>
            <Text className="text-sm leading-5 text-neutral-500 mt-1">Choose whether Baby Steps can send occasional nudges.</Text>
          </View>
          <Switch
            value={enabled}
            onValueChange={(value) => void updateEnabled(value)}
            disabled={loading}
            trackColor={{ false: brandColors.neutral[200], true: brandColors.blue[200] }}
            thumbColor={enabled ? brandColors.victoriaBlue : brandColors.neutral[50]}
            accessibilityLabel="Recurring Baby Steps reminders"
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
        What to expect
      </Text>
      <View className="bg-white rounded-3xl border border-neutral-100 px-5 shadow-sm">
        {NOTIFICATION_PRINCIPLES.map((principle, index) => (
          <View
            key={principle.title}
            className={`flex-row items-center py-4 ${index < NOTIFICATION_PRINCIPLES.length - 1 ? "border-b border-neutral-100" : ""}`}
          >
            <View className="w-11 h-11 rounded-2xl items-center justify-center bg-primary-50">
              <Ionicons
                name={principle.icon}
                size={21}
                color={brandColors.victoriaBlue}
              />
            </View>
            <View className="flex-1 ml-3">
              <Text variant="bold" className="text-neutral-800">{principle.title}</Text>
              <Text className="text-sm leading-5 text-neutral-500 mt-0.5">{principle.description}</Text>
            </View>
          </View>
        ))}
      </View>

      <View className="mt-4 bg-secondary-50 border border-secondary-100 rounded-3xl p-4 flex-row items-start">
        <Ionicons name="moon-outline" size={21} color={brandColors.shanaOrange} />
        <View className="flex-1 ml-3">
          <Text variant="bold" className="text-secondary-800">Quiet by design</Text>
          <Text className="text-sm leading-5 text-neutral-600 mt-1">
            Baby Steps keeps nudges considerate. Your device’s Focus, silent mode, and notification settings are always respected.
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
