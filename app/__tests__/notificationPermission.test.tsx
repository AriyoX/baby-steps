import React from "react"
import { TouchableOpacity } from "react-native"
import renderer, { act, type ReactTestInstance } from "react-test-renderer"

const mockReplace = jest.fn()
const mockGetSession = jest.fn()
const mockCompleteNotificationOnboarding = jest.fn()
const mockRequestAndEnableRecurringReminders = jest.fn()

jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace }),
  useLocalSearchParams: () => ({ next: "/parent" }),
}))
jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
}))
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }))
jest.mock("@/components/brand/BrandMark", () => ({ BrandMark: () => null }))

jest.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
    },
  },
}))

jest.mock("@/lib/notifications", () => ({
  completeNotificationOnboarding: (...args: unknown[]) =>
    mockCompleteNotificationOnboarding(...args),
  requestAndEnableRecurringReminders: (...args: unknown[]) =>
    mockRequestAndEnableRecurringReminders(...args),
}))

jest.mock("@/lib/accountManagement", () => ({
  fetchActiveChildProfiles: jest.fn(),
  getAccountDeletionState: jest.fn(),
  getPostLoginRouteForAccountState: jest.fn(() => "/parent"),
}))

/* eslint-disable @typescript-eslint/no-require-imports */
const NotificationPermissionScreen = require("../notification-permission").default
/* eslint-enable @typescript-eslint/no-require-imports */

const textContent = (node: unknown): string => {
  if (typeof node === "string") return node
  if (Array.isArray(node)) return node.map(textContent).join("")
  if (!node || typeof node !== "object") return ""
  return textContent((node as { children?: unknown }).children)
}

const findButton = (root: ReactTestInstance, label: string) =>
  root
    .findAllByType(TouchableOpacity)
    .find((node) => textContent(node).includes(label))

describe("notification permission onboarding", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: "parent-1" } } },
    })
    mockCompleteNotificationOnboarding.mockResolvedValue(undefined)
    mockRequestAndEnableRecurringReminders.mockResolvedValue("granted")
  })

  it("finishes the account-scoped prompt when the parent chooses not now", async () => {
    let tree!: renderer.ReactTestRenderer
    await act(async () => {
      tree = renderer.create(<NotificationPermissionScreen />)
    })

    await act(async () => {
      await findButton(tree.root, "Not now")?.props.onPress()
    })

    expect(mockCompleteNotificationOnboarding).toHaveBeenCalledWith("parent-1")
    expect(mockRequestAndEnableRecurringReminders).not.toHaveBeenCalled()
    expect(mockReplace).toHaveBeenCalledWith("/parent")
  })

  it("requests notification permission only while the parent is signed in", async () => {
    let tree!: renderer.ReactTestRenderer
    await act(async () => {
      tree = renderer.create(<NotificationPermissionScreen />)
    })

    await act(async () => {
      await findButton(tree.root, "Turn on gentle reminders")?.props.onPress()
    })

    expect(mockRequestAndEnableRecurringReminders).toHaveBeenCalledTimes(1)
    expect(mockCompleteNotificationOnboarding).toHaveBeenCalledWith("parent-1")
    expect(mockReplace).toHaveBeenCalledWith("/parent")
  })
})
