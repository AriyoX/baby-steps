import { readFileSync } from "fs";
import path from "path";

const migrationPath = path.join(
  __dirname,
  "..",
  "20260714182326_database_backed_learning_content.sql",
);
const learningHubSourcePath = path.join(
  __dirname,
  "..",
  "..",
  "..",
  "content",
  "learningHubContent.json",
);

const compact = (value: string): string =>
  value.replace(/\s+/g, " ").trim().toLowerCase();

const withoutComments = (value: string): string => value.replace(/--.*$/gm, "");

const statements = (value: string): string[] =>
  withoutComments(value).split(";").map(compact).filter(Boolean);

const parseRoleList = (value: string): string[] =>
  value
    .split(",")
    .map((role) => role.trim())
    .filter(Boolean)
    .sort();

type SeedRecord = {
  languageCode: string;
  contentType: string;
  slug: string;
  payload: Record<string, unknown>;
  sortOrder: number;
  isActive: boolean;
  editorialStatus: string;
  isStartable: boolean;
  contentVersion: number;
  publishedAt: string;
};

const parseSeedRecords = (value: string): SeedRecord[] => {
  const records: SeedRecord[] = [];
  const insertPattern =
    /insert into public\.content_items\s*\(\s*language_code,\s*content_type,\s*slug,\s*title,\s*payload,\s*sort_order,\s*is_active,\s*editorial_status,\s*is_startable,\s*content_version,\s*published_at\s*\)\s*values\s*\(\s*'((?:[^']|'')*)',\s*'((?:[^']|'')*)',\s*'((?:[^']|'')*)',\s*'(?:[^']|'')*',\s*\$content\$([\s\S]*?)\$content\$::jsonb,\s*(-?\d+),\s*(true|false),\s*'((?:[^']|'')*)',\s*(true|false),\s*(\d+),\s*timestamptz\s*'([^']+)'\s*\)/gi;
  let match: RegExpExecArray | null;

  while ((match = insertPattern.exec(value)) !== null) {
    records.push({
      languageCode: match[1].replaceAll("''", "'"),
      contentType: match[2].replaceAll("''", "'"),
      slug: match[3].replaceAll("''", "'"),
      payload: JSON.parse(match[4]) as Record<string, unknown>,
      sortOrder: Number(match[5]),
      isActive: match[6].toLowerCase() === "true",
      editorialStatus: match[7].replaceAll("''", "'"),
      isStartable: match[8].toLowerCase() === "true",
      contentVersion: Number(match[9]),
      publishedAt: match[10],
    });
  }

  return records;
};

describe("database-backed learning content migration", () => {
  const migrationSql = readFileSync(migrationPath, "utf8");
  const normalizedSql = compact(withoutComments(migrationSql));
  const migrationStatements = statements(migrationSql);
  const seedRecords = parseSeedRecords(migrationSql);
  const seedsByKey = new Map(
    seedRecords.map((record) => [
      `${record.languageCode}:${record.contentType}:${record.slug}`,
      record,
    ]),
  );

  it("adds constrained editorial, launch, and cache-version metadata", () => {
    const columnStatement = migrationStatements.find((statement) =>
      statement.startsWith(
        "alter table public.content_items add column if not exists editorial_status",
      ),
    );

    expect(columnStatement).toBeDefined();

    const columnDefinitions = new Map<string, string>();
    const columnPattern = /add column if not exists ([a-z_]+) ([^,]+)(?:,|$)/g;
    let columnMatch: RegExpExecArray | null;

    while ((columnMatch = columnPattern.exec(columnStatement ?? "")) !== null) {
      columnDefinitions.set(columnMatch[1], compact(columnMatch[2]));
    }

    expect(columnDefinitions.get("editorial_status")).toBe(
      "text not null default 'draft'",
    );
    expect(columnDefinitions.get("is_startable")).toBe(
      "boolean not null default true",
    );
    expect(columnDefinitions.get("content_version")).toBe(
      "bigint not null default 1",
    );
    expect(columnDefinitions.get("published_at")).toBe(
      "timestamp with time zone",
    );

    const editorialCheck = normalizedSql.match(
      /add constraint content_items_editorial_status_check check \(editorial_status in \(([^)]+)\)\)/,
    );
    const allowedStatuses = editorialCheck?.[1]
      .split(",")
      .map((status) => status.trim().replaceAll("'", ""))
      .sort();

    expect(allowedStatuses).toEqual(["draft", "published", "reviewed"]);
    expect(normalizedSql).toMatch(
      /add constraint content_items_content_version_positive check \(content_version > 0\)/,
    );
  });

  it("upserts the eight canonical Luganda bundles as published and startable", () => {
    expect([...seedsByKey.keys()]).toEqual([
      "lg:child_menu:games",
      "lg:child_menu:coloring",
      "lg:learning_hub:curriculum",
      "lg:learning_game:starter",
      "lg:word_game:levels",
      "lg:counting_game:stages",
      "lg:card_game:cards",
      "lg:puzzle_game:puzzles",
    ]);
    expect(seedRecords.map((record) => record.sortOrder)).toEqual([
      10, 15, 25, 30, 40, 50, 55, 56,
    ]);
    expect(new Set(seedsByKey.keys()).size).toBe(8);

    for (const record of seedRecords) {
      expect(record.languageCode).toBe("lg");
      expect(record.isActive).toBe(true);
      expect(record.editorialStatus).toBe("published");
      expect(record.isStartable).toBe(true);
      expect(record.contentVersion).toBe(1);
      expect(record.publishedAt).toBe("2026-07-14 18:23:26+00");
    }

    const conflictClauses =
      migrationSql.match(
        /on conflict \(language_code, content_type, slug\) do update[\s\S]*?published_at = excluded\.published_at;/gi,
      ) ?? [];

    expect(conflictClauses).toHaveLength(8);
    for (const clause of conflictClauses) {
      const normalizedClause = compact(clause);
      expect(normalizedClause).toContain("payload = excluded.payload");
      expect(normalizedClause).toContain("sort_order = excluded.sort_order");
      expect(normalizedClause).toContain(
        "editorial_status = excluded.editorial_status",
      );
      expect(normalizedClause).toContain(
        "is_startable = excluded.is_startable",
      );
      expect(normalizedClause).toContain(
        "content_version = excluded.content_version",
      );
    }

    expect(migrationSql).not.toContain("tokens truncated");
  });

  it("preserves Learning Hub stage, lesson, item, mechanic, and ordering identities", () => {
    type HubItem = { id: string; order: number };
    type HubLesson = {
      id: string;
      order: number;
      mechanic: string;
      isStartable: boolean;
      readiness: string;
      items: HubItem[];
    };
    type HubStage = {
      id: string;
      order: number;
      status: string;
      isLocked: boolean;
      readiness: string;
      lessons: HubLesson[];
    };
    type HubPayload = { languageCode: string; stages: HubStage[] };

    const hub = seedsByKey.get("lg:learning_hub:curriculum")
      ?.payload as unknown as HubPayload;
    const sourceSnapshot = JSON.parse(
      readFileSync(learningHubSourcePath, "utf8"),
    ) as { languages: { lg: HubPayload } };

    expect(hub).toEqual(sourceSnapshot.languages.lg);
    const lessons = hub.stages.flatMap((stage) => stage.lessons);
    const items = lessons.flatMap((lesson) => lesson.items);

    expect(hub.languageCode).toBe("lg");
    expect(hub.stages.map((stage) => stage.id)).toEqual([
      "first-words",
      "family-home",
      "everyday-things",
      "culture-stories",
      "practice-mix",
    ]);
    expect(hub.stages.map((stage) => stage.order)).toEqual([1, 2, 3, 4, 5]);
    expect(lessons.map((lesson) => lesson.id)).toEqual([
      "greetings-1",
      "listen-greetings-1",
      "first-words-word-check",
      "first-words-picture-match",
      "first-words-quick-review",
      "family-names-1",
      "home-things-1",
      "family-pick-word",
      "family-mini-quiz",
      "home-greeting-card",
      "thank-you-at-home-story",
      "food-objects-1",
      "animals-objects-1",
      "daily-review-1",
      "story-bite-kintu",
      "culture-card-drum",
      "story-check-1",
      "review-first-words",
    ]);
    expect(items.map((item) => item.id)).toEqual([
      "well-done",
      "thank-you",
      "mother",
      "father",
      "water",
      "listen-gyebale-ko",
      "listen-webale",
      "choose-thank-you",
      "choose-water",
      "match-water-picture",
      "match-mother-picture",
      "first-words-review-questions",
      "mother",
      "father",
      "child",
      "match-home-house",
      "match-home-water",
      "choose-family-mother",
      "choose-family-child",
      "family-words-review",
      "morning-greeting-home",
      "thank-you-at-home-pages",
      "choose-food-word",
      "choose-banana-word",
      "choose-drum-word",
      "match-goat-picture",
      "match-cow-picture",
      "match-drum-picture",
      "daily-words-review",
      "kintu",
      "drum-card",
      "story-question",
      "first-words-review",
    ]);
    expect(hub.stages).toHaveLength(5);
    expect(lessons).toHaveLength(18);
    expect(items).toHaveLength(33);

    for (const stage of hub.stages) {
      expect(stage.lessons.map((lesson) => lesson.order)).toEqual(
        stage.lessons.map((_, index) => index + 1),
      );
      for (const lesson of stage.lessons) {
        expect(lesson.items.map((item) => item.order)).toEqual(
          lesson.items.map((_, index) => index + 1),
        );
      }
    }

    expect(
      [...new Set(lessons.map((lesson) => lesson.mechanic))].sort(),
    ).toEqual([
      "choose_correct_word",
      "cultural_card",
      "listen_and_choose",
      "match_word_picture",
      "mini_quiz",
      "practice_mix",
      "story_bite",
      "tap_to_learn",
    ]);

    const practiceMix = hub.stages[4];
    expect(practiceMix).toMatchObject({
      id: "practice-mix",
      status: "locked",
      isLocked: true,
      readiness: "placeholder",
    });
    expect(practiceMix.lessons[0]).toMatchObject({
      id: "review-first-words",
      mechanic: "practice_mix",
      isStartable: false,
      readiness: "placeholder",
    });
    expect(
      hub.stages.some(
        (stage) =>
          stage.readiness === "placeholder" ||
          stage.lessons.some((lesson) => lesson.readiness === "placeholder"),
      ),
    ).toBe(true);
  });

  it("preserves standalone game and menu IDs, counts, and ordering", () => {
    type MenuPayload = {
      cards: { id: string; order: number }[];
    };
    type LearningPayload = {
      stages: {
        id: number;
        order: number;
        levels: {
          id: number;
          order: number;
          words: { id: string }[];
        }[];
      }[];
    };
    type WordPayload = {
      levels: { id: string; order: number }[];
    };
    type CountingPayload = {
      stages: { id: number; order: number }[];
      numbers: unknown[];
      culturalItems: unknown[];
      currency: unknown[];
    };
    type CardPayload = {
      items: { id: string; order: number }[];
    };
    type PuzzlePayload = {
      puzzles: { id: number; order: number }[];
    };

    const gamesMenu = seedsByKey.get("lg:child_menu:games")
      ?.payload as unknown as MenuPayload;
    const coloringMenu = seedsByKey.get("lg:child_menu:coloring")
      ?.payload as unknown as MenuPayload;
    const learning = seedsByKey.get("lg:learning_game:starter")
      ?.payload as unknown as LearningPayload;
    const words = seedsByKey.get("lg:word_game:levels")
      ?.payload as unknown as WordPayload;
    const counting = seedsByKey.get("lg:counting_game:stages")
      ?.payload as unknown as CountingPayload;
    const cards = seedsByKey.get("lg:card_game:cards")
      ?.payload as unknown as CardPayload;
    const puzzles = seedsByKey.get("lg:puzzle_game:puzzles")
      ?.payload as unknown as PuzzlePayload;

    expect(gamesMenu.cards.map((card) => card.id)).toEqual([
      "words",
      "logic",
      "cards",
      "learning",
      "numbers",
    ]);
    expect(coloringMenu.cards.map((card) => card.id)).toEqual([
      "emblem",
      "king",
      "animals",
      "shapes",
      "masks",
    ]);
    expect(gamesMenu.cards.map((card) => card.order)).toEqual([1, 2, 3, 4, 5]);
    expect(coloringMenu.cards.map((card) => card.order)).toEqual([
      1, 2, 3, 4, 5,
    ]);

    const learningLevels = learning.stages.flatMap((stage) => stage.levels);
    const learningWords = learningLevels.flatMap((level) => level.words);
    expect(learning.stages.map((stage) => stage.id)).toEqual([1, 2, 3, 4, 5]);
    expect(learning.stages.map((stage) => stage.order)).toEqual([
      1, 2, 3, 4, 5,
    ]);
    expect(learningLevels.map((level) => level.id)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    ]);
    expect(learningLevels).toHaveLength(10);
    expect(learningWords).toHaveLength(40);
    expect(learningWords.map((word) => word.id)).toEqual(
      learning.stages.flatMap((stage) =>
        stage.levels.flatMap((level) =>
          level.words.map(
            (_, index) =>
              `lg-learning-stage-${stage.id}-level-${level.id}-word-${index + 1}`,
          ),
        ),
      ),
    );

    expect(words.levels).toHaveLength(50);
    expect(words.levels.map((level) => level.id)).toEqual(
      Array.from(
        { length: 50 },
        (_, index) => `lg-word-game-level-${index + 1}`,
      ),
    );
    expect(words.levels.map((level) => level.order)).toEqual(
      Array.from({ length: 50 }, (_, index) => index + 1),
    );

    expect(counting.stages.map((stage) => stage.id)).toEqual([1, 2, 3, 4]);
    expect(counting.stages.map((stage) => stage.order)).toEqual([1, 2, 3, 4]);
    expect(counting.numbers).toHaveLength(40);
    expect(counting.culturalItems).toHaveLength(8);
    expect(counting.currency).toHaveLength(7);

    expect(cards.items).toHaveLength(47);
    expect(cards.items.map((item) => item.id)).toEqual(
      Array.from(
        { length: 47 },
        (_, index) => `card-lg-${String(index + 1).padStart(3, "0")}`,
      ),
    );
    expect(cards.items.map((item) => item.order)).toEqual(
      Array.from({ length: 47 }, (_, index) => index + 1),
    );

    expect(puzzles.puzzles.map((puzzle) => puzzle.id)).toEqual([1, 2, 3]);
    expect(puzzles.puzzles.map((puzzle) => puzzle.order)).toEqual([1, 2, 3]);
  });

  it("publishes only the known Luganda stories and keeps known Runyankole placeholders unavailable", () => {
    const lugandaStoryUpdate = migrationStatements.find(
      (statement) =>
        statement.startsWith("update public.content_items set ") &&
        statement.includes("where language_code = 'lg'"),
    );
    const runyankoleDraftUpdate = migrationStatements.find(
      (statement) =>
        statement.startsWith("update public.content_items set ") &&
        statement.includes("where language_code = 'nyn'"),
    );

    expect(lugandaStoryUpdate).toMatch(
      /editorial_status = 'published'.*is_startable = true/,
    );
    expect(lugandaStoryUpdate).toContain(
      "(content_type = 'child_menu' and slug = 'stories')",
    );

    const storySlugList = lugandaStoryUpdate
      ?.match(/content_type = 'story' and slug in \(([^)]+)\)/)?.[1]
      .split(",")
      .map((slug) => slug.trim().replaceAll("'", ""))
      .sort();

    expect(storySlugList).toEqual([
      "fig-tree",
      "kasokambirye",
      "kasubi-tombs",
      "kintu",
      "millet",
      "mwanga",
      "ssezibwa",
      "walumbe",
    ]);

    expect(runyankoleDraftUpdate).toMatch(
      /editorial_status = 'draft'.*is_startable = false.*published_at = null/,
    );

    const runyankoleRows = Array.from(
      runyankoleDraftUpdate?.matchAll(/\('([^']+)', '([^']+)'\)/g) ?? [],
      (match) => `${match[1]}:${match[2]}`,
    );

    expect(runyankoleRows).toEqual([
      "child_menu:games",
      "child_menu:stories",
      "learning_game:starter",
      "word_game:levels",
      "counting_game:stages",
      "story:nyn-sample-morning-greeting",
    ]);
    expect(
      seedRecords.filter((record) => record.languageCode === "nyn"),
    ).toEqual([]);
  });

  it("indexes exact-language published reads in display order", () => {
    const indexStatement = migrationStatements.find((statement) =>
      statement.startsWith(
        "create index if not exists idx_content_items_published_language_order",
      ),
    );

    expect(indexStatement).toMatch(
      /on public\.content_items\(language_code, sort_order, content_type, slug\)/,
    );
    expect(indexStatement).toMatch(
      /where is_active = true and editorial_status = 'published'$/,
    );
  });

  it("exposes only active published rows through the child-facing policy", () => {
    expect(migrationStatements).toContain(
      "alter table public.content_items enable row level security",
    );

    const policies = migrationStatements.filter(
      (statement) =>
        statement.startsWith("create policy ") &&
        statement.includes(" on public.content_items "),
    );

    expect(policies).toHaveLength(1);

    const policy = policies[0];
    const policyRoles = policy.match(/ to (.+?) using /)?.[1];

    expect(policy).toMatch(/ for select /);
    expect(parseRoleList(policyRoles ?? "")).toEqual(["anon", "authenticated"]);
    expect(policy).toMatch(
      /using \(is_active = true and editorial_status = 'published'\)$/,
    );
    expect(policy).not.toMatch(/ for (insert|update|delete|all) /);
    expect(policy).not.toContain("with check");
  });

  it("grants child-facing roles read-only access and reserves writes for service_role", () => {
    const clientRevoke = migrationStatements.find((statement) =>
      statement.startsWith(
        "revoke all privileges on table public.content_items from ",
      ),
    );
    const revokedRoles = clientRevoke?.match(/ from (.+)$/)?.[1];

    expect(parseRoleList(revokedRoles ?? "")).toEqual([
      "anon",
      "authenticated",
      "public",
    ]);

    const clientGrants = migrationStatements.filter(
      (statement) =>
        statement.startsWith("grant ") &&
        statement.includes(" on table public.content_items ") &&
        /\b(anon|authenticated)\b/.test(statement),
    );

    expect(clientGrants).toEqual([
      "grant select on table public.content_items to anon, authenticated",
    ]);
    expect(clientGrants.join(" ")).not.toMatch(
      /\b(insert|update|delete|truncate|references|trigger)\b/,
    );

    const serviceGrant = migrationStatements.find(
      (statement) =>
        statement.startsWith("grant ") &&
        statement.endsWith(" to service_role") &&
        statement.includes(" on table public.content_items "),
    );
    const servicePrivileges = serviceGrant
      ?.match(/^grant (.+) on table/)?.[1]
      .split(",")
      .map((privilege) => privilege.trim())
      .sort();

    expect(servicePrivileges).toEqual(["delete", "insert", "select", "update"]);
  });

  it("hardens the updated-at trigger function search path", () => {
    expect(normalizedSql).toMatch(
      /create or replace function public\.set_content_items_updated_at\(\) returns trigger language plpgsql set search_path = pg_catalog/,
    );

    const functionClientGrant = migrationStatements.find((statement) => {
      if (
        !statement.startsWith(
          "grant execute on function public.set_content_items_updated_at()",
        )
      ) {
        return false;
      }

      const grantedRoles = parseRoleList(
        statement.match(/ to (.+)$/)?.[1] ?? "",
      );
      return grantedRoles.some((role) =>
        ["anon", "authenticated", "public"].includes(role),
      );
    });

    expect(functionClientGrant).toBeUndefined();
  });
});
