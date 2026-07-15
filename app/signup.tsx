import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { BrandMark } from "@/components/brand/BrandMark";
import { Text } from "@/components/StyledText";
import { brandColors } from "@/constants/Brand";
import {
  keyboardAwareScrollContentStyle,
  readableTextInputStyle,
} from "@/constants/formStyles";
import {
  getSignUpErrorMessage,
  isExistingAccountSignUpError,
  isSignUpExistingAccountResponse,
  validateSignUpForm,
} from "@/lib/authMessages";
import { SIGNUP_EMAIL_REDIRECT_URL } from "@/lib/authRedirects";
import { supabase } from "../lib/supabase";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const bounceValue = useRef(new Animated.Value(0)).current;
  const floatValue = useRef(new Animated.Value(0)).current;
  const scaleValue = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView | null>(null);

  useEffect(() => {
    Animated.spring(scaleValue, {
      toValue: 1,
      tension: 20,
      friction: 7,
      useNativeDriver: true,
    }).start();

    const floatAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(floatValue, {
          toValue: 1,
          duration: 2200,
          useNativeDriver: true,
        }),
        Animated.timing(floatValue, {
          toValue: 0,
          duration: 2200,
          useNativeDriver: true,
        }),
      ])
    );

    const dotAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(bounceValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    floatAnimation.start();
    dotAnimation.start();

    return () => {
      floatAnimation.stop();
      dotAnimation.stop();
    };
  }, [bounceValue, floatValue, scaleValue]);

  async function signUpWithEmail() {
    const validationMessage = validateSignUpForm(email, password, confirmPassword);
    if (validationMessage) {
      Alert.alert("Let's check that", validationMessage);
      return;
    }

    const trimmedEmail = email.trim();
    const goToCheckEmail = (flow: "signup" | "signup-existing") => {
      router.replace({
        pathname: "/check-email",
        params: { flow, email: trimmedEmail },
      } as any);
    };
    const goToNotificationPermission = () => {
      router.replace({
        pathname: "/notification-permission",
        params: { flow: "signup", email: trimmedEmail },
      } as any);
    };

    try {
      setLoading(true);
      const {
        data,
        error,
      } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          emailRedirectTo: SIGNUP_EMAIL_REDIRECT_URL,
        },
      });

      if (error) {
        if (isExistingAccountSignUpError(error)) {
          goToCheckEmail("signup-existing");
          return;
        }

        Alert.alert("Could not create account", getSignUpErrorMessage(error));
        return;
      }

      if (isSignUpExistingAccountResponse(data)) {
        goToCheckEmail("signup-existing");
        return;
      }

      if (data.session) {
        const { error: signOutError } = await supabase.auth.signOut({ scope: "local" });
        if (signOutError) {
          console.warn("Could not clear signup session after account creation.");
        }
      }

      goToNotificationPermission();
    } catch (error) {
      console.error("Could not create account.");
      Alert.alert("Could not create account", getSignUpErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  const scrollToInput = (y: number) => {
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y, animated: true });
    }, 80);
  };

  const translateY = floatValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -12],
  });

  const bounceDot1 = bounceValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });

  const bounceDot2 = bounceValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, -14, 0],
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "padding"}
      className="flex-1 bg-[#F8F6F1]"
    >
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      <SafeAreaView className="flex-1">
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={keyboardAwareScrollContentStyle}
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="absolute top-10 left-8">
            <Animated.View
              className="w-12 h-12 rounded-full bg-secondary-200 opacity-50"
              style={{ transform: [{ translateY: bounceDot1 }] }}
            />
          </View>
          <View className="absolute top-20 right-12">
            <Animated.View
              className="w-8 h-8 rounded-full bg-primary-300 opacity-60"
              style={{ transform: [{ translateY: bounceDot2 }] }}
            />
          </View>

          <View className="items-center mt-7 mb-3 px-6">
            <BrandMark kind="wordmark" width={156} height={38} containerStyle={{ marginBottom: 18 }} />
            <Animated.View style={{ transform: [{ translateY }, { scale: scaleValue }] }}>
              <Text variant="bold" className="text-[32px] leading-10 text-neutral-900 pt-2 text-center">
                Grow together
              </Text>
              <Text className="text-base text-center text-neutral-600 mt-2 leading-6">
                One parent account keeps every child’s journey safe and in one place.
              </Text>
            </Animated.View>
          </View>

          <View className="items-center my-3">
            <Animated.View
              className="w-24 h-24 bg-white rounded-[28px] items-center justify-center shadow-sm border border-secondary-100 overflow-hidden"
              style={{ transform: [{ translateY }, { scale: scaleValue }] }}
            >
              <BrandMark kind="mascot" width={58} height={78} />
            </Animated.View>
          </View>

          <Animated.View
            className="mx-5 bg-white p-5 rounded-[28px] shadow-sm border border-secondary-100"
            style={{ transform: [{ scale: scaleValue }], opacity: scaleValue }}
          >
            <View className="mb-5">
              <Text variant="bold" className="text-neutral-700 mb-2 text-sm">Email address</Text>
              <View className="flex-row items-center bg-neutral-50 rounded-2xl px-4 border border-neutral-200 min-h-[58px]">
                <View className="bg-secondary-100 w-9 h-9 rounded-xl items-center justify-center">
                  <FontAwesome name="envelope" size={20} color={brandColors.shanaOrange} />
                </View>
                <TextInput
                  className="flex-1 ml-4 text-lg text-neutral-800"
                  placeholder="parent@email.com"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect={false}
                  keyboardType="email-address"
                  onFocus={() => scrollToInput(150)}
                  placeholderTextColor={brandColors.neutral[400]}
                  returnKeyType="next"
                  style={readableTextInputStyle}
                  textContentType="emailAddress"
                />
              </View>
            </View>

            <View className="mb-5">
              <Text variant="bold" className="text-neutral-700 mb-2 text-sm">Password</Text>
              <View className="flex-row items-center bg-neutral-50 rounded-2xl px-4 border border-neutral-200 min-h-[58px]">
                <View className="bg-secondary-100 w-9 h-9 rounded-xl items-center justify-center">
                  <FontAwesome name="lock" size={20} color={brandColors.shanaOrange} />
                </View>
                <TextInput
                  className="flex-1 ml-4 text-lg text-neutral-800"
                  placeholder="Create password"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  autoCapitalize="none"
                  autoComplete="new-password"
                  autoCorrect={false}
                  onFocus={() => scrollToInput(240)}
                  placeholderTextColor={brandColors.neutral[400]}
                  returnKeyType="next"
                  style={readableTextInputStyle}
                  textContentType="newPassword"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} className="px-2">
                  <FontAwesome
                    name={showPassword ? "eye-slash" : "eye"}
                    size={20}
                    color={brandColors.shanaOrange}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View className="mb-8">
              <Text variant="bold" className="text-neutral-700 mb-2 text-sm">Confirm password</Text>
              <View className="flex-row items-center bg-neutral-50 rounded-2xl px-4 border border-neutral-200 min-h-[58px]">
                <View className="bg-secondary-100 w-9 h-9 rounded-xl items-center justify-center">
                  <FontAwesome name="check-circle" size={20} color={brandColors.shanaOrange} />
                </View>
                <TextInput
                  className="flex-1 ml-4 text-lg text-neutral-800"
                  placeholder="Confirm password"
                  secureTextEntry={!showPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  autoCapitalize="none"
                  autoComplete="new-password"
                  autoCorrect={false}
                  onFocus={() => scrollToInput(320)}
                  placeholderTextColor={brandColors.neutral[400]}
                  returnKeyType="done"
                  style={readableTextInputStyle}
                  textContentType="newPassword"
                />
              </View>
            </View>

            <TouchableOpacity
              className={`bg-secondary-500 min-h-[56px] rounded-2xl items-center justify-center shadow-sm ${loading ? "opacity-70" : ""}`}
              onPress={signUpWithEmail}
              disabled={loading}
              activeOpacity={0.84}
            >
              <Text variant="bold" className="text-white text-xl">
                {loading ? "Creating Account..." : "Create Parent Account"}
              </Text>
            </TouchableOpacity>

            <View className="flex-row items-center justify-center mt-5 pt-5 border-t border-neutral-100">
              <FontAwesome name="shield" size={14} color={brandColors.neutral[500]} />
              <Text className="text-xs text-neutral-500 ml-2">Your child never needs an email address</Text>
            </View>

            <View className="mt-5 items-center">
              <TouchableOpacity className="flex-row items-center" onPress={() => router.replace("/login")}>
                <FontAwesome
                  name="arrow-left"
                  size={16}
                  color={brandColors.victoriaBlue}
                  style={{ marginRight: 6 }}
                />
                <Text variant="bold" className="text-primary-600 text-base">
                  Back to Login
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
