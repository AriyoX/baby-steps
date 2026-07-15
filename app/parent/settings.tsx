"use client";

import React from "react";
import { Alert, View } from "react-native";
import { useRouter } from "expo-router";
import { BrandMark } from "@/components/brand/BrandMark";
import { Text } from "@/components/StyledText";
import { SettingsRow } from "@/components/settings/SettingsRow";
import { SettingsScaffold } from "@/components/settings/SettingsScaffold";
import { brandColors } from "@/constants/Brand";
import { SETTINGS_SECTIONS } from "@/lib/settingsOptions";

export default function SettingsScreen() {
  const router = useRouter();
  const testToolsEnabled = __DEV__ || process.env.EXPO_PUBLIC_ENABLE_TEST_TOOLS === "true";

  const handleResetOnboardingForDev = React.useCallback(async () => {
    try {
      const { resetOnboardingForDev } = await import("@/lib/onboarding");
      const clearedKeys = await resetOnboardingForDev();
      Alert.alert(
        "Onboarding reset",
        `Cleared ${clearedKeys.join(", ")}. Sign out or restart the app while signed out to view onboarding again.`,
      );
    } catch (error) {
      console.error("Could not reset onboarding:", error);
      Alert.alert("Could not reset onboarding", "Please try again from a development build.");
    }
  }, []);

  const handleTestNotification = React.useCallback(async () => {
    try {
      const {
        requestNotificationPermission,
        sendTestLearningReminder,
      } = await import("@/lib/notifications");
      const permission = await requestNotificationPermission();

      if (permission !== "granted") {
        Alert.alert(
          "Notifications are not allowed",
          "Allow Baby Steps notifications when prompted, or enable them in your device settings.",
        );
        return;
      }

      await sendTestLearningReminder();
      Alert.alert(
        "Test notification scheduled",
        "Put Baby Steps in the background. The reminder should appear in about three seconds.",
      );
    } catch (error) {
      console.error("Could not send a test notification:", error);
      Alert.alert(
        "Could not send a test notification",
        "Install a fresh native test build and try again on an Android or iOS device.",
      );
    }
  }, []);

  return (
    <SettingsScaffold title="Settings" showBrandIcon>
      <View className="items-center py-6">
        <View className="w-24 h-24 rounded-full bg-white border border-gray-100 shadow-sm items-center justify-center overflow-hidden">
          <BrandMark kind="icon" width={82} height={82} />
        </View>
        <Text variant="bold" className="text-xl text-gray-800 mt-3">
          Baby Steps
        </Text>
        <Text className="text-gray-500 mt-1">Family settings</Text>
      </View>

      {SETTINGS_SECTIONS.map((section) => (
        <View key={section.title} className="mb-5">
          <Text
            variant="medium"
            className="text-gray-500 text-sm uppercase tracking-wider mb-2 px-1"
          >
            {section.title}
          </Text>
          <View className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {section.entries.map((entry, index) => (
              <SettingsRow
                key={entry.title}
                title={entry.title}
                description={entry.description}
                icon={entry.icon as any}
                iconColor={entry.iconColor}
                onPress={() => router.push(entry.route as any)}
                last={index === section.entries.length - 1}
              />
            ))}
          </View>
        </View>
      ))}

      {testToolsEnabled ? (
        <View className="mb-5">
          <Text
            variant="medium"
            className="text-gray-500 text-sm uppercase tracking-wider mb-2 px-1"
          >
            Developer
          </Text>
          <View className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <SettingsRow
              title="Send test notification"
              description="Requests permission and shows a themed reminder in about 3 seconds."
              icon="notifications-circle-outline"
              iconColor={brandColors.victoriaBlue}
              onPress={handleTestNotification}
            />
            <SettingsRow
              title="Reset onboarding"
              description="Clears the pre-login onboarding flag only."
              icon="refresh-circle-outline"
              iconColor={brandColors.shanaOrange}
              onPress={handleResetOnboardingForDev}
              last
            />
          </View>
        </View>
      ) : null}

      <View className="py-6 items-center">
        <Text className="text-gray-400 text-sm">Baby Steps v1.0.0</Text>
      </View>
    </SettingsScaffold>
  );
}
