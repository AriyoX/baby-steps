const mockGetUser = jest.fn();
const queryResponses: Array<{ data: unknown; error: unknown }> = [];
const queries: Array<Record<string, jest.Mock>> = [];

const createQuery = () => {
  const query: Record<string, jest.Mock> = {};
  for (const method of ["select", "eq", "update", "insert"]) {
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

import {
  ParentProfileError,
  fetchParentProfile,
  saveParentDisplayName,
} from "../parentProfileRepository";

const authenticatedParent = {
  data: {
    user: {
      id: "parent-a",
      email: "parent@example.com",
    },
  },
  error: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  queryResponses.splice(0);
  queries.splice(0);
  mockGetUser.mockResolvedValue(authenticatedParent);
});

describe("parent profile repository", () => {
  it("loads a missing optional display-name row without inventing a value", async () => {
    queryResponses.push({ data: null, error: null });

    await expect(fetchParentProfile()).resolves.toEqual({
      id: "parent-a",
      displayName: null,
      email: "parent@example.com",
    });
    expect(mockFrom).toHaveBeenCalledWith("parent_profiles");
    expect(queries[0].select).toHaveBeenCalledWith("id, display_name");
    expect(queries[0].eq).toHaveBeenCalledWith("id", "parent-a");
  });

  it("updates only the authenticated parent's display-name column", async () => {
    queryResponses.push(
      { data: { id: "parent-a" }, error: null },
      {
        data: { id: "parent-a", display_name: "Amélia Parent" },
        error: null,
      },
    );

    await expect(
      saveParentDisplayName("  Ame\u0301lia Parent  "),
    ).resolves.toEqual({
      id: "parent-a",
      displayName: "Amélia Parent",
      email: "parent@example.com",
    });

    expect(queries[1].update).toHaveBeenCalledWith({
      display_name: "Amélia Parent",
    });
    expect(queries[1].eq).toHaveBeenCalledWith("id", "parent-a");
    expect(queries[1].update).not.toHaveBeenCalledWith(
      expect.objectContaining({ id: expect.anything() }),
    );
  });

  it("creates the minimal row on the first confirmed save", async () => {
    queryResponses.push(
      { data: null, error: null },
      {
        data: { id: "parent-a", display_name: "Amina Parent" },
        error: null,
      },
    );

    await saveParentDisplayName("Amina Parent");

    expect(queries[1].insert).toHaveBeenCalledWith({
      id: "parent-a",
      display_name: "Amina Parent",
    });
  });

  it("does not return Parent A's profile if the account changes during save", async () => {
    mockGetUser
      .mockResolvedValueOnce(authenticatedParent)
      .mockResolvedValueOnce({
        data: {
          user: {
            id: "parent-b",
            email: "parent-b@example.com",
          },
        },
        error: null,
      });
    queryResponses.push(
      { data: { id: "parent-a" }, error: null },
      {
        data: { id: "parent-a", display_name: "Amina Parent" },
        error: null,
      },
    );

    await expect(saveParentDisplayName("Amina Parent")).rejects.toMatchObject({
      kind: "session-changed",
    });
  });

  it("classifies validation, authorization, network, and signed-out failures", async () => {
    await expect(saveParentDisplayName("   ")).rejects.toMatchObject({
      kind: "validation",
    });

    queryResponses.push(
      { data: { id: "parent-a" }, error: null },
      { data: null, error: null },
    );
    await expect(saveParentDisplayName("Amina")).rejects.toMatchObject({
      kind: "authorization",
    });

    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    });
    await expect(fetchParentProfile()).rejects.toMatchObject({
      kind: "not-authenticated",
    });

    mockGetUser.mockRejectedValueOnce(new Error("network request failed"));
    await expect(fetchParentProfile()).rejects.toBeInstanceOf(
      ParentProfileError,
    );
  });
});
