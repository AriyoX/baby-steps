import React from "react"
import { Switch, TouchableOpacity } from "react-native"
import renderer, { act } from "react-test-renderer"

import NotificationSettingsScreen from "../settings/notifications"

const mockGetNotificationPreferences = jest.fn()
const mockGetNotificationPermissionState = jest.fn()

jest.mock("expo-router", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require("react")
  return {
    useFocusEffect: (effect: () => void | (() => void)) => React.useEffect(effect, [effect]),
  }
})

jest.mock("@/components/settings/SettingsScaffold", () => ({
  SettingsScaffold: ({ children }: { children: React.ReactNode }) => children,
}))

jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}))

jest.mock("@/lib/notifications", () => ({
  STANDARD_LEARNING_REMINDER_TIMES: [
    { id: "morning", hour: 8, minute: 0 },
    { id: "evening", hour: 18, minute: 0 },
  ],
  disableRecurringReminders: jest.fn(),
  getNotificationPermissionState: (...args: unknown[]) =>
    mockGetNotificationPermissionState(...args),
  getNotificationPreferences: (...args: unknown[]) =>
    mockGetNotificationPreferences(...args),
  requestAndEnableRecurringReminders: jest.fn(),
  updateLearningReminderPrivacy: jest.fn(),
}))

describe("notification settings", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetNotificationPreferences.mockResolvedValue({
      enabled: true,
      showChildNames: false,
    })
    mockGetNotificationPermissionState.mockResolvedValue("granted")
  })

  it("shows the fixed schedule without editable time or frequency controls", async () => {
    let tree!: renderer.ReactTestRenderer
    await act(async () => {
      tree = renderer.create(<NotificationSettingsScreen />)
      await Promise.resolve()
    })

    const text = JSON.stringify(tree.toJSON())
    expect(text).toContain("Daily schedule")
    expect(text).toContain("Morning")
    expect(text).toContain("08:00")
    expect(text).toContain("Evening")
    expect(text).toContain("18:00")
    expect(text).not.toMatch(/Reminder time|Morning time|Evening time|Frequency/)
    expect(tree.root.findAllByType(Switch)).toHaveLength(2)
    expect(tree.root.findAllByType(TouchableOpacity)).toHaveLength(0)
  })
})
