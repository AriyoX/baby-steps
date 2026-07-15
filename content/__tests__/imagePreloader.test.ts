jest.mock("expo-asset", () => ({
  Asset: {
    fromModule: jest.fn(() => ({
      downloadAsync: jest.fn().mockResolvedValue(undefined),
    })),
  },
}));

import { Image } from "react-native";
import {
  collectContentBundleImageReferences,
  preloadImageReference,
} from "../imagePreloader";
import type { ContentBundle } from "../contentRepository";

describe("image preloader helpers", () => {
  it("collects image references from menu, story, learning, word, and counting content", () => {
    const bundle: ContentBundle = {
      languageCode: "nyn",
      source: "database",
      contentVersion: "test-version",
      menuCardsByTab: {
        games: [
          {
            id: "words",
            order: 1,
            title: "Words",
            description: "Words",
            image: "menu.png",
            targetPage: "child/games/wordgame",
          },
        ],
      },
      learningGame: {
        title: "Learning",
        stages: [
          {
            id: 1,
            order: 1,
            title: "Stage",
            description: "Stage",
            image: "stage.png",
            color: "#6366f1",
            isLocked: false,
            requiredScore: 0,
            levels: [
              {
                id: 1,
                order: 1,
                title: "Level",
                isLocked: false,
                words: [
                  {
                    id: "word",
                    order: 1,
                    targetText: "Agandi",
                    english: "How are you?",
                    image: "word.png",
                  },
                ],
              },
            ],
          },
        ],
      },
      wordGame: {
        title: "Words",
        levels: [
          {
            id: "word-game-1",
            order: 1,
            word: "AGANDI",
            question: "Greeting",
            hint: "Greeting",
            subHint: "How are you?",
            image: "word-game.png",
          },
        ],
      },
      countingGame: {
        title: "Counting",
        stages: [],
        numbers: [],
        culturalItems: [{ id: "beans", order: 1, name: "beans", image: "bean.png" }],
        currency: [
          {
            id: "coin-500",
            order: 1,
            value: 500,
            name: "coin",
            image: "coin.png",
            targetText: "Bitaano",
          },
        ],
      },
      cardGame: { title: "Cards", items: [] },
      puzzleGame: { title: "Puzzles", puzzles: [] },
      stories: [
        {
          id: "story",
          title: "Story",
          summary: "Story",
          languageCode: "nyn",
          metadata: { status: "placeholder" },
          pages: [{ id: "page-1", text: "Text", image: "story.png" }],
        },
      ],
    };

    expect(collectContentBundleImageReferences(bundle)).toEqual([
      "menu.png",
      "stage.png",
      "word.png",
      "word-game.png",
      "bean.png",
      "coin.png",
      "story.png",
    ]);
  });

  it("prefetches remote image URIs without failing gameplay callers", async () => {
    const prefetchSpy = jest
      .spyOn(Image, "prefetch")
      .mockResolvedValueOnce(true);

    await expect(preloadImageReference("https://example.com/image.png")).resolves.toBe(true);
    expect(prefetchSpy).toHaveBeenCalledWith("https://example.com/image.png");

    prefetchSpy.mockRestore();
  });
});
