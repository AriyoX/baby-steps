/* eslint-disable import/first */

import React from "react"
import renderer, { act } from "react-test-renderer"
import type { ChildStreakSnapshot } from "@/lib/streakDate"

jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }))

import { ChildHeaderStreak } from "../ChildHeaderStreak"

const snapshot = (enabled: boolean): ChildStreakSnapshot => ({
  persistenceProtocolVersion: 1,
  accountId: "parent-1",
  childId: "child-1",
  preferences: {
    childId: "child-1",
    streakEnabled: enabled,
    includeInReminders: true,
    currentEpochId: enabled ? "epoch-1" : null,
    resetAt: "2026-07-19T08:00:00.000Z",
    updatedAt: "2026-07-19T08:00:00.000Z",
  },
  epochs: [],
  days: [],
  pendingTransitions: [],
  summary: {
    currentStreak: enabled ? 4 : 0,
    longestStreak: 7,
    todayComplete: false,
    lastQualifiedDate: null,
    lastSevenDays: [],
  },
  hydratedAt: null,
})

describe("ChildHeaderStreak", () => {
  it("renders the active enabled child's flame", () => {
    let tree!: renderer.ReactTestRenderer
    act(() => {
      tree = renderer.create(
        <ChildHeaderStreak
          activeChildId="child-1"
          accessibilityLabel="4-day learning streak"
          isLoading={false}
          snapshot={snapshot(true)}
        />,
      )
    })

    expect(tree.root.findByProps({ testID: "child-header-streak" })).toBeTruthy()
    expect(JSON.stringify(tree.toJSON())).toContain("4")
    act(() => tree.unmount())
  })

  it.each([
    ["disabled", snapshot(false), "child-1", false],
    ["another child", snapshot(true), "child-2", false],
    ["loading", snapshot(true), "child-1", true],
  ])("hides the flame while %s", (_label, value, activeChildId, isLoading) => {
    let tree!: renderer.ReactTestRenderer
    act(() => {
      tree = renderer.create(
        <ChildHeaderStreak
          activeChildId={activeChildId}
          accessibilityLabel="learning streak"
          isLoading={isLoading}
          snapshot={value}
        />,
      )
    })

    expect(tree.toJSON()).toBeNull()
    act(() => tree.unmount())
  })
})
