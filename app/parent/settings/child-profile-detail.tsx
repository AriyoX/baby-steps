"use client";

import React from "react";
import { Alert, Switch, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SettingsRow } from "@/components/settings/SettingsRow";
import { SettingsScaffold } from "@/components/settings/SettingsScaffold";
import { Text } from "@/components/StyledText";
import {
  fetchActiveChildProfile,
  type ChildProfile,
} from "@/lib/accountManagement";
import {
  loadChildUiLanguagePreference,
  saveChildUiLanguagePreference,
} from "@/lib/childUiLanguagePreference";
import { ChildStreakSection } from "@/components/parent/ChildStreakSection";

export default function ChildProfileDetailManagementScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ childId?: string }>();
  const childId = params.childId ?? "";
  const [child, setChild] = React.useState<ChildProfile | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [useLearningLanguage, setUseLearningLanguage] = React.useState(false);
  const [isUiLanguagePreferenceLoading, setIsUiLanguagePreferenceLoading] =
    React.useState(true);

  React.useEffect(() => {
    let isMounted = true;

    const loadChild = async () => {
      setLoading(true);
      try {
        const profile = await fetchActiveChildProfile(childId);
        if (isMounted) setChild(profile);
      } catch (error) {
        console.error("Could not load child profile:", error);
        Alert.alert("Could not load profile", "Please try again.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void loadChild();

    return () => {
      isMounted = false;
    };
  }, [childId]);

  React.useEffect(() => {
    let isMounted = true;
    setUseLearningLanguage(false);
    setIsUiLanguagePreferenceLoading(true);

    void loadChildUiLanguagePreference(childId).then((enabled) => {
      if (isMounted) {
        setUseLearningLanguage(enabled);
        setIsUiLanguagePreferenceLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [childId]);

  const updateUiLanguagePreference = React.useCallback(
    (enabled: boolean) => {
      if (!child || enabled === useLearningLanguage) return;

      setUseLearningLanguage(enabled);
      void saveChildUiLanguagePreference(child.id, enabled);
    },
    [child, useLearningLanguage],
  );

  return (
    <SettingsScaffold title="Manage Child">
      <View className="mt-5 bg-white rounded-xl border border-gray-100 p-5">
        {loading ? (
          <Text className="text-gray-500">Loading child profile...</Text>
        ) : child ? (
          <>
            <Text variant="bold" className="text-gray-800 text-2xl">
              {child.name}
            </Text>
            <Text className="text-gray-500 mt-2">Age: {child.age || "Not set"}</Text>
            <Text className="text-gray-500 mt-1">Gender: {child.gender || "Not set"}</Text>
            <Text className="text-gray-500 mt-1">
              Learning language: {child.selected_language_code || "Not set"}
            </Text>
          </>
        ) : (
          <Text className="text-gray-500">Child profile was not found.</Text>
        )}
      </View>

      {child ? <ChildStreakSection childId={child.id} mode="settings" /> : null}

      {child ? (
        <View className="mt-5 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <View className="flex-row items-center px-4 py-4 border-b border-gray-100">
            <View className="flex-1 pr-4">
              <Text variant="medium" className="text-gray-800 text-base">
                Use learning language in the app
              </Text>
              <Text className="text-gray-500 text-sm mt-0.5 leading-5">
                Translate supported child-mode buttons and labels. Learning content is unchanged.
              </Text>
            </View>
            <Switch
              accessibilityLabel="Use learning language in the app"
              accessibilityRole="switch"
              accessibilityState={{
                checked: useLearningLanguage,
                disabled: isUiLanguagePreferenceLoading,
              }}
              disabled={isUiLanguagePreferenceLoading}
              onValueChange={updateUiLanguagePreference}
              value={useLearningLanguage}
            />
          </View>
          <SettingsRow
            title="Edit child details"
            description="Profile editing is coming soon."
            icon="create-outline"
            iconColor="#2563EB"
            onPress={() => router.push("/parent/settings/child-profile-edit" as any)}
          />
          <SettingsRow
            title="Delete child profile"
            description="Archive this child and hide their learning progress."
            icon="trash-outline"
            iconColor="#DC2626"
            destructive
            onPress={() =>
              router.push({
                pathname: "/parent/settings/child-profile-delete" as any,
                params: { childId: child.id },
              })
            }
            last
          />
        </View>
      ) : null}
    </SettingsScaffold>
  );
}
