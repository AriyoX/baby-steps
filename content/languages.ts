import type { LearningLanguage, SupportedLearningLanguageCode } from "./types";

export const DEFAULT_LEARNING_LANGUAGE_CODE: SupportedLearningLanguageCode = "lg";

const LEARNING_LANGUAGE_CODE_ALIASES: Record<string, SupportedLearningLanguageCode> = {
  luganda: "lg",
  oluganda: "lg",
  runyankole: "nyn",
  runyankore: "nyn",
};

export const LEARNING_LANGUAGES: readonly LearningLanguage[] = [
  {
    code: "lg",
    name: "Luganda",
    nativeName: "Oluganda",
    isActive: true,
    isDefault: true,
    notes: "Existing prototype learning content.",
  },
  {
    code: "nyn",
    name: "Runyankole",
    nativeName: "Runyankole",
    isActive: true,
    notes: "Placeholder sample content for language-switching tests only.",
  },
];

export const SUPPORTED_LEARNING_LANGUAGE_CODES = LEARNING_LANGUAGES.map(
  (language) => language.code,
);

export const isSupportedLearningLanguageCode = (
  languageCode?: string | null,
): languageCode is SupportedLearningLanguageCode => {
  return SUPPORTED_LEARNING_LANGUAGE_CODES.includes(
    languageCode as SupportedLearningLanguageCode,
  );
};

export const normalizeLearningLanguageCode = (
  languageCode?: string | null,
): string | undefined => {
  const normalized = languageCode?.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }

  return LEARNING_LANGUAGE_CODE_ALIASES[normalized] ?? normalized;
};

export const getDbLanguageCodeForLearningLanguage = (
  languageCode?: string | null,
): string =>
  normalizeLearningLanguageCode(languageCode) ??
  DEFAULT_LEARNING_LANGUAGE_CODE;

export const getLearningLanguageFromDbCode = (
  dbCode?: string | null,
): string => getDbLanguageCodeForLearningLanguage(dbCode);

export const getLearningLanguage = (
  languageCode?: string | null,
): LearningLanguage | undefined => {
  const normalized = normalizeLearningLanguageCode(languageCode);
  return LEARNING_LANGUAGES.find((language) => language.code === normalized);
};
