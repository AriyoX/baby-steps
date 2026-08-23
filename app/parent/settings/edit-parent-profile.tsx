"use client";

import React from "react";
import { ActivityIndicator, Alert, TextInput, View } from "react-native";
import { SettingsScaffold } from "@/components/settings/SettingsScaffold";
import { AppButton } from "@/components/common/AppButton";
import { Text } from "@/components/StyledText";
import { readableTextInputStyle } from "@/constants/formStyles";
import { useParentProfile } from "@/context/ParentProfileContext";
import {
  ParentProfileError,
  saveParentDisplayName,
} from "@/lib/parentProfileRepository";
import { requireInternet } from "@/lib/network";
import { validateProfileName } from "@/lib/profileValidation";

const getSaveErrorMessage = (error: unknown): string => {
  if (error instanceof ParentProfileError) {
    if (error.kind === "authorization") {
      return "This parent profile cannot be changed from this account.";
    }
    if (error.kind === "network") {
      return "Baby Steps could not be reached. Check your connection and try again.";
    }
    if (error.kind === "session-changed") {
      return "The account changed. Reopen the parent profile and try again.";
    }
    return error.message;
  }
  return "The parent profile could not be saved. Please try again.";
};

export default function EditParentProfileScreen() {
  const {
    profile,
    isLoading,
    error: loadError,
    refreshParentProfile,
    setConfirmedParentProfile,
  } = useParentProfile();
  const [displayName, setDisplayName] = React.useState("");
  const [confirmedDisplayName, setConfirmedDisplayName] = React.useState("");
  const [validationError, setValidationError] = React.useState("");
  const [saveError, setSaveError] = React.useState("");
  const [successMessage, setSuccessMessage] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const savingRef = React.useRef(false);

  React.useEffect(() => {
    if (!profile) return;
    const confirmed = profile.displayName ?? "";
    setDisplayName(confirmed);
    setConfirmedDisplayName(confirmed);
    setValidationError("");
    setSaveError("");
  }, [profile]);

  React.useEffect(() => {
    if (!isLoading && !profile && !loadError) {
      void refreshParentProfile();
    }
  }, [isLoading, loadError, profile, refreshParentProfile]);

  const handleSave = async () => {
    if (savingRef.current) return;
    const validation = validateProfileName(displayName);
    if (validation.error) {
      setValidationError(validation.error);
      setSuccessMessage("");
      return;
    }
    if (!(await requireInternet("Saving the parent profile"))) return;
    if (savingRef.current) return;

    savingRef.current = true;
    setSaving(true);
    setValidationError("");
    setSaveError("");
    setSuccessMessage("");
    try {
      const saved = await saveParentDisplayName(validation.value);
      setConfirmedParentProfile(saved);
      setDisplayName(saved.displayName ?? "");
      setConfirmedDisplayName(saved.displayName ?? "");
      setSuccessMessage("Parent profile saved.");
      Alert.alert("Parent profile saved", "Your display name is up to date.");
    } catch (error) {
      // Never publish an unconfirmed value into shared parent state.
      setDisplayName(confirmedDisplayName);
      setSaveError(getSaveErrorMessage(error));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <SettingsScaffold title="Edit Parent Profile">
      <View className="mt-5 bg-white rounded-xl border border-gray-100 p-5">
        {isLoading && !profile ? (
          <View className="py-6 items-center">
            <ActivityIndicator />
            <Text className="text-gray-500 mt-3">Loading parent profile...</Text>
          </View>
        ) : profile ? (
          <>
            <Text className="text-gray-700 mb-2">Parent display name</Text>
            <TextInput
              value={displayName}
              onChangeText={(value) => {
                setDisplayName(value);
                setValidationError("");
                setSaveError("");
                setSuccessMessage("");
              }}
              autoCapitalize="words"
              autoCorrect={false}
              maxLength={160}
              placeholder="Parent name"
              placeholderTextColor="#9CA3AF"
              className="border border-gray-200 rounded-xl px-4 py-3 text-lg text-gray-800"
              style={readableTextInputStyle}
              accessibilityLabel="Parent display name"
              editable={!saving}
            />
            {validationError ? (
              <Text className="text-red-600 mt-2">{validationError}</Text>
            ) : null}

            <Text className="text-gray-500 text-sm mt-5">Account email</Text>
            <View
              className="border border-gray-100 bg-gray-50 rounded-xl px-4 py-3 mt-2"
              accessibilityLabel={`Account email ${profile.email}`}
            >
              <Text variant="medium" className="text-gray-700">
                {profile.email}
              </Text>
            </View>
            <Text className="text-gray-500 text-sm leading-5 mt-2">
              Contact Baby Steps support if this email needs to be changed.
            </Text>

            {saveError ? (
              <Text
                className="text-red-600 mt-4"
                accessibilityLiveRegion="polite"
              >
                {saveError}
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
              label="Save parent profile"
              loadingLabel="Saving..."
              className="mt-5"
              onPress={() => void handleSave()}
              disabled={saving}
              loading={saving}
            />
          </>
        ) : (
          <>
            <Text className="text-red-600 leading-5">
              {loadError ?? "The parent profile could not be loaded."}
            </Text>
            <AppButton
              label="Try again"
              className="mt-4"
              onPress={() => void refreshParentProfile()}
            />
          </>
        )}
      </View>
    </SettingsScaffold>
  );
}
