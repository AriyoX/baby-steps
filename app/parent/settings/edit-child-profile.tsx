"use client";

import React from "react";
import {
  ActivityIndicator,
  Alert,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SettingsScaffold } from "@/components/settings/SettingsScaffold";
import { AppButton } from "@/components/common/AppButton";
import { Text } from "@/components/StyledText";
import { readableTextInputStyle } from "@/constants/formStyles";
import {
  LEARNING_LANGUAGES,
  getLearningLanguage,
} from "@/content/languages";
import { useChild } from "@/context/ChildContext";
import {
  fetchActiveChildProfile,
  type ChildProfile,
} from "@/lib/accountManagement";
import {
  CHILD_AGE_OPTIONS,
  CHILD_GENDER_OPTIONS,
  CHILD_LEARNING_REASON_OPTIONS,
  OLDER_CHILD_GUIDANCE,
  isSupportedChildAge,
} from "@/lib/childProfileOptions";
import {
  ChildProfileError,
  inspectLanguageContentAvailability,
  refreshChildLanguageCaches,
  updateOwnedActiveChildProfile,
  validateChildProfileEdit,
} from "@/lib/childProfileRepository";
import { requireInternet } from "@/lib/network";

export const getLanguageChangeConfirmationMessage = ({
  languageName,
  hasPublishedContent,
}: {
  languageName: string;
  hasPublishedContent: boolean;
}): string => {
  const availability = hasPublishedContent
    ? `${languageName} has published closed-beta activities.`
    : `${languageName} does not yet have published closed-beta activities. Baby Steps will show that honestly and will not substitute Luganda content.`;
  return `${availability}\n\nProgress is tracked separately by learning language. Existing progress and achievements in the previous language will stay saved and will not be copied or reset.`;
};

const confirmLanguageChange = (
  languageName: string,
  hasPublishedContent: boolean,
): Promise<boolean> =>
  new Promise((resolve) => {
    Alert.alert(
      `Change learning language to ${languageName}?`,
      getLanguageChangeConfirmationMessage({
        languageName,
        hasPublishedContent,
      }),
      [
        { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
        { text: "Change language", onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });

const getChildSaveError = (error: unknown): string => {
  if (error instanceof ChildProfileError) {
    if (error.kind === "not-found") {
      return "We could not open this child profile. Go back and try again.";
    }
    if (error.kind === "authorization") {
      return "This child profile cannot be changed from this account.";
    }
    if (error.kind === "session-changed") {
      return "The account changed. Reopen the child profile and try again.";
    }
    if (error.kind === "network") {
      return "Baby Steps could not be reached. Check your connection and try again.";
    }
    return error.message;
  }
  return "The child profile could not be saved. Please try again.";
};

export default function EditChildProfileScreen() {
  const router = useRouter();
  const { childId = "" } = useLocalSearchParams<{ childId?: string }>();
  const { updateActiveChildProfile } = useChild();
  const [confirmedChild, setConfirmedChild] = React.useState<ChildProfile | null>(
    null,
  );
  const [name, setName] = React.useState("");
  const [age, setAge] = React.useState("");
  const [gender, setGender] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [selectedLanguageCode, setSelectedLanguageCode] = React.useState("");
  const [legacyAge, setLegacyAge] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState("");
  const [successMessage, setSuccessMessage] = React.useState("");
  const savingRef = React.useRef(false);

  const populateForm = React.useCallback((child: ChildProfile) => {
    setConfirmedChild(child);
    setName(child.name);
    setGender(child.gender ?? "");
    setReason(child.reason ?? "");
    setSelectedLanguageCode(child.selected_language_code ?? "");
    if (isSupportedChildAge(child.age)) {
      setAge(child.age);
      setLegacyAge("");
    } else {
      // Preserve the exact historical value in the confirmed record. The
      // parent must deliberately choose a current age option before saving.
      setAge("");
      setLegacyAge(child.age);
    }
    setErrorMessage("");
  }, []);

  React.useEffect(() => {
    let mounted = true;
    setLoading(true);
    void fetchActiveChildProfile(childId)
      .then((child) => {
        if (!mounted) return;
        if (child) {
          populateForm(child);
        } else {
          setErrorMessage(
            "We could not open this child profile. Go back and try again.",
          );
        }
      })
      .catch((error) => {
        if (mounted) setErrorMessage(getChildSaveError(error));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [childId, populateForm]);

  const reasonOptions = React.useMemo(() => {
    const options = [...CHILD_LEARNING_REASON_OPTIONS];
    if (reason && !options.includes(reason as (typeof options)[number])) {
      return [reason, ...options];
    }
    return options;
  }, [reason]);

  const handleSave = async () => {
    if (!confirmedChild || savingRef.current) return;
    setErrorMessage("");
    setSuccessMessage("");

    let normalized;
    try {
      normalized = validateChildProfileEdit({
        name,
        age,
        gender,
        reason,
        selectedLanguageCode,
      });
    } catch (error) {
      setErrorMessage(getChildSaveError(error));
      return;
    }

    if (!(await requireInternet("Saving this child profile"))) return;
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);

    try {
      const previousLanguageCode =
        confirmedChild.selected_language_code ?? "";
      const languageChanged =
        normalized.selectedLanguageCode !== previousLanguageCode;

      if (languageChanged) {
        const availability = await inspectLanguageContentAvailability(
          normalized.selectedLanguageCode,
        );
        const languageName =
          getLearningLanguage(availability.languageCode)?.name ??
          availability.languageCode;
        const confirmed = await confirmLanguageChange(
          languageName,
          availability.hasPublishedContent,
        );
        if (!confirmed) return;
      }

      const saved = await updateOwnedActiveChildProfile(
        confirmedChild.id,
        normalized,
      );

      if (languageChanged) {
        try {
          await refreshChildLanguageCaches(
            saved.id,
            previousLanguageCode,
            saved.selected_language_code ?? normalized.selectedLanguageCode,
          );
        } catch {
          // Language-scoped keys prevent cross-language fallback even when a
          // nonessential cache cleanup must retry later.
          console.warn("Could not finish refreshing child language caches.");
        }
      }

      await updateActiveChildProfile({
        id: saved.id,
        name: saved.name,
        gender: saved.gender,
        age: saved.age,
        reason: saved.reason,
        selected_language_code: saved.selected_language_code,
      });
      populateForm(saved);
      setSuccessMessage("Child profile saved.");
      Alert.alert(
        "Child profile saved",
        "The profile is up to date. Existing learning progress was preserved.",
        [{ text: "Done", onPress: () => router.back() }],
      );
    } catch (error) {
      // Keep the last confirmed form values when the server did not accept the
      // update. No optimistic child/context mutation has occurred.
      populateForm(confirmedChild);
      setErrorMessage(getChildSaveError(error));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <SettingsScaffold title="Edit Child Profile">
      {loading ? (
        <View className="mt-5 bg-white rounded-xl border border-gray-100 py-10 items-center">
          <ActivityIndicator />
          <Text className="text-gray-500 mt-3">Loading child profile...</Text>
        </View>
      ) : confirmedChild ? (
        <>
          <View className="mt-5 bg-white rounded-xl border border-gray-100 p-5">
            <Text className="text-gray-700 mb-2">Child name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              editable={!saving}
              autoCapitalize="words"
              autoCorrect={false}
              maxLength={160}
              placeholder="Child name"
              placeholderTextColor="#9CA3AF"
              className="border border-gray-200 rounded-xl px-4 py-3 text-lg text-gray-800"
              style={readableTextInputStyle}
              accessibilityLabel="Child name"
            />

            <Text className="text-gray-700 mt-5 mb-2">Age</Text>
            {legacyAge ? (
              <View className="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-3">
                <Text className="text-amber-900 leading-5">
                  Current saved age: {legacyAge}. It has not been changed. Choose
                  a current option before saving.
                </Text>
              </View>
            ) : null}
            <View className="flex-row flex-wrap gap-2">
              {CHILD_AGE_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option}
                  className={`w-[22%] rounded-xl py-3 items-center border ${
                    age === option
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-200 bg-white"
                  }`}
                  onPress={() => {
                    setAge(option);
                    setLegacyAge("");
                  }}
                  disabled={saving}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: age === option }}
                >
                  <Text
                    variant="bold"
                    className={age === option ? "text-blue-700" : "text-gray-700"}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {age === "12+" ? (
              <Text className="text-gray-500 text-sm leading-5 mt-3">
                {OLDER_CHILD_GUIDANCE}
              </Text>
            ) : null}

            <Text className="text-gray-700 mt-5 mb-2">Gender (optional)</Text>
            <View className="gap-2">
              {CHILD_GENDER_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value || "not-set"}
                  className={`rounded-xl px-4 py-3 border ${
                    gender === option.value
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-200"
                  }`}
                  onPress={() => setGender(option.value)}
                  disabled={saving}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: gender === option.value }}
                >
                  <Text className="text-gray-800">{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text className="text-gray-700 mt-5 mb-2">
              Learning reason (optional)
            </Text>
            <View className="gap-2">
              <TouchableOpacity
                className={`rounded-xl px-4 py-3 border ${
                  !reason ? "border-blue-600 bg-blue-50" : "border-gray-200"
                }`}
                onPress={() => setReason("")}
                disabled={saving}
                accessibilityRole="radio"
                accessibilityState={{ checked: !reason }}
              >
                <Text className="text-gray-800">Not set</Text>
              </TouchableOpacity>
              {reasonOptions.map((option) => (
                <TouchableOpacity
                  key={option}
                  className={`rounded-xl px-4 py-3 border ${
                    reason === option
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-200"
                  }`}
                  onPress={() => setReason(option)}
                  disabled={saving}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: reason === option }}
                >
                  <Text className="text-gray-800">{option}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text className="text-gray-700 mt-5 mb-2">Learning language</Text>
            <View className="gap-2">
              {LEARNING_LANGUAGES.filter((language) => language.isActive).map(
                (language) => (
                  <TouchableOpacity
                    key={language.code}
                    className={`rounded-xl px-4 py-3 border ${
                      selectedLanguageCode === language.code
                        ? "border-blue-600 bg-blue-50"
                        : "border-gray-200"
                    }`}
                    onPress={() => setSelectedLanguageCode(language.code)}
                    disabled={saving}
                    accessibilityRole="radio"
                    accessibilityState={{
                      checked: selectedLanguageCode === language.code,
                    }}
                  >
                    <Text variant="medium" className="text-gray-800">
                      {language.name}
                    </Text>
                    <Text className="text-gray-500 text-sm mt-1">
                      {language.nativeName}
                    </Text>
                  </TouchableOpacity>
                ),
              )}
            </View>
            <Text className="text-gray-500 text-sm leading-5 mt-3">
              Progress is kept separately for each learning language.
            </Text>

            {errorMessage ? (
              <Text
                className="text-red-600 mt-4 leading-5"
                accessibilityLiveRegion="polite"
              >
                {errorMessage}
              </Text>
            ) : null}
            {successMessage ? (
              <Text
                className="text-emerald-700 mt-4"
                accessibilityLiveRegion="polite"
              >
                {successMessage}
              </Text>
            ) : null}

            <AppButton
              label="Save child profile"
              loadingLabel="Saving..."
              className="mt-5"
              onPress={() => void handleSave()}
              disabled={saving}
              loading={saving}
            />
          </View>
        </>
      ) : (
        <View className="mt-5 bg-white rounded-xl border border-gray-100 p-5">
          <Text className="text-red-600 leading-5">
            {errorMessage || "Child profile was not found."}
          </Text>
        </View>
      )}
    </SettingsScaffold>
  );
}
