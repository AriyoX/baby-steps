"use client";

import React from "react";
import { Alert, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SettingsScaffold } from "@/components/settings/SettingsScaffold";
import { Text } from "@/components/StyledText";
import { useChild } from "@/context/ChildContext";
import {
  ACCOUNT_DELETE_CONFIRMATION_WORD,
  isAccountDeleteConfirmationValid,
  requestAccountDeletion,
} from "@/lib/accountManagement";

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

    setSubmitting(true);
    try {
      const result = await requestAccountDeletion("Requested from in-app account management.");
      setActiveChild(null);
      Alert.alert(
        "Account scheduled for deletion",
        `Your account has been scheduled for deletion. You can reactivate it by logging in again before ${formatDeadline(
          result.graceEndsAt,
        )}. You have been signed out.`,
        [{ text: "OK", onPress: () => router.replace("/login") }],
      );
    } catch (error) {
      console.error("Could not request account deletion:", error);
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
          Schedule your account for deletion
        </Text>
        <Text className="text-red-800 leading-6 mb-3">
          Deleting your Baby Steps account will schedule it for deletion. Your
          account, child profiles, and learning progress will be hidden, and you
          will be signed out.
        </Text>
        <Text className="text-red-800 leading-6 mb-3">
          You have 30 days to change your mind. During this period, you can log
          in again and reactivate your account.
        </Text>
        <Text className="text-red-800 leading-6 mb-3">
          After 30 days, your account and associated user-owned data will be
          prepared for final removal by our secure removal process. Some
          information may be kept only if needed for legal, safety, security, or
          operational reasons.
        </Text>
        <Text className="text-red-800 leading-6">
          Shared Baby Steps learning content, language content, achievement
          definitions, and global app content are not deleted because they are
          not user-owned.
        </Text>
      </View>

      <View className="mt-5 bg-white rounded-xl border border-gray-100 p-5">
        <Text className="text-gray-700 leading-6 mb-4">
          Type DELETE to confirm.
        </Text>
        <TextInput
          value={confirmation}
          onChangeText={setConfirmation}
          autoCapitalize="characters"
          placeholder={ACCOUNT_DELETE_CONFIRMATION_WORD}
          placeholderTextColor="#9CA3AF"
          className="border border-gray-200 rounded-xl px-4 py-3 text-gray-800"
          accessibilityLabel="Account deletion confirmation"
        />

        <TouchableOpacity
          className={`mt-4 rounded-xl py-4 items-center ${
            canSubmit ? "bg-red-600" : "bg-gray-200"
          }`}
          onPress={handleRequestDeletion}
          disabled={!canSubmit || submitting}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSubmit || submitting }}
        >
          <Text variant="bold" className={canSubmit ? "text-white" : "text-gray-500"}>
            {submitting ? "Submitting..." : "Schedule Account Deletion"}
          </Text>
        </TouchableOpacity>
      </View>
    </SettingsScaffold>
  );
}
