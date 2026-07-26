/* eslint-disable import/first */

import React from "react"
import renderer, { act } from "react-test-renderer"
import { AppState } from "react-native"
import type { ChildStreakSnapshot } from "@/lib/streakDate"

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
const mockGetSession = jest.fn()

jest.mock("@/context/ChildContext", () => ({
  useChild: () => ({ activeChild: mockActiveChild }),
}))

jest.mock("@/lib/streakRepository", () => ({
  cancelScheduledStreakSync: jest.fn(),
  disableChildStreak: jest.fn(),
  enableChildStreak: jest.fn(),
  getCachedChildStreak: (...args: unknown[]) => mockGetChildStreak(...args),
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
      getSession: (...args: unknown[]) => mockGetSession(...args),
    },
  },
}))

jest.mock("@/lib/notifications", () => ({
  syncRecurringRemindersIfEnabled: jest.fn().mockResolvedValue(undefined),
}))

import { StreakProvider, useChildStreakSnapshot } from "../StreakContext"

const snapshot = (childId: string, enabled: boolean): ChildStreakSnapshot => ({
  persistenceProtocolVersion: 1,
  accountId: "parent-1",
  childId,
  preferences: {
    childId,
    streakEnabled: enabled,
    includeInReminders: true,
    currentEpochId: enabled ? `epoch-${childId}` : null,
    resetAt: "2026-07-19T08:00:00.000Z",
    updatedAt: "2026-07-19T08:00:00.000Z",
  },
  epochs: [],
  days: [],
  pendingTransitions: [],
  summary: {
    currentStreak: enabled ? 1 : 0,
    longestStreak: 1,
    todayComplete: enabled,
    lastQualifiedDate: enabled ? "2026-07-19" : null,
    lastSevenDays: [],
  },
  hydratedAt: null,
})

describe("StreakProvider civil-midnight lifecycle", () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date("2026-07-19T20:59:30.000Z"))
    mockActiveChild = { id: "child-1" }
    mockGetChildStreak.mockClear()
    mockHydrateChildStreak.mockClear()
    mockRepairStreakQueue.mockClear()
    mockSyncDirtyStreakState.mockClear()
    const verified = {
      ...snapshot("child-1", true),
      hydratedAt: "2026-07-19T20:00:00.000Z",
    }
    mockGetChildStreak.mockResolvedValue(verified)
    mockHydrateChildStreak.mockResolvedValue(verified)
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: "parent-1" } } },
    })
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

describe("useChildStreakSnapshot child isolation", () => {
  beforeEach(() => {
    mockGetChildStreak.mockReset()
    mockHydrateChildStreak.mockReset()
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: "parent-1" } } },
    })
  })

  it("never publishes Child A after the route switches to Child B", async () => {
    let resolveChildA!: (value: ChildStreakSnapshot) => void
    const childARequest = new Promise<ChildStreakSnapshot>((resolve) => {
      resolveChildA = resolve
    })
    const childB = snapshot("child-b", false)
    mockGetChildStreak.mockImplementation((childId: string) =>
      childId === "child-a" ? childARequest : Promise.resolve(childB))
    mockHydrateChildStreak.mockImplementation((childId: string) =>
      Promise.resolve(childId === "child-b" ? childB : snapshot("child-a", true)))

    const latest: { current: ReturnType<typeof useChildStreakSnapshot> | null } = {
      current: null,
    }
    const Probe = ({ childId }: { childId: string }) => {
      latest.current = useChildStreakSnapshot(childId)
      return null
    }

    let tree!: renderer.ReactTestRenderer
    await act(async () => {
      tree = renderer.create(<Probe childId="child-a" />)
      await Promise.resolve()
    })
    await act(async () => {
      tree.update(<Probe childId="child-b" />)
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(latest.current?.snapshot?.childId).toBe("child-b")
    expect(latest.current?.snapshot?.preferences.streakEnabled).toBe(false)

    await act(async () => {
      resolveChildA(snapshot("child-a", true))
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(latest.current?.snapshot?.childId).toBe("child-b")
    expect(latest.current?.snapshot?.preferences.streakEnabled).toBe(false)
    act(() => tree.unmount())
  })

  it("settles to a retryable error instead of loading forever without a session", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } })
    const latest: { current: ReturnType<typeof useChildStreakSnapshot> | null } = {
      current: null,
    }
    const Probe = () => {
      latest.current = useChildStreakSnapshot("child-a")
      return null
    }

    let tree!: renderer.ReactTestRenderer
    await act(async () => {
      tree = renderer.create(<Probe />)
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(latest.current?.loading).toBe(false)
    expect(latest.current?.snapshot).toBeNull()
    expect(latest.current?.error?.message).toContain("Sign in")
    act(() => tree.unmount())
  })

  it("does not publish an unverified enabled default when remote hydration fails", async () => {
    mockGetChildStreak.mockResolvedValue(snapshot("child-a", true))
    mockHydrateChildStreak.mockRejectedValue(new Error("permission denied"))
    const latest: { current: ReturnType<typeof useChildStreakSnapshot> | null } = {
      current: null,
    }
    const Probe = () => {
      latest.current = useChildStreakSnapshot("child-a")
      return null
    }

    let tree!: renderer.ReactTestRenderer
    await act(async () => {
      tree = renderer.create(<Probe />)
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(latest.current?.loading).toBe(false)
    expect(latest.current?.snapshot).toBeNull()
    expect(latest.current?.error?.message).toContain("permission denied")
    act(() => tree.unmount())
  })

  it("retains a verified disabled cache when a later refresh fails", async () => {
    const cachedDisabled = {
      ...snapshot("child-a", false),
      hydratedAt: "2026-07-19T07:00:00.000Z",
    }
    mockGetChildStreak.mockResolvedValue(cachedDisabled)
    mockHydrateChildStreak.mockRejectedValue(new Error("offline"))
    const latest: { current: ReturnType<typeof useChildStreakSnapshot> | null } = {
      current: null,
    }
    const Probe = () => {
      latest.current = useChildStreakSnapshot("child-a")
      return null
    }

    let tree!: renderer.ReactTestRenderer
    await act(async () => {
      tree = renderer.create(<Probe />)
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(latest.current?.loading).toBe(false)
    expect(latest.current?.snapshot?.preferences.streakEnabled).toBe(false)
    expect(latest.current?.error?.message).toContain("offline")
    act(() => tree.unmount())
  })
})
