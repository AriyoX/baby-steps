import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useChild } from "@/context/ChildContext";
import {
  ChildUiLanguageContext,
  type ChildUiLanguageContextValue,
} from "@/context/ChildUiLanguageContext";
import {
  loadChildUiLanguagePreference,
  saveChildUiLanguagePreference,
} from "@/lib/childUiLanguagePreference";
import {
  translateChildUi,
  translateChildUiAchievement,
  type ChildUiAchievementSource,
  type ChildUiTranslationKey,
  type ChildUiTranslationParams,
} from "@/lib/childUiTranslations";

type LoadedPreference = {
  childId: string | null;
  enabled: boolean;
  isLoading: boolean;
};

export function ChildUiLanguageProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { activeChild } = useChild();
  const activeChildId = activeChild?.id ?? null;
  const languageCode = activeChild?.selected_language_code;
  const [preference, setPreference] = useState<LoadedPreference>({
    childId: null,
    enabled: false,
    isLoading: Boolean(activeChildId),
  });

  const enabled =
    Boolean(activeChildId) &&
    preference.childId === activeChildId &&
    preference.enabled;
  const isLoading =
    Boolean(activeChildId) &&
    (preference.childId !== activeChildId || preference.isLoading);

  useEffect(() => {
    let cancelled = false;

    if (!activeChildId) {
      setPreference({ childId: null, enabled: false, isLoading: false });
      return () => {
        cancelled = true;
      };
    }

    setPreference({
      childId: activeChildId,
      enabled: false,
      isLoading: true,
    });

    void loadChildUiLanguagePreference(activeChildId).then((storedEnabled) => {
      if (!cancelled) {
        setPreference({
          childId: activeChildId,
          enabled: storedEnabled,
          isLoading: false,
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [activeChildId]);

  const setEnabled = useCallback(
    async (nextEnabled: boolean) => {
      if (
        !activeChildId ||
        (preference.childId === activeChildId && enabled === nextEnabled)
      ) {
        return;
      }

      setPreference({
        childId: activeChildId,
        enabled: nextEnabled,
        isLoading: false,
      });
      await saveChildUiLanguagePreference(activeChildId, nextEnabled);
    },
    [activeChildId, enabled, preference.childId],
  );

  const t = useCallback(
    (key: ChildUiTranslationKey, params?: ChildUiTranslationParams) =>
      translateChildUi(key, languageCode, enabled, params),
    [enabled, languageCode],
  );

  const translateAchievement = useCallback(
    (achievement: ChildUiAchievementSource) =>
      translateChildUiAchievement(achievement, languageCode, enabled),
    [enabled, languageCode],
  );

  const value = useMemo<ChildUiLanguageContextValue>(
    () => ({
      enabled,
      isLoading,
      languageCode,
      setEnabled,
      t,
      translateAchievement,
    }),
    [enabled, isLoading, languageCode, setEnabled, t, translateAchievement],
  );

  return (
    <ChildUiLanguageContext.Provider value={value}>
      {children}
    </ChildUiLanguageContext.Provider>
  );
}
