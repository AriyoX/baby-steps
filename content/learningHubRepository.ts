import {
  DEFAULT_LEARNING_LANGUAGE_CODE,
  getLearningLanguage,
  normalizeLearningLanguageCode,
} from "./languages";
import type {
  ChooseCorrectWordItem,
  ContentReadiness,
  CulturalCardItem,
  LearningContentBundle,
  LearningLanguageCode,
  LearningLanguageContent,
  LearningLesson,
  LearningLessonItem,
  LearningStage,
  LessonStatus,
  ListenAndChooseItem,
  MatchWordPictureItem,
  MechanicType,
  MiniQuizItem,
  StoryBiteItem,
  TapToLearnItem,
  UnsupportedLessonItem,
} from "./learningHubTypes";

export type LearningHubMechanic = MechanicType;
export type LearningHubLessonItem = LearningLessonItem;
export type LearningHubLesson = LearningLesson;
export type LearningHubStage = LearningStage;

type RawLearningHubLessonItem = Partial<
  Record<
    | "id"
    | "mechanic"
    | "order"
    | "word"
    | "translation"
    | "localText"
    | "englishText"
    | "imageAsset"
    | "imageKey"
    | "audioKey"
    | "audioAsset"
    | "phoneticText"
    | "exampleSentence"
    | "prompt"
    | "promptText"
    | "questionText"
    | "targetText"
    | "targetEnglishText"
    | "instructions"
    | "localTitle"
    | "bodyText"
    | "reflectionPrompt"
    | "funFact"
    | "emoji"
    | "type",
    unknown
  >
> & {
  options?: unknown;
  questions?: unknown;
  pages?: unknown;
  correctOptionId?: unknown;
  title?: unknown;
  culturalNote?: unknown;
  readiness?: unknown;
  metadata?: unknown;
};

interface RawLearningHubLesson {
  id?: unknown;
  title?: unknown;
  description?: unknown;
  goal?: unknown;
  mechanic?: unknown;
  order?: unknown;
  locked?: unknown;
  isLocked?: unknown;
  isStartable?: unknown;
  readiness?: unknown;
  status?: unknown;
  metadata?: unknown;
  items?: RawLearningHubLessonItem[];
}

interface RawLearningHubStage {
  id?: unknown;
  order?: unknown;
  stageNumber?: unknown;
  title?: unknown;
  description?: unknown;
  imageKey?: unknown;
  imageAsset?: unknown;
  status?: unknown;
  estimatedMinutes?: unknown;
  lessonCount?: unknown;
  isPractice?: unknown;
  locked?: unknown;
  isLocked?: unknown;
  readiness?: unknown;
  mechanics?: unknown[];
  learningGoals?: unknown[];
  placeholderMessage?: unknown;
  metadata?: unknown;
  lessons?: RawLearningHubLesson[];
}

interface LearningHubLanguageContent {
  languageCode?: unknown;
  displayName?: unknown;
  localName?: unknown;
  pathTitle?: unknown;
  stages?: RawLearningHubStage[];
}

interface LearningHubContentFile {
  version?: unknown;
  defaultLanguage?: unknown;
  languages?: Record<string, LearningHubLanguageContent | undefined>;
}

const learningHubContent = require("./learningHubContent.json") as LearningHubContentFile;

const MECHANIC_TYPES = [
  "tap_to_learn",
  "cultural_card",
  "choose_correct_word",
  "listen_and_choose",
  "match_word_picture",
  "mini_quiz",
  "story_bite",
  "practice_mix",
] as const satisfies readonly MechanicType[];

const MECHANIC_LABELS: Record<MechanicType, string> = {
  tap_to_learn: "Tap to learn",
  cultural_card: "Culture card",
  choose_correct_word: "Pick the word",
  listen_and_choose: "Listen and choose",
  match_word_picture: "Match pictures",
  mini_quiz: "Quick quiz",
  story_bite: "Story bite",
  practice_mix: "Practice mix",
};

const IMPLEMENTED_MECHANICS = new Set<MechanicType>([
  "tap_to_learn",
  "listen_and_choose",
  "choose_correct_word",
  "match_word_picture",
  "mini_quiz",
  "cultural_card",
  "story_bite",
]);

const UNSTARTABLE_MECHANIC_FALLBACK: MechanicType = "practice_mix";

const isMechanicType = (mechanic: unknown): mechanic is MechanicType =>
  typeof mechanic === "string" && MECHANIC_TYPES.includes(mechanic as MechanicType);

const asString = (value: unknown, fallback = ""): string => {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmedValue = value.trim();
  return trimmedValue || fallback;
};

const asOptionalString = (value: unknown): string | undefined => {
  const text = asString(value);
  return text || undefined;
};

const asPositiveNumber = (value: unknown, fallback: number): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(1, value);
};

const asOptionalPositiveNumber = (value: unknown): number | undefined => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }

  return Math.max(1, value);
};

const asBoolean = (value: unknown, fallback = false): boolean =>
  typeof value === "boolean" ? value : fallback;

const asStageStatus = (
  value: unknown,
  isLocked: boolean,
): LearningStage["status"] => {
  if (isLocked) {
    return "locked";
  }

  if (value === "preview" || value === "planned" || value === "locked") {
    return value;
  }

  return "preview";
};

const asContentReadiness = (
  value: unknown,
  fallback: ContentReadiness = "placeholder",
): ContentReadiness => {
  if (
    value === "placeholder" ||
    value === "draft" ||
    value === "reviewed" ||
    value === "production"
  ) {
    return value;
  }

  return fallback;
};

const asMetadata = (value: unknown): Record<string, unknown> | undefined => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
};

const toFallbackLabel = (mechanic: string): string =>
  mechanic
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const normalizeMechanic = (
  mechanic: unknown,
  fallback: MechanicType = UNSTARTABLE_MECHANIC_FALLBACK,
): MechanicType => (isMechanicType(mechanic) ? mechanic : fallback);

const sortByOrder = <T extends { id: string; order: number }>(items: T[]): T[] =>
  [...items].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));

const uniqueMechanics = (mechanics: MechanicType[]): MechanicType[] =>
  mechanics.filter((mechanic, index) => mechanics.indexOf(mechanic) === index);

const getRawLanguages = (): Record<string, LearningHubLanguageContent | undefined> =>
  learningHubContent.languages ?? {};

const hasLearningHubLanguage = (languageCode: string | undefined): boolean =>
  Boolean(languageCode && getRawLanguages()[languageCode]);

export const getDefaultLearningLanguageCode = (): LearningLanguageCode => {
  const declaredDefault = asString(
    learningHubContent.defaultLanguage,
    DEFAULT_LEARNING_LANGUAGE_CODE,
  );

  if (hasLearningHubLanguage(declaredDefault)) {
    return declaredDefault;
  }

  if (hasLearningHubLanguage(DEFAULT_LEARNING_LANGUAGE_CODE)) {
    return DEFAULT_LEARNING_LANGUAGE_CODE;
  }

  return Object.keys(getRawLanguages())[0] ?? DEFAULT_LEARNING_LANGUAGE_CODE;
};

export const resolveLearningHubLanguageCode = (
  languageCode?: string | null,
): LearningLanguageCode => {
  const normalizedLanguageCode = normalizeLearningLanguageCode(languageCode);

  if (normalizedLanguageCode) {
    return normalizedLanguageCode;
  }

  return getDefaultLearningLanguageCode();
};

const asObjectArray = (value: unknown): Array<Record<string, unknown>> =>
  Array.isArray(value)
    ? value.filter(
        (item): item is Record<string, unknown> =>
          Boolean(item) && typeof item === "object" && !Array.isArray(item),
      )
    : [];

const normalizeListenAndChooseOptions = (
  value: unknown,
): ListenAndChooseItem["options"] => {
  const seenOptionIds = new Set<string>();
  const options = asObjectArray(value).reduce<
    Array<ListenAndChooseItem["options"][number] & { sourceIndex: number }>
  >((currentOptions, option, index) => {
    const id = asOptionalString(option.id);

    if (!id || seenOptionIds.has(id)) {
      return currentOptions;
    }

    const localText =
      asOptionalString(option.localText) ?? asOptionalString(option.word);
    const englishText =
      asOptionalString(option.englishText) ?? asOptionalString(option.translation);
    const imageKey = asOptionalString(option.imageKey);
    const imageAsset = asOptionalString(option.imageAsset);

    if (!localText && !englishText && !imageKey && !imageAsset) {
      return currentOptions;
    }

    seenOptionIds.add(id);
    currentOptions.push({
      id,
      order: asOptionalPositiveNumber(option.order),
      localText,
      englishText,
      imageKey,
      imageAsset,
      sourceIndex: index,
    });

    return currentOptions;
  }, []);

  return options
    .sort(
      (a, b) =>
        (a.order ?? Number.MAX_SAFE_INTEGER) -
          (b.order ?? Number.MAX_SAFE_INTEGER) ||
        a.sourceIndex - b.sourceIndex ||
        a.id.localeCompare(b.id),
    )
    .map(({ sourceIndex, ...option }) => option);
};

const normalizeChooseCorrectWordOptions = (
  value: unknown,
): ChooseCorrectWordItem["options"] => {
  const seenOptionIds = new Set<string>();
  const options = asObjectArray(value).reduce<
    Array<ChooseCorrectWordItem["options"][number] & {
      order?: number;
      sourceIndex: number;
    }>
  >((currentOptions, option, index) => {
    const id = asOptionalString(option.id);
    const localText =
      asOptionalString(option.localText) ?? asOptionalString(option.word);

    if (!id || !localText || seenOptionIds.has(id)) {
      return currentOptions;
    }

    const englishText =
      asOptionalString(option.englishText) ?? asOptionalString(option.translation);
    const imageKey = asOptionalString(option.imageKey);
    const imageAsset = asOptionalString(option.imageAsset);

    seenOptionIds.add(id);
    currentOptions.push({
      id,
      localText,
      ...(englishText ? { englishText } : {}),
      ...(imageKey ? { imageKey } : {}),
      ...(imageAsset ? { imageAsset } : {}),
      order: asOptionalPositiveNumber(option.order),
      sourceIndex: index,
    });

    return currentOptions;
  }, []);

  return options
    .sort(
      (a, b) =>
        (a.order ?? Number.MAX_SAFE_INTEGER) -
          (b.order ?? Number.MAX_SAFE_INTEGER) ||
        a.sourceIndex - b.sourceIndex ||
        a.id.localeCompare(b.id),
    )
    .map(({ order: _order, sourceIndex: _sourceIndex, ...option }) => option);
};

const normalizeMatchWordPictureOptions = (
  value: unknown,
): MatchWordPictureItem["options"] => {
  const seenOptionIds = new Set<string>();
  const options = asObjectArray(value).reduce<
    Array<MatchWordPictureItem["options"][number] & {
      order?: number;
      sourceIndex: number;
    }>
  >((currentOptions, option, index) => {
    const id = asOptionalString(option.id);

    if (!id || seenOptionIds.has(id)) {
      return currentOptions;
    }

    const localText =
      asOptionalString(option.localText) ?? asOptionalString(option.word);
    const englishText =
      asOptionalString(option.englishText) ?? asOptionalString(option.translation);
    const imageKey = asOptionalString(option.imageKey);
    const imageAsset = asOptionalString(option.imageAsset);
    const emoji = asOptionalString(option.emoji);

    if (!localText && !englishText && !imageKey && !imageAsset && !emoji) {
      return currentOptions;
    }

    seenOptionIds.add(id);
    currentOptions.push({
      id,
      localText: localText ?? englishText ?? id,
      ...(englishText ? { englishText } : {}),
      ...(imageKey ? { imageKey } : {}),
      ...(imageAsset ? { imageAsset } : {}),
      ...(emoji ? { emoji } : {}),
      order: asOptionalPositiveNumber(option.order),
      sourceIndex: index,
    });

    return currentOptions;
  }, []);

  return options
    .sort(
      (a, b) =>
        (a.order ?? Number.MAX_SAFE_INTEGER) -
          (b.order ?? Number.MAX_SAFE_INTEGER) ||
        a.sourceIndex - b.sourceIndex ||
        a.id.localeCompare(b.id),
    )
    .map(({ order: _order, sourceIndex: _sourceIndex, ...option }) => option);
};

const normalizeMiniQuizOptions = (
  value: unknown,
): MiniQuizItem["questions"][number]["options"] => {
  const seenOptionIds = new Set<string>();
  const options = asObjectArray(value).reduce<
    Array<MiniQuizItem["questions"][number]["options"][number] & {
      order?: number;
      sourceIndex: number;
    }>
  >((currentOptions, option, index) => {
    const id = asOptionalString(option.id);
    const text =
      asOptionalString(option.text) ??
      asOptionalString(option.localText) ??
      asOptionalString(option.word);

    if (!id || !text || seenOptionIds.has(id)) {
      return currentOptions;
    }

    const englishText =
      asOptionalString(option.englishText) ?? asOptionalString(option.translation);

    seenOptionIds.add(id);
    currentOptions.push({
      id,
      text,
      ...(englishText ? { englishText } : {}),
      order: asOptionalPositiveNumber(option.order),
      sourceIndex: index,
    });

    return currentOptions;
  }, []);

  return options
    .sort(
      (a, b) =>
        (a.order ?? Number.MAX_SAFE_INTEGER) -
          (b.order ?? Number.MAX_SAFE_INTEGER) ||
        a.sourceIndex - b.sourceIndex ||
        a.id.localeCompare(b.id),
    )
    .map(({ order: _order, sourceIndex: _sourceIndex, ...option }) => option);
};

const normalizeMiniQuizQuestions = (
  value: unknown,
): MiniQuizItem["questions"] => {
  const seenQuestionIds = new Set<string>();

  return asObjectArray(value).reduce<MiniQuizItem["questions"]>(
    (currentQuestions, question) => {
      const id = asOptionalString(question.id);

      if (!id || seenQuestionIds.has(id)) {
        return currentQuestions;
      }

      const promptText =
        asOptionalString(question.promptText) ??
        asOptionalString(question.prompt) ??
        asOptionalString(question.questionText);
      const promptEnglishText = asOptionalString(question.promptEnglishText);
      const explanationText = asOptionalString(question.explanationText);

      seenQuestionIds.add(id);
      currentQuestions.push({
        id,
        promptText: promptText ?? "",
        ...(promptEnglishText ? { promptEnglishText } : {}),
        correctOptionId: asOptionalString(question.correctOptionId) ?? "",
        options: normalizeMiniQuizOptions(question.options),
        ...(explanationText ? { explanationText } : {}),
      });

      return currentQuestions;
    },
    [],
  );
};

const normalizeStoryBitePages = (value: unknown): StoryBiteItem["pages"] => {
  const seenPageIds = new Set<string>();

  return asObjectArray(value).reduce<StoryBiteItem["pages"]>(
    (currentPages, page, index) => {
      const id = asOptionalString(page.id) ?? `page-${index + 1}`;

      if (seenPageIds.has(id)) {
        return currentPages;
      }

      const title = asOptionalString(page.title);
      const localTitle = asOptionalString(page.localTitle);
      const bodyText =
        asOptionalString(page.bodyText) ??
        asOptionalString(page.text) ??
        asOptionalString(page.englishText) ??
        "";
      const localText =
        asOptionalString(page.localText) ?? asOptionalString(page.word);
      const imageKey = asOptionalString(page.imageKey);
      const imageAsset = asOptionalString(page.imageAsset);
      const emoji = asOptionalString(page.emoji);
      const audioAsset = asOptionalString(page.audioAsset);
      const audioKey = asOptionalString(page.audioKey) ?? audioAsset;

      seenPageIds.add(id);
      currentPages.push({
        id,
        ...(title ? { title } : {}),
        ...(localTitle ? { localTitle } : {}),
        bodyText,
        ...(localText ? { localText } : {}),
        ...(imageKey ? { imageKey } : {}),
        ...(imageAsset ? { imageAsset } : {}),
        ...(emoji ? { emoji } : {}),
        ...(audioKey ? { audioKey } : {}),
        ...(audioAsset ? { audioAsset } : {}),
      });

      return currentPages;
    },
    [],
  );
};

const normalizeLessonItem = (
  item: RawLearningHubLessonItem,
  fallbackId: string,
  lessonMechanic: MechanicType,
  fallbackOrder: number,
): LearningLessonItem => {
  const mechanic = normalizeMechanic(item.mechanic, lessonMechanic);
  const base = {
    id: asString(item.id, fallbackId),
    mechanic,
    order: asPositiveNumber(item.order, fallbackOrder),
    imageAsset: asOptionalString(item.imageAsset),
    imageKey: asOptionalString(item.imageKey),
    audioKey: asOptionalString(item.audioKey) ?? asOptionalString(item.audioAsset),
    audioAsset: asOptionalString(item.audioAsset),
    readiness: asContentReadiness(item.readiness, "placeholder"),
    metadata: asMetadata(item.metadata),
  };
  const localText = asString(item.localText, asString(item.word, "Word"));
  const englishText = asString(
    item.englishText,
    asString(item.translation, "Meaning"),
  );

  if (mechanic === "tap_to_learn") {
    return {
      ...base,
      mechanic,
      localText,
      englishText,
      word: localText,
      translation: englishText,
      phoneticText: asOptionalString(item.phoneticText),
      exampleSentence: asOptionalString(item.exampleSentence),
    } satisfies TapToLearnItem;
  }

  const legacyText = {
    localText: localText === "Word" ? undefined : localText,
    englishText: englishText === "Meaning" ? undefined : englishText,
    word: localText === "Word" ? undefined : localText,
    translation: englishText === "Meaning" ? undefined : englishText,
  };
  const prompt =
    asOptionalString(item.promptText) ??
    asOptionalString(item.prompt) ??
    asOptionalString(item.type);

  if (mechanic === "listen_and_choose") {
    return {
      ...base,
      localText: legacyText.localText,
      englishText: legacyText.englishText,
      mechanic,
      prompt,
      promptText: prompt,
      options: normalizeListenAndChooseOptions(item.options),
      correctOptionId: asOptionalString(item.correctOptionId) ?? "",
    } satisfies ListenAndChooseItem;
  }

  if (mechanic === "choose_correct_word") {
    const promptText =
      prompt ??
      (legacyText.englishText
        ? `Which word means ${legacyText.englishText}?`
        : "Choose the correct word");

    return {
      ...base,
      localText: legacyText.localText,
      englishText: legacyText.englishText,
      mechanic,
      promptText,
      questionText: asOptionalString(item.questionText) ?? legacyText.englishText,
      options: normalizeChooseCorrectWordOptions(item.options),
      correctOptionId: asOptionalString(item.correctOptionId) ?? "",
    } satisfies ChooseCorrectWordItem;
  }

  if (mechanic === "match_word_picture") {
    const targetText =
      asOptionalString(item.targetText) ?? legacyText.localText ?? "";
    const targetEnglishText =
      asOptionalString(item.targetEnglishText) ?? legacyText.englishText;

    return {
      ...base,
      localText: targetText,
      englishText: targetEnglishText,
      mechanic,
      promptText: prompt ?? "Tap the picture that matches",
      targetText,
      ...(targetEnglishText ? { targetEnglishText } : {}),
      correctOptionId: asOptionalString(item.correctOptionId) ?? "",
      options: normalizeMatchWordPictureOptions(item.options),
    } satisfies MatchWordPictureItem;
  }

  if (mechanic === "mini_quiz") {
    return {
      ...base,
      localText: legacyText.localText,
      englishText: legacyText.englishText,
      mechanic,
      title:
        asOptionalString(item.title) ??
        (legacyText.englishText ? `${legacyText.englishText} quiz` : "Quick quiz"),
      instructions: asOptionalString(item.instructions),
      questions: normalizeMiniQuizQuestions(item.questions),
    } satisfies MiniQuizItem;
  }

  if (mechanic === "cultural_card") {
    const title =
      asOptionalString(item.title) ??
      asOptionalString(item.localTitle) ??
      legacyText.englishText ??
      legacyText.localText ??
      "Culture card";
    const localTitle = asOptionalString(item.localTitle);
    const bodyText =
      asOptionalString(item.bodyText) ??
      asOptionalString(item.culturalNote) ??
      legacyText.englishText ??
      "";
    const cardLocalText =
      legacyText.localText ?? asOptionalString(item.localText);
    const emoji = asOptionalString(item.emoji);
    const reflectionPrompt = asOptionalString(item.reflectionPrompt);
    const funFact = asOptionalString(item.funFact);

    return {
      ...base,
      mechanic,
      title,
      ...(localTitle ? { localTitle } : {}),
      bodyText,
      ...(cardLocalText ? { localText: cardLocalText } : {}),
      ...(legacyText.englishText ? { englishText: legacyText.englishText } : {}),
      ...(emoji ? { emoji } : {}),
      ...(reflectionPrompt ? { reflectionPrompt } : {}),
      ...(funFact ? { funFact } : {}),
    } satisfies CulturalCardItem;
  }

  if (mechanic === "story_bite") {
    const title =
      asOptionalString(item.title) ??
      legacyText.englishText ??
      legacyText.localText ??
      "Story bite";
    const instructions = asOptionalString(item.instructions);
    const reflectionPrompt = asOptionalString(item.reflectionPrompt);

    return {
      ...base,
      localText: legacyText.localText,
      englishText: legacyText.englishText,
      mechanic,
      title,
      ...(instructions ? { instructions } : {}),
      pages: normalizeStoryBitePages(item.pages),
      ...(reflectionPrompt ? { reflectionPrompt } : {}),
    } satisfies StoryBiteItem;
  }

  return {
    ...base,
    ...legacyText,
    mechanic,
    prompt,
  } satisfies UnsupportedLessonItem;
};

const hasAnswerOptionContent = (
  option: ListenAndChooseItem["options"][number],
): boolean =>
  Boolean(option.localText || option.englishText || option.imageKey || option.imageAsset);

const isValidListenAndChooseItem = (
  item: LearningLessonItem,
): item is ListenAndChooseItem =>
  item.mechanic === "listen_and_choose" &&
  item.options.length >= 2 &&
  item.options.length <= 4 &&
  item.options.every(hasAnswerOptionContent) &&
  Boolean(item.correctOptionId) &&
  item.options.some((option) => option.id === item.correctOptionId);

const isValidChooseCorrectWordItem = (
  item: LearningLessonItem,
): item is ChooseCorrectWordItem => {
  if (item.mechanic !== "choose_correct_word") {
    return false;
  }

  const optionIds = item.options.map((option) => option.id);
  const uniqueOptionIds = new Set(optionIds);

  return (
    Boolean(item.promptText.trim()) &&
    item.options.length >= 2 &&
    item.options.length <= 4 &&
    uniqueOptionIds.size === item.options.length &&
    item.options.every(
      (option) => Boolean(option.id.trim()) && Boolean(option.localText.trim()),
    ) &&
    Boolean(item.correctOptionId.trim()) &&
    item.options.some((option) => option.id === item.correctOptionId)
  );
};

const isValidMatchWordPictureItem = (
  item: LearningLessonItem,
): item is MatchWordPictureItem => {
  if (item.mechanic !== "match_word_picture") {
    return false;
  }

  const optionIds = item.options.map((option) => option.id);
  const uniqueOptionIds = new Set(optionIds);

  return (
    Boolean(item.promptText.trim()) &&
    Boolean(item.targetText.trim()) &&
    item.options.length >= 2 &&
    item.options.length <= 4 &&
    uniqueOptionIds.size === item.options.length &&
    item.options.every(
      (option) =>
        Boolean(option.id.trim()) &&
        Boolean(option.localText.trim()) &&
        Boolean(
          option.imageKey ||
            option.imageAsset ||
            option.emoji?.trim() ||
            option.englishText?.trim() ||
            option.localText.trim(),
        ),
    ) &&
    Boolean(item.correctOptionId.trim()) &&
    item.options.some((option) => option.id === item.correctOptionId)
  );
};

const isValidMiniQuizQuestion = (
  question: MiniQuizItem["questions"][number],
): boolean => {
  const optionIds = question.options.map((option) => option.id);
  const uniqueOptionIds = new Set(optionIds);

  return (
    Boolean(question.id.trim()) &&
    Boolean(question.promptText.trim()) &&
    question.options.length >= 2 &&
    question.options.length <= 4 &&
    uniqueOptionIds.size === question.options.length &&
    question.options.every(
      (option) => Boolean(option.id.trim()) && Boolean(option.text.trim()),
    ) &&
    Boolean(question.correctOptionId.trim()) &&
    question.options.some((option) => option.id === question.correctOptionId)
  );
};

const isValidMiniQuizItem = (
  item: LearningLessonItem,
): item is MiniQuizItem =>
  item.mechanic === "mini_quiz" &&
  Boolean(item.title.trim()) &&
  item.questions.length >= 1 &&
  item.questions.length <= 5 &&
  item.questions.every(isValidMiniQuizQuestion);

const isValidCulturalCardItem = (
  item: LearningLessonItem,
): item is CulturalCardItem =>
  item.mechanic === "cultural_card" &&
  Boolean(item.title.trim()) &&
  Boolean(item.bodyText.trim());

const isValidStoryBiteItem = (
  item: LearningLessonItem,
): item is StoryBiteItem => {
  if (item.mechanic !== "story_bite") {
    return false;
  }

  const pageIds = item.pages.map((page) => page.id);
  const uniquePageIds = new Set(pageIds);

  return (
    Boolean(item.title.trim()) &&
    item.pages.length >= 1 &&
    item.pages.length <= 5 &&
    uniquePageIds.size === item.pages.length &&
    item.pages.every(
      (page) => Boolean(page.id.trim()) && Boolean(page.bodyText.trim()),
    )
  );
};

const isValidTapToLearnItem = (item: LearningLessonItem): item is TapToLearnItem =>
  item.mechanic === "tap_to_learn" &&
  Boolean(item.localText.trim()) &&
  Boolean(item.englishText.trim());

const isValidLessonItem = (item: LearningLessonItem): boolean => {
  if (item.mechanic === "tap_to_learn") {
    return isValidTapToLearnItem(item);
  }

  if (item.mechanic === "listen_and_choose") {
    return isValidListenAndChooseItem(item);
  }

  if (item.mechanic === "choose_correct_word") {
    return isValidChooseCorrectWordItem(item);
  }

  if (item.mechanic === "match_word_picture") {
    return isValidMatchWordPictureItem(item);
  }

  if (item.mechanic === "mini_quiz") {
    return isValidMiniQuizItem(item);
  }

  if (item.mechanic === "cultural_card") {
    return isValidCulturalCardItem(item);
  }

  if (item.mechanic === "story_bite") {
    return isValidStoryBiteItem(item);
  }

  return true;
};

const shouldKeepNormalizedLessonItem = (item: LearningLessonItem): boolean =>
  !IMPLEMENTED_MECHANICS.has(item.mechanic) || isValidLessonItem(item);

const hasValidLessonItems = (lesson: LearningHubLesson): boolean =>
  lesson.items.some(
    (item) => item.mechanic === lesson.mechanic && isValidLessonItem(item),
  );

const normalizeLesson = (
  lesson: RawLearningHubLesson,
  fallbackId: string,
  fallbackOrder: number,
): LearningHubLesson => {
  const mechanic = normalizeMechanic(lesson.mechanic);
  const isLocked = asBoolean(lesson.isLocked, asBoolean(lesson.locked));
  const rawItems = Array.isArray(lesson.items) ? lesson.items : [];
  const normalizedItems = rawItems.map((item, index) =>
    normalizeLessonItem(
      item,
      `${asString(lesson.id, fallbackId)}-item-${index + 1}`,
      mechanic,
      index + 1,
    ),
  );
  const items = sortByOrder(
    normalizedItems.filter(shouldKeepNormalizedLessonItem),
  );
  const isStartable =
    typeof lesson.isStartable === "boolean" ? lesson.isStartable : undefined;
  const normalizedLesson: LearningHubLesson = {
    id: asString(lesson.id, fallbackId),
    title: asString(lesson.title, "Learning lesson"),
    description: asString(
      lesson.description,
      asString(lesson.goal, "Practice a small set of words."),
    ),
    mechanic,
    order: asPositiveNumber(lesson.order, fallbackOrder),
    locked: isLocked,
    isLocked,
    isStartable,
    readiness: asContentReadiness(
      lesson.readiness,
      isStartable === true ? "draft" : "placeholder",
    ),
    status: "coming_soon",
    metadata: asMetadata(lesson.metadata),
    items,
  };

  return {
    ...normalizedLesson,
    status: getLessonStatus(normalizedLesson),
  };
};

const normalizeStage = (
  stage: RawLearningHubStage,
  fallbackIndex: number,
): LearningHubStage => {
  const stageId = asString(stage.id, `stage-${fallbackIndex + 1}`);
  const rawLessons = Array.isArray(stage.lessons) ? stage.lessons : [];
  const lessons = sortByOrder(
    rawLessons.map((lesson, index) =>
      normalizeLesson(lesson, `${stageId}-lesson-${index + 1}`, index + 1),
    ),
  );
  const declaredMechanics = Array.isArray(stage.mechanics)
    ? stage.mechanics.filter(isMechanicType)
    : [];
  const lessonMechanics = lessons.map((lesson) => lesson.mechanic);
  const mechanics = uniqueMechanics([...declaredMechanics, ...lessonMechanics]);
  const isLocked = asBoolean(stage.isLocked, asBoolean(stage.locked));
  const order = asPositiveNumber(stage.order, asPositiveNumber(stage.stageNumber, fallbackIndex + 1));
  const normalizedStage: LearningHubStage = {
    id: stageId,
    order,
    stageNumber: asPositiveNumber(stage.stageNumber, order),
    title: asString(stage.title, "Learning stage"),
    description: asString(stage.description, "Learning activities are coming soon."),
    imageKey: asString(stage.imageKey, "learning-beginner.jpg"),
    imageAsset: asOptionalString(stage.imageAsset),
    status: asStageStatus(stage.status, isLocked),
    estimatedMinutes: asPositiveNumber(stage.estimatedMinutes, 1),
    lessonCount: lessons.length,
    isPractice: asBoolean(stage.isPractice),
    locked: isLocked,
    isLocked,
    readiness: asContentReadiness(
      stage.readiness,
      isLocked || stage.status === "planned" ? "placeholder" : "draft",
    ),
    mechanics,
    learningGoals: Array.isArray(stage.learningGoals)
      ? stage.learningGoals.map((goal) => asString(goal)).filter(Boolean)
      : [],
    placeholderMessage: asString(
      stage.placeholderMessage,
      "This Learning stage is being prepared.",
    ),
    metadata: asMetadata(stage.metadata),
    lessons,
  };

  return {
    ...normalizedStage,
    lessons: lessons.map((lesson) => ({
      ...lesson,
      status: getLessonStatus(lesson, normalizedStage),
    })),
  };
};

export const isLessonLocked = (
  lesson?: LearningHubLesson,
  stage?: LearningHubStage,
): boolean => Boolean(stage?.isLocked || stage?.locked || lesson?.isLocked || lesson?.locked);

export const getLessonStatus = (
  lesson?: LearningHubLesson,
  stage?: LearningHubStage,
): LessonStatus => {
  if (!lesson) {
    return "empty";
  }

  if (isLessonLocked(lesson, stage)) {
    return "locked";
  }

  if (!isMechanicType(lesson.mechanic)) {
    return "unsupported";
  }

  if (!isMechanicImplemented(lesson.mechanic) || lesson.isStartable === false) {
    return "coming_soon";
  }

  if (lesson.items.length === 0) {
    return "empty";
  }

  if (!hasValidLessonItems(lesson)) {
    return "empty";
  }

  return "startable";
};

export function isLessonStartable(
  stage: LearningHubStage | undefined,
  lesson: LearningHubLesson | undefined,
): boolean;
export function isLessonStartable(lesson: LearningHubLesson | undefined): boolean;
export function isLessonStartable(
  stageOrLesson: LearningHubStage | LearningHubLesson | undefined,
  maybeLesson?: LearningHubLesson,
): boolean {
  const stage = maybeLesson ? (stageOrLesson as LearningHubStage | undefined) : undefined;
  const lesson = maybeLesson ?? (stageOrLesson as LearningHubLesson | undefined);

  return getLessonStatus(lesson, stage) === "startable";
}

const normalizeLanguageContent = (
  content: LearningHubLanguageContent | undefined,
  fallbackLanguageCode: string,
): LearningLanguageContent => {
  const languageCode = asString(content?.languageCode, fallbackLanguageCode);
  const language = getLearningLanguage(languageCode);
  const rawStages = Array.isArray(content?.stages) ? content.stages : [];
  const stages = rawStages
    .map((stage, index) => normalizeStage(stage, index))
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));

  return {
    languageCode,
    displayName: asString(content?.displayName, language?.name ?? languageCode),
    localName: asOptionalString(content?.localName) ?? language?.nativeName,
    pathTitle: asString(content?.pathTitle, `${language?.name ?? "Learning"} Path`),
    stages,
  };
};

export const getLearningContentBundle = (): LearningContentBundle => {
  const languages = Object.fromEntries(
    Object.entries(getRawLanguages()).map(([languageCode, content]) => [
      languageCode,
      normalizeLanguageContent(content, languageCode),
    ]),
  ) as Record<LearningLanguageCode, LearningLanguageContent>;

  return {
    version: asString(learningHubContent.version, "1"),
    defaultLanguage: getDefaultLearningLanguageCode(),
    languages,
  };
};

export const getAvailableLearningLanguages = (): Array<{
  languageCode: LearningLanguageCode;
  displayName: string;
  localName?: string;
}> =>
  Object.values(getLearningContentBundle().languages).map((content) => ({
    languageCode: content.languageCode,
    displayName: content.displayName,
    localName: content.localName,
  }));

export const getLearningLanguageContent = (
  languageCode?: string | null,
): LearningLanguageContent | null => {
  const bundle = getLearningContentBundle();
  const resolvedLanguageCode = resolveLearningHubLanguageCode(languageCode);

  return bundle.languages[resolvedLanguageCode] ?? null;
};

// TODO: Replace or augment this local JSON source with Supabase content_items
// once reviewed lesson payloads and renderer contracts are production-ready.
export const getLearningHubStages = (
  languageCode?: string | null,
): LearningHubStage[] => getLearningLanguageContent(languageCode)?.stages ?? [];

export const getLearningStageById = (
  languageCode: string | null | undefined,
  stageId: string,
): LearningHubStage | undefined =>
  getLearningHubStages(languageCode).find((stage) => stage.id === stageId);

export const getLessonsForStage = (
  languageCode: string | null | undefined,
  stageId: string,
): LearningHubLesson[] => getLearningStageById(languageCode, stageId)?.lessons ?? [];

export const getLessonById = (
  languageCode: string | null | undefined,
  stageId: string,
  lessonId: string,
): LearningHubLesson | undefined =>
  getLessonsForStage(languageCode, stageId).find((lesson) => lesson.id === lessonId);

export const getFirstLessonByMechanic = (
  languageCode: string | null | undefined,
  stageId: string,
  mechanic: MechanicType,
): LearningHubLesson | undefined =>
  getLessonsForStage(languageCode, stageId).find(
    (lesson) => lesson.mechanic === mechanic,
  );

export const getFirstStartableLessonForStage = (
  languageCode: string | null | undefined,
  stageId: string,
): LearningHubLesson | undefined =>
  getStartableLessonsForStage(languageCode, stageId)[0];

export const getStartableLessonsForStage = (
  languageCode: string | null | undefined,
  stageId: string,
): LearningHubLesson[] => {
  const stage = getLearningStageById(languageCode, stageId);

  if (!stage) {
    return [];
  }

  return stage.lessons.filter((lesson) => isLessonStartable(stage, lesson));
};

export const getLessonItemsForStage = (
  languageCode: string | null | undefined,
  stageId: string,
): LearningLessonItem[] =>
  getFirstStartableLessonForStage(languageCode, stageId)?.items ?? [];

export const getLessonItemsForLesson = (
  languageCode: string | null | undefined,
  stageId: string,
  lessonId: string,
): LearningLessonItem[] => getLessonById(languageCode, stageId, lessonId)?.items ?? [];

export const getLessonItemCount = (
  languageCode: string | null | undefined,
  stageId: string,
  lessonId: string,
): number => getLessonItemsForLesson(languageCode, stageId, lessonId).length;

export const stageHasMechanicContent = (
  languageCode: string | null | undefined,
  stageId: string,
  mechanic: MechanicType,
): boolean => {
  const stage = getLearningStageById(languageCode, stageId);
  const lesson = getFirstLessonByMechanic(languageCode, stageId, mechanic);

  if (!stage || !lesson) {
    return false;
  }

  return isLessonStartable(stage, lesson);
};

export const isMechanicImplemented = (mechanic: MechanicType | string): boolean =>
  isMechanicType(mechanic) && IMPLEMENTED_MECHANICS.has(mechanic);

export const getMechanicLabel = (mechanic: MechanicType | string): string =>
  MECHANIC_LABELS[mechanic as MechanicType] ?? toFallbackLabel(mechanic);

export const getLearningHubPathTitle = (
  languageCode?: string | null,
): string | undefined => getLearningLanguageContent(languageCode)?.pathTitle;
