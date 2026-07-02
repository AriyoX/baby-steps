"use client";

import { View } from "react-native";
import { AudioSettingsPanel } from "@/components/settings/AudioSettingsPanel";
import { SettingsScaffold } from "@/components/settings/SettingsScaffold";
import { Text } from "@/components/StyledText";

export default function AudioSettingsScreen() {
  return (
    <SettingsScaffold title="Audio">
      <View className="mt-5">
        <Text className="text-gray-600 mb-4">
          Manage music, app sounds, and background tracks.
        </Text>
        <AudioSettingsPanel />
      </View>
    </SettingsScaffold>
  );
}
