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

jest.mock("react-native", () => ({
  Platform: { OS: "android" },
}))

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
  SchedulableTriggerInputTypes: {
    DAILY: "daily",
    DATE: "date",
    TIME_INTERVAL: "timeInterval",
  },
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
  buildGroupedReminderCopy,
  deactivateAccountLearningReminders,
  disableRecurringReminders,
  getLearningReminderCancellationLedgerStorageKey,
  getLearningReminderSettingsStorageKey,
  getNotificationPreferences,
  requestAndEnableRecurringReminders,
  requestNotificationPermission,
  scheduleRecurringReminders,
  updateLearningReminderSettings,
} = require("../notifications")
/* eslint-enable @typescript-eslint/no-require-imports */

describe("grouped learning reminders", () => {
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
    mockCancelScheduledNotificationAsync.mockReset()
    mockCancelScheduledNotificationAsync.mockResolvedValue(undefined)
    mockGetPermissionsAsync.mockResolvedValue({ status: "granted", granted: true })
    mockRequestPermissionsAsync.mockResolvedValue({ status: "granted", granted: true })
    mockScheduleNotificationAsync.mockResolvedValue("one-reminder-id")
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: "parent-1" } } } })
    mockGetAllScheduledNotificationsAsync.mockResolvedValue([])
    mockGetLearningReminderCandidates.mockResolvedValue([
      { childId: "child-1", name: "Amina", completedToday: false },
      { childId: "child-2", name: "Kato", completedToday: true },
    ])
  })

  it("defaults to disabled settings scoped to one account", async () => {
    const preferences = await getNotificationPreferences("parent-1")

    expect(preferences.enabled).toBe(false)
    expect(preferences.reminderTime).toBe("18:00")
    expect(mockGetItem).toHaveBeenCalledWith(
      getLearningReminderSettingsStorageKey("parent-1"),
    )
    expect(getLearningReminderSettingsStorageKey("parent-2")).not.toBe(
      getLearningReminderSettingsStorageKey("parent-1"),
    )
  })

  it("keeps child names private by default and groups opt-in copy", () => {
    expect(buildGroupedReminderCopy(["Amina", "Kato"], false).body).not.toContain("Amina")
    expect(buildGroupedReminderCopy(["Amina", "Kato"], true).body).toContain("Amina and Kato")
    expect(buildGroupedReminderCopy(["Amina", "Kato", "Mirembe"], true).body).toContain(
      "and 1 others",
    )
    expect(buildGroupedReminderCopy(["Amina42"], true).body).not.toContain("Amina")
    expect(buildGroupedReminderCopy(["Amina Okello"], true).body).toContain("Amina")
    expect(buildGroupedReminderCopy(["Amina Okello"], true).body).not.toContain("Okello")
  })

  it("cancels and migrates identifiers from the legacy seven-reminder setting", async () => {
    mockGetItem
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(JSON.stringify({
        enabled: true,
        scheduledIds: ["legacy-one", "legacy-two"],
        updatedAt: "2026-07-01T00:00:00.000Z",
      }))

    const migrated = await getNotificationPreferences("parent-1")

    expect(migrated.enabled).toBe(true)
    expect(migrated.scheduledNotificationIds).toEqual([])
    expect(mockCancelScheduledNotificationAsync).toHaveBeenCalledTimes(2)
    expect(mockRemoveItem).toHaveBeenCalledWith("@baby_steps_notification_preferences")
    expect(mockSetItem).toHaveBeenCalledWith(
      getLearningReminderSettingsStorageKey("parent-1"),
      expect.stringContaining('"enabled":true'),
    )
  })

  it("does not re-prompt after the operating system reports denial", async () => {
    mockGetPermissionsAsync.mockResolvedValue({ status: "denied", granted: false })

    await expect(requestNotificationPermission()).resolves.toBe("denied")
    expect(mockRequestPermissionsAsync).not.toHaveBeenCalled()
  })

  it("schedules exactly one daily notification for incomplete eligible children", async () => {
    await requestAndEnableRecurringReminders("parent-1")

    expect(mockScheduleNotificationAsync).toHaveBeenCalledTimes(1)
    expect(mockScheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          body: expect.not.stringContaining("Amina"),
          data: expect.objectContaining({ url: "/parent", kind: "learning-reminder" }),
        }),
        trigger: expect.objectContaining({ type: "daily", hour: 18, minute: 0 }),
      }),
    )
    expect(mockSetItem).toHaveBeenLastCalledWith(
      getLearningReminderSettingsStorageKey("parent-1"),
      expect.stringContaining('"scheduledNotificationIds":["one-reminder-id"]'),
    )
  })

  it("moves an all-complete account to one notification tomorrow", async () => {
    mockGetLearningReminderCandidates.mockResolvedValue([
      { childId: "child-1", name: "Amina", completedToday: true },
    ])

    await scheduleRecurringReminders(true, "parent-1")

    expect(mockScheduleNotificationAsync).toHaveBeenCalledTimes(1)
    expect(mockScheduleNotificationAsync.mock.calls[0][0].trigger.type).toBe("date")
  })

  it("removes the scoped schedule when there are no eligible children", async () => {
    mockGetItem.mockResolvedValue(JSON.stringify({
      accountId: "parent-1",
      enabled: true,
      reminderTime: "18:00",
      showChildNames: false,
      scheduledNotificationIds: ["old-learning-reminder"],
      scheduleFingerprint: "old",
      updatedAt: null,
    }))
    mockGetLearningReminderCandidates.mockResolvedValue([])

    await scheduleRecurringReminders(true, "parent-1")

    expect(mockCancelScheduledNotificationAsync).toHaveBeenCalledWith("old-learning-reminder")
    expect(mockScheduleNotificationAsync).not.toHaveBeenCalled()
  })

  it("does not duplicate an unchanged grouped schedule", async () => {
    await scheduleRecurringReminders(true, "parent-1")
    await scheduleRecurringReminders(true, "parent-1")

    expect(mockScheduleNotificationAsync).toHaveBeenCalledTimes(1)
    expect(mockCancelScheduledNotificationAsync).not.toHaveBeenCalled()
  })

  it("uses at most two safe first names while still creating one schedule", async () => {
    mockGetItem.mockResolvedValue(JSON.stringify({
      accountId: "parent-1",
      enabled: true,
      reminderTime: "18:00",
      showChildNames: true,
      scheduledNotificationIds: [],
      scheduleFingerprint: null,
      updatedAt: null,
    }))
    mockGetLearningReminderCandidates.mockResolvedValue([
      { childId: "1", name: "Amina Okello", completedToday: false },
      { childId: "2", name: "Musa Kato", completedToday: false },
      { childId: "3", name: "Nambi", completedToday: false },
      { childId: "4", name: "Ayo", completedToday: false },
    ])

    await scheduleRecurringReminders(true, "parent-1")

    const body = mockScheduleNotificationAsync.mock.calls[0][0].content.body
    expect(mockScheduleNotificationAsync).toHaveBeenCalledTimes(1)
    expect(body).toBe("Amina, Musa, and 2 others can do a little learning today.")
    expect(body).not.toContain("Okello")
    expect(body).not.toContain("Kato")
  })

  it("cancels only the account's stored identifier when disabled", async () => {
    mockGetItem.mockResolvedValue(JSON.stringify({
      accountId: "parent-1",
      enabled: true,
      reminderTime: "18:00",
      showChildNames: false,
      scheduledNotificationIds: ["parent-1-reminder"],
      scheduleFingerprint: "old",
      updatedAt: null,
    }))

    await disableRecurringReminders("parent-1")

    expect(mockCancelScheduledNotificationAsync).toHaveBeenCalledTimes(1)
    expect(mockCancelScheduledNotificationAsync).toHaveBeenCalledWith("parent-1-reminder")
  })

  it("serializes simultaneous schedule calls and creates one native schedule", async () => {
    let releaseCandidates: (() => void) | undefined
    const candidatesReady = new Promise<void>((resolve) => {
      releaseCandidates = resolve
    })
    mockGetLearningReminderCandidates
      .mockImplementationOnce(async () => {
        await candidatesReady
        return [{ childId: "child-1", name: "Amina", completedToday: false }]
      })
      .mockResolvedValue([{ childId: "child-1", name: "Amina", completedToday: false }])

    const first = scheduleRecurringReminders(true, "parent-1")
    const second = scheduleRecurringReminders(true, "parent-1")
    await Promise.resolve()
    releaseCandidates?.()
    await Promise.all([first, second])

    expect(mockScheduleNotificationAsync).toHaveBeenCalledTimes(1)
  })

  it("retains a failed cancellation durably and retries before replacement", async () => {
    const warning = jest.spyOn(console, "warn").mockImplementation(() => undefined)
    storage.set(getLearningReminderSettingsStorageKey("parent-1"), JSON.stringify({
      accountId: "parent-1",
      enabled: true,
      reminderTime: "18:00",
      showChildNames: true,
      scheduledNotificationIds: ["old-id", "old-id"],
      scheduleFingerprint: "old",
      updatedAt: null,
    }))
    mockCancelScheduledNotificationAsync
      .mockRejectedValueOnce(new Error("native cancellation failed"))
      .mockResolvedValue(undefined)

    await scheduleRecurringReminders(true, "parent-1")
    expect(mockScheduleNotificationAsync).not.toHaveBeenCalled()
    expect(storage.get(getLearningReminderCancellationLedgerStorageKey())).toContain("old-id")

    await scheduleRecurringReminders(true, "parent-1")
    expect(mockCancelScheduledNotificationAsync).toHaveBeenCalledWith("old-id")
    expect(mockScheduleNotificationAsync).toHaveBeenCalledTimes(1)
    expect(storage.get(getLearningReminderCancellationLedgerStorageKey())).toBeUndefined()
    warning.mockRestore()
  })

  it("recovers a scheduled ID when the settings write fails", async () => {
    let failSettingsWrite = true
    mockSetItem.mockImplementation(async (key: string, value: string) => {
      if (key.includes("LearningReminderSettings") && failSettingsWrite) {
        failSettingsWrite = false
        throw new Error("settings storage failed")
      }
      storage.set(key, value)
    })

    await expect(scheduleRecurringReminders(true, "parent-1")).rejects.toThrow(
      "settings storage failed",
    )
    expect(storage.get(getLearningReminderCancellationLedgerStorageKey())).toContain(
      "one-reminder-id",
    )

    mockScheduleNotificationAsync.mockResolvedValue("replacement-id")
    await scheduleRecurringReminders(true, "parent-1")
    expect(mockCancelScheduledNotificationAsync).toHaveBeenCalledWith("one-reminder-id")
    expect(storage.get(getLearningReminderSettingsStorageKey("parent-1"))).toContain(
      "replacement-id",
    )
  })

  it("replaces the scoped reminder when time or privacy copy changes", async () => {
    await scheduleRecurringReminders(true, "parent-1")
    mockScheduleNotificationAsync.mockResolvedValueOnce("time-change-id")
    await updateLearningReminderSettings({ reminderTime: "19:15" }, "parent-1")
    mockScheduleNotificationAsync.mockResolvedValueOnce("privacy-change-id")
    await updateLearningReminderSettings({ showChildNames: true }, "parent-1")

    expect(mockCancelScheduledNotificationAsync).toHaveBeenCalledWith("one-reminder-id")
    expect(mockCancelScheduledNotificationAsync).toHaveBeenCalledWith("time-change-id")
    expect(mockScheduleNotificationAsync).toHaveBeenCalledTimes(3)
  })

  it("does not schedule for an account that signs out while candidates are loading", async () => {
    let releaseCandidates: (() => void) | undefined
    mockGetLearningReminderCandidates.mockImplementationOnce(async () => {
      await new Promise<void>((resolve) => {
        releaseCandidates = resolve
      })
      return [{ childId: "child-1", name: "Amina", completedToday: false }]
    })

    const scheduling = scheduleRecurringReminders(true, "parent-1")
    while (!releaseCandidates) await Promise.resolve()
    mockGetSession.mockResolvedValue({ data: { session: null } })
    releaseCandidates()
    await scheduling

    expect(mockScheduleNotificationAsync).not.toHaveBeenCalled()
  })

  it("keeps account settings and scoped native IDs isolated", async () => {
    await scheduleRecurringReminders(true, "parent-1")
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: "parent-2" } } } })
    mockScheduleNotificationAsync.mockResolvedValue("parent-2-id")
    await scheduleRecurringReminders(true, "parent-2")

    expect(storage.get(getLearningReminderSettingsStorageKey("parent-1"))).toContain(
      "one-reminder-id",
    )
    expect(storage.get(getLearningReminderSettingsStorageKey("parent-2"))).toContain(
      "parent-2-id",
    )
  })

  it("does not lose cancellation-ledger entries during cross-account cleanup", async () => {
    const warning = jest.spyOn(console, "warn").mockImplementation(() => undefined)
    storage.set(getLearningReminderSettingsStorageKey("parent-1"), JSON.stringify({
      accountId: "parent-1",
      enabled: true,
      reminderTime: "18:00",
      showChildNames: false,
      scheduledNotificationIds: ["parent-1-old-id"],
      scheduleFingerprint: "old",
      updatedAt: null,
    }))
    storage.set(getLearningReminderSettingsStorageKey("parent-2"), JSON.stringify({
      accountId: "parent-2",
      enabled: true,
      reminderTime: "18:00",
      showChildNames: false,
      scheduledNotificationIds: ["parent-2-old-id"],
      scheduleFingerprint: "old",
      updatedAt: null,
    }))
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: "parent-2" } } } })
    mockCancelScheduledNotificationAsync.mockRejectedValue(new Error("native unavailable"))

    await Promise.all([
      deactivateAccountLearningReminders("parent-1"),
      scheduleRecurringReminders(true, "parent-2"),
    ])

    const ledger = storage.get(getLearningReminderCancellationLedgerStorageKey()) ?? ""
    expect(ledger).toContain("parent-1-old-id")
    expect(ledger).toContain("parent-2-old-id")
    warning.mockRestore()
  })

  it("preserves unrelated scheduled notifications while removing scoped orphans", async () => {
    mockGetLearningReminderCandidates.mockResolvedValue([])
    mockGetAllScheduledNotificationsAsync.mockResolvedValue([
      {
        identifier: "scoped-orphan",
        content: {
          data: {
            babyStepsScope: "baby-steps-learning-reminder-v1",
            ownerToken: "acct-23978753",
          },
        },
      },
      { identifier: "unrelated-id", content: { data: { kind: "calendar" } } },
    ])

    await scheduleRecurringReminders(true, "parent-1")

    expect(mockCancelScheduledNotificationAsync).toHaveBeenCalledWith("scoped-orphan")
    expect(mockCancelScheduledNotificationAsync).not.toHaveBeenCalledWith("unrelated-id")
  })
})
