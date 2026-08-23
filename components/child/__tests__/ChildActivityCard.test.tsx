import React from "react"
import renderer, { act } from "react-test-renderer"

import { ChildActivityCard } from "../ChildActivityCard"

jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }))
jest.mock("@/components/common/CachedImage", () => ({
  CachedImage: "CachedImage",
}))
jest.mock("@/content/contentRepository", () => ({
  resolveImageSource: (source: string) => source,
}))

const card = {
  description: "Card matching",
  id: "cards",
  targetPage: "child/games/cardgame",
  title: "Okugatta Kaadi",
}

const renderCard = (showDescription: boolean) => {
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(
      <ChildActivityCard
        card={card}
        cardGap={16}
        cardHeight={180}
        cardWidth={230}
        imageHeight={108}
        onPress={jest.fn()}
        showDescription={showDescription}
        textHeight={72}
      />,
    )
  })
  return tree
}

const displayedDescriptionCount = (tree: renderer.ReactTestRenderer): number =>
  tree.root.findAll((node) => node.props.children === card.description).length

describe("ChildActivityCard descriptions", () => {
  it("shows the short game type when requested", () => {
    const tree = renderCard(true)

    expect(displayedDescriptionCount(tree)).toBeGreaterThan(0)
    act(() => tree.unmount())
  })

  it("keeps descriptions out of card sections that do not request them", () => {
    const tree = renderCard(false)

    expect(displayedDescriptionCount(tree)).toBe(0)
    expect(tree.root.findByProps({ accessibilityRole: "button" }).props.accessibilityLabel)
      .toContain("Card matching")
    act(() => tree.unmount())
  })
})
