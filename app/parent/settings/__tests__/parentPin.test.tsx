import React from "react"
import renderer, { act, type ReactTestInstance } from "react-test-renderer"

const mockBack = jest.fn()
const mockPush = jest.fn()
const mockGetSession = jest.fn()
const mockHasParentPin = jest.fn()
const mockRevealParentPinWithReauthentication = jest.fn()
const mockSetParentPinWithReauthentication = jest.fn()
const mockRequireInternet = jest.fn()

jest.mock("expo-router", () => ({
  useRouter: () => ({ back: mockBack, push: mockPush }),
}))

jest.mock("expo-status-bar", () => ({ StatusBar: () => null }))
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

jest.mock("@/lib/parentAccess", () => ({
  PARENT_PIN_LENGTH: 6,
  hasParentPin: (...args: unknown[]) => mockHasParentPin(...args),
  isValidParentPin: (pin: string) => /^\d{6}$/.test(pin),
  revealParentPinWithReauthentication: (...args: unknown[]) =>
    mockRevealParentPinWithReauthentication(...args),
  setParentPinWithReauthentication: (...args: unknown[]) =>
    mockSetParentPinWithReauthentication(...args),
}))

jest.mock("@/lib/network", () => ({
  requireInternet: (...args: unknown[]) => mockRequireInternet(...args),
}))

/* eslint-disable @typescript-eslint/no-require-imports */
const ParentPinSettingsScreen = require("../parent-pin").default
/* eslint-enable @typescript-eslint/no-require-imports */

const findByLabel = (root: ReactTestInstance, label: string) =>
  root.find((node) => node.props.accessibilityLabel === label)

describe("Parent PIN settings", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: { id: "parent-1", email: "parent@example.com" },
        },
      },
      error: null,
    })
    mockHasParentPin.mockResolvedValue(true)
    mockRevealParentPinWithReauthentication.mockResolvedValue("246810")
    mockSetParentPinWithReauthentication.mockResolvedValue(true)
    mockRequireInternet.mockResolvedValue(true)
  })

  it("lets the parent display or hide both PIN fields", async () => {
    let tree!: renderer.ReactTestRenderer
    await act(async () => {
      tree = renderer.create(<ParentPinSettingsScreen />)
      await Promise.resolve()
      await Promise.resolve()
    })

    const newPin = findByLabel(tree.root, "New parent PIN")
    const confirmation = findByLabel(tree.root, "Confirm new parent PIN")
    expect(newPin.props.secureTextEntry).toBe(true)
    expect(confirmation.props.secureTextEntry).toBe(true)

    act(() => {
      findByLabel(tree.root, "Show parent PINs").props.onPress()
    })

    expect(findByLabel(tree.root, "New parent PIN").props.secureTextEntry).toBe(
      false,
    )
    expect(
      findByLabel(tree.root, "Confirm new parent PIN").props.secureTextEntry,
    ).toBe(false)
  })

  it("requires matching six-digit values and reauthenticates before saving", async () => {
    let tree!: renderer.ReactTestRenderer
    await act(async () => {
      tree = renderer.create(<ParentPinSettingsScreen />)
      await Promise.resolve()
      await Promise.resolve()
    })

    act(() => {
      findByLabel(tree.root, "Current parent account password").props.onChangeText(
        "current-password",
      )
      findByLabel(tree.root, "New parent PIN").props.onChangeText("246810")
      findByLabel(tree.root, "Confirm new parent PIN").props.onChangeText("246810")
    })

    await act(async () => {
      await findByLabel(tree.root, "Save new parent PIN").props.onPress()
    })

    expect(mockRequireInternet).toHaveBeenCalledWith(
      "Checking your password",
    )
    expect(mockSetParentPinWithReauthentication).toHaveBeenCalledWith({
      accountId: "parent-1",
      password: "current-password",
      pin: "246810",
    })
  })

  it("checks the password before showing the saved PIN", async () => {
    let tree!: renderer.ReactTestRenderer
    await act(async () => {
      tree = renderer.create(<ParentPinSettingsScreen />)
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(findByLabel(tree.root, "Current parent PIN hidden")).toBeTruthy()
    expect(findByLabel(tree.root, "Show current PIN").props.disabled).toBe(true)

    act(() => {
      findByLabel(tree.root, "Current parent account password").props.onChangeText(
        "current-password",
      )
    })
    await act(async () => {
      await findByLabel(tree.root, "Show current PIN").props.onPress()
      await Promise.resolve()
    })

    expect(mockRevealParentPinWithReauthentication).toHaveBeenCalledWith({
      accountId: "parent-1",
      password: "current-password",
    })
    expect(findByLabel(tree.root, "Current parent PIN 246810")).toBeTruthy()
    expect(
      findByLabel(tree.root, "Current parent account password").props.value,
    ).toBe("")

    act(() => {
      findByLabel(tree.root, "Hide PIN").props.onPress()
    })
    expect(findByLabel(tree.root, "Current parent PIN hidden")).toBeTruthy()
  })
})
