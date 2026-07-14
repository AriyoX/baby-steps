import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import {
  DEFAULT_LEARNING_LANGUAGE_CODE,
  getDbLanguageCodeForLearningLanguage,
} from '@/content/languages';
import {
  cancelScheduledProgressSync,
  hydrateProgressFromRemote,
  syncProgressNow,
} from '@/lib/progressRepository';

interface ChildProfile {
  id: string;
  name: string;
  gender: string;
  age: string;
  selected_language_code?: string;
  avatar?: string;
}

interface ChildContextType {
  activeChild: ChildProfile | null;
  setActiveChild: (child: ChildProfile | null) => void;
  clearActiveChildForSignOut: () => Promise<void>;
}

export const ChildContext = createContext<ChildContextType | undefined>(undefined);

const PROGRESS_ACTIVITY_TYPES = ['language', 'learning', 'counting', 'words', 'stories', 'coloring'];
export const SIGN_OUT_PROGRESS_SYNC_TIMEOUT_MS = 750;

export const ChildProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeChild, setActiveChildState] = useState<ChildProfile | null>(null);
  const activeChildRef = useRef<ChildProfile | null>(null);
  const childWorkGenerationRef = useRef(0);
  const childWorkAbortControllerRef = useRef<AbortController | null>(null);

  const setActiveChild = useCallback((child: ChildProfile | null) => {
    const previousChild = activeChildRef.current;
    const workGeneration = childWorkGenerationRef.current + 1;
    childWorkAbortControllerRef.current?.abort();
    const workController = new AbortController();
    childWorkAbortControllerRef.current = workController;
    childWorkGenerationRef.current = workGeneration;
    activeChildRef.current = child;
    setActiveChildState(child);

    void (async () => {
      try {
        if (previousChild?.id) {
          await syncProgressNow(previousChild.id, {
            signal: workController.signal,
          });
        }

        if (
          workController.signal.aborted ||
          childWorkGenerationRef.current !== workGeneration
        ) return;

        if (child?.id) {
          const languageCode = getDbLanguageCodeForLearningLanguage(
            child.selected_language_code || DEFAULT_LEARNING_LANGUAGE_CODE,
          );
          await syncProgressNow(child.id, {
            signal: workController.signal,
          });
          if (
            workController.signal.aborted ||
            childWorkGenerationRef.current !== workGeneration
          ) return;

          await hydrateProgressFromRemote(child.id, languageCode, {
            activityTypes: PROGRESS_ACTIVITY_TYPES,
            signal: workController.signal,
          });
          if (
            workController.signal.aborted ||
            childWorkGenerationRef.current !== workGeneration
          ) return;

          const {
            hydrateLearningProgressFromSharedProgress,
          }: typeof import('@/lib/learningProgressRepository') = require(
            '@/lib/learningProgressRepository',
          );
          await hydrateLearningProgressFromSharedProgress(child.id, languageCode);
        }
      } catch (error) {
        console.warn('Could not finish child progress synchronization:', error);
      }
    })().catch((error) => {
      console.warn('Could not finish detached child progress synchronization:', error);
    });
  }, []);

  const clearActiveChildForSignOut = useCallback(async (): Promise<void> => {
    const previousChild = activeChildRef.current;
    childWorkGenerationRef.current += 1;
    childWorkAbortControllerRef.current?.abort();
    childWorkAbortControllerRef.current = null;
    activeChildRef.current = null;
    setActiveChildState(null);
    cancelScheduledProgressSync();

    if (!previousChild?.id) return;

    const syncController = new AbortController();
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const synchronization = syncProgressNow(previousChild.id, {
      signal: syncController.signal,
    }).then(
      () => undefined,
      () => undefined,
    );

    await Promise.race([
      synchronization,
      new Promise<void>((resolve) => {
        timeout = setTimeout(() => {
          syncController.abort();
          resolve();
        }, SIGN_OUT_PROGRESS_SYNC_TIMEOUT_MS);
      }),
    ]);

    if (timeout) clearTimeout(timeout);
  }, []);

  return (
    <ChildContext.Provider
      value={{ activeChild, setActiveChild, clearActiveChildForSignOut }}
    >
      {children}
    </ChildContext.Provider>
  );
};

export const useChild = () => {
  const context = useContext(ChildContext);
  if (context === undefined) {
    throw new Error('useChild must be used within a ChildProvider');
  }
  return context;
};
