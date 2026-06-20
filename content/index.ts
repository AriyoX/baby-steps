import {
  DEFAULT_LEARNING_LANGUAGE_CODE,
  isSupportedLearningLanguageCode,
  normalizeLearningLanguageCode,
} from "./languages";
import { lugandaContent } from "./luganda";
import { runyankoleContent } from "./runyankole";
import type { LocalLanguageContent, SupportedLearningLanguageCode } from "./types";

export * from "./languages";
export * from "./types";

export const LOCAL_CONTENT_BY_LANGUAGE: Record<
  SupportedLearningLanguageCode,
  LocalLanguageContent
> = {
  lg: lugandaContent,
  nyn: runyankoleContent,
};

interface GetContentOptions {
  allowDefaultFallback?: boolean;
}

export const getContentForLanguage = (
  languageCode?: string | null,
  options: GetContentOptions = {},
): LocalLanguageContent | undefined => {
  const allowDefaultFallback = options.allowDefaultFallback ?? true;
  const normalizedLanguageCode = normalizeLearningLanguageCode(languageCode);

  if (isSupportedLearningLanguageCode(normalizedLanguageCode)) {
    return LOCAL_CONTENT_BY_LANGUAGE[normalizedLanguageCode];
  }

  if (!allowDefaultFallback) {
    return undefined;
  }

  return LOCAL_CONTENT_BY_LANGUAGE[DEFAULT_LEARNING_LANGUAGE_CODE];
};

export const getStoriesForLanguage = (languageCode?: string | null) => {
  return getContentForLanguage(languageCode, {
    allowDefaultFallback: false,
  })?.stories ?? [];
};

export const getLessonsForLanguage = (languageCode?: string | null) => {
  return (
    getContentForLanguage(languageCode, {
      allowDefaultFallback: false,
    })?.lessons ?? { stages: [] }
  );
};

export const getGamesForLanguage = (languageCode?: string | null) => {
  return getContentForLanguage(languageCode, {
    allowDefaultFallback: false,
  })?.games;
};

export const hasLocalContentForLanguage = (
  languageCode?: string | null,
): boolean => {
  const normalizedLanguageCode = normalizeLearningLanguageCode(languageCode);
  return isSupportedLearningLanguageCode(normalizedLanguageCode);
};
