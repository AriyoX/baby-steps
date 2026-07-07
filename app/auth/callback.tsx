import { useCallback, useEffect, useRef, useState } from "react";
import { StatusBar, TouchableOpacity, View } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { BrandMark } from "@/components/brand/BrandMark";
import { Text } from "@/components/StyledText";
import { brandColors } from "@/constants/Brand";
import {
  clearLatestAuthRedirectUrl,
  getLatestAuthRedirectUrl,
  subscribeAuthRedirectUrls,
} from "@/lib/authRedirectEvents";
import {
  getFriendlyAuthRedirectErrorMessage,
  getAuthRedirectFlowFromUrl,
  getPostAuthRedirectRoute,
  handleSupabaseAuthRedirectUrl,
  type AuthRedirectFlow,
  isAuthRedirectUrl,
} from "@/lib/authRedirects";

type CallbackState = "checking" | "error";

export default function AuthCallback() {
  const router = useRouter();
  const [state, setState] = useState<CallbackState>("checking");
  const [errorFlow, setErrorFlow] = useState<AuthRedirectFlow | null>(null);
  const processedUrlRef = useRef<string | null>(null);

  const processAuthUrl = useCallback(
    async (url: string) => {
      if (processedUrlRef.current === url) return;

      processedUrlRef.current = url;
      setState("checking");
      setErrorFlow(getAuthRedirectFlowFromUrl(url));

      try {
        const result = await handleSupabaseAuthRedirectUrl(url);
        clearLatestAuthRedirectUrl(url);
        const route = await getPostAuthRedirectRoute(result);
        router.replace(route as any);
      } catch {
        clearLatestAuthRedirectUrl(url);
        setErrorFlow(getAuthRedirectFlowFromUrl(url));
        setState("error");
      }
    },
    [router],
  );

  useEffect(() => {
    let isMounted = true;

    const loadInitialUrl = async () => {
      const storedUrl = getLatestAuthRedirectUrl();
      if (storedUrl) {
        await processAuthUrl(storedUrl);
        return;
      }

      const initialUrl = await Linking.getInitialURL();
      if (!isMounted) return;

      if (initialUrl && isAuthRedirectUrl(initialUrl)) {
        await processAuthUrl(initialUrl);
      } else {
        setErrorFlow(null);
        setState("error");
      }
    };

    void loadInitialUrl();

    const unsubscribe = subscribeAuthRedirectUrls((url) => {
      void processAuthUrl(url);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [processAuthUrl]);

  const goToForgotPassword = () => {
    router.replace("/forgot-password");
  };

  const goToLogin = () => {
    router.replace("/login");
  };

  const goToSignup = () => {
    router.replace("/signup");
  };

  const errorMessage = getFriendlyAuthRedirectErrorMessage(errorFlow);
  const errorTitle =
    errorFlow === "recovery"
      ? "Reset link expired"
      : errorFlow === "signup"
        ? "Confirmation link expired"
        : "Link expired";

  return (
    <SafeAreaView className="flex-1 bg-primary-50">
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <View className="flex-1 items-center justify-center px-6">
        <BrandMark kind="wordmark" width={180} height={44} containerStyle={{ marginBottom: 28 }} />

        <View className="w-full rounded-3xl border-2 border-primary-100 bg-white p-6 shadow-md">
          <View className="items-center">
            <View className="mb-5 h-20 w-20 items-center justify-center rounded-full bg-primary-100">
              <FontAwesome
                name={state === "checking" ? "link" : "exclamation-circle"}
                size={38}
                color={state === "checking" ? brandColors.victoriaBlue : brandColors.shanaOrange}
              />
            </View>

            <Text variant="bold" className="text-center text-2xl text-primary-700">
              {state === "checking" ? "Opening Baby Steps..." : errorTitle}
            </Text>

            <Text className="mt-3 text-center text-base leading-6 text-neutral-600">
              {state === "checking" ? "Checking your link..." : errorMessage}
            </Text>
          </View>

          {state === "error" ? (
            <View className="mt-7">
              {errorFlow === "signup" ? (
                <TouchableOpacity
                  className="mb-3 rounded-xl bg-secondary-500 py-4 shadow-md"
                  onPress={goToSignup}
                  activeOpacity={0.84}
                >
                  <Text variant="bold" className="text-center text-lg text-white">
                    Create account
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  className="mb-3 rounded-xl bg-secondary-500 py-4 shadow-md"
                  onPress={goToForgotPassword}
                  activeOpacity={0.84}
                >
                  <Text variant="bold" className="text-center text-lg text-white">
                    Request a new link
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                className="rounded-xl bg-primary-500 py-4 shadow-md"
                onPress={goToLogin}
                activeOpacity={0.84}
              >
                <Text variant="bold" className="text-center text-lg text-white">
                  Back to Login
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}
