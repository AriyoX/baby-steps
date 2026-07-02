"use client";

import React from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { BrandMark } from "@/components/brand/BrandMark";
import { Text } from "@/components/StyledText";
import { SettingsRow } from "@/components/settings/SettingsRow";
import { SettingsScaffold } from "@/components/settings/SettingsScaffold";
import { SETTINGS_SECTIONS } from "@/lib/settingsOptions";

export default function SettingsScreen() {
  const router = useRouter();

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

      <View className="py-6 items-center">
        <Text className="text-gray-400 text-sm">Baby Steps v1.0.0</Text>
      </View>
    </SettingsScaffold>
  );
}
