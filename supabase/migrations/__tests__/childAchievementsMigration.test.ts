import { readFileSync } from "fs";
import path from "path";

const migrationPath = path.join(
  __dirname,
  "..",
  "20260701000000_add_child_achievements_unique_constraint.sql",
);

describe("child achievements uniqueness migration", () => {
  const migrationSql = readFileSync(migrationPath, "utf8");

  it("deduplicates existing child achievement rows before adding the constraint", () => {
    expect(migrationSql).toContain("ROW_NUMBER() OVER");
    expect(migrationSql).toContain("PARTITION BY child_id, achievement_id");
    expect(migrationSql).toContain("DELETE FROM public.child_achievements");
    expect(migrationSql).toContain("duplicate_rank > 1");
  });

  it("adds one achievement row per child as an idempotent database constraint", () => {
    expect(migrationSql).toContain("IF NOT EXISTS");
    expect(migrationSql).toContain("child_achievements_unique_child_achievement");
    expect(migrationSql).toContain("UNIQUE (child_id, achievement_id)");
    expect(migrationSql).not.toContain("CREATE TABLE IF NOT EXISTS public.child_achievement_progress");
  });
});
