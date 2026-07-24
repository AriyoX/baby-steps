"use client";

import React from "react";
import { Alert, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SettingsScaffold } from "@/components/settings/SettingsScaffold";
import { Text } from "@/components/StyledText";
import { readableTextInputStyle } from "@/constants/formStyles";
import { useChild } from "@/context/ChildContext";
import {
  archiveChildProfile,
  fetchActiveChildProfile,
  isChildDeleteConfirmationValid,
  type ChildProfile,
} from "@/lib/accountManagement";
import { requireInternet, showNetworkErrorIfNeeded } from "@/lib/network";

export default function ChildProfileDeleteScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ childId?: string }>();
  const childId = params.childId ?? "";
  const { activeChild, deactivateChildMode } = useChild();
  const [child, setChild] = React.useState<ChildProfile | null>(null);
  const [confirmation, setConfirmation] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const canSubmit = child ? isChildDeleteConfirmationValid(confirmation, child.name) : false;

  React.useEffect(() => {
    let isMounted = true;

    const loadChild = async () => {
      setLoading(true);
      try {
        if (!(await requireInternet("Loading this child profile"))) return;
        const profile = await fetchActiveChildProfile(childId);
        if (isMounted) setChild(profile);
      } catch (error) {
        console.error("Could not load child profile:", error);
        if (await showNetworkErrorIfNeeded(error, "Loading this child profile")) return;
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

  const handleArchiveChild = async () => {
    if (!child || !canSubmit || submitting) return;
    if (!(await requireInternet("Removing this child profile"))) return;

    setSubmitting(true);
    try {
      await archiveChildProfile(child.id);
      if (activeChild?.id === child.id) {
        await deactivateChildMode();
      }

      Alert.alert(
        "Child removed",
        `${child.name} will no longer appear in normal child selection.`,
        [{ text: "OK", onPress: () => router.replace("/parent/settings/child-profiles") }],
      );
    } catch (error) {
      console.error("Could not remove child:", error);
      if (await showNetworkErrorIfNeeded(error, "Removing this child profile")) return;
      Alert.alert("Could not remove child", "Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SettingsScaffold title="Remove Child">
      <View className="mt-5 bg-amber-50 border border-amber-100 rounded-xl p-5">
        <View className="w-12 h-12 rounded-full bg-amber-100 items-center justify-center mb-4">
          <Ionicons name="archive-outline" size={26} color="#B45309" />
        </View>
        <Text variant="bold" className="text-amber-900 text-lg mb-2">
          Remove child
        </Text>
        {/* <Text className="text-amber-900 leading-6">
          This is not permanent deletion. The child profile and learning progress
          stay with this parent account but are hidden from normal child selection.
        </Text> */}
      </View>

      <View className="mt-5 bg-white rounded-xl border border-gray-100 p-5">
        {loading ? (
          <Text className="text-gray-500">Loading child profile...</Text>
        ) : child ? (
          <>
            <Text className="text-gray-700 leading-6 mb-4">
              Type {child.name} to confirm.
            </Text>
            <TextInput
              value={confirmation}
              onChangeText={setConfirmation}
              autoCapitalize="words"
              placeholder={child.name}
              placeholderTextColor="#9CA3AF"
              className="border border-gray-200 rounded-xl px-4 py-3 text-lg text-gray-800"
              style={readableTextInputStyle}
              accessibilityLabel="Confirm remove child profile"
            />
            <TouchableOpacity
              className={`mt-4 rounded-xl py-4 items-center ${
                canSubmit ? "bg-amber-700" : "bg-gray-200"
              }`}
              onPress={handleArchiveChild}
              disabled={!canSubmit || submitting}
              accessibilityRole="button"
              accessibilityState={{ disabled: !canSubmit || submitting }}
            >
              <Text variant="bold" className={canSubmit ? "text-white" : "text-gray-500"}>
                {submitting ? "Removing..." : "Remove Child"}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text className="text-gray-500">Child profile was not found.</Text>
        )}
      </View>
    </SettingsScaffold>
  );
}
