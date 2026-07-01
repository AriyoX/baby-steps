import {
  DEFAULT_LEARNING_LANGUAGE_CODE,
  getContentForLanguage,
  getGamesForLanguage,
  getLessonsForLanguage,
  getStoriesForLanguage,
  hasLocalContentForLanguage,
  LEARNING_LANGUAGES,
} from "..";

describe("local language content registry", () => {
  it("defines Luganda as the default and Runyankole as an active sample language", () => {
    expect(DEFAULT_LEARNING_LANGUAGE_CODE).toBe("lg");
    expect(LEARNING_LANGUAGES.map((language) => language.code)).toEqual(["lg", "nyn"]);
    expect(LEARNING_LANGUAGES.every((language) => language.isActive)).toBe(true);
  });

  it("loads existing Luganda prototype content through the registry", () => {
    const content = getContentForLanguage("lg", { allowDefaultFallback: false });

    expect(content?.languageCode).toBe("lg");
    expect(content?.lessons.stages.length).toBeGreaterThan(0);
    expect(content?.games.wordGameLevels.length).toBeGreaterThan(0);
    expect(content?.games.counting.stages.length).toBeGreaterThan(0);
    expect(content?.stories.map((story) => story.id)).toEqual([
      "kintu",
      "mwanga",
      "kasubi-tombs",
      "walumbe",
      "ssezibwa",
      "millet",
      "kasokambirye",
      "fig-tree",
    ]);
  });

  it("loads Runyankole sample content without falling back to Luganda", () => {
    const content = getContentForLanguage("nyn", { allowDefaultFallback: false });

    expect(content?.languageCode).toBe("nyn");
    expect(content?.metadata.status).toBe("placeholder");
    expect(content?.stories[0].id).toMatch(/^nyn-/);
    expect(content?.lessons.stages[0].id).toMatch(/^nyn-/);
    expect(content?.games.wordGameLevels[0].id).toMatch(/^nyn-/);
    expect(content?.games.counting.stages[0].id).toMatch(/^nyn-/);
  });

  it("keeps fallback behavior explicit for unsupported languages", () => {
    expect(getContentForLanguage("fr", { allowDefaultFallback: false })).toBeUndefined();
    expect(getContentForLanguage("fr")?.languageCode).toBe("lg");
    expect(hasLocalContentForLanguage("fr")).toBe(false);
  });

  it("exposes focused helpers for stories, lessons, and games", () => {
    expect(getStoriesForLanguage("nyn")).toHaveLength(1);
    expect(getLessonsForLanguage("nyn").stages[0].levels.length).toBeGreaterThan(0);
    expect(getGamesForLanguage("nyn")?.wordGameLevels.length).toBeGreaterThan(0);
    expect(getStoriesForLanguage("unknown")).toEqual([]);
  });
});
