import AsyncStorage from "@react-native-async-storage/async-storage";
import type { User } from "@supabase/supabase-js";
import { clearAchievementCaches } from "@/components/games/achievements/achievementManager";
import {
  SIGNUP_EXISTING_ACCOUNT_DETECTED_MESSAGE,
  getSignUpErrorMessage as getFriendlySignUpErrorMessage,
  isExistingAccountSignUpError as isFriendlyExistingAccountSignUpError,
} from "@/lib/authMessages";
import { getColoringStudioTutorialStorageKey } from "@/lib/coloringStudioTutorial";
import { clearLearningProgressForChild } from "@/lib/learningProgressRepository";
import {
  clearReportedConnectivityIssue,
  isLikelyNetworkError,
  reportConnectivityIssue,
} from "@/lib/network";
import { clearProgressRepositoryStorageForChild } from "@/lib/progressRepository";
import { supabase } from "@/lib/supabase";
import { clearRecentActivitiesCache } from "@/lib/utils";
import { clearChildStreakLocalData } from "@/lib/streakRepository";
import { clearChildData, STORAGE_KEYS } from "@/utils/storage";

export interface ChildProfile {
  id: string;
  parent_id: string;
  name: string;
  gender: string;
  age: string;
  reason?: string;
  selected_language_code?: string;
  created_at?: string;
  deleted_at?: string | null;
  archived_by_account_deletion_request_id?: string | null;
}

export interface AccountDeletionResult {
  requestId: string;
  archivedChildIds: string[];
  requestedAt: string;
  graceEndsAt: string;
}

export type AccountDeletionRequestStatus =
  | "requested"
  | "processing"
  | "completed"
  | "cancelled";

export interface AccountDeletionRequest {
  id: string;
  user_id: string;
  email?: string | null;
  status: AccountDeletionRequestStatus;
  requested_at: string;
  grace_ends_at?: string | null;
  cancelled_at?: string | null;
  reactivated_at?: string | null;
  completed_at?: string | null;
  fulfilled_at?: string | null;
  archived_child_ids?: string[] | null;
  note?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type AccountDeletionPhase =
  | "active"
  | "pending"
  | "expired"
  | "completed";

export interface AccountDeletionState {
  phase: AccountDeletionPhase;
  request: AccountDeletionRequest | null;
  graceEndsAt: string | null;
}

export interface AccountReactivationResult {
  request: AccountDeletionRequest;
  restoredChildIds: string[];
  reactivatedAt: string;
}

export const CHILD_OWNED_REMOTE_TABLES = [
  "children",
  "activities",
  "child_achievements",
  "child_activity_progress",
  "child_stage_progress",
] as const;

export const SHARED_REMOTE_TABLES_EXCLUDED_FROM_DELETION = [
  "achievements",
  "content_items",
  "languages",
] as const;

const CHILD_SELECT_COLUMNS =
  "id, parent_id, name, gender, age, reason, selected_language_code, created_at, deleted_at, archived_by_account_deletion_request_id";
const ACTIVE_CHILD_PROFILE_CACHE_PREFIX =
  "@BabySteps:ActiveChildProfiles:v1";
export const CHILD_PROFILE_FETCH_TIMEOUT_MS = 10_000;

type StoredActiveChildProfiles = {
  version: 1;
  parentId: string;
  profiles: ChildProfile[];
  updatedAt: string;
};

export type ChildProfileFetchOptions = {
  timeoutMs?: number;
  allowCachedFallback?: boolean;
};

export const getActiveChildProfileCacheKey = (parentId: string): string =>
  `${ACTIVE_CHILD_PROFILE_CACHE_PREFIX}:${encodeURIComponent(parentId)}`;

const isChildProfileForParent = (
  value: unknown,
  parentId: string,
): value is ChildProfile => {
  if (!value || typeof value !== "object") return false;
  const profile = value as Partial<ChildProfile>;
  return (
    typeof profile.id === "string" &&
    profile.id.length > 0 &&
    profile.parent_id === parentId &&
    typeof profile.name === "string" &&
    typeof profile.gender === "string" &&
    typeof profile.age === "string" &&
    (profile.deleted_at === null || profile.deleted_at === undefined)
  );
};

export const readCachedActiveChildProfiles = async (
  parentId: string,
): Promise<ChildProfile[] | null> => {
  if (!parentId) return null;
  const key = getActiveChildProfileCacheKey(parentId);
  const stored = await AsyncStorage.getItem(key);
  if (!stored) return null;

  try {
    const parsed = JSON.parse(stored) as Partial<StoredActiveChildProfiles>;
    if (
      parsed.version !== 1 ||
      parsed.parentId !== parentId ||
      !Array.isArray(parsed.profiles)
    ) {
      throw new Error("Invalid child profile cache.");
    }

    const profiles = parsed.profiles.filter((profile) =>
      isChildProfileForParent(profile, parentId),
    );
    if (profiles.length !== parsed.profiles.length) {
      throw new Error("Invalid child profile cache rows.");
    }
    return profiles;
  } catch {
    await AsyncStorage.removeItem(key);
    return null;
  }
};

export const cacheActiveChildProfiles = async (
  parentId: string,
  profiles: readonly ChildProfile[],
): Promise<void> => {
  if (!parentId) return;
  const safeProfiles = profiles.filter((profile) =>
    isChildProfileForParent(profile, parentId),
  );
  await AsyncStorage.setItem(
    getActiveChildProfileCacheKey(parentId),
    JSON.stringify({
      version: 1,
      parentId,
      profiles: safeProfiles,
      updatedAt: new Date().toISOString(),
    } satisfies StoredActiveChildProfiles),
  );
};

export const upsertCachedActiveChildProfile = async (
  parentId: string,
  profile: ChildProfile,
): Promise<void> => {
  if (!isChildProfileForParent(profile, parentId)) return;
  const current = (await readCachedActiveChildProfiles(parentId)) ?? [];
  await cacheActiveChildProfiles(parentId, [
    profile,
    ...current.filter((candidate) => candidate.id !== profile.id),
  ]);
};

export const removeCachedActiveChildProfile = async (
  parentId: string,
  childId: string,
): Promise<void> => {
  const current = await readCachedActiveChildProfiles(parentId);
  if (!current) return;
  await cacheActiveChildProfiles(
    parentId,
    current.filter((profile) => profile.id !== childId),
  );
};

export const clearCachedActiveChildProfiles = async (
  parentId: string,
): Promise<void> => {
  if (!parentId) return;
  await AsyncStorage.removeItem(getActiveChildProfileCacheKey(parentId));
};

const withChildProfileTimeout = async <T>(
  request: PromiseLike<T>,
  timeoutMs: number,
): Promise<T> => {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      Promise.resolve(request),
      new Promise<T>((_resolve, reject) => {
        timeout = setTimeout(
          () => reject(new Error("Child profile request timed out.")),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
};

const getParentIdForProfileRead = async (
  parentId?: string,
): Promise<string | null> => {
  if (parentId) return parentId;
  const auth = supabase.auth as typeof supabase.auth & {
    getSession?: typeof supabase.auth.getSession;
  };
  if (typeof auth.getSession === "function") {
    const { data, error } = await auth.getSession();
    if (error) throw error;
    return data.session?.user.id ?? null;
  }
  return (await getCurrentUser()).id;
};

const ACCOUNT_DELETION_REQUEST_SELECT_COLUMNS = [
  "id",
  "user_id",
  "email",
  "status",
  "requested_at",
  "grace_ends_at",
  "cancelled_at",
  "reactivated_at",
  "completed_at",
  "fulfilled_at",
  "archived_child_ids",
  "note",
  "created_at",
  "updated_at",
].join(", ");

const REQUEST_ACCOUNT_DELETION_RPC = "request_account_deletion_with_grace";
const REACTIVATE_ACCOUNT_DELETION_RPC = "reactivate_account_deletion";
const ARCHIVE_CHILD_PROFILE_RPC = "archive_child_profile";

export const ACCOUNT_DELETION_GRACE_PERIOD_DAYS = 30;

const DELETION_REQUESTS_BLOCKING_NORMAL_ACCESS = [
  "requested",
  "processing",
  "completed",
] as const;

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export const SIGNUP_EXISTING_ACCOUNT_DELETION_MESSAGE =
  SIGNUP_EXISTING_ACCOUNT_DETECTED_MESSAGE;

const REQUEST_ACCOUNT_DELETION_FAILED_MESSAGE =
  "We could not schedule account deletion. Please try again.";
const REACTIVATE_ACCOUNT_FAILED_MESSAGE =
  "We could not reactivate this account. Please try again.";

const getCurrentUser = async (): Promise<User> => {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) {
    throw new Error("You need to be signed in to manage this account.");
  }

  return data.user;
};

const nowIso = (): string => new Date().toISOString();

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const getRpcString = (
  record: Record<string, unknown>,
  ...keys: string[]
): string | null => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.length > 0) return value;
  }

  return null;
};

const getRpcStringArray = (
  record: Record<string, unknown>,
  ...keys: string[]
): string[] | null => {
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === "string");
    }
  }

  return null;
};

const getRpcRequest = (
  record: Record<string, unknown>,
): AccountDeletionRequest | null => {
  const request = asRecord(record.request);
  return request ? (request as unknown as AccountDeletionRequest) : null;
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;

  const record = asRecord(error);
  if (typeof record?.message === "string") return record.message;

  return "";
};

const getFriendlyAccountLifecycleErrorMessage = (
  error: unknown,
  fallbackMessage: string,
): string => {
  const message = getErrorMessage(error);

  if (message.includes("grace period has ended")) {
    return "The 30-day window for this account has ended.";
  }

  if (
    message.includes("final removal") ||
    message.includes("already been completed")
  ) {
    return "The 30-day window for this account has ended.";
  }

  if (message.includes("signed in")) {
    return "You need to be signed in to manage this account.";
  }

  if (message.includes("no account deletion request")) {
    return "There is no account deletion request to reactivate.";
  }

  if (message.includes("already been cancelled")) {
    return "This account deletion request has already been cancelled.";
  }

  return fallbackMessage;
};

const normalizeRequestAccountDeletionRpcResult = (
  value: unknown,
): AccountDeletionResult => {
  const record = asRecord(value);
  if (!record) {
    throw new Error("Account deletion request could not be scheduled.");
  }

  const request = getRpcRequest(record);
  const requestId = getRpcString(record, "requestId", "request_id") ?? request?.id;
  const archivedChildIds =
    getRpcStringArray(record, "archivedChildIds", "archived_child_ids") ??
    request?.archived_child_ids ??
    [];
  const requestedAt =
    getRpcString(record, "requestedAt", "requested_at") ?? request?.requested_at;
  const graceEndsAt =
    getRpcString(record, "graceEndsAt", "grace_ends_at") ?? request?.grace_ends_at;

  if (!requestId || !requestedAt || !graceEndsAt) {
    throw new Error("Account deletion request could not be scheduled.");
  }

  return {
    requestId,
    archivedChildIds,
    requestedAt,
    graceEndsAt,
  };
};

const normalizeReactivateAccountRpcResult = (
  value: unknown,
): AccountReactivationResult => {
  const record = asRecord(value);
  if (!record) {
    throw new Error("Account reactivation could not be completed.");
  }

  const request = getRpcRequest(record);
  if (!request) {
    throw new Error("Account reactivation could not be completed.");
  }

  const restoredChildIds =
    getRpcStringArray(record, "restoredChildIds", "restored_child_ids") ?? [];
  const reactivatedAt =
    getRpcString(record, "reactivatedAt", "reactivated_at") ??
    request.reactivated_at ??
    nowIso();

  return {
    request,
    restoredChildIds,
    reactivatedAt,
  };
};

export const getDeletionGraceEndsAtFromRequestDate = (
  requestedAt: string,
): string =>
  new Date(
    new Date(requestedAt).getTime() +
      ACCOUNT_DELETION_GRACE_PERIOD_DAYS * MILLISECONDS_PER_DAY,
  ).toISOString();

const resolveGraceEndsAt = (
  request: Pick<AccountDeletionRequest, "requested_at" | "grace_ends_at">,
): string => request.grace_ends_at ?? getDeletionGraceEndsAtFromRequestDate(request.requested_at);

const getDeletionPhaseForRequest = (
  request: AccountDeletionRequest,
  graceEndsAt = resolveGraceEndsAt(request),
): Exclude<AccountDeletionPhase, "active"> => {
  if (request.status === "completed") return "completed";
  return isDeletionGracePeriodExpired(graceEndsAt) ? "expired" : "pending";
};

export const isDeletionGracePeriodExpired = (
  graceEndsAt: string | null | undefined,
  now = new Date(),
): boolean => {
  if (!graceEndsAt) return false;
  return new Date(graceEndsAt).getTime() <= now.getTime();
};

const encodedChildId = (childId: string): string => encodeURIComponent(childId);

const getExactChildStorageKeys = (childId: string): string[] => [
  ...Object.values(STORAGE_KEYS).map((prefix) => `${prefix}${childId}`),
  `learning_stats_${childId}`,
  `@BabySteps:CountingGame:${childId}`,
  `@BabySteps:WordGame:${childId}`,
  `@BabySteps:CardGame:${childId}`,
  `@BabySteps:CardGameOverallStats:${childId}`,
  `@BabySteps:PuzzleGameProgress:${childId}`,
  getColoringStudioTutorialStorageKey(childId),
  `luganda_total_score_${childId}`,
  `luganda_completed_levels_${childId}`,
  `luganda_stages_${childId}`,
  `luganda_user_stats_${childId}`,
];

const getChildStoragePrefixes = (childId: string): string[] => {
  const encoded = encodedChildId(childId);

  return [
    `@BabySteps:CountingGame:${childId}:`,
    `@BabySteps:WordGame:${childId}:`,
    `learning_total_score_${childId}_`,
    `learning_completed_levels_${childId}_`,
    `learning_stages_${childId}_`,
    `learning_user_stats_${childId}_`,
    `cache:activities:recent:${encoded}`,
    `cache:child_achievements:${encoded}`,
    `@BabySteps:LearningProgress:v1:summary:${encoded}:`,
    `@BabySteps:Progress:v1:activity:${encoded}:`,
    `@BabySteps:Progress:v1:stage:${encoded}:`,
    `progress:lastHydratedAt:${encoded}:`,
  ];
};

export const isChildScopedLocalStorageKey = (
  key: string,
  childId: string,
): boolean => {
  if (!childId) return false;

  const exactKeys = new Set(getExactChildStorageKeys(childId));
  if (exactKeys.has(key)) return true;

  if (key.startsWith("learning_session_") && key.endsWith(`_${childId}`)) {
    return true;
  }

  return getChildStoragePrefixes(childId).some((prefix) => key.startsWith(prefix));
};

export const getChildLocalStorageKeysToRemove = (
  keys: readonly string[],
  childId: string,
): string[] => keys.filter((key) => isChildScopedLocalStorageKey(key, childId));

export const clearChildLocalData = async (childId: string): Promise<string[]> => {
  if (!childId) return [];

  await Promise.all([
    clearChildData(childId),
    clearRecentActivitiesCache(childId),
    clearAchievementCaches(childId),
    clearLearningProgressForChild(childId),
    clearProgressRepositoryStorageForChild(childId),
    clearChildStreakLocalData(childId),
  ]);

  const keys = await AsyncStorage.getAllKeys();
  const keysToRemove = getChildLocalStorageKeysToRemove(keys, childId);
  await AsyncStorage.multiRemove(keysToRemove);
  return keysToRemove;
};

export const clearAccountLocalData = async (
  childIds: readonly string[],
): Promise<void> => {
  await Promise.all(childIds.map((childId) => clearChildLocalData(childId)));
};

export const fetchActiveChildProfiles = async (
  parentId?: string,
  options: ChildProfileFetchOptions = {},
): Promise<ChildProfile[]> => {
  const resolvedParentId = await getParentIdForProfileRead(parentId);

  if (!resolvedParentId) return [];

  try {
    const request = supabase
      .from("children")
      .select(CHILD_SELECT_COLUMNS)
      .eq("parent_id", resolvedParentId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    const { data, error } = await withChildProfileTimeout(
      request,
      options.timeoutMs ?? CHILD_PROFILE_FETCH_TIMEOUT_MS,
    );

    if (error) throw error;
    const profiles = (data ?? []) as ChildProfile[];
    try {
      await cacheActiveChildProfiles(resolvedParentId, profiles);
    } catch (cacheError) {
      console.warn("Could not cache child profiles:", cacheError);
    }
    clearReportedConnectivityIssue();
    return profiles;
  } catch (error) {
    if (
      options.allowCachedFallback !== false &&
      isLikelyNetworkError(error)
    ) {
      const cached = await readCachedActiveChildProfiles(resolvedParentId);
      reportConnectivityIssue(
        cached
          ? "The connection is very slow. Showing saved child profiles while Baby Steps reconnects."
          : "The connection is very slow. Baby Steps could not refresh child profiles yet.",
      );
      if (cached) return cached;
    }
    throw error;
  }
};

export const fetchActiveChildProfile = async (
  childId: string,
  parentId?: string,
  options: ChildProfileFetchOptions = {},
): Promise<ChildProfile | null> => {
  if (!childId) return null;

  const resolvedParentId = await getParentIdForProfileRead(parentId);
  if (!resolvedParentId) return null;

  try {
    const request = supabase
      .from("children")
      .select(CHILD_SELECT_COLUMNS)
      .eq("id", childId)
      .eq("parent_id", resolvedParentId)
      .is("deleted_at", null)
      .maybeSingle();
    const { data, error } = await withChildProfileTimeout(
      request,
      options.timeoutMs ?? CHILD_PROFILE_FETCH_TIMEOUT_MS,
    );

    if (error) throw error;
    const profile = (data as ChildProfile | null) ?? null;
    try {
      if (profile) {
        await upsertCachedActiveChildProfile(resolvedParentId, profile);
      } else {
        await removeCachedActiveChildProfile(resolvedParentId, childId);
      }
    } catch (cacheError) {
      console.warn("Could not update the cached child profile:", cacheError);
    }
    clearReportedConnectivityIssue();
    return profile;
  } catch (error) {
    if (
      options.allowCachedFallback !== false &&
      isLikelyNetworkError(error)
    ) {
      const cached = await readCachedActiveChildProfiles(resolvedParentId);
      const profile =
        cached?.find((candidate) => candidate.id === childId) ?? null;
      reportConnectivityIssue(
        profile
          ? "The connection is very slow. Showing the saved child profile while Baby Steps reconnects."
          : "The connection is very slow. Baby Steps could not refresh this child profile yet.",
      );
      if (profile) return profile;
    }
    throw error;
  }
};

export const getAccountDeletionState = async (
  userId?: string,
): Promise<AccountDeletionState> => {
  const user = userId ? null : await getCurrentUser();
  const resolvedUserId = userId ?? user?.id;

  if (!resolvedUserId) {
    throw new Error("Parent account is required.");
  }

  const { data, error } = await supabase
    .from("account_deletion_requests")
    .select(ACCOUNT_DELETION_REQUEST_SELECT_COLUMNS)
    .eq("user_id", resolvedUserId)
    .in("status", DELETION_REQUESTS_BLOCKING_NORMAL_ACCESS)
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  const request = (data as AccountDeletionRequest | null) ?? null;
  if (!request) {
    return { phase: "active", request: null, graceEndsAt: null };
  }

  const graceEndsAt = resolveGraceEndsAt(request);

  return {
    phase: getDeletionPhaseForRequest(request, graceEndsAt),
    request,
    graceEndsAt,
  };
};

export const isAccountPendingDeletion = async (
  userId?: string,
): Promise<boolean> => {
  const state = await getAccountDeletionState(userId);
  return state.phase === "pending";
};

export const getDeletionGracePeriodDeadline = async (
  userId?: string,
): Promise<string | null> => {
  const state = await getAccountDeletionState(userId);
  return state.graceEndsAt;
};

export const isAccountDeletionBlockingNormalAccess = (
  state: AccountDeletionState | null | undefined,
): boolean =>
  state?.phase === "pending" ||
  state?.phase === "expired" ||
  state?.phase === "completed";

export const getPostLoginRouteForAccountState = (
  state: AccountDeletionState,
): "/parent" | "/account-reactivation" =>
  isAccountDeletionBlockingNormalAccess(state) ? "/account-reactivation" : "/parent";

export const archiveChildProfile = async (
  childId: string,
  parentId?: string,
): Promise<{ archivedAt: string }> => {
  if (!childId) {
    throw new Error("Child profile is required.");
  }

  const user = parentId ? null : await getCurrentUser();
  const resolvedParentId = parentId ?? user?.id;
  if (!resolvedParentId) {
    throw new Error("Parent account is required.");
  }

  const { data, error } = await supabase.rpc(ARCHIVE_CHILD_PROFILE_RPC, {
    p_child_id: childId,
  });

  if (error) throw error;
  const result =
    data && typeof data === "object" && !Array.isArray(data)
      ? (data as { status?: unknown; archived_at?: unknown })
      : null;
  if (
    result?.status !== "applied" ||
    typeof result.archived_at !== "string"
  ) {
    throw new Error("Child profile was not found or has already been removed.");
  }
  const archivedAt = result.archived_at;

  await Promise.all([
    clearChildLocalData(childId),
    removeCachedActiveChildProfile(resolvedParentId, childId),
  ]);
  if (process.env.NODE_ENV !== "test") {
    void import("@/lib/notifications").then(({ syncRecurringRemindersIfEnabled }) =>
      syncRecurringRemindersIfEnabled(resolvedParentId),
    ).catch((error) => {
      console.warn("Could not refresh learning reminders after child archiving:", error);
    });
  }
  return { archivedAt };
};

export const requestAccountDeletion = async (
  note?: string,
): Promise<AccountDeletionResult> => {
  const user = await getCurrentUser();

  const { data, error } = await supabase.rpc(REQUEST_ACCOUNT_DELETION_RPC, {
    p_note: note ?? null,
  });

  if (error) {
    throw new Error(
      getFriendlyAccountLifecycleErrorMessage(
        error,
        REQUEST_ACCOUNT_DELETION_FAILED_MESSAGE,
      ),
    );
  }

  const result = normalizeRequestAccountDeletionRpcResult(data);

  await Promise.all([
    clearAccountLocalData(result.archivedChildIds),
    clearCachedActiveChildProfiles(user.id),
  ]);

  // Permanent deletion after grace_ends_at is handled by the server-side
  // finalize-account-deletions Edge Function, never by the client.
  const { error: signOutError } = await supabase.auth.signOut();
  if (signOutError) throw signOutError;

  return result;
};

export const reactivateAccount = async (
  userId?: string,
): Promise<AccountReactivationResult> => {
  if (!userId) {
    await getCurrentUser();
  }

  const { data, error } = await supabase.rpc(REACTIVATE_ACCOUNT_DELETION_RPC);

  if (error) {
    throw new Error(
      getFriendlyAccountLifecycleErrorMessage(
        error,
        REACTIVATE_ACCOUNT_FAILED_MESSAGE,
      ),
    );
  }

  return normalizeReactivateAccountRpcResult(data);
};

export const isExistingAccountSignUpError = (message: string): boolean =>
  isFriendlyExistingAccountSignUpError(message);

export const getSignUpErrorMessage = (message: string): string =>
  getFriendlySignUpErrorMessage(message);

export const isChildDeleteConfirmationValid = (
  confirmationText: string,
  childName: string,
): boolean => confirmationText.trim() === childName.trim();

export const ACCOUNT_DELETE_CONFIRMATION_WORD = "DELETE";

export const isAccountDeleteConfirmationValid = (
  confirmationText: string,
): boolean => confirmationText.trim() === ACCOUNT_DELETE_CONFIRMATION_WORD;
