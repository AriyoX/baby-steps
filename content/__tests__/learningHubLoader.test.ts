const mockLoadContentBundle = jest.fn();

jest.mock("../contentRepository", () => ({
  loadContentBundle: (...args: unknown[]) => mockLoadContentBundle(...args),
}));

import {
  loadLearningHubLanguageContent,
} from "../learningHubLoader";
import {
  clearLearningHubContentRegistry,
  getLearningContentVersion,
  getLearningLanguageContent,
} from "../learningHubRepository";
import { getLearningHubSeedFixture } from "../testFixtures/learningHubTestFixture";

const getLugandaSeed = (): Record<string, unknown> => {
  const content = getLearningHubSeedFixture().languages.lg;
  if (!content || typeof content !== "object" || Array.isArray(content)) {
    throw new Error("Missing Luganda Learning Hub seed fixture.");
  }
  return content as Record<string, unknown>;
};

const databaseResult = (
  languageCode: string,
  learningHub: unknown,
  contentVersion: string,
) => ({
  languageCode,
  source: "database",
  bundle: {
    languageCode,
    source: "database",
    contentVersion,
    learningHub,
  },
  cache: {
    cacheKey: `test:${languageCode}`,
    contentVersion,
    loadedAt: 1,
    source: "network",
    isStale: false,
    maxAgeMs: 1,
  },
});

beforeEach(() => {
  clearLearningHubContentRegistry();
  jest.clearAllMocks();
});

describe("Learning Hub async loader", () => {
  it("queries the exact requested language and never substitutes Luganda", async () => {
    mockLoadContentBundle.mockResolvedValue({
      languageCode: "nyn",
      source: "empty",
      missingReason: "No Runyankole Learning Hub content.",
    });

    await expect(loadLearningHubLanguageContent("nyn")).resolves.toEqual(
      expect.objectContaining({
        status: "unavailable",
        languageCode: "nyn",
        retainedPrevious: false,
      }),
    );
    expect(mockLoadContentBundle).toHaveBeenCalledWith("nyn", {});
    expect(getLearningLanguageContent("nyn")).toBeNull();
    expect(getLearningLanguageContent("lg")).toBeNull();
  });

  it("registers a valid published bundle with its content version", async () => {
    mockLoadContentBundle.mockResolvedValue(
      databaseResult("lg", getLugandaSeed(), "learning-hub@1"),
    );

    await expect(loadLearningHubLanguageContent("lg")).resolves.toEqual(
      expect.objectContaining({
        status: "ready",
        languageCode: "lg",
        contentVersion: "learning-hub@1",
        retainedPrevious: false,
      }),
    );
    expect(getLearningLanguageContent("lg")?.stages[0].id).toBe("first-words");
    expect(getLearningContentVersion("lg")).toBe("learning-hub@1");
  });

  it("retains the last valid version when a refresh is malformed", async () => {
    mockLoadContentBundle
      .mockResolvedValueOnce(
        databaseResult("lg", getLugandaSeed(), "learning-hub@1"),
      )
      .mockResolvedValueOnce(
        databaseResult(
          "lg",
          {
            languageCode: "lg",
            stages: [{ title: "Missing stable ids", lessons: [] }],
          },
          "learning-hub@2",
        ),
      );

    await loadLearningHubLanguageContent("lg");
    const refreshed = await loadLearningHubLanguageContent("lg", {
      forceRefresh: true,
    });

    expect(refreshed).toEqual(
      expect.objectContaining({
        status: "ready",
        contentVersion: "learning-hub@1",
        retainedPrevious: true,
      }),
    );
    expect(getLearningContentVersion("lg")).toBe("learning-hub@1");
    expect(getLearningLanguageContent("lg")?.stages[0].id).toBe("first-words");
  });

  it("rejects a cross-language bundle response", async () => {
    mockLoadContentBundle.mockResolvedValue(
      databaseResult("lg", getLugandaSeed(), "learning-hub@1"),
    );

    const result = await loadLearningHubLanguageContent("nyn");

    expect(result.status).toBe("unavailable");
    expect(getLearningLanguageContent("nyn")).toBeNull();
  });
});
