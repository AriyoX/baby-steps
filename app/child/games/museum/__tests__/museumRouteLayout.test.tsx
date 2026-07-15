/* eslint-disable @typescript-eslint/no-require-imports */
import React from "react"
import { Text } from "react-native"
import renderer, { act } from "react-test-renderer"

import type {
  ChildMenuCard,
  ContentBundle,
} from "@/content/contentRepository"
import MuseumRouteLayout, { hasExactMuseumContent } from "../_layout"

let mockActiveChild: { id: string; selected_language_code: string } | null = null
const mockLoadContentBundle = jest.fn()

jest.mock("@/context/ChildContext", () => ({
  useChild: () => ({ activeChild: mockActiveChild }),
}))

jest.mock("@/content/contentRepository", () => ({
  loadContentBundle: (...args: unknown[]) => mockLoadContentBundle(...args),
}))

jest.mock("expo-router", () => {
  const ReactNative = require("react-native")
  return {
    Slot: () => <ReactNative.Text>Museum mechanics</ReactNative.Text>,
  }
})

jest.mock("@/components/child/ComingSoonState", () => {
  const ReactNative = require("react-native")
  return {
    ComingSoonState: ({
      title,
      message,
      onRetry,
    }: {
      title: string
      message: string
      onRetry?: () => void
    }) => (
      <>
        <ReactNative.Text>{title}</ReactNative.Text>
        <ReactNative.Text>{message}</ReactNative.Text>
        {onRetry ? (
          <ReactNative.TouchableOpacity
            accessibilityLabel="Retry loading content"
            onPress={onRetry}
          >
            <ReactNative.Text>Try again</ReactNative.Text>
          </ReactNative.TouchableOpacity>
        ) : null}
      </>
    ),
  }
})

const museumCard = (): ChildMenuCard => ({
  id: "artifacts",
  order: 1,
  title: "Artifacts",
  description: "Explore cultural artifacts",
  targetPage: "child/games/museum/ArtifactsScreen",
})

const contentBundle = (
  languageCode: string,
  museumCards: ChildMenuCard[],
): ContentBundle => ({
  languageCode,
  source: "database",
  contentVersion: "test-version",
  menuCardsByTab: museumCards.length > 0 ? { museum: museumCards } : {},
  learningGame: { title: "", stages: [] },
  wordGame: { title: "", levels: [] },
  countingGame: {
    title: "",
    stages: [],
    numbers: [],
    culturalItems: [],
    currency: [],
  },
  cardGame: { title: "", items: [] },
  puzzleGame: { title: "", puzzles: [] },
  stories: [],
})

const renderedText = (tree: renderer.ReactTestRenderer): string =>
  tree.root
    .findAllByType(Text)
    .map((node) => node.props.children)
    .flat(Infinity)
    .join(" ")

const renderLayout = async () => {
  let tree!: renderer.ReactTestRenderer
  await act(async () => {
    tree = renderer.create(<MuseumRouteLayout />)
    await Promise.resolve()
  })
  return tree
}

describe("MuseumRouteLayout", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockActiveChild = { id: "child-1", selected_language_code: "lg" }
  })

  it("renders archived routes only for a non-empty exact-language museum menu", async () => {
    const bundle = contentBundle("lg", [museumCard()])
    mockLoadContentBundle.mockResolvedValue({
      languageCode: "lg",
      source: "database",
      bundle,
    })

    const tree = await renderLayout()

    expect(mockLoadContentBundle).toHaveBeenCalledWith("lg", {
      forceRefresh: false,
    })
    expect(renderedText(tree)).toContain("Museum mechanics")
  })

  it("does not expose Luganda museum routes to a Runyankole child", async () => {
    mockActiveChild = { id: "child-1", selected_language_code: "nyn" }
    mockLoadContentBundle.mockResolvedValue({
      languageCode: "lg",
      source: "database",
      bundle: contentBundle("lg", [museumCard()]),
    })

    const tree = await renderLayout()

    expect(mockLoadContentBundle).toHaveBeenCalledWith("nyn", {
      forceRefresh: false,
    })
    expect(renderedText(tree)).toContain("not available")
    expect(renderedText(tree)).not.toContain("Museum mechanics")
  })

  it("keeps an empty or removed museum menu unavailable", () => {
    expect(hasExactMuseumContent(contentBundle("lg", []), "lg")).toBe(false)
    expect(
      hasExactMuseumContent(contentBundle("lg", [museumCard()]), "nyn"),
    ).toBe(false)
  })

  it("force-refreshes the same language on retry", async () => {
    mockLoadContentBundle
      .mockResolvedValueOnce({
        languageCode: "lg",
        source: "empty",
        missingReason: "offline",
      })
      .mockResolvedValueOnce({
        languageCode: "lg",
        source: "database",
        bundle: contentBundle("lg", [museumCard()]),
      })

    const tree = await renderLayout()
    const retry = tree.root.findByProps({
      accessibilityLabel: "Retry loading content",
    })

    await act(async () => {
      retry.props.onPress()
      await Promise.resolve()
    })

    expect(mockLoadContentBundle).toHaveBeenNthCalledWith(2, "lg", {
      forceRefresh: true,
    })
    expect(renderedText(tree)).toContain("Museum mechanics")
  })
})
