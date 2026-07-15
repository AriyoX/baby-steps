import { useCallback, useEffect, useMemo, useState } from "react";
import {
  loadLearningHubLanguageContent,
  type LearningHubLoadStatus,
} from "@/content/learningHubLoader";
import {
  getLearningContentVersion,
  getLearningLanguageContent,
  resolveLearningHubLanguageCode,
} from "@/content/learningHubRepository";
import type {
  LearningLanguageCode,
  LearningLanguageContent,
} from "@/content/learningHubTypes";

export interface LearningHubContentState {
  languageCode: LearningLanguageCode;
  languageContent: LearningLanguageContent | null;
  contentVersion?: string;
  status: "loading" | LearningHubLoadStatus;
  retry: () => void;
}

type LearningHubContentSnapshot = Omit<LearningHubContentState, "retry">;

export const useLearningHubContent = (
  requestedLanguageCode?: string | null,
): LearningHubContentState => {
  const languageCode = useMemo(
    () => resolveLearningHubLanguageCode(requestedLanguageCode),
    [requestedLanguageCode],
  );
  const [retrySequence, setRetrySequence] = useState(0);
  const [state, setState] = useState<LearningHubContentSnapshot>(() => {
    const languageContent = getLearningLanguageContent(languageCode);
    return {
      languageCode,
      languageContent,
      contentVersion: getLearningContentVersion(languageCode),
      status: languageContent ? ("ready" as const) : ("loading" as const),
    };
  });

  useEffect(() => {
    let isActive = true;
    const cachedContent = getLearningLanguageContent(languageCode);
    const cachedVersion = getLearningContentVersion(languageCode);

    setState({
      languageCode,
      languageContent: cachedContent,
      contentVersion: cachedVersion,
      status: cachedContent ? "ready" : "loading",
    });

    void (async () => {
      const firstResult = await loadLearningHubLanguageContent(languageCode, {
        forceRefresh: retrySequence > 0 || Boolean(cachedContent),
      });

      if (!isActive) return;

      setState({
        languageCode,
        languageContent: firstResult.content ?? null,
        contentVersion: firstResult.contentVersion,
        status: firstResult.status,
      });

      // A cold load may return the shared repository's storage cache promptly.
      // Follow it with an explicit refresh so a newer published version reaches
      // this screen without waiting for another navigation.
      if (
        firstResult.status === "ready" &&
        !cachedContent &&
        firstResult.cacheSource !== undefined &&
        firstResult.cacheSource !== "network"
      ) {
        const refreshed = await loadLearningHubLanguageContent(languageCode, {
          forceRefresh: true,
        });
        if (!isActive) return;

        setState({
          languageCode,
          languageContent: refreshed.content ?? firstResult.content ?? null,
          contentVersion:
            refreshed.contentVersion ?? firstResult.contentVersion,
          status: refreshed.status,
        });
      }
    })();

    return () => {
      isActive = false;
    };
  }, [languageCode, retrySequence]);

  const retry = useCallback(() => {
    setRetrySequence((current) => current + 1);
  }, []);

  if (state.languageCode !== languageCode) {
    const languageContent = getLearningLanguageContent(languageCode);
    return {
      languageCode,
      languageContent,
      contentVersion: getLearningContentVersion(languageCode),
      status: languageContent ? "ready" : "loading",
      retry,
    };
  }

  return { ...state, retry };
};
