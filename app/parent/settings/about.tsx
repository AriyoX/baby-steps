"use client";

import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SettingsRow } from "@/components/settings/SettingsRow";
import { SettingsScaffold } from "@/components/settings/SettingsScaffold";
import { Text } from "@/components/StyledText";

export default function AboutBabyStepsScreen() {
  const router = useRouter();

  return (
    <SettingsScaffold title="About Baby Steps" showBrandIcon>
      <View className="mt-5 bg-white rounded-xl border border-gray-100 p-5">
        <View className="w-12 h-12 rounded-full bg-slate-50 items-center justify-center mb-4">
          <Ionicons name="information-circle-outline" size={24} color="#475569" />
        </View>
        <Text variant="bold" className="text-lg text-gray-800 mb-2">
          Baby Steps
        </Text>
        <Text className="text-gray-600 leading-6 mb-3">
          Baby Steps helps families explore early learning, language, stories,
          games, and progress in a parent-guided space.
        </Text>
        <Text className="text-gray-600 leading-6">
          Privacy, account deletion, and support details are available from the
          screens below.
        </Text>
      </View>

      <View className="mt-5 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
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
    </SettingsScaffold>
  );
}
