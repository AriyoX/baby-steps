"use client";

import { useLocalSearchParams } from "expo-router";
import { PlaceholderSettingsScreen } from "@/components/settings/PlaceholderSettingsScreen";
import { PLACEHOLDER_SETTINGS } from "@/lib/settingsOptions";

export default function SettingsPlaceholderRoute() {
  const params = useLocalSearchParams<{ placeholder?: string }>();
  const slug = params.placeholder ?? "";
  const info =
    PLACEHOLDER_SETTINGS[slug] ??
    {
      title: "Settings",
      description: "This settings area will be available soon.",
    };

  return (
    <PlaceholderSettingsScreen
      title={info.title}
      description={info.description}
    />
  );
}
