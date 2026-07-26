const mockGetUser = jest.fn();
const mockLoadContentBundle = jest.fn();
const mockClearContentBundleCache = jest.fn();
const mockInvalidateAchievementsCache = jest.fn();
const queryResponses: Array<{ data: unknown; error: unknown }> = [];
const queries: Array<Record<string, jest.Mock>> = [];

const createQuery = () => {
  const query: Record<string, jest.Mock> = {};
  for (const method of ["select", "eq", "is", "update"]) {
    query[method] = jest.fn(() => query);
  }
  query.maybeSingle = jest.fn(async () => {
    const response = queryResponses.shift();
    if (!response) throw new Error("Missing mock query response.");
    return response;
  });
  queries.push(query);
  return query;
};

const mockFrom = jest.fn((_table: string) => createQuery());

jest.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getUser: (...args: unknown[]) => mockGetUser(...args),
    },
    from: (table: string) => mockFrom(table),
  },
}));

jest.mock("@/content/contentRepository", () => ({
  loadContentBundle: (...args: unknown[]) => mockLoadContentBundle(...args),
  clearContentBundleCache: (...args: unknown[]) =>
    mockClearContentBundleCache(...args),
}));

jest.mock("@/components/games/achievements/achievementManager", () => ({
  invalidateChildAchievementsCache: (...args: unknown[]) =>
    mockInvalidateAchievementsCache(...args),
}));

import {
  inspectLanguageContentAvailability,
  refreshChildLanguageCaches,
  updateOwnedActiveChildProfile,
  validateChildProfileEdit,
} from "../childProfileRepository";

const childRow = {
  id: "child-a",
  parent_id: "parent-a",
  name: "Amina",
  gender: "female",
  age: "7",
  reason: "Connect with culture",
  selected_language_code: "nyn",
  created_at: "2026-01-01T00:00:00Z",
  deleted_at: null,
  archived_by_account_deletion_request_id: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  queryResponses.splice(0);
  queries.splice(0);
  mockGetUser.mockResolvedValue({
    data: { user: { id: "parent-a" } },
    error: null,
  });
  mockClearContentBundleCache.mockResolvedValue(undefined);
  mockInvalidateAchievementsCache.mockResolvedValue(undefined);
});

describe("child profile repository", () => {
  it("normalizes valid editable fields and rejects unsupported values", () => {
    expect(
      validateChildProfileEdit({
        name: "  Ame\u0301lia ",
        age: "12+",
        gender: "",
        reason: "  Connect with culture  ",
        selectedLanguageCode: "Runyankore",
      }),
    ).toEqual({
      name: "Amélia",
      age: "12+",
      gender: "",
      reason: "Connect with culture",
      selectedLanguageCode: "nyn",
    });

    for (const invalid of [
      { field: "age", value: "13" },
      { field: "gender", value: "other" },
      { field: "selectedLanguageCode", value: "lg-fallback" },
    ]) {
      const input = {
        name: "Amina",
        age: "7",
        gender: "female",
        reason: "",
        selectedLanguageCode: "lg",
        [invalid.field]: invalid.value,
      };
      expect(() => validateChildProfileEdit(input)).toThrow();
    }
  });

  it("updates exactly the allowlisted fields for an owned active child", async () => {
    queryResponses.push({ data: childRow, error: null });

    await expect(
      updateOwnedActiveChildProfile("child-a", {
        name: "Amina",
        age: "7",
        gender: "female",
        reason: "Connect with culture",
        selectedLanguageCode: "nyn",
      }),
    ).resolves.toEqual(childRow);

    expect(queries[0].update).toHaveBeenCalledWith({
      name: "Amina",
      age: "7",
      gender: "female",
      reason: "Connect with culture",
      selected_language_code: "nyn",
    });
    expect(queries[0].eq).toHaveBeenNthCalledWith(1, "id", "child-a");
    expect(queries[0].eq).toHaveBeenNthCalledWith(2, "parent_id", "parent-a");
    expect(queries[0].is).toHaveBeenCalledWith("deleted_at", null);
    expect(queries[0].update).not.toHaveBeenCalledWith(
      expect.objectContaining({
        parent_id: expect.anything(),
        deleted_at: expect.anything(),
      }),
    );
  });

  it("rejects another parent's or archived child when no owned row is returned", async () => {
    queryResponses.push({ data: null, error: null });

    await expect(
      updateOwnedActiveChildProfile("child-b", {
        name: "Other child",
        age: "6",
        gender: "",
        reason: "",
        selectedLanguageCode: "lg",
      }),
    ).rejects.toMatchObject({ kind: "not-found" });
  });

  it("rejects a save if the authenticated account changes before completion", async () => {
    mockGetUser
      .mockResolvedValueOnce({
        data: { user: { id: "parent-a" } },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { user: { id: "parent-b" } },
        error: null,
      });
    queryResponses.push({ data: childRow, error: null });

    await expect(
      updateOwnedActiveChildProfile("child-a", {
        name: "Amina",
        age: "7",
        gender: "female",
        reason: "",
        selectedLanguageCode: "lg",
      }),
    ).rejects.toMatchObject({ kind: "session-changed" });
  });

  it("checks exact-language publication availability without fallback", async () => {
    mockLoadContentBundle.mockResolvedValueOnce({
      source: "empty",
      languageCode: "nyn",
      missingReason: "No published content.",
    });

    await expect(
      inspectLanguageContentAvailability("Runyankore"),
    ).resolves.toEqual({
      languageCode: "nyn",
      hasPublishedContent: false,
    });
    expect(mockLoadContentBundle).toHaveBeenCalledWith("nyn", {
      forceRefresh: true,
      maxAgeMs: 0,
      throwOnNetworkError: true,
    });
    expect(mockLoadContentBundle).not.toHaveBeenCalledWith(
      "lg",
      expect.anything(),
    );
  });

  it("invalidates both language bundles and this child's achievement cache", async () => {
    await refreshChildLanguageCaches("child-a", "lg", "nyn");

    expect(mockClearContentBundleCache.mock.calls).toEqual([["lg"], ["nyn"]]);
    expect(mockInvalidateAchievementsCache).toHaveBeenCalledWith("child-a");
  });

  it("classifies a failed network save without mutating another row", async () => {
    queryResponses.push({
      data: null,
      error: new Error("network request failed"),
    });

    await expect(
      updateOwnedActiveChildProfile("child-a", {
        name: "Amina",
        age: "7",
        gender: "female",
        reason: "",
        selectedLanguageCode: "lg",
      }),
    ).rejects.toMatchObject({ kind: "network" });
  });
});
