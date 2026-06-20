jest.mock("@/lib/supabase", () => ({
  supabase: {
    from: jest.fn(),
  },
}));

import {
  buildContentBundleFromItems,
  buildLocalContentBundle,
  mergeDatabaseBundleWithLegacyLugandaContent,
  validateContentItemPayload,
  type ContentItemRecord,
} from "../contentRepository";

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
