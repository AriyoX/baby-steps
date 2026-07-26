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
import {
  cancelScheduledStreakSync,
  clearStreakMemory,
  syncDirtyStreakState,
} from '@/lib/streakRepository';
import {
  clearSecureActiveChildSession,
  loadSecureActiveChildSession,
  saveSecureActiveChildSession,
} from '@/lib/activeChildSession';
import { fetchActiveChildProfile } from '@/lib/accountManagement';

export interface ActiveChildProfile {
  id: string;
  name: string;
  gender: string;
  age: string;
  reason?: string;
  selected_language_code?: string;
  avatar?: string;
}

interface ChildContextType {
  activeChild: ActiveChildProfile | null;
  setActiveChild: (child: ActiveChildProfile | null) => void;
  activateChildMode: (child: ActiveChildProfile) => Promise<void>;
  completeChildModeEntry: () => void;
  deactivateChildMode: () => Promise<void>;
  updateActiveChildProfile: (child: ActiveChildProfile) => Promise<void>;
  clearActiveChildForSignOut: () => Promise<void>;
  isEnteringChildMode: boolean;
  isRestoringActiveChild: boolean;
  requiresParentUnlock: boolean;
}

export const ChildContext = createContext<ChildContextType | undefined>(undefined);

const PROGRESS_ACTIVITY_TYPES = ['language', 'learning', 'counting', 'words', 'stories', 'coloring'];
export const SIGN_OUT_PROGRESS_SYNC_TIMEOUT_MS = 750;
export const CHILD_MODE_ENTRY_TIMEOUT_MS = 5_000;

export const ChildProvider: React.FC<{
  accountId?: string | null;
  children: React.ReactNode;
}> = ({ accountId = null, children }) => {
  const [activeChild, setActiveChildState] = useState<ActiveChildProfile | null>(null);
  const [restoredAccountId, setRestoredAccountId] = useState<string | null>(null);
  const [isEnteringChildMode, setIsEnteringChildMode] = useState(false);
  const [requiresParentUnlock, setRequiresParentUnlock] = useState(false);
  const activeChildRef = useRef<ActiveChildProfile | null>(null);
  const accountIdRef = useRef<string | null>(accountId);
  const childWorkGenerationRef = useRef(0);
  const childWorkAbortControllerRef = useRef<AbortController | null>(null);
  const childModeEntryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  accountIdRef.current = accountId;
  const isRestoringActiveChild =
    Boolean(accountId) && restoredAccountId !== accountId;

  const completeChildModeEntry = useCallback(() => {
    if (childModeEntryTimeoutRef.current) {
      clearTimeout(childModeEntryTimeoutRef.current);
      childModeEntryTimeoutRef.current = null;
    }
    setIsEnteringChildMode(false);
  }, []);

  const setActiveChild = useCallback((child: ActiveChildProfile | null) => {
    const previousChild = activeChildRef.current;
    const workGeneration = childWorkGenerationRef.current + 1;
    childWorkAbortControllerRef.current?.abort();
    const workController = new AbortController();
    childWorkAbortControllerRef.current = workController;
    childWorkGenerationRef.current = workGeneration;
    activeChildRef.current = child;
    setActiveChildState(child);
    setRequiresParentUnlock(false);
    if (!child) completeChildModeEntry();

    const currentAccountId = accountIdRef.current;
    if (currentAccountId) {
      const secureWrite = child
        ? saveSecureActiveChildSession(currentAccountId, child)
        : clearSecureActiveChildSession(currentAccountId);
      void secureWrite.catch(() => {
        console.warn("Could not update the secure child-session boundary.");
      });
    }

    void (async () => {
      try {
        if (previousChild?.id) {
          await Promise.all([
            syncProgressNow(previousChild.id, {
              signal: workController.signal,
            }),
            syncDirtyStreakState(),
          ]);
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
  }, [completeChildModeEntry]);

  const activateChildMode = useCallback(
    async (child: ActiveChildProfile): Promise<void> => {
      const currentAccountId = accountIdRef.current;
      if (!currentAccountId) {
        throw new Error("A signed-in parent is required to start child mode.");
      }

      // Persist before navigation so an immediate process restart cannot expose
      // parent routes without restoring the child-mode boundary.
      await saveSecureActiveChildSession(currentAccountId, child);
      // The caller is still on a parent route until its awaited launch resumes.
      // Mark that brief transition so parent-route guards do not mistake it for
      // an attempt to leave child mode.
      setIsEnteringChildMode(true);
      if (childModeEntryTimeoutRef.current) {
        clearTimeout(childModeEntryTimeoutRef.current);
      }
      childModeEntryTimeoutRef.current = setTimeout(() => {
        childModeEntryTimeoutRef.current = null;
        // Fail closed if the caller never reaches a child route.
        setIsEnteringChildMode(false);
      }, CHILD_MODE_ENTRY_TIMEOUT_MS);
      setActiveChild(child);
    },
    [setActiveChild],
  );

  const deactivateChildMode = useCallback(async (): Promise<void> => {
    const currentAccountId = accountIdRef.current;
    if (currentAccountId) {
      try {
        // Clear the persisted boundary before parent navigation. If SecureStore
        // is temporarily unavailable, the stale marker can only lock the same
        // account again on restart; it cannot expose parent routes.
        await clearSecureActiveChildSession(currentAccountId);
      } catch {
        console.warn("Could not clear the secure child-session boundary.");
      }
    }
    setActiveChild(null);
  }, [setActiveChild]);

  const updateActiveChildProfile = useCallback(
    async (child: ActiveChildProfile): Promise<void> => {
      if (activeChildRef.current?.id !== child.id) return;
      const currentAccountId = accountIdRef.current;
      if (!currentAccountId) return;

      // Keep SecureStore and in-memory child identity coherent before the edit
      // screen reports success.
      try {
        await saveSecureActiveChildSession(currentAccountId, child);
      } catch {
        // The in-memory update remains safe: a later process restore validates
        // the account-scoped snapshot against the server before using it.
        console.warn("Could not refresh the secure active-child snapshot.");
      }
      setActiveChild(child);
    },
    [setActiveChild],
  );

  React.useEffect(() => {
    let cancelled = false;
    const restoringAccountId = accountId;

    childWorkGenerationRef.current += 1;
    childWorkAbortControllerRef.current?.abort();
    childWorkAbortControllerRef.current = null;
    activeChildRef.current = null;
    setActiveChildState(null);
    completeChildModeEntry();
    setRequiresParentUnlock(false);

    if (!restoringAccountId) {
      setRestoredAccountId(null);
      return () => {
        cancelled = true;
      };
    }

    void loadSecureActiveChildSession(restoringAccountId)
      .then(async (storedChild) => {
        if (cancelled || accountIdRef.current !== restoringAccountId) return;
        if (storedChild) {
          try {
            const currentChild = await fetchActiveChildProfile(
              storedChild.id,
              restoringAccountId,
            );
            if (cancelled || accountIdRef.current !== restoringAccountId) return;

            if (currentChild) {
              setActiveChild({
                id: currentChild.id,
                name: currentChild.name,
                gender: currentChild.gender,
                age: currentChild.age,
                reason: currentChild.reason,
                selected_language_code: currentChild.selected_language_code,
              });
            } else {
              try {
                await clearSecureActiveChildSession(restoringAccountId);
              } catch {
                console.warn("Could not remove a stale secure child session.");
              }
              if (cancelled || accountIdRef.current !== restoringAccountId) return;
              // A marker existed, so keep the adult boundary closed until the
              // parent verifies even though the child is missing or archived.
              setRequiresParentUnlock(true);
            }
          } catch {
            if (cancelled || accountIdRef.current !== restoringAccountId) return;
            // Offline validation must fail closed: the stored child snapshot
            // remains active and can be revalidated on a later app start.
            setActiveChild(storedChild);
            console.warn("Could not validate the restored child session.");
          }
        }
        setRestoredAccountId(restoringAccountId);
      })
      .catch(() => {
        if (cancelled || accountIdRef.current !== restoringAccountId) return;
        setRequiresParentUnlock(true);
        setRestoredAccountId(restoringAccountId);
        console.warn("Could not restore the secure child-session boundary.");
      });

    return () => {
      cancelled = true;
    };
  }, [accountId, completeChildModeEntry, setActiveChild]);

  const clearActiveChildForSignOut = useCallback(async (): Promise<void> => {
    const previousChild = activeChildRef.current;
    const currentAccountId = accountIdRef.current;
    childWorkGenerationRef.current += 1;
    childWorkAbortControllerRef.current?.abort();
    childWorkAbortControllerRef.current = null;
    activeChildRef.current = null;
    setActiveChildState(null);
    completeChildModeEntry();
    setRequiresParentUnlock(false);
    cancelScheduledProgressSync();
    cancelScheduledStreakSync();
    clearStreakMemory();

    if (currentAccountId) {
      try {
        await clearSecureActiveChildSession(currentAccountId);
      } catch {
        console.warn("Could not clear the secure child-session boundary.");
      }
    }

    if (!previousChild?.id) return;

    const syncController = new AbortController();
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const synchronization = Promise.all([
      syncProgressNow(previousChild.id, {
        signal: syncController.signal,
      }),
      syncDirtyStreakState(),
    ]).then(
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
  }, [completeChildModeEntry]);

  React.useEffect(
    () => () => {
      if (childModeEntryTimeoutRef.current) {
        clearTimeout(childModeEntryTimeoutRef.current);
      }
    },
    [],
  );

  return (
    <ChildContext.Provider
      value={{
        activeChild,
        activateChildMode,
        clearActiveChildForSignOut,
        completeChildModeEntry,
        deactivateChildMode,
        isEnteringChildMode,
        isRestoringActiveChild,
        requiresParentUnlock,
        setActiveChild,
        updateActiveChildProfile,
      }}
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
