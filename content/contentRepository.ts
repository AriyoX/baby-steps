import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";
import { resolveImageSource } from "./assets";
import {
  DEFAULT_LEARNING_LANGUAGE_CODE,
  isSupportedLearningLanguageCode,
  normalizeLearningLanguageCode,
} from "./languages";
import { lugandaContent } from "./luganda";
import { runyankoleContent } from "./runyankole";
import type {
  LocalCountingContent,
  LocalLanguageContent,
  LocalLearningStage,
  LocalStory,
  LocalWordGameLevel,
  SupportedLearningLanguageCode,
} from "./types";

export type ContentItemType =
  | "child_menu"
  | "learning_game"
  | "word_game"
  | "counting_game"
  | "story";

const CONTENT_ITEM_TYPES: ContentItemType[] = [
  "child_menu",
  "learning_game",
  "word_game",
  "counting_game",
  "story",
];

export type ContentSource =
  | "database"
  | "local-lg-legacy"
  | "local-same-language-sample"
  | "empty";

export interface ContentItemRecord {
  id?: string;
  language_code: SupportedLearningLanguageCode;
  content_type: ContentItemType;
  slug: string;
  title?: string | null;
  payload: Record<string, unknown>;
  sort_order?: number;
  is_active?: boolean;
}

export interface ChildMenuCard {
  id: string;
  title: string;
  description: string;
  image?: string;
  targetPage: string;
  availability?: string;
}

export interface LearningGameWord {
  id: string;
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
  title: string;
  isLocked: boolean;
  words: LearningGameWord[];
}

export interface LearningGameStage {
  id: number;
  title: string;
  description: string;
  levels: LearningGameLevel[];
  isLocked: boolean;
  image: unknown;
  color: string;
  requiredScore: number;
}

export interface WordGameLevel {
  word: string;
  question: string;
  hint: string;
  subHint: string;
  firstLetter?: string;
  image?: string;
}

export interface CountingGameStage {
  id: number;
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
  targetText: string;
  audio?: string;
}

export interface CountingGameItem {
  name: string;
  image: string;
}

export interface CountingGameCurrency {
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

export interface ContentBundle {
  languageCode: SupportedLearningLanguageCode;
  source: ContentSource;
  menuCardsByTab: Record<string, ChildMenuCard[]>;
  learningGame: {
    title: string;
    stages: LearningGameStage[];
  };
  wordGame: {
    title: string;
    levels: WordGameLevel[];
  };
  countingGame: CountingGameContent;
  stories: LocalStory[];
}

export interface ContentLoadResult {
  languageCode?: SupportedLearningLanguageCode;
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
  loadedAt: number;
  source: "memory" | "storage" | "network";
  isStale: boolean;
  maxAgeMs: number;
}

interface ContentItemsCacheEntry {
  version: 1;
  languageCode: SupportedLearningLanguageCode;
  loadedAt: number;
  items: ContentItemRecord[];
}

interface CachedContentBundle {
  bundle: ContentBundle;
  metadata: ContentBundleCacheMetadata;
}

export const CONTENT_BUNDLE_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

const CONTENT_BUNDLE_CACHE_VERSION = 1;
const CONTENT_BUNDLE_CACHE_PREFIX = "@BabySteps:ContentBundle:v1";
const contentItemsMemoryCache = new Map<
  SupportedLearningLanguageCode,
  ContentItemsCacheEntry
>();
const contentItemsBackgroundRefreshes = new Map<
  SupportedLearningLanguageCode,
  Promise<void>
>();

const LOCAL_CONTENT_BY_LANGUAGE: Record<
  SupportedLearningLanguageCode,
  LocalLanguageContent
> = {
  lg: lugandaContent,
  nyn: runyankoleContent,
};

export const getContentBundleCacheKey = (
  languageCode: SupportedLearningLanguageCode,
): string => `${CONTENT_BUNDLE_CACHE_PREFIX}:${languageCode}`;

const isUsableDatabaseBundle = (bundle: ContentBundle): boolean => {
  const hasMenuCards = Object.values(bundle.menuCardsByTab).some(
    (cards) => cards.length > 0,
  );
  const hasLearningContent = bundle.learningGame.stages.length > 0;
  const hasWordContent = bundle.wordGame.levels.length > 0;
  const hasCountingContent =
    bundle.countingGame.stages.length > 0 &&
    bundle.countingGame.numbers.length > 0;
  const hasStories = bundle.stories.length > 0;

  return (
    hasMenuCards ||
    hasLearningContent ||
    hasWordContent ||
    hasCountingContent ||
    hasStories
  );
};

const buildUsableDatabaseBundle = (
  languageCode: SupportedLearningLanguageCode,
  items: ContentItemRecord[],
): ContentBundle | undefined => {
  const databaseBundle = buildContentBundleFromItems(languageCode, items);

  if (!isUsableDatabaseBundle(databaseBundle)) {
    return undefined;
  }

  return languageCode === "lg"
    ? mergeDatabaseBundleWithLegacyLugandaContent(databaseBundle)
    : databaseBundle;
};

const parseCachedContentItemsEntry = (
  value: string | null,
  languageCode: SupportedLearningLanguageCode,
): ContentItemsCacheEntry | undefined => {
  if (!value) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(value) as Partial<ContentItemsCacheEntry>;

    if (
      parsed.version !== CONTENT_BUNDLE_CACHE_VERSION ||
      parsed.languageCode !== languageCode ||
      !Array.isArray(parsed.items) ||
      typeof parsed.loadedAt !== "number"
    ) {
      return undefined;
    }

    return parsed as ContentItemsCacheEntry;
  } catch (error) {
    console.warn(`Could not parse cached content for ${languageCode}.`, error);
    return undefined;
  }
};

const resolveCachedContentBundle = (
  entry: ContentItemsCacheEntry | undefined,
  languageCode: SupportedLearningLanguageCode,
  metadata: Omit<ContentBundleCacheMetadata, "loadedAt">,
): CachedContentBundle | undefined => {
  if (!entry || entry.languageCode !== languageCode) {
    return undefined;
  }

  const bundle = buildUsableDatabaseBundle(languageCode, entry.items);

  if (!bundle || bundle.languageCode !== languageCode) {
    return undefined;
  }

  return {
    bundle,
    metadata: {
      ...metadata,
      loadedAt: entry.loadedAt,
    },
  };
};

const readCachedContentBundle = async (
  languageCode: SupportedLearningLanguageCode,
  options: {
    allowExpired: boolean;
    maxAgeMs: number;
    now: number;
  },
): Promise<CachedContentBundle | undefined> => {
  const cacheKey = getContentBundleCacheKey(languageCode);
  const isFresh = (entry: ContentItemsCacheEntry): boolean =>
    options.now - entry.loadedAt <= options.maxAgeMs;
  const buildMetadata = (
    source: ContentBundleCacheMetadata["source"],
    entry: ContentItemsCacheEntry,
  ): Omit<ContentBundleCacheMetadata, "loadedAt"> => ({
    cacheKey,
    source,
    isStale: !isFresh(entry),
    maxAgeMs: options.maxAgeMs,
  });

  const memoryEntry = contentItemsMemoryCache.get(languageCode);
  if (memoryEntry && (options.allowExpired || isFresh(memoryEntry))) {
    const cached = resolveCachedContentBundle(
      memoryEntry,
      languageCode,
      buildMetadata("memory", memoryEntry),
    );

    if (cached) {
      return cached;
    }

    contentItemsMemoryCache.delete(languageCode);
  }

  try {
    const storedValue = await AsyncStorage.getItem(cacheKey);
    const storageEntry = parseCachedContentItemsEntry(storedValue, languageCode);

    if (!storageEntry) {
      return undefined;
    }

    if (!options.allowExpired && !isFresh(storageEntry)) {
      contentItemsMemoryCache.set(languageCode, storageEntry);
      return undefined;
    }

    const cached = resolveCachedContentBundle(
      storageEntry,
      languageCode,
      buildMetadata("storage", storageEntry),
    );

    if (!cached) {
      await AsyncStorage.removeItem(cacheKey);
      contentItemsMemoryCache.delete(languageCode);
      return undefined;
    }

    contentItemsMemoryCache.set(languageCode, storageEntry);
    return cached;
  } catch (error) {
    console.warn(`Could not read cached content for ${languageCode}.`, error);
    return undefined;
  }
};

const writeCachedContentItems = async (
  languageCode: SupportedLearningLanguageCode,
  items: ContentItemRecord[],
  loadedAt: number,
): Promise<void> => {
  const entry: ContentItemsCacheEntry = {
    version: CONTENT_BUNDLE_CACHE_VERSION,
    languageCode,
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
};

const loadDatabaseContentBundle = async (
  languageCode: SupportedLearningLanguageCode,
  maxAgeMs: number,
): Promise<ContentLoadResult | undefined> => {
  const { data, error } = await supabase
    .from("content_items")
    .select("id, language_code, content_type, slug, title, payload, sort_order, is_active")
    .eq("language_code", languageCode)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    throw error;
  }

  if (!data || data.length === 0) {
    return undefined;
  }

  const contentItems = data as ContentItemRecord[];
  const bundle = buildUsableDatabaseBundle(languageCode, contentItems);

  if (!bundle) {
    console.warn(
      `Database content for ${languageCode} did not contain any usable payloads; using same-language bundled content if available.`,
    );
    return undefined;
  }

  const loadedAt = Date.now();
  await writeCachedContentItems(languageCode, contentItems, loadedAt);

  return {
    languageCode,
    source: "database",
    bundle,
    cache: {
      cacheKey: getContentBundleCacheKey(languageCode),
      loadedAt,
      source: "network",
      isStale: false,
      maxAgeMs,
    },
  };
};

const refreshContentBundleInBackground = (
  languageCode: SupportedLearningLanguageCode,
  maxAgeMs: number,
): void => {
  if (contentItemsBackgroundRefreshes.has(languageCode)) {
    return;
  }

  const refresh = loadDatabaseContentBundle(languageCode, maxAgeMs)
    .catch((error) => {
      console.warn(`Could not refresh cached content for ${languageCode}.`, error);
    })
    .then(() => undefined)
    .finally(() => {
      contentItemsBackgroundRefreshes.delete(languageCode);
    });

  contentItemsBackgroundRefreshes.set(languageCode, refresh);
};

export const clearContentBundleCache = async (
  languageCode?: SupportedLearningLanguageCode,
): Promise<void> => {
  if (languageCode) {
    contentItemsMemoryCache.delete(languageCode);
    contentItemsBackgroundRefreshes.delete(languageCode);
    await AsyncStorage.removeItem(getContentBundleCacheKey(languageCode));
    return;
  }

  contentItemsMemoryCache.clear();
  contentItemsBackgroundRefreshes.clear();

  await Promise.all(
    (Object.keys(LOCAL_CONTENT_BY_LANGUAGE) as SupportedLearningLanguageCode[]).map(
      (code) => AsyncStorage.removeItem(getContentBundleCacheKey(code)),
    ),
  );
};

const LEGACY_LUGANDA_MENU_CARDS: Record<string, ChildMenuCard[]> = {
  games: [
    {
      id: "words",
      title: "Words",
      image: "african-focus.png",
      description: "Fill in the missing letters to complete the word",
      targetPage: "child/games/wordgame",
    },
    {
      id: "logic",
      title: "Logic",
      image: "african-logic.png",
      description: "Solve puzzles inspired by popular Buganda heritage sites",
      targetPage: "child/games/puzzlegame",
    },
    {
      id: "cards",
      title: "Cards Matching",
      image: "cards-matching.png",
      description: "Match the cards to learn about Buganda cultural items",
      targetPage: "child/games/cardgame",
    },
    {
      id: "learning",
      title: "Learning",
      image: "african-patterns.png",
      description: "Learning common Luganda words and how they are used in sentences",
      targetPage: "child/games/learninggame",
    },
    {
      id: "numbers",
      title: "Numbers",
      image: "numbers.png",
      description: "Count with Luganda number labels",
      targetPage: "child/games/lugandacountinggame",
    },
  ],
  coloring: [
    {
      id: "emblem",
      title: "Buganda Emblem",
      image: "emblem.png",
      description: "Buganda's emblem",
      targetPage: "child/games/coloring/emblem",
    },
    {
      id: "king",
      title: "Kings",
      image: "king.jpg",
      description: "King's image",
      targetPage: "child/games/coloring/king",
    },
    {
      id: "animals",
      title: "Animals",
      image: "cow.png",
      description: "Color African wildlife animals",
      targetPage: "child/games/coloring/animals",
    },
    {
      id: "shapes",
      title: "Shapes",
      image: "shapes.jpg",
      description: "Color different shapes",
      targetPage: "child/games/coloring/shapes",
    },
    {
      id: "masks",
      title: "Masks",
      image: "mask.png",
      description: "Color traditional African masks",
      targetPage: "child/games/coloring/mask",
    },
  ],
  stories: [
    {
      id: "kintu",
      title: "Kintu",
      image: "kintu.jpg",
      description: "Learn about Kintu, the first person on Earth according to Buganda mythology",
      targetPage: "child/stories/kintustory",
      availability: "legacy-lg",
    },
    {
      id: "mwanga",
      title: "Kabaka Mwanga",
      image: "mwanga.jpg",
      description: "Discover the story of Kabaka Mwanga II of Buganda",
      targetPage: "child/stories/mwangastory",
      availability: "legacy-lg",
    },
    {
      id: "kasubi",
      title: "Kasubi Tombs",
      image: "kasubi.jpg",
      description: "Explore the UNESCO World Heritage Site of Kasubi Tombs",
      targetPage: "child/stories/kasubitombsstory",
      availability: "legacy-lg",
    },
    {
      id: "walumbe",
      title: "Walumbe and Death",
      image: "buganda-kingdom.jpg",
      description: "Learn about the story of Walumbe and the origin of death",
      targetPage: "child/stories/walumbestory",
      availability: "legacy-lg",
    },
    {
      id: "ssezibwa",
      title: "Ssezibwa Falls",
      image: "kabaka-trail.jpg",
      description: "Follow the historical origin of Ssezibwa Falls",
      targetPage: "child/stories/ssezibwafallsstory",
      availability: "legacy-lg",
    },
    {
      id: "millet",
      title: "Nambi and the First Millet",
      image: "culture.jpg",
      description: "Discover the story of Nambi and the first millet",
      targetPage: "child/stories/milletstory",
      availability: "legacy-lg",
    },
    {
      id: "kasokambirye",
      title: "Kasokambirye and the Moon",
      image: "culture.jpg",
      description: "Discover the story of Kasokambirye and the moon",
      targetPage: "child/stories/kasokambiryestory",
      availability: "legacy-lg",
    },
    {
      id: "fig-tree",
      title: "The Generous Fig Tree",
      image: "culture.jpg",
      description: "Discover the story of the generous fig tree",
      targetPage: "child/stories/figtreestory",
      availability: "legacy-lg",
    },
  ],
  museum: [
    {
      id: "artifacts",
      title: "Artifacts",
      image: "artifacts.jpg",
      description: "Explore ancient African artifacts",
      targetPage: "child/games/museum/ArtifactsScreen",
    },
    {
      id: "art",
      title: "Art",
      image: "art.jpg",
      description: "Discover traditional and contemporary African art",
      targetPage: "child/games/museum/ArtScreen",
    },
    {
      id: "instruments",
      title: "Instruments",
      image: "drums.jpg",
      description: "Learn about traditional African musical instruments",
      targetPage: "child/games/museum/InstrumentsScreen",
    },
    {
      id: "textiles",
      title: "Textiles",
      image: "textile.jpg",
      description: "Explore the rich tradition of African textiles",
      targetPage: "child/games/museum/TextilesScreen",
    },
  ],
};

const DEFAULT_RUNYANKOLE_MENU_CARDS: Record<string, ChildMenuCard[]> = {
  games: [
    {
      id: "words",
      title: "Words",
      image: "african-focus.png",
      description: "Practice Runyankole sample words",
      targetPage: "child/games/wordgame",
    },
    {
      id: "learning",
      title: "Learning",
      image: "african-patterns.png",
      description: "Learn starter Runyankole words and examples",
      targetPage: "child/games/learninggame",
    },
    {
      id: "numbers",
      title: "Numbers",
      image: "numbers.png",
      description: "Count with Runyankole sample number labels",
      targetPage: "child/games/lugandacountinggame",
    },
  ],
};

const DEFAULT_COUNTING_ITEMS: CountingGameItem[] = [
  { name: "matoke", image: "matooke.png" },
  { name: "mangoes", image: "mango.png" },
  { name: "goats", image: "goat.png" },
  { name: "baskets", image: "basket.png" },
  { name: "drums", image: "drum.png" },
  { name: "bananas", image: "banana.png" },
  { name: "beans", image: "bean.png" },
  { name: "children", image: "child.png" },
];

const EMPTY_COUNTING_CONTENT: CountingGameContent = {
  title: "Counting Game",
  stages: [],
  numbers: [],
  culturalItems: DEFAULT_COUNTING_ITEMS,
  currency: [],
};

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const asString = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;

const asNumber = (value: unknown, fallback = 0): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const asBoolean = (value: unknown, fallback = false): boolean =>
  typeof value === "boolean" ? value : fallback;

export interface ContentPayloadValidationResult {
  isValid: boolean;
  missingKeys: string[];
}

const REQUIRED_PAYLOAD_ARRAYS: Record<ContentItemType, string[]> = {
  child_menu: ["cards"],
  learning_game: ["stages"],
  word_game: ["levels"],
  counting_game: ["stages", "numbers"],
  story: ["pages"],
};

const isContentItemType = (value: string): value is ContentItemType =>
  CONTENT_ITEM_TYPES.includes(value as ContentItemType);

const parseContentItemType = (value: string): ContentItemType | undefined => {
  const trimmed = value.trim();

  if (trimmed !== trimmed.toLowerCase()) {
    return undefined;
  }

  return isContentItemType(trimmed) ? trimmed : undefined;
};

const normalizeContentSlug = (value: string): string => value.trim().toLowerCase();

export const validateContentItemPayload = (
  contentType: ContentItemType,
  payload: Record<string, unknown>,
): ContentPayloadValidationResult => {
  const missingKeys = REQUIRED_PAYLOAD_ARRAYS[contentType].filter((key) => {
    const value = payload[key];
    return !Array.isArray(value) || value.length === 0;
  });

  return {
    isValid: missingKeys.length === 0,
    missingKeys,
  };
};

const normalizeContentLanguageCode = (
  languageCode?: string | null,
): SupportedLearningLanguageCode | undefined => {
  const normalized = normalizeLearningLanguageCode(languageCode);

  if (!normalized) {
    return DEFAULT_LEARNING_LANGUAGE_CODE;
  }

  if (isSupportedLearningLanguageCode(normalized)) {
    return normalized;
  }

  return undefined;
};

const mapMenuCards = (payload: Record<string, unknown>): ChildMenuCard[] => {
  return asArray(payload.cards)
    .map((item) => {
      const card = asRecord(item);
      const id = asString(card.id);
      const targetPage = asString(card.targetPage);

      if (!id || !targetPage) {
        return undefined;
      }

      return {
        id,
        title: asString(card.title, id),
        description: asString(card.description),
        image: asString(card.image),
        targetPage,
        availability: asString(card.availability) || undefined,
      };
    })
    .filter(Boolean) as ChildMenuCard[];
};

const mapLearningStages = (stages: unknown[]): LearningGameStage[] => {
  return stages
    .map((stageValue, stageIndex) => {
      const stage = asRecord(stageValue);
      const id = asNumber(stage.id, asNumber(stage.numericId, stageIndex + 1));
      const levels = asArray(stage.levels)
        .map((levelValue, levelIndex) => {
          const level = asRecord(levelValue);
          const levelId = asNumber(level.id, asNumber(level.numericId, levelIndex + 1));
          const words = asArray(level.words)
            .map((wordValue, wordIndex) => {
              const word = asRecord(wordValue);
              const targetText = asString(word.targetText);
              const english = asString(word.english);

              if (!targetText || !english) {
                return undefined;
              }

              return {
                id: asString(word.id, `${id}-${levelId}-${wordIndex + 1}`),
                targetText,
                english,
                audio: asString(word.audio) || undefined,
                example: asString(word.example) || undefined,
                exampleTranslation: asString(word.exampleTranslation) || undefined,
                image: resolveImageSource(word.image),
                notes: asString(word.notes) || undefined,
              };
            })
            .filter(Boolean) as LearningGameWord[];

          if (!levelId || words.length === 0) {
            return undefined;
          }

          return {
            id: levelId,
            title: asString(level.title, `Level ${levelId}`),
            isLocked: asBoolean(level.isLocked),
            words,
          };
        })
        .filter(Boolean) as LearningGameLevel[];

      if (!id || levels.length === 0) {
        return undefined;
      }

      return {
        id,
        title: asString(stage.title, `Stage ${id}`),
        description: asString(stage.description),
        isLocked: asBoolean(stage.isLocked, id !== 1),
        requiredScore: asNumber(stage.requiredScore),
        image: resolveImageSource(stage.image, "coin.png"),
        color: asString(stage.color, "#6366f1"),
        levels,
      };
    })
    .filter(Boolean) as LearningGameStage[];
};

const mapLocalLearningStages = (
  stages: LocalLearningStage[],
): LearningGameStage[] => {
  return mapLearningStages(
    stages.map((stage) => ({
      ...stage,
      id: stage.numericId ?? stage.id,
      levels: stage.levels.map((level) => ({
        ...level,
        id: level.numericId ?? level.id,
      })),
    })),
  );
};

const mapWordGameLevels = (levels: unknown[]): WordGameLevel[] => {
  return levels
    .map((levelValue) => {
      const level = asRecord(levelValue);
      const targetText = asString(level.targetText, asString(level.word)).toUpperCase();

      if (!targetText) {
        return undefined;
      }

      return {
        word: targetText,
        question: asString(level.question, "Find the matching word"),
        hint: asString(level.hint),
        subHint: asString(level.subHint),
        firstLetter: asString(level.firstLetter) || undefined,
        image: asString(level.image) || undefined,
      };
    })
    .filter(Boolean) as WordGameLevel[];
};

const mapLocalWordGameLevels = (
  levels: LocalWordGameLevel[],
): WordGameLevel[] => mapWordGameLevels(levels);

const mapCountingStages = (stages: unknown[]): CountingGameStage[] => {
  return stages
    .map((stageValue, stageIndex) => {
      const stage = asRecord(stageValue);
      const range = asRecord(stage.numbersRange);
      const id = asNumber(stage.id, asNumber(stage.numericId, stageIndex + 1));

      if (!id) {
        return undefined;
      }

      return {
        id,
        title: asString(stage.title, `Stage ${id}`),
        description: asString(stage.description),
        numbersRange: {
          min: asNumber(range.min, 1),
          max: asNumber(range.max, 1),
        },
        levels: Math.max(1, asNumber(stage.levels, 1)),
        useBunches: asBoolean(stage.useBunches),
        itemsPerBunch:
          typeof stage.itemsPerBunch === "number" ? stage.itemsPerBunch : undefined,
        usesCurrency: asBoolean(stage.usesCurrency),
        prompt: asString(stage.prompt) || undefined,
        groupedPrompt: asString(stage.groupedPrompt) || undefined,
        currencyPrompt: asString(stage.currencyPrompt) || undefined,
      };
    })
    .filter(Boolean) as CountingGameStage[];
};

const mapCountingNumbers = (numbers: unknown[]): CountingGameNumber[] => {
  return numbers
    .map((numberValue) => {
      const item = asRecord(numberValue);
      const number = asNumber(item.number);
      const targetText = asString(item.targetText, asString(item.luganda));

      if (!number || !targetText) {
        return undefined;
      }

      return {
        number,
        targetText,
        audio: asString(item.audio) || undefined,
      };
    })
    .filter(Boolean) as CountingGameNumber[];
};

const mapCountingItems = (items: unknown[]): CountingGameItem[] => {
  const mapped = items
    .map((itemValue) => {
      const item = asRecord(itemValue);
      const name = asString(item.name);
      const image = asString(item.image);

      if (!name || !image) {
        return undefined;
      }

      return { name, image };
    })
    .filter(Boolean) as CountingGameItem[];

  return mapped.length > 0 ? mapped : DEFAULT_COUNTING_ITEMS;
};

const mapCountingCurrency = (items: unknown[]): CountingGameCurrency[] => {
  return items
    .map((itemValue) => {
      const item = asRecord(itemValue);
      const value = asNumber(item.value);
      const name = asString(item.name);
      const image = asString(item.image);
      const targetText = asString(item.targetText, asString(item.luganda));

      if (!value || !name || !image || !targetText) {
        return undefined;
      }

      return { value, name, image, targetText };
    })
    .filter(Boolean) as CountingGameCurrency[];
};

const mapCountingContent = (
  payload: Record<string, unknown>,
  fallbackTitle = "Counting Game",
): CountingGameContent => ({
  title: asString(payload.title, fallbackTitle),
  stages: mapCountingStages(asArray(payload.stages)),
  numbers: mapCountingNumbers(asArray(payload.numbers)),
  culturalItems: mapCountingItems(asArray(payload.culturalItems)),
  currency: mapCountingCurrency(asArray(payload.currency)),
});

const mapLocalCountingContent = (
  counting: LocalCountingContent,
  title = "Counting Game",
): CountingGameContent =>
  mapCountingContent({
    title,
    stages: counting.stages.map((stage) => ({
      ...stage,
      id: stage.numericId ?? stage.id,
    })),
    numbers: counting.numbers,
    culturalItems: DEFAULT_COUNTING_ITEMS,
    currency: [],
  });

export const buildContentBundleFromItems = (
  languageCode: SupportedLearningLanguageCode,
  items: ContentItemRecord[],
): ContentBundle => {
  const menuCardsByTab: Record<string, ChildMenuCard[]> = {};
  let learningGame = { title: "Learning", stages: [] as LearningGameStage[] };
  let wordGame = { title: "Words", levels: [] as WordGameLevel[] };
  let countingGame = { ...EMPTY_COUNTING_CONTENT };
  const stories: LocalStory[] = [];

  for (const item of items) {
    if (!item.is_active && item.is_active !== undefined) {
      continue;
    }

    if (item.language_code !== languageCode) {
      console.warn(
        `Skipping ${item.content_type}/${item.slug}; row language ${item.language_code} does not match requested language ${languageCode}.`,
      );
      continue;
    }

    const contentType = parseContentItemType(item.content_type);
    const slug = normalizeContentSlug(item.slug);
    const payload = asRecord(item.payload);

    if (!contentType) {
      console.warn(
        `Skipping content item with unsupported or non-lowercase content_type: ${item.content_type}`,
      );
      continue;
    }

    const validation = validateContentItemPayload(contentType, payload);

    if (!validation.isValid) {
      console.warn(
        `Skipping ${contentType}/${slug} content for ${languageCode}; missing required payload array(s): ${validation.missingKeys.join(", ")}`,
      );
      continue;
    }

    if (contentType === "child_menu") {
      menuCardsByTab[slug] = mapMenuCards(payload);
    }

    if (contentType === "learning_game") {
      learningGame = {
        title: item.title ?? "Learning",
        stages: mapLearningStages(asArray(payload.stages)),
      };
    }

    if (contentType === "word_game") {
      wordGame = {
        title: item.title ?? "Words",
        levels: mapWordGameLevels(asArray(payload.levels)),
      };
    }

    if (contentType === "counting_game") {
      countingGame = mapCountingContent(payload, item.title ?? "Counting Game");
    }

    if (contentType === "story") {
      const storyLanguageCode = asString(payload.languageCode);

      if (storyLanguageCode && storyLanguageCode !== languageCode) {
        console.warn(
          `Skipping story/${slug}; payload languageCode ${storyLanguageCode} does not match row language ${languageCode}.`,
        );
        continue;
      }

      stories.push(payload as unknown as LocalStory);
    }
  }

  return {
    languageCode,
    source: "database",
    menuCardsByTab,
    learningGame,
    wordGame,
    countingGame,
    stories,
  };
};

export const buildLocalContentBundle = (
  languageCode: SupportedLearningLanguageCode,
): ContentBundle => {
  const content = LOCAL_CONTENT_BY_LANGUAGE[languageCode];
  const menuCardsByTab =
    languageCode === "lg"
      ? LEGACY_LUGANDA_MENU_CARDS
      : {
          ...DEFAULT_RUNYANKOLE_MENU_CARDS,
          stories: content.stories.map((story) => ({
            id: story.id,
            title: story.title,
            description: story.summary,
            image: story.pages[0]?.image ?? "learning-beginner.jpg",
            targetPage: `child/stories/${story.id}`,
          })),
        };

  return {
    languageCode,
    source:
      languageCode === "lg" ? "local-lg-legacy" : "local-same-language-sample",
    menuCardsByTab,
    learningGame: {
      title: languageCode === "lg" ? "Luganda Learning" : "Runyankole Learning",
      stages: mapLocalLearningStages(content.lessons.stages),
    },
    wordGame: {
      title: languageCode === "lg" ? "Luganda Word Game" : "Runyankole Word Game",
      levels: mapLocalWordGameLevels(content.games.wordGameLevels),
    },
    countingGame: mapLocalCountingContent(
      content.games.counting,
      languageCode === "lg" ? "Luganda Counting Game" : "Runyankole Counting Samples",
    ),
    stories: content.stories,
  };
};

export const mergeDatabaseBundleWithLegacyLugandaContent = (
  databaseBundle: ContentBundle,
): ContentBundle => {
  if (databaseBundle.languageCode !== "lg") {
    return databaseBundle;
  }

  const legacyBundle = buildLocalContentBundle("lg");

  return {
    ...databaseBundle,
    menuCardsByTab: {
      ...legacyBundle.menuCardsByTab,
      ...databaseBundle.menuCardsByTab,
    },
    learningGame:
      databaseBundle.learningGame.stages.length >= legacyBundle.learningGame.stages.length
        ? databaseBundle.learningGame
        : legacyBundle.learningGame,
    wordGame:
      databaseBundle.wordGame.levels.length >= legacyBundle.wordGame.levels.length
        ? databaseBundle.wordGame
        : legacyBundle.wordGame,
    countingGame:
      databaseBundle.countingGame.stages.length >= legacyBundle.countingGame.stages.length
        ? databaseBundle.countingGame
        : legacyBundle.countingGame,
    stories:
      databaseBundle.stories.length > 0
        ? databaseBundle.stories
        : legacyBundle.stories,
  };
};

export const loadContentBundle = async (
  languageCode?: string | null,
  options: LoadContentBundleOptions = {},
): Promise<ContentLoadResult> => {
  const normalizedLanguageCode = normalizeContentLanguageCode(languageCode);
  const maxAgeMs = options.maxAgeMs ?? CONTENT_BUNDLE_CACHE_TTL_MS;
  const now = Date.now();

  if (!normalizedLanguageCode) {
    return {
      source: "empty",
      missingReason: `Unsupported learning language: ${languageCode}`,
    };
  }

  if (!options.forceRefresh) {
    const cached = await readCachedContentBundle(normalizedLanguageCode, {
      allowExpired: false,
      maxAgeMs,
      now,
    });

    if (cached) {
      return {
        languageCode: normalizedLanguageCode,
        source: "database",
        bundle: cached.bundle,
        cache: cached.metadata,
      };
    }

    const staleCached = await readCachedContentBundle(normalizedLanguageCode, {
      allowExpired: true,
      maxAgeMs,
      now,
    });

    if (staleCached) {
      refreshContentBundleInBackground(normalizedLanguageCode, maxAgeMs);
      return {
        languageCode: normalizedLanguageCode,
        source: "database",
        bundle: staleCached.bundle,
        cache: staleCached.metadata,
      };
    }
  }

  try {
    const databaseResult = await loadDatabaseContentBundle(
      normalizedLanguageCode,
      maxAgeMs,
    );

    if (databaseResult) {
      return databaseResult;
    }
  } catch (error) {
    console.warn(
      `Could not load database content for ${normalizedLanguageCode}; using same-language bundled content if available.`,
      error,
    );

    const cached = await readCachedContentBundle(normalizedLanguageCode, {
      allowExpired: true,
      maxAgeMs,
      now: Date.now(),
    });

    if (cached) {
      return {
        languageCode: normalizedLanguageCode,
        source: "database",
        bundle: cached.bundle,
        cache: cached.metadata,
      };
    }
  }

  const localContent = LOCAL_CONTENT_BY_LANGUAGE[normalizedLanguageCode];
  if (!localContent) {
    return {
      languageCode: normalizedLanguageCode,
      source: "empty",
      missingReason: "No content is available for this language yet.",
    };
  }

  return {
    languageCode: normalizedLanguageCode,
    source:
      normalizedLanguageCode === "lg"
        ? "local-lg-legacy"
        : "local-same-language-sample",
    bundle: buildLocalContentBundle(normalizedLanguageCode),
  };
};

export const findStoryById = (
  bundle: ContentBundle | undefined,
  storyId?: string | string[],
): LocalStory | undefined => {
  const normalizedStoryId = Array.isArray(storyId) ? storyId[0] : storyId;
  if (!bundle || !normalizedStoryId) return undefined;
  return bundle.stories.find((story) => story.id === normalizedStoryId);
};

export { resolveImageSource };
