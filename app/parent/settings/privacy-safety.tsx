"use client";

import React from "react";
import { Alert, Linking, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SettingsRow } from "@/components/settings/SettingsRow";
import { SettingsScaffold } from "@/components/settings/SettingsScaffold";
import { Text } from "@/components/StyledText";
import { BABY_STEPS_SUPPORT_EMAIL, getSupportMailtoUrl } from "@/lib/support";

export default function PrivacySafetyScreen() {
  const router = useRouter();

  const contactSupport = React.useCallback(async () => {
    try {
      await Linking.openURL(getSupportMailtoUrl("Baby Steps privacy question"));
    } catch (error) {
      console.error("Could not open support email:", error);
      Alert.alert("Contact support", `Please email ${BABY_STEPS_SUPPORT_EMAIL} for help.`);
    }
  }, []);

  return (
    <SettingsScaffold title="Privacy & Safety">
      <View className="mt-5 bg-white rounded-xl border border-gray-100 p-5">
        <View className="w-12 h-12 rounded-full bg-cyan-50 items-center justify-center mb-4">
          <Ionicons name="shield-checkmark-outline" size={24} color="#0891B2" />
        </View>
        <Text variant="bold" className="text-lg text-gray-800 mb-2">
          Family privacy
        </Text>
        <Text className="text-gray-600 leading-6 mb-3">
          Baby Steps uses parent accounts to manage child profiles, learning
          progress, and family settings. We do not sell personal information.
        </Text>
        <Text className="text-gray-600 leading-6">
          Parents can request account deletion in the app. When deletion is
          scheduled, child profiles and learning progress are hidden during the
          30-day period.
        </Text>
      </View>

      <View className="mt-5 bg-white rounded-xl border border-gray-100 p-5">
        <Text variant="bold" className="text-lg text-gray-800 mb-2">
          Account deletion
        </Text>
        <Text className="text-gray-600 leading-6 mb-3">
          Go to Settings, then Account, then Delete Account to schedule account
          deletion. You can log in again before the deadline to reactivate your
          account and restore child profiles and progress where available.
        </Text>
        <Text className="text-gray-600 leading-6">
          After 30 days, the account is finalized through a secure server-side
          removal process. Shared learning content, language content,
          achievement definitions, and other global Baby Steps content are not
          deleted because they are not owned by one family account.
        </Text>
      </View>

      <View className="mt-5 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <SettingsRow
          title="Delete Account"
          description="Schedule account deletion from the Account settings screen."
          icon="trash-outline"
          iconColor="#DC2626"
          destructive
          onPress={() => router.push("/parent/settings/account-delete" as any)}
        />
        <SettingsRow
          title="Data Deletion Information"
          description="Read what happens during the 30-day deletion period."
          icon="document-text-outline"
          iconColor="#2563EB"
          onPress={() => router.push("/parent/settings/help-support" as any)}
        />
        <SettingsRow
          title="Contact Support"
          description={BABY_STEPS_SUPPORT_EMAIL}
          icon="mail-outline"
          iconColor="#4F46E5"
          onPress={() => {
            void contactSupport();
          }}
          last
        />
      </View>
    </SettingsScaffold>
  );
}
