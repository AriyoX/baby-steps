import React from "react"
import { Alert } from "react-native"
import renderer, { act, type ReactTestRenderer } from "react-test-renderer"

import SubmitScreen from "../final"

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
}
const mockAddChildProfile = jest.fn()
const mockActivateChildMode = jest.fn()
const mockGetSession = jest.fn()
const mockHasParentPin = jest.fn()

jest.mock("expo-router", () => ({
  useRouter: () => mockRouter,
}))

jest.mock("@/context/UserContext", () => ({
  useUser: () => ({
    addChildProfile: mockAddChildProfile,
    age: "5",
    gender: "female",
    name: "Amina",
    reason: "language",
    selectedLanguageCode: "lg",
  }),
}))

jest.mock("@/context/ChildContext", () => ({
  useChild: () => ({
    activateChildMode: mockActivateChildMode,
  }),
}))

jest.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
    },
  },
}))

jest.mock("@/lib/parentAccess", () => ({
  hasParentPin: (...args: unknown[]) => mockHasParentPin(...args),
}))

jest.mock("@/lib/network", () => ({
  requireInternet: jest.fn(async () => true),
  showNetworkErrorIfNeeded: jest.fn(async () => false),
}))

jest.mock("@/components/common/AppButton", () => {
  const ReactModule = jest.requireActual("react")
  const ReactNative = jest.requireActual("react-native")
  return {
    AppButton: ({
      disabled,
      label,
      loading,
      loadingLabel,
      onPress,
    }: {
      disabled?: boolean
      label: string
      loading?: boolean
      loadingLabel?: string
      onPress: () => void
    }) =>
      ReactModule.createElement(
        ReactNative.TouchableOpacity,
        {
          disabled,
          onPress,
          testID: `button-${label}`,
        },
        ReactModule.createElement(
          ReactNative.Text,
          null,
          loading ? loadingLabel : label,
        ),
      ),
  }
})

jest.mock("@/components/translated-text", () => {
  const ReactNative = jest.requireActual("react-native")
  return { TranslatedText: ReactNative.Text }
})

jest.mock("@/components/brand/BrandMark", () => ({
  BrandMark: () => null,
}))

jest.mock("@expo/vector-icons", () => ({
  FontAwesome5: () => null,
}))

jest.mock("react-native-safe-area-context", () => {
  const ReactModule = jest.requireActual("react")
  return {
    SafeAreaView: ({ children }: { children: React.ReactNode }) =>
      ReactModule.createElement(ReactModule.Fragment, null, children),
  }
})

const savedChild = {
  age: "5",
  gender: "female",
  id: "child-1",
  name: "Amina",
  selected_language_code: "lg",
}

const deferred = <T,>() => {
  let resolve!: (value: T | PromiseLike<T>) => void
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve
  })
  return { promise, resolve }
}

const renderScreen = async () => {
  let tree!: ReactTestRenderer
  await act(async () => {
    tree = renderer.create(<SubmitScreen />)
    await Promise.resolve()
    await Promise.resolve()
  })
  return tree
}

describe("new child profile handoff", () => {
  let alertSpy: jest.SpyInstance
  let errorSpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => undefined)
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined)
    mockAddChildProfile.mockResolvedValue(savedChild)
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: "parent-1" } } },
      error: null,
    })
    mockHasParentPin.mockResolvedValue(true)
    mockActivateChildMode.mockResolvedValue(undefined)
  })

  afterEach(() => {
    alertSpy.mockRestore()
    errorSpy.mockRestore()
  })

  it("contains session and PIN lookup failures instead of rejecting the press", async () => {
    const tree = await renderScreen()
    mockGetSession.mockRejectedValueOnce(new Error("session unavailable"))

    await act(async () => {
      tree.root.findByProps({ testID: "button-Start learning" }).props.onPress()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(mockActivateChildMode).not.toHaveBeenCalled()
    expect(mockRouter.replace).not.toHaveBeenCalledWith(
      expect.objectContaining({ pathname: "/child/learning" }),
    )
    expect(alertSpy).toHaveBeenCalledWith(
      "Could not start child mode",
      expect.stringContaining("profile is safe"),
    )
    expect(errorSpy).toHaveBeenCalledWith(
      "Could not launch child mode after creating a profile:",
      expect.any(Error),
    )

    act(() => tree.unmount())
  })

  it("ignores duplicate Start learning presses during the secure handoff", async () => {
    const activation = deferred<void>()
    mockActivateChildMode.mockReturnValueOnce(activation.promise)
    const tree = await renderScreen()
    const startButton = tree.root.findByProps({
      testID: "button-Start learning",
    })

    await act(async () => {
      startButton.props.onPress()
      startButton.props.onPress()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(mockGetSession).toHaveBeenCalledTimes(1)
    expect(mockHasParentPin).toHaveBeenCalledTimes(1)
    expect(mockActivateChildMode).toHaveBeenCalledTimes(1)
    expect(mockRouter.replace).not.toHaveBeenCalledWith(
      expect.objectContaining({ pathname: "/child/learning" }),
    )

    await act(async () => {
      activation.resolve()
      await activation.promise
      await Promise.resolve()
    })

    expect(mockRouter.replace).toHaveBeenCalledWith({
      pathname: "/child/learning",
      params: { active: "child-1" },
    })

    act(() => tree.unmount())
  })
})
