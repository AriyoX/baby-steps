import React from "react"
import { StyleSheet, TouchableOpacity } from "react-native"
import renderer, { act } from "react-test-renderer"

import {
  buildCountingLevelChoices,
  CountingLevelSelector,
  getCountingLevelGridMetrics,
} from "../CountingLevelSelector"

jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }))

describe("counting level selection", () => {
  it("preserves completed, current, available, and locked progression states", () => {
    expect(buildCountingLevelChoices({
      completedLevels: [1, 2],
      levelCount: 5,
      highestUnlockedLevel: 3,
      selectedLevel: 3,
      stageCompleted: false,
    })).toEqual([
      { level: 1, status: "review" },
      { level: 2, status: "review" },
      { level: 3, status: "current" },
      { level: 4, status: "locked" },
      { level: 5, status: "locked" },
    ])
  })

  it("uses the Legacy-style responsive two- or three-column card sizing", () => {
    expect(getCountingLevelGridMetrics(620, false)).toEqual(
      expect.objectContaining({ columnCount: 2, cardMinHeight: 132 }),
    )
    expect(getCountingLevelGridMetrics(760, true)).toEqual(
      expect.objectContaining({ columnCount: 3, cardMinHeight: 112 }),
    )
  })

  it("starts available or completed levels exactly and disables locked levels", () => {
    const onSelect = jest.fn()
    const choices = buildCountingLevelChoices({
      completedLevels: [1],
      levelCount: 3,
      highestUnlockedLevel: 2,
      selectedLevel: 2,
      stageCompleted: false,
    })
    let tree!: renderer.ReactTestRenderer
    act(() => {
      tree = renderer.create(
        <CountingLevelSelector choices={choices} onSelect={onSelect} />,
      )
    })
    const selector = tree.root.findByProps({ testID: "counting-level-selector" })
    const buttons = tree.root.findAllByType(TouchableOpacity)

    expect(selector.props.className).toContain("justify-between")
    expect(buttons).toHaveLength(3)
    expect(buttons.every((button) => StyleSheet.flatten(button.props.style).minHeight >= 112)).toBe(true)

    act(() => buttons[0].props.onPress())
    act(() => buttons[1].props.onPress())

    expect(onSelect).toHaveBeenNthCalledWith(1, 1)
    expect(onSelect).toHaveBeenNthCalledWith(2, 2)
    expect(onSelect).toHaveBeenCalledTimes(2)
    expect(buttons[2].props.accessibilityState.disabled).toBe(true)
    expect(buttons[0].props.accessibilityLabel).toContain("Review")
    expect(buttons[1].props.accessibilityLabel).toContain("Current")
    expect(buttons[2].props.accessibilityLabel).toContain("Locked")
    act(() => tree.unmount())
  })
})
