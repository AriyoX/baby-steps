export type SupportedLearningLanguageCode = "lg" | "nyn";

export type ContentReviewStatus = "existing-prototype" | "placeholder" | "reviewed";

export interface LearningLanguage {
  code: SupportedLearningLanguageCode;
  name: string;
  nativeName: string;
  isActive: boolean;
  isDefault?: boolean;
  notes?: string;
}

export interface LocalContentSource {
  label: string;
  url?: string;
}

export interface LocalContentMetadata {
  status: ContentReviewStatus;
  notes?: string;
  sources?: LocalContentSource[];
}

export interface LocalStoryPage {
  id: string;
  text: string;
  translation?: string;
  image?: string;
  altText?: string;
}

export interface LocalStoryQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
}

export interface LocalStory {
  id: string;
  title: string;
  summary: string;
  languageCode: SupportedLearningLanguageCode;
  metadata: LocalContentMetadata;
  pages: LocalStoryPage[];
  questions?: LocalStoryQuestion[];
}

export interface LocalLearningWord {
  id: string;
  targetText: string;
  english: string;
  example?: string;
  exampleTranslation?: string;
  audio?: string;
  image?: unknown;
  notes?: string;
}

export interface LocalLearningLevel {
  id: string;
  numericId?: number;
  title: string;
  isLocked?: boolean;
  words: LocalLearningWord[];
}

export interface LocalLearningStage {
  id: string;
  numericId?: number;
  title: string;
  description: string;
  isLocked?: boolean;
  requiredScore?: number;
  image?: unknown;
  color?: string;
  levels: LocalLearningLevel[];
}

export interface LocalWordGameLevel {
  id: string;
  targetText: string;
  question: string;
  hint: string;
  subHint: string;
  firstLetter?: string;
  image?: string;
}

export interface LocalCountingStage {
  id: string;
  numericId?: number;
  title: string;
  description: string;
  numbersRange: { min: number; max: number };
  levels: number;
  useBunches?: boolean;
  itemsPerBunch?: number;
  usesCurrency?: boolean;
}

export interface LocalCountingNumber {
  number: number;
  targetText: string;
  audio?: string;
}

export interface LocalCountingContent {
  stages: LocalCountingStage[];
  numbers: LocalCountingNumber[];
}

export interface LocalLanguageContent {
  languageCode: SupportedLearningLanguageCode;
  metadata: LocalContentMetadata;
  stories: LocalStory[];
  lessons: {
    stages: LocalLearningStage[];
  };
  games: {
    wordGameLevels: LocalWordGameLevel[];
    counting: LocalCountingContent;
  };
}
