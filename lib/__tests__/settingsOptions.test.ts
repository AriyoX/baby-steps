import {
  PLACEHOLDER_SETTINGS,
  REQUIRED_SETTINGS_ENTRY_TITLES,
  SETTINGS_SECTIONS,
} from "../settingsOptions";

describe("settings option metadata", () => {
  it("includes the expected top-level Settings entries", () => {
    const titles = SETTINGS_SECTIONS.flatMap((section) =>
      section.entries.map((entry) => entry.title),
    );

    REQUIRED_SETTINGS_ENTRY_TITLES.forEach((title) => {
      expect(titles).toContain(title);
    });
  });

  it("provides simple placeholder copy for unfinished settings areas", () => {
    expect(PLACEHOLDER_SETTINGS["language-learning"]).toEqual(
      expect.objectContaining({
        title: "Language & Learning",
        description: expect.any(String),
      }),
    );
    expect(PLACEHOLDER_SETTINGS["account-security"].description).toContain(
      "Email and password",
    );
    expect(PLACEHOLDER_SETTINGS["child-profile-edit"].description).toContain(
      "Child profile",
    );
  });
});
