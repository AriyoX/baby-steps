jest.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
      signOut: jest.fn(),
    },
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";
import {
  ACCOUNT_DELETE_CONFIRMATION_WORD,
  CHILD_OWNED_REMOTE_TABLES,
  SHARED_REMOTE_TABLES_EXCLUDED_FROM_DELETION,
  archiveChildProfile,
  getChildLocalStorageKeysToRemove,
  getAccountDeletionState,
  getDeletionGraceEndsAtFromRequestDate,
  getPostLoginRouteForAccountState,
  getSignUpErrorMessage,
  isAccountDeleteConfirmationValid,
  isAccountDeletionBlockingNormalAccess,
  isChildDeleteConfirmationValid,
  reactivateAccount,
  requestAccountDeletion,
} from "../accountManagement";

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
});

describe("account management deletion helpers", () => {
  it("requires typed confirmation for child and account deletion", () => {
    expect(isChildDeleteConfirmationValid("", "Amina")).toBe(false);
    expect(isChildDeleteConfirmationValid("Amina", "Amina")).toBe(true);
    expect(isChildDeleteConfirmationValid("amina", "Amina")).toBe(false);

    expect(isAccountDeleteConfirmationValid("delete")).toBe(false);
    expect(isAccountDeleteConfirmationValid(ACCOUNT_DELETE_CONFIRMATION_WORD)).toBe(true);
  });

  it("targets child-scoped local keys without clearing shared content or app settings", () => {
    const keys = [
      "counting_game_child-1",
      "@BabySteps:CountingGame:child-1:lg",
      "@BabySteps:WordGame:child-1:nyn",
      "learning_total_score_child-1_lg",
      "learning_session_words_child-1",
      "learning_stats_child-1",
      "cache:activities:recent:child-1:lg",
      "cache:child_achievements:child-1",
      "@BabySteps:Progress:v1:activity:child-1:lg:words",
      "cache:achievements:definitions",
      "@BabySteps:ContentBundle:v1:lg",
      "@baby_steps/audio_settings/v1",
      "@BabySteps:CountingGame:child-2:lg",
    ];

    expect(getChildLocalStorageKeysToRemove(keys, "child-1")).toEqual([
      "counting_game_child-1",
      "@BabySteps:CountingGame:child-1:lg",
      "@BabySteps:WordGame:child-1:nyn",
      "learning_total_score_child-1_lg",
      "learning_session_words_child-1",
      "learning_stats_child-1",
      "cache:activities:recent:child-1:lg",
      "cache:child_achievements:child-1",
      "@BabySteps:Progress:v1:activity:child-1:lg:words",
    ]);
  });

  it("keeps shared/global tables out of child-owned deletion targets", () => {
    SHARED_REMOTE_TABLES_EXCLUDED_FROM_DELETION.forEach((table) => {
      expect(CHILD_OWNED_REMOTE_TABLES).not.toContain(table);
    });
  });

  it("archives only the selected child row for the signed-in parent", async () => {
    const query = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: { id: "child-1", parent_id: "parent-1", name: "Amina" },
        error: null,
      }),
    };

    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: "parent-1" } },
      error: null,
    });
    (supabase.from as jest.Mock).mockReturnValue(query);

    await archiveChildProfile("child-1");

    expect(supabase.from).toHaveBeenCalledWith("children");
    expect(query.update).toHaveBeenCalledWith({
      deleted_at: expect.any(String),
      archived_by_account_deletion_request_id: null,
    });
    expect(query.eq).toHaveBeenCalledWith("id", "child-1");
    expect(query.eq).toHaveBeenCalledWith("parent_id", "parent-1");
    expect(query.is).toHaveBeenCalledWith("deleted_at", null);
    expect(query.select).toHaveBeenCalledWith(
      "id, parent_id, name, gender, age, reason, selected_language_code, created_at, deleted_at, archived_by_account_deletion_request_id",
    );
    expect(query.maybeSingle).toHaveBeenCalled();
  });

  it("fails clearly when no active child row is archived", async () => {
    const query = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    };

    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: "parent-1" } },
      error: null,
    });
    (supabase.from as jest.Mock).mockReturnValue(query);

    await expect(archiveChildProfile("child-1")).rejects.toThrow(
      "Child profile was not found or has already been archived.",
    );
  });

  it("detects a pending deletion account and routes login to reactivation", async () => {
    const query = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: {
          id: "request-1",
          user_id: "parent-1",
          status: "requested",
          requested_at: "2026-07-02T00:00:00.000Z",
          grace_ends_at: "2099-08-01T00:00:00.000Z",
        },
        error: null,
      }),
    };

    (supabase.from as jest.Mock).mockReturnValue(query);

    const state = await getAccountDeletionState("parent-1");

    expect(state.phase).toBe("pending");
    expect(state.graceEndsAt).toBe("2099-08-01T00:00:00.000Z");
    expect(isAccountDeletionBlockingNormalAccess(state)).toBe(true);
    expect(getPostLoginRouteForAccountState(state)).toBe("/account-reactivation");
    expect(query.in).toHaveBeenCalledWith("status", ["requested", "processing", "completed"]);
  });

  it("routes expired and completed deletion accounts to the status screen", () => {
    expect(
      getPostLoginRouteForAccountState({
        phase: "expired",
        graceEndsAt: "2026-07-01T00:00:00.000Z",
        request: {
          id: "request-1",
          user_id: "parent-1",
          status: "requested",
          requested_at: "2026-06-01T00:00:00.000Z",
        },
      }),
    ).toBe("/account-reactivation");

    expect(
      getPostLoginRouteForAccountState({
        phase: "completed",
        graceEndsAt: "2026-07-01T00:00:00.000Z",
        request: {
          id: "request-1",
          user_id: "parent-1",
          status: "completed",
          requested_at: "2026-06-01T00:00:00.000Z",
        },
      }),
    ).toBe("/account-reactivation");
  });

  it("treats an expired grace period honestly and does not reactivate it", async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: null,
      error: { message: "The account deletion grace period has ended." },
    });

    await expect(reactivateAccount("parent-1")).rejects.toThrow(
      "The account deletion grace period has ended.",
    );
    expect(supabase.rpc).toHaveBeenCalledWith("reactivate_account_deletion");
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("requests deletion through the transactional grace-period RPC", async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: "parent-1", email: "parent@example.com" } },
      error: null,
    });
    (supabase.auth.signOut as jest.Mock).mockResolvedValue({ error: null });
    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: {
        request: {
          id: "request-1",
          user_id: "parent-1",
          status: "requested",
          requested_at: "2026-07-02T00:00:00.000Z",
          grace_ends_at: "2026-08-01T00:00:00.000Z",
        },
        requestId: "request-1",
        archivedChildIds: ["child-1"],
        requestedAt: "2026-07-02T00:00:00.000Z",
        graceEndsAt: "2026-08-01T00:00:00.000Z",
      },
      error: null,
    });

    const result = await requestAccountDeletion("Please delete my account.");

    expect(supabase.rpc).toHaveBeenCalledWith("request_account_deletion_with_grace", {
      p_note: "Please delete my account.",
    });
    expect(result).toEqual({
      requestId: "request-1",
      archivedChildIds: ["child-1"],
      requestedAt: "2026-07-02T00:00:00.000Z",
      graceEndsAt: "2026-08-01T00:00:00.000Z",
    });
    expect(getDeletionGraceEndsAtFromRequestDate(result.requestedAt)).toBe(
      "2026-08-01T00:00:00.000Z",
    );
    expect(supabase.from).not.toHaveBeenCalled();
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });

  it("reuses an existing active deletion request through the RPC instead of inserting duplicates", async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: "parent-1", email: "parent@example.com" } },
      error: null,
    });
    (supabase.auth.signOut as jest.Mock).mockResolvedValue({ error: null });
    (supabase.rpc as jest.Mock)
      .mockResolvedValueOnce({
        data: {
          requestId: "request-1",
          archivedChildIds: ["child-1"],
          requestedAt: "2026-07-02T00:00:00.000Z",
          graceEndsAt: "2026-08-01T00:00:00.000Z",
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          requestId: "request-1",
          archivedChildIds: ["child-1"],
          requestedAt: "2026-07-02T00:01:00.000Z",
          graceEndsAt: "2026-08-01T00:01:00.000Z",
        },
        error: null,
      });

    const firstResult = await requestAccountDeletion();
    const secondResult = await requestAccountDeletion("Updated note");

    expect(firstResult.requestId).toBe("request-1");
    expect(secondResult.requestId).toBe("request-1");
    expect(supabase.rpc).toHaveBeenNthCalledWith(1, "request_account_deletion_with_grace", {
      p_note: null,
    });
    expect(supabase.rpc).toHaveBeenNthCalledWith(2, "request_account_deletion_with_grace", {
      p_note: "Updated note",
    });
    expect(supabase.from).not.toHaveBeenCalled();
    expect(supabase.auth.signOut).toHaveBeenCalledTimes(2);
  });

  it("reactivation uses the transactional RPC and restores children reported by that request", async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: {
        request: {
          id: "request-1",
          user_id: "parent-1",
          status: "cancelled",
          requested_at: "2026-07-02T00:00:00.000Z",
          grace_ends_at: "2099-08-01T00:00:00.000Z",
          cancelled_at: "2026-07-03T00:00:00.000Z",
          reactivated_at: "2026-07-03T00:00:00.000Z",
        },
        restoredChildIds: ["child-1"],
        reactivatedAt: "2026-07-03T00:00:00.000Z",
      },
      error: null,
    });

    const result = await reactivateAccount("parent-1");

    expect(supabase.rpc).toHaveBeenCalledWith("reactivate_account_deletion");
    expect(result.restoredChildIds).toEqual(["child-1"]);
    expect(result.request.status).toBe("cancelled");
    expect(result.request.reactivated_at).toBe("2026-07-03T00:00:00.000Z");
    expect(supabase.from).not.toHaveBeenCalled();

    const touchedTables = (supabase.from as jest.Mock).mock.calls.map(([table]) => table);
    SHARED_REMOTE_TABLES_EXCLUDED_FROM_DELETION.forEach((table) => {
      expect(touchedTables).not.toContain(table);
    });
  });

  it("does not unblock access from the client when the reactivation RPC fails", async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: null,
      error: { message: "child restore failed" },
    });

    await expect(reactivateAccount("parent-1")).rejects.toThrow(
      "We could not reactivate this account. Please try again.",
    );

    expect(supabase.rpc).toHaveBeenCalledWith("reactivate_account_deletion");
    expect(supabase.from).not.toHaveBeenCalled();
    expect(supabase.auth.signOut).not.toHaveBeenCalled();
  });

  it("shows friendly signup copy when Supabase blocks an existing account", () => {
    expect(getSignUpErrorMessage("User already registered")).toBe(
      "An account with this email already exists or may already be scheduled for deletion. Please log in to reactivate it if it is still within the deletion period, or contact support if the deletion period has ended.",
    );
    expect(getSignUpErrorMessage("Password should be at least 6 characters")).toBe(
      "Password should be at least 6 characters",
    );
  });
});
