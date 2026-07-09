import AsyncStorage from "@react-native-async-storage/async-storage";
import { getDbLanguageCodeForLearningLanguage } from "@/content/languages";
import type { ItemResult } from "@/content/learningHubTypes";
import type {
  LearningActivityType,
  LearningLessonCompletion,
  LearningProgressSummary,
} from "@/lib/learningProgressTypes";
import {
  markLevelCompleted,
  syncProgressNow,
  updateActivityProgress,
} from "@/lib/progressRepository";
import { saveActivity, type Activity } from "@/lib/utils";

export const LEARNING_ACTIVITY_TYPE: LearningActivityType = "language";
export const LOCAL_LEARNING_FALLBACK_CHILD_ID = "local-demo-child";
const LEARNING_PROGRESS_SOURCE = "learning_hub";

const LEARNING_PROGRESS_STORAGE_PREFIX = "@BabySteps:LearningProgress:v1";

const encodeKeyPart = (value: string): string => encodeURIComponent(value);

const normalizeChildId = (childId?: string | null): string => {
  const normalized = childId?.trim();
  return normalized || LOCAL_LEARNING_FALLBACK_CHILD_ID;
};

const normalizeLanguageCode = (languageCode?: string | null): string =>
  getDbLanguageCodeForLearningLanguage(languageCode);

export const getLearningProgressChildId = (
  childId?: string | null,
): string => normalizeChildId(childId);

export const buildLearningCompletionLocalId = (
  childId: string,
  languageCode: string,
  stageId: string,
  lessonId: string,
): string =>
  [
    "learning",
    normalizeChildId(childId),
    normalizeLanguageCode(languageCode),
    LEARNING_ACTIVITY_TYPE,
    stageId,
    lessonId,
  ].join(":");

const summaryStorageKey = (
  childId: string,
  languageCode: string,
  activityType: LearningActivityType = LEARNING_ACTIVITY_TYPE,
): string =>
  `${LEARNING_PROGRESS_STORAGE_PREFIX}:summary:${encodeKeyPart(
    normalizeChildId(childId),
  )}:${encodeKeyPart(normalizeLanguageCode(languageCode))}:${encodeKeyPart(activityType)}`;

const emptySummary = (
  childId: string,
  languageCode: string,
  activityType: LearningActivityType = LEARNING_ACTIVITY_TYPE,
): LearningProgressSummary => ({
  childId: normalizeChildId(childId),
  languageCode: normalizeLanguageCode(languageCode),
  activityType,
  status: "not_started",
  attempts: 0,
  completedStageCount: 0,
  completedLessonIds: [],
  completedByLessonId: {},
});

const safeParse = <T>(value: string | null): T | null => {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const compactRecord = (
  record: Record<string, unknown>,
): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined),
  );

const asOptionalString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim().length > 0 ? value : undefined;

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.length > 0)
    : [];

const asNonNegativeInteger = (
  value: unknown,
  fallback = 0,
): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(0, Math.round(value));
};

const summarizeItemResult = (result: ItemResult): Record<string, unknown> =>
  compactRecord({
    itemId: result.itemId,
    mechanic: result.mechanic,
    correct: result.correct,
    attempts:
      typeof result.attempts === "number"
        ? asNonNegativeInteger(result.attempts)
        : undefined,
    completedAt:
      typeof result.completedAt === "number" && Number.isFinite(result.completedAt)
        ? result.completedAt
        : undefined,
    hintUsed: result.hintUsed === true ? true : undefined,
  });

const getCompletionLessonId = (completion: LearningLessonCompletion): string =>
  completion.progressPayload.lessonId || completion.levelId;

const toCompletionIso = (completedAt: number): string =>
  new Date(completedAt).toISOString();

const buildLessonProgressPayload = (
  completion: LearningLessonCompletion,
): Record<string, unknown> =>
  compactRecord({
    source: LEARNING_PROGRESS_SOURCE,
    stageId: completion.stageId,
    lessonId: getCompletionLessonId(completion),
    stageTitle: completion.progressPayload.stageTitle,
    lessonTitle: completion.progressPayload.lessonTitle,
    stageNumber: completion.progressPayload.stageNumber,
    lessonOrder: completion.progressPayload.lessonOrder,
    mechanicTypes: completion.progressPayload.mechanicTypes,
    itemResults: completion.progressPayload.itemResults.map(summarizeItemResult),
    totalItems: completion.progressPayload.totalItems,
    correctItems: completion.progressPayload.correctItems,
    contentVersion: completion.progressPayload.contentVersion,
    completedAt: completion.completedAt,
  });

const buildActivityProgressPayload = (
  summary: LearningProgressSummary,
  latestCompletion: LearningLessonCompletion,
): Record<string, unknown> =>
  compactRecord({
    source: LEARNING_PROGRESS_SOURCE,
    completedLessonIds: summary.completedLessonIds,
    completedLessonCount: summary.completedLessonIds.length,
    completedLessons: summary.completedLessonIds.map((lessonId) => {
      const completion = summary.completedByLessonId[lessonId];

      return compactRecord({
      stageId: completion.stageId,
      lessonId: getCompletionLessonId(completion),
      stageTitle: completion.progressPayload.stageTitle,
      lessonTitle: completion.progressPayload.lessonTitle,
      stageNumber: completion.progressPayload.stageNumber,
      lessonOrder: completion.progressPayload.lessonOrder,
      score: completion.score,
      attempts: completion.attempts,
        completedAt: completion.completedAt,
      });
    }),
    latestLesson: compactRecord({
      stageId: latestCompletion.stageId,
      lessonId: getCompletionLessonId(latestCompletion),
      stageTitle: latestCompletion.progressPayload.stageTitle,
      lessonTitle: latestCompletion.progressPayload.lessonTitle,
      stageNumber: latestCompletion.progressPayload.stageNumber,
      lessonOrder: latestCompletion.progressPayload.lessonOrder,
      score: latestCompletion.score,
      attempts: latestCompletion.attempts,
      mechanicTypes: latestCompletion.progressPayload.mechanicTypes,
      totalItems: latestCompletion.progressPayload.totalItems,
      correctItems: latestCompletion.progressPayload.correctItems,
      contentVersion: latestCompletion.progressPayload.contentVersion,
      completedAt: latestCompletion.completedAt,
    }),
  });

const getActivityTitle = (
  value: string | undefined,
  fallback: string,
): string => value?.trim() || fallback;

const getLearningActivityScore = (
  score: number | undefined,
): string | undefined =>
  typeof score === "number" && Number.isFinite(score) ? `${score}%` : undefined;

const getStageJustCompleted = (
  previousSummary: LearningProgressSummary,
  updatedSummary: LearningProgressSummary,
  completion: LearningLessonCompletion,
): boolean => {
  const stageLessonIds = completion.progressPayload.stageLessonIds ?? [];
  if (stageLessonIds.length === 0) return false;

  const previousCompletedIds = new Set(previousSummary.completedLessonIds);
  const updatedCompletedIds = new Set(updatedSummary.completedLessonIds);
  const wasComplete = stageLessonIds.every((lessonId) =>
    previousCompletedIds.has(lessonId),
  );
  const isComplete = stageLessonIds.every((lessonId) =>
    updatedCompletedIds.has(lessonId),
  );

  return isComplete && !wasComplete;
};

const buildLearningLessonActivity = (
  completion: LearningLessonCompletion,
): Activity => {
  const lessonId = getCompletionLessonId(completion);
  const stageTitle = getActivityTitle(
    completion.progressPayload.stageTitle,
    completion.stageId,
  );
  const lessonTitle = getActivityTitle(
    completion.progressPayload.lessonTitle,
    lessonId,
  );
  const activity: Activity = {
    child_id: completion.childId,
    activity_type: LEARNING_ACTIVITY_TYPE,
    activity_name: `Completed "${lessonTitle}" Lesson`,
    completed_at: toCompletionIso(completion.completedAt),
    details: `Completed "${lessonTitle}" in ${stageTitle}. source=learning_hub; stageId=${completion.stageId}; lessonId=${lessonId}; items=${completion.progressPayload.correctItems}/${completion.progressPayload.totalItems}; attempts=${completion.attempts}`,
    language_code: completion.languageCode,
  };
  const score = getLearningActivityScore(completion.score);

  if (score) {
    activity.score = score;
  }

  if (completion.progressPayload.stageNumber !== undefined) {
    activity.stage = completion.progressPayload.stageNumber;
  }

  if (completion.progressPayload.lessonOrder !== undefined) {
    activity.level = completion.progressPayload.lessonOrder;
  }

  return activity;
};

const buildLearningStageActivity = (
  completion: LearningLessonCompletion,
): Activity => {
  const stageTitle = getActivityTitle(
    completion.progressPayload.stageTitle,
    completion.stageId,
  );
  const stageLessonIds = completion.progressPayload.stageLessonIds ?? [];
  const activity: Activity = {
    child_id: completion.childId,
    activity_type: LEARNING_ACTIVITY_TYPE,
    activity_name: `Completed "${stageTitle}" Stage`,
    score: "100%",
    completed_at: toCompletionIso(completion.completedAt),
    details: `Completed all startable lessons in ${stageTitle}. source=learning_hub; stageId=${completion.stageId}; lessonIds=${stageLessonIds.join(",")}`,
    language_code: completion.languageCode,
  };

  if (completion.progressPayload.stageNumber !== undefined) {
    activity.stage = completion.progressPayload.stageNumber;
  }

  return activity;
};

const getLearningActivityLogContext = (activity: Activity) =>
  compactRecord({
    childId: activity.child_id,
    activityType: activity.activity_type,
    activityName: activity.activity_name,
    score: activity.score,
    stage: activity.stage,
    level: activity.level,
    languageCode: activity.language_code,
  });

const saveLearningActivityEntry = async (activity: Activity): Promise<void> => {
  try {
    const saved = await saveActivity(activity);

    if (!saved) {
      console.warn(
        "Could not save Learning activity feed entry:",
        getLearningActivityLogContext(activity),
      );
    }
  } catch (error) {
    console.warn("Could not save Learning activity feed entry:", error);
  }
};

const saveLearningActivityEntries = async (
  previousSummary: LearningProgressSummary,
  updatedSummary: LearningProgressSummary,
  completion: LearningLessonCompletion,
): Promise<void> => {
  if (completion.childId === LOCAL_LEARNING_FALLBACK_CHILD_ID) {
    return;
  }

  await saveLearningActivityEntry(buildLearningLessonActivity(completion));

  if (getStageJustCompleted(previousSummary, updatedSummary, completion)) {
    await saveLearningActivityEntry(buildLearningStageActivity(completion));
  }
};

const queueLearningLessonProgressSync = async (
  summary: LearningProgressSummary,
  completion: LearningLessonCompletion,
): Promise<void> => {
  if (completion.childId === LOCAL_LEARNING_FALLBACK_CHILD_ID) {
    return;
  }

  try {
    await updateActivityProgress(
      completion.childId,
      completion.languageCode,
      LEARNING_ACTIVITY_TYPE,
      {
        status: "in_progress",
        score: completion.score,
        attempts: summary.attempts,
        last_stage_id: completion.stageId,
        completed_stage_count: summary.completedStageCount,
        progress_payload: buildActivityProgressPayload(summary, completion),
      },
    );
    await markLevelCompleted(
      completion.childId,
      completion.languageCode,
      LEARNING_ACTIVITY_TYPE,
      completion.stageId,
      completion.levelId,
      {
        score: completion.score,
        attempts: completion.attempts,
        completed_at: toCompletionIso(completion.completedAt),
        progress_payload: buildLessonProgressPayload(completion),
      },
    );
    void syncProgressNow(completion.childId).catch((error) => {
      console.warn("Could not sync Learning lesson progress immediately:", error);
    });
  } catch (error) {
    console.warn("Could not queue Learning lesson progress sync:", error);
  }
};

const sanitizeCompletion = (
  value: unknown,
  expected: {
    childId: string;
    languageCode: string;
    activityType: LearningActivityType;
    lessonId?: string;
  },
): LearningLessonCompletion | null => {
  const record = asRecord(value);
  const progressPayload = asRecord(record.progressPayload);
  const lessonId =
    typeof progressPayload.lessonId === "string" ? progressPayload.lessonId : "";

  if (
    record.childId !== expected.childId ||
    record.languageCode !== expected.languageCode ||
    record.activityType !== expected.activityType ||
    record.status !== "completed" ||
    typeof record.stageId !== "string" ||
    typeof record.levelId !== "string" ||
    (expected.lessonId && lessonId !== expected.lessonId)
  ) {
    return null;
  }

  const itemResults = Array.isArray(progressPayload.itemResults)
    ? progressPayload.itemResults
    : [];
  const mechanicTypes = Array.isArray(progressPayload.mechanicTypes)
    ? progressPayload.mechanicTypes.filter(
        (mechanic): mechanic is string => typeof mechanic === "string",
      )
    : [];
  const totalItems =
    typeof progressPayload.totalItems === "number" && Number.isFinite(progressPayload.totalItems)
      ? asNonNegativeInteger(progressPayload.totalItems)
      : itemResults.length;
  const correctItems =
    typeof progressPayload.correctItems === "number" && Number.isFinite(progressPayload.correctItems)
      ? asNonNegativeInteger(progressPayload.correctItems)
      : itemResults.filter((result) => asRecord(result).correct !== false).length;
  const completedAt =
    typeof record.completedAt === "number" && Number.isFinite(record.completedAt)
      ? record.completedAt
      : Date.now();

  return {
    localId:
      typeof record.localId === "string"
        ? record.localId
        : buildLearningCompletionLocalId(
            expected.childId,
            expected.languageCode,
            record.stageId,
            record.levelId,
          ),
    childId: expected.childId,
    languageCode: expected.languageCode,
    activityType: expected.activityType,
    stageId: record.stageId,
    levelId: record.levelId,
    status: "completed",
    score:
      typeof record.score === "number" && Number.isFinite(record.score)
        ? asNonNegativeInteger(record.score)
        : undefined,
    stars:
      typeof record.stars === "number" && Number.isFinite(record.stars)
        ? asNonNegativeInteger(record.stars)
        : undefined,
    attempts: asNonNegativeInteger(record.attempts),
    completedAt,
    progressPayload: {
      source:
        progressPayload.source === LEARNING_PROGRESS_SOURCE
          ? LEARNING_PROGRESS_SOURCE
          : undefined,
      lessonId: lessonId || record.levelId,
      stageTitle: asOptionalString(progressPayload.stageTitle),
      lessonTitle: asOptionalString(progressPayload.lessonTitle),
      stageNumber:
        typeof progressPayload.stageNumber === "number" &&
        Number.isFinite(progressPayload.stageNumber)
          ? asNonNegativeInteger(progressPayload.stageNumber)
          : undefined,
      lessonOrder:
        typeof progressPayload.lessonOrder === "number" &&
        Number.isFinite(progressPayload.lessonOrder)
          ? asNonNegativeInteger(progressPayload.lessonOrder)
          : undefined,
      stageLessonIds: asStringArray(progressPayload.stageLessonIds),
      mechanicTypes,
      itemResults: itemResults as LearningLessonCompletion["progressPayload"]["itemResults"],
      totalItems,
      correctItems,
      completedAt:
        typeof progressPayload.completedAt === "number" &&
        Number.isFinite(progressPayload.completedAt)
          ? progressPayload.completedAt
          : completedAt,
      contentVersion:
        typeof progressPayload.contentVersion === "string"
          ? progressPayload.contentVersion
          : undefined,
    },
    readiness: "local_only",
  };
};

const sanitizeSummary = (
  value: unknown,
  childId: string,
  languageCode: string,
  activityType: LearningActivityType = LEARNING_ACTIVITY_TYPE,
): LearningProgressSummary => {
  const normalizedChildId = normalizeChildId(childId);
  const normalizedLanguageCode = normalizeLanguageCode(languageCode);
  const record = asRecord(value);
  const rawCompletions = asRecord(record.completedByLessonId);
  const completedByLessonId = Object.values(rawCompletions).reduce<
    Record<string, LearningLessonCompletion>
  >((current, rawCompletion) => {
    const completion = sanitizeCompletion(rawCompletion, {
      childId: normalizedChildId,
      languageCode: normalizedLanguageCode,
      activityType,
    });

    if (completion) {
      current[completion.progressPayload.lessonId] = completion;
    }

    return current;
  }, {});
  const completedLessonIds = Object.keys(completedByLessonId).sort((first, second) => {
    const firstCompletion = completedByLessonId[first];
    const secondCompletion = completedByLessonId[second];
    return (
      firstCompletion.completedAt - secondCompletion.completedAt ||
      first.localeCompare(second)
    );
  });
  const attempts = completedLessonIds.reduce(
    (total, lessonId) => total + completedByLessonId[lessonId].attempts,
    0,
  );
  const lastCompletion = completedLessonIds
    .map((lessonId) => completedByLessonId[lessonId])
    .sort((first, second) => second.completedAt - first.completedAt)[0];

  return {
    childId: normalizedChildId,
    languageCode: normalizedLanguageCode,
    activityType,
    status: completedLessonIds.length > 0 ? "in_progress" : "not_started",
    attempts,
    lastStageId: lastCompletion?.stageId,
    completedStageCount: completedLessonIds.length,
    completedLessonIds,
    completedByLessonId,
  };
};

const writeSummary = async (
  summary: LearningProgressSummary,
): Promise<LearningProgressSummary> => {
  const sanitizedSummary = sanitizeSummary(
    summary,
    summary.childId,
    summary.languageCode,
    summary.activityType,
  );

  await AsyncStorage.setItem(
    summaryStorageKey(
      sanitizedSummary.childId,
      sanitizedSummary.languageCode,
      sanitizedSummary.activityType,
    ),
    JSON.stringify(sanitizedSummary),
  );

  return sanitizedSummary;
};

export const getLearningProgressSummary = async (
  childId: string,
  languageCode: string,
  activityType: LearningActivityType = LEARNING_ACTIVITY_TYPE,
): Promise<LearningProgressSummary> => {
  const normalizedChildId = normalizeChildId(childId);
  const normalizedLanguageCode = normalizeLanguageCode(languageCode);
  const parsed = safeParse<LearningProgressSummary>(
    await AsyncStorage.getItem(
      summaryStorageKey(normalizedChildId, normalizedLanguageCode, activityType),
    ),
  );

  if (!parsed) {
    return emptySummary(normalizedChildId, normalizedLanguageCode, activityType);
  }

  return sanitizeSummary(
    parsed,
    normalizedChildId,
    normalizedLanguageCode,
    activityType,
  );
};

export const saveLearningLessonCompletion = async (
  completion: LearningLessonCompletion,
): Promise<LearningLessonCompletion> => {
  const normalizedChildId = normalizeChildId(completion.childId);
  const normalizedLanguageCode = normalizeLanguageCode(completion.languageCode);
  const lessonId = completion.progressPayload.lessonId || completion.levelId;
  const sanitizedCompletion = sanitizeCompletion(
    {
      ...completion,
      childId: normalizedChildId,
      languageCode: normalizedLanguageCode,
      activityType: LEARNING_ACTIVITY_TYPE,
      levelId: completion.levelId || lessonId,
      status: "completed",
      progressPayload: {
        source: LEARNING_PROGRESS_SOURCE,
        ...completion.progressPayload,
        lessonId,
      },
      readiness: "local_only",
    },
    {
      childId: normalizedChildId,
      languageCode: normalizedLanguageCode,
      activityType: LEARNING_ACTIVITY_TYPE,
      lessonId,
    },
  );

  if (!sanitizedCompletion) {
    throw new Error("Learning lesson completion is missing required fields.");
  }

  const summary = await getLearningProgressSummary(
    normalizedChildId,
    normalizedLanguageCode,
    LEARNING_ACTIVITY_TYPE,
  );
  const completedByLessonId = {
    ...summary.completedByLessonId,
    [lessonId]: sanitizedCompletion,
  };

  const updatedSummary = await writeSummary({
    ...summary,
    childId: normalizedChildId,
    languageCode: normalizedLanguageCode,
    activityType: LEARNING_ACTIVITY_TYPE,
    completedByLessonId,
  });

  await saveLearningActivityEntries(summary, updatedSummary, sanitizedCompletion);
  await queueLearningLessonProgressSync(updatedSummary, sanitizedCompletion);

  return sanitizedCompletion;
};

export const getLearningLessonCompletion = async (
  childId: string,
  languageCode: string,
  stageId: string,
  lessonId: string,
): Promise<LearningLessonCompletion | null> => {
  const summary = await getLearningProgressSummary(
    childId,
    languageCode,
    LEARNING_ACTIVITY_TYPE,
  );
  const completion = summary.completedByLessonId[lessonId];

  if (!completion || completion.stageId !== stageId || completion.levelId !== lessonId) {
    return null;
  }

  return completion;
};

export const isLearningLessonCompleted = async (
  childId: string,
  languageCode: string,
  stageId: string,
  lessonId: string,
): Promise<boolean> =>
  Boolean(await getLearningLessonCompletion(childId, languageCode, stageId, lessonId));

export const getCompletedLearningLessonIds = async (
  childId: string,
  languageCode: string,
): Promise<string[]> =>
  (
    await getLearningProgressSummary(
      childId,
      languageCode,
      LEARNING_ACTIVITY_TYPE,
    )
  ).completedLessonIds;

export const clearLearningProgressForChild = async (
  childId: string,
): Promise<void> => {
  const normalizedChildId = normalizeChildId(childId);
  const childSummaryPrefix = `${LEARNING_PROGRESS_STORAGE_PREFIX}:summary:${encodeKeyPart(
    normalizedChildId,
  )}:`;
  const keys = await AsyncStorage.getAllKeys();
  await AsyncStorage.multiRemove(
    keys.filter((key) => key.startsWith(childSummaryPrefix)),
  );
};
