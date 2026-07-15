const mockGetItem = jest.fn()
const mockSetItem = jest.fn()
const mockGetPermissionsAsync = jest.fn()
const mockRequestPermissionsAsync = jest.fn()
const mockSetNotificationChannelAsync = jest.fn()
const mockScheduleNotificationAsync = jest.fn()
const mockCancelScheduledNotificationAsync = jest.fn()

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: mockGetItem,
  setItem: mockSetItem,
}))

jest.mock("react-native", () => ({
  Platform: { OS: "android" },
}))

jest.mock("expo-notifications", () => ({
  AndroidImportance: { DEFAULT: 3 },
  IosAuthorizationStatus: {
    AUTHORIZED: 2,
    PROVISIONAL: 3,
    EPHEMERAL: 4,
  },
  PermissionStatus: {
    GRANTED: "granted",
    DENIED: "denied",
    UNDETERMINED: "undetermined",
  },
  SchedulableTriggerInputTypes: {
    WEEKLY: "weekly",
    TIME_INTERVAL: "timeInterval",
  },
  getPermissionsAsync: mockGetPermissionsAsync,
  requestPermissionsAsync: mockRequestPermissionsAsync,
  setNotificationChannelAsync: mockSetNotificationChannelAsync,
  scheduleNotificationAsync: mockScheduleNotificationAsync,
  cancelScheduledNotificationAsync: mockCancelScheduledNotificationAsync,
  setNotificationHandler: jest.fn(),
  getLastNotificationResponseAsync: jest.fn().mockResolvedValue(null),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  clearLastNotificationResponseAsync: jest.fn(),
}))

/* eslint-disable @typescript-eslint/no-require-imports */
const {
  DEFAULT_REMINDER_SCHEDULE,
  disableRecurringReminders,
  requestAndEnableRecurringReminders,
} = require("../notifications")
/* eslint-enable @typescript-eslint/no-require-imports */

describe("learning reminders", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetItem.mockResolvedValue(null)
    mockSetItem.mockResolvedValue(undefined)
    mockSetNotificationChannelAsync.mockResolvedValue({ id: "learning-reminders" })
    mockGetPermissionsAsync
      .mockResolvedValueOnce({ status: "undetermined", granted: false })
      .mockResolvedValue({ status: "granted", granted: true })
    mockRequestPermissionsAsync.mockResolvedValue({ status: "granted", granted: true })
    const scheduledDays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
    scheduledDays.forEach((day) => mockScheduleNotificationAsync.mockResolvedValueOnce(`${day}-id`))
  })

  it("uses the intended gentle weekly schedule", () => {
    expect(DEFAULT_REMINDER_SCHEDULE.map((reminder: { weekday: number; hour: number; minute: number }) => ({
      weekday: reminder.weekday,
      hour: reminder.hour,
      minute: reminder.minute,
    }))).toEqual([
      { weekday: 1, hour: 10, minute: 0 },
      { weekday: 2, hour: 19, minute: 30 },
      { weekday: 3, hour: 19, minute: 30 },
      { weekday: 4, hour: 19, minute: 30 },
      { weekday: 5, hour: 19, minute: 30 },
      { weekday: 6, hour: 19, minute: 30 },
      { weekday: 7, hour: 10, minute: 0 },
    ])
  })

  it("requests permission and schedules all recurring reminders", async () => {
    await requestAndEnableRecurringReminders()

    expect(mockSetNotificationChannelAsync).toHaveBeenCalled()
    expect(mockRequestPermissionsAsync).toHaveBeenCalled()
    expect(mockScheduleNotificationAsync).toHaveBeenCalledTimes(7)
    expect(mockSetItem).toHaveBeenLastCalledWith(
      "@baby_steps_notification_preferences",
      expect.stringContaining('"enabled":true'),
    )
  })

  it("cancels only stored Baby Steps reminders when disabled", async () => {
    mockGetItem.mockResolvedValue(JSON.stringify({
      enabled: true,
      scheduledIds: ["one", "two"],
      updatedAt: null,
    }))

    await disableRecurringReminders()

    expect(mockCancelScheduledNotificationAsync).toHaveBeenCalledTimes(2)
    expect(mockCancelScheduledNotificationAsync).toHaveBeenCalledWith("one")
    expect(mockCancelScheduledNotificationAsync).toHaveBeenCalledWith("two")
  })
})
