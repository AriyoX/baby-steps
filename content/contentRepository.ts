import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";
import { resolveImageSource } from "./assets";
import {
  DEFAULT_LEARNING_LANGUAGE_CODE,
  normalizeLearningLanguageCode,
} from "./languages";
import {
  clearLearningHubContentRegistry,
  normalizeLearningHubLanguageContent,
  registerLearningHubLanguageContent,
} from "./learningHubRepository";
import type { LearningLanguageContent } from "./learningHubTypes";
import type {
  LocalStory,
  LocalStoryPage,
  LocalStoryQuestion,
} from "./types";

export type ContentItemType =
  | "child_menu"
  | "learning_hub"
  | "learning_game"
  | "word_game"
  | "counting_game"
  | "card_game"
  | "puzzle_game"
  | "story";

export type ContentEditorialStatus = "draft" | "reviewed" | "published";

const CONTENT_ITEM_TYPES: readonly ContentItemType[] = [
  "child_menu",
  "learning_hub",
  "learning_game",
  "word_game",
  "counting_game",
  "card_game",
  "puzzle_game",
  "story",
];

const SINGLE_BUNDLE_CONTENT_TYPES = new Set<ContentItemType>([
  "learning_hub",
  "learning_game",
  "word_game",
  "counting_game",
  "card_game",
  "puzzle_game",
]);

export type ContentSource = "database" | "empty";

export interface ContentItemRecord {
  id?: string;
  language_code: string;
  content_type: ContentItemType;
  slug: string;
  title?: string | null;
  payload: Record<string, unknown>;
  sort_order?: number;
  is_active?: boolean;
  editorial_status?: ContentEditorialStatus;
  is_startable?: boolean;
  content_version?: number;
  updated_at?: string;
  published_at?: string | null;
}

export interface ChildMenuCard {
  id: string;
  order: number;
  title: string;
  description: string;
  image?: string;
  targetPage: string;
  availability?: string;
}

export interface LearningGameWord {
  id: string;
  order: number;
  targetText: string;
  english: string;
  audio?: string;
  example?: string;
  exampleTranslation?: string;
  image?: unknown;
  notes?: string;
}

export interface LearningGameLevel {
  id: number;
  order: number;
  title: string;
  isLocked: boolean;
  words: LearningGameWord[];
}

export interface LearningGameStage {
  id: number;
  order: number;
  title: string;
  description: string;
  levels: LearningGameLevel[];
  isLocked: boolean;
  image: unknown;
  color: string;
  requiredScore: number;
}

export interface WordGameLevel {
  id: string;
  order: number;
  word: string;
  question: string;
  hint: string;
  subHint: string;
  firstLetter?: string;
  image?: string;
}

export interface CountingGameStage {
  id: number;
  order: number;
  title: string;
  description: string;
  numbersRange: { min: number; max: number };
  levels: number;
  useBunches: boolean;
  itemsPerBunch?: number;
  usesCurrency: boolean;
  prompt?: string;
  groupedPrompt?: string;
  currencyPrompt?: string;
}

export interface CountingGameNumber {
  number: number;
  order: number;
  targetText: string;
  audio?: string;
}

export interface CountingGameItem {
  id: string;
  order: number;
  name: string;
  image: string;
}

export interface CountingGameCurrency {
  id: string;
  order: number;
  value: number;
  name: string;
  image: string;
  targetText: string;
}

export interface CountingGameContent {
  title: string;
  stages: CountingGameStage[];
  numbers: CountingGameNumber[];
  culturalItems: CountingGameItem[];
  currency: CountingGameCurrency[];
}

export interface CardGameItem {
  id: string;
  order: number;
  value: string;
  info: string;
  imageSymbol: string;
}

export interface CardGameContent {
  title: string;
  items: CardGameItem[];
}

export interface PuzzleGameDefinition {
  id: number;
  order: number;
  name: string;
  description: string;
  image: string;
}

export interface PuzzleGameContent {
  title: string;
  puzzles: PuzzleGameDefinition[];
}

export interface ContentBundle {
  languageCode: string;
  source: "database";
  contentVersion: string;
  /**
   * Stable progress identities are intentionally separate from the cache
   * version. A CMS edit can update timestamps/content versions without
   * reinterpreting a child's completions. Bump a payload's progressRevision
   * only when the playable curriculum is replaced incompatibly.
   */
  progressRevisions?: Partial<Record<ContentItemType, string>>;
  menuCardsByTab: Record<string, ChildMenuCard[]>;
  learningHub?: LearningLanguageContent;
  learningGame: {
    title: string;
    stages: LearningGameStage[];
  };
  wordGame: {
    title: string;
    levels: WordGameLevel[];
  };
  countingGame: CountingGameContent;
  cardGame: CardGameContent;
  puzzleGame: PuzzleGameContent;
  stories: LocalStory[];
}

export interface ContentLoadResult {
  languageCode?: string;
  bundle?: ContentBundle;
  source: ContentSource;
  missingReason?: string;
  cache?: ContentBundleCacheMetadata;
}

export interface LoadContentBundleOptions {
  forceRefresh?: boolean;
  maxAgeMs?: number;
}

export interface ContentBundleCacheMetadata {
  cacheKey: string;
  contentVersion: string;
  loadedAt: number;
  source: "memory" | "storage" | "network";
  isStale: boolean;
  maxAgeMs: number;
}

interface ContentItemsCacheEntry {
  cacheSchemaVersion: 2;
  languageCode: string;
  contentVersion: string;
  loadedAt: number;
  items: ContentItemRecord[];
}

interface CachedContentBundle {
  bundle: ContentBundle;
  metadata: ContentBundleCacheMetadata;
}

interface BuildContentBundleResult {
  bundle: ContentBundle;
  supportedRowCount: number;
  invalidSupportedRowCount: number;
}

export const CONTENT_BUNDLE_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

const CONTENT_BUNDLE_CACHE_SCHEMA_VERSION = 2 as const;
const CONTENT_BUNDLE_CACHE_PREFIX = "@BabySteps:ContentBundle:v2";
const contentItemsMemoryCache = new Map<string, ContentItemsCacheEntry>();
const contentItemsBackgroundRefreshes = new Map<string, Promise<void>>();

const EMPTY_COUNTING_CONTENT: CountingGameContent = {
  title: "Counting Game",
  stages: [],
  numbers: [],
  culturalItems: [],
  currency: [],
};

const EMPTY_CARD_GAME_CONTENT: CardGameContent = {
  title: "Cards Matching",
  items: [],
};

const EMPTY_PUZZLE_GAME_CONTENT: PuzzleGameContent = {
  title: "Logic Puzzle",
  puzzles: [],
};

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const isRecordValue = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const asString = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value.trim() || fallback : fallback;

const asOptionalString = (value: unknown): string | undefined => {
  const normalized = asString(value);
  return normalized || undefined;
};

const asFiniteNumber = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

const asPositiveInteger = (value: unknown): number | undefined => {
  const number = asFiniteNumber(value);
  if (number === undefined || number <= 0 || !Number.isInteger(number)) {
    return undefined;
  }
  return number;
};

const asOrder = (value: unknown, fallback: number): number =>
  asPositiveInteger(value) ?? fallback;

const asBoolean = (value: unknown, fallback = false): boolean =>
  typeof value === "boolean" ? value : fallback;

const hasRequiredString = (
  value: Record<string, unknown>,
  key: string,
): boolean => Boolean(asString(value[key]));

const hasRequiredBoolean = (
  value: Record<string, unknown>,
  key: string,
): boolean => typeof value[key] === "boolean";

const hasRequiredPositiveInteger = (
  value: Record<string, unknown>,
  key: string,
): boolean => asPositiveInteger(value[key]) !== undefined;

const hasRequiredNonNegativeNumber = (
  value: Record<string, unknown>,
  key: string,
): boolean => {
  const number = asFiniteNumber(value[key]);
  return number !== undefined && number >= 0;
};

const sortByOrder = <T extends { id: string | number; order: number }>(items: T[]): T[] =>
  [...items].sort(
    (left, right) =>
      left.order - right.order || String(left.id).localeCompare(String(right.id)),
  );

const normalizeContentSlug = (value: string): string => value.trim().toLowerCase();

const isContentItemType = (value: string): value is ContentItemType =>
  CONTENT_ITEM_TYPES.includes(value as ContentItemType);

const parseContentItemType = (value: string): ContentItemType | undefined => {
  const normalized = value.trim();
  return normalized === normalized.toLowerCase() && isContentItemType(normalized)
    ? normalized
    : undefined;
};

const normalizeContentLanguageCode = (
  languageCode?: string | null,
): string | undefined => {
  if (languageCode === undefined || languageCode === null || !languageCode.trim()) {
    return DEFAULT_LEARNING_LANGUAGE_CODE;
  }

  return normalizeLearningLanguageCode(languageCode);
};

export const getContentBundleCacheKey = (languageCode: string): string =>
  `${CONTENT_BUNDLE_CACHE_PREFIX}:${languageCode}`;

export interface ContentPayloadValidationResult {
  isValid: boolean;
  missingKeys: string[];
}

const REQUIRED_PAYLOAD_ARRAYS: Record<ContentItemType, string[]> = {
  child_menu: ["cards"],
  learning_hub: ["stages"],
  learning_game: ["stages"],
  word_game: ["levels"],
  counting_game: ["stages", "numbers"],
  card_game: ["items"],
  puzzle_game: ["puzzles"],
  story: ["pages"],
};

export const validateContentItemPayload = (
  contentType: ContentItemType,
  payload: Record<string, unknown>,
): ContentPayloadValidationResult => {
  const missingKeys = REQUIRED_PAYLOAD_ARRAYS[contentType].filter((key) => {
    const value = payload[key];
    return !Array.isArray(value) || value.length === 0;
  });

  return { isValid: missingKeys.length === 0, missingKeys };
};

const mapMenuCards = (payload: Record<string, unknown>): ChildMenuCard[] =>
  sortByOrder(
    asArray(payload.cards)
      .map((value, index): ChildMenuCard | undefined => {
        const card = asRecord(value);
        const id = asString(card.id);
        const targetPage = asString(card.targetPage);
        if (!id || !targetPage) return undefined;

        return {
          id,
          order: asOrder(card.order, index + 1),
          title: asString(card.title, id),
          description: asString(card.description),
          image: asOptionalString(card.image),
          targetPage,
          availability: asOptionalString(card.availability),
        };
      })
      .filter((card): card is ChildMenuCard => Boolean(card)),
  );

const isMenuCardPayloadValid = (value: unknown): boolean => {
  if (!isRecordValue(value)) return false;
  return (
    hasRequiredString(value, "id") &&
    hasRequiredPositiveInteger(value, "order") &&
    hasRequiredString(value, "title") &&
    hasRequiredString(value, "description") &&
    hasRequiredString(value, "targetPage")
  );
};

const isLearningWordPayloadValid = (value: unknown): boolean => {
  if (!isRecordValue(value)) return false;
  return (
    hasRequiredString(value, "id") &&
    hasRequiredPositiveInteger(value, "order") &&
    hasRequiredString(value, "targetText") &&
    hasRequiredString(value, "english")
  );
};

const isLearningLevelPayloadValid = (value: unknown): boolean => {
  if (!isRecordValue(value)) return false;
  const words = value.words;
  return (
    hasRequiredPositiveInteger(value, "id") &&
    hasRequiredPositiveInteger(value, "order") &&
    hasRequiredString(value, "title") &&
    hasRequiredBoolean(value, "isLocked") &&
    Array.isArray(words) &&
    words.length > 0 &&
    words.every(isLearningWordPayloadValid)
  );
};

const isLearningStagePayloadValid = (value: unknown): boolean => {
  if (!isRecordValue(value)) return false;
  const levels = value.levels;
  return (
    hasRequiredPositiveInteger(value, "id") &&
    hasRequiredPositiveInteger(value, "order") &&
    hasRequiredString(value, "title") &&
    hasRequiredString(value, "description") &&
    hasRequiredBoolean(value, "isLocked") &&
    hasRequiredNonNegativeNumber(value, "requiredScore") &&
    hasRequiredString(value, "image") &&
    hasRequiredString(value, "color") &&
    Array.isArray(levels) &&
    levels.length > 0 &&
    levels.every(isLearningLevelPayloadValid)
  );
};

const mapLearningStages = (stages: unknown[]): LearningGameStage[] =>
  sortByOrder(
    stages
      .map((stageValue, stageIndex): LearningGameStage | undefined => {
        const stage = asRecord(stageValue);
        const stageId = asPositiveInteger(stage.id);
        if (!stageId) return undefined;

        const levels = sortByOrder(
          asArray(stage.levels)
            .map((levelValue, levelIndex): LearningGameLevel | undefined => {
              const level = asRecord(levelValue);
              const levelId = asPositiveInteger(level.id);
              if (!levelId) return undefined;

              const words = sortByOrder(
                asArray(level.words)
                  .map((wordValue, wordIndex): LearningGameWord | undefined => {
                    const word = asRecord(wordValue);
                    const id = asString(word.id);
                    const targetText = asString(word.targetText);
                    const english = asString(word.english);
                    if (!id || !targetText || !english) return undefined;

                    return {
                      id,
                      order: asOrder(word.order, wordIndex + 1),
                      targetText,
                      english,
                      audio: asOptionalString(word.audio),
                      example: asOptionalString(word.example),
                      exampleTranslation: asOptionalString(word.exampleTranslation),
                      image: word.image
                        ? resolveImageSource(word.image)
                        : resolveImageSource("learning-beginner.jpg"),
                      notes: asOptionalString(word.notes),
                    };
                  })
                  .filter((word): word is LearningGameWord => Boolean(word)),
              );

              if (words.length === 0) return undefined;
              return {
                id: levelId,
                order: asOrder(level.order, levelIndex + 1),
                title: asString(level.title, `Level ${levelId}`),
                isLocked: asBoolean(level.isLocked),
                words,
              };
            })
            .filter((level): level is LearningGameLevel => Boolean(level)),
        );

        if (levels.length === 0) return undefined;
        return {
          id: stageId,
          order: asOrder(stage.order, stageIndex + 1),
          title: asString(stage.title, `Stage ${stageId}`),
          description: asString(stage.description),
          isLocked: asBoolean(stage.isLocked, stageId !== 1),
          requiredScore: asFiniteNumber(stage.requiredScore) ?? 0,
          image: resolveImageSource(stage.image, "coin.png"),
          color: asString(stage.color, "#6366f1"),
          levels,
        };
      })
      .filter((stage): stage is LearningGameStage => Boolean(stage)),
  );

const mapWordGameLevels = (levels: unknown[]): WordGameLevel[] =>
  sortByOrder(
    levels
      .map((levelValue, index): WordGameLevel | undefined => {
        const level = asRecord(levelValue);
        const id = asString(level.id);
        const targetText = asString(level.targetText, asString(level.word)).toUpperCase();
        const question = asString(level.question);
        if (!id || !targetText || !question) return undefined;

        return {
          id,
          order: asOrder(level.order, index + 1),
          word: targetText,
          question,
          hint: asString(level.hint),
          subHint: asString(level.subHint),
          firstLetter: asOptionalString(level.firstLetter),
          image: asOptionalString(level.image),
        };
      })
      .filter((level): level is WordGameLevel => Boolean(level)),
  );

const isWordGameLevelPayloadValid = (value: unknown): boolean => {
  if (!isRecordValue(value)) return false;
  return (
    hasRequiredString(value, "id") &&
    hasRequiredPositiveInteger(value, "order") &&
    Boolean(asString(value.targetText, asString(value.word))) &&
    hasRequiredString(value, "question") &&
    hasRequiredString(value, "hint") &&
    hasRequiredString(value, "subHint")
  );
};

const mapCountingStages = (stages: unknown[]): CountingGameStage[] =>
  sortByOrder(
    stages
      .map((stageValue, index): CountingGameStage | undefined => {
        const stage = asRecord(stageValue);
        const id = asPositiveInteger(stage.id);
        const range = asRecord(stage.numbersRange);
        const min = asPositiveInteger(range.min);
        const max = asPositiveInteger(range.max);
        const levels = asPositiveInteger(stage.levels);
        if (!id || !min || !max || min > max || !levels) return undefined;

        return {
          id,
          order: asOrder(stage.order, index + 1),
          title: asString(stage.title, `Stage ${id}`),
          description: asString(stage.description),
          numbersRange: { min, max },
          levels,
          useBunches: asBoolean(stage.useBunches),
          itemsPerBunch: asPositiveInteger(stage.itemsPerBunch),
          usesCurrency: asBoolean(stage.usesCurrency),
          prompt: asOptionalString(stage.prompt),
          groupedPrompt: asOptionalString(stage.groupedPrompt),
          currencyPrompt: asOptionalString(stage.currencyPrompt),
        };
      })
      .filter((stage): stage is CountingGameStage => Boolean(stage)),
  );

const isCountingStagePayloadValid = (value: unknown): boolean => {
  if (!isRecordValue(value)) return false;
  const range = value.numbersRange;
  if (!isRecordValue(range)) return false;
  const min = asPositiveInteger(range.min);
  const max = asPositiveInteger(range.max);
  const useBunches = value.useBunches;
  return (
    hasRequiredPositiveInteger(value, "id") &&
    hasRequiredPositiveInteger(value, "order") &&
    hasRequiredString(value, "title") &&
    hasRequiredString(value, "description") &&
    min !== undefined &&
    max !== undefined &&
    min <= max &&
    hasRequiredPositiveInteger(value, "levels") &&
    typeof useBunches === "boolean" &&
    hasRequiredBoolean(value, "usesCurrency") &&
    (!useBunches || hasRequiredPositiveInteger(value, "itemsPerBunch"))
  );
};

const mapCountingNumbers = (numbers: unknown[]): CountingGameNumber[] =>
  sortByOrder(
    numbers
      .map((value, index): CountingGameNumber | undefined => {
        const item = asRecord(value);
        const number = asPositiveInteger(item.number);
        const targetText = asString(item.targetText, asString(item.luganda));
        if (!number || !targetText) return undefined;
        return {
          number,
          id: number,
          order: asOrder(item.order, index + 1),
          targetText,
          audio: asOptionalString(item.audio),
        } as CountingGameNumber & { id: number };
      })
      .filter(
        (item): item is CountingGameNumber & { id: number } => Boolean(item),
      ),
  ).map(({ id: _id, ...item }) => item);

const isCountingNumberPayloadValid = (value: unknown): boolean => {
  if (!isRecordValue(value)) return false;
  return (
    hasRequiredPositiveInteger(value, "number") &&
    hasRequiredPositiveInteger(value, "order") &&
    Boolean(asString(value.targetText, asString(value.luganda)))
  );
};

const mapCountingItems = (items: unknown[]): CountingGameItem[] =>
  sortByOrder(
    items
      .map((value, index): CountingGameItem | undefined => {
        const item = asRecord(value);
        const id = asString(item.id);
        const name = asString(item.name);
        const image = asString(item.image);
        if (!id || !name || !image) return undefined;
        return { id, order: asOrder(item.order, index + 1), name, image };
      })
      .filter((item): item is CountingGameItem => Boolean(item)),
  );

const isCountingItemPayloadValid = (value: unknown): boolean => {
  if (!isRecordValue(value)) return false;
  return (
    hasRequiredString(value, "id") &&
    hasRequiredPositiveInteger(value, "order") &&
    hasRequiredString(value, "name") &&
    hasRequiredString(value, "image")
  );
};

const mapCountingCurrency = (items: unknown[]): CountingGameCurrency[] =>
  sortByOrder(
    items
      .map((value, index): CountingGameCurrency | undefined => {
        const item = asRecord(value);
        const id = asString(item.id);
        const amount = asPositiveInteger(item.value);
        const name = asString(item.name);
        const image = asString(item.image);
        const targetText = asString(item.targetText, asString(item.luganda));
        if (!id || !amount || !name || !image || !targetText) return undefined;
        return {
          id,
          order: asOrder(item.order, index + 1),
          value: amount,
          name,
          image,
          targetText,
        };
      })
      .filter((item): item is CountingGameCurrency => Boolean(item)),
  );

const isCountingCurrencyPayloadValid = (value: unknown): boolean => {
  if (!isRecordValue(value)) return false;
  return (
    hasRequiredString(value, "id") &&
    hasRequiredPositiveInteger(value, "order") &&
    hasRequiredPositiveInteger(value, "value") &&
    hasRequiredString(value, "name") &&
    hasRequiredString(value, "image") &&
    Boolean(asString(value.targetText, asString(value.luganda)))
  );
};

const mapCountingContent = (
  payload: Record<string, unknown>,
  fallbackTitle: string,
): CountingGameContent => ({
  title: asString(payload.title, fallbackTitle),
  stages: mapCountingStages(asArray(payload.stages)),
  numbers: mapCountingNumbers(asArray(payload.numbers)),
  culturalItems: mapCountingItems(asArray(payload.culturalItems)),
  currency: mapCountingCurrency(asArray(payload.currency)),
});

const mapCardGameItems = (items: unknown[]): CardGameItem[] =>
  sortByOrder(
    items
      .map((value, index): CardGameItem | undefined => {
        const item = asRecord(value);
        const id = asString(item.id);
        const cardValue = asString(item.value);
        const info = asString(item.info);
        const imageSymbol = asString(item.imageSymbol);
        if (!id || !cardValue || !info || !imageSymbol) return undefined;
        return {
          id,
          order: asOrder(item.order, index + 1),
          value: cardValue,
          info,
          imageSymbol,
        };
      })
      .filter((item): item is CardGameItem => Boolean(item)),
  );

const isCardGameItemPayloadValid = (value: unknown): boolean => {
  if (!isRecordValue(value)) return false;
  return (
    hasRequiredString(value, "id") &&
    hasRequiredPositiveInteger(value, "order") &&
    hasRequiredString(value, "value") &&
    hasRequiredString(value, "info") &&
    hasRequiredString(value, "imageSymbol")
  );
};

const mapPuzzleGameDefinitions = (items: unknown[]): PuzzleGameDefinition[] =>
  sortByOrder(
    items
      .map((value, index): PuzzleGameDefinition | undefined => {
        const item = asRecord(value);
        const id = asPositiveInteger(item.id);
        const name = asString(item.name);
        const description = asString(item.description);
        const image = asString(item.image);
        if (!id || !name || !description || !image) return undefined;
        return { id, order: asOrder(item.order, index + 1), name, description, image };
      })
      .filter((item): item is PuzzleGameDefinition => Boolean(item)),
  );

const isPuzzleGamePayloadValid = (value: unknown): boolean => {
  if (!isRecordValue(value)) return false;
  return (
    hasRequiredPositiveInteger(value, "id") &&
    hasRequiredPositiveInteger(value, "order") &&
    hasRequiredString(value, "name") &&
    hasRequiredString(value, "description") &&
    hasRequiredString(value, "image")
  );
};

const mapStoryPages = (pages: unknown[]): LocalStoryPage[] =>
  pages
    .map((value, index): LocalStoryPage | undefined => {
      const page = asRecord(value);
      const id = asString(page.id);
      const text = asString(page.text);
      if (!id || !text) return undefined;
      const image = asString(page.image, asString(page.imageKey));
      return {
        id,
        text,
        translation: asOptionalString(page.translation),
        image: image || undefined,
        altText: asOptionalString(page.altText),
      };
    })
    .filter((page): page is LocalStoryPage => Boolean(page));

const isStoryPagePayloadValid = (value: unknown): boolean => {
  if (!isRecordValue(value)) return false;
  return hasRequiredString(value, "id") && hasRequiredString(value, "text");
};

const isStoryQuestionPayloadValid = (value: unknown): boolean => {
  if (!isRecordValue(value)) return false;
  if (!hasRequiredString(value, "id") || !hasRequiredString(value, "question")) {
    return false;
  }

  const options = value.options;
  const correctAnswer = asFiniteNumber(
    value.correctAnswer ?? value.correctAnswerIndex,
  );
  return (
    Array.isArray(options) &&
    options.length >= 2 &&
    options.every((option) => typeof option === "string" && Boolean(option.trim())) &&
    correctAnswer !== undefined &&
    Number.isInteger(correctAnswer) &&
    correctAnswer >= 0 &&
    correctAnswer < options.length
  );
};

const mapStoryQuestions = (questions: unknown[]): LocalStoryQuestion[] | undefined => {
  const mapped = questions
    .map((value): LocalStoryQuestion | undefined => {
      const question = asRecord(value);
      const id = asString(question.id);
      const prompt = asString(question.question);
      const options = asArray(question.options)
        .map((option) => asString(option))
        .filter(Boolean);
      const correctAnswer = asFiniteNumber(
        question.correctAnswer ?? question.correctAnswerIndex,
      );
      if (
        !id ||
        !prompt ||
        options.length < 2 ||
        correctAnswer === undefined ||
        !Number.isInteger(correctAnswer) ||
        correctAnswer < 0 ||
        correctAnswer >= options.length
      ) {
        return undefined;
      }
      return { id, question: prompt, options, correctAnswer };
    })
    .filter((question): question is LocalStoryQuestion => Boolean(question));

  return mapped.length > 0 ? mapped : undefined;
};

const mapStoryPayload = (
  payload: Record<string, unknown>,
  item: ContentItemRecord,
): LocalStory | undefined => {
  const storyId = normalizeContentSlug(
    asString(payload.id, asString(payload.storyId, item.slug)),
  );
  const title = asString(payload.title, item.title ?? storyId);
  const pages = mapStoryPages(asArray(payload.pages));
  if (!storyId || !title || pages.length === 0) return undefined;

  const metadata = asRecord(payload.metadata);
  return {
    id: storyId,
    title,
    summary: asString(payload.summary, asString(payload.description)),
    languageCode: item.language_code as LocalStory["languageCode"],
    progressRevision: `story/${normalizeContentSlug(item.slug)}#${getItemProgressRevision(
      item,
    )}`,
    metadata: {
      status:
        metadata.status === "existing-prototype" ||
        metadata.status === "placeholder" ||
        metadata.status === "reviewed"
          ? metadata.status
          : "placeholder",
      notes: asOptionalString(metadata.notes),
      sources: asArray(metadata.sources).reduce<
        NonNullable<LocalStory["metadata"]["sources"]>
      >((sources, value) => {
          const source = asRecord(value);
          const label = asString(source.label);
          if (!label) return sources;

          const url = asOptionalString(source.url);
          sources.push(url ? { label, url } : { label });
          return sources;
        }, []),
    },
    pages,
    questions: mapStoryQuestions(asArray(payload.questions)),
  };
};

const hasUniqueIds = <T extends { id: string | number }>(items: T[]): boolean =>
  new Set(items.map((item) => String(item.id))).size === items.length;

const hasCompleteCountingNumberLabels = (
  stages: CountingGameStage[],
  numbers: CountingGameNumber[],
): boolean => {
  const availableNumbers = new Set(numbers.map((number) => number.number));

  return stages.every((stage) => {
    if (stage.usesCurrency) return true;
    const step = stage.useBunches ? stage.itemsPerBunch : 1;
    if (!step) return false;

    const candidateCount =
      Math.floor((stage.numbersRange.max - stage.numbersRange.min) / step) + 1;
    if (candidateCount > availableNumbers.size) return false;

    for (
      let candidate = stage.numbersRange.min;
      candidate <= stage.numbersRange.max;
      candidate += step
    ) {
      if (!availableNumbers.has(candidate)) return false;
    }
    return true;
  });
};

const hasCompleteCountingSupportingContent = (
  content: CountingGameContent,
): boolean => {
  const nonCurrencyStages = content.stages.filter((stage) => !stage.usesCurrency);
  const currencyStages = content.stages.filter((stage) => stage.usesCurrency);

  if (nonCurrencyStages.length > 0 && content.culturalItems.length === 0) {
    return false;
  }

  if (!hasCompleteCountingNumberLabels(nonCurrencyStages, content.numbers)) {
    return false;
  }

  return currencyStages.every(
    (stage) =>
      content.currency.length >= stage.levels &&
      content.currency.every(
        (item) =>
          item.value >= stage.numbersRange.min &&
          item.value <= stage.numbersRange.max,
      ),
  );
};

const isMappedContentValid = (
  contentType: ContentItemType,
  payload: Record<string, unknown>,
  item: ContentItemRecord,
): boolean => {
  if (contentType === "child_menu") {
    const rawCards = asArray(payload.cards);
    const cards = mapMenuCards(payload);
    return (
      cards.length > 0 &&
      cards.length === rawCards.length &&
      rawCards.every(isMenuCardPayloadValid) &&
      hasUniqueIds(cards)
    );
  }
  if (contentType === "learning_hub") {
    return Boolean(normalizeLearningHubLanguageContent(item.language_code, payload));
  }
  if (contentType === "learning_game") {
    const rawStages = asArray(payload.stages);
    const stages = mapLearningStages(rawStages);
    const levels = stages.flatMap((stage) => stage.levels);
    return (
      stages.length > 0 &&
      stages.length === rawStages.length &&
      rawStages.every(isLearningStagePayloadValid) &&
      hasUniqueIds(stages) &&
      hasUniqueIds(levels) &&
      stages.every(
        (stage) =>
          hasUniqueIds(stage.levels) &&
          stage.levels.every((level) => hasUniqueIds(level.words)),
      )
    );
  }
  if (contentType === "word_game") {
    const rawLevels = asArray(payload.levels);
    const levels = mapWordGameLevels(rawLevels);
    return (
      levels.length > 0 &&
      levels.length === rawLevels.length &&
      rawLevels.every(isWordGameLevelPayloadValid) &&
      hasUniqueIds(levels)
    );
  }
  if (contentType === "counting_game") {
    const rawStages = asArray(payload.stages);
    const rawNumbers = asArray(payload.numbers);
    const rawCulturalItems = asArray(payload.culturalItems);
    const rawCurrency = asArray(payload.currency);
    const content = mapCountingContent(payload, item.title ?? "Counting Game");
    return (
      content.stages.length > 0 &&
      content.numbers.length > 0 &&
      content.stages.length === rawStages.length &&
      content.numbers.length === rawNumbers.length &&
      content.culturalItems.length === rawCulturalItems.length &&
      content.currency.length === rawCurrency.length &&
      rawStages.every(isCountingStagePayloadValid) &&
      rawNumbers.every(isCountingNumberPayloadValid) &&
      rawCulturalItems.every(isCountingItemPayloadValid) &&
      rawCurrency.every(isCountingCurrencyPayloadValid) &&
      (payload.culturalItems === undefined || Array.isArray(payload.culturalItems)) &&
      (payload.currency === undefined || Array.isArray(payload.currency)) &&
      hasUniqueIds(content.stages) &&
      new Set(content.numbers.map((number) => number.number)).size ===
        content.numbers.length &&
      hasUniqueIds(content.culturalItems) &&
      hasUniqueIds(content.currency) &&
      new Set(content.currency.map((item) => item.value)).size ===
        content.currency.length &&
      hasCompleteCountingSupportingContent(content)
    );
  }
  if (contentType === "card_game") {
    const rawCards = asArray(payload.items);
    const cards = mapCardGameItems(rawCards);
    return (
      cards.length >= 8 &&
      cards.length === rawCards.length &&
      rawCards.every(isCardGameItemPayloadValid) &&
      hasUniqueIds(cards) &&
      new Set(cards.map((card) => card.value)).size === cards.length
    );
  }
  if (contentType === "puzzle_game") {
    const rawPuzzles = asArray(payload.puzzles);
    const puzzles = mapPuzzleGameDefinitions(rawPuzzles);
    return (
      puzzles.length > 0 &&
      puzzles.length === rawPuzzles.length &&
      rawPuzzles.every(isPuzzleGamePayloadValid) &&
      hasUniqueIds(puzzles)
    );
  }

  const rawPages = asArray(payload.pages);
  const rawQuestions = asArray(payload.questions);
  const story = mapStoryPayload(payload, item);
  const mappedQuestions = mapStoryQuestions(rawQuestions) ?? [];
  return (
    Boolean(story) &&
    story?.pages.length === rawPages.length &&
    rawPages.every(isStoryPagePayloadValid) &&
    hasUniqueIds(story?.pages ?? []) &&
    (payload.questions === undefined || Array.isArray(payload.questions)) &&
    mappedQuestions.length === rawQuestions.length &&
    rawQuestions.every(isStoryQuestionPayloadValid) &&
    hasUniqueIds(mappedQuestions)
  );
};

const deriveContentVersion = (items: ContentItemRecord[]): string =>
  [...items]
    .sort(
      (left, right) =>
        left.content_type.localeCompare(right.content_type) ||
        left.slug.localeCompare(right.slug),
    )
    .map(
      (item) =>
        `${item.content_type}/${normalizeContentSlug(item.slug)}@${
          item.content_version ?? 1
        }:${item.updated_at ?? "unknown"}`,
    )
    .join("|");

function getItemProgressRevision(item: ContentItemRecord): string {
  const declaredRevision = item.payload?.progressRevision;
  const normalizedRevision =
    typeof declaredRevision === "string"
      ? declaredRevision.trim()
      : typeof declaredRevision === "number" && Number.isFinite(declaredRevision)
        ? String(declaredRevision)
        : "";

  return normalizedRevision || String(item.content_version ?? 1);
}

const deriveProgressRevisions = (
  items: ContentItemRecord[],
): Partial<Record<ContentItemType, string>> => {
  const revisions = new Map<ContentItemType, string[]>();

  [...items]
    .sort(
      (left, right) =>
        left.content_type.localeCompare(right.content_type) ||
        left.slug.localeCompare(right.slug),
    )
    .forEach((item) => {
      const contentType = parseContentItemType(item.content_type);
      const slug = normalizeContentSlug(item.slug);
      if (!contentType || !slug) return;

      const current = revisions.get(contentType) ?? [];
      current.push(`${contentType}/${slug}#${getItemProgressRevision(item)}`);
      revisions.set(contentType, current);
    });

  return Object.fromEntries(
    [...revisions.entries()].map(([contentType, values]) => [
      contentType,
      values.join("|"),
    ]),
  );
};

export const getContentProgressRevision = (
  bundle: ContentBundle | undefined,
  contentType: ContentItemType,
): string | undefined => bundle?.progressRevisions?.[contentType];

const buildContentBundleWithDiagnostics = (
  languageCode: string,
  items: ContentItemRecord[],
): BuildContentBundleResult => {
  const menuCardsByTab: Record<string, ChildMenuCard[]> = {};
  let learningGame = { title: "Learning", stages: [] as LearningGameStage[] };
  let learningHub: LearningLanguageContent | undefined;
  let wordGame = { title: "Words", levels: [] as WordGameLevel[] };
  let countingGame = { ...EMPTY_COUNTING_CONTENT };
  let cardGame = { ...EMPTY_CARD_GAME_CONTENT };
  let puzzleGame = { ...EMPTY_PUZZLE_GAME_CONTENT };
  const stories: LocalStory[] = [];
  const progressBearingItems: ContentItemRecord[] = [];
  const seenSingleBundleTypes = new Set<ContentItemType>();
  let supportedRowCount = 0;
  let invalidSupportedRowCount = 0;

  const orderedItems = [...items].sort(
    (left, right) =>
      (left.sort_order ?? 0) - (right.sort_order ?? 0) ||
      left.content_type.localeCompare(right.content_type) ||
      left.slug.localeCompare(right.slug),
  );

  for (const item of orderedItems) {
    if (item.language_code !== languageCode) continue;
    if (item.is_active === false || item.is_startable === false) continue;
    if (item.editorial_status && item.editorial_status !== "published") continue;

    const contentType = parseContentItemType(item.content_type);
    if (!contentType) continue;
    supportedRowCount += 1;

    if (SINGLE_BUNDLE_CONTENT_TYPES.has(contentType)) {
      if (seenSingleBundleTypes.has(contentType)) {
        invalidSupportedRowCount += 1;
        continue;
      }
      seenSingleBundleTypes.add(contentType);
    }

    const slug = normalizeContentSlug(item.slug);
    const payload = asRecord(item.payload);
    const topLevelValidation = validateContentItemPayload(contentType, payload);
    if (
      !slug ||
      !topLevelValidation.isValid ||
      !isMappedContentValid(contentType, payload, item)
    ) {
      invalidSupportedRowCount += 1;
      continue;
    }

    if (contentType === "child_menu") {
      menuCardsByTab[slug] = mapMenuCards(payload);
    } else if (contentType === "learning_hub") {
      learningHub =
        normalizeLearningHubLanguageContent(languageCode, payload) ?? undefined;
    } else if (contentType === "learning_game") {
      learningGame = {
        title: item.title ?? "Learning",
        stages: mapLearningStages(asArray(payload.stages)),
      };
    } else if (contentType === "word_game") {
      wordGame = {
        title: item.title ?? "Words",
        levels: mapWordGameLevels(asArray(payload.levels)),
      };
    } else if (contentType === "counting_game") {
      countingGame = mapCountingContent(payload, item.title ?? "Counting Game");
    } else if (contentType === "card_game") {
      cardGame = {
        title: item.title ?? "Cards Matching",
        items: mapCardGameItems(asArray(payload.items)),
      };
    } else if (contentType === "puzzle_game") {
      puzzleGame = {
        title: item.title ?? "Logic Puzzle",
        puzzles: mapPuzzleGameDefinitions(asArray(payload.puzzles)),
      };
    } else if (contentType === "story") {
      const payloadLanguageCode = asString(payload.languageCode);
      if (payloadLanguageCode && payloadLanguageCode !== languageCode) {
        invalidSupportedRowCount += 1;
        continue;
      }
      const story = mapStoryPayload(payload, item);
      if (story) stories.push(story);
    }

    // Only rows that actually contributed valid, exact-language content may
    // participate in the progress identity. This keeps an unexpected draft,
    // cross-language, or otherwise ignored row from resetting valid progress.
    progressBearingItems.push(item);
  }

  return {
    bundle: {
      languageCode,
      source: "database",
      contentVersion: deriveContentVersion(orderedItems),
      progressRevisions: deriveProgressRevisions(progressBearingItems),
      menuCardsByTab,
      learningHub,
      learningGame,
      wordGame,
      countingGame,
      cardGame,
      puzzleGame,
      stories,
    },
    supportedRowCount,
    invalidSupportedRowCount,
  };
};

export const buildContentBundleFromItems = (
  languageCode: string,
  items: ContentItemRecord[],
): ContentBundle => buildContentBundleWithDiagnostics(languageCode, items).bundle;

const isUsableDatabaseBundle = (bundle: ContentBundle): boolean =>
  Object.values(bundle.menuCardsByTab).some((cards) => cards.length > 0) ||
  Boolean(bundle.learningHub?.stages.length) ||
  bundle.learningGame.stages.length > 0 ||
  bundle.wordGame.levels.length > 0 ||
  (bundle.countingGame.stages.length > 0 && bundle.countingGame.numbers.length > 0) ||
  bundle.cardGame.items.length > 0 ||
  bundle.puzzleGame.puzzles.length > 0 ||
  bundle.stories.length > 0;

const buildLastKnownGoodBundle = (
  languageCode: string,
  items: ContentItemRecord[],
): ContentBundle | undefined => {
  const result = buildContentBundleWithDiagnostics(languageCode, items);
  if (
    result.supportedRowCount === 0 ||
    result.invalidSupportedRowCount > 0 ||
    !isUsableDatabaseBundle(result.bundle)
  ) {
    return undefined;
  }
  if (result.bundle.learningHub) {
    registerLearningHubLanguageContent(
      languageCode,
      result.bundle.learningHub,
      result.bundle.progressRevisions?.learning_hub ?? result.bundle.contentVersion,
    );
  }
  return result.bundle;
};

const parseCachedContentItemsEntry = (
  value: string | null,
  languageCode: string,
): ContentItemsCacheEntry | undefined => {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(value) as Partial<ContentItemsCacheEntry>;
    if (
      parsed.cacheSchemaVersion !== CONTENT_BUNDLE_CACHE_SCHEMA_VERSION ||
      parsed.languageCode !== languageCode ||
      typeof parsed.contentVersion !== "string" ||
      typeof parsed.loadedAt !== "number" ||
      !Array.isArray(parsed.items)
    ) {
      return undefined;
    }
    return parsed as ContentItemsCacheEntry;
  } catch {
    return undefined;
  }
};

const resolveCachedContentBundle = (
  entry: ContentItemsCacheEntry | undefined,
  languageCode: string,
  source: ContentBundleCacheMetadata["source"],
  maxAgeMs: number,
  now: number,
): CachedContentBundle | undefined => {
  if (!entry || entry.languageCode !== languageCode) return undefined;
  const bundle = buildLastKnownGoodBundle(languageCode, entry.items);
  if (!bundle || bundle.languageCode !== languageCode) return undefined;
  return {
    bundle,
    metadata: {
      cacheKey: getContentBundleCacheKey(languageCode),
      contentVersion: entry.contentVersion,
      loadedAt: entry.loadedAt,
      source,
      isStale: now - entry.loadedAt > maxAgeMs,
      maxAgeMs,
    },
  };
};

const readCachedContentBundle = async (
  languageCode: string,
  maxAgeMs: number,
  now: number,
): Promise<CachedContentBundle | undefined> => {
  const memory = contentItemsMemoryCache.get(languageCode);
  const memoryBundle = resolveCachedContentBundle(
    memory,
    languageCode,
    "memory",
    maxAgeMs,
    now,
  );
  if (memoryBundle) return memoryBundle;
  if (memory) contentItemsMemoryCache.delete(languageCode);

  try {
    const cacheKey = getContentBundleCacheKey(languageCode);
    const stored = parseCachedContentItemsEntry(
      await AsyncStorage.getItem(cacheKey),
      languageCode,
    );
    const storedBundle = resolveCachedContentBundle(
      stored,
      languageCode,
      "storage",
      maxAgeMs,
      now,
    );
    if (!storedBundle || !stored) {
      if (stored) await AsyncStorage.removeItem(cacheKey);
      return undefined;
    }
    contentItemsMemoryCache.set(languageCode, stored);
    return storedBundle;
  } catch (error) {
    console.warn(`Could not read cached content for ${languageCode}.`, error);
    return undefined;
  }
};

const writeCachedContentItems = async (
  languageCode: string,
  items: ContentItemRecord[],
  loadedAt: number,
): Promise<ContentItemsCacheEntry> => {
  const entry: ContentItemsCacheEntry = {
    cacheSchemaVersion: CONTENT_BUNDLE_CACHE_SCHEMA_VERSION,
    languageCode,
    contentVersion: deriveContentVersion(items),
    loadedAt,
    items,
  };
  contentItemsMemoryCache.set(languageCode, entry);
  try {
    await AsyncStorage.setItem(
      getContentBundleCacheKey(languageCode),
      JSON.stringify(entry),
    );
  } catch (error) {
    console.warn(`Could not persist cached content for ${languageCode}.`, error);
  }
  return entry;
};

const loadDatabaseContentBundle = async (
  languageCode: string,
  maxAgeMs: number,
): Promise<ContentLoadResult | undefined> => {
  const { data, error } = await supabase
    .from("content_items")
    .select(
      "id, language_code, content_type, slug, title, payload, sort_order, is_active, editorial_status, is_startable, content_version, updated_at, published_at",
    )
    .eq("language_code", languageCode)
    .eq("is_active", true)
    .eq("editorial_status", "published")
    .eq("is_startable", true)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  if (!data || data.length === 0) return undefined;

  const items = data as ContentItemRecord[];
  const bundle = buildLastKnownGoodBundle(languageCode, items);
  if (!bundle) return undefined;

  const loadedAt = Date.now();
  const entry = await writeCachedContentItems(languageCode, items, loadedAt);
  return {
    languageCode,
    source: "database",
    bundle,
    cache: {
      cacheKey: getContentBundleCacheKey(languageCode),
      contentVersion: entry.contentVersion,
      loadedAt,
      source: "network",
      isStale: false,
      maxAgeMs,
    },
  };
};

const refreshContentBundleInBackground = (
  languageCode: string,
  maxAgeMs: number,
): void => {
  if (contentItemsBackgroundRefreshes.has(languageCode)) return;
  const refresh = loadDatabaseContentBundle(languageCode, maxAgeMs)
    .then(() => undefined)
    .catch((error) => {
      console.warn(`Could not refresh cached content for ${languageCode}.`, error);
    })
    .finally(() => contentItemsBackgroundRefreshes.delete(languageCode));
  contentItemsBackgroundRefreshes.set(languageCode, refresh);
};

export const waitForContentBundleRefreshes = async (): Promise<void> => {
  await Promise.all([...contentItemsBackgroundRefreshes.values()]);
};

export const clearContentBundleCache = async (languageCode?: string): Promise<void> => {
  if (languageCode) {
    const normalized = normalizeContentLanguageCode(languageCode);
    if (!normalized) return;
    contentItemsMemoryCache.delete(normalized);
    contentItemsBackgroundRefreshes.delete(normalized);
    clearLearningHubContentRegistry(normalized);
    await AsyncStorage.removeItem(getContentBundleCacheKey(normalized));
    return;
  }

  contentItemsMemoryCache.clear();
  contentItemsBackgroundRefreshes.clear();
  clearLearningHubContentRegistry();
  try {
    const keys = await AsyncStorage.getAllKeys();
    const contentKeys = keys.filter((key) => key.startsWith(`${CONTENT_BUNDLE_CACHE_PREFIX}:`));
    if (contentKeys.length > 0) await AsyncStorage.multiRemove(contentKeys);
  } catch (error) {
    console.warn("Could not clear the content cache.", error);
  }
};

export const loadContentBundle = async (
  languageCode?: string | null,
  options: LoadContentBundleOptions = {},
): Promise<ContentLoadResult> => {
  const normalizedLanguageCode = normalizeContentLanguageCode(languageCode);
  if (!normalizedLanguageCode) {
    return {
      source: "empty",
      missingReason: `Unsupported learning language: ${languageCode}`,
    };
  }

  const maxAgeMs = options.maxAgeMs ?? CONTENT_BUNDLE_CACHE_TTL_MS;
  const cached = await readCachedContentBundle(
    normalizedLanguageCode,
    maxAgeMs,
    Date.now(),
  );

  if (!options.forceRefresh && cached) {
    refreshContentBundleInBackground(normalizedLanguageCode, maxAgeMs);
    return {
      languageCode: normalizedLanguageCode,
      source: "database",
      bundle: cached.bundle,
      cache: cached.metadata,
    };
  }

  try {
    const databaseResult = await loadDatabaseContentBundle(
      normalizedLanguageCode,
      maxAgeMs,
    );
    if (databaseResult) return databaseResult;
  } catch (error) {
    console.warn(`Could not load content for ${normalizedLanguageCode}.`, error);
  }

  if (cached) {
    return {
      languageCode: normalizedLanguageCode,
      source: "database",
      bundle: cached.bundle,
      cache: {
        ...cached.metadata,
        isStale: true,
      },
    };
  }

  return {
    languageCode: normalizedLanguageCode,
    source: "empty",
    missingReason: "No published content is available for this language yet.",
  };
};

export const findStoryById = (
  bundle: ContentBundle | undefined,
  storyId?: string | string[],
): LocalStory | undefined => {
  const id = Array.isArray(storyId) ? storyId[0] : storyId;
  if (!bundle || !id) return undefined;
  const slug = normalizeContentSlug(id);
  return bundle.stories.find((story) => normalizeContentSlug(story.id) === slug);
};

export { resolveImageSource };
