import { useState } from "react";
import { Alert, StatusBar, TouchableOpacity, View } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { BrandMark } from "@/components/brand/BrandMark";
import { Text } from "@/components/StyledText";
import { brandColors } from "@/constants/Brand";
import {
  CONFIRMATION_EMAIL_RESENT_MESSAGE,
  EMAIL_NOT_CONFIRMED_MESSAGE,
  RESET_EMAIL_SENT_MESSAGE,
  SIGNUP_ACCEPTED_MESSAGE,
  SIGNUP_EXISTING_ACCOUNT_DETECTED_MESSAGE,
  getResendConfirmationErrorMessage,
} from "@/lib/authMessages";
import { SIGNUP_EMAIL_REDIRECT_URL } from "@/lib/authRedirects";
import { supabase } from "@/lib/supabase";

type CheckEmailFlow = "signup" | "signup-existing" | "reset" | "unverified";

const getFlow = (value: string | string[] | undefined): CheckEmailFlow => {
  const flow = Array.isArray(value) ? value[0] : value;
  if (flow === "signup-existing" || flow === "reset" || flow === "unverified") {
    return flow;
  }
  return "signup";
};

const getParam = (value: string | string[] | undefined): string =>
  (Array.isArray(value) ? value[0] : value)?.trim() ?? "";

export default function CheckEmail() {
  const router = useRouter();
  const params = useLocalSearchParams<{ flow?: string; email?: string }>();
  const flow = getFlow(params.flow);
  const email = getParam(params.email);
  const [resending, setResending] = useState(false);

  const isReset = flow === "reset";
  const isExistingAccount = flow === "signup-existing";
  const isUnverified = flow === "unverified";
  const canResendConfirmation = Boolean(email) && (flow === "signup" || isUnverified);

  const title = isExistingAccount
    ? "Sign in instead"
    : isUnverified
      ? "Confirm your email"
      : "Check your email";
  const message = isExistingAccount
    ? SIGNUP_EXISTING_ACCOUNT_DETECTED_MESSAGE
    : isUnverified
      ? EMAIL_NOT_CONFIRMED_MESSAGE
      : isReset
        ? RESET_EMAIL_SENT_MESSAGE
        : SIGNUP_ACCEPTED_MESSAGE;

  const primaryLabel = isExistingAccount ? "Sign in instead" : "Back to sign in";
  const secondaryLabel = isReset ? "Try another email" : "Use a different email";
  const iconName = isExistingAccount ? "user-circle" : isUnverified ? "lock" : "envelope";

  const goToLogin = () => {
    if (isReset) {
      router.replace({
        pathname: "/login",
        params: { resetRequested: "1" },
      } as any);
      return;
    }

    router.replace("/login");
  };

  const goToForm = () => {
    router.replace(isReset ? "/forgot-password" : "/signup");
  };

  const resendConfirmationEmail = async () => {
    if (!canResendConfirmation || resending) return;

    try {
      setResending(true);
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: {
          emailRedirectTo: SIGNUP_EMAIL_REDIRECT_URL,
        },
      });

      if (error) {
        Alert.alert("Could not resend email", getResendConfirmationErrorMessage(error));
        return;
      }

      Alert.alert("Email sent", CONFIRMATION_EMAIL_RESENT_MESSAGE);
    } catch (error) {
      Alert.alert("Could not resend email", getResendConfirmationErrorMessage(error));
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-primary-50">
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <View className="flex-1 items-center justify-center px-6">
        <BrandMark kind="wordmark" width={180} height={44} containerStyle={{ marginBottom: 28 }} />

        <View className="w-full rounded-3xl border-2 border-primary-100 bg-white p-6 shadow-md">
          <View className="items-center">
            <View className="mb-5 h-20 w-20 items-center justify-center rounded-full bg-primary-100">
              <FontAwesome
                name={iconName}
                size={38}
                color={isExistingAccount ? brandColors.shanaOrange : brandColors.victoriaBlue}
              />
            </View>

            <Text variant="bold" className="text-center text-2xl text-primary-700">
              {title}
            </Text>

            <Text className="mt-3 text-center text-base leading-6 text-neutral-600">
              {message}
            </Text>

            {email && !isExistingAccount ? (
              <Text className="mt-3 text-center text-sm leading-5 text-neutral-500">
                {email}
              </Text>
            ) : null}

            {!isExistingAccount ? (
              <Text className="mt-3 text-center text-sm leading-5 text-neutral-500">
                Check your inbox and spam folder, then return to sign in.
              </Text>
            ) : null}
          </View>

          <View className="mt-7">
            <TouchableOpacity
              className="mb-3 rounded-xl bg-primary-500 py-4 shadow-md"
              onPress={goToLogin}
              activeOpacity={0.84}
              accessibilityRole="button"
            >
              <Text variant="bold" className="text-center text-lg text-white">
                {primaryLabel}
              </Text>
            </TouchableOpacity>

            {canResendConfirmation ? (
              <TouchableOpacity
                className={`mb-3 rounded-xl bg-secondary-500 py-4 shadow-md ${resending ? "opacity-70" : ""}`}
                onPress={resendConfirmationEmail}
                disabled={resending}
                activeOpacity={0.84}
                accessibilityRole="button"
              >
                <Text variant="bold" className="text-center text-lg text-white">
                  {resending ? "Sending..." : "Resend email"}
                </Text>
              </TouchableOpacity>
            ) : null}

            {!isUnverified ? (
              <TouchableOpacity
                className="rounded-xl bg-white py-4 shadow-md border border-primary-200"
                onPress={goToForm}
                activeOpacity={0.84}
                accessibilityRole="button"
              >
                <Text variant="bold" className="text-center text-lg text-primary-700">
                  {secondaryLabel}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
