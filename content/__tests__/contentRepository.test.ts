jest.mock("@/lib/supabase", () => ({
  supabase: {
    from: jest.fn(),
  },
}));

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";
import {
  buildContentBundleFromItems,
  buildLocalContentBundle,
  clearContentBundleCache,
  findStoryById,
  loadContentBundle,
  mergeDatabaseBundleWithLegacyLugandaContent,
  validateContentItemPayload,
  type ContentItemRecord,
} from "../contentRepository";
import { lugandaStories } from "../luganda/stories";

const createContentItemsQuery = (
  result: { data: ContentItemRecord[] | null; error: unknown },
) => {
  const query = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue(result),
  };

  return query;
};

const menuItem = (
  languageCode: ContentItemRecord["language_code"],
  cardId: string,
): ContentItemRecord => ({
  language_code: languageCode,
  content_type: "child_menu",
  slug: "games",
  title: "Games",
  is_active: true,
  payload: {
    cards: [
      {
        id: cardId,
        title: cardId,
        description: `${cardId} card`,
        image: "african-focus.png",
        targetPage: "child/games/wordgame",
      },
    ],
  },
});

beforeEach(async () => {
  jest.clearAllMocks();
  await clearContentBundleCache();
  await AsyncStorage.clear();
});

describe("content repository mapping", () => {
  it("builds DB-backed menu, learning, word, counting, and story content", () => {
    const items: ContentItemRecord[] = [
      {
        language_code: "nyn",
        content_type: "child_menu",
        slug: "Games",
        title: "Games",
        payload: {
          cards: [
            {
              id: "words",
              title: "Words",
              description: "Practice words",
              image: "african-focus.png",
              targetPage: "child/games/wordgame",
            },
          ],
        },
      },
      {
        language_code: "nyn",
        content_type: "learning_game",
        slug: "starter",
        title: "Starter",
        payload: {
          stages: [
            {
              id: 1,
              title: "Stage",
              description: "Sample stage",
              isLocked: false,
              requiredScore: 0,
              levels: [
                {
                  id: 1,
                  title: "Greetings",
                  isLocked: false,
                  words: [
                    {
                      id: "nyn-agandi",
                      targetText: "Agandi",
                      english: "How are you?",
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
      {
        language_code: "nyn",
        content_type: "word_game",
        slug: "levels",
        title: "Words",
        payload: {
          levels: [
            {
              targetText: "AGANDI",
              question: "A greeting",
              hint: "Greeting",
              subHint: "How are you?",
            },
          ],
        },
      },
      {
        language_code: "nyn",
        content_type: "counting_game",
        slug: "stages",
        title: "Counting",
        payload: {
          stages: [
            {
              id: 1,
              title: "One to five",
              numbersRange: { min: 1, max: 5 },
              levels: 5,
            },
          ],
          numbers: [{ number: 1, targetText: "Emwe" }],
          culturalItems: [{ name: "beans", image: "bean.png" }],
        },
      },
      {
        language_code: "nyn",
        content_type: "story",
        slug: "story",
        title: "Story",
        payload: {
          id: "nyn-story",
          title: "Story",
          summary: "A story",
          languageCode: "nyn",
          metadata: { status: "placeholder" },
          pages: [{ id: "page-1", text: "Agandi" }],
        },
      },
    ];

    const bundle = buildContentBundleFromItems("nyn", items);

    expect(bundle.source).toBe("database");
    expect(bundle.menuCardsByTab.games[0].targetPage).toBe("child/games/wordgame");
    expect(bundle.learningGame.stages[0].levels[0].words[0].targetText).toBe("Agandi");
    expect(bundle.wordGame.levels[0].word).toBe("AGANDI");
    expect(bundle.countingGame.numbers[0].targetText).toBe("Emwe");
    expect(bundle.stories[0].languageCode).toBe("nyn");
  });

  it("validates the required payload arrays by content type", () => {
    expect(validateContentItemPayload("child_menu", { cards: [{}] }).isValid).toBe(true);
    expect(validateContentItemPayload("learning_game", { stages: [{}] }).isValid).toBe(true);
    expect(validateContentItemPayload("word_game", { levels: [{}] }).isValid).toBe(true);
    expect(validateContentItemPayload("counting_game", { stages: [{}], numbers: [{}] }).isValid).toBe(true);
    expect(validateContentItemPayload("story", { pages: [{}] }).isValid).toBe(true);

    expect(validateContentItemPayload("child_menu", {}).missingKeys).toEqual(["cards"]);
    expect(validateContentItemPayload("learning_game", {}).missingKeys).toEqual(["stages"]);
    expect(validateContentItemPayload("word_game", {}).missingKeys).toEqual(["levels"]);
    expect(validateContentItemPayload("counting_game", { stages: [{}] }).missingKeys).toEqual(["numbers"]);
    expect(validateContentItemPayload("story", {}).missingKeys).toEqual(["pages"]);
  });

  it("skips malformed DB content instead of filling it with another language", () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);

    const bundle = buildContentBundleFromItems("nyn", [
      {
        language_code: "nyn",
        content_type: "child_menu",
        slug: "stories",
        title: "Stories",
        payload: {},
      },
      {
        language_code: "nyn",
        content_type: "learning_game",
        slug: "starter",
        title: "Starter",
        payload: { levels: [] },
      },
      {
        language_code: "nyn",
        content_type: "story",
        slug: "luganda-story",
        title: "Wrong language",
        payload: {
          id: "luganda-story",
          title: "Wrong language",
          summary: "Should not render for Runyankole",
          languageCode: "lg",
          pages: [{ id: "page-1", text: "Oli otya" }],
        },
      },
      {
        language_code: "nyn",
        content_type: "Word_Game" as ContentItemRecord["content_type"],
        slug: "levels",
        title: "Words",
        payload: { levels: [{ targetText: "AGANDI" }] },
      },
    ]);

    expect(bundle.menuCardsByTab.stories).toBeUndefined();
    expect(bundle.learningGame.stages).toEqual([]);
    expect(bundle.wordGame.levels).toEqual([]);
    expect(bundle.stories).toEqual([]);

    warnSpy.mockRestore();
  });

  it("does not use Luganda content for Runyankole local fallback", () => {
    const bundle = buildLocalContentBundle("nyn");

    expect(bundle.source).toBe("local-same-language-sample");
    expect(bundle.languageCode).toBe("nyn");
    expect(bundle.wordGame.levels.map((level) => level.word)).toContain("AGANDI");
    expect(bundle.wordGame.levels.map((level) => level.word)).not.toContain("OLUGANDA");
    expect(bundle.menuCardsByTab.games.map((card) => card.id)).not.toContain("logic");
    expect(bundle.menuCardsByTab.stories[0].targetPage).toBe(
      "child/stories/nyn-sample-morning-greeting",
    );
  });

  it("loads migrated Luganda stories from content_items with generic menu routes", () => {
    const items: ContentItemRecord[] = [
      {
        language_code: "lg",
        content_type: "child_menu",
        slug: "stories",
        title: "Stories",
        payload: {
          cards: lugandaStories.map((story) => ({
            id: story.id,
            title: story.title,
            description: story.summary,
            image: story.pages[0]?.image,
            targetPage: `child/stories/${story.id}`,
          })),
        },
      },
      ...lugandaStories.map((story, index): ContentItemRecord => ({
        language_code: "lg",
        content_type: "story",
        slug: story.id,
        title: story.title,
        sort_order: 60 + index,
        is_active: true,
        payload: story as unknown as Record<string, unknown>,
      })),
    ];

    const bundle = buildContentBundleFromItems("lg", items);
    const kintu = findStoryById(bundle, "kintu");
    const figTree = findStoryById(bundle, "fig-tree");

    expect(bundle.stories).toHaveLength(lugandaStories.length);
    expect(bundle.menuCardsByTab.stories.map((card) => card.targetPage)).toEqual(
      lugandaStories.map((story) => `child/stories/${story.id}`),
    );
    expect(kintu?.pages[0].text).toContain("Long ago, Kintu was the first person");
    expect(kintu?.pages[0].image).toBe("story/kintu/kintu-cow.jpeg");
    expect(figTree?.questions?.[0].options).toContain(
      "It produced bark cloth precious to the Baganda",
    );
    expect(figTree?.questions?.[0].correctAnswer).toBe(1);
  });

  it("normalizes DB-backed story payloads and skips stories with empty pages", () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);

    const bundle = buildContentBundleFromItems("nyn", [
      {
        language_code: "nyn",
        content_type: "story",
        slug: "nyn-normalized-story",
        title: "Normalized Story",
        payload: {
          languageCode: "nyn",
          pages: [
            { text: "  " },
            {
              text: "Agandi",
              imageKey: "learning-beginner.jpg",
            },
          ],
          questions: [
            {
              question: "Which greeting appears?",
              options: ["Agandi", "Oli otya"],
              correctAnswer: 0,
            },
          ],
        },
      },
      {
        language_code: "nyn",
        content_type: "story",
        slug: "empty-story",
        title: "Empty Story",
        payload: {
          languageCode: "nyn",
          pages: [{ text: "" }],
        },
      },
    ]);

    expect(bundle.stories).toHaveLength(1);
    expect(bundle.stories[0]).toEqual(
      expect.objectContaining({
        id: "nyn-normalized-story",
        title: "Normalized Story",
        languageCode: "nyn",
      }),
    );
    expect(bundle.stories[0].pages[0]).toEqual(
      expect.objectContaining({
        id: "nyn-normalized-story-page-2",
        text: "Agandi",
        image: "learning-beginner.jpg",
      }),
    );
    expect(bundle.stories[0].questions?.[0].id).toBe(
      "nyn-normalized-story-question-1",
    );

    warnSpy.mockRestore();
  });

  it("keeps local Luganda story fallback on generic story routes", () => {
    const bundle = buildLocalContentBundle("lg");

    expect(bundle.stories).toHaveLength(lugandaStories.length);
    expect(bundle.stories.every((story) => story.pages.length > 0)).toBe(true);
    expect(bundle.menuCardsByTab.stories.map((card) => card.targetPage)).toEqual([
      "child/stories/kintu",
      "child/stories/mwanga",
      "child/stories/kasubi-tombs",
      "child/stories/walumbe",
      "child/stories/ssezibwa",
      "child/stories/millet",
      "child/stories/kasokambirye",
      "child/stories/fig-tree",
    ]);
  });

  it("renders seeded Runyankole stories as non-empty generic story payloads", () => {
    const bundle = buildLocalContentBundle("nyn");
    const story = findStoryById(bundle, "nyn-sample-morning-greeting");

    expect(story?.pages.length).toBeGreaterThan(0);
    expect(story?.pages[0].text).toContain("Agandi");
    expect(story?.questions?.[0].options.length).toBeGreaterThan(1);
  });

  it("keeps full legacy Luganda game content when DB Luganda payloads are only partial samples", () => {
    const partialDatabaseBundle = buildContentBundleFromItems("lg", [
      {
        language_code: "lg",
        content_type: "word_game",
        slug: "levels",
        title: "Sample",
        payload: {
          levels: [
            {
              targetText: "AMAZZI",
              question: "Water",
              hint: "Water",
              subHint: "Water",
            },
          ],
        },
      },
    ]);
    const legacyBundle = buildLocalContentBundle("lg");

    const mergedBundle = mergeDatabaseBundleWithLegacyLugandaContent(partialDatabaseBundle);

    expect(mergedBundle.wordGame.levels.length).toBe(legacyBundle.wordGame.levels.length);
    expect(mergedBundle.learningGame.stages.length).toBe(legacyBundle.learningGame.stages.length);
    expect(mergedBundle.countingGame.stages.length).toBe(legacyBundle.countingGame.stages.length);
  });
});

describe("loadContentBundle cache behavior", () => {
  it("keeps content cache keys language-specific", async () => {
    const fromMock = supabase.from as jest.Mock;
    fromMock
      .mockReturnValueOnce(
        createContentItemsQuery({ data: [menuItem("lg", "lg-menu")], error: null }),
      )
      .mockReturnValueOnce(
        createContentItemsQuery({ data: [menuItem("nyn", "nyn-menu")], error: null }),
      );

    const luganda = await loadContentBundle("lg");
    const runyankole = await loadContentBundle("nyn");
    const cachedLuganda = await loadContentBundle("lg");

    expect(luganda.bundle?.languageCode).toBe("lg");
    expect(runyankole.bundle?.languageCode).toBe("nyn");
    expect(cachedLuganda.bundle?.menuCardsByTab.games[0].id).toBe("lg-menu");
    expect(cachedLuganda.cache?.source).toBe("memory");
    expect(fromMock).toHaveBeenCalledTimes(2);
  });

  it("bypasses cached DB content when forceRefresh is true", async () => {
    const fromMock = supabase.from as jest.Mock;
    fromMock
      .mockReturnValueOnce(
        createContentItemsQuery({ data: [menuItem("nyn", "first-menu")], error: null }),
      )
      .mockReturnValueOnce(
        createContentItemsQuery({ data: [menuItem("nyn", "refreshed-menu")], error: null }),
      );

    const first = await loadContentBundle("nyn");
    const cached = await loadContentBundle("nyn");
    const refreshed = await loadContentBundle("nyn", { forceRefresh: true });

    expect(first.bundle?.menuCardsByTab.games[0].id).toBe("first-menu");
    expect(cached.bundle?.menuCardsByTab.games[0].id).toBe("first-menu");
    expect(refreshed.bundle?.menuCardsByTab.games[0].id).toBe("refreshed-menu");
    expect(fromMock).toHaveBeenCalledTimes(2);
  });

  it("returns stale cached DB content while refreshing in the background", async () => {
    const nowSpy = jest.spyOn(Date, "now");
    let now = 1000;
    nowSpy.mockImplementation(() => now);

    const fromMock = supabase.from as jest.Mock;
    fromMock
      .mockReturnValueOnce(
        createContentItemsQuery({ data: [menuItem("nyn", "cached-menu")], error: null }),
      )
      .mockReturnValueOnce(
        createContentItemsQuery({ data: [menuItem("nyn", "refreshed-menu")], error: null }),
      );

    await loadContentBundle("nyn", { maxAgeMs: 100 });
    now = 1200;
    const stale = await loadContentBundle("nyn", { maxAgeMs: 100 });

    expect(stale.bundle?.menuCardsByTab.games[0].id).toBe("cached-menu");
    expect(stale.cache?.isStale).toBe(true);
    expect(fromMock).toHaveBeenCalledTimes(2);

    await Promise.resolve();
    await Promise.resolve();

    nowSpy.mockRestore();
  });

  it("never serves cached Luganda content to a Runyankole request", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    const fromMock = supabase.from as jest.Mock;
    fromMock
      .mockReturnValueOnce(
        createContentItemsQuery({ data: [menuItem("lg", "lg-only")], error: null }),
      )
      .mockReturnValueOnce(
        createContentItemsQuery({ data: null, error: new Error("offline") }),
      );

    await loadContentBundle("lg");
    const runyankole = await loadContentBundle("nyn");

    expect(runyankole.languageCode).toBe("nyn");
    expect(runyankole.source).toBe("local-same-language-sample");
    expect(runyankole.bundle?.languageCode).toBe("nyn");
    expect(runyankole.bundle?.menuCardsByTab.games.map((card) => card.id)).not.toContain(
      "lg-only",
    );

    warnSpy.mockRestore();
  });

  it("does not cache invalid DB payloads as usable database content", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    const fromMock = supabase.from as jest.Mock;
    fromMock
      .mockReturnValueOnce(
        createContentItemsQuery({
          data: [
            {
              language_code: "nyn",
              content_type: "child_menu",
              slug: "games",
              title: "Broken",
              is_active: true,
              payload: {},
            },
          ],
          error: null,
        }),
      )
      .mockReturnValueOnce(
        createContentItemsQuery({ data: null, error: new Error("offline") }),
      );

    const first = await loadContentBundle("nyn");
    const afterFailure = await loadContentBundle("nyn");

    expect(first.source).toBe("local-same-language-sample");
    expect(afterFailure.source).toBe("local-same-language-sample");
    expect(afterFailure.cache).toBeUndefined();
    expect(fromMock).toHaveBeenCalledTimes(2);

    warnSpy.mockRestore();
  });

  it("uses same-language cached DB content when a forced DB refresh fails", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    const fromMock = supabase.from as jest.Mock;
    fromMock
      .mockReturnValueOnce(
        createContentItemsQuery({ data: [menuItem("nyn", "cached-nyn")], error: null }),
      )
      .mockReturnValueOnce(
        createContentItemsQuery({ data: null, error: new Error("offline") }),
      );

    await loadContentBundle("nyn");
    const afterFailure = await loadContentBundle("nyn", { forceRefresh: true });

    expect(afterFailure.source).toBe("database");
    expect(afterFailure.bundle?.languageCode).toBe("nyn");
    expect(afterFailure.bundle?.menuCardsByTab.games[0].id).toBe("cached-nyn");
    expect(afterFailure.cache?.source).toBe("memory");
    expect(fromMock).toHaveBeenCalledTimes(2);

    warnSpy.mockRestore();
  });
});
