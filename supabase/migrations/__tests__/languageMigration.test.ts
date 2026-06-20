import { readFileSync } from "fs";
import path from "path";
import { LEARNING_LANGUAGES } from "@/content/languages";

const migrationPath = path.join(
  __dirname,
  "..",
  "20260619000000_add_child_language_support.sql",
);

describe("child language Supabase migration", () => {
  const migrationSql = readFileSync(migrationPath, "utf8");

  it("creates the minimal language profile schema", () => {
    expect(migrationSql).toContain("CREATE TABLE IF NOT EXISTS public.languages");
    expect(migrationSql).toContain("ADD COLUMN IF NOT EXISTS selected_language_code text");
    expect(migrationSql).toContain("ALTER COLUMN selected_language_code SET NOT NULL");
    expect(migrationSql).toContain("ADD COLUMN IF NOT EXISTS language_code text");
  });

  it("seeds every active local learning language code", () => {
    for (const language of LEARNING_LANGUAGES.filter((item) => item.isActive)) {
      expect(migrationSql).toContain(`'${language.code}'`);
    }
  });

  it("keeps historical activity rows nullable while requiring child profile language", () => {
    expect(migrationSql).toContain("Historical activity rows can remain NULL");
    expect(migrationSql).not.toContain("ALTER COLUMN language_code SET NOT NULL");
  });
});
