import {
  loadContentBundle,
  type ContentSource,
  type LoadContentBundleOptions,
} from "./contentRepository";
import {
  getLearningContentVersion,
  getLearningLanguageContent,
  registerLearningHubLanguageContent,
  resolveLearningHubLanguageCode,
} from "./learningHubRepository";
import type {
  LearningLanguageCode,
  LearningLanguageContent,
} from "./learningHubTypes";

export type LearningHubLoadStatus = "ready" | "unavailable";

export interface LearningHubLoadResult {
  status: LearningHubLoadStatus;
  languageCode: LearningLanguageCode;
  content?: LearningLanguageContent;
  contentVersion?: string;
  source: ContentSource;
  cacheSource?: "memory" | "storage" | "network";
  retainedPrevious: boolean;
  missingReason?: string;
}

const retainedResult = (
  languageCode: LearningLanguageCode,
  source: ContentSource,
  missingReason?: string,
): LearningHubLoadResult => {
  const content = getLearningLanguageContent(languageCode);
  const contentVersion = getLearningContentVersion(languageCode);

  if (content && contentVersion) {
    return {
      status: "ready",
      languageCode,
      content,
      contentVersion,
      source,
      retainedPrevious: true,
      missingReason,
    };
  }

  return {
    status: "unavailable",
    languageCode,
    source,
    retainedPrevious: false,
    missingReason,
  };
};

/**
 * Loads and validates the Learning Hub portion of the shared exact-language
 * content bundle. Invalid or failed refreshes never replace a last-known-good
 * registry entry.
 */
export const loadLearningHubLanguageContent = async (
  languageCode?: string | null,
  options: LoadContentBundleOptions = {},
): Promise<LearningHubLoadResult> => {
  const resolvedLanguageCode = resolveLearningHubLanguageCode(languageCode);

  try {
    const result = await loadContentBundle(resolvedLanguageCode, options);
    const bundle = result.bundle;

    if (
      result.languageCode !== resolvedLanguageCode ||
      bundle?.languageCode !== resolvedLanguageCode ||
      !bundle.learningHub ||
      !bundle.contentVersion
    ) {
      return retainedResult(
        resolvedLanguageCode,
        result.source,
        result.missingReason ??
          "No valid published Learning Hub content is available for this language yet.",
      );
    }

    const content = registerLearningHubLanguageContent(
      resolvedLanguageCode,
      bundle.learningHub,
      bundle.contentVersion,
    );

    if (!content) {
      return retainedResult(
        resolvedLanguageCode,
        result.source,
        "Published Learning Hub content did not pass validation.",
      );
    }

    return {
      status: "ready",
      languageCode: resolvedLanguageCode,
      content,
      contentVersion: bundle.contentVersion,
      source: result.source,
      cacheSource: result.cache?.source,
      retainedPrevious: false,
    };
  } catch (error) {
    return retainedResult(
      resolvedLanguageCode,
      "empty",
      error instanceof Error
        ? error.message
        : "Learning Hub content could not be loaded.",
    );
  }
};

export const ensureLearningHubLanguageContent = async (
  languageCode?: string | null,
): Promise<LearningHubLoadResult> => {
  const resolvedLanguageCode = resolveLearningHubLanguageCode(languageCode);
  const content = getLearningLanguageContent(resolvedLanguageCode);
  const contentVersion = getLearningContentVersion(resolvedLanguageCode);

  if (content && contentVersion) {
    return {
      status: "ready",
      languageCode: resolvedLanguageCode,
      content,
      contentVersion,
      source: "database",
      retainedPrevious: true,
    };
  }

  return loadLearningHubLanguageContent(resolvedLanguageCode);
};
