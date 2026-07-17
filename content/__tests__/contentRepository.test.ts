jest.mock("@/lib/supabase", () => ({
  supabase: { from: jest.fn() },
}));

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";
import {
  getLearningContentVersion,
  getLearningLanguageContent,
} from "@/content/learningHubRepository";
import { getLearningHubSeedFixture } from "@/content/testFixtures/learningHubTestFixture";
import {
  buildContentBundleFromItems,
  clearContentBundleCache,
  findStoryById,
  getContentBundleCacheKey,
  loadContentBundle,
  validateContentItemPayload,
  waitForContentBundleRefreshes,
  type ContentItemRecord,
} from "../contentRepository";

type QueryResult = { data: ContentItemRecord[] | null; error: unknown };

const createContentItemsQuery = (result: QueryResult) => ({
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  order: jest.fn().mockResolvedValue(result),
});

const mockSupabaseResults = (...results: QueryResult[]) => {
  const queries: ReturnType<typeof createContentItemsQuery>[] = [];
  let index = 0;
  (supabase.from as jest.Mock).mockImplementation(() => {
    const result = results[Math.min(index, results.length - 1)] ?? {
      data: null,
      error: new Error("No mock result"),
    };
    index += 1;
    const query = createContentItemsQuery(result);
    queries.push(query);
    return query;
  });
  return queries;
};

const menuItem = (
  languageCode: string,
  cardId: string,
  version = 1,
  extras: Partial<ContentItemRecord> = {},
): ContentItemRecord => ({
  language_code: languageCode,
  content_type: "child_menu",
  slug: "games",
  title: "Games",
  is_active: true,
  editorial_status: "published",
  is_startable: true,
  content_version: version,
  updated_at: `2026-07-${String(version).padStart(2, "0")}T00:00:00.000Z`,
  payload: {
    cards: [
      {
        id: cardId,
        order: 1,
        title: cardId,
        description: `${cardId} card`,
        image: "african-focus.png",
        targetPage: "child/games/wordgame",
      },
    ],
  },
  ...extras,
});

const published = (
  contentType: ContentItemRecord["content_type"],
  slug: string,
  payload: Record<string, unknown>,
  sortOrder = 1,
): ContentItemRecord => ({
  language_code: "lg",
  content_type: contentType,
  slug,
  payload,
  sort_order: sortOrder,
  is_active: true,
  editorial_status: "published",
  is_startable: true,
  content_version: 1,
  updated_at: "2026-07-14T00:00:00.000Z",
});

const validLearningGameItem = (): ContentItemRecord =>
  published("learning_game", "starter", {
    stages: [
      {
        id: 1,
        order: 1,
        title: "Starter",
        description: "Starter words",
        isLocked: false,
        requiredScore: 0,
        image: "learning-beginner.jpg",
        color: "#123456",
        levels: [
          {
            id: 1,
            order: 1,
            title: "First words",
            isLocked: false,
            words: [
              {
                id: "learning-word-1",
                order: 1,
                targetText: "Oli otya",
                english: "How are you",
              },
            ],
          },
        ],
      },
    ],
  });

const validLearningHubItem = (): ContentItemRecord => {
  const content = getLearningHubSeedFixture().languages.lg;
  if (!content || typeof content !== "object" || Array.isArray(content)) {
    throw new Error("Missing Luganda Learning Hub seed fixture.");
  }

  return published(
    "learning_hub",
    "curriculum",
    JSON.parse(JSON.stringify(content)) as Record<string, unknown>,
  );
};

const validWordGameItem = (): ContentItemRecord =>
  published("word_game", "levels", {
    levels: [
      {
        id: "word-level-1",
        order: 1,
        targetText: "AMAZZI",
        question: "What do you drink?",
        hint: "It is water.",
        subHint: "It starts with A.",
      },
    ],
  });

const validCountingGameItem = (): ContentItemRecord =>
  published("counting_game", "stages", {
    title: "Counting",
    stages: [
      {
        id: 1,
        order: 1,
        title: "One and two",
        description: "Count individual items",
        numbersRange: { min: 1, max: 2 },
        levels: 2,
        useBunches: false,
        usesCurrency: false,
      },
      {
        id: 2,
        order: 2,
        title: "Money",
        description: "Recognize currency",
        numbersRange: { min: 500, max: 1000 },
        levels: 2,
        useBunches: false,
        usesCurrency: true,
      },
    ],
    numbers: [
      { number: 1, order: 1, targetText: "Emu" },
      { number: 2, order: 2, targetText: "Bbiri" },
    ],
    culturalItems: [
      { id: "counting-item-1", order: 1, name: "beans", image: "bean.png" },
    ],
    currency: [
      {
        id: "ugx-500",
        order: 1,
        value: 500,
        name: "Shs 500 coin",
        image: "500.png",
        targetText: "Bitaano",
      },
      {
        id: "ugx-1000",
        order: 2,
        value: 1000,
        name: "Shs 1,000 note",
        image: "1000.jpeg",
        targetText: "Lukumi",
      },
    ],
  });

const validCardGameItem = (): ContentItemRecord =>
  published("card_game", "cards", {
    items: Array.from({ length: 8 }, (_, index) => ({
      id: `card-${index + 1}`,
      order: index + 1,
      value: `value-${index + 1}`,
      info: `info-${index + 1}`,
      imageSymbol: "★",
    })),
  });

const validPuzzleGameItem = (): ContentItemRecord =>
  published("puzzle_game", "puzzles", {
    puzzles: [
      {
        id: 1,
        order: 1,
        name: "Kasubi Tombs",
        description: "Restore the picture",
        image: "puzzles/kasubi-tombs.jpg",
      },
    ],
  });

const validStoryItem = (): ContentItemRecord =>
  published("story", "kintu", {
    id: "kintu",
    languageCode: "lg",
    title: "Kintu",
    pages: [{ id: "page-1", text: "Olugero lutandika." }],
    questions: [
      {
        id: "question-1",
        question: "Who is in the story?",
        options: ["Kintu", "No one"],
        correctAnswer: 0,
      },
    ],
  });

const cloneContentItem = (item: ContentItemRecord): ContentItemRecord =>
  JSON.parse(JSON.stringify(item)) as ContentItemRecord;

const asPayloadRecords = (
  payload: Record<string, unknown>,
  key: string,
): Record<string, unknown>[] => payload[key] as Record<string, unknown>[];

const malformedNestedPayloadCases: {
  name: string;
  validItem: () => ContentItemRecord;
  mutate: (payload: Record<string, unknown>) => void;
}[] = [
  {
    name: "menu card",
    validItem: () => menuItem("lg", "words"),
    mutate: (payload) => {
      asPayloadRecords(payload, "cards").push({
        id: "broken-card",
        order: 2,
        title: "Broken",
        description: "Missing a route",
      });
    },
  },
  {
    name: "learning stage",
    validItem: validLearningGameItem,
    mutate: (payload) => {
      asPayloadRecords(payload, "stages").push({
        id: 2,
        order: 2,
        title: "Broken stage",
      });
    },
  },
  {
    name: "learning level",
    validItem: validLearningGameItem,
    mutate: (payload) => {
      const stage = asPayloadRecords(payload, "stages")[0];
      asPayloadRecords(stage, "levels").push({
        id: 2,
        order: 2,
        title: "Broken level",
        isLocked: true,
        words: [],
      });
    },
  },
  {
    name: "learning word",
    validItem: validLearningGameItem,
    mutate: (payload) => {
      const stage = asPayloadRecords(payload, "stages")[0];
      const level = asPayloadRecords(stage, "levels")[0];
      asPayloadRecords(level, "words").push({
        id: "broken-word",
        order: 2,
        targetText: "",
        english: "Broken",
      });
    },
  },
  {
    name: "word-game level",
    validItem: validWordGameItem,
    mutate: (payload) => {
      asPayloadRecords(payload, "levels").push({
        id: "broken-level",
        order: 2,
        targetText: "BROKEN",
        question: "Broken",
        hint: "Missing a sub-hint",
      });
    },
  },
  {
    name: "counting stage",
    validItem: validCountingGameItem,
    mutate: (payload) => {
      asPayloadRecords(payload, "stages").push({
        id: 3,
        order: 3,
        title: "Broken stage",
        description: "Missing a range",
        levels: 1,
        useBunches: false,
        usesCurrency: false,
      });
    },
  },
  {
    name: "counting number",
    validItem: validCountingGameItem,
    mutate: (payload) => {
      asPayloadRecords(payload, "numbers").push({ number: 3, order: 3 });
    },
  },
  {
    name: "counting cultural item",
    validItem: validCountingGameItem,
    mutate: (payload) => {
      asPayloadRecords(payload, "culturalItems").push({
        id: "broken-item",
        order: 2,
        name: "broken",
      });
    },
  },
  {
    name: "counting currency item",
    validItem: validCountingGameItem,
    mutate: (payload) => {
      asPayloadRecords(payload, "currency").push({
        id: "ugx-750",
        order: 3,
        value: 750,
        name: "Shs 750",
        image: "750.png",
      });
    },
  },
  {
    name: "matching card",
    validItem: validCardGameItem,
    mutate: (payload) => {
      asPayloadRecords(payload, "items").push({
        id: "broken-card",
        order: 9,
        value: "broken",
        imageSymbol: "★",
      });
    },
  },
  {
    name: "puzzle",
    validItem: validPuzzleGameItem,
    mutate: (payload) => {
      asPayloadRecords(payload, "puzzles").push({
        id: 2,
        order: 2,
        name: "Broken puzzle",
        image: "broken.jpg",
      });
    },
  },
  {
    name: "story page",
    validItem: validStoryItem,
    mutate: (payload) => {
      asPayloadRecords(payload, "pages").push({ id: "page-2" });
    },
  },
  {
    name: "story question",
    validItem: validStoryItem,
    mutate: (payload) => {
      asPayloadRecords(payload, "questions").push({
        id: "question-2",
        question: "Broken question",
        options: ["A", "B"],
      });
    },
  },
  {
    name: "story option",
    validItem: validStoryItem,
    mutate: (payload) => {
      const question = asPayloadRecords(payload, "questions")[0];
      question.options = ["Kintu", ""];
    },
  },
];

let warnSpy: jest.SpyInstance;

beforeEach(async () => {
  warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
  jest.clearAllMocks();
  await clearContentBundleCache();
  await AsyncStorage.clear();
});

afterEach(async () => {
  await waitForContentBundleRefreshes();
  warnSpy.mockRestore();
});

describe("content payload mapping and publication gates", () => {
  it("validates every supported content type's required top-level arrays", () => {
    expect(validateContentItemPayload("child_menu", { cards: [{}] }).isValid).toBe(true);
    expect(validateContentItemPayload("learning_hub", { stages: [{}] }).isValid).toBe(true);
    expect(validateContentItemPayload("learning_game", { stages: [{}] }).isValid).toBe(true);
    expect(validateContentItemPayload("word_game", { levels: [{}] }).isValid).toBe(true);
    expect(
      validateContentItemPayload("counting_game", { stages: [{}], numbers: [{}] })
        .isValid,
    ).toBe(true);
    expect(validateContentItemPayload("card_game", { items: [{}] }).isValid).toBe(true);
    expect(validateContentItemPayload("puzzle_game", { puzzles: [{}] }).isValid).toBe(true);
    expect(validateContentItemPayload("story", { pages: [{}] }).isValid).toBe(true);

    expect(validateContentItemPayload("learning_hub", {}).missingKeys).toEqual(["stages"]);
    expect(validateContentItemPayload("counting_game", { stages: [{}] }).missingKeys).toEqual([
      "numbers",
    ]);
    expect(validateContentItemPayload("puzzle_game", {}).missingKeys).toEqual(["puzzles"]);
  });

  it("accepts complete payloads for every migrated repository content type", () => {
    const bundle = buildContentBundleFromItems("lg", [
      menuItem("lg", "words"),
      validLearningGameItem(),
      validWordGameItem(),
      validCountingGameItem(),
      validCardGameItem(),
      validPuzzleGameItem(),
      validStoryItem(),
    ]);

    expect(bundle.menuCardsByTab.games).toHaveLength(1);
    expect(bundle.learningGame.stages[0].levels[0].words).toHaveLength(1);
    expect(bundle.wordGame.levels).toHaveLength(1);
    expect(bundle.countingGame).toEqual(
      expect.objectContaining({
        stages: expect.arrayContaining([
          expect.objectContaining({ id: 1, usesCurrency: false }),
          expect.objectContaining({ id: 2, usesCurrency: true }),
        ]),
        culturalItems: expect.arrayContaining([
          expect.objectContaining({ id: "counting-item-1" }),
        ]),
        currency: expect.arrayContaining([
          expect.objectContaining({ id: "ugx-500" }),
          expect.objectContaining({ id: "ugx-1000" }),
        ]),
      }),
    );
    expect(bundle.cardGame.items).toHaveLength(8);
    expect(bundle.puzzleGame.puzzles).toHaveLength(1);
    expect(bundle.stories[0].questions?.[0].options).toEqual(["Kintu", "No one"]);
  });

  it("derives stable per-type progress revisions without using updated timestamps", () => {
    const learningItem = validLearningGameItem();
    learningItem.payload.progressRevision = "curriculum-v2";
    learningItem.updated_at = "2026-07-15T12:00:00.000Z";
    const first = buildContentBundleFromItems("lg", [learningItem]);

    learningItem.updated_at = "2026-07-16T12:00:00.000Z";
    const timestampOnlyEdit = buildContentBundleFromItems("lg", [learningItem]);

    expect(first.contentVersion).not.toBe(timestampOnlyEdit.contentVersion);
    expect(first.progressRevisions?.learning_game).toBe(
      "learning_game/starter#curriculum-v2",
    );
    expect(timestampOnlyEdit.progressRevisions?.learning_game).toBe(
      first.progressRevisions?.learning_game,
    );
  });

  it("derives progress identity only from valid exact-language rows", () => {
    const lugandaItem = validLearningGameItem();
    lugandaItem.payload.progressRevision = 2;
    const unexpectedRunyankoleItem = cloneContentItem(lugandaItem);
    unexpectedRunyankoleItem.language_code = "nyn";
    unexpectedRunyankoleItem.payload.progressRevision = 99;

    const bundle = buildContentBundleFromItems("lg", [
      lugandaItem,
      unexpectedRunyankoleItem,
    ]);

    expect(bundle.progressRevisions?.learning_game).toBe(
      "learning_game/starter#2",
    );
  });

  it("maps each story with its own stable progress revision", () => {
    const storyItem = validStoryItem();
    storyItem.payload.progressRevision = "story-v2";

    const bundle = buildContentBundleFromItems("lg", [storyItem]);

    expect(bundle.stories[0].progressRevision).toBe("story/kintu#story-v2");
  });

  it("rejects globally duplicated legacy Learning level IDs", () => {
    const item = validLearningGameItem();
    const stages = asPayloadRecords(item.payload, "stages");
    const duplicateStage = cloneContentItem(item).payload.stages as Record<
      string,
      unknown
    >[];
    duplicateStage[0].id = 2;
    duplicateStage[0].order = 2;
    duplicateStage[0].title = "Second stage";
    const duplicateLevel = asPayloadRecords(duplicateStage[0], "levels")[0];
    duplicateLevel.words = [
      {
        id: "learning-word-2",
        order: 1,
        targetText: "Bulungi",
        english: "Fine",
      },
    ];
    stages.push(duplicateStage[0]);

    const bundle = buildContentBundleFromItems("lg", [item]);

    expect(bundle.learningGame.stages).toEqual([]);
  });

  it.each([
    {
      name: "non-currency stages without cultural items",
      mutate: (payload: Record<string, unknown>) => {
        payload.culturalItems = [];
      },
    },
    {
      name: "non-currency candidates without exact-language number labels",
      mutate: (payload: Record<string, unknown>) => {
        payload.numbers = asPayloadRecords(payload, "numbers").slice(0, 1);
      },
    },
    {
      name: "currency stages without enough complete candidates",
      mutate: (payload: Record<string, unknown>) => {
        payload.currency = asPayloadRecords(payload, "currency").slice(0, 1);
      },
    },
  ])("rejects Counting content with $name", ({ mutate }) => {
    const item = validCountingGameItem();
    mutate(item.payload);

    const bundle = buildContentBundleFromItems("lg", [item]);

    expect(bundle.countingGame.stages).toEqual([]);
  });

  it("filters draft, inactive, non-startable, malformed, and wrong-language rows", () => {
    const bundle = buildContentBundleFromItems("nyn", [
      menuItem("nyn", "published"),
      menuItem("nyn", "draft", 1, { slug: "draft", editorial_status: "draft" }),
      menuItem("nyn", "locked", 1, { slug: "locked", is_startable: false }),
      menuItem("nyn", "inactive", 1, { slug: "inactive", is_active: false }),
      menuItem("lg", "wrong-language"),
      {
        ...menuItem("nyn", "malformed"),
        slug: "malformed",
        payload: {},
      },
    ]);

    expect(bundle.menuCardsByTab.games.map((card) => card.id)).toEqual(["published"]);
    expect(bundle.menuCardsByTab.draft).toBeUndefined();
    expect(bundle.menuCardsByTab.locked).toBeUndefined();
    expect(bundle.menuCardsByTab.inactive).toBeUndefined();
    expect(bundle.menuCardsByTab.malformed).toBeUndefined();
  });

  it("treats duplicate singleton game bundles as invalid instead of choosing one", async () => {
    mockSupabaseResults({
      data: [
        published("word_game", "levels-a", {
          levels: [{ id: "a", order: 1, word: "A", question: "A" }],
        }),
        published("word_game", "levels-b", {
          levels: [{ id: "b", order: 1, word: "B", question: "B" }],
        }),
      ],
      error: null,
    });

    const result = await loadContentBundle("lg", { forceRefresh: true });

    expect(result.source).toBe("empty");
    expect(result.bundle).toBeUndefined();
  });

  it("orders stages, levels, words, standalone levels, cards, and puzzles explicitly", () => {
    const cards = Array.from({ length: 8 }, (_, index) => ({
      id: `card-${index + 1}`,
      order: 8 - index,
      value: `value-${index + 1}`,
      info: `info-${index + 1}`,
      imageSymbol: "★",
    }));
    const bundle = buildContentBundleFromItems("lg", [
      published("learning_game", "starter", {
        stages: [
          {
            id: 2,
            order: 2,
            title: "Second",
            description: "Second",
            isLocked: true,
            requiredScore: 10,
            image: "coin.png",
            color: "#222222",
            levels: [
              {
                id: 2,
                order: 2,
                title: "Later",
                isLocked: true,
                words: [{ id: "word-b", order: 2, targetText: "B", english: "B" }],
              },
              {
                id: 1,
                order: 1,
                title: "Earlier",
                isLocked: false,
                words: [
                  { id: "word-2", order: 2, targetText: "Two", english: "Two" },
                  { id: "word-1", order: 1, targetText: "One", english: "One" },
                ],
              },
            ],
          },
          {
            id: 1,
            order: 1,
            title: "First",
            description: "First",
            isLocked: false,
            requiredScore: 0,
            image: "coin.png",
            color: "#111111",
            levels: [
              {
                id: 3,
                order: 1,
                title: "Only",
                isLocked: false,
                words: [{ id: "word-c", order: 1, targetText: "C", english: "C" }],
              },
            ],
          },
        ],
      }),
      published("word_game", "levels", {
        levels: [
          {
            id: "word-level-2",
            order: 2,
            word: "B",
            question: "B",
            hint: "B hint",
            subHint: "B sub-hint",
          },
          {
            id: "word-level-1",
            order: 1,
            word: "A",
            question: "A",
            hint: "A hint",
            subHint: "A sub-hint",
          },
        ],
      }),
      published("card_game", "cards", { items: cards }),
      published("puzzle_game", "puzzles", {
        puzzles: [
          { id: 2, order: 2, name: "Two", description: "Two", image: "two.jpg" },
          { id: 1, order: 1, name: "One", description: "One", image: "one.jpg" },
        ],
      }),
    ]);

    expect(bundle.learningGame.stages.map((stage) => stage.id)).toEqual([1, 2]);
    expect(bundle.learningGame.stages[1].levels.map((level) => level.id)).toEqual([1, 2]);
    expect(bundle.learningGame.stages[1].levels[0].words.map((word) => word.id)).toEqual([
      "word-1",
      "word-2",
    ]);
    expect(bundle.wordGame.levels.map((level) => level.id)).toEqual([
      "word-level-1",
      "word-level-2",
    ]);
    expect(bundle.cardGame.items.map((card) => card.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(bundle.puzzleGame.puzzles.map((puzzle) => puzzle.id)).toEqual([1, 2]);
  });

  it("maps generic stories dynamically and rejects a payload language mismatch", () => {
    const bundle = buildContentBundleFromItems("nyn", [
      {
        ...published("story", "new-story", {
          id: "new-story",
          languageCode: "nyn",
          title: "A new story",
          pages: [{ id: "page-1", text: "Agandi" }],
        }),
        language_code: "nyn",
      },
      {
        ...published("story", "wrong", {
          id: "wrong",
          languageCode: "lg",
          title: "Wrong",
          pages: [{ id: "page-1", text: "Wrong language" }],
        }),
        language_code: "nyn",
      },
    ]);

    expect(bundle.stories.map((story) => story.id)).toEqual(["new-story"]);
    expect(findStoryById(bundle, "new-story")?.pages[0].text).toBe("Agandi");
  });
});

describe("exact-language stale-while-revalidate cache", () => {
  it("queries only published, startable records for the exact requested language", async () => {
    const queries = mockSupabaseResults(
      { data: [menuItem("lg", "lg-menu")], error: null },
      { data: [menuItem("nyn", "nyn-menu")], error: null },
    );

    const luganda = await loadContentBundle("lg", { forceRefresh: true });
    const runyankole = await loadContentBundle("nyn", { forceRefresh: true });

    expect(luganda.bundle?.menuCardsByTab.games[0].id).toBe("lg-menu");
    expect(runyankole.bundle?.menuCardsByTab.games[0].id).toBe("nyn-menu");
    expect(queries[0].eq.mock.calls).toEqual(
      expect.arrayContaining([
        ["language_code", "lg"],
        ["is_active", true],
        ["editorial_status", "published"],
        ["is_startable", true],
      ]),
    );
    expect(queries[1].eq).toHaveBeenCalledWith("language_code", "nyn");
  });

  it.each(malformedNestedPayloadCases)(
    "retains the last valid row when a $name is malformed",
    async ({ validItem, mutate }) => {
      const valid = validItem();
      const malformed = cloneContentItem(valid);
      malformed.content_version = 2;
      malformed.updated_at = "2026-07-15T00:00:00.000Z";
      mutate(malformed.payload);
      mockSupabaseResults(
        { data: [valid], error: null },
        { data: [malformed], error: null },
      );

      const first = await loadContentBundle("lg", { forceRefresh: true });
      const afterMalformed = await loadContentBundle("lg", { forceRefresh: true });

      expect(first.bundle).toBeDefined();
      expect(afterMalformed.bundle?.contentVersion).toBe(first.bundle?.contentVersion);
      expect(afterMalformed.bundle?.contentVersion).toContain("@1:");
      expect(afterMalformed.cache?.isStale).toBe(true);
    },
  );

  it("never serves or stores Luganda under a Runyankole cache key", async () => {
    mockSupabaseResults(
      { data: [menuItem("lg", "lg-only")], error: null },
      { data: null, error: new Error("offline") },
    );

    await loadContentBundle("lg", { forceRefresh: true });
    const runyankole = await loadContentBundle("nyn", { forceRefresh: true });

    expect(runyankole).toEqual(
      expect.objectContaining({ languageCode: "nyn", source: "empty" }),
    );
    expect(runyankole.bundle).toBeUndefined();
    expect(await AsyncStorage.getItem(getContentBundleCacheKey("nyn"))).toBeNull();
    expect(await AsyncStorage.getItem(getContentBundleCacheKey("lg"))).not.toBeNull();
  });

  it("returns a cache hit promptly, refreshes in the background, and adopts a newer version", async () => {
    mockSupabaseResults(
      { data: [menuItem("lg", "version-1", 1)], error: null },
      { data: [menuItem("lg", "version-2", 2)], error: null },
      { data: [menuItem("lg", "version-2", 2)], error: null },
    );

    const first = await loadContentBundle("lg", { forceRefresh: true });
    const cached = await loadContentBundle("lg");

    expect(first.bundle?.menuCardsByTab.games[0].id).toBe("version-1");
    expect(cached.bundle?.menuCardsByTab.games[0].id).toBe("version-1");
    expect(cached.cache?.source).toBe("memory");

    await waitForContentBundleRefreshes();
    const updated = await loadContentBundle("lg");
    expect(updated.bundle?.menuCardsByTab.games[0].id).toBe("version-2");
    expect(updated.bundle?.contentVersion).toContain("@2:");
  });

  it("registers Learning Hub cache reads with the stable progress revision", async () => {
    const first = validLearningHubItem();
    first.payload.progressRevision = "curriculum-v2";
    const timestampEdit = cloneContentItem(first);
    timestampEdit.content_version = 2;
    timestampEdit.updated_at = "2026-07-16T00:00:00.000Z";
    mockSupabaseResults(
      { data: [first], error: null },
      { data: [timestampEdit], error: null },
    );

    await loadContentBundle("lg", { forceRefresh: true });
    expect(getLearningContentVersion("lg")).toBe(
      "learning_hub/curriculum#curriculum-v2",
    );

    await loadContentBundle("lg", { forceRefresh: true });
    expect(getLearningLanguageContent("lg")).not.toBeNull();
    expect(getLearningContentVersion("lg")).toBe(
      "learning_hub/curriculum#curriculum-v2",
    );
  });

  it("adopts newly published records and drops retired records without app changes", async () => {
    const gamesV1 = menuItem("lg", "games-v1", 1);
    const gamesV2 = menuItem("lg", "games-v2", 2);
    const coloringV2 = menuItem("lg", "coloring-v2", 2, {
      slug: "coloring",
      sort_order: 2,
    });
    mockSupabaseResults(
      { data: [gamesV1], error: null },
      { data: [gamesV2, coloringV2], error: null },
      { data: [gamesV2], error: null },
      { data: [gamesV2], error: null },
    );

    await loadContentBundle("lg", { forceRefresh: true });
    await loadContentBundle("lg");
    await waitForContentBundleRefreshes();

    const withNewRecord = await loadContentBundle("lg");
    expect(withNewRecord.bundle?.menuCardsByTab.coloring[0].id).toBe("coloring-v2");

    await waitForContentBundleRefreshes();
    const afterRetirement = await loadContentBundle("lg");
    expect(afterRetirement.bundle?.menuCardsByTab.games[0].id).toBe("games-v2");
    expect(afterRetirement.bundle?.menuCardsByTab.coloring).toBeUndefined();
  });

  it("uses an exact-language persisted cache offline", async () => {
    const cachedItem = menuItem("nyn", "offline-nyn", 7);
    await AsyncStorage.setItem(
      getContentBundleCacheKey("nyn"),
      JSON.stringify({
        cacheSchemaVersion: 2,
        languageCode: "nyn",
        contentVersion: "child_menu/games@7:cached",
        loadedAt: Date.now(),
        items: [cachedItem],
      }),
    );
    mockSupabaseResults({ data: null, error: new Error("offline") });

    const result = await loadContentBundle("nyn");

    expect(result.source).toBe("database");
    expect(result.cache?.source).toBe("storage");
    expect(result.bundle?.menuCardsByTab.games[0].id).toBe("offline-nyn");
  });

  it("retains the last valid cache when a forced response is malformed or empty", async () => {
    const malformed: ContentItemRecord = {
      ...menuItem("lg", "broken", 2),
      payload: {},
    };
    mockSupabaseResults(
      { data: [menuItem("lg", "last-good", 1)], error: null },
      { data: [malformed], error: null },
      { data: [], error: null },
    );

    await loadContentBundle("lg", { forceRefresh: true });
    const afterMalformed = await loadContentBundle("lg", { forceRefresh: true });
    const afterEmpty = await loadContentBundle("lg", { forceRefresh: true });

    expect(afterMalformed.bundle?.menuCardsByTab.games[0].id).toBe("last-good");
    expect(afterEmpty.bundle?.menuCardsByTab.games[0].id).toBe("last-good");
    expect(afterEmpty.cache?.isStale).toBe(true);
  });

  it("returns a friendly empty result when the cache is empty and Supabase is offline", async () => {
    mockSupabaseResults({ data: null, error: new Error("offline") });

    const result = await loadContentBundle("nyn", { forceRefresh: true });

    expect(result.source).toBe("empty");
    expect(result.bundle).toBeUndefined();
    expect(result.missingReason).toContain("No published content");
  });
});
