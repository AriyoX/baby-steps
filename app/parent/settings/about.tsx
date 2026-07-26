"use client";

import React from "react";
import { Alert, Linking, Platform, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SettingsRow } from "@/components/settings/SettingsRow";
import { SettingsScaffold } from "@/components/settings/SettingsScaffold";
import { Text } from "@/components/StyledText";
import { getAppRuntimeMetadata } from "@/lib/appMetadata";
import { BABY_STEPS_SUPPORT_EMAIL, getSupportMailtoUrl } from "@/lib/support";

export default function AboutBabyStepsScreen() {
  const router = useRouter();
  const appMetadata = getAppRuntimeMetadata();

  const sendFeedback = React.useCallback(async () => {
    try {
      await Linking.openURL(getSupportMailtoUrl("Baby Steps closed-beta feedback"));
    } catch {
      Alert.alert(
        "Send beta feedback",
        `Please email ${BABY_STEPS_SUPPORT_EMAIL}.`,
      );
    }
  }, []);

  return (
    <SettingsScaffold title="About Baby Steps" showBrandIcon>
      <View className="mt-5 bg-white rounded-xl border border-gray-100 p-5">
        <View className="w-12 h-12 rounded-full bg-slate-50 items-center justify-center mb-4">
          <Ionicons name="information-circle-outline" size={24} color="#475569" />
        </View>
        <Text variant="bold" className="text-lg text-gray-800 mb-2">
          Baby Steps
        </Text>
        <View className="self-start bg-primary-50 border border-primary-100 rounded-full px-3 py-1 mb-3">
          <Text variant="bold" className="text-primary-700 text-xs">
            Closed beta
          </Text>
        </View>
        <Text className="text-gray-600 leading-6 mb-3">
          Baby Steps helps families explore early learning, language, stories,
          games, and progress in a parent-guided space.
        </Text>
        <Text className="text-gray-600 leading-6">
          Privacy, account deletion, and support details are available from the
          screens below.
        </Text>
        <View className="mt-4 pt-4 border-t border-gray-100">
          <Text className="text-gray-600">Version {appMetadata.version}</Text>
          <Text className="text-gray-600 mt-1">
            {Platform.OS === "android" ? "Android version code" : "Native build"}:{" "}
            {appMetadata.build}
          </Text>
        </View>
      </View>

      <View className="mt-5 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <SettingsRow
          title="Send closed-beta feedback"
          description={BABY_STEPS_SUPPORT_EMAIL}
          icon="chatbox-ellipses-outline"
          iconColor="#7C3AED"
          onPress={() => {
            void sendFeedback();
          }}
        />
        <SettingsRow
          title="Privacy & Safety"
          description="Review family privacy and account deletion information."
          icon="shield-checkmark-outline"
          iconColor="#0891B2"
          onPress={() => router.push("/parent/settings/privacy-safety" as any)}
        />
        <SettingsRow
          title="Help & Support"
          description="Contact support for account or deletion help."
          icon="help-circle-outline"
          iconColor="#4F46E5"
          onPress={() => router.push("/parent/settings/help-support" as any)}
          last
        />
      </View>

      <View className="mt-5 bg-amber-50 border border-amber-100 rounded-xl p-5">
        <Text variant="bold" className="text-amber-900 mb-2">
          Protect your family’s information
        </Text>
        <Text className="text-amber-900 leading-6">
          Do not include passwords, children’s full names, or screenshots that
          contain personal information in beta feedback.
        </Text>
      </View>
    </SettingsScaffold>
  );
}
