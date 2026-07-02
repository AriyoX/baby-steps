"use client";

import React from "react";
import { Alert, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SettingsScaffold } from "@/components/settings/SettingsScaffold";
import { Text } from "@/components/StyledText";
import {
  fetchActiveChildProfiles,
  type ChildProfile,
} from "@/lib/accountManagement";

const childAvatar = (gender?: string): string =>
  gender === "male" ? "Boy" : gender === "female" ? "Girl" : "Learner";

export default function ChildProfilesManagementScreen() {
  const router = useRouter();
  const [children, setChildren] = React.useState<ChildProfile[]>([]);
  const [loading, setLoading] = React.useState(true);

  const loadChildren = React.useCallback(async () => {
    setLoading(true);
    try {
      const profiles = await fetchActiveChildProfiles();
      setChildren(profiles);
    } catch (error) {
      console.error("Could not load child profiles:", error);
      Alert.alert("Could not load profiles", "Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadChildren();
  }, [loadChildren]);

  return (
    <SettingsScaffold title="Child Profiles">
      <View className="mt-5 flex-row justify-between items-center">
        <Text className="text-gray-600 flex-1 pr-3">
          Manage child profiles and learning data.
        </Text>
        <TouchableOpacity
          className="bg-blue-600 rounded-full px-4 py-2 flex-row items-center"
          onPress={() => router.push("/parent/add-child/gender")}
          accessibilityRole="button"
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text variant="bold" className="text-white ml-1">
            Add
          </Text>
        </TouchableOpacity>
      </View>

      <View className="mt-5 bg-white rounded-xl border border-gray-100 overflow-hidden">
        {loading ? (
          <View className="p-5">
            <Text className="text-gray-500">Loading child profiles...</Text>
          </View>
        ) : children.length > 0 ? (
          children.map((child, index) => (
            <TouchableOpacity
              key={child.id}
              className={`flex-row items-center p-4 ${
                index !== children.length - 1 ? "border-b border-gray-100" : ""
              }`}
              onPress={() =>
                router.push({
                  pathname: "/parent/settings/child-profile-detail" as any,
                  params: { childId: child.id },
                })
              }
              accessibilityRole="button"
            >
              <View className="w-12 h-12 rounded-full bg-orange-50 items-center justify-center mr-3">
                <Ionicons name="happy-outline" size={24} color="#F97316" />
              </View>
              <View className="flex-1">
                <Text variant="bold" className="text-gray-800 text-base">
                  {child.name}
                </Text>
                <Text className="text-gray-500 text-sm">
                  {childAvatar(child.gender)} {child.age ? `- Age ${child.age}` : ""}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          ))
        ) : (
          <View className="p-5">
            <Text className="text-gray-500">No active child profiles yet.</Text>
          </View>
        )}
      </View>
    </SettingsScaffold>
  );
}
