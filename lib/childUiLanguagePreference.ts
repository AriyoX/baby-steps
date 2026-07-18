import AsyncStorage from "@react-native-async-storage/async-storage";

const CHILD_UI_LANGUAGE_STORAGE_PREFIX = "@BabySteps:ChildUiLanguage:v1:";

export const getChildUiLanguageStorageKey = (childId: string): string =>
  `${CHILD_UI_LANGUAGE_STORAGE_PREFIX}${childId}`;

export const loadChildUiLanguagePreference = async (
  childId: string,
): Promise<boolean> => {
  if (!childId) return false;

  try {
    const storedValue = await AsyncStorage.getItem(
      getChildUiLanguageStorageKey(childId),
    );
    return storedValue === "true";
  } catch (error) {
    console.warn("Could not load the child's UI language preference:", error);
    return false;
  }
};

/** Returns true only when a storage write was needed and succeeded. */
export const saveChildUiLanguagePreference = async (
  childId: string,
  enabled: boolean,
): Promise<boolean> => {
  if (!childId) return false;

  const key = getChildUiLanguageStorageKey(childId);
  const serializedValue = enabled ? "true" : "false";

  try {
    if ((await AsyncStorage.getItem(key)) === serializedValue) {
      return false;
    }

    await AsyncStorage.setItem(key, serializedValue);
    return true;
  } catch (error) {
    console.warn("Could not save the child's UI language preference:", error);
    return false;
  }
};
