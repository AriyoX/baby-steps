import { readFileSync } from "fs";
import path from "path";

const migrationPath = path.join(
  __dirname,
  "..",
  "20260629000000_add_child_progress.sql",
);

describe("child progress Supabase migration", () => {
  const migrationSql = readFileSync(migrationPath, "utf8");

  it("adds current-progress tables without replacing activity history", () => {
    expect(migrationSql).toContain("CREATE TABLE IF NOT EXISTS public.child_activity_progress");
    expect(migrationSql).toContain("CREATE TABLE IF NOT EXISTS public.child_stage_progress");
    expect(migrationSql).toContain("Activities remain the append-only history/log table");
    expect(migrationSql).not.toContain("DROP TABLE public.activities");
    expect(migrationSql).not.toContain("CREATE TABLE IF NOT EXISTS public.child_achievement_progress");
  });

  it("scopes progress by child, language, activity, and stage where needed", () => {
    expect(migrationSql).toContain("UNIQUE (child_id, language_code, activity_type)");
    expect(migrationSql).toContain("UNIQUE (child_id, language_code, activity_type, stage_id, level_id)");
    expect(migrationSql).toContain("progress_payload jsonb NOT NULL DEFAULT '{}'::jsonb");
    expect(migrationSql).toContain("local_updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())");
    expect(migrationSql).toContain("server_updated_at timestamp with time zone NOT NULL");
    expect(migrationSql).toContain("completed_at timestamp with time zone");
  });

  it("guards MVP progress values with simple constraints", () => {
    expect(migrationSql).toContain("child_activity_progress_status_check");
    expect(migrationSql).toContain("CHECK (status IN ('not_started', 'in_progress', 'completed'))");
    expect(migrationSql).toContain("child_activity_progress_attempts_non_negative");
    expect(migrationSql).toContain("child_activity_progress_score_non_negative");
    expect(migrationSql).toContain("child_stage_progress_status_check");
    expect(migrationSql).toContain("child_stage_progress_stars_non_negative");
    expect(migrationSql).not.toContain("idx_child_activity_progress_payload_gin");
    expect(migrationSql).not.toContain("idx_child_stage_progress_payload_gin");
  });

  it("uses parent-owned child RLS policies", () => {
    expect(migrationSql).toContain("ENABLE ROW LEVEL SECURITY");
    expect(migrationSql).toContain("children.parent_id = auth.uid()");
    expect(migrationSql).toContain("child_activity_progress_parent_select");
    expect(migrationSql).toContain("child_stage_progress_parent_update");
  });
});
