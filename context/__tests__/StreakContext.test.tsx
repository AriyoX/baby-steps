/* eslint-disable import/first */

import React from "react"
import renderer, { act } from "react-test-renderer"
import { AppState } from "react-native"

let mockActiveChild: { id: string } | null = { id: "child-1" }
const mockGetChildStreak = jest.fn().mockResolvedValue(null)
const mockHydrateChildStreak = jest.fn().mockResolvedValue(null)
const mockRepairStreakQueue = jest.fn().mockResolvedValue(0)
const mockSyncDirtyStreakState = jest.fn().mockResolvedValue({
  pushed: 0,
  rejected: 0,
  failed: 0,
  skipped: 0,
})

jest.mock("@/context/ChildContext", () => ({
  useChild: () => ({ activeChild: mockActiveChild }),
}))

jest.mock("@/lib/streakRepository", () => ({
  cancelScheduledStreakSync: jest.fn(),
  disableChildStreak: jest.fn(),
  enableChildStreak: jest.fn(),
  getChildStreak: (...args: unknown[]) => mockGetChildStreak(...args),
  hydrateChildStreak: (...args: unknown[]) => mockHydrateChildStreak(...args),
  repairStreakQueue: (...args: unknown[]) => mockRepairStreakQueue(...args),
  resetChildCurrentStreak: jest.fn(),
  setChildReminderParticipation: jest.fn(),
  subscribeToChildStreak: jest.fn(() => jest.fn()),
  subscribeToStreakCelebrations: jest.fn(() => jest.fn()),
  syncDirtyStreakState: (...args: unknown[]) => mockSyncDirtyStreakState(...args),
}))

jest.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { session: { user: { id: "parent-1" } } },
      }),
    },
  },
}))

jest.mock("@/lib/notifications", () => ({
  syncRecurringRemindersIfEnabled: jest.fn().mockResolvedValue(undefined),
}))

import { StreakProvider } from "../StreakContext"

describe("StreakProvider civil-midnight lifecycle", () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date("2026-07-19T20:59:30.000Z"))
    mockActiveChild = { id: "child-1" }
    mockGetChildStreak.mockClear()
    mockHydrateChildStreak.mockClear()
    mockRepairStreakQueue.mockClear()
    mockSyncDirtyStreakState.mockClear()
  })

  afterEach(() => {
    jest.restoreAllMocks()
    jest.useRealTimers()
  })

  it("refreshes at the next local midnight and on resume, then clears on sign-out", async () => {
    let onAppStateChange: ((state: string) => void) | null = null
    jest.spyOn(AppState, "addEventListener").mockImplementation((event, listener) => {
      if (event === "change") onAppStateChange = listener as (state: string) => void
      return { remove: jest.fn() }
    })
    let tree!: renderer.ReactTestRenderer
    await act(async () => {
      tree = renderer.create(<StreakProvider><></></StreakProvider>)
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    const initialHydrations = mockHydrateChildStreak.mock.calls.length
    expect(initialHydrations).toBeGreaterThan(0)
    const now = new Date()
    const nextMidnight = new Date(now)
    nextMidnight.setDate(nextMidnight.getDate() + 1)
    nextMidnight.setHours(0, 0, 0, 0)

    await act(async () => {
      jest.advanceTimersByTime(nextMidnight.getTime() - now.getTime() + 1)
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(mockHydrateChildStreak.mock.calls.length).toBeGreaterThan(initialHydrations)

    const afterMidnight = mockHydrateChildStreak.mock.calls.length
    await act(async () => {
      onAppStateChange?.("active")
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(mockHydrateChildStreak.mock.calls.length).toBeGreaterThan(afterMidnight)

    mockActiveChild = null
    act(() => tree.update(<StreakProvider><></></StreakProvider>))
    const afterSignOut = mockHydrateChildStreak.mock.calls.length
    await act(async () => {
      jest.advanceTimersByTime(25 * 60 * 60 * 1_000)
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(mockHydrateChildStreak).toHaveBeenCalledTimes(afterSignOut)
    act(() => tree.unmount())
  })
})
