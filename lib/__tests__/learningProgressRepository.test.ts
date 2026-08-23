jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

const mockMarkLevelCompleted = jest.fn();
const mockMarkStageCompleted = jest.fn();
const mockSaveActivity = jest.fn();
const mockSyncProgressNow = jest.fn();
const mockUpdateActivityProgress = jest.fn();
const mockCheckAndGrantLearningHubAchievements = jest.fn();
const mockGetActivityProgress = jest.fn();
const mockGetStageProgress = jest.fn();
const mockHydrateProgressFromRemote = jest.fn();
const mockEnsureLearningHubLanguageContent = jest.fn();

jest.mock("@/content/learningHubLoader", () => ({
  ensureLearningHubLanguageContent: (...args: unknown[]) =>
    mockEnsureLearningHubLanguageContent(...args),
}));

jest.mock("@/lib/progressRepository", () => ({
  getActivityProgress: (...args: unknown[]) => mockGetActivityProgress(...args),
  getStageProgress: (...args: unknown[]) => mockGetStageProgress(...args),
  hydrateProgressFromRemote: (...args: unknown[]) =>
    mockHydrateProgressFromRemote(...args),
  markLevelCompleted: (...args: unknown[]) => mockMarkLevelCompleted(...args),
  markStageCompleted: (...args: unknown[]) => mockMarkStageCompleted(...args),
  syncProgressNow: (...args: unknown[]) => mockSyncProgressNow(...args),
  updateActivityProgress: (...args: unknown[]) => mockUpdateActivityProgress(...args),
}));

jest.mock("@/lib/utils", () => ({
  saveActivity: (...args: unknown[]) => mockSaveActivity(...args),
}));

jest.mock("@/lib/learningAchievements", () => ({
  checkAndGrantLearningHubAchievements: (...args: unknown[]) =>
    mockCheckAndGrantLearningHubAchievements(...args),
}));

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getDbLanguageCodeForLearningLanguage,
  getLearningLanguageFromDbCode,
} from "@/content/languages";
import {
  getLearningHubStages,
  getLearningLanguageContent,
  getLessonStatus,
  registerLearningHubLanguageContent,
} from "@/content/learningHubRepository";
import { registerLearningHubTestFixture } from "@/content/testFixtures/learningHubTestFixture";
import type { LearningLessonCompletion } from "@/lib/learningProgressTypes";
import {
  calculateLearningProgressAggregate,
  LEARNING_ACTIVITY_TYPE,
  LOCAL_LEARNING_FALLBACK_CHILD_ID,
  buildLearningCompletionLocalId,
  clearLearningProgressForChild,
  getCompletedLearningLessonIds,
  getLearningLessonCompletion,
  hydrateLearningProgressFromRemote,
  hydrateLearningProgressFromSharedProgress,
  getLearningProgressSummary,
  isLearningLessonCompleted,
  saveLearningLessonCompletion,
  saveLearningLessonCompletionWithAchievements,
} from "../learningProgressRepository";

const childId = "child-1";
const languageCode = "lg";

const deferred = <T = void>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

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
  registerLearningHubTestFixture();
  jest.clearAllMocks();
  mockGetActivityProgress.mockResolvedValue(null);
  mockGetStageProgress.mockResolvedValue(null);
  mockHydrateProgressFromRemote.mockResolvedValue({ activities: 0, stages: 0 });
  mockEnsureLearningHubLanguageContent.mockResolvedValue({
    status: "ready",
    languageCode,
    source: "database",
    retainedPrevious: true,
  });
  mockMarkLevelCompleted.mockResolvedValue(undefined);
  mockMarkStageCompleted.mockResolvedValue(undefined);
  mockSaveActivity.mockResolvedValue(true);
  mockSyncProgressNow.mockResolvedValue({ pushed: 0, skipped: 0, failed: 0 });
  mockUpdateActivityProgress.mockResolvedValue(undefined);
  mockCheckAndGrantLearningHubAchievements.mockResolvedValue([]);
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
        completed_stage_count: 0,
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
    expect(mockMarkStageCompleted).not.toHaveBeenCalled();
    expect(mockSyncProgressNow).toHaveBeenCalledWith(childId);
  });

  it("does not treat a reused lesson ID as complete after the curriculum revision changes", async () => {
    await saveLearningLessonCompletion(createCompletion());
    await expect(
      getCompletedLearningLessonIds(childId, languageCode),
    ).resolves.toEqual(["greetings-1"]);

    const currentContent = getLearningLanguageContent(languageCode);
    expect(currentContent).not.toBeNull();
    registerLearningHubLanguageContent(
      languageCode,
      currentContent,
      "learning_hub/curriculum#2",
    );

    await expect(
      getCompletedLearningLessonIds(childId, languageCode),
    ).resolves.toEqual([]);
    await expect(
      getLearningLessonCompletion(
        childId,
        languageCode,
        "first-words",
        "greetings-1",
      ),
    ).resolves.toBeNull();

    const stored = JSON.parse(
      (await AsyncStorage.getItem(
        "@BabySteps:LearningProgress:v1:summary:child-1:lg:language",
      )) ?? "{}",
    );
    expect(stored.completedByLessonId?.["greetings-1"]).toBeDefined();
  });

  it("queues shared dirty Learning progress before starting a delayed activity insert", async () => {
    const activity = deferred<boolean>();
    mockSaveActivity.mockReturnValueOnce(activity.promise);

    await expect(saveLearningLessonCompletion(createCompletion())).resolves.toEqual(
      expect.objectContaining({ levelId: "greetings-1" }),
    );

    expect(mockUpdateActivityProgress).toHaveBeenCalledTimes(1);
    expect(mockMarkLevelCompleted).toHaveBeenCalledTimes(1);
    expect(mockSaveActivity).toHaveBeenCalledTimes(1);
    expect(mockUpdateActivityProgress.mock.invocationCallOrder[0]).toBeLessThan(
      mockSaveActivity.mock.invocationCallOrder[0],
    );
    expect(mockMarkLevelCompleted.mock.invocationCallOrder[0]).toBeLessThan(
      mockSaveActivity.mock.invocationCallOrder[0],
    );

    activity.resolve(true);
    await activity.promise;
  });

  it("logs a stage activity when the final startable stage lesson completes", async () => {
    const stage = getLearningHubStages(languageCode).find(
      (candidate) => candidate.id === "first-words",
    )!;
    const lessons = stage.lessons.filter(
      (lesson) => getLessonStatus(lesson, stage) === "startable",
    );
    const lessonIds = lessons.map((lesson) => lesson.id);

    expect(lessons.length).toBeGreaterThan(1);

    for (const [index, lesson] of lessons.entries()) {
      const completedAt = 1000 + index;
      await saveLearningLessonCompletion(
        createCompletion({
          localId: buildLearningCompletionLocalId(
            childId,
            languageCode,
            stage.id,
            lesson.id,
          ),
          stageId: stage.id,
          levelId: lesson.id,
          score: 100,
          attempts: index + 1,
          progressPayload: {
            lessonId: lesson.id,
            source: "learning_hub",
            stageTitle: stage.title,
            lessonTitle: lesson.title,
            stageNumber: stage.stageNumber,
            lessonOrder: lesson.order,
            // Deliberately stale caller input: normalized repository content must win.
            stageLessonIds: [lesson.id],
            mechanicTypes: [lesson.mechanic],
            itemResults: [],
            totalItems: 0,
            correctItems: 0,
            completedAt,
            contentVersion: "1.1",
          },
          completedAt,
        }),
      );

      if (index < lessons.length - 1) {
        expect(mockMarkStageCompleted).not.toHaveBeenCalled();
      }
    }

    const finalCompletedAt = 1000 + lessons.length - 1;
    const totalAttempts = lessons.reduce((total, _lesson, index) => total + index + 1, 0);

    expect(mockSaveActivity).toHaveBeenCalledTimes(lessons.length + 1);
    expect(mockSaveActivity).toHaveBeenNthCalledWith(
      lessons.length + 1,
      expect.objectContaining({
        child_id: childId,
        activity_type: "language",
        activity_name: `Completed "${stage.title}" Stage`,
        score: "100%",
        completed_at: new Date(finalCompletedAt).toISOString(),
        details: expect.stringContaining(`lessonIds=${lessonIds.join(",")}`),
        stage: stage.stageNumber,
        language_code: "lg",
      }),
    );
    expect(mockMarkStageCompleted).toHaveBeenCalledWith(
      childId,
      languageCode,
      "language",
      stage.id,
      expect.objectContaining({
        score: 100,
        attempts: totalAttempts,
        completed_at: new Date(finalCompletedAt).toISOString(),
        progress_payload: expect.objectContaining({
          source: "learning_hub",
          stageId: stage.id,
          stageTitle: stage.title,
          completedLessonIds: lessonIds,
          completedLessonCount: lessons.length,
          totalStartableLessons: lessons.length,
        }),
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

  it("keeps duplicate completions as one lesson summary entry", async () => {
    await saveLearningLessonCompletion(createCompletion({ completedAt: 1000, attempts: 1 }));
    await saveLearningLessonCompletion(createCompletion({ completedAt: 2000, attempts: 2 }));

    const summary = await getLearningProgressSummary(childId, languageCode);

    expect(summary.completedLessonIds).toEqual(["greetings-1"]);
    expect(Object.keys(summary.completedByLessonId)).toEqual(["greetings-1"]);
    expect(summary.completedByLessonId["greetings-1"]).toEqual(
      expect.objectContaining({
        attempts: 2,
        completedAt: 2000,
      }),
    );
  });

  it("hydrates Learning summary from shared child_stage_progress rows", async () => {
    mockGetStageProgress.mockImplementation(
      async (
        _childId: string,
        _languageCode: string,
        _activityType: string,
        stageId: string,
        levelId: string,
      ) =>
        stageId === "first-words" && levelId === "greetings-1"
          ? {
              child_id: childId,
              language_code: languageCode,
              activity_type: "language",
              stage_id: "first-words",
              level_id: "greetings-1",
              status: "completed",
              score: 100,
              stars: null,
              attempts: 1,
              completed_at: "1970-01-01T00:00:01.000Z",
              local_updated_at: "1970-01-01T00:00:01.000Z",
              progress_payload: {
                source: "learning_hub",
                stageId: "first-words",
                lessonId: "greetings-1",
                stageTitle: "First Words",
                lessonTitle: "Greetings",
                stageNumber: 1,
                lessonOrder: 1,
                mechanicTypes: ["tap_to_learn"],
                itemResults: [],
                totalItems: 0,
                correctItems: 0,
                completedAt: 1000,
                contentVersion: "1.1",
              },
            }
          : null,
    );

    const summary = await hydrateLearningProgressFromSharedProgress(
      childId,
      languageCode,
    );

    expect(summary.completedLessonIds).toEqual(["greetings-1"]);
    expect(summary.completedByLessonId["greetings-1"]).toEqual(
      expect.objectContaining({
        childId,
        languageCode,
        activityType: "language",
        stageId: "first-words",
        levelId: "greetings-1",
        status: "completed",
        completedAt: 1000,
      }),
    );
    await expect(getCompletedLearningLessonIds(childId, languageCode)).resolves.toEqual([
      "greetings-1",
    ]);
    expect(mockGetActivityProgress).toHaveBeenCalledWith(
      childId,
      languageCode,
      "language",
    );
  });

  it("preserves retired completion details from shared aggregate progress", async () => {
    const retiredLessonId = "retired-lesson";
    mockGetActivityProgress.mockResolvedValueOnce({
      child_id: childId,
      language_code: languageCode,
      activity_type: "language",
      status: "in_progress",
      score: 88,
      attempts: 2,
      last_stage_id: "retired-stage",
      completed_stage_count: 0,
      local_updated_at: "1970-01-01T00:00:05.000Z",
      progress_payload: {
        source: "learning_hub",
        completedLessonIds: [retiredLessonId],
        completedLessons: [
          {
            stageId: "retired-stage",
            lessonId: retiredLessonId,
            stageTitle: "Retired Stage",
            lessonTitle: "Retired Lesson",
            stageNumber: 9,
            lessonOrder: 3,
            score: 88,
            attempts: 2,
            completedAt: 5000,
            mechanicTypes: ["tap_to_learn"],
            itemResults: [],
            totalItems: 1,
            correctItems: 1,
            contentVersion: "retired-v1",
          },
        ],
      },
    });

    const summary = await hydrateLearningProgressFromSharedProgress(
      childId,
      languageCode,
    );

    expect(summary).toEqual(
      expect.objectContaining({
        status: "not_started",
        completedStageCount: 0,
        completedLessonIds: [],
      }),
    );
    expect(summary.completedByLessonId[retiredLessonId]).toEqual(
      expect.objectContaining({
        childId,
        languageCode,
        stageId: "retired-stage",
        levelId: retiredLessonId,
        score: 88,
        attempts: 2,
        completedAt: 5000,
        progressPayload: expect.objectContaining({
          lessonId: retiredLessonId,
          stageTitle: "Retired Stage",
          lessonTitle: "Retired Lesson",
          stageNumber: 9,
          lessonOrder: 3,
          mechanicTypes: ["tap_to_learn"],
          totalItems: 1,
          correctItems: 1,
          contentVersion: "retired-v1",
        }),
      }),
    );
  });

  it("delegates remote hydration through the shared progress repository before merging", async () => {
    await hydrateLearningProgressFromRemote(childId, "luganda", { force: true });

    expect(mockHydrateProgressFromRemote).toHaveBeenCalledWith(
      childId,
      "lg",
      expect.objectContaining({
        activityType: "language",
        force: true,
      }),
    );
    expect(mockGetStageProgress).toHaveBeenCalled();
  });

  it("does not overwrite newer local Learning completion with older hydrated progress", async () => {
    await saveLearningLessonCompletion(createCompletion({ completedAt: 3000, attempts: 2 }));
    mockGetStageProgress.mockImplementation(
      async (
        _childId: string,
        _languageCode: string,
        _activityType: string,
        stageId: string,
        levelId: string,
      ) =>
        stageId === "first-words" && levelId === "greetings-1"
          ? {
              child_id: childId,
              language_code: languageCode,
              activity_type: "language",
              stage_id: "first-words",
              level_id: "greetings-1",
              status: "completed",
              score: 100,
              stars: null,
              attempts: 1,
              completed_at: "1970-01-01T00:00:01.000Z",
              local_updated_at: "1970-01-01T00:00:01.000Z",
              progress_payload: {
                source: "learning_hub",
                stageId: "first-words",
                lessonId: "greetings-1",
                mechanicTypes: ["tap_to_learn"],
                itemResults: [],
                totalItems: 0,
                correctItems: 0,
                completedAt: 1000,
              },
            }
          : null,
    );

    const summary = await hydrateLearningProgressFromSharedProgress(
      childId,
      languageCode,
    );

    expect(summary.completedLessonIds).toEqual(["greetings-1"]);
    expect(summary.completedByLessonId["greetings-1"]).toEqual(
      expect.objectContaining({
        attempts: 2,
        completedAt: 3000,
      }),
    );
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
        completedStageCount: 0,
        completedLessonIds: ["greetings-1"],
      }),
    );
  });

  describe("Learning Hub current-curriculum aggregates", () => {
    const startableStages = () =>
      getLearningHubStages(languageCode)
        .map((stage) => ({
          stage,
          lessons: stage.lessons.filter(
            (lesson) => getLessonStatus(lesson, stage) === "startable",
          ),
        }))
        .filter(({ lessons }) => lessons.length > 0);

    const saveLessons = async (
      lessons: Array<{
        stage: ReturnType<typeof getLearningHubStages>[number];
        lesson: ReturnType<typeof getLearningHubStages>[number]["lessons"][number];
      }>,
    ) => {
      for (const [index, { stage, lesson }] of lessons.entries()) {
        await saveLearningLessonCompletion(
          createCompletion({
            localId: buildLearningCompletionLocalId(
              childId,
              languageCode,
              stage.id,
              lesson.id,
            ),
            stageId: stage.id,
            levelId: lesson.id,
            completedAt: 1000 + index,
            progressPayload: {
              ...createCompletion().progressPayload,
              lessonId: lesson.id,
              stageTitle: stage.title,
              lessonTitle: lesson.title,
              stageNumber: stage.stageNumber,
              lessonOrder: lesson.order,
              stageLessonIds: stage.lessons
                .filter(
                  (candidate) =>
                    getLessonStatus(candidate, stage) === "startable",
                )
                .map((candidate) => candidate.id),
              mechanicTypes: [lesson.mechanic],
            },
          }),
        );
      }
    };

    it("does not count several lessons in one incomplete stage as a completed stage", async () => {
      const [{ stage, lessons }] = startableStages();
      await saveLessons(
        lessons.slice(0, Math.max(1, lessons.length - 1)).map((lesson) => ({
          stage,
          lesson,
        })),
      );

      await expect(getLearningProgressSummary(childId, languageCode)).resolves.toEqual(
        expect.objectContaining({
          status: "in_progress",
          completedStageCount: 0,
        }),
      );
    });

    it("counts one stage only after all of its startable lessons are complete", async () => {
      const [{ stage, lessons }] = startableStages();
      await saveLessons(lessons.map((lesson) => ({ stage, lesson })));

      await expect(getLearningProgressSummary(childId, languageCode)).resolves.toEqual(
        expect.objectContaining({
          status: "in_progress",
          completedStageCount: 1,
        }),
      );
    });

    it("counts multiple fully completed startable stages", async () => {
      const stages = startableStages().slice(0, 2);
      await saveLessons(
        stages.flatMap(({ stage, lessons }) =>
          lessons.map((lesson) => ({ stage, lesson })),
        ),
      );

      await expect(getLearningProgressSummary(childId, languageCode)).resolves.toEqual(
        expect.objectContaining({
          status: "in_progress",
          completedStageCount: 2,
        }),
      );
    });

    it("marks the curriculum complete after every current startable lesson", async () => {
      const stages = startableStages();
      await saveLessons(
        stages.flatMap(({ stage, lessons }) =>
          lessons.map((lesson) => ({ stage, lesson })),
        ),
      );

      await expect(getLearningProgressSummary(childId, languageCode)).resolves.toEqual(
        expect.objectContaining({
          status: "completed",
          completedStageCount: stages.length,
        }),
      );
    });

    it("excludes locked Practice Mix from required lesson and stage totals", () => {
      const stages = getLearningHubStages(languageCode);
      const practiceMix = stages.find((stage) => stage.id === "practice-mix");
      const currentLessonIds = startableStages().flatMap(({ lessons }) =>
        lessons.map((lesson) => lesson.id),
      );

      expect(practiceMix).toEqual(
        expect.objectContaining({ isPractice: true, isLocked: true }),
      );
      expect(
        practiceMix?.lessons.every(
          (lesson) => getLessonStatus(lesson, practiceMix) !== "startable",
        ),
      ).toBe(true);
      expect(
        calculateLearningProgressAggregate(stages, currentLessonIds),
      ).toEqual({
        status: "completed",
        completedStageCount: startableStages().length,
      });
    });

    it("excludes locked, explicitly non-startable, and invalid content from aggregates", () => {
      const templateStage = startableStages()[0].stage;
      const templateLesson = templateStage.lessons.find(
        (lesson) => getLessonStatus(lesson, templateStage) === "startable",
      )!;
      const requiredStage = {
        ...templateStage,
        id: "required-stage",
        isLocked: false,
        locked: false,
        lessons: [
          {
            ...templateLesson,
            id: "required-lesson",
            isLocked: false,
            locked: false,
            isStartable: true,
          },
        ],
      };
      const lockedStage = {
        ...requiredStage,
        id: "locked-stage",
        isLocked: true,
        locked: true,
        lessons: [
          {
            ...requiredStage.lessons[0],
            id: "locked-lesson",
          },
        ],
      };
      const nonStartableStage = {
        ...requiredStage,
        id: "non-startable-stage",
        lessons: [
          {
            ...requiredStage.lessons[0],
            id: "non-startable-lesson",
            isStartable: false,
          },
        ],
      };
      const invalidStage = {
        ...requiredStage,
        id: "invalid-stage",
        lessons: [
          {
            ...requiredStage.lessons[0],
            id: "invalid-lesson",
            items: [],
          },
        ],
      };
      const stages = [requiredStage, lockedStage, nonStartableStage, invalidStage];

      expect(getLessonStatus(lockedStage.lessons[0], lockedStage)).toBe("locked");
      expect(
        getLessonStatus(nonStartableStage.lessons[0], nonStartableStage),
      ).toBe("coming_soon");
      expect(getLessonStatus(invalidStage.lessons[0], invalidStage)).toBe("empty");
      expect(
        calculateLearningProgressAggregate(stages, [
          "required-lesson",
          "locked-lesson",
          "non-startable-lesson",
          "invalid-lesson",
        ]),
      ).toEqual({
        status: "completed",
        completedStageCount: 1,
      });
      expect(
        calculateLearningProgressAggregate(stages, [
          "locked-lesson",
          "non-startable-lesson",
          "invalid-lesson",
        ]),
      ).toEqual({
        status: "not_started",
        completedStageCount: 0,
      });
    });

    it("preserves an unknown historic lesson id without inflating current totals", async () => {
      const unknownLessonId = "historic-retired-lesson";
      await saveLearningLessonCompletion(
        createCompletion({
          localId: buildLearningCompletionLocalId(
            childId,
            languageCode,
            "historic-stage",
            unknownLessonId,
          ),
          stageId: "historic-stage",
          levelId: unknownLessonId,
          progressPayload: {
            ...createCompletion().progressPayload,
            lessonId: unknownLessonId,
          },
        }),
      );

      const summary = await getLearningProgressSummary(childId, languageCode);
      expect(summary.completedLessonIds).toContain(unknownLessonId);
      expect(summary).toEqual(
        expect.objectContaining({
          status: "not_started",
          completedStageCount: 0,
        }),
      );
      expect(mockUpdateActivityProgress).toHaveBeenLastCalledWith(
        childId,
        languageCode,
        "language",
        expect.objectContaining({
          status: "not_started",
          completed_stage_count: 0,
          progress_payload: expect.objectContaining({
            completedLessonIds: [unknownLessonId],
            completedLessonCount: 0,
            currentCompletedLessonIds: [],
          }),
        }),
      );
    });

    it("makes a completed stage and curriculum incomplete when a new startable lesson is added", () => {
      const stages = getLearningHubStages(languageCode);
      const completedLessonIds = startableStages().flatMap(({ lessons }) =>
        lessons.map((lesson) => lesson.id),
      );
      const firstStage = stages.find((stage) => stage.id === "first-words")!;
      const templateLesson = firstStage.lessons.find(
        (lesson) => getLessonStatus(lesson, firstStage) === "startable",
      )!;
      const expandedStages = stages.map((stage) =>
        stage.id === firstStage.id
          ? {
              ...stage,
              lessons: [
                ...stage.lessons,
                {
                  ...templateLesson,
                  id: "new-startable-lesson",
                  order: stage.lessons.length + 1,
                },
              ],
            }
          : stage,
      );

      expect(
        calculateLearningProgressAggregate(stages, completedLessonIds),
      ).toEqual({
        status: "completed",
        completedStageCount: startableStages().length,
      });
      expect(
        calculateLearningProgressAggregate(expandedStages, completedLessonIds),
      ).toEqual({
        status: "in_progress",
        completedStageCount: startableStages().length - 1,
      });
      expect(completedLessonIds).not.toContain("new-startable-lesson");
    });
  });

  it("awards Learning Hub achievements after lesson completion through the wrapper", async () => {
    const firstLearningStep = {
      id: "7d4f6a00-4b5f-4e00-9a10-000000000101",
      name: "First Learning Step",
      description: "You finished your first Learning Hub lesson.",
      icon_name: "footsteps-outline",
      activity_type: "learning_hub_first_lesson",
      points: 10,
      game_key: "learning_hub",
    };
    mockCheckAndGrantLearningHubAchievements.mockResolvedValueOnce([
      firstLearningStep,
    ]);

    const result = await saveLearningLessonCompletionWithAchievements(
      createCompletion(),
    );

    expect(result.completion).toEqual(
      expect.objectContaining({
        childId,
        stageId: "first-words",
        levelId: "greetings-1",
      }),
    );
    expect(result.newlyEarnedAchievements).toEqual([firstLearningStep]);
    expect(mockCheckAndGrantLearningHubAchievements).toHaveBeenCalledWith(
      expect.objectContaining({
        childId,
        languageCode,
        completion: expect.objectContaining({
          stageId: "first-words",
          levelId: "greetings-1",
        }),
        completedLessonIds: ["greetings-1"],
      }),
    );
  });

  it("does not block lesson completion when achievement awarding fails", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    mockCheckAndGrantLearningHubAchievements.mockRejectedValueOnce(
      new Error("achievement save failed"),
    );

    await expect(
      saveLearningLessonCompletionWithAchievements(createCompletion()),
    ).resolves.toEqual({
      completion: expect.objectContaining({
        childId,
        stageId: "first-words",
        levelId: "greetings-1",
      }),
      newlyEarnedAchievements: [],
    });
    await expect(
      isLearningLessonCompleted(childId, languageCode, "first-words", "greetings-1"),
    ).resolves.toBe(true);
    expect(warnSpy).toHaveBeenCalledWith(
      "Could not award Learning Hub achievements:",
      expect.any(Error),
    );

    warnSpy.mockRestore();
  });

  it("maps known language labels without substituting unknown languages", () => {
    expect(getDbLanguageCodeForLearningLanguage("luganda")).toBe("lg");
    expect(getDbLanguageCodeForLearningLanguage("Oluganda")).toBe("lg");
    expect(getDbLanguageCodeForLearningLanguage("runyankore")).toBe("nyn");
    expect(getDbLanguageCodeForLearningLanguage("missing")).toBe("missing");
    expect(getLearningLanguageFromDbCode("lg")).toBe("lg");
  });
});
