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
      menuCardsByTab: {
        games: [
          {
            id: "words",
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
            title: "Stage",
            description: "Stage",
            image: "stage.png",
            color: "#6366f1",
            isLocked: false,
            requiredScore: 0,
            levels: [
              {
                id: 1,
                title: "Level",
                isLocked: false,
                words: [
                  {
                    id: "word",
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
        culturalItems: [{ name: "beans", image: "bean.png" }],
        currency: [{ value: 500, name: "coin", image: "coin.png", targetText: "Bitaano" }],
      },
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
