"use client";

import React from "react";
import {
  Alert,
  Linking,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { BrandMark } from "@/components/brand/BrandMark";
import { Text } from "@/components/StyledText";
import { useChild } from "@/context/ChildContext";
import {
  getAccountDeletionState,
  reactivateAccount,
  type AccountDeletionState,
} from "@/lib/accountManagement";
import { BABY_STEPS_SUPPORT_EMAIL, getSupportMailtoUrl } from "@/lib/support";
import { supabase } from "@/lib/supabase";

export const formatAccountDeletionDeadline = (isoDate?: string | null): string | null => {
  if (!isoDate) return null;

  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(isoDate));
};

export const getAccountReactivationContent = (
  accountState: AccountDeletionState | null,
) => {
  const phase = accountState?.phase ?? "pending";
  const deadline = formatAccountDeletionDeadline(accountState?.graceEndsAt);
  const canReactivate = phase === "pending";

  const title =
    phase === "expired" || phase === "completed"
      ? "Deletion Period Ended"
      : "Account Scheduled for Deletion";
  const message =
    phase === "expired" || phase === "completed"
      ? "The deletion period for this account has ended. The account is now waiting for final removal. Please contact support if you need help."
      : `Your Baby Steps account is scheduled for deletion.${
          deadline ? ` You can still reactivate it before ${deadline}.` : ""
        } Reactivating will restore your child profiles and learning progress where available.`;

  return {
    canReactivate,
    message,
    primaryButtonLabel: canReactivate ? "Reactivate Account" : null,
    secondaryButtonLabel: canReactivate ? "Keep Deletion Request and Sign Out" : "Sign Out",
    showContactSupport: !canReactivate,
    title,
  };
};

interface SignOutFromDeletionStatusOptions {
  setActiveChild: (child: null) => void;
  signOut: () => Promise<{ error: Error | null }>;
  replace: (path: "/login") => void;
}

export const signOutFromDeletionStatus = async ({
  setActiveChild,
  signOut,
  replace,
}: SignOutFromDeletionStatusOptions): Promise<void> => {
  setActiveChild(null);
  const { error } = await signOut();
  if (error) throw error;
  replace("/login");
};

export default function AccountReactivationScreen() {
  const router = useRouter();
  const { setActiveChild } = useChild();
  const [accountState, setAccountState] = React.useState<AccountDeletionState | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);

  const loadState = React.useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace("/login");
        return;
      }

      const state = await getAccountDeletionState(data.session.user.id);
      setAccountState(state);

      if (state.phase === "active") {
        router.replace("/parent");
      }
    } catch (error) {
      console.error("Could not load account reactivation state:", error);
      Alert.alert("Could not load account status", "Please try signing in again.");
      await supabase.auth.signOut();
      router.replace("/login");
    } finally {
      setLoading(false);
    }
  }, [router]);

  React.useEffect(() => {
    void loadState();
  }, [loadState]);

  const signOut = async () => {
    setSubmitting(true);
    try {
      await signOutFromDeletionStatus({
        setActiveChild,
        signOut: () => supabase.auth.signOut(),
        replace: (path) => router.replace(path),
      });
    } catch (error) {
      console.error("Could not sign out:", error);
      Alert.alert("Could not sign out", "Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReactivate = async () => {
    if (submitting) return;

    setSubmitting(true);
    try {
      const result = await reactivateAccount();
      setActiveChild(null);
      Alert.alert(
        "Account reactivated",
        result.restoredChildIds.length > 0
          ? "Your child profiles and learning progress are available again where available."
          : "Your account is active again.",
        [{ text: "Continue", onPress: () => router.replace("/parent") }],
      );
    } catch (error) {
      console.error("Could not reactivate account:", error);
      Alert.alert("Could not reactivate", "Please contact support if you need help.");
    } finally {
      setSubmitting(false);
    }
  };

  const {
    canReactivate,
    message,
    secondaryButtonLabel,
    showContactSupport,
    title,
  } = getAccountReactivationContent(accountState);

  const contactSupport = async () => {
    try {
      await Linking.openURL(getSupportMailtoUrl("Help with my Baby Steps account deletion"));
    } catch (error) {
      console.error("Could not open support email:", error);
      Alert.alert("Contact support", `Please email ${BABY_STEPS_SUPPORT_EMAIL} for help.`);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-primary-50">
      <StatusBar translucent backgroundColor="transparent" style="dark" />
      <ScrollView contentContainerClassName="flex-grow justify-center px-6 py-8">
        <View className="items-center mb-8">
          <BrandMark kind="wordmark" width={180} height={44} containerStyle={{ marginBottom: 18 }} />
          <View className="w-28 h-28 rounded-full bg-white items-center justify-center border-4 border-primary-100 shadow-sm overflow-hidden">
            <BrandMark kind="mascot" width={70} height={96} />
          </View>
        </View>

        <View className="bg-white rounded-2xl border border-primary-100 p-6 shadow-sm">
          <View className="w-12 h-12 rounded-full bg-orange-50 items-center justify-center mb-4">
            <Ionicons
              name={canReactivate ? "refresh-outline" : "time-outline"}
              size={26}
              color="#F97316"
            />
          </View>

          <Text variant="bold" className="text-2xl text-neutral-800 mb-3">
            {loading ? "Checking Account" : title}
          </Text>
          <Text className="text-neutral-600 text-base leading-6">
            {loading ? "Please wait while we check your account status." : message}
          </Text>

          {!loading && (
            <View className="mt-6">
              {canReactivate && (
                <TouchableOpacity
                  className={`rounded-xl py-4 items-center bg-primary-500 ${
                    submitting ? "opacity-70" : ""
                  }`}
                  onPress={handleReactivate}
                  disabled={submitting}
                  accessibilityRole="button"
                >
                  <Text variant="bold" className="text-white text-base">
                    {submitting ? "Reactivating..." : "Reactivate Account"}
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                className={`rounded-xl py-4 items-center border border-neutral-200 ${
                  canReactivate ? "mt-3" : ""
                } ${submitting ? "opacity-70" : ""}`}
                onPress={signOut}
                disabled={submitting}
                accessibilityRole="button"
              >
                <Text variant="bold" className="text-neutral-700 text-base">
                  {secondaryButtonLabel}
                </Text>
              </TouchableOpacity>

              {showContactSupport && (
                <TouchableOpacity
                  className={`mt-3 rounded-xl py-4 items-center border border-primary-200 ${
                    submitting ? "opacity-70" : ""
                  }`}
                  onPress={contactSupport}
                  disabled={submitting}
                  accessibilityRole="button"
                >
                  <Text variant="bold" className="text-primary-700 text-base">
                    Contact Support
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
