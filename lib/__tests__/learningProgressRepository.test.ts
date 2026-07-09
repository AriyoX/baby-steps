jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getDbLanguageCodeForLearningLanguage,
  getLearningLanguageFromDbCode,
} from "@/content/languages";
import type { LearningLessonCompletion } from "@/lib/learningProgressTypes";
import {
  LEARNING_ACTIVITY_TYPE,
  buildLearningCompletionLocalId,
  clearLearningProgressForChild,
  getCompletedLearningLessonIds,
  getLearningProgressSummary,
  isLearningLessonCompleted,
  saveLearningLessonCompletion,
} from "../learningProgressRepository";

const childId = "child-1";
const languageCode = "lg";

const createCompletion = (
  overrides: Partial<LearningLessonCompletion> = {},
): LearningLessonCompletion => ({
  localId: buildLearningCompletionLocalId(
    childId,
    languageCode,
    "first-words",
    "greetings-1",
  ),
  childId,
  languageCode,
  activityType: LEARNING_ACTIVITY_TYPE,
  stageId: "first-words",
  levelId: "greetings-1",
  status: "completed",
  score: 100,
  attempts: 1,
  completedAt: 1000,
  progressPayload: {
    lessonId: "greetings-1",
    mechanicTypes: ["tap_to_learn"],
    itemResults: [
      {
        itemId: "thank-you",
        mechanic: "tap_to_learn",
        completedAt: 1000,
        attempts: 0,
      },
    ],
    totalItems: 1,
    correctItems: 1,
    contentVersion: "1.1",
  },
  readiness: "local_only",
  ...overrides,
});

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
});

describe("learning progress repository", () => {
  it("returns a safe empty summary when no local progress exists", async () => {
    const summary = await getLearningProgressSummary(childId, languageCode);

    expect(summary).toEqual({
      childId,
      languageCode,
      activityType: "language",
      status: "not_started",
      attempts: 0,
      completedStageCount: 0,
      completedLessonIds: [],
      completedByLessonId: {},
    });
  });

  it("saves completion locally using child_stage_progress-aligned fields", async () => {
    await saveLearningLessonCompletion(createCompletion());

    const summary = await getLearningProgressSummary(childId, languageCode);
    const saved = summary.completedByLessonId["greetings-1"];

    expect(saved).toEqual(
      expect.objectContaining({
        childId,
        languageCode,
        activityType: "language",
        stageId: "first-words",
        levelId: "greetings-1",
        status: "completed",
        attempts: 1,
        readiness: "local_only",
      }),
    );
    expect(saved.progressPayload).toEqual(
      expect.objectContaining({
        lessonId: "greetings-1",
        mechanicTypes: ["tap_to_learn"],
        totalItems: 1,
        correctItems: 1,
        contentVersion: "1.1",
      }),
    );
    expect(saved.progressPayload.itemResults).toHaveLength(1);
  });

  it("checks completed lessons by stageId and lessonId", async () => {
    await saveLearningLessonCompletion(createCompletion());

    await expect(
      isLearningLessonCompleted(childId, languageCode, "first-words", "greetings-1"),
    ).resolves.toBe(true);
    await expect(
      isLearningLessonCompleted(childId, languageCode, "family-home", "greetings-1"),
    ).resolves.toBe(false);
  });

  it("keeps storage separate by childId and languageCode", async () => {
    await saveLearningLessonCompletion(createCompletion());
    await saveLearningLessonCompletion(
      createCompletion({
        localId: buildLearningCompletionLocalId(
          childId,
          "nyn",
          "first-words",
          "nyn-greeting",
        ),
        languageCode: "nyn",
        levelId: "nyn-greeting",
        progressPayload: {
          lessonId: "nyn-greeting",
          mechanicTypes: ["tap_to_learn"],
          itemResults: [],
          totalItems: 0,
          correctItems: 0,
        },
      }),
    );

    await expect(getCompletedLearningLessonIds(childId, "lg")).resolves.toEqual([
      "greetings-1",
    ]);
    await expect(getCompletedLearningLessonIds(childId, "nyn")).resolves.toEqual([
      "nyn-greeting",
    ]);
  });

  it("does not crash on corrupted local JSON", async () => {
    await AsyncStorage.setItem(
      "@BabySteps:LearningProgress:v1:summary:child-1:lg:language",
      "{bad json",
    );

    await expect(getLearningProgressSummary(childId, languageCode)).resolves.toEqual(
      expect.objectContaining({
        status: "not_started",
        completedLessonIds: [],
      }),
    );
  });

  it("clears local Learning progress for one child", async () => {
    await saveLearningLessonCompletion(createCompletion());
    await saveLearningLessonCompletion(
      createCompletion({
        childId: "child-2",
        localId: buildLearningCompletionLocalId(
          "child-2",
          languageCode,
          "first-words",
          "greetings-1",
        ),
      }),
    );

    await clearLearningProgressForChild(childId);

    await expect(getCompletedLearningLessonIds(childId, languageCode)).resolves.toEqual([]);
    await expect(getCompletedLearningLessonIds("child-2", languageCode)).resolves.toEqual([
      "greetings-1",
    ]);
  });

  it("keeps the summary shaped like child_activity_progress aggregate fields", async () => {
    await saveLearningLessonCompletion(createCompletion({ attempts: 2 }));

    const summary = await getLearningProgressSummary(childId, languageCode);

    expect(summary).toEqual(
      expect.objectContaining({
        childId,
        languageCode,
        activityType: "language",
        status: "in_progress",
        attempts: 2,
        lastStageId: "first-words",
        completedStageCount: 1,
        completedLessonIds: ["greetings-1"],
      }),
    );
  });

  it("maps legacy Learning language labels to DB language codes", () => {
    expect(getDbLanguageCodeForLearningLanguage("luganda")).toBe("lg");
    expect(getDbLanguageCodeForLearningLanguage("Oluganda")).toBe("lg");
    expect(getDbLanguageCodeForLearningLanguage("runyankore")).toBe("nyn");
    expect(getDbLanguageCodeForLearningLanguage("missing")).toBe("lg");
    expect(getLearningLanguageFromDbCode("lg")).toBe("lg");
  });
});
