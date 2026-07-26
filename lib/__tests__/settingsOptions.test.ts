import {
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

  it("does not expose unavailable placeholder settings routes", () => {
    const entries = SETTINGS_SECTIONS.flatMap((section) => section.entries);

    expect(entries).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: "Language & Learning" }),
        expect.objectContaining({ title: "Subscription & Payments" }),
      ]),
    );
    expect(entries.every((entry) => !entry.route.includes("placeholder"))).toBe(
      true,
    );
  });
});
