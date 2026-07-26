/* eslint-disable import/first, @typescript-eslint/no-require-imports */

const mockGetSession = jest.fn()
const mockRpc = jest.fn()
const mockFrom = jest.fn()

jest.mock("@/lib/supabase", () => ({
  supabase: {
    auth: { getSession: (...args: unknown[]) => mockGetSession(...args) },
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}))

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
)

import AsyncStorage from "@react-native-async-storage/async-storage"
import {
  cancelScheduledStreakSync,
  clearStreakMemory,
  disableChildStreak,
  enableChildStreak,
  getChildStreak,
  getLearningReminderCandidates,
  getPendingStreakSyncCount,
  getStreakQueueStorageKey,
  getStreakStorageKeys,
  hydrateChildStreak,
  repairStreakQueue,
  recordQualifiedStreakActivity,
  resetChildCurrentStreak,
  setStreakPersistenceFailureInjectorForTests,
  setChildReminderParticipation,
  subscribeToStreakCelebrations,
  syncDirtyStreakState,
} from "../streakRepository"

let accountId: string | null = "parent-1"

const completion = (
  completionId: string,
  completedAt = "2026-07-19T09:00:00.000Z",
) =>
  recordQualifiedStreakActivity({
    childId: "child-1",
    sourceType: "game",
    sourceId: "counting-stage-1",
    completionId,
    completedAt,
  })

const createRemoteQuery = (read: () => { data: unknown; error: unknown }) => {
  const query: Record<string, unknown> = {}
  const chain = jest.fn(() => query)
  const resolve = () => Promise.resolve(read())
  query.select = chain
  query.eq = chain
  query.order = chain
  query.maybeSingle = jest.fn(resolve)
  query.then = (onFulfilled: (value: unknown) => unknown, onRejected?: (reason: unknown) => unknown) =>
    resolve().then(onFulfilled, onRejected)
  return query
}

describe("local-first child streak repository", () => {
  beforeEach(async () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date("2026-07-19T08:00:00.000Z"))
    accountId = "parent-1"
    mockGetSession.mockReset()
    mockGetSession.mockImplementation(async () => ({
      data: accountId ? { session: { user: { id: accountId } } } : { session: null },
    }))
    mockRpc.mockReset()
    mockFrom.mockReset()
    cancelScheduledStreakSync()
    clearStreakMemory()
    await AsyncStorage.clear()
  })

  afterEach(() => {
    setStreakPersistenceFailureInjectorForTests(null)
    cancelScheduledStreakSync()
    clearStreakMemory()
    jest.useRealTimers()
  })

  it("creates enabled defaults locally and scopes storage by account and child", async () => {
    const first = await getChildStreak("child-1")
    const sibling = await getChildStreak("child-2")
    accountId = "parent-2"
    const otherAccount = await getChildStreak("child-1")

    expect(first?.preferences.streakEnabled).toBe(true)
    expect(first?.preferences.includeInReminders).toBe(true)
    expect(first?.preferences.currentEpochId).toBeTruthy()
    expect(first?.epochs).toHaveLength(1)
    expect(sibling?.accountId).toBe("parent-1")
    expect(otherAccount?.accountId).toBe("parent-2")
    expect(getStreakStorageKeys("parent-1", "child-1").days).not.toBe(
      getStreakStorageKeys("parent-2", "child-1").days,
    )
    expect(await getPendingStreakSyncCount("parent-1")).toBe(2)
    expect(await getPendingStreakSyncCount("parent-2")).toBe(1)
  })

  it("keeps enablement and reminder participation separate for sibling children", async () => {
    await getChildStreak("child-1")
    await getChildStreak("child-2")
    await disableChildStreak("child-1", "2026-07-19T08:01:00.000Z")
    await setChildReminderParticipation("child-2", false, "2026-07-19T08:02:00.000Z")

    const childA = await getChildStreak("child-1")
    const childB = await getChildStreak("child-2")

    expect(childA?.preferences.streakEnabled).toBe(false)
    expect(childA?.preferences.includeInReminders).toBe(true)
    expect(childB?.preferences.streakEnabled).toBe(true)
    expect(childB?.preferences.includeInReminders).toBe(false)
    expect(getStreakStorageKeys("parent-1", "child-1").preferences).not.toBe(
      getStreakStorageKeys("parent-1", "child-2").preferences,
    )
  })

  it("reconstructs a three-day remote streak on a device without a local cache", async () => {
    const remotePreferences = {
      child_id: "child-1",
      streak_enabled: true,
      include_in_reminders: true,
      current_epoch_id: "remote-epoch",
      reset_at: null,
      updated_at: "2026-07-19T07:00:00.000Z",
    }
    const remoteEpochs = [{
      id: "remote-epoch",
      child_id: "child-1",
      started_at: "2026-07-01T00:00:00.000Z",
      ended_at: null,
      end_reason: null,
      updated_at: "2026-07-01T00:00:00.000Z",
    }]
    const remoteDays = ["2026-07-17", "2026-07-18", "2026-07-19"].map((localDate) => ({
      id: `day-${localDate}`,
      child_id: "child-1",
      streak_epoch_id: "remote-epoch",
      local_date: localDate,
      first_completed_at: `${localDate}T09:00:00.000Z`,
      first_timezone: "UTC",
      last_completed_at: `${localDate}T09:00:00.000Z`,
      last_timezone: "UTC",
      source_type: "learning_hub",
      source_ref: "lesson",
      updated_at: `${localDate}T09:00:00.000Z`,
    }))
    mockFrom.mockImplementation((table: string) => {
      if (table === "child_streak_preferences") {
        return createRemoteQuery(() => ({ data: remotePreferences, error: null }))
      }
      if (table === "child_streak_epochs") {
        return createRemoteQuery(() => ({ data: remoteEpochs, error: null }))
      }
      return createRemoteQuery(() => ({ data: remoteDays, error: null }))
    })

    const [hydrated, duplicateHydration] = await Promise.all([
      hydrateChildStreak("child-1"),
      hydrateChildStreak("child-1"),
    ])

    expect(hydrated?.preferences.currentEpochId).toBe("remote-epoch")
    expect(duplicateHydration).toEqual(hydrated)
    expect(mockFrom).toHaveBeenCalledTimes(3)
    expect(hydrated?.summary.currentStreak).toBe(3)
    expect(hydrated?.summary.longestStreak).toBe(3)
    expect(hydrated?.summary.todayComplete).toBe(true)
  })

  it("uses the authoritative disabled preference on a device without a local cache", async () => {
    const remotePreferences = {
      child_id: "child-1",
      streak_enabled: false,
      include_in_reminders: true,
      current_epoch_id: null,
      reset_at: "2026-07-18T16:00:00.000Z",
      updated_at: "2026-07-18T16:00:00.000Z",
    }
    const remoteEpochs = [{
      id: "closed-epoch",
      child_id: "child-1",
      started_at: "2026-07-01T00:00:00.000Z",
      ended_at: "2026-07-18T16:00:00.000Z",
      end_reason: "disabled",
      updated_at: "2026-07-18T16:00:00.000Z",
    }]
    mockFrom.mockImplementation((table: string) => {
      if (table === "child_streak_preferences") {
        return createRemoteQuery(() => ({ data: remotePreferences, error: null }))
      }
      if (table === "child_streak_epochs") {
        return createRemoteQuery(() => ({ data: remoteEpochs, error: null }))
      }
      return createRemoteQuery(() => ({ data: [], error: null }))
    })

    const hydrated = await hydrateChildStreak("child-1", { throwOnRemoteError: true })

    expect(hydrated?.preferences.streakEnabled).toBe(false)
    expect(hydrated?.preferences.currentEpochId).toBeNull()
    expect(hydrated?.summary.currentStreak).toBe(0)
    expect(hydrated?.hydratedAt).toBeTruthy()
    expect(await getPendingStreakSyncCount("parent-1")).toBe(0)
  })

  it("does not fabricate an enabled preference when first remote hydration fails", async () => {
    const warning = jest.spyOn(console, "warn").mockImplementation(() => undefined)
    mockFrom.mockImplementation(() => createRemoteQuery(() => ({
      data: null,
      error: new Error("permission denied"),
    })))

    await expect(
      hydrateChildStreak("child-1", { throwOnRemoteError: true }),
    ).rejects.toThrow("permission denied")

    expect(await AsyncStorage.getItem(getStreakStorageKeys("parent-1", "child-1").snapshot))
      .toBeNull()
    expect(await getPendingStreakSyncCount("parent-1")).toBe(0)
    warning.mockRestore()
  })

  it("recovers from a malformed child cache without leaking or crashing", async () => {
    const warning = jest.spyOn(console, "warn").mockImplementation(() => undefined)
    const keys = getStreakStorageKeys("parent-1", "child-1")
    await AsyncStorage.setItem(keys.preferences, "{not-json")

    const recovered = await getChildStreak("child-1")
    warning.mockRestore()

    expect(recovered?.accountId).toBe("parent-1")
    expect(recovered?.childId).toBe("child-1")
    expect(recovered?.preferences.streakEnabled).toBe(true)
    expect(recovered?.epochs).toHaveLength(1)
  })

  it("records one day per epoch, deduplicates completion receipts, and celebrates once", async () => {
    const celebrations: unknown[] = []
    const unsubscribe = subscribeToStreakCelebrations((event) => celebrations.push(event))

    const first = await completion("counting:session-1")
    const duplicate = await completion("counting:session-1")
    const secondActivity = await completion("story:session-2", "2026-07-19T10:00:00.000Z")
    unsubscribe()

    expect(first.recorded).toBe(true)
    expect(first.firstLocalQualification).toBe(true)
    expect(duplicate).toEqual(expect.objectContaining({
      recorded: false,
      firstLocalQualification: false,
      reason: "duplicate",
    }))
    expect(secondActivity.recorded).toBe(true)
    expect(secondActivity.firstLocalQualification).toBe(false)
    expect(secondActivity.snapshot?.days).toHaveLength(1)
    expect(secondActivity.snapshot?.days[0].firstCompletedAt).toBe("2026-07-19T09:00:00.000Z")
    expect(secondActivity.snapshot?.days[0].lastCompletedAt).toBe("2026-07-19T10:00:00.000Z")
    expect(secondActivity.snapshot?.summary.currentStreak).toBe(1)
    expect(celebrations).toHaveLength(1)
  })

  it("uses explicit epoch boundaries for disable, re-enable, and same-day reset", async () => {
    await completion("before-disable", "2026-07-19T08:01:00.000Z")
    const disabled = await disableChildStreak("child-1", "2026-07-19T08:02:00.000Z")
    const ignored = await completion("while-disabled", "2026-07-19T08:03:00.000Z")
    const enabled = await enableChildStreak("child-1", "2026-07-19T08:04:00.000Z")
    const afterEnable = await completion("after-enable", "2026-07-19T08:05:00.000Z")
    const reset = await resetChildCurrentStreak("child-1", "2026-07-19T08:06:00.000Z")
    const afterReset = await completion("after-reset", "2026-07-19T08:07:00.000Z")

    expect(disabled?.preferences.currentEpochId).toBeNull()
    expect(ignored.reason).toBe("disabled")
    expect(enabled?.preferences.currentEpochId).not.toBe(disabled?.preferences.currentEpochId)
    expect(afterEnable.snapshot?.summary.currentStreak).toBe(1)
    expect(reset?.summary.currentStreak).toBe(0)
    expect(afterReset.snapshot?.epochs).toHaveLength(3)
    expect(afterReset.snapshot?.days).toHaveLength(3)
    expect(afterReset.snapshot?.summary.currentStreak).toBe(1)
    expect(afterReset.snapshot?.summary.longestStreak).toBe(1)
  })

  it("keeps local transition boundaries monotonic before server reconciliation", async () => {
    await getChildStreak("child-1")
    const disabled = await disableChildStreak("child-1", "2026-07-19T08:20:00.000Z")
    const olderEnable = await enableChildStreak("child-1", "2026-07-19T08:10:00.000Z")
    const enabled = await enableChildStreak("child-1", "2026-07-19T08:30:00.000Z")
    const olderDisable = await disableChildStreak("child-1", "2026-07-19T08:25:00.000Z")
    const reset = await resetChildCurrentStreak("child-1", "2026-07-19T08:40:00.000Z")
    const equalConflict = await disableChildStreak("child-1", "2026-07-19T08:40:00.000Z")

    expect(disabled?.preferences.streakEnabled).toBe(false)
    expect(olderEnable?.preferences.streakEnabled).toBe(false)
    expect(enabled?.preferences.streakEnabled).toBe(true)
    expect(olderDisable?.preferences.streakEnabled).toBe(true)
    expect(reset?.preferences.resetAt).toBe("2026-07-19T08:40:00.000Z")
    expect(equalConflict?.preferences.streakEnabled).toBe(true)
    expect(equalConflict?.preferences.currentEpochId).toBe(reset?.preferences.currentEpochId)
    expect(equalConflict?.epochs.filter((item) => item.endedAt === null)).toHaveLength(1)
  })

  it("persists reminder participation locally and retains dirty work after network failure", async () => {
    const warning = jest.spyOn(console, "warn").mockImplementation(() => undefined)
    const preferences = await setChildReminderParticipation("child-1", false)
    await completion("offline-completion")
    mockRpc.mockRejectedValue(new Error("offline"))

    const before = await getPendingStreakSyncCount("parent-1")
    const result = await syncDirtyStreakState("parent-1")
    const after = await getPendingStreakSyncCount("parent-1")
    const storedQueue = JSON.parse(
      (await AsyncStorage.getItem(getStreakQueueStorageKey("parent-1"))) ?? "[]",
    )

    expect(preferences?.preferences.includeInReminders).toBe(false)
    expect(before).toBeGreaterThan(0)
    expect(result.failed).toBeGreaterThan(0)
    expect(result.failed + result.skipped).toBe(before)
    expect(after).toBe(before)
    expect(storedQueue).toHaveLength(before)
    warning.mockRestore()
  })

  it("reports only the edited mutation while replaying older work for that child", async () => {
    const warning = jest.spyOn(console, "warn").mockImplementation(() => undefined)
    await getChildStreak("child-1")
    await disableChildStreak("child-1", "2026-07-19T08:01:00.000Z")
    await getChildStreak("child-2")
    const queuedBeforeSync = JSON.parse(
      (await AsyncStorage.getItem(getStreakQueueStorageKey("parent-1"))) ?? "[]",
    ) as { childId: string; kind: string; mutationId: string }[]
    const editedMutation = queuedBeforeSync.find((item) =>
      item.childId === "child-1" && item.kind === "set_enabled")!
    mockRpc.mockImplementation(async (name: string) => {
      if (name === "create_child_streak_state") {
        return { data: { status: "rejected", reason: "stale" }, error: null }
      }
      return { data: { status: "applied" }, error: null }
    })

    const backgroundSync = syncDirtyStreakState("parent-1", "child-1")
    const exactSync = syncDirtyStreakState(
      "parent-1",
      "child-1",
      editedMutation.mutationId,
    )
    const [backgroundResult, result] = await Promise.all([backgroundSync, exactSync])
    const remainingQueue = JSON.parse(
      (await AsyncStorage.getItem(getStreakQueueStorageKey("parent-1"))) ?? "[]",
    ) as { childId: string }[]

    expect(backgroundResult).toEqual({ pushed: 1, rejected: 1, failed: 0, skipped: 0 })
    expect(result).toEqual({ pushed: 1, rejected: 0, failed: 0, skipped: 0 })
    expect(mockRpc).toHaveBeenCalledTimes(2)
    expect(mockRpc.mock.calls.map((call) => call[1])).toEqual([
      expect.objectContaining({ p_child_id: "child-1" }),
      expect.objectContaining({ p_child_id: "child-1" }),
    ])
    expect(remainingQueue).toEqual([
      expect.objectContaining({ childId: "child-2" }),
    ])
    warning.mockRestore()
  })

  const crashOperations = [
    {
      label: "reset",
      matches: (item: Record<string, unknown>) => item.kind === "reset",
      prepare: async () => { await getChildStreak("child-1") },
      run: async () => resetChildCurrentStreak("child-1", "2026-07-19T08:10:00.000Z"),
      verify: (snapshot: Awaited<ReturnType<typeof getChildStreak>>) =>
        snapshot?.preferences.resetAt === "2026-07-19T08:10:00.000Z" &&
        snapshot.preferences.streakEnabled,
    },
    {
      label: "disable",
      matches: (item: Record<string, unknown>) => item.kind === "set_enabled" && item.enabled === false,
      prepare: async () => { await getChildStreak("child-1") },
      run: async () => disableChildStreak("child-1", "2026-07-19T08:10:00.000Z"),
      verify: (snapshot: Awaited<ReturnType<typeof getChildStreak>>) =>
        snapshot?.preferences.streakEnabled === false,
    },
    {
      label: "re-enable",
      matches: (item: Record<string, unknown>) => item.kind === "set_enabled" && item.enabled === true,
      prepare: async () => {
        await getChildStreak("child-1")
        await disableChildStreak("child-1", "2026-07-19T08:05:00.000Z")
      },
      run: async () => enableChildStreak("child-1", "2026-07-19T08:10:00.000Z"),
      verify: (snapshot: Awaited<ReturnType<typeof getChildStreak>>) =>
        snapshot?.preferences.streakEnabled === true &&
        snapshot.preferences.resetAt === "2026-07-19T08:10:00.000Z",
    },
    {
      label: "reminder participation",
      matches: (item: Record<string, unknown>) => item.kind === "set_reminders",
      prepare: async () => { await getChildStreak("child-1") },
      run: async () => setChildReminderParticipation(
        "child-1",
        false,
        "2026-07-19T08:10:00.000Z",
      ),
      verify: (snapshot: Awaited<ReturnType<typeof getChildStreak>>) =>
        snapshot?.preferences.includeInReminders === false,
    },
    {
      label: "day qualification",
      matches: (item: Record<string, unknown>) => item.kind === "day",
      prepare: async () => { await getChildStreak("child-1") },
      run: async () => completion("failure-window", "2026-07-19T09:00:00.000Z"),
      verify: (snapshot: Awaited<ReturnType<typeof getChildStreak>>) =>
        snapshot?.summary.todayComplete === true,
    },
  ]

  const commonCrashSteps = [
    "queue:before",
    "queue:after",
    "snapshot:before-canonical",
    "snapshot:after-canonical",
    "snapshot:after-projections",
  ] as const

  describe.each(crashOperations)("$label crash recovery", (operation) => {
    const steps = operation.label === "day qualification"
      ? [...commonCrashSteps, "receipt:before", "receipt:after"] as const
      : commonCrashSteps

    it.each(steps)("recovers the %s persistence window", async (failureStep) => {
      await operation.prepare()
      const beforeQueue = JSON.parse(
        (await AsyncStorage.getItem(getStreakQueueStorageKey("parent-1"))) ?? "[]",
      ) as Record<string, unknown>[]
      let failed = false
      setStreakPersistenceFailureInjectorForTests((step) => {
        if (!failed && step === failureStep) {
          failed = true
          throw new Error(`injected ${failureStep}`)
        }
      })

      await expect(operation.run()).rejects.toThrow(`injected ${failureStep}`)
      setStreakPersistenceFailureInjectorForTests(null)

      if (failureStep === "queue:before") {
        const queue = JSON.parse(
          (await AsyncStorage.getItem(getStreakQueueStorageKey("parent-1"))) ?? "[]",
        ) as Record<string, unknown>[]
        expect(queue).toHaveLength(beforeQueue.length)
        await expect(operation.run()).resolves.toBeTruthy()
        return
      }

      const persistedQueue = JSON.parse(
        (await AsyncStorage.getItem(getStreakQueueStorageKey("parent-1"))) ?? "[]",
      ) as Record<string, unknown>[]
      const persistedMutation = persistedQueue.find(operation.matches)
      expect(persistedMutation).toBeTruthy()
      const stableMutationId = persistedMutation!.mutationId

      clearStreakMemory()
      await repairStreakQueue("parent-1")
      const repairedQueue = JSON.parse(
        (await AsyncStorage.getItem(getStreakQueueStorageKey("parent-1"))) ?? "[]",
      ) as Record<string, unknown>[]
      expect(repairedQueue.find(operation.matches)?.mutationId).toBe(stableMutationId)
      expect(operation.verify(await getChildStreak("child-1"))).toBe(true)
    })
  })

  it("uses cached children and today's local qualification when remote reminder revalidation fails", async () => {
    const warning = jest.spyOn(console, "warn").mockImplementation(() => undefined)
    await getChildStreak("child-1")
    await completion("offline-today", "2026-07-19T09:00:00.000Z")
    await getChildStreak("child-2")
    mockFrom.mockImplementation(() => {
      throw new Error("offline")
    })

    const candidates = await getLearningReminderCandidates("parent-1")
    warning.mockRestore()

    expect(candidates).toEqual(expect.arrayContaining([
      expect.objectContaining({ childId: "child-1", completedToday: true }),
      expect.objectContaining({ childId: "child-2", completedToday: false }),
    ]))
  })

  it("reconciles a stale transition response and does not retry its queued mutation", async () => {
    const initial = await getChildStreak("child-1")
    const epochId = initial!.preferences.currentEpochId!
    const keys = getStreakStorageKeys("parent-1", "child-1")
    const canonical = JSON.parse((await AsyncStorage.getItem(keys.snapshot))!)
    canonical.pendingTransitions = []
    await AsyncStorage.setItem(keys.snapshot, JSON.stringify(canonical))
    await AsyncStorage.setItem(getStreakQueueStorageKey("parent-1"), "[]")
    clearStreakMemory()
    await disableChildStreak("child-1", "2026-07-19T08:10:00.000Z")
    const authoritativePreferences = {
      child_id: "child-1",
      streak_enabled: true,
      include_in_reminders: true,
      current_epoch_id: epochId,
      reset_at: "2026-07-19T08:20:00.000Z",
      updated_at: "2026-07-19T08:20:01.000Z",
    }
    const authoritativeEpoch = {
      id: epochId,
      child_id: "child-1",
      started_at: initial!.epochs[0].startedAt,
      ended_at: null,
      end_reason: null,
      updated_at: "2026-07-19T08:20:01.000Z",
    }
    mockRpc.mockResolvedValue({
      data: {
        status: "stale",
        reason: "occurred_before_reset_at",
        preferences: authoritativePreferences,
        current_epoch: authoritativeEpoch,
        affected_epoch: authoritativeEpoch,
      },
      error: null,
    })
    mockFrom.mockImplementation((table: string) => {
      if (table === "child_streak_preferences") {
        return createRemoteQuery(() => ({ data: authoritativePreferences, error: null }))
      }
      if (table === "child_streak_epochs") {
        return createRemoteQuery(() => ({ data: [authoritativeEpoch], error: null }))
      }
      return createRemoteQuery(() => ({ data: [], error: null }))
    })

    const result = await syncDirtyStreakState("parent-1")
    const reconciled = await getChildStreak("child-1")

    expect(result).toEqual({ pushed: 0, rejected: 1, failed: 0, skipped: 0 })
    expect(await getPendingStreakSyncCount("parent-1")).toBe(0)
    expect(reconciled?.preferences).toEqual(expect.objectContaining({
      streakEnabled: true,
      currentEpochId: epochId,
      resetAt: "2026-07-19T08:20:00.000Z",
    }))
  })

  it("remaps provisional offline epochs before replaying a queued reset and its days", async () => {
    const initial = await getChildStreak("child-1")
    const provisionalEpochId = initial!.preferences.currentEpochId!
    await completion("before-offline-reset", "2026-07-19T09:00:00.000Z")
    const reset = await resetChildCurrentStreak("child-1", "2026-07-19T10:00:00.000Z")
    const resetEpochId = reset!.preferences.currentEpochId!
    await completion("after-offline-reset", "2026-07-19T11:00:00.000Z")

    const serverEpochId = "server-epoch"
    let remotePreferences: {
      child_id: string
      streak_enabled: boolean
      include_in_reminders: boolean
      current_epoch_id: string
      reset_at: string | null
      updated_at: string
    } = {
      child_id: "child-1",
      streak_enabled: true,
      include_in_reminders: true,
      current_epoch_id: serverEpochId,
      reset_at: null,
      updated_at: "2026-07-19T08:30:00.000Z",
    }
    let remoteEpochs: Record<string, unknown>[] = [{
      id: serverEpochId,
      child_id: "child-1",
      started_at: "2026-07-01T00:00:00.000Z",
      ended_at: null,
      end_reason: null,
      updated_at: "2026-07-01T00:00:00.000Z",
    }]
    const remoteDays: Record<string, unknown>[] = []

    mockFrom.mockImplementation((table: string) => {
      if (table === "child_streak_preferences") {
        return createRemoteQuery(() => ({ data: remotePreferences, error: null }))
      }
      if (table === "child_streak_epochs") {
        return createRemoteQuery(() => ({ data: remoteEpochs, error: null }))
      }
      return createRemoteQuery(() => ({ data: remoteDays, error: null }))
    })
    mockRpc.mockImplementation(async (name: string, params: Record<string, string>) => {
      if (name === "create_child_streak_state") {
        return { data: { status: "unchanged", preferences: remotePreferences }, error: null }
      }
      if (name === "reset_child_streak") {
        expect(params.p_expected_epoch_id).toBe(serverEpochId)
        remoteEpochs = [
          { ...remoteEpochs[0], ended_at: params.p_occurred_at, end_reason: "reset" },
          {
            id: params.p_new_epoch_id,
            child_id: "child-1",
            started_at: params.p_occurred_at,
            ended_at: null,
            end_reason: null,
            updated_at: params.p_occurred_at,
          },
        ]
        remotePreferences = {
          ...remotePreferences,
          current_epoch_id: params.p_new_epoch_id,
          reset_at: params.p_occurred_at,
          updated_at: params.p_occurred_at,
        }
        return { data: { status: "updated", preferences: remotePreferences }, error: null }
      }
      const row = {
        id: `remote-day-${remoteDays.length + 1}`,
        child_id: params.p_child_id,
        streak_epoch_id: params.p_epoch_id,
        local_date: params.p_local_date,
        first_completed_at: params.p_first_completed_at,
        first_timezone: params.p_first_timezone,
        last_completed_at: params.p_last_completed_at,
        last_timezone: params.p_last_timezone,
        source_type: params.p_source_type,
        source_ref: params.p_source_ref,
        updated_at: "2026-07-19T12:00:00.000Z",
      }
      remoteDays.push(row)
      return { data: { status: "inserted", day: row }, error: null }
    })

    const result = await syncDirtyStreakState("parent-1")
    const synced = await getChildStreak("child-1")

    expect(provisionalEpochId).not.toBe(serverEpochId)
    expect(result).toEqual({ pushed: 4, rejected: 0, failed: 0, skipped: 0 })
    expect(JSON.parse(
      (await AsyncStorage.getItem(getStreakQueueStorageKey("parent-1"))) ?? "[]",
    )).toEqual([])
    expect(synced?.preferences.currentEpochId).toBe(resetEpochId)
    expect(synced?.epochs.map((item) => item.id).sort()).toEqual(
      [serverEpochId, resetEpochId].sort(),
    )
    expect(synced?.days).toHaveLength(2)
    expect(synced?.summary.currentStreak).toBe(1)
    expect(synced?.summary.longestStreak).toBe(1)
  })

  it("does not create or expose streak state without an authenticated account", async () => {
    accountId = null

    await expect(getChildStreak("child-1")).resolves.toBeNull()
    await expect(completion("no-session")).resolves.toEqual({
      recorded: false,
      firstLocalQualification: false,
      reason: "no-account",
    })
    expect(await AsyncStorage.getAllKeys()).toEqual([])
  })
})
