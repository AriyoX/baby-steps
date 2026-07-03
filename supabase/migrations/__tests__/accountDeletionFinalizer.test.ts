import { readdirSync, readFileSync, statSync } from "fs";
import path from "path";

const migrationPath = path.join(
  __dirname,
  "..",
  "20260702002000_add_account_deletion_finalizer.sql",
);
const edgeFunctionPath = path.join(
  __dirname,
  "..",
  "..",
  "functions",
  "finalize-account-deletions",
  "index.ts",
);
const denoConfigPath = path.join(
  __dirname,
  "..",
  "..",
  "functions",
  "finalize-account-deletions",
  "deno.json",
);
const projectRoot = path.join(__dirname, "..", "..", "..");

const readProjectFiles = (
  relativeDirectories: string[],
  extensions = new Set([".ts", ".tsx", ".js", ".jsx"]),
): Array<{ relativePath: string; content: string }> => {
  const files: Array<{ relativePath: string; content: string }> = [];

  const visit = (absolutePath: string) => {
    for (const entry of readdirSync(absolutePath)) {
      const childPath = path.join(absolutePath, entry);
      const stats = statSync(childPath);

      if (stats.isDirectory()) {
        if (["node_modules", ".git", ".expo", "dist"].includes(entry)) continue;
        visit(childPath);
        continue;
      }

      if (extensions.has(path.extname(entry))) {
        files.push({
          relativePath: path.relative(projectRoot, childPath),
          content: readFileSync(childPath, "utf8"),
        });
      }
    }
  };

  relativeDirectories.forEach((directory) => visit(path.join(projectRoot, directory)));
  return files;
};

describe("account deletion finalizer backend", () => {
  const migrationSql = readFileSync(migrationPath, "utf8");
  const edgeFunctionTs = readFileSync(edgeFunctionPath, "utf8");
  const denoConfig = JSON.parse(readFileSync(denoConfigPath, "utf8")) as {
    imports?: Record<string, string>;
  };

  it("uses an import-map style Supabase dependency for Deno", () => {
    expect(edgeFunctionTs).toContain('from "@supabase/supabase-js"');
    expect(edgeFunctionTs).not.toContain('from "https://esm.sh/@supabase/supabase-js');
    expect(denoConfig.imports?.["@supabase/supabase-js"]).toBe(
      "https://esm.sh/@supabase/supabase-js@2.49.1",
    );
  });

  it("adds retryable finalization fields and a finalizer index", () => {
    expect(migrationSql).toContain("ADD COLUMN IF NOT EXISTS finalization_started_at");
    expect(migrationSql).toContain("ADD COLUMN IF NOT EXISTS finalization_attempted_at");
    expect(migrationSql).toContain("ADD COLUMN IF NOT EXISTS finalization_attempt_count");
    expect(migrationSql).toContain("ADD COLUMN IF NOT EXISTS finalization_error");
    expect(migrationSql).toContain("ADD COLUMN IF NOT EXISTS app_data_deleted_at");
    expect(migrationSql).toContain("ADD COLUMN IF NOT EXISTS auth_user_deleted_at");
    expect(migrationSql).toContain("ADD COLUMN IF NOT EXISTS finalized_at");
    expect(migrationSql).toContain("idx_account_deletion_requests_finalizer_ready");
    expect(migrationSql).toContain("CHECK (finalization_attempt_count >= 0)");
  });

  it("retains a minimal request log after Auth user deletion", () => {
    expect(migrationSql).toContain("ALTER COLUMN user_id DROP NOT NULL");
    expect(migrationSql).toContain("ON DELETE SET NULL");
    expect(migrationSql).toContain("email = NULL");
    expect(migrationSql).toContain("note = NULL");
    expect(migrationSql).toContain("archived_child_ids = ARRAY[]::uuid[]");
    expect(migrationSql).toContain("status = 'completed'");
    expect(migrationSql).not.toContain("DELETE FROM public.account_deletion_requests");
  });

  it("claims only expired requested or processing deletion requests", () => {
    expect(migrationSql).toContain("CREATE OR REPLACE FUNCTION public.claim_expired_account_deletion_requests");
    expect(migrationSql).toContain("request.status IN ('requested', 'processing')");
    expect(migrationSql).toContain("request.completed_at IS NULL");
    expect(migrationSql).toContain(
      "COALESCE(request.grace_ends_at, request.requested_at + interval '30 days') <= now()",
    );
    expect(migrationSql).toContain("FOR UPDATE SKIP LOCKED");
    expect(migrationSql).not.toContain("request.status IN ('cancelled'");
  });

  it("deletes child-owned data and child profiles before Auth deletion", () => {
    expect(migrationSql).toContain("DELETE FROM public.child_achievements");
    expect(migrationSql).toContain("DELETE FROM public.child_stage_progress");
    expect(migrationSql).toContain("DELETE FROM public.child_activity_progress");
    expect(migrationSql).toContain("DELETE FROM public.activities");
    expect(migrationSql).toContain("DELETE FROM public.children");
    expect(edgeFunctionTs).toContain("finalize_expired_account_deletion_request_app_data");
    expect(edgeFunctionTs).toContain("supabase.auth.admin.deleteUser");
    expect(edgeFunctionTs.indexOf("\"finalize_expired_account_deletion_request_app_data\"")).toBeLessThan(
      edgeFunctionTs.indexOf("await deleteAuthUser"),
    );
  });

  it("does not delete shared or global content", () => {
    expect(migrationSql).not.toContain("DELETE FROM public.content_items");
    expect(migrationSql).not.toContain("DELETE FROM public.achievements");
    expect(migrationSql).not.toContain("DELETE FROM public.languages");
    expect(migrationSql).not.toContain("DROP TABLE public.content_items");
    expect(migrationSql).not.toContain("DROP TABLE public.achievements");
    expect(migrationSql).not.toContain("DROP TABLE public.languages");
  });

  it("keeps finalizer RPCs service-role only", () => {
    expect(migrationSql).toContain("SECURITY DEFINER");
    expect(migrationSql).toContain("REVOKE ALL ON FUNCTION public.claim_expired_account_deletion_requests");
    expect(migrationSql).toContain("TO service_role");
    expect(migrationSql).not.toContain("GRANT EXECUTE ON FUNCTION public.claim_expired_account_deletion_requests(integer, boolean) TO authenticated");
    expect(migrationSql).not.toContain("GRANT EXECUTE ON FUNCTION public.finalize_expired_account_deletion_request_app_data(uuid, boolean) TO authenticated");
  });

  it("requires an admin secret and supports dry-run mode in the Edge Function", () => {
    expect(edgeFunctionTs).toContain("BABY_STEPS_ACCOUNT_DELETION_ADMIN_SECRET");
    expect(edgeFunctionTs).toContain("x-baby-steps-admin-secret");
    expect(edgeFunctionTs).toContain("return jsonResponse(401");
    expect(edgeFunctionTs).toContain('request.method === "POST" && runModeRequested');
    expect(edgeFunctionTs).toContain("Real account deletion finalization requires POST with mode=run.");
    expect(edgeFunctionTs).toContain("p_dry_run: options.dryRun");
    expect(edgeFunctionTs).toContain("authUserDeletion: userId ? \"would_delete\" : \"already_deleted\"");
  });

  it("does not accept client-provided request or user ids for finalization targeting", () => {
    expect(edgeFunctionTs).toContain("\"claim_expired_account_deletion_requests\"");
    expect(edgeFunctionTs).not.toContain("body.requestId");
    expect(edgeFunctionTs).not.toContain("body.request_id");
    expect(edgeFunctionTs).not.toContain("body.userId");
    expect(edgeFunctionTs).not.toContain("body.user_id");
  });

  it("uses the service-role key only in Supabase functions, not the React Native client", () => {
    const clientFiles = readProjectFiles(["app", "components", "context", "content", "lib", "utils"]);
    const forbiddenPatterns = [
      new RegExp("SUPABASE_" + "SERVICE_ROLE_KEY"),
      new RegExp("service" + "_role"),
      new RegExp("supabase\\.auth\\.admin"),
      new RegExp("delete" + "User"),
    ];

    const offenders = clientFiles
      .filter((file) => forbiddenPatterns.some((pattern) => pattern.test(file.content)))
      .map((file) => file.relativePath);

    expect(offenders).toEqual([]);
  });
});
