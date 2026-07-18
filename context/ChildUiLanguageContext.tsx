import { createContext, useContext } from "react";
import {
  translateChildUi,
  translateChildUiAchievement,
  type ChildUiAchievementSource,
  type ChildUiAchievementText,
  type ChildUiTranslationKey,
  type ChildUiTranslationParams,
} from "@/lib/childUiTranslations";

export interface ChildUiLanguageContextValue {
  enabled: boolean;
  isLoading: boolean;
  languageCode?: string;
  setEnabled: (enabled: boolean) => Promise<void>;
  t: (
    key: ChildUiTranslationKey,
    params?: ChildUiTranslationParams,
  ) => string;
  translateAchievement: (
    achievement: ChildUiAchievementSource,
  ) => ChildUiAchievementText;
}

const DEFAULT_CHILD_UI_LANGUAGE_CONTEXT: ChildUiLanguageContextValue = {
  enabled: false,
  isLoading: false,
  languageCode: undefined,
  setEnabled: async () => undefined,
  t: (key, params) => translateChildUi(key, undefined, false, params),
  translateAchievement: (achievement) =>
    translateChildUiAchievement(achievement, undefined, false),
};

export const ChildUiLanguageContext =
  createContext<ChildUiLanguageContextValue>(
    DEFAULT_CHILD_UI_LANGUAGE_CONTEXT,
  );

export const useChildUiLanguage = (): ChildUiLanguageContextValue =>
  useContext(ChildUiLanguageContext);
