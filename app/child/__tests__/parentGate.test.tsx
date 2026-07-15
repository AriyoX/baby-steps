import React from "react"
import renderer, { act, type ReactTestInstance } from "react-test-renderer"

const mockReplace = jest.fn()
const mockBack = jest.fn()
const mockSetActiveChild = jest.fn()
const mockGenerateChallenge = jest.fn(() => ({
  kind: "addition" as const,
  expression: "6 + 2 = ?",
  answer: 8,
}))

jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace, back: mockBack }),
}))

jest.mock("expo-status-bar", () => ({ StatusBar: () => null }))

jest.mock("react-native-safe-area-context", () => {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const ReactInMock = require("react")
  const { View: ViewInMock } = require("react-native")
  /* eslint-enable @typescript-eslint/no-require-imports */
  return {
    SafeAreaView: ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactInMock.createElement(ViewInMock, props, children),
  }
})

jest.mock("@expo/vector-icons", () => ({ Ionicons: () => null }))

jest.mock("@/components/StyledText", () => ({
  /* eslint-disable-next-line @typescript-eslint/no-require-imports */
  Text: require("react-native").Text,
}))
jest.mock("@/components/translated-text", () => ({
  /* eslint-disable-next-line @typescript-eslint/no-require-imports */
  TranslatedText: require("react-native").Text,
}))

jest.mock("@/context/ChildContext", () => ({
  useChild: () => ({ setActiveChild: mockSetActiveChild }),
}))

jest.mock("@/lib/parentGateChallenge", () => ({
  generateParentGateChallenge: mockGenerateChallenge,
  isCorrectParentGateAnswer: (
    challenge: { answer: number },
    input: string,
  ) => Number(input) === challenge.answer,
}))

/* eslint-disable @typescript-eslint/no-require-imports */
const ParentGate = require("../parent-gate").default
/* eslint-enable @typescript-eslint/no-require-imports */

const findByLabel = (root: ReactTestInstance, label: string) =>
  root.find((node) => node.props.accessibilityLabel === label)

describe("ParentGate", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("clears child mode and opens the parent dashboard after a correct answer", () => {
    let tree!: renderer.ReactTestRenderer
    act(() => {
      tree = renderer.create(<ParentGate />)
    })

    act(() => findByLabel(tree.root, "Enter 8").props.onPress())
    act(() => findByLabel(tree.root, "Check answer").props.onPress())

    expect(mockSetActiveChild).toHaveBeenCalledWith(null)
    expect(mockReplace).toHaveBeenCalledWith("/parent")
  })

  it("creates a fresh puzzle and stays in the gate after a wrong answer", () => {
    let tree!: renderer.ReactTestRenderer
    act(() => {
      tree = renderer.create(<ParentGate />)
    })

    act(() => findByLabel(tree.root, "Enter 7").props.onPress())
    act(() => findByLabel(tree.root, "Check answer").props.onPress())

    expect(mockGenerateChallenge).toHaveBeenCalledTimes(2)
    expect(mockSetActiveChild).not.toHaveBeenCalled()
    expect(mockReplace).not.toHaveBeenCalled()
    expect(JSON.stringify(tree.toJSON())).toContain("fresh puzzle")
  })
})
