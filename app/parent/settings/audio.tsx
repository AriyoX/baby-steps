"use client";

import { View } from "react-native";
import { AudioSettingsPanel } from "@/components/settings/AudioSettingsPanel";
import { SettingsScaffold } from "@/components/settings/SettingsScaffold";

export default function AudioSettingsScreen() {
  return (
    <SettingsScaffold title="Audio">
      <View className="mt-5">
        <AudioSettingsPanel />
      </View>
    </SettingsScaffold>
  );
}
