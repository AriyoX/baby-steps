import { readFileSync } from "fs"
import path from "path"

const migrationPath = path.join(
  __dirname,
  "..",
  "20260718215448_add_child_learning_streaks.sql",
)

describe("child learning streak migration", () => {
  const sql = readFileSync(migrationPath, "utf8")

  it("stores explicit epochs, per-child preferences, and one day per epoch", () => {
    expect(sql).toContain("CREATE TABLE public.child_streak_epochs")
    expect(sql).toContain("CREATE TABLE public.child_streak_preferences")
    expect(sql).toContain("CREATE TABLE public.child_streak_days")
    expect(sql).toContain("UNIQUE (child_id, streak_epoch_id, local_date)")
    expect(sql).toContain("child_streak_epochs_one_active_per_child")
    expect(sql).toContain("first_completed_at timestamp with time zone")
    expect(sql).toContain("first_timezone text NOT NULL")
    expect(sql).toContain("last_completed_at timestamp with time zone")
    expect(sql).toContain("last_timezone text NOT NULL")
    expect(sql).not.toMatch(/\n\s+timezone text/)
    expect(sql).toContain("streak_epoch_id")
    expect(sql).not.toMatch(/child_age|selected_language_code/)
  })

  it("uses parent-owned read policies and revokes direct table writes", () => {
    expect(sql.match(/ENABLE ROW LEVEL SECURITY/g)).toHaveLength(3)
    expect(sql).toContain("child.parent_id = (SELECT auth.uid())")
    expect(sql).toContain("child.deleted_at IS NULL")
    for (const table of [
      "child_streak_preferences",
      "child_streak_epochs",
      "child_streak_days",
    ]) {
      expect(sql).toContain(`REVOKE ALL ON public.${table} FROM PUBLIC, anon, authenticated`)
      expect(sql).toContain(`GRANT SELECT ON public.${table} TO authenticated`)
      expect(sql).toContain(`CREATE POLICY ${table}_parent_select`)
    }
    expect(sql).not.toMatch(/CREATE POLICY[\s\S]{0,120}FOR (INSERT|UPDATE|DELETE)/)
  })

  it("exposes only guarded RPC writes to authenticated accounts", () => {
    for (const functionName of [
      "create_child_streak_state",
      "set_child_streak_enabled",
      "reset_child_streak",
      "set_child_streak_reminder_participation",
      "upsert_child_streak_day",
    ]) {
      expect(sql).toContain(`CREATE OR REPLACE FUNCTION public.${functionName}`)
      expect(sql).toContain(`GRANT EXECUTE ON FUNCTION public.${functionName}`)
    }
    expect(sql).toContain("SECURITY DEFINER")
    expect(sql).toContain("SET search_path = ''")
    expect(sql).toContain("v_owner IS DISTINCT FROM (SELECT auth.uid())")
    expect(sql).toContain("'applied'")
    expect(sql).toContain("'no_op'")
    expect(sql).toContain("'stale'")
    expect(sql).toContain("'rejected'")
    expect(sql).toContain("equal_timestamp_conflict")
    expect(sql).toContain("occurred_before_reset_at")
    expect(sql).toContain("no_valid_boundary")
    for (const helper of [
      "child_streak_state_result",
      "normalize_child_streak_epoch_days",
      "set_child_streak_updated_at",
      "initialize_child_streak_after_insert",
    ]) {
      expect(sql).toMatch(new RegExp(`REVOKE (?:ALL|EXECUTE) ON FUNCTION public\\.${helper}`))
    }
  })

  it("initializes existing children at launch and new children at creation", () => {
    expect(sql).toContain("initialize_child_streak_after_insert")
    expect(sql).toContain("CREATE TRIGGER initialize_child_streak_on_insert")
    expect(sql).toContain("missing_children AS MATERIALIZED")
    expect(sql).toContain("SELECT transaction_timestamp() AS launched_at")
    expect(sql).toContain("launch_boundary.launched_at AS started_at")
    expect(sql).toContain("COALESCE(NEW.created_at, now())")
    expect(sql).toContain("WHERE child.deleted_at IS NULL")
  })

  it("uses a deferred active-epoch reference that permits parent cascades", () => {
    expect(sql).toContain("CONSTRAINT child_streak_preferences_current_epoch_fk")
    expect(sql).toContain("ON DELETE NO ACTION")
    expect(sql).toContain("DEFERRABLE INITIALLY DEFERRED")
    expect(sql.match(/REFERENCES public\.children\(id\)\s+ON DELETE CASCADE/g)).toHaveLength(3)
  })
})
