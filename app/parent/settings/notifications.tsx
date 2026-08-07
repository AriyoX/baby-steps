import { useCallback, useEffect, useState } from "react"
import { AppState, Alert, Linking, Switch, TouchableOpacity, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useFocusEffect } from "expo-router"
import { SettingsScaffold } from "@/components/settings/SettingsScaffold"
import { Text } from "@/components/StyledText"
import { brandColors } from "@/constants/Brand"
import {
  STANDARD_LEARNING_REMINDER_TIMES,
  disableRecurringReminders,
  getNotificationPermissionState,
  getNotificationPreferences,
  requestAndEnableRecurringReminders,
  updateLearningReminderPrivacy,
  type NotificationPermissionState,
} from "@/lib/notifications"

export default function NotificationSettingsScreen() {
  const [enabled, setEnabled] = useState(false)
  const [permission, setPermission] = useState<NotificationPermissionState>("undetermined")
  const [loading, setLoading] = useState(true)
  const [showChildNames, setShowChildNames] = useState(false)

  const loadState = useCallback(async () => {
    try {
      const [preferences, permissionState] = await Promise.all([
        getNotificationPreferences(),
        getNotificationPermissionState(),
      ])
      setEnabled(preferences.enabled && permissionState === "granted")
      setShowChildNames(preferences.showChildNames)
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

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        void loadState()
      }
    })

    return () => subscription.remove()
  }, [loadState])

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

  const updateReminderPrivacy = async (nextShowChildNames: boolean) => {
    setLoading(true)
    try {
      const next = await updateLearningReminderPrivacy(nextShowChildNames)
      setShowChildNames(next.showChildNames)
    } catch (error) {
      console.error("Could not update learning reminder privacy:", error)
      Alert.alert("Could not update reminders", "Please try again in a moment.")
    } finally {
      setLoading(false)
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
            <Text variant="bold" className="text-xl text-white">Baby Steps reminders</Text>
          </View>
        </View>
      </View>

      <View className="mt-4 bg-white rounded-3xl border border-neutral-100 p-5 shadow-sm">
        <Text variant="bold" className="text-lg text-neutral-900">Daily schedule</Text>
        <View className="mt-3 rounded-2xl bg-primary-50 border border-primary-100 overflow-hidden">
          {STANDARD_LEARNING_REMINDER_TIMES.map((time, index) => {
            const label = time.id === "morning" ? "Morning" : "Evening"
            const displayTime = `${String(time.hour).padStart(2, "0")}:${String(time.minute).padStart(2, "0")}`
            return (
              <View
                accessible
                accessibilityLabel={`${label} reminder at ${displayTime}`}
                key={time.id}
                className={`min-h-14 px-4 flex-row items-center justify-between ${index === 0 ? "border-b border-primary-100" : ""}`}
              >
                <View className="flex-row items-center">
                  <Ionicons
                    name={time.id === "morning" ? "sunny-outline" : "moon-outline"}
                    size={20}
                    color={brandColors.victoriaBlue}
                  />
                  <Text variant="medium" className="text-neutral-800 ml-2">{label}</Text>
                </View>
                <Text variant="bold" className="text-primary-700">{displayTime}</Text>
              </View>
            )
          })}
        </View>

        <View className="mt-5 flex-row items-center border-t border-neutral-100 pt-4">
          <View className="flex-1 pr-4">
            <Text variant="medium" className="text-neutral-800">Show child first names</Text>
            <Text className="text-xs leading-5 text-neutral-500 mt-0.5">
              Uses safe first names only.
            </Text>
          </View>
          <Switch
            accessibilityLabel="Show child first names in learning reminders"
            accessibilityRole="switch"
            accessibilityState={{ checked: showChildNames, disabled: loading }}
            disabled={loading}
            onValueChange={(value) => void updateReminderPrivacy(value)}
            value={showChildNames}
          />
        </View>
      </View>

      <View className="mt-4 bg-white rounded-3xl border border-neutral-100 p-5 shadow-sm">
        <View className="flex-row items-center justify-between">
          <Text variant="bold" className="text-lg text-neutral-900">App reminders</Text>
          <Switch
            value={enabled}
            onValueChange={(value) => void updateEnabled(value)}
            disabled={loading}
            trackColor={{ false: brandColors.neutral[200], true: brandColors.blue[200] }}
            thumbColor={enabled ? brandColors.victoriaBlue : brandColors.neutral[50]}
            accessibilityLabel="Baby Steps reminders"
            accessibilityState={{ checked: enabled, disabled: loading }}
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
        {permission === "denied" ? (
          <TouchableOpacity
            accessibilityLabel="Open device notification settings"
            accessibilityRole="button"
            className="mt-4 min-h-12 rounded-full bg-primary-50 items-center justify-center px-5"
            onPress={() => void Linking.openSettings()}
          >
            <Text variant="bold" className="text-primary-700">Open device settings</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </SettingsScaffold>
  )
}
