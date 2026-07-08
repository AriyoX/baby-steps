import {
  DEFAULT_LEARNING_LANGUAGE_CODE,
  isSupportedLearningLanguageCode,
  normalizeLearningLanguageCode,
} from "./languages";
import type { SupportedLearningLanguageCode } from "./types";

export type LearningHubMechanic =
  | "tap_to_learn"
  | "listen_and_choose"
  | "match_word_picture"
  | "choose_correct_word"
  | "mini_quiz"
  | "story_bite"
  | "cultural_card"
  | "practice_mix"
  | "weak_word_practice"
  | "spaced_recap";

export type LearningHubStageStatus = "preview" | "locked" | "planned";

export type LearningHubLessonItemType =
  | "word"
  | "story"
  | "culture"
  | "prompt"
  | "review";

export interface LearningHubLessonItem {
  id: string;
  localText: string;
  englishText: string;
  type: LearningHubLessonItemType;
  imageKey?: string;
  audioAsset?: string;
}

export interface LearningHubLesson {
  id: string;
  title: string;
  mechanic: LearningHubMechanic;
  items: LearningHubLessonItem[];
}

export interface LearningHubStage {
  id: string;
  stageNumber: number;
  title: string;
  description: string;
  imageKey: string;
  status: LearningHubStageStatus;
  estimatedMinutes: number;
  lessonCount: number;
  isPractice: boolean;
  isLocked: boolean;
  mechanics: LearningHubMechanic[];
  learningGoals: string[];
  placeholderMessage: string;
  lessons: LearningHubLesson[];
}

interface LearningHubLanguageContent {
  pathTitle: string;
  stages: LearningHubStage[];
}

interface LearningHubContentFile {
  version: number;
  defaultLanguage: SupportedLearningLanguageCode;
  languages: Partial<Record<SupportedLearningLanguageCode, LearningHubLanguageContent>>;
}

const learningHubContent = require("./learningHubContent.json") as LearningHubContentFile;

const MECHANIC_LABELS: Record<LearningHubMechanic, string> = {
  tap_to_learn: "Tap to learn",
  listen_and_choose: "Listen and choose",
  match_word_picture: "Match pictures",
  choose_correct_word: "Pick the word",
  mini_quiz: "Quick quiz",
  story_bite: "Story question",
  cultural_card: "Culture card",
  practice_mix: "Practice mix",
  weak_word_practice: "Try again words",
  spaced_recap: "Come back practice",
};

const toFallbackLabel = (mechanic: string): string =>
  mechanic
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const hasLearningHubLanguage = (
  languageCode: string | undefined,
): languageCode is SupportedLearningLanguageCode =>
  isSupportedLearningLanguageCode(languageCode) &&
  Boolean(learningHubContent.languages[languageCode]);

export const getDefaultLearningLanguage = (
  languageCode?: string | null,
): SupportedLearningLanguageCode => {
  const normalizedLanguageCode = normalizeLearningLanguageCode(languageCode);

  if (hasLearningHubLanguage(normalizedLanguageCode)) {
    return normalizedLanguageCode;
  }

  return learningHubContent.defaultLanguage ?? DEFAULT_LEARNING_LANGUAGE_CODE;
};

const getLanguageContent = (
  languageCode?: string | null,
): LearningHubLanguageContent => {
  const resolvedLanguageCode = getDefaultLearningLanguage(languageCode);
  const content =
    learningHubContent.languages[resolvedLanguageCode] ??
    learningHubContent.languages[DEFAULT_LEARNING_LANGUAGE_CODE];

  if (!content) {
    return { pathTitle: "Learning Path", stages: [] };
  }

  return content;
};

const normalizeLessonItem = (
  item: LearningHubLessonItem,
  fallbackId: string,
): LearningHubLessonItem => ({
  id: item.id || fallbackId,
  localText: item.localText,
  englishText: item.englishText,
  type: item.type,
  imageKey: item.imageKey,
  audioAsset: typeof item.audioAsset === "string" && item.audioAsset.trim()
    ? item.audioAsset.trim()
    : undefined,
});

const normalizeLesson = (
  lesson: LearningHubLesson,
  fallbackId: string,
): LearningHubLesson => ({
  id: lesson.id || fallbackId,
  title: lesson.title,
  mechanic: lesson.mechanic,
  items: lesson.items.map((item, index) =>
    normalizeLessonItem(item, `${lesson.id || fallbackId}-item-${index + 1}`),
  ),
});

const normalizeStage = (stage: LearningHubStage): LearningHubStage => {
  const lessons = stage.lessons.map((lesson, index) =>
    normalizeLesson(lesson, `${stage.id}-lesson-${index + 1}`),
  );

  return {
    ...stage,
    status: stage.isLocked ? "locked" : stage.status,
    estimatedMinutes: Math.max(1, stage.estimatedMinutes),
    lessonCount: stage.lessonCount || lessons.length,
    mechanics: [...new Set(stage.mechanics)],
    learningGoals: stage.learningGoals.filter(Boolean),
    lessons,
  };
};

// TODO: Replace or augment this local JSON source with Supabase content_items
// once the Learning hub has real lesson renderers and reviewed remote payloads.
export const getLearningHubStages = (
  languageCode?: string | null,
): LearningHubStage[] => {
  return getLanguageContent(languageCode)
    .stages.map(normalizeStage)
    .sort((a, b) => a.stageNumber - b.stageNumber);
};

export const getLearningStageById = (
  languageCode: string | null | undefined,
  stageId: string,
): LearningHubStage | undefined =>
  getLearningHubStages(languageCode).find((stage) => stage.id === stageId);

export const getLessonsForStage = (
  languageCode: string | null | undefined,
  stageId: string,
): LearningHubLesson[] => getLearningStageById(languageCode, stageId)?.lessons ?? [];

export const getFirstLessonByMechanic = (
  languageCode: string | null | undefined,
  stageId: string,
  mechanic: LearningHubMechanic,
): LearningHubLesson | undefined =>
  getLessonsForStage(languageCode, stageId).find(
    (lesson) => lesson.mechanic === mechanic,
  );

export const stageHasMechanicContent = (
  languageCode: string | null | undefined,
  stageId: string,
  mechanic: LearningHubMechanic,
): boolean => {
  const stage = getLearningStageById(languageCode, stageId);
  if (!stage || stage.isLocked) {
    return false;
  }

  return Boolean(
    getFirstLessonByMechanic(languageCode, stageId, mechanic)?.items.length,
  );
};

export const getMechanicLabel = (mechanic: LearningHubMechanic | string): string =>
  MECHANIC_LABELS[mechanic as LearningHubMechanic] ?? toFallbackLabel(mechanic);

export const getLearningHubPathTitle = (
  languageCode?: string | null,
): string => getLanguageContent(languageCode).pathTitle;
