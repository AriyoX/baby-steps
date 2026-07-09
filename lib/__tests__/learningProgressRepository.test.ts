jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

const mockMarkLevelCompleted = jest.fn();
const mockSaveActivity = jest.fn();
const mockSyncProgressNow = jest.fn();
const mockUpdateActivityProgress = jest.fn();

jest.mock("@/lib/progressRepository", () => ({
  markLevelCompleted: (...args: unknown[]) => mockMarkLevelCompleted(...args),
  syncProgressNow: (...args: unknown[]) => mockSyncProgressNow(...args),
  updateActivityProgress: (...args: unknown[]) => mockUpdateActivityProgress(...args),
}));

jest.mock("@/lib/utils", () => ({
  saveActivity: (...args: unknown[]) => mockSaveActivity(...args),
}));

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getDbLanguageCodeForLearningLanguage,
  getLearningLanguageFromDbCode,
} from "@/content/languages";
import type { LearningLessonCompletion } from "@/lib/learningProgressTypes";
import {
  LEARNING_ACTIVITY_TYPE,
  LOCAL_LEARNING_FALLBACK_CHILD_ID,
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
      source: "learning_hub",
      stageTitle: "First Words",
      lessonTitle: "Greetings",
      stageNumber: 1,
      lessonOrder: 1,
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
  mockMarkLevelCompleted.mockResolvedValue(undefined);
  mockSaveActivity.mockResolvedValue(true);
  mockSyncProgressNow.mockResolvedValue({ pushed: 0, skipped: 0, failed: 0 });
  mockUpdateActivityProgress.mockResolvedValue(undefined);
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
        source: "learning_hub",
        lessonId: "greetings-1",
        mechanicTypes: ["tap_to_learn"],
        stageTitle: "First Words",
        lessonTitle: "Greetings",
        stageNumber: 1,
        lessonOrder: 1,
        totalItems: 1,
        correctItems: 1,
        contentVersion: "1.1",
      }),
    );
    expect(saved.progressPayload.itemResults).toHaveLength(1);
  });

  it("queues Learning completion through the shared progress repository", async () => {
    await saveLearningLessonCompletion(
      createCompletion({
        progressPayload: {
          lessonId: "greetings-1",
          source: "learning_hub",
          stageTitle: "First Words",
          lessonTitle: "Greetings",
          stageNumber: 1,
          lessonOrder: 1,
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
          completedAt: 1000,
          contentVersion: "1.1",
        },
      }),
    );

    expect(mockUpdateActivityProgress).toHaveBeenCalledWith(
      childId,
      languageCode,
      "language",
      expect.objectContaining({
        status: "in_progress",
        score: 100,
        attempts: 1,
        last_stage_id: "first-words",
        completed_stage_count: 1,
        progress_payload: expect.objectContaining({
          source: "learning_hub",
          completedLessonIds: ["greetings-1"],
          latestLesson: expect.objectContaining({
            stageId: "first-words",
            lessonId: "greetings-1",
            stageTitle: "First Words",
            lessonTitle: "Greetings",
          }),
        }),
      }),
    );
    expect(mockSaveActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        child_id: childId,
        activity_type: "language",
        activity_name: 'Completed "Greetings" Lesson',
        score: "100%",
        completed_at: "1970-01-01T00:00:01.000Z",
        details: expect.stringMatching(
          /source=learning_hub; stageId=first-words; lessonId=greetings-1/,
        ),
        stage: 1,
        level: 1,
        language_code: "lg",
      }),
    );
    expect(mockMarkLevelCompleted).toHaveBeenCalledWith(
      childId,
      languageCode,
      "language",
      "first-words",
      "greetings-1",
      expect.objectContaining({
        score: 100,
        attempts: 1,
        completed_at: "1970-01-01T00:00:01.000Z",
        progress_payload: expect.objectContaining({
          source: "learning_hub",
          stageId: "first-words",
          lessonId: "greetings-1",
          stageTitle: "First Words",
          lessonTitle: "Greetings",
          itemResults: [
            expect.objectContaining({
              itemId: "thank-you",
              mechanic: "tap_to_learn",
              attempts: 0,
            }),
          ],
        }),
      }),
    );
    expect(mockSyncProgressNow).toHaveBeenCalledWith(childId);
  });

  it("logs a stage activity when the final startable stage lesson completes", async () => {
    await saveLearningLessonCompletion(
      createCompletion({
        progressPayload: {
          ...createCompletion().progressPayload,
          stageLessonIds: ["greetings-1", "listen-greetings-1"],
        },
      }),
    );
    await saveLearningLessonCompletion(
      createCompletion({
        localId: buildLearningCompletionLocalId(
          childId,
          languageCode,
          "first-words",
          "listen-greetings-1",
        ),
        levelId: "listen-greetings-1",
        score: 50,
        attempts: 2,
        progressPayload: {
          lessonId: "listen-greetings-1",
          source: "learning_hub",
          stageTitle: "First Words",
          lessonTitle: "Listen Practice",
          stageNumber: 1,
          lessonOrder: 2,
          stageLessonIds: ["greetings-1", "listen-greetings-1"],
          mechanicTypes: ["listen_and_choose"],
          itemResults: [],
          totalItems: 2,
          correctItems: 1,
          completedAt: 2000,
          contentVersion: "1.1",
        },
        completedAt: 2000,
      }),
    );

    expect(mockSaveActivity).toHaveBeenCalledTimes(3);
    expect(mockSaveActivity).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        child_id: childId,
        activity_type: "language",
        activity_name: 'Completed "First Words" Stage',
        score: "100%",
        completed_at: "1970-01-01T00:00:02.000Z",
        details: expect.stringContaining("lessonIds=greetings-1,listen-greetings-1"),
        stage: 1,
        language_code: "lg",
      }),
    );
  });

  it("keeps local completion when activity feed logging fails", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    mockSaveActivity.mockRejectedValueOnce(new Error("activity failed"));

    await expect(saveLearningLessonCompletion(createCompletion())).resolves.toEqual(
      expect.objectContaining({
        childId,
        languageCode,
        activityType: "language",
        stageId: "first-words",
        levelId: "greetings-1",
      }),
    );

    await expect(
      isLearningLessonCompleted(childId, languageCode, "first-words", "greetings-1"),
    ).resolves.toBe(true);
    expect(mockUpdateActivityProgress).toHaveBeenCalled();
    expect(mockMarkLevelCompleted).toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      "Could not save Learning activity feed entry:",
      expect.any(Error),
    );

    warnSpy.mockRestore();
  });

  it("keeps local completion when activity feed logging returns false", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    mockSaveActivity.mockResolvedValueOnce(false);

    await expect(saveLearningLessonCompletion(createCompletion())).resolves.toEqual(
      expect.objectContaining({
        childId,
        languageCode,
        activityType: "language",
        stageId: "first-words",
        levelId: "greetings-1",
      }),
    );

    await expect(
      isLearningLessonCompleted(childId, languageCode, "first-words", "greetings-1"),
    ).resolves.toBe(true);
    expect(mockUpdateActivityProgress).toHaveBeenCalled();
    expect(mockMarkLevelCompleted).toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      "Could not save Learning activity feed entry:",
      expect.objectContaining({
        childId,
        activityType: "language",
        activityName: 'Completed "Greetings" Lesson',
        score: "100%",
        stage: 1,
        level: 1,
        languageCode: "lg",
      }),
    );

    warnSpy.mockRestore();
  });

  it("keeps local completion when shared progress logging fails", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    mockUpdateActivityProgress.mockRejectedValueOnce(new Error("offline"));

    await expect(saveLearningLessonCompletion(createCompletion())).resolves.toEqual(
      expect.objectContaining({
        childId,
        languageCode,
        activityType: "language",
        stageId: "first-words",
        levelId: "greetings-1",
      }),
    );

    await expect(
      isLearningLessonCompleted(childId, languageCode, "first-words", "greetings-1"),
    ).resolves.toBe(true);
    expect(mockMarkLevelCompleted).not.toHaveBeenCalled();
    expect(mockSyncProgressNow).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      "Could not queue Learning lesson progress sync:",
      expect.any(Error),
    );

    expect(mockSaveActivity).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("does not queue remote progress for the local fallback child", async () => {
    await saveLearningLessonCompletion(
      createCompletion({
        childId: LOCAL_LEARNING_FALLBACK_CHILD_ID,
        localId: buildLearningCompletionLocalId(
          LOCAL_LEARNING_FALLBACK_CHILD_ID,
          languageCode,
          "first-words",
          "greetings-1",
        ),
      }),
    );

    expect(mockUpdateActivityProgress).not.toHaveBeenCalled();
    expect(mockSaveActivity).not.toHaveBeenCalled();
    expect(mockMarkLevelCompleted).not.toHaveBeenCalled();
    expect(mockSyncProgressNow).not.toHaveBeenCalled();
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
