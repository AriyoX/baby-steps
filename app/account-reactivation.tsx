"use client";

import React from "react";
import {
  Alert,
  Linking,
  ScrollView,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { BrandMark } from "@/components/brand/BrandMark";
import { AppButton } from "@/components/common/AppButton";
import { Text } from "@/components/StyledText";
import { useChild } from "@/context/ChildContext";
import {
  getAccountDeletionState,
  reactivateAccount,
  type AccountDeletionState,
} from "@/lib/accountManagement";
import { requireInternet, showNetworkErrorIfNeeded } from "@/lib/network";
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
      ? "Deletion can no longer be changed"
      : "Welcome back";
  const message =
    phase === "expired" || phase === "completed"
      ? "The 30-day window for this account has ended. Please contact support if you need help."
      : `Your account was scheduled for deletion, but you can still keep it.${
          deadline ? ` Choose Keep my account before ${deadline} to keep your child profiles and saved progress.` : ""
        }`;

  return {
    canReactivate,
    message,
    primaryButtonLabel: canReactivate ? "Keep my account" : null,
    secondaryButtonLabel: canReactivate ? "Continue with deletion" : "Sign out",
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
  const [submittingAction, setSubmittingAction] = React.useState<
    "keep" | "continue-deletion" | "sign-out" | null
  >(null);
  const submitting = submittingAction !== null;

  const loadState = React.useCallback(async () => {
    setLoading(true);
    try {
      if (!(await requireInternet("Checking your account status"))) return;
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
      if (await showNetworkErrorIfNeeded(error, "Checking your account status")) return;
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
    setSubmittingAction("continue-deletion");
    try {
      await signOutFromDeletionStatus({
        setActiveChild,
        signOut: () => supabase.auth.signOut(),
        replace: (path) => router.replace(path),
      });
    } catch (error) {
      console.error("Could not sign out:", error);
      if (await showNetworkErrorIfNeeded(error, "Signing out")) return;
      Alert.alert("Could not sign out", "Please try again.");
    } finally {
      setSubmittingAction(null);
    }
  };

  const handleReactivate = async () => {
    if (submitting) return;

    setSubmittingAction("keep");
    try {
      if (!(await requireInternet("Reactivating your account"))) return;
      const result = await reactivateAccount();
      setActiveChild(null);
      Alert.alert(
        "Welcome back",
        result.restoredChildIds.length > 0
          ? "Your child profiles and saved progress are available again where possible."
          : "Your account is active again.",
        [{ text: "Continue", onPress: () => router.replace("/parent") }],
      );
    } catch (error) {
      console.error("Could not reactivate account:", error);
      if (await showNetworkErrorIfNeeded(error, "Reactivating your account")) return;
      Alert.alert(
        "Could not reactivate",
        "Please try again. If the problem continues, contact support.",
      );
    } finally {
      setSubmittingAction(null);
    }
  };

  const {
    canReactivate,
    message,
    primaryButtonLabel,
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
                <AppButton
                  label={primaryButtonLabel ?? "Keep my account"}
                  loadingLabel="Keeping account..."
                  icon="heart-outline"
                  onPress={handleReactivate}
                  loading={submittingAction === "keep"}
                  disabled={submitting && submittingAction !== "keep"}
                />
              )}

              <AppButton
                label={secondaryButtonLabel}
                loadingLabel={canReactivate ? "Continuing..." : "Signing out..."}
                variant={canReactivate ? "destructive" : "secondary"}
                className={canReactivate ? "mt-3" : ""}
                icon={canReactivate ? "trash-outline" : "log-out-outline"}
                onPress={signOut}
                loading={submittingAction === "continue-deletion"}
                disabled={submitting && submittingAction !== "continue-deletion"}
              />

              {showContactSupport && (
                <AppButton
                  label="Contact support"
                  variant="secondary"
                  className="mt-3"
                  icon="mail-outline"
                  onPress={contactSupport}
                  disabled={submitting}
                />
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
