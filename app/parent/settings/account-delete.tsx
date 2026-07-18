"use client";

import React from "react";
import { Alert, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { AppButton } from "@/components/common/AppButton";
import { SettingsScaffold } from "@/components/settings/SettingsScaffold";
import { Text } from "@/components/StyledText";
import { readableTextInputStyle } from "@/constants/formStyles";
import { useChild } from "@/context/ChildContext";
import {
  ACCOUNT_DELETE_CONFIRMATION_WORD,
  isAccountDeleteConfirmationValid,
  requestAccountDeletion,
} from "@/lib/accountManagement";
import { requireInternet, showNetworkErrorIfNeeded } from "@/lib/network";

export default function AccountDeleteScreen() {
  const router = useRouter();
  const { setActiveChild } = useChild();
  const [confirmation, setConfirmation] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const canSubmit = isAccountDeleteConfirmationValid(confirmation);

  const formatDeadline = (isoDate: string): string =>
    new Intl.DateTimeFormat(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(new Date(isoDate));

  const handleRequestDeletion = async () => {
    if (!canSubmit || submitting) return;
    if (!(await requireInternet("Scheduling account deletion"))) return;

    setSubmitting(true);
    try {
      const result = await requestAccountDeletion("Requested from in-app account management.");
      setActiveChild(null);
      Alert.alert(
        "Account scheduled for deletion",
        `Your account is now scheduled for deletion. If you change your mind, sign in again before ${formatDeadline(
          result.graceEndsAt,
        )} to keep your account.`,
        [{ text: "Done", onPress: () => router.replace("/login") }],
      );
    } catch (error) {
      console.error("Could not request account deletion:", error);
      if (await showNetworkErrorIfNeeded(error, "Scheduling account deletion")) return;
      Alert.alert("Could not schedule deletion", "Please try again or contact support if you need help.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SettingsScaffold title="Delete Account">
      <View className="mt-5 bg-red-50 border border-red-100 rounded-xl p-5">
        <View className="w-12 h-12 rounded-full bg-red-100 items-center justify-center mb-4">
          <Ionicons name="warning-outline" size={26} color="#DC2626" />
        </View>
        <Text variant="bold" className="text-red-800 text-lg mb-2">
          Delete your account?
        </Text>
        <Text className="text-red-800 leading-6 mb-3">
          {"We're sorry to see you go. If you delete your account, Baby Steps will schedule it for deletion. You can still come back within 30 days by signing in again."}
        </Text>
        <Text className="text-red-800 leading-6 mb-3">
          After 30 days, your account, child profiles, and saved learning
          progress will be deleted.
        </Text>
        <Text className="text-red-800 leading-6">
          Changed your mind? Sign in again before then to keep your account.
          Some information may be kept only if needed for legal, safety,
          security, or operational reasons.
        </Text>
      </View>

      <View className="mt-5 bg-white rounded-xl border border-gray-100 p-5">
        <Text className="text-gray-700 leading-6 mb-4">
          Type DELETE to confirm that you want to delete your account.
        </Text>
        <TextInput
          value={confirmation}
          onChangeText={setConfirmation}
          autoCapitalize="characters"
          placeholder={ACCOUNT_DELETE_CONFIRMATION_WORD}
          placeholderTextColor="#9CA3AF"
          className="border border-gray-200 rounded-xl px-4 py-3 text-lg text-gray-800"
          style={readableTextInputStyle}
          accessibilityLabel="Account deletion confirmation"
        />

        <AppButton
          label="Delete my account"
          loadingLabel="Deleting..."
          variant="destructive"
          className="mt-4"
          onPress={handleRequestDeletion}
          disabled={!canSubmit}
          loading={submitting}
        />
        <AppButton
          label="Keep my account"
          variant="secondary"
          className="mt-3"
          icon="arrow-back"
          iconPosition="left"
          onPress={() => router.back()}
          disabled={submitting}
        />
      </View>
    </SettingsScaffold>
  );
}
