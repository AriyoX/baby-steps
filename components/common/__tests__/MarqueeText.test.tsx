import React from "react"
import { Animated, ScrollView, View } from "react-native"
import renderer, { act } from "react-test-renderer"

import { MarqueeText } from "../MarqueeText"

jest.mock("@/hooks/useReducedMotion", () => ({
  useReducedMotion: () => false,
}))

const layoutEvent = (width: number) => ({
  nativeEvent: {
    layout: { height: 20, width, x: 0, y: 0 },
  },
})

describe("MarqueeText", () => {
  it("starts native scrolling when content width overflows", () => {
    jest.useFakeTimers()
    const loopSpy = jest.spyOn(Animated, "loop")
    let tree: renderer.ReactTestRenderer

    act(() => {
      tree = renderer.create(<MarqueeText>Long translated label</MarqueeText>)
    })

    const container = tree!.root.findAllByType(View)[0]
    const viewport = tree!.root.findByType(ScrollView)

    act(() => {
      container.props.onLayout(layoutEvent(100))
      viewport.props.onContentSizeChange(180, 20)
    })

    expect(loopSpy).toHaveBeenCalled()

    act(() => tree!.unmount())
    loopSpy.mockRestore()
    jest.useRealTimers()
  })
})
