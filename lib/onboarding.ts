import AsyncStorage from "@react-native-async-storage/async-storage";

export const ONBOARDING_COMPLETED_STORAGE_KEY = "@onboarding_completed";

export const PRE_LOGIN_ONBOARDING_STORAGE_KEYS = [
  ONBOARDING_COMPLETED_STORAGE_KEY,
] as const;

export const hasCompletedOnboarding = async (): Promise<boolean> => {
  try {
    const value = await AsyncStorage.getItem(ONBOARDING_COMPLETED_STORAGE_KEY);
    return value === "true";
  } catch (error) {
    console.error("Failed to get onboarding status", error);
    return false;
  }
};

export const setOnboardingCompleted = async (): Promise<void> => {
  await AsyncStorage.setItem(ONBOARDING_COMPLETED_STORAGE_KEY, "true");
};

export const resetOnboardingForDev = async (): Promise<string[]> => {
  if (!__DEV__) {
    throw new Error("resetOnboardingForDev is only available in development.");
  }

  const keys = [...PRE_LOGIN_ONBOARDING_STORAGE_KEYS];
  await AsyncStorage.multiRemove(keys);
  console.log(`Reset pre-login onboarding keys: ${keys.join(", ")}`);
  return keys;
};
