"use client";

import React from "react";
import { Alert, Linking, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SettingsRow } from "@/components/settings/SettingsRow";
import { SettingsScaffold } from "@/components/settings/SettingsScaffold";
import { Text } from "@/components/StyledText";
import { BABY_STEPS_SUPPORT_EMAIL, getSupportMailtoUrl } from "@/lib/support";

export default function HelpSupportScreen() {
  const router = useRouter();

  const contactSupport = React.useCallback(async (subject: string) => {
    try {
      await Linking.openURL(getSupportMailtoUrl(subject));
    } catch (error) {
      console.error("Could not open support email:", error);
      Alert.alert("Contact support", `Please email ${BABY_STEPS_SUPPORT_EMAIL} for help.`);
    }
  }, []);

  return (
    <SettingsScaffold title="Help & Support">
      <View className="mt-5 bg-white rounded-xl border border-gray-100 p-5">
        <View className="w-12 h-12 rounded-full bg-indigo-50 items-center justify-center mb-4">
          <Ionicons name="help-circle-outline" size={24} color="#4F46E5" />
        </View>
        <Text variant="bold" className="text-lg text-gray-800 mb-2">
          We are here to help
        </Text>
        <Text className="text-gray-600 leading-6 mb-3">
          For account, privacy, or learning questions, contact Baby Steps support
          at {BABY_STEPS_SUPPORT_EMAIL}.
        </Text>
        <Text className="text-gray-600 leading-6">
          If you cannot access your account but want to request deletion, contact
          Baby Steps support at {BABY_STEPS_SUPPORT_EMAIL}. Use the email address
          for your Baby Steps account if you can.
        </Text>
      </View>

      <View className="mt-5 bg-white rounded-xl border border-gray-100 p-5">
        <Text variant="bold" className="text-lg text-gray-800 mb-2">
          Account deletion help
        </Text>
        <Text className="text-gray-600 leading-6">
          If you can sign in, go to Settings, then Account, then Delete Account.
          Your account will be scheduled for deletion. You can sign in again
          within 30 days to keep your account.
        </Text>
      </View>

      <View className="mt-5 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <SettingsRow
          title="Contact Support"
          description={BABY_STEPS_SUPPORT_EMAIL}
          icon="mail-outline"
          iconColor="#4F46E5"
          onPress={() => {
            void contactSupport("Baby Steps support request");
          }}
        />
        <SettingsRow
          title="Delete Account"
          description="Schedule deletion from the Account settings screen."
          icon="trash-outline"
          iconColor="#DC2626"
          destructive
          onPress={() => router.push("/parent/settings/account-delete" as any)}
          last
        />
      </View>
    </SettingsScaffold>
  );
}
