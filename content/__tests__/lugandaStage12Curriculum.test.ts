import { readFileSync } from "fs";
import path from "path";

import {
  isLessonStartable,
  normalizeLearningHubLanguageContent,
} from "../learningHubRepository";
import {
  buildContentBundleFromItems,
  getStartableMenuCards,
  type ContentItemRecord,
  type ContentItemType,
} from "../contentRepository";

type SeedManifest = {
  contentVersion: number;
  curriculumInventory: {
    stageCount: number;
    lessonCount: number;
    lessonItemCount: number;
    conceptCount: number;
    learningGameLevelCount: number;
  };
  media: {
    images: Array<{ reference: string; status: string }>;
    audio: Array<{ key: string; status: string; runtimeAsset: string }>;
  };
  bundles: Array<{
    languageCode: string;
    contentType: string;
    slug: string;
    title: string;
    sortOrder: number;
    isActive: boolean;
    editorialStatus: "published";
    isStartable: boolean;
    contentVersion: number;
    publishedAt: string;
    payload: Record<string, unknown>;
  }>;
};

const manifest = JSON.parse(
  readFileSync(
    path.join(__dirname, "..", "curriculum", "lg-stage-1-2.json"),
    "utf8",
  ),
) as SeedManifest;

const payloadFor = (contentType: string, slug?: string) =>
  manifest.bundles.find(
    (bundle) =>
      bundle.contentType === contentType &&
      (slug === undefined || bundle.slug === slug),
  )?.payload;

describe("Luganda initial Stage 1-2 curriculum seed", () => {
  it("passes the runtime Learning Hub normalizer without dropping a lesson", () => {
    const payload = payloadFor("learning_hub", "curriculum");
    const normalized = normalizeLearningHubLanguageContent("lg", payload);

    expect(normalized).not.toBeNull();
    expect(normalized?.stages.map((stage) => stage.id)).toEqual([
      "lg-stage-01-greetings",
      "lg-stage-02-body-feelings",
    ]);
    expect(normalized?.stages.map((stage) => stage.lessons.length)).toEqual([
      6, 6,
    ]);

    for (const stage of normalized?.stages ?? []) {
      expect(
        stage.lessons.every((lesson) => isLessonStartable(stage, lesson)),
      ).toBe(true);
      expect(stage.lessons.every((lesson) => lesson.items.length > 0)).toBe(
        true,
      );
    }
  });

  it("contains the exact initial-stage inventory from the curriculum guide", () => {
    expect(manifest.contentVersion).toBe(4);
    expect(manifest.curriculumInventory).toEqual(
      expect.objectContaining({
        stageCount: 2,
        lessonCount: 12,
        lessonItemCount: 37,
        conceptCount: 21,
        learningGameLevelCount: 16,
      }),
    );

    const hub = payloadFor("learning_hub", "curriculum") as {
      stages: Array<{
        metadata: { conceptIds: string[] };
        lessons: Array<{
          id: string;
          items: Array<{
            id: string;
            mechanic: string;
            pages?: unknown[];
            questions?: unknown[];
          }>;
        }>;
      }>;
    };
    const lessons = hub.stages.flatMap((stage) => stage.lessons);
    const items = lessons.flatMap((lesson) => lesson.items);

    expect(lessons).toHaveLength(12);
    expect(items).toHaveLength(37);
    expect(
      hub.stages.flatMap((stage) => stage.metadata.conceptIds),
    ).toHaveLength(21);
    expect(
      items
        .filter((item) => item.mechanic === "story_bite")
        .flatMap((item) => item.pages ?? []),
    ).toHaveLength(8);
    expect(
      items
        .filter((item) => item.mechanic === "mini_quiz")
        .flatMap((item) => item.questions ?? []),
    ).toHaveLength(10);
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
      expect((bundle.payload[requiredKey] as unknown[]).length).toBeGreaterThan(
        0,
      );

      if (bundle.contentType === "counting_game") {
        expect(Array.isArray(bundle.payload.numbers)).toBe(true);
        expect((bundle.payload.numbers as unknown[]).length).toBe(5);
      }
    }
  });

  it("hydrates all generated rows through the production content repository", () => {
    const rows: ContentItemRecord[] = manifest.bundles.map((bundle, index) => ({
      id: `seed-row-${index + 1}`,
      language_code: bundle.languageCode,
      content_type: bundle.contentType as ContentItemType,
      slug: bundle.slug,
      title: bundle.title,
      payload: bundle.payload,
      sort_order: bundle.sortOrder,
      is_active: bundle.isActive,
      editorial_status: bundle.editorialStatus,
      is_startable: bundle.isStartable,
      content_version: bundle.contentVersion,
      published_at: bundle.publishedAt,
      updated_at: bundle.publishedAt,
    }));

    const bundle = buildContentBundleFromItems("lg", rows);

    expect(bundle.learningHub?.stages).toHaveLength(2);
    expect(
      bundle.learningHub?.stages.flatMap((stage) => stage.lessons),
    ).toHaveLength(12);
    expect(bundle.learningGame.stages).toHaveLength(2);
    expect(
      bundle.learningGame.stages.flatMap((stage) => stage.levels),
    ).toHaveLength(16);
    expect(bundle.wordGame.levels).toHaveLength(14);
    expect(bundle.countingGame.stages).toHaveLength(3);
    expect(bundle.cardGame.items).toHaveLength(21);
    expect(bundle.puzzleGame.puzzles).toHaveLength(10);
    expect(bundle.stories).toHaveLength(2);
    expect(Object.keys(bundle.menuCardsByTab).sort()).toEqual([
      "coloring",
      "games",
      "stories",
    ]);
    expect(getStartableMenuCards(bundle, "games")).toHaveLength(5);
    expect(getStartableMenuCards(bundle, "stories")).toHaveLength(2);
    expect(getStartableMenuCards(bundle, "coloring")).toHaveLength(2);
  });

  it("adds substantial reinforcement without inventing later curriculum stages", () => {
    const learningGame = payloadFor("learning_game") as {
      stages: Array<{
        id: number;
        levels: Array<{ id: number; words: Array<{ targetText: string }> }>;
      }>;
    };
    const wordGame = payloadFor("word_game") as {
      levels: Array<{ targetText: string }>;
    };
    const countingGame = payloadFor("counting_game") as {
      stages: Array<{
        levels: number;
        numbersRange: { min: number; max: number };
      }>;
    };
    const cardGame = payloadFor("card_game") as { items: unknown[] };
    const puzzleGame = payloadFor("puzzle_game") as { puzzles: unknown[] };

    expect(learningGame.stages.map((stage) => stage.id)).toEqual([1, 2]);
    expect(learningGame.stages.map((stage) => stage.levels.length)).toEqual([
      8, 8,
    ]);
    expect(
      learningGame.stages
        .flatMap((stage) => stage.levels)
        .map((level) => level.id),
    ).toEqual(Array.from({ length: 16 }, (_, index) => index + 1));

    expect(wordGame.levels).toHaveLength(14);
    expect(
      wordGame.levels.every((level) => /^[A-Za-z]+$/.test(level.targetText)),
    ).toBe(true);
    expect(countingGame.stages).toEqual([
      expect.objectContaining({ levels: 2, numbersRange: { min: 1, max: 2 } }),
      expect.objectContaining({ levels: 3, numbersRange: { min: 1, max: 3 } }),
      expect.objectContaining({ levels: 5, numbersRange: { min: 1, max: 5 } }),
    ]);
    expect(cardGame.items).toHaveLength(21);
    expect(puzzleGame.puzzles).toHaveLength(10);
  });

  it("uses registered bundled images and stable audio placeholders instead of empty files", () => {
    expect(manifest.media.images).not.toHaveLength(0);
    expect(
      manifest.media.images.every(
        (entry) =>
          entry.status === "temporary-bundled-placeholder" ||
          entry.status === "existing-bundled-asset",
      ),
    ).toBe(true);
    expect(
      manifest.media.images.some((entry) =>
        entry.reference.startsWith("learning/lg/stage-"),
      ),
    ).toBe(false);

    expect(manifest.media.audio).toHaveLength(29);
    expect(
      manifest.media.audio.every(
        (entry) =>
          entry.status === "registered-placeholder-cue" &&
          entry.runtimeAsset === "placeholder_learning_cue",
      ),
    ).toBe(true);
  });
});
