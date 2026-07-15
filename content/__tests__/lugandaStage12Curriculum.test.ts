import { readFileSync } from "fs";
import path from "path";

import {
  isLessonStartable,
  normalizeLearningHubLanguageContent,
} from "../learningHubRepository";

type SeedManifest = {
  bundles: Array<{
    contentType: string;
    slug: string;
    payload: Record<string, unknown>;
  }>;
};

const manifest = JSON.parse(
  readFileSync(
    path.join(__dirname, "..", "curriculum", "lg-stage-1-2.json"),
    "utf8",
  ),
) as SeedManifest;

describe("Luganda Stage 1–2 curriculum seed", () => {
  it("passes the runtime Learning Hub normalizer without dropping content", () => {
    const payload = manifest.bundles.find(
      (bundle) => bundle.contentType === "learning_hub" && bundle.slug === "curriculum",
    )?.payload;
    const normalized = normalizeLearningHubLanguageContent("lg", payload);

    expect(normalized).not.toBeNull();
    expect(normalized?.stages.map((stage) => stage.id)).toEqual([
      "first-words",
      "family-home",
    ]);
    expect(normalized?.stages.map((stage) => stage.lessons.length)).toEqual([6, 6]);

    for (const stage of normalized?.stages ?? []) {
      expect(stage.lessons.every((lesson) => isLessonStartable(stage, lesson))).toBe(true);
      expect(stage.lessons.every((lesson) => lesson.items.length > 0)).toBe(true);
    }
  });

  it("provides every required top-level array for all 11 seeded rows", () => {
    expect(manifest.bundles).toHaveLength(11);

    const requiredPayloadArray: Record<string, string> = {
      child_menu: "cards",
      learning_hub: "stages",
      learning_game: "stages",
      word_game: "levels",
      counting_game: "stages",
      card_game: "items",
      puzzle_game: "puzzles",
      story: "pages",
    };

    for (const bundle of manifest.bundles) {
      const requiredKey = requiredPayloadArray[bundle.contentType];
      expect(requiredKey).toBeDefined();
      expect(Array.isArray(bundle.payload[requiredKey])).toBe(true);
      expect((bundle.payload[requiredKey] as unknown[]).length).toBeGreaterThan(0);

      if (bundle.contentType === "counting_game") {
        expect(Array.isArray(bundle.payload.numbers)).toBe(true);
        expect((bundle.payload.numbers as unknown[]).length).toBeGreaterThan(0);
      }
    }
  });
});
