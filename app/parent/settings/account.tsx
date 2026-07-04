"use client";

import React from "react";
import { Alert, View } from "react-native";
import type { User } from "@supabase/supabase-js";
import { useRouter } from "expo-router";
import { SettingsRow } from "@/components/settings/SettingsRow";
import { SettingsScaffold } from "@/components/settings/SettingsScaffold";
import { Text } from "@/components/StyledText";
import { supabase } from "@/lib/supabase";

export default function AccountManagementScreen() {
  const router = useRouter();
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!isMounted) return;

      if (error) {
        console.error("Could not load user details:", error.message);
      }

      setUser(data.user ?? null);
      setLoading(false);
    };

    void loadUser();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSignOut = () => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase.auth.signOut();
          if (error) {
            Alert.alert("Could not sign out", "Please try again.");
            return;
          }

          router.replace("/login");
        },
      },
    ]);
  };

  return (
    <SettingsScaffold title="Account">
      <View className="mt-5 bg-white rounded-xl border border-gray-100 p-4">
        <Text variant="bold" className="text-gray-800 text-lg mb-3">
          Signed-in Parent
        </Text>
        <View className="mb-2">
          <Text className="text-gray-500 text-sm">Email</Text>
          <Text variant="medium" className="text-gray-800 mt-1">
            {loading ? "Loading..." : user?.email ?? "Not available"}
          </Text>
        </View>
        <View>
          <Text className="text-gray-500 text-sm">User ID</Text>
          <Text className="text-gray-700 mt-1" selectable>
            {loading ? "Loading..." : user?.id ?? "Not available"}
          </Text>
        </View>
      </View>

      <View className="mt-5 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <SettingsRow
          title="Edit parent profile"
          description="Name and family details are coming soon."
          icon="create-outline"
          iconColor="#2563EB"
          onPress={() => router.push("/parent/settings/account-edit-profile" as any)}
        />
        <SettingsRow
          title="Email & password"
          description="Secure email and password changes are coming soon."
          icon="key-outline"
          iconColor="#7C3AED"
          onPress={() => router.push("/parent/settings/account-security" as any)}
        />
        <SettingsRow
          title="Sign out"
          icon="log-out-outline"
          iconColor="#F97316"
          onPress={handleSignOut}
        />
        <SettingsRow
          title="Delete account"
          description="Delete your account. You can come back within 30 days by signing in again."
          icon="trash-outline"
          iconColor="#DC2626"
          destructive
          onPress={() => router.push("/parent/settings/account-delete" as any)}
          last
        />
      </View>
    </SettingsScaffold>
  );
}
