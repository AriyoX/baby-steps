const mockGetItem = jest.fn()
const mockSetItem = jest.fn()
const mockRemoveItem = jest.fn()
const mockGetPermissionsAsync = jest.fn()
const mockRequestPermissionsAsync = jest.fn()
const mockSetNotificationChannelAsync = jest.fn()
const mockScheduleNotificationAsync = jest.fn()
const mockCancelScheduledNotificationAsync = jest.fn()
const mockGetLearningReminderCandidates = jest.fn()
const mockGetSession = jest.fn()
const mockGetAllScheduledNotificationsAsync = jest.fn()
const storage = new Map<string, string>()

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: mockGetItem,
  setItem: mockSetItem,
  removeItem: mockRemoveItem,
}))

jest.mock("react-native", () => ({ Platform: { OS: "android" } }))

jest.mock("@/lib/streakRepository", () => ({
  getLearningReminderCandidates: mockGetLearningReminderCandidates,
}))

jest.mock("@/lib/supabase", () => ({
  supabase: { auth: { getSession: mockGetSession } },
}))

jest.mock("expo-notifications", () => ({
  AndroidImportance: { DEFAULT: 3 },
  IosAuthorizationStatus: { AUTHORIZED: 2, PROVISIONAL: 3, EPHEMERAL: 4 },
  PermissionStatus: { GRANTED: "granted", DENIED: "denied", UNDETERMINED: "undetermined" },
  SchedulableTriggerInputTypes: { DAILY: "daily", TIME_INTERVAL: "timeInterval" },
  getPermissionsAsync: mockGetPermissionsAsync,
  requestPermissionsAsync: mockRequestPermissionsAsync,
  setNotificationChannelAsync: mockSetNotificationChannelAsync,
  scheduleNotificationAsync: mockScheduleNotificationAsync,
  cancelScheduledNotificationAsync: mockCancelScheduledNotificationAsync,
  getAllScheduledNotificationsAsync: mockGetAllScheduledNotificationsAsync,
  setNotificationHandler: jest.fn(),
  getLastNotificationResponseAsync: jest.fn().mockResolvedValue(null),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  clearLastNotificationResponseAsync: jest.fn(),
}))

/* eslint-disable @typescript-eslint/no-require-imports */
const {
  STANDARD_LEARNING_REMINDER_TIMES,
  disableRecurringReminders,
  getLearningReminderSettingsStorageKey,
  getNotificationPreferences,
  requestAndEnableRecurringReminders,
  requestNotificationPermission,
  scheduleRecurringReminders,
  updateLearningReminderPrivacy,
} = require("../notifications")
/* eslint-enable @typescript-eslint/no-require-imports */

describe("standard learning reminders", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    storage.clear()
    mockGetItem.mockImplementation(async (key: string) => storage.get(key) ?? null)
    mockSetItem.mockImplementation(async (key: string, value: string) => {
      storage.set(key, value)
    })
    mockRemoveItem.mockImplementation(async (key: string) => {
      storage.delete(key)
    })
    mockSetNotificationChannelAsync.mockResolvedValue({ id: "learning-reminders" })
    mockCancelScheduledNotificationAsync.mockResolvedValue(undefined)
    mockGetPermissionsAsync.mockResolvedValue({ status: "granted", granted: true })
    mockRequestPermissionsAsync.mockResolvedValue({ status: "granted", granted: true })
    mockScheduleNotificationAsync.mockImplementation(async () =>
      `reminder-${mockScheduleNotificationAsync.mock.calls.length}`,
    )
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: "parent-1" } } } })
    mockGetAllScheduledNotificationsAsync.mockResolvedValue([])
    mockGetLearningReminderCandidates.mockResolvedValue([
      { childId: "child-1", name: "Amina", completedToday: false },
    ])
  })

  it("stores no editable reminder time or frequency", async () => {
    const preferences = await getNotificationPreferences("parent-1")

    expect(preferences).toEqual(expect.objectContaining({ enabled: false, showChildNames: false }))
    expect(preferences).not.toHaveProperty("reminderTime")
    expect(preferences).not.toHaveProperty("frequency")
    expect(STANDARD_LEARNING_REMINDER_TIMES).toEqual([
      { id: "morning", hour: 8, minute: 0 },
      { id: "evening", hour: 18, minute: 0 },
    ])
  })

  it("migrates a saved custom time and cancels its obsolete schedule", async () => {
    const legacyKey = "@BabySteps:LearningReminderSettings:v1:parent-1"
    storage.set(legacyKey, JSON.stringify({
      enabled: true,
      reminderTime: "19:15",
      frequency: "daily",
      showChildNames: true,
      scheduledNotificationIds: ["legacy-custom-time"],
    }))

    const migrated = await getNotificationPreferences("parent-1")

    expect(migrated).toEqual(expect.objectContaining({ enabled: true, showChildNames: true }))
    expect(migrated).not.toHaveProperty("reminderTime")
    expect(mockCancelScheduledNotificationAsync).toHaveBeenCalledWith("legacy-custom-time")
    expect(storage.has(legacyKey)).toBe(false)
    expect(storage.get(getLearningReminderSettingsStorageKey("parent-1"))).not.toContain(
      "19:15",
    )
  })

  it("does not re-prompt after notification permission is denied", async () => {
    mockGetPermissionsAsync.mockResolvedValue({ status: "denied", granted: false })

    await expect(requestNotificationPermission()).resolves.toBe("denied")
    expect(mockRequestPermissionsAsync).not.toHaveBeenCalled()
  })

  it("schedules exactly one morning and one evening reminder in local time", async () => {
    await requestAndEnableRecurringReminders("parent-1")

    expect(mockScheduleNotificationAsync).toHaveBeenCalledTimes(2)
    expect(mockScheduleNotificationAsync.mock.calls.map(([request]) => request.trigger)).toEqual([
      expect.objectContaining({ type: "daily", hour: 8, minute: 0 }),
      expect.objectContaining({ type: "daily", hour: 18, minute: 0 }),
    ])
    expect(mockScheduleNotificationAsync.mock.calls.map(([request]) => request.content.data.reminderPeriod)).toEqual([
      "morning",
      "evening",
    ])
    expect(storage.get(getLearningReminderSettingsStorageKey("parent-1"))).toContain(
      '"scheduledNotificationIds":["reminder-1","reminder-2"]',
    )
  })

  it("keeps the standard two-reminder schedule when no child is currently eligible", async () => {
    mockGetLearningReminderCandidates.mockResolvedValue([])

    await scheduleRecurringReminders(true, "parent-1")

    expect(mockScheduleNotificationAsync).toHaveBeenCalledTimes(2)
    expect(mockScheduleNotificationAsync.mock.calls.every(([request]) =>
      request.content.body === "A little learning today can build a strong habit.",
    )).toBe(true)
  })

  it("does not duplicate an unchanged morning and evening schedule", async () => {
    await scheduleRecurringReminders(true, "parent-1")
    await scheduleRecurringReminders(true, "parent-1")

    expect(mockScheduleNotificationAsync).toHaveBeenCalledTimes(2)
    expect(mockCancelScheduledNotificationAsync).not.toHaveBeenCalled()
  })

  it("reschedules both fixed reminders when privacy copy changes", async () => {
    await scheduleRecurringReminders(true, "parent-1")
    await updateLearningReminderPrivacy(true, "parent-1")

    expect(mockCancelScheduledNotificationAsync).toHaveBeenCalledWith("reminder-1")
    expect(mockCancelScheduledNotificationAsync).toHaveBeenCalledWith("reminder-2")
    expect(mockScheduleNotificationAsync).toHaveBeenCalledTimes(4)
    expect(mockScheduleNotificationAsync.mock.calls[2][0].content.body).toContain("Amina")
  })

  it("cancels both standard reminders when reminders are disabled", async () => {
    await scheduleRecurringReminders(true, "parent-1")
    await disableRecurringReminders("parent-1")

    expect(mockCancelScheduledNotificationAsync).toHaveBeenCalledWith("reminder-1")
    expect(mockCancelScheduledNotificationAsync).toHaveBeenCalledWith("reminder-2")
  })
})
