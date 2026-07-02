import { readFileSync } from "fs";
import path from "path";

const migrationPath = path.join(
  __dirname,
  "..",
  "20260701002000_add_account_management_soft_deletion.sql",
);
const gracePeriodMigrationPath = path.join(
  __dirname,
  "..",
  "20260702000000_add_account_deletion_grace_period.sql",
);
const lifecycleRpcMigrationPath = path.join(
  __dirname,
  "..",
  "20260702001000_add_account_deletion_lifecycle_rpcs.sql",
);

describe("account management soft deletion migration", () => {
  const migrationSql = readFileSync(migrationPath, "utf8");
  const gracePeriodMigrationSql = readFileSync(gracePeriodMigrationPath, "utf8");
  const lifecycleRpcMigrationSql = readFileSync(lifecycleRpcMigrationPath, "utf8");

  it("adds child profile archive support without hard-deleting history", () => {
    expect(migrationSql).toContain("ADD COLUMN IF NOT EXISTS deleted_at");
    expect(migrationSql).toContain("idx_children_parent_deleted_at_created_at");
    expect(migrationSql).toContain("children_parent_update");
    expect(migrationSql).not.toContain("DELETE FROM public.activities");
    expect(migrationSql).not.toContain("DELETE FROM public.child_achievements");
  });

  it("records account deletion requests for a server-side auth deletion worker", () => {
    expect(migrationSql).toContain("CREATE TABLE IF NOT EXISTS public.account_deletion_requests");
    expect(migrationSql).toContain("user_id uuid NOT NULL");
    expect(migrationSql).toContain("Final Supabase auth user deletion requires a secure server-side admin function");
    expect(migrationSql).toContain("account_deletion_requests_parent_insert");
  });

  it("does not cascade-delete shared content definitions", () => {
    expect(migrationSql).not.toContain("DROP TABLE public.content_items");
    expect(migrationSql).not.toContain("DROP TABLE public.achievements");
    expect(migrationSql).not.toContain("DROP TABLE public.languages");
    expect(migrationSql).not.toContain("DELETE FROM public.content_items");
    expect(migrationSql).not.toContain("DELETE FROM public.achievements");
    expect(migrationSql).not.toContain("DELETE FROM public.languages");
  });

  it("adds grace-period and reactivation support without client hard deletes", () => {
    expect(gracePeriodMigrationSql).toContain("ADD COLUMN IF NOT EXISTS grace_ends_at");
    expect(gracePeriodMigrationSql).toContain("ADD COLUMN IF NOT EXISTS cancelled_at");
    expect(gracePeriodMigrationSql).toContain("ADD COLUMN IF NOT EXISTS reactivated_at");
    expect(gracePeriodMigrationSql).toContain("ADD COLUMN IF NOT EXISTS completed_at");
    expect(gracePeriodMigrationSql).toContain("archived_child_ids uuid[]");
    expect(gracePeriodMigrationSql).toContain(
      "ADD COLUMN IF NOT EXISTS archived_by_account_deletion_request_id",
    );
    expect(gracePeriodMigrationSql).toContain("account_deletion_requests_parent_update");
    expect(gracePeriodMigrationSql).toContain("after grace_ends_at");
    expect(gracePeriodMigrationSql).toContain("Supabase Auth user");
    expect(gracePeriodMigrationSql).not.toContain("DELETE FROM public.children");
    expect(gracePeriodMigrationSql).not.toContain("DELETE FROM auth.users");
  });

  it("adds transactional RPCs scoped to the authenticated user", () => {
    expect(lifecycleRpcMigrationSql).toContain(
      "CREATE OR REPLACE FUNCTION public.request_account_deletion_with_grace",
    );
    expect(lifecycleRpcMigrationSql).toContain(
      "CREATE OR REPLACE FUNCTION public.reactivate_account_deletion",
    );
    expect(lifecycleRpcMigrationSql).toContain("SECURITY DEFINER");
    expect(lifecycleRpcMigrationSql).toContain("SET search_path = public, pg_temp");
    expect(lifecycleRpcMigrationSql).toContain("v_user_id uuid := auth.uid()");
    expect(lifecycleRpcMigrationSql).toContain("pg_advisory_xact_lock");
    expect(lifecycleRpcMigrationSql).toContain("GRANT EXECUTE");
    expect(lifecycleRpcMigrationSql).not.toContain("service_role");
    expect(lifecycleRpcMigrationSql).not.toContain("DELETE FROM auth.users");
  });

  it("prevents duplicate active deletion requests and reuses the latest open request", () => {
    expect(lifecycleRpcMigrationSql).toContain(
      "idx_account_deletion_requests_one_open_per_user",
    );
    expect(lifecycleRpcMigrationSql).toContain("DROP POLICY IF EXISTS account_deletion_requests_parent_insert");
    expect(lifecycleRpcMigrationSql).toContain("DROP POLICY IF EXISTS account_deletion_requests_parent_update");
    expect(lifecycleRpcMigrationSql).toContain("first_value(id) OVER");
    expect(lifecycleRpcMigrationSql).toContain("duplicate_rank > 1");
    expect(lifecycleRpcMigrationSql).toContain("status IN ('requested', 'processing')");
    expect(lifecycleRpcMigrationSql).toContain("ORDER BY requested_at DESC");
    expect(lifecycleRpcMigrationSql).toContain("UPDATE public.account_deletion_requests");
    expect(lifecycleRpcMigrationSql).toContain("id <> v_request.id");
    expect(lifecycleRpcMigrationSql).toContain("status = 'cancelled'");
    expect(lifecycleRpcMigrationSql).not.toContain(".insert([");
  });

  it("archives only active children and marks them with the matching request id", () => {
    expect(lifecycleRpcMigrationSql).toMatch(
      /UPDATE public\.children[\s\S]*deleted_at = v_requested_at[\s\S]*archived_by_account_deletion_request_id = v_request\.id[\s\S]*deleted_at IS NULL/,
    );
    expect(lifecycleRpcMigrationSql).toContain(
      "archived_by_account_deletion_request_id = v_request.id",
    );
  });

  it("does not mark manually archived children during account deletion", () => {
    expect(lifecycleRpcMigrationSql).toContain("AND deleted_at IS NULL");
    expect(lifecycleRpcMigrationSql).not.toContain("archived_by_account_deletion_request_id IS NULL");
  });

  it("reactivates by restoring only children marked by the matching request", () => {
    expect(lifecycleRpcMigrationSql).toMatch(
      /UPDATE public\.children[\s\S]*deleted_at = NULL[\s\S]*archived_by_account_deletion_request_id = NULL[\s\S]*archived_by_account_deletion_request_id = v_request\.id/,
    );
    expect(lifecycleRpcMigrationSql).toContain("cancelled_at = v_reactivated_at");
    expect(lifecycleRpcMigrationSql).toContain("reactivated_at = v_reactivated_at");
    expect(lifecycleRpcMigrationSql).toContain(
      "The account deletion grace period has ended.",
    );
  });

  it("does not touch shared or global content in lifecycle RPCs", () => {
    expect(lifecycleRpcMigrationSql).not.toContain("public.content_items");
    expect(lifecycleRpcMigrationSql).not.toContain("public.achievements");
    expect(lifecycleRpcMigrationSql).not.toContain("public.languages");
    expect(lifecycleRpcMigrationSql).not.toContain("DELETE FROM public.children");
  });
});
