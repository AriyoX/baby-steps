import fs from "fs";
import path from "path";

const migrationsDir = path.join(__dirname, "..");
const migrationFile = fs
  .readdirSync(migrationsDir)
  .find((file) => file.endsWith("_seed_learning_hub_achievements.sql"));

if (!migrationFile) {
  throw new Error("Missing Learning Hub achievements seed migration");
}

const migrationSql = fs.readFileSync(
  path.join(migrationsDir, migrationFile),
  "utf8",
);

const learningHubAchievementIds = [
  "7d4f6a00-4b5f-4e00-9a10-000000000101",
  "7d4f6a00-4b5f-4e00-9a10-000000000102",
  "7d4f6a00-4b5f-4e00-9a10-000000000103",
  "7d4f6a00-4b5f-4e00-9a10-000000000104",
  "7d4f6a00-4b5f-4e00-9a10-000000000105",
];

describe("Learning Hub achievements seed migration", () => {
  it("seeds the stable Learning Hub achievement definitions", () => {
    expect(migrationSql).toContain("INSERT INTO public.achievements");
    expect(migrationSql).toContain("ON CONFLICT (id) DO UPDATE");
    expect(migrationSql).toContain("'learning_hub'");

    for (const achievementId of learningHubAchievementIds) {
      expect(migrationSql).toContain(achievementId);
    }
  });

  it("uses the expected simple Learning Hub achievement conditions", () => {
    expect(migrationSql).toContain("'learning_hub_first_lesson'");
    expect(migrationSql).toContain("'learning_hub_lessons_completed'");
    expect(migrationSql).toContain("'learning_hub_first_words_complete'");
    expect(migrationSql).toContain("'learning_hub_mini_quiz_lesson'");
    expect(migrationSql).toContain("'learning_hub_story_bite_lesson'");
    expect(migrationSql).toMatch(
      /'learning_hub_lessons_completed'[\s\S]*?15,\s*3,\s*'learning_hub'/,
    );
  });

  it("does not change achievement schema shape", () => {
    expect(migrationSql).not.toContain("CREATE TABLE");
    expect(migrationSql).not.toContain("ALTER TABLE");
    expect(migrationSql).not.toContain("child_achievements");
  });
});
