import { useCallback, useEffect, useMemo, useState } from "react";
import {
  loadLearningHubLanguageContent,
  type LearningHubLoadStatus,
} from "@/content/learningHubLoader";
import {
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
  const [state, setState] = useState<LearningHubContentSnapshot>({
    languageCode,
    languageContent: null,
    status: "loading",
  });

  useEffect(() => {
    let isActive = true;

    setState({
      languageCode,
      languageContent: null,
      status: "loading",
    });

    void (async () => {
      // A forced repository load is network-first and falls back to the
      // last-known-good cache only when the database cannot provide content.
      // Do not render a registered cache entry before that decision, otherwise
      // a direct/deep link can briefly expose a replaced curriculum.
      const result = await loadLearningHubLanguageContent(languageCode, {
        forceRefresh: true,
      });

      if (!isActive) return;

      setState({
        languageCode,
        languageContent: result.content ?? null,
        contentVersion: result.contentVersion,
        status: result.status,
      });
    })();

    return () => {
      isActive = false;
    };
  }, [languageCode, retrySequence]);

  const retry = useCallback(() => {
    setRetrySequence((current) => current + 1);
  }, []);

  if (state.languageCode !== languageCode) {
    return {
      languageCode,
      languageContent: null,
      status: "loading",
      retry,
    };
  }

  return { ...state, retry };
};
