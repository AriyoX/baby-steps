import { readFileSync } from "fs";
import path from "path";

const migrationPath = path.join(
  __dirname,
  "..",
  "20260619001000_add_mvp_content_items.sql",
);

describe("MVP content items Supabase migration", () => {
  const migrationSql = readFileSync(migrationPath, "utf8");

  it("creates flexible MVP content storage rather than CMS tables", () => {
    expect(migrationSql).toContain("CREATE TABLE IF NOT EXISTS public.content_items");
    expect(migrationSql).toContain("payload jsonb NOT NULL DEFAULT '{}'::jsonb");
    expect(migrationSql).toContain("This is intentionally not a CMS");
    expect(migrationSql).not.toContain("CREATE TABLE IF NOT EXISTS public.lessons");
    expect(migrationSql).not.toContain("CREATE TABLE IF NOT EXISTS public.story_pages");
  });

  it("links content to languages and protects query performance", () => {
    expect(migrationSql).toContain("FOREIGN KEY (language_code)");
    expect(migrationSql).toContain("REFERENCES public.languages(code)");
    expect(migrationSql).toContain("content_items_unique_language_type_slug");
    expect(migrationSql).toContain("idx_content_items_language_type_active");
    expect(migrationSql).toContain("idx_content_items_payload_gin");
  });

  it("seeds Luganda and Runyankole sample content for the vertical slice", () => {
    expect(migrationSql).toContain("'lg'");
    expect(migrationSql).toContain("'nyn'");
    expect(migrationSql).toContain("'child_menu'");
    expect(migrationSql).toContain("'learning_game'");
    expect(migrationSql).toContain("'word_game'");
    expect(migrationSql).toContain("'counting_game'");
    expect(migrationSql).toContain("'story'");
    expect(migrationSql).toContain("'stories'");
    expect(migrationSql).not.toMatch(/'child_menu',\s*'Stories'/);
    expect(migrationSql).not.toMatch(/'Child_Menu'|'Learning_Game'|'Word_Game'|'Counting_Game'|'Story'/);
    expect(migrationSql).toContain("nyn-sample-morning-greeting");
  });
});
