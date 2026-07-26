import fs from "node:fs";
import path from "node:path";

const migration = fs.readFileSync(
  path.resolve(
    __dirname,
    "..",
    "20260723100638_closed_beta_security_hardening.sql",
  ),
  "utf8",
);

describe("closed-beta Supabase hardening migration", () => {
  it.each([
    "languages",
    "achievements",
    "activities",
    "child_achievements",
  ])("enables RLS on public.%s", (table) => {
    expect(migration).toMatch(
      new RegExp(`ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY`, "i"),
    );
  });

  it.each([
    "activities",
    "child_achievements",
    "child_activity_progress",
    "child_stage_progress",
  ])("scopes public.%s rows through the owned active child", (table) => {
    const policyStart = migration.indexOf(`ON public.${table}`);
    expect(policyStart).toBeGreaterThanOrEqual(0);
    const policyWindow = migration.slice(policyStart, policyStart + 1_200);
    expect(policyWindow).toContain("child.parent_id = (SELECT auth.uid())");
    expect(policyWindow).toContain("child.deleted_at IS NULL");
  });

  it("keeps two unrelated parents separated at the children policy boundary", () => {
    expect(migration).toMatch(
      /CREATE POLICY children_parent_select[\s\S]*USING \(parent_id = \(SELECT auth\.uid\(\)\)\)/,
    );
    expect(migration).toMatch(
      /CREATE POLICY children_parent_insert[\s\S]*WITH CHECK \(parent_id = \(SELECT auth\.uid\(\)\)\)/,
    );
    expect(migration).toMatch(
      /CREATE POLICY children_parent_update[\s\S]*USING \(parent_id = \(SELECT auth\.uid\(\)\)\)[\s\S]*WITH CHECK \(parent_id = \(SELECT auth\.uid\(\)\)\)/,
    );
  });

  it("removes client execution from account-deletion finalizer helpers", () => {
    for (const functionName of [
      "claim_expired_account_deletion_requests",
      "finalize_expired_account_deletion_request_app_data",
      "complete_finalized_account_deletion_request",
      "record_account_deletion_finalization_failure",
    ]) {
      expect(migration).toMatch(
        new RegExp(
          `REVOKE ALL ON FUNCTION public\\.${functionName}[\\s\\S]*?FROM PUBLIC, anon, authenticated`,
          "i",
        ),
      );
    }
    expect(migration).toContain("TO service_role;");
  });

  it("keeps reference content read-only and unpublished drafts inaccessible", () => {
    expect(migration).toMatch(
      /GRANT SELECT ON TABLE public\.content_items TO anon, authenticated/,
    );
    expect(migration).not.toMatch(
      /GRANT (?:INSERT|UPDATE|DELETE|ALL)[^;]*public\.content_items[^;]*TO (?:anon|authenticated)/,
    );
    expect(migration).toContain("editorial_status = 'published'");
    expect(migration).toContain("is_startable = true");
    expect(migration).toContain(
      "COALESCE(payload #>> '{metadata,status}', '') <> 'reviewed'",
    );
  });

  it("locks down trigger search paths and adds the advisor-requested indexes", () => {
    expect(migration).toContain(
      "ALTER FUNCTION public.set_progress_updated_at() SET search_path = '';",
    );
    expect(migration).toContain(
      "ALTER FUNCTION public.set_account_deletion_requests_updated_at() SET search_path = '';",
    );
    for (const indexName of [
      "activities_language_code_idx",
      "child_achievements_achievement_id_idx",
      "child_activity_progress_language_code_idx",
      "child_stage_progress_language_code_idx",
      "child_streak_preferences_current_epoch_idx",
    ]) {
      expect(migration).toContain(`CREATE INDEX IF NOT EXISTS ${indexName}`);
    }
  });

  it("scopes earned achievements by child and exact learning language", () => {
    expect(migration).toContain(
      "ALTER TABLE public.child_achievements\nADD COLUMN language_code text;",
    );
    expect(migration).toMatch(
      /UPDATE public\.child_achievements\s+SET language_code = 'lg'\s+WHERE language_code IS NULL;/,
    );
    expect(migration).toContain(
      "UNIQUE (child_id, language_code, achievement_id)",
    );
    expect(migration).toContain(
      "FOREIGN KEY (language_code)\nREFERENCES public.languages(code)",
    );
  });

  it("prevents progress rows from being reassigned to another identity", () => {
    expect(migration).toMatch(
      /FUNCTION public\.enforce_child_activity_progress_identity\(\)[\s\S]*NEW\.child_id IS DISTINCT FROM OLD\.child_id[\s\S]*NEW\.language_code IS DISTINCT FROM OLD\.language_code[\s\S]*NEW\.activity_type IS DISTINCT FROM OLD\.activity_type/,
    );
    expect(migration).toMatch(
      /FUNCTION public\.enforce_child_stage_progress_identity\(\)[\s\S]*NEW\.stage_id IS DISTINCT FROM OLD\.stage_id[\s\S]*NEW\.level_id IS DISTINCT FROM OLD\.level_id/,
    );
    expect(migration).toMatch(
      /BEFORE UPDATE ON public\.child_activity_progress/,
    );
    expect(migration).toMatch(
      /BEFORE UPDATE ON public\.child_stage_progress/,
    );
  });

  it("does not rewrite already-withdrawn placeholder rows on every run", () => {
    expect(migration).toMatch(
      /WHERE content_type = 'story'[\s\S]*editorial_status IS DISTINCT FROM 'draft'[\s\S]*is_startable IS DISTINCT FROM false[\s\S]*published_at IS NOT NULL/,
    );
    expect(migration).not.toMatch(/\bDELETE\s+FROM\b/i);
  });

  it("is one explicit transaction without concurrent indexes, extensions, HTTP, or cron", () => {
    expect((migration.match(/\bBEGIN;/gi) ?? [])).toHaveLength(1);
    expect((migration.match(/\bCOMMIT;/gi) ?? [])).toHaveLength(1);
    expect(migration).not.toMatch(/CREATE\s+INDEX\s+CONCURRENTLY/i);
    expect(migration).not.toMatch(/CREATE\s+EXTENSION/i);
    expect(migration).not.toMatch(/\b(?:http|net)\./i);
    expect(migration).not.toMatch(/\bcron\./i);
  });
});
