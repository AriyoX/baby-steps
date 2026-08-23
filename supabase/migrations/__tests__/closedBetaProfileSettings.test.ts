import fs from "node:fs";
import path from "node:path";

const migration = fs.readFileSync(
  path.resolve(
    __dirname,
    "..",
    "20260723124201_closed_beta_profile_settings.sql",
  ),
  "utf8",
);

describe("closed-beta profile settings migration", () => {
  it("creates only the minimal parent profile and protects ownership", () => {
    expect(migration).toMatch(
      /CREATE TABLE public\.parent_profiles \(\s*id uuid PRIMARY KEY REFERENCES auth\.users\(id\) ON DELETE CASCADE,\s*display_name text,/,
    );
    expect(migration).toContain(
      "ALTER TABLE public.parent_profiles ENABLE ROW LEVEL SECURITY;",
    );
    expect(migration).toMatch(
      /parent_profiles_parent_update[\s\S]*USING \(id = \(SELECT auth\.uid\(\)\)\)[\s\S]*WITH CHECK \(id = \(SELECT auth\.uid\(\)\)\)/,
    );
    const parentTableDefinition = migration.match(
      /CREATE TABLE public\.parent_profiles \(([\s\S]*?)\n\);/,
    )?.[1] ?? "";
    expect(parentTableDefinition).not.toMatch(
      /\b(phone|address|avatar|birth|gender|role|payment)\b/i,
    );
  });

  it("allows clients to update only profile-edit columns on children", () => {
    expect(migration).toMatch(
      /REVOKE INSERT, UPDATE ON TABLE public\.children FROM authenticated;/,
    );
    const updateGrant = migration.match(
      /GRANT UPDATE \(([^;]*?)\) ON TABLE public\.children TO authenticated;/,
    )?.[1];
    expect(updateGrant).toBeDefined();
    expect(updateGrant).toContain("name");
    expect(updateGrant).toContain("gender");
    expect(updateGrant).toContain("age");
    expect(updateGrant).toContain("reason");
    expect(updateGrant).toContain("selected_language_code");
    for (const forbiddenColumn of [
      "id",
      "parent_id",
      "created_at",
      "deleted_at",
      "archived_by_account_deletion_request_id",
    ]) {
      expect(updateGrant).not.toMatch(
        new RegExp(`(^|\\W)${forbiddenColumn}(\\W|$)`),
      );
    }
  });

  it("preserves legacy ages unless an edit changes the age", () => {
    expect(migration).toMatch(
      /IF NEW\.age IS DISTINCT FROM OLD\.age[\s\S]*NEW\.age NOT IN \('3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '12\+'\)/,
    );
    expect(migration).toMatch(
      /IF NEW\.name IS DISTINCT FROM OLD\.name/,
    );
  });

  it("archives through an authenticated ownership-checking SECURITY DEFINER RPC", () => {
    expect(migration).toMatch(
      /FUNCTION public\.archive_child_profile\(p_child_id uuid\)[\s\S]*SECURITY DEFINER[\s\S]*SET search_path = ''/,
    );
    expect(migration).toMatch(
      /WHERE id = p_child_id\s+AND parent_id = v_parent_id\s+AND deleted_at IS NULL/,
    );
    expect(migration).toMatch(
      /REVOKE ALL ON FUNCTION public\.archive_child_profile\(uuid\)[\s\S]*FROM PUBLIC, anon, authenticated, service_role;/,
    );
    expect(migration).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.archive_child_profile\(uuid\)\s+TO authenticated, service_role;/,
    );
  });

  it("contains no destructive data changes, broad client grants, cron, or network calls", () => {
    expect(migration).not.toMatch(/\bDELETE\s+FROM\b/i);
    expect(migration).not.toMatch(/\bTRUNCATE\b/i);
    expect(migration).not.toMatch(
      /GRANT ALL ON TABLE public\.(?:children|parent_profiles) TO authenticated/i,
    );
    expect(migration).not.toMatch(/\bcron\./i);
    expect(migration).not.toMatch(/\b(?:http|net)\./i);
  });
});
