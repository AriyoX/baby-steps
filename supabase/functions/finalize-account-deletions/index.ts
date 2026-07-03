import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const ADMIN_SECRET_HEADER = "x-baby-steps-admin-secret";
const ADMIN_SECRET_ENV = "BABY_STEPS_ACCOUNT_DELETION_ADMIN_SECRET";
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

type JsonRecord = Record<string, unknown>;

interface ClaimedDeletionRequest {
  request_id: string;
  user_id: string | null;
  status: string;
  requested_at: string;
  grace_ends_at: string | null;
  app_data_deleted_at: string | null;
  auth_user_deleted_at: string | null;
  finalization_attempt_count: number;
}

interface AppDataFinalizationResult {
  requestId?: string;
  userId?: string | null;
  dryRun?: boolean;
  requiresAuthDeletion?: boolean;
  alreadyCompleted?: boolean;
  appDataDeletedAt?: string;
  counts?: JsonRecord;
}

interface RequestOptions {
  dryRun: boolean;
  limit: number;
  runModeRequested: boolean;
}

interface RequestSummary {
  requestId: string;
  status: "dry_run" | "completed" | "failed" | "skipped";
  appDataCounts?: JsonRecord;
  authUserDeletion?: "not_run" | "would_delete" | "deleted" | "already_deleted";
  attemptCount?: number;
  error?: string;
}

const jsonResponse = (status: number, body: JsonRecord): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
  });

const getBearerToken = (request: Request): string | null => {
  const authorization = request.headers.get("authorization");
  if (!authorization) return null;

  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
};

const constantTimeEqual = (left: string, right: string): boolean => {
  const encoder = new TextEncoder();
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  const maxLength = Math.max(leftBytes.length, rightBytes.length, 1);
  let diff = leftBytes.length ^ rightBytes.length;

  for (let index = 0; index < maxLength; index += 1) {
    diff |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }

  return diff === 0;
};

const isAuthorized = (request: Request): boolean => {
  const expectedSecret = Deno.env.get(ADMIN_SECRET_ENV);
  if (!expectedSecret) return false;

  const providedSecret =
    request.headers.get(ADMIN_SECRET_HEADER) ?? getBearerToken(request);

  return providedSecret !== null && constantTimeEqual(providedSecret, expectedSecret);
};

const parseLimit = (value: unknown): number => {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseInt(value, 10)
        : DEFAULT_LIMIT;

  if (!Number.isFinite(parsed)) return DEFAULT_LIMIT;
  return Math.min(Math.max(Math.trunc(parsed), 1), MAX_LIMIT);
};

const readJsonBody = async (request: Request): Promise<JsonRecord> => {
  if (request.method === "GET" || request.method === "HEAD") return {};

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return {};

  try {
    const body = await request.json();
    return body && typeof body === "object" && !Array.isArray(body)
      ? (body as JsonRecord)
      : {};
  } catch {
    return {};
  }
};

const readRequestOptions = async (request: Request): Promise<RequestOptions> => {
  const url = new URL(request.url);
  const body = await readJsonBody(request);
  const rawMode = body.mode ?? url.searchParams.get("mode");
  const mode = typeof rawMode === "string" ? rawMode.trim().toLowerCase() : "";
  const rawLimit = body.limit ?? url.searchParams.get("limit");
  const runModeRequested = mode === "run";

  return {
    dryRun: !(request.method === "POST" && runModeRequested),
    limit: parseLimit(rawLimit),
    runModeRequested,
  };
};

const createServiceClient = (): SupabaseClient => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase service environment is not configured.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;

  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }

  return "Unknown finalization error.";
};

const sanitizeError = (error: unknown): string =>
  getErrorMessage(error).replace(/[\r\n\t]+/g, " ").slice(0, 1000);

const callRpc = async <T>(
  supabase: SupabaseClient,
  functionName: string,
  args: JsonRecord,
): Promise<T> => {
  const { data, error } = await supabase.rpc(functionName, args);
  if (error) {
    throw new Error(`${functionName}: ${error.message}`);
  }

  return data as T;
};

const isMissingAuthUserError = (error: unknown): boolean => {
  const message = getErrorMessage(error).toLowerCase();
  return (
    message.includes("user not found") ||
    message.includes("not found") ||
    message.includes("does not exist")
  );
};

const deleteAuthUser = async (
  supabase: SupabaseClient,
  userId: string,
): Promise<"deleted" | "already_deleted"> => {
  const { error } = await supabase.auth.admin.deleteUser(userId);

  if (!error) return "deleted";
  if (isMissingAuthUserError(error)) return "already_deleted";

  throw new Error(`delete auth user: ${error.message}`);
};

const recordFailure = async (
  supabase: SupabaseClient,
  requestId: string,
  error: unknown,
): Promise<void> => {
  const message = sanitizeError(error);
  console.error("Account deletion finalization failed", {
    requestId,
    message,
  });

  const { error: failureError } = await supabase.rpc(
    "record_account_deletion_finalization_failure",
    {
      p_request_id: requestId,
      p_error: message,
    },
  );

  if (failureError) {
    console.error("Could not record account deletion finalization failure", {
      requestId,
      message: failureError.message,
    });
  }
};

const processRequest = async (
  supabase: SupabaseClient,
  request: ClaimedDeletionRequest,
  dryRun: boolean,
): Promise<RequestSummary> => {
  const requestId = request.request_id;

  try {
    const appDataResult =
      await callRpc<AppDataFinalizationResult>(
        supabase,
        "finalize_expired_account_deletion_request_app_data",
        {
          p_request_id: requestId,
          p_dry_run: dryRun,
        },
      );

    if (appDataResult.alreadyCompleted) {
      return {
        requestId,
        status: "skipped",
        authUserDeletion: "not_run",
        attemptCount: request.finalization_attempt_count,
      };
    }

    const userId = appDataResult.userId ?? request.user_id;

    if (dryRun) {
      return {
        requestId,
        status: "dry_run",
        appDataCounts: appDataResult.counts,
        authUserDeletion: userId ? "would_delete" : "already_deleted",
        attemptCount: request.finalization_attempt_count,
      };
    }

    const authUserDeletion =
      appDataResult.requiresAuthDeletion === false || !userId
        ? "already_deleted"
        : await deleteAuthUser(supabase, userId);

    await callRpc<JsonRecord>(
      supabase,
      "complete_finalized_account_deletion_request",
      {
        p_request_id: requestId,
        p_auth_user_deleted_at: new Date().toISOString(),
      },
    );

    return {
      requestId,
      status: "completed",
      appDataCounts: appDataResult.counts,
      authUserDeletion,
      attemptCount: request.finalization_attempt_count,
    };
  } catch (error) {
    if (!dryRun) {
      await recordFailure(supabase, requestId, error);
    }

    return {
      requestId,
      status: "failed",
      authUserDeletion: "not_run",
      attemptCount: request.finalization_attempt_count,
      error: sanitizeError(error),
    };
  }
};

const getCounts = (results: RequestSummary[]) => ({
  processed: results.length,
  completed: results.filter((result) => result.status === "completed").length,
  failed: results.filter((result) => result.status === "failed").length,
  skipped: results.filter((result) => result.status === "skipped").length,
});

export const handler = async (request: Request): Promise<Response> => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  if (!["GET", "POST"].includes(request.method)) {
    return jsonResponse(405, {
      error: "method_not_allowed",
      message: "Use GET for dry-run inspection or POST for an explicit run.",
    });
  }

  if (!Deno.env.get(ADMIN_SECRET_ENV)) {
    return jsonResponse(500, {
      error: "configuration_error",
      message: `${ADMIN_SECRET_ENV} is not configured.`,
    });
  }

  if (!isAuthorized(request)) {
    return jsonResponse(401, {
      error: "unauthorized",
      message: "Missing or invalid account deletion finalizer secret.",
    });
  }

  try {
    const options = await readRequestOptions(request);

    if (options.runModeRequested && request.method !== "POST") {
      return jsonResponse(405, {
        error: "method_not_allowed",
        message: "Real account deletion finalization requires POST with mode=run.",
      });
    }

    const supabase = createServiceClient();
    const claims = await callRpc<ClaimedDeletionRequest[]>(
      supabase,
      "claim_expired_account_deletion_requests",
      {
        p_limit: options.limit,
        p_dry_run: options.dryRun,
      },
    );

    const results: RequestSummary[] = [];
    for (const claim of claims ?? []) {
      results.push(await processRequest(supabase, claim, options.dryRun));
    }

    return jsonResponse(200, {
      dryRun: options.dryRun,
      limit: options.limit,
      ...getCounts(results),
      results,
    });
  } catch (error) {
    console.error("Account deletion finalizer request failed", {
      message: sanitizeError(error),
    });

    return jsonResponse(500, {
      error: "finalizer_failed",
      message: sanitizeError(error),
    });
  }
};

Deno.serve(handler);
