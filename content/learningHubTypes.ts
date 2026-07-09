export type LearningLanguageCode =
  | "lg"
  | "nyn"
  | "luganda"
  | "runyankole"
  | "runyankore"
  | (string & {});

export type ContentReadiness =
  | "placeholder"
  | "draft"
  | "reviewed"
  | "production";

export type LessonStatus =
  | "startable"
  | "coming_soon"
  | "locked"
  | "unsupported"
  | "empty";

export type MechanicType =
  | "tap_to_learn"
  | "cultural_card"
  | "choose_correct_word"
  | "listen_and_choose"
  | "match_word_picture"
  | "mini_quiz"
  | "story_bite"
  | "practice_mix";

export type LearningHubStageStatus = "preview" | "locked" | "planned";

export interface LearningContentBundle {
  version: string;
  defaultLanguage: LearningLanguageCode;
  languages: Record<LearningLanguageCode, LearningLanguageContent>;
}

export interface LearningLanguageContent {
  languageCode: LearningLanguageCode;
  displayName: string;
  localName?: string;
  pathTitle: string;
  stages: LearningStage[];
}

export interface LearningStage {
  id: string;
  order: number;
  stageNumber: number;
  title: string;
  description: string;
  imageKey?: string;
  imageAsset?: string;
  status: LearningHubStageStatus;
  estimatedMinutes: number;
  lessonCount: number;
  isPractice: boolean;
  locked?: boolean;
  isLocked: boolean;
  readiness: ContentReadiness;
  mechanics: MechanicType[];
  learningGoals: string[];
  placeholderMessage: string;
  lessons: LearningLesson[];
  metadata?: Record<string, unknown>;
}

export interface LearningLesson {
  id: string;
  order: number;
  title: string;
  description: string;
  mechanic: MechanicType;
  locked?: boolean;
  isLocked: boolean;
  isStartable?: boolean;
  readiness: ContentReadiness;
  status: LessonStatus;
  items: LearningLessonItem[];
  metadata?: Record<string, unknown>;
}

export interface LessonItemBase {
  id: string;
  mechanic: MechanicType;
  order: number;
  localText?: string;
  englishText?: string;
  imageKey?: string;
  imageAsset?: string;
  audioKey?: string;
  audioAsset?: string;
  readiness: ContentReadiness;
  metadata?: Record<string, unknown>;
}

export interface ItemResult {
  itemId: string;
  mechanic: MechanicType;
  completedAt: number;
  correct?: boolean;
  attempts?: number;
  hintUsed?: boolean;
}

export interface TapToLearnItem extends LessonItemBase {
  mechanic: "tap_to_learn";
  localText: string;
  englishText: string;
  // Compatibility aliases for the existing renderer/tests while the content
  // contract moves toward localText/englishText.
  word: string;
  translation: string;
  phoneticText?: string;
  exampleSentence?: string;
}

export interface ListenAndChooseOption {
  id: string;
  order?: number;
  localText?: string;
  englishText?: string;
  imageKey?: string;
  imageAsset?: string;
}

export interface ListenAndChooseItem extends LessonItemBase {
  mechanic: "listen_and_choose";
  promptText?: string;
  prompt?: string;
  correctOptionId: string;
  options: ListenAndChooseOption[];
}

export interface ChooseCorrectWordOption {
  id: string;
  localText: string;
  englishText?: string;
  imageKey?: string;
  imageAsset?: string;
}

export interface ChooseCorrectWordItem extends LessonItemBase {
  mechanic: "choose_correct_word";
  promptText: string;
  questionText?: string;
  correctOptionId: string;
  options: ChooseCorrectWordOption[];
}

export interface MatchWordPictureOption {
  id: string;
  localText: string;
  englishText?: string;
  imageKey?: string;
  imageAsset?: string;
  emoji?: string;
}

export interface MatchWordPictureItem extends LessonItemBase {
  mechanic: "match_word_picture";
  promptText: string;
  targetText: string;
  targetEnglishText?: string;
  correctOptionId: string;
  options: MatchWordPictureOption[];
}

export interface CulturalCardItem extends LessonItemBase {
  mechanic: "cultural_card";
  title?: string;
  culturalNote?: string;
  word?: string;
  translation?: string;
}

export interface UnsupportedLessonItem extends LessonItemBase {
  mechanic: Exclude<
    MechanicType,
    | "tap_to_learn"
    | "listen_and_choose"
    | "choose_correct_word"
    | "match_word_picture"
    | "cultural_card"
  >;
  prompt?: string;
  word?: string;
  translation?: string;
}

export type LearningLessonItem =
  | TapToLearnItem
  | ListenAndChooseItem
  | ChooseCorrectWordItem
  | MatchWordPictureItem
  | CulturalCardItem
  | UnsupportedLessonItem;
