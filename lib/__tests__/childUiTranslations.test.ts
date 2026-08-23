import {
  translateChildUi,
  translateChildUiAchievement,
} from "@/lib/childUiTranslations";

describe("child UI translations", () => {
  it("falls back to English when the selected language is missing a key", () => {
    expect(translateChildUi("common.undo", "lg", true)).toBe("Undo");
  });

  it("never falls back from Runyankole to Luganda", () => {
    expect(translateChildUi("navigation.museum", "nyn", true)).toBe("Museum");
    expect(translateChildUi("navigation.museum", "lg", true)).toBe("Enkuluniro");
  });

  it("uses the independent Runyankole table and its language aliases", () => {
    expect(translateChildUi("common.next", "nyn", true)).toBe(
      "Ekirikukurataho",
    );
    expect(translateChildUi("navigation.learning", "runyankole", true)).toBe(
      "Okwega",
    );
  });

  it("returns to English when child UI translation is disabled", () => {
    expect(translateChildUi("navigation.games", "nyn", false)).toBe("Games");
    expect(translateChildUi("child.learningJourney", "lg", false)).toBe(
      "your learning journey",
    );
  });

  it("interpolates translated child UI labels", () => {
    expect(
      translateChildUi("learning.progressPosition", "nyn", true, {
        current: 2,
        total: 5,
      }),
    ).toBe("2 ahari 5");
  });

  it("keeps existing English achievement text when an ID has no mapping", () => {
    const achievement = {
      id: "achievement-without-translation",
      name: "English name",
      description: "English description",
      game_key: "learning_hub",
    };

    expect(translateChildUiAchievement(achievement, "lg", true)).toEqual({
      name: "English name",
      description: "English description",
    });
  });

  it("translates known achievements by stable ID", () => {
    expect(
      translateChildUiAchievement(
        {
          id: "first-masterpiece",
          name: "First masterpiece",
          description: "Save your first picture",
          game_key: "coloring",
        },
        "nyn",
        true,
      ),
    ).toEqual({
      name: "Ekishushani ky'okubanza",
      description: "Biika ekishushani kyawe ky'okubanza",
    });
  });
});
