const mockFrom = jest.fn()
const mockGetSession = jest.fn()
const mockGetUser = jest.fn()
const mockReportConnectivityIssue = jest.fn()
const mockClearReportedConnectivityIssue = jest.fn()

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
)

jest.mock("@/lib/network", () => ({
  clearReportedConnectivityIssue: (...args: unknown[]) =>
    mockClearReportedConnectivityIssue(...args),
  isLikelyNetworkError: (error: unknown) =>
    error instanceof Error && /network|timed out/i.test(error.message),
  reportConnectivityIssue: (...args: unknown[]) =>
    mockReportConnectivityIssue(...args),
}))

jest.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      getUser: (...args: unknown[]) => mockGetUser(...args),
    },
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

import AsyncStorage from "@react-native-async-storage/async-storage"
import {
  cacheActiveChildProfiles,
  fetchActiveChildProfile,
  fetchActiveChildProfiles,
  getActiveChildProfileCacheKey,
  readCachedActiveChildProfiles,
  upsertCachedActiveChildProfile,
  type ChildProfile,
} from "../accountManagement"

const savedChild: ChildProfile = {
  id: "child-1",
  parent_id: "parent-1",
  name: "Amina",
  gender: "female",
  age: "6",
  reason: "Build confidence",
  selected_language_code: "lg",
  created_at: "2026-07-20T00:00:00.000Z",
  deleted_at: null,
}

const createQuery = (response: { data: unknown; error: unknown }) => {
  const query: Record<string, jest.Mock | unknown> = {}
  for (const method of ["select", "eq", "is", "order"]) {
    query[method] = jest.fn(() => query)
  }
  query.maybeSingle = jest.fn(() => query)
  query.then = (
    resolve: (value: typeof response) => unknown,
    reject: (reason: unknown) => unknown,
  ) => Promise.resolve(response).then(resolve, reject)
  return query
}

describe("account-scoped child profile cache", () => {
  beforeEach(async () => {
    jest.clearAllMocks()
    await AsyncStorage.clear()
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: "parent-1" } } },
      error: null,
    })
    mockGetUser.mockResolvedValue({
      data: { user: { id: "parent-1" } },
      error: null,
    })
  })

  it("writes a fresh profile list and falls back to it after a network failure", async () => {
    mockFrom.mockReturnValueOnce(
      createQuery({ data: [savedChild], error: null }),
    )

    await expect(fetchActiveChildProfiles("parent-1")).resolves.toEqual([
      savedChild,
    ])
    expect(mockClearReportedConnectivityIssue).toHaveBeenCalled()

    mockFrom.mockReturnValueOnce(
      createQuery({
        data: null,
        error: new Error("network request failed"),
      }),
    )

    await expect(fetchActiveChildProfiles("parent-1")).resolves.toEqual([
      savedChild,
    ])
    expect(mockReportConnectivityIssue).toHaveBeenCalledWith(
      expect.stringContaining("Showing saved child profiles"),
    )
  })

  it("keeps cached profiles isolated by parent account", async () => {
    await cacheActiveChildProfiles("parent-1", [savedChild])

    expect(await readCachedActiveChildProfiles("parent-1")).toEqual([
      savedChild,
    ])
    expect(await readCachedActiveChildProfiles("parent-2")).toBeNull()
    expect(getActiveChildProfileCacheKey("parent-1")).not.toBe(
      getActiveChildProfileCacheKey("parent-2"),
    )
  })

  it("updates the cached row after a profile is created or edited", async () => {
    await upsertCachedActiveChildProfile("parent-1", savedChild)
    await upsertCachedActiveChildProfile("parent-1", {
      ...savedChild,
      name: "Amina Updated",
    })

    expect(await readCachedActiveChildProfiles("parent-1")).toEqual([
      expect.objectContaining({ id: "child-1", name: "Amina Updated" }),
    ])
  })

  it("uses a cached single profile when remote validation cannot connect", async () => {
    await cacheActiveChildProfiles("parent-1", [savedChild])
    mockFrom.mockReturnValueOnce(
      createQuery({
        data: null,
        error: new Error("network request failed"),
      }),
    )

    await expect(
      fetchActiveChildProfile("child-1", "parent-1"),
    ).resolves.toEqual(savedChild)
  })
})
