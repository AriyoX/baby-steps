/* eslint-disable import/first */

import React from "react"
import renderer, { act, type ReactTestRenderer } from "react-test-renderer"
import type { ChildStreakSnapshot } from "@/lib/streakDate"

const mockUseChildStreakSnapshot = jest.fn()

jest.mock("@/context/StreakContext", () => ({
  useChildStreakSnapshot: (...args: unknown[]) => mockUseChildStreakSnapshot(...args),
}))

jest.mock("@/lib/streakRepository", () => ({
  resetChildCurrentStreak: jest.fn(),
  setChildReminderParticipation: jest.fn(),
  setChildStreakEnabled: jest.fn(),
}))

jest.mock("@/lib/notifications", () => ({
  syncRecurringRemindersIfEnabled: jest.fn(),
}))

jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }))

import { ChildStreakSection } from "../ChildStreakSection"

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
    currentStreak: enabled ? 2 : 0,
    longestStreak: 5,
    todayComplete: false,
    lastQualifiedDate: null,
    lastSevenDays: Array.from({ length: 7 }, (_, index) => ({
      localDate: `2026-07-${String(13 + index).padStart(2, "0")}`,
      completed: index < 2,
    })),
  },
  hydratedAt: null,
})

describe("ChildStreakSection rendered states", () => {
  let tree: ReactTestRenderer | null = null

  afterEach(() => {
    act(() => tree?.unmount())
    tree = null
  })

  it("renders a calm historical-only presentation while streaks are disabled", () => {
    mockUseChildStreakSnapshot.mockReturnValue({
      snapshot: snapshot(false),
      loading: false,
      refresh: jest.fn(),
    })

    act(() => {
      tree = renderer.create(<ChildStreakSection childId="child-1" />)
    })
    const rendered = JSON.stringify(tree!.toJSON())

    expect(tree!.root.findByProps({ testID: "historical-streak-stats" })).toBeTruthy()
    expect(rendered).toContain("Learning streaks are off")
    expect(rendered).toContain("Learning can continue without a daily streak counter.")
    expect(rendered).toContain("Historical best")
    expect(rendered).not.toContain("Current streak")
    expect(rendered).not.toContain("Last seven days")
    expect(rendered).not.toContain("Include in learning reminders")
    expect(rendered).not.toContain("incomplete")
    expect(rendered).not.toContain("failed")
  })

  it("retains the active streak, seven-day history, and reminder controls when enabled", () => {
    mockUseChildStreakSnapshot.mockReturnValue({
      snapshot: snapshot(true),
      loading: false,
      refresh: jest.fn(),
    })

    act(() => {
      tree = renderer.create(<ChildStreakSection childId="child-1" />)
    })
    const rendered = JSON.stringify(tree!.toJSON())

    expect(tree!.root.findByProps({ testID: "active-streak-stats" })).toBeTruthy()
    expect(rendered).toContain("Current streak")
    expect(rendered).toContain("Last seven days")
    expect(rendered).toContain("Include in learning reminders")
  })
})
