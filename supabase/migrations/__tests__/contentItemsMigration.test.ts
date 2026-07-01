import { readFileSync } from "fs";
import path from "path";

const migrationPath = path.join(
  __dirname,
  "..",
  "20260619001000_add_mvp_content_items.sql",
);
const lugandaStoriesMigrationPath = path.join(
  __dirname,
  "..",
  "20260701001000_migrate_luganda_stories_to_content_items.sql",
);

const migratedLugandaStoryIds = [
  "kintu",
  "mwanga",
  "kasubi-tombs",
  "walumbe",
  "ssezibwa",
  "millet",
  "kasokambirye",
  "fig-tree",
];

const legacyStoryRoutePattern =
  /child\/stories\/(kintustory|mwangastory|kasubitombsstory|walumbestory|ssezibwafallsstory|milletstory|kasokambiryestory|figtreestory)/;

const parseJsonPayloads = (sql: string): unknown[] =>
  [...sql.matchAll(/\$json\$([\s\S]*?)\$json\$/g)].map((match) =>
    JSON.parse(match[1]),
  );

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const getStoryMenuPayloads = (sql: string): Array<{ cards: Array<Record<string, unknown>> }> =>
  parseJsonPayloads(sql).filter((payload): payload is { cards: Array<Record<string, unknown>> } => {
    if (!isRecord(payload) || !Array.isArray(payload.cards)) return false;

    return payload.cards.some((card) =>
      isRecord(card) &&
      typeof card.targetPage === "string" &&
      card.targetPage.startsWith("child/stories/"),
    );
  });

describe("MVP content items Supabase migration", () => {
  const migrationSql = readFileSync(migrationPath, "utf8");
  const lugandaStoriesMigrationSql = readFileSync(
    lugandaStoriesMigrationPath,
    "utf8",
  );
  const allContentMigrationSql = `${migrationSql}\n${lugandaStoriesMigrationSql}`;

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
    expect(allContentMigrationSql).toContain("'story'");
    expect(allContentMigrationSql).toContain("'stories'");
    expect(allContentMigrationSql).not.toMatch(/'child_menu',\s*'Stories'/);
    expect(allContentMigrationSql).not.toMatch(/'Child_Menu'|'Learning_Game'|'Word_Game'|'Counting_Game'|'Story'/);
    expect(allContentMigrationSql).toContain("nyn-sample-morning-greeting");
  });

  it("migrates Luganda story rows with generic menu targets and idempotent upserts", () => {
    expect(lugandaStoriesMigrationSql).toContain(
      "old hardcoded Luganda story routes",
    );
    expect(lugandaStoriesMigrationSql).toContain(
      "ON CONFLICT (language_code, content_type, slug) DO UPDATE",
    );

    for (const storyId of migratedLugandaStoryIds) {
      expect(lugandaStoriesMigrationSql).toContain(`"id": "${storyId}"`);
      expect(lugandaStoriesMigrationSql).toContain(
        `"targetPage": "child/stories/${storyId}"`,
      );
    }

    expect(lugandaStoriesMigrationSql).toContain(
      "Long ago, Kintu was the first person on Earth.",
    );
    expect(lugandaStoriesMigrationSql).toContain(
      "What was special about the Mutuba fig tree?",
    );
    expect(lugandaStoriesMigrationSql).not.toMatch(
      legacyStoryRoutePattern,
    );
  });

  it("ends a fresh full migration chain with generic Luganda story menu targets", () => {
    const storyMenuPayloads = getStoryMenuPayloads(allContentMigrationSql);
    const finalStoryMenu = storyMenuPayloads.at(-1);

    expect(storyMenuPayloads.length).toBeGreaterThanOrEqual(2);
    expect(finalStoryMenu).toBeDefined();
    expect(JSON.stringify(finalStoryMenu)).not.toMatch(legacyStoryRoutePattern);
    expect(finalStoryMenu?.cards.map((card) => card.targetPage)).toEqual(
      migratedLugandaStoryIds.map((storyId) => `child/stories/${storyId}`),
    );
  });
});
