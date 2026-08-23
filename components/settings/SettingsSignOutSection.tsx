import { useRef, useState } from "react";
import { Alert, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { Text } from "@/components/StyledText";
import { brandColors } from "@/constants/Brand";
import { useChild } from "@/context/ChildContext";
import { clearParentSecuritySession } from "@/lib/parentAccess";
import { supabase } from "@/lib/supabase";

interface NormalSignOutOptions {
  clearActiveChildForSignOut: () => Promise<void>;
  signOut: () => Promise<{ error: Error | null }>;
  replace: (path: "/login") => void;
}

export const signOutNormally = async ({
  clearActiveChildForSignOut,
  signOut,
  replace,
}: NormalSignOutOptions): Promise<{ error: Error | null }> => {
  try {
    await clearActiveChildForSignOut();
  } catch (error) {
    console.warn("Could not finish progress synchronization before sign-out:", error);
  }

  const result = await signOut();
  if (!result.error) {
    clearParentSecuritySession();
    replace("/login");
  }
  return result;
};

export function SettingsSignOutSection() {
  const router = useRouter();
  const { clearActiveChildForSignOut } = useChild();
  const [isConfirmingSignOut, setIsConfirmingSignOut] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const isConfirmingSignOutRef = useRef(false);
  const isSigningOutRef = useRef(false);

  const performSignOut = async () => {
    if (isSigningOutRef.current) return;
    isSigningOutRef.current = true;
    setIsSigningOut(true);

    try {
      const { error } = await signOutNormally({
        clearActiveChildForSignOut,
        signOut: () => supabase.auth.signOut(),
        replace: (path) => router.replace(path),
      });
      if (error) {
        Alert.alert("Could not sign out", "Please try again.");
        isSigningOutRef.current = false;
        setIsSigningOut(false);
      }
    } catch (error) {
      console.warn("Could not complete sign-out:", error);
      Alert.alert("Could not sign out", "Please try again.");
      isSigningOutRef.current = false;
      setIsSigningOut(false);
    }
  };

  const confirmSignOut = () => {
    if (isConfirmingSignOutRef.current || isSigningOutRef.current) return;
    isConfirmingSignOutRef.current = true;
    setIsConfirmingSignOut(true);

    const finishConfirmation = () => {
      isConfirmingSignOutRef.current = false;
      setIsConfirmingSignOut(false);
    };

    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel", onPress: finishConfirmation },
      {
        text: "Sign out",
        style: "destructive",
        onPress: () => {
          finishConfirmation();
          void performSignOut();
        },
      },
    ], {
      cancelable: true,
      onDismiss: finishConfirmation,
    });
  };

  const isUnavailable = isConfirmingSignOut || isSigningOut;

  return (
    <View className="mt-2 rounded-xl border border-orange-100 bg-white overflow-hidden">
      <TouchableOpacity
        accessibilityLabel="Sign out"
        accessibilityRole="button"
        accessibilityState={{ busy: isSigningOut, disabled: isUnavailable }}
        className="min-h-16 flex-row items-center px-4 py-3"
        disabled={isUnavailable}
        onPress={confirmSignOut}
      >
        <View className="w-10 h-10 rounded-full bg-orange-50 items-center justify-center mr-3">
          <Ionicons name="log-out-outline" size={22} color={brandColors.orange[600]} />
        </View>
        <Text variant="medium" className="flex-1 text-base text-orange-700">
          {isSigningOut ? "Signing out..." : "Sign out"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
