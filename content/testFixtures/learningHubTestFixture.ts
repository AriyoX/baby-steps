import {
  clearLearningHubContentRegistry,
  registerLearningHubLanguageContent,
} from "../learningHubRepository";

interface SeedLearningHubFixture {
  version: string;
  languages: Record<string, unknown>;
}

// The former runtime JSON is retained as the initial migration source snapshot
// and a test fixture. The production migration chain is the deployed canonical
// seed, and production modules must never import this file or the JSON.
const learningHubSeed = require("../learningHubContent.json") as SeedLearningHubFixture;

export const registerLearningHubTestFixture = (): void => {
  clearLearningHubContentRegistry();

  Object.entries(learningHubSeed.languages).forEach(([languageCode, content]) => {
    const registered = registerLearningHubLanguageContent(
      languageCode,
      content,
      learningHubSeed.version,
    );

    if (!registered) {
      throw new Error(`Invalid Learning Hub test fixture for ${languageCode}.`);
    }
  });
};

export const getLearningHubSeedFixture = (): SeedLearningHubFixture =>
  learningHubSeed;
