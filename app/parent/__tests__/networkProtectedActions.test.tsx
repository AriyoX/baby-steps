import React from "react"
import { TextInput, TouchableOpacity } from "react-native"
import renderer, { act, type ReactTestInstance } from "react-test-renderer"

const mockRouter = {
  back: jest.fn(),
  push: jest.fn(),
  replace: jest.fn(),
}
const mockUseLocalSearchParams = jest.fn(() => ({ childId: "child-1" }))
const mockSetActiveChild = jest.fn()
const mockRequireInternet = jest.fn()
const mockShowNetworkErrorIfNeeded = jest.fn()
const mockRequestAccountDeletion = jest.fn()
const mockFetchActiveChildProfile = jest.fn()
const mockArchiveChildProfile = jest.fn()
const mockGetAccountDeletionState = jest.fn()
const mockReactivateAccount = jest.fn()
const mockGetSession = jest.fn()
const mockSignOut = jest.fn()
const mockFrom = jest.fn()

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => mockUseLocalSearchParams(),
  useRouter: () => mockRouter,
}))

jest.mock("expo-status-bar", () => ({ StatusBar: "StatusBar" }))

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
}))

jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}))

jest.mock("@/components/brand/BrandMark", () => ({ BrandMark: () => null }))

jest.mock("@/components/settings/SettingsScaffold", () => {
  const ReactModule = jest.requireActual("react")
  const ReactNative = jest.requireActual("react-native")
  return {
    SettingsScaffold: ({ children }: { children: unknown }) =>
      ReactModule.createElement(ReactNative.View, null, children),
  }
})

jest.mock("@/components/translated-text", () => {
  const ReactNative = jest.requireActual("react-native")
  return { TranslatedText: ReactNative.Text }
})

jest.mock("@/components/games/achievements/AchievementCard", () => ({
  AchievementCard: () => null,
}))

jest.mock("@/components/games/achievements/useAchievements", () => {
  const definedAchievements: unknown[] = []
  const earnedChildAchievements: unknown[] = []
  return {
    useAchievements: () => ({
      definedAchievements,
      earnedChildAchievements,
      isLoadingAchievements: false,
    }),
  }
})

jest.mock("@/context/ChildContext", () => ({
  useChild: () => ({ activeChild: null, setActiveChild: mockSetActiveChild }),
}))

jest.mock("@/lib/network", () => ({
  requireInternet: mockRequireInternet,
  showNetworkErrorIfNeeded: mockShowNetworkErrorIfNeeded,
}))

jest.mock("@/lib/accountManagement", () => ({
  ACCOUNT_DELETE_CONFIRMATION_WORD: "DELETE",
  archiveChildProfile: mockArchiveChildProfile,
  fetchActiveChildProfile: mockFetchActiveChildProfile,
  getAccountDeletionState: mockGetAccountDeletionState,
  isAccountDeleteConfirmationValid: (value: string) => value.trim() === "DELETE",
  isChildDeleteConfirmationValid: (value: string, name: string) =>
    value.trim().toLowerCase() === name.trim().toLowerCase(),
  reactivateAccount: mockReactivateAccount,
  requestAccountDeletion: mockRequestAccountDeletion,
}))

jest.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
      signOut: mockSignOut,
    },
    from: mockFrom,
  },
}))

/* eslint-disable @typescript-eslint/no-require-imports */
const AccountReactivationScreen = require("../../account-reactivation").default
const ChildDetailScreen = require("../child-detail/[id]").default
const AccountDeleteScreen = require("../settings/account-delete").default
const ChildProfileDeleteScreen = require("../settings/child-profile-delete").default
/* eslint-enable @typescript-eslint/no-require-imports */

const mountedTrees: renderer.ReactTestRenderer[] = []

const textContent = (node: ReactTestInstance): string =>
  node.findAll(() => true)
    .map((child) => (typeof child.props.children === "string" ? child.props.children : ""))
    .join(" ")

const findButtonByText = (root: ReactTestInstance, text: string): ReactTestInstance => {
  const button = root
    .findAllByType(TouchableOpacity)
    .find((candidate) => textContent(candidate).includes(text))
  if (!button) throw new Error(`Could not find button: ${text}`)
  return button
}

const renderScreen = async (element: React.ReactElement) => {
  let tree!: renderer.ReactTestRenderer
  await act(async () => {
    tree = renderer.create(element)
    await Promise.resolve()
    await Promise.resolve()
  })
  mountedTrees.push(tree)
  return tree
}

beforeEach(() => {
  jest.clearAllMocks()
  mockUseLocalSearchParams.mockReturnValue({ childId: "child-1" })
  mockRequireInternet.mockResolvedValue(true)
  mockShowNetworkErrorIfNeeded.mockResolvedValue(false)
  mockFetchActiveChildProfile.mockResolvedValue({
    id: "child-1",
    parent_id: "parent-1",
    name: "Amina",
    gender: "female",
    age: "5",
    selected_language_code: "lg",
  })
  mockGetSession.mockResolvedValue({
    data: { session: { user: { id: "parent-1" } } },
  })
  mockSignOut.mockResolvedValue({ error: null })
  mockGetAccountDeletionState.mockResolvedValue({
    phase: "pending",
    graceEndsAt: "2026-08-01T00:00:00.000Z",
    request: {
      id: "request-1",
      user_id: "parent-1",
      status: "requested",
      requested_at: "2026-07-01T00:00:00.000Z",
    },
  })

  const childQuery = {
    select: jest.fn(),
    eq: jest.fn(),
    is: jest.fn(),
    single: jest.fn().mockResolvedValue({
      data: {
        id: "child-1",
        name: "Amina",
        gender: "female",
        age: "5",
        selected_language_code: "lg",
      },
      error: null,
    }),
  }
  childQuery.select.mockReturnValue(childQuery)
  childQuery.eq.mockReturnValue(childQuery)
  childQuery.is.mockReturnValue(childQuery)
  mockFrom.mockReturnValue(childQuery)
})

afterEach(() => {
  act(() => {
    mountedTrees.forEach((tree) => tree.unmount())
  })
  mountedTrees.length = 0
})

describe("network-protected account and child actions", () => {
  it("does not schedule account deletion while explicitly offline", async () => {
    const tree = await renderScreen(<AccountDeleteScreen />)
    act(() => {
      tree.root.findByType(TextInput).props.onChangeText("DELETE")
    })
    mockRequireInternet.mockResolvedValueOnce(false)

    await act(async () => {
      await findButtonByText(tree.root, "Delete my account").props.onPress()
    })

    expect(mockRequireInternet).toHaveBeenLastCalledWith("Scheduling account deletion")
    expect(mockRequestAccountDeletion).not.toHaveBeenCalled()
  })

  it("does not archive a child profile while explicitly offline", async () => {
    const tree = await renderScreen(<ChildProfileDeleteScreen />)
    act(() => {
      tree.root.findByType(TextInput).props.onChangeText("Amina")
    })
    mockRequireInternet.mockResolvedValueOnce(false)

    await act(async () => {
      await findButtonByText(tree.root, "Archive Child Profile").props.onPress()
    })

    expect(mockRequireInternet).toHaveBeenLastCalledWith("Archiving this child profile")
    expect(mockArchiveChildProfile).not.toHaveBeenCalled()
  })

  it("does not attempt account reactivation while explicitly offline", async () => {
    const tree = await renderScreen(<AccountReactivationScreen />)
    mockRequireInternet.mockResolvedValueOnce(false)

    await act(async () => {
      await findButtonByText(tree.root, "Keep my account").props.onPress()
    })

    expect(mockRequireInternet).toHaveBeenLastCalledWith("Reactivating your account")
    expect(mockReactivateAccount).not.toHaveBeenCalled()
  })

  it("checks connectivity before accessing a child profile", async () => {
    mockRequireInternet.mockResolvedValueOnce(false)
    await renderScreen(<ChildDetailScreen />)

    expect(mockRequireInternet).toHaveBeenCalledWith("Loading this child profile")
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it("checks connectivity before launching child mode", async () => {
    const tree = await renderScreen(<ChildDetailScreen />)
    mockRequireInternet.mockResolvedValueOnce(false)

    await act(async () => {
      await findButtonByText(tree.root, "Launch Child Mode").props.onPress()
    })

    expect(mockRequireInternet).toHaveBeenLastCalledWith("Launching child mode")
    expect(mockSetActiveChild).not.toHaveBeenCalled()
    expect(mockRouter.push).not.toHaveBeenCalled()
  })
})
