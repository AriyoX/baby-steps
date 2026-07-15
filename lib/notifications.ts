import AsyncStorage from "@react-native-async-storage/async-storage"
import { Platform } from "react-native"
import * as Notifications from "expo-notifications"
import { brandColors } from "@/constants/Brand"

const NOTIFICATION_PREFERENCES_KEY = "@baby_steps_notification_preferences"
export const LEARNING_REMINDER_CHANNEL_ID = "learning-reminders"

export type NotificationPermissionState = "granted" | "denied" | "undetermined" | "unavailable"

export type NotificationPreferences = {
  enabled: boolean
  scheduledIds: string[]
  updatedAt: string | null
}

export type ReminderDefinition = {
  id: string
  weekday: number
  dayLabel: string
  timeLabel: string
  hour: number
  minute: number
  title: string
  body: string
}

export const DEFAULT_REMINDER_SCHEDULE: ReminderDefinition[] = [
  {
    id: "sunday-connection",
    weekday: 1,
    dayLabel: "Sunday",
    timeLabel: "10:00 AM",
    hour: 10,
    minute: 0,
    title: "A gentle Sunday moment ☀️",
    body: "Open Baby Steps when your family is ready for a small moment together.",
  },
  {
    id: "monday-curiosity",
    weekday: 2,
    dayLabel: "Monday",
    timeLabel: "7:30 PM",
    hour: 19,
    minute: 30,
    title: "A bright start to the week 🌱",
    body: "A few playful minutes can turn today’s curiosity into something memorable.",
  },
  {
    id: "tuesday-choice",
    weekday: 3,
    dayLabel: "Tuesday",
    timeLabel: "7:30 PM",
    hour: 19,
    minute: 30,
    title: "What will your child choose today? ✨",
    body: "Let them lead the way to a quick Baby Steps moment.",
  },
  {
    id: "wednesday-wonder",
    weekday: 4,
    dayLabel: "Wednesday",
    timeLabel: "7:30 PM",
    hour: 19,
    minute: 30,
    title: "A little midweek wonder 💫",
    body: "There’s always something new to notice, hear, or try together.",
  },
  {
    id: "thursday-adventure",
    weekday: 5,
    dayLabel: "Thursday",
    timeLabel: "7:30 PM",
    hour: 19,
    minute: 30,
    title: "Ready for a little adventure? ⭐",
    body: "Open Baby Steps and follow your child’s curiosity today.",
  },
  {
    id: "friday-celebration",
    weekday: 6,
    dayLabel: "Friday",
    timeLabel: "7:30 PM",
    hour: 19,
    minute: 30,
    title: "Celebrate one small step 🎉",
    body: "End the week with a warm Baby Steps moment at your family’s pace.",
  },
  {
    id: "saturday-story",
    weekday: 7,
    dayLabel: "Saturday",
    timeLabel: "10:00 AM",
    hour: 10,
    minute: 0,
    title: "Weekend story moment 📖",
    body: "Share a story, name what you notice, and celebrate one new word.",
  },
]

const DEFAULT_PREFERENCES: NotificationPreferences = {
  enabled: false,
  scheduledIds: [],
  updatedAt: null,
}

const isNativeNotificationsAvailable = () => Platform.OS === "ios" || Platform.OS === "android"

const saveNotificationPreferences = async (preferences: NotificationPreferences) => {
  await AsyncStorage.setItem(NOTIFICATION_PREFERENCES_KEY, JSON.stringify(preferences))
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  try {
    const stored = await AsyncStorage.getItem(NOTIFICATION_PREFERENCES_KEY)
    if (!stored) return DEFAULT_PREFERENCES

    const parsed = JSON.parse(stored) as Partial<NotificationPreferences>
    return {
      enabled: parsed.enabled === true,
      scheduledIds: Array.isArray(parsed.scheduledIds) ? parsed.scheduledIds : [],
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : null,
    }
  } catch (error) {
    console.warn("Could not read notification preferences:", error)
    return DEFAULT_PREFERENCES
  }
}

export function configureNotificationPresentation() {
  if (!isNativeNotificationsAvailable()) return

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  })
}

async function ensureLearningReminderChannel() {
  if (Platform.OS !== "android") return

  await Notifications.setNotificationChannelAsync(LEARNING_REMINDER_CHANNEL_ID, {
    name: "Baby Steps reminders",
    description: "Gentle, helpful nudges from Baby Steps.",
    importance: Notifications.AndroidImportance.DEFAULT,
    lightColor: brandColors.equatorialGold,
    vibrationPattern: [0, 160, 100, 160],
    sound: "default",
    showBadge: false,
  })
}

const permissionStateFromSettings = (
  settings: Notifications.NotificationPermissionsStatus,
): NotificationPermissionState => {
  if (settings.granted) return "granted"

  const iosStatus = settings.ios?.status
  if (
    iosStatus === Notifications.IosAuthorizationStatus.AUTHORIZED ||
    iosStatus === Notifications.IosAuthorizationStatus.PROVISIONAL ||
    iosStatus === Notifications.IosAuthorizationStatus.EPHEMERAL
  ) {
    return "granted"
  }

  return settings.status === Notifications.PermissionStatus.DENIED ? "denied" : "undetermined"
}

export async function getNotificationPermissionState(): Promise<NotificationPermissionState> {
  if (!isNativeNotificationsAvailable()) return "unavailable"

  try {
    return permissionStateFromSettings(await Notifications.getPermissionsAsync())
  } catch (error) {
    console.warn("Could not read notification permission:", error)
    return "unavailable"
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (!isNativeNotificationsAvailable()) return "unavailable"

  try {
    await ensureLearningReminderChannel()
    const current = await Notifications.getPermissionsAsync()
    if (permissionStateFromSettings(current) === "granted") return "granted"

    const requested = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: false,
        allowSound: true,
      },
    })
    return permissionStateFromSettings(requested)
  } catch (error) {
    console.warn("Could not request notification permission:", error)
    return "unavailable"
  }
}

async function cancelStoredReminders(ids: string[]) {
  await Promise.all(
    ids.map(async (id) => {
      try {
        await Notifications.cancelScheduledNotificationAsync(id)
      } catch (error) {
        console.warn("Could not cancel a scheduled Baby Steps reminder:", error)
      }
    }),
  )
}

export async function disableRecurringReminders(): Promise<NotificationPreferences> {
  const current = await getNotificationPreferences()

  if (isNativeNotificationsAvailable()) {
    await cancelStoredReminders(current.scheduledIds)
  }

  const next: NotificationPreferences = {
    enabled: false,
    scheduledIds: [],
    updatedAt: new Date().toISOString(),
  }
  await saveNotificationPreferences(next)
  return next
}

export async function scheduleRecurringReminders(
  permissionAlreadyGranted = false,
): Promise<NotificationPreferences> {
  if (!isNativeNotificationsAvailable()) {
    return disableRecurringReminders()
  }

  if (!permissionAlreadyGranted) {
    const permission = await getNotificationPermissionState()
    if (permission !== "granted") {
      return disableRecurringReminders()
    }
  }

  await ensureLearningReminderChannel()
  const current = await getNotificationPreferences()
  await cancelStoredReminders(current.scheduledIds)

  const scheduledIds: string[] = []
  try {
    for (const reminder of DEFAULT_REMINDER_SCHEDULE) {
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: reminder.title,
          body: reminder.body,
          sound: "default",
          data: {
            url: "/",
            kind: "learning-reminder",
            reminderId: reminder.id,
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: reminder.weekday,
          hour: reminder.hour,
          minute: reminder.minute,
          channelId: LEARNING_REMINDER_CHANNEL_ID,
        },
      })
      scheduledIds.push(identifier)
    }
  } catch (error) {
    await cancelStoredReminders(scheduledIds)
    throw error
  }

  const next: NotificationPreferences = {
    enabled: true,
    scheduledIds,
    updatedAt: new Date().toISOString(),
  }
  await saveNotificationPreferences(next)
  return next
}

export async function requestAndEnableRecurringReminders(): Promise<NotificationPermissionState> {
  const permission = await requestNotificationPermission()
  if (permission === "granted") {
    await scheduleRecurringReminders(true)
  } else {
    await disableRecurringReminders()
  }
  return permission
}

export async function syncRecurringRemindersIfEnabled() {
  const preferences = await getNotificationPreferences()
  if (!preferences.enabled) return preferences

  const permission = await getNotificationPermissionState()
  if (permission !== "granted") return disableRecurringReminders()

  return scheduleRecurringReminders()
}

export async function sendTestLearningReminder() {
  const permission = await getNotificationPermissionState()
  if (permission !== "granted") throw new Error("Notification permission is not granted.")

  await ensureLearningReminderChannel()
  return Notifications.scheduleNotificationAsync({
    content: {
      title: "A gentle Baby Steps nudge 🌱",
      body: "Your notifications are ready. Baby Steps will keep every message warm, helpful, and easy to manage.",
      sound: "default",
      data: { url: "/", kind: "test-learning-reminder" },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 3,
      channelId: LEARNING_REMINDER_CHANNEL_ID,
    },
  })
}

export function observeNotificationOpens(onOpenUrl: (url: string) => void) {
  if (!isNativeNotificationsAvailable()) return () => undefined

  const openResponse = async (response: Notifications.NotificationResponse | null) => {
    const url = response?.notification.request.content.data?.url
    if (typeof url === "string") {
      onOpenUrl(url)
      await Notifications.clearLastNotificationResponseAsync()
    }
  }

  void Notifications.getLastNotificationResponseAsync().then(openResponse)
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    void openResponse(response)
  })

  return () => subscription.remove()
}
