import AsyncStorage from "@react-native-async-storage/async-storage";
import { getDbLanguageCodeForLearningLanguage } from "@/content/languages";
import type {
  LearningActivityType,
  LearningLessonCompletion,
  LearningProgressSummary,
} from "@/lib/learningProgressTypes";

export const LEARNING_ACTIVITY_TYPE: LearningActivityType = "language";
export const LOCAL_LEARNING_FALLBACK_CHILD_ID = "local-demo-child";

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
      ? Math.max(0, Math.round(progressPayload.totalItems))
      : itemResults.length;
  const correctItems =
    typeof progressPayload.correctItems === "number" && Number.isFinite(progressPayload.correctItems)
      ? Math.max(0, Math.round(progressPayload.correctItems))
      : itemResults.filter((result) => asRecord(result).correct !== false).length;

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
        ? Math.max(0, Math.round(record.score))
        : undefined,
    stars:
      typeof record.stars === "number" && Number.isFinite(record.stars)
        ? Math.max(0, Math.round(record.stars))
        : undefined,
    attempts:
      typeof record.attempts === "number" && Number.isFinite(record.attempts)
        ? Math.max(0, Math.round(record.attempts))
        : 0,
    completedAt:
      typeof record.completedAt === "number" && Number.isFinite(record.completedAt)
        ? record.completedAt
        : Date.now(),
    progressPayload: {
      lessonId: lessonId || record.levelId,
      mechanicTypes,
      itemResults: itemResults as LearningLessonCompletion["progressPayload"]["itemResults"],
      totalItems,
      correctItems,
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

  await writeSummary({
    ...summary,
    childId: normalizedChildId,
    languageCode: normalizedLanguageCode,
    activityType: LEARNING_ACTIVITY_TYPE,
    completedByLessonId,
  });

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
