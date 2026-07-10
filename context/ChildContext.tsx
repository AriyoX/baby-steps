import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import {
  DEFAULT_LEARNING_LANGUAGE_CODE,
  getDbLanguageCodeForLearningLanguage,
} from '@/content/languages';
import { hydrateProgressFromRemote, syncProgressNow } from '@/lib/progressRepository';

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
}

export const ChildContext = createContext<ChildContextType | undefined>(undefined);

const PROGRESS_ACTIVITY_TYPES = ['language', 'learning', 'counting', 'words', 'stories', 'coloring'];

export const ChildProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeChild, setActiveChildState] = useState<ChildProfile | null>(null);
  const activeChildRef = useRef<ChildProfile | null>(null);

  const setActiveChild = useCallback((child: ChildProfile | null) => {
    const previousChild = activeChildRef.current;
    activeChildRef.current = child;
    setActiveChildState(child);

    void (async () => {
      if (previousChild?.id) {
        await syncProgressNow(previousChild.id);
      }

      if (child?.id) {
        const languageCode = getDbLanguageCodeForLearningLanguage(
          child.selected_language_code || DEFAULT_LEARNING_LANGUAGE_CODE,
        );
        await syncProgressNow(child.id);
        await hydrateProgressFromRemote(child.id, languageCode, {
          activityTypes: PROGRESS_ACTIVITY_TYPES,
        });
        const {
          hydrateLearningProgressFromSharedProgress,
        }: typeof import('@/lib/learningProgressRepository') = require(
          '@/lib/learningProgressRepository',
        );
        await hydrateLearningProgressFromSharedProgress(child.id, languageCode);
      }
    })();
  }, []);

  return (
    <ChildContext.Provider value={{ activeChild, setActiveChild }}>
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
