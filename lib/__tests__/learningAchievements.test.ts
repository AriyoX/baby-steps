const mockFetchAllDefinedAchievements = jest.fn();
const mockFetchChildEarnedAchievements = jest.fn();
const mockCheckAndGrantNewAchievements = jest.fn();

jest.mock("@/components/games/achievements/achievementManager", () => ({
  LEARNING_HUB_GAME_KEY: "learning_hub",
  fetchAllDefinedAchievements: (...args: unknown[]) =>
    mockFetchAllDefinedAchievements(...args),
  fetchChildEarnedAchievements: (...args: unknown[]) =>
    mockFetchChildEarnedAchievements(...args),
  checkAndGrantNewAchievements: (...args: unknown[]) =>
    mockCheckAndGrantNewAchievements(...args),
}));

import type { AchievementDefinition } from "@/components/games/achievements/achievementTypes";
import type { LearningLessonCompletion } from "@/lib/learningProgressTypes";
import { checkAndGrantLearningHubAchievements } from "../learningAchievements";

const achievement: AchievementDefinition = {
  id: "7d4f6a00-4b5f-4e00-9a10-000000000103",
  name: "First Words Explorer",
  description: "You completed every startable First Words lesson.",
  icon_name: "ribbon-outline",
  activity_type: "learning_hub_first_words_complete",
  points: 25,
  game_key: "learning_hub",
};

const completion: LearningLessonCompletion = {
  localId: "learning:child-1:lg:language:first-words:first-words-quick-review",
  childId: "child-1",
  languageCode: "lg",
  activityType: "language",
  stageId: "first-words",
  levelId: "first-words-quick-review",
  status: "completed",
  score: 100,
  attempts: 1,
  completedAt: 1000,
  progressPayload: {
    source: "learning_hub",
    lessonId: "first-words-quick-review",
    stageTitle: "First Words",
    lessonTitle: "First Words Quiz",
    mechanicTypes: ["mini_quiz"],
    stageLessonIds: ["stale-payload-value"],
    itemResults: [],
    totalItems: 1,
    correctItems: 1,
  },
  readiness: "local_only",
};

beforeEach(() => {
  jest.clearAllMocks();
  mockFetchAllDefinedAchievements.mockResolvedValue([achievement]);
  mockFetchChildEarnedAchievements.mockResolvedValue([]);
  mockCheckAndGrantNewAchievements.mockResolvedValue([achievement]);
});

describe("Learning Hub achievement adapter", () => {
  it("passes repository-derived startable stage lessons into the achievement checker", async () => {
    await expect(
      checkAndGrantLearningHubAchievements({
        childId: "child-1",
        languageCode: "lg",
        completion,
        completedLessonIds: [
          "greetings-1",
          "listen-greetings-1",
          "first-words-word-check",
          "first-words-picture-match",
          "first-words-quick-review",
        ],
      }),
    ).resolves.toEqual([achievement]);

    expect(mockFetchAllDefinedAchievements).toHaveBeenCalledWith("learning_hub");
    expect(mockCheckAndGrantNewAchievements).toHaveBeenCalledWith(
      expect.objectContaining({
        childId: "child-1",
        event: expect.objectContaining({
          type: "learning_hub_lesson_completed",
          gameKey: "learning_hub",
          stageId: "first-words",
          lessonId: "first-words-quick-review",
          mechanicTypes: ["mini_quiz"],
          stageStartableLessonIds: [
            "greetings-1",
            "listen-greetings-1",
            "first-words-word-check",
            "first-words-picture-match",
            "first-words-quick-review",
          ],
        }),
      }),
    );
  });
});
