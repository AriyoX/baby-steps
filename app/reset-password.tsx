import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { BrandMark } from "@/components/brand/BrandMark";
import { Text } from "@/components/StyledText";
import { brandColors } from "@/constants/Brand";
import {
  keyboardAwareScrollContentStyle,
  readableTextInputStyle,
} from "@/constants/formStyles";
import { supabase } from "../lib/supabase";

export default function ResetPassword() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [passwordSent, setPasswordSent] = useState(false);

  const bounceValue = useRef(new Animated.Value(0)).current;
  const floatValue = useRef(new Animated.Value(0)).current;
  const scaleValue = useRef(new Animated.Value(0)).current;
  const spinValue = useRef(new Animated.Value(0)).current;
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

    const spinAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(spinValue, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    );

    floatAnimation.start();
    dotAnimation.start();
    spinAnimation.start();

    return () => {
      floatAnimation.stop();
      dotAnimation.stop();
      spinAnimation.stop();
    };
  }, [bounceValue, floatValue, scaleValue, spinValue]);

  const handleResetPassword = async () => {
    if (!password || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        throw error;
      }

      setPasswordSent(true);
    } catch (error: any) {
      Alert.alert("Error", error.message || "An error occurred while resetting your password");
    } finally {
      setLoading(false);
    }
  };

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

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "padding"}
      className="flex-1 bg-secondary-50"
    >
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={keyboardAwareScrollContentStyle}
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="absolute top-20 left-8">
            <Animated.View
              className="w-12 h-12 rounded-full bg-secondary-200 opacity-50"
              style={{ transform: [{ translateY: bounceDot1 }] }}
            />
          </View>
          <View className="absolute top-20 right-12">
            <Animated.View
              className="w-8 h-8 rounded-full bg-secondary-300 opacity-60"
              style={{ transform: [{ translateY: bounceDot2 }] }}
            />
          </View>

          <View className="items-center mt-14 mb-4">
            <BrandMark kind="wordmark" width={174} height={42} containerStyle={{ marginBottom: 12 }} />
            <Animated.View style={{ transform: [{ translateY }, { scale: scaleValue }] }}>
              <Text variant="bold" className="text-3xl text-secondary-700 pt-3 text-center">
                Reset Password
              </Text>
              <Text className="text-lg text-center text-neutral-600 mt-3 px-8">
                Enter your new password
              </Text>
            </Animated.View>
          </View>

          <View className="items-center my-8">
            <Animated.View
              className="w-32 h-32 bg-white rounded-full items-center justify-center shadow-lg border-4 border-secondary-200"
              style={{ transform: [{ translateY }, { scale: scaleValue }] }}
            >
              {!passwordSent ? (
                <Animated.View style={{ transform: [{ rotate: spin }] }}>
                  <FontAwesome name="lock" size={60} color={brandColors.shanaOrange} />
                </Animated.View>
              ) : (
                <FontAwesome name="check-circle" size={64} color={brandColors.success} />
              )}
            </Animated.View>
          </View>

          <Animated.View
            className="mx-6 bg-white p-6 rounded-3xl shadow-md border-2 border-secondary-100"
            style={{ transform: [{ scale: scaleValue }], opacity: scaleValue }}
          >
            {!passwordSent ? (
              <>
                <View className="mb-5">
                  <Text className="text-secondary-700 mb-3 text-lg">New Password</Text>
                  <View className="flex-row items-center bg-secondary-50 rounded-2xl px-5 py-4 border-2 border-secondary-100">
                    <View className="bg-secondary-200 w-10 h-10 rounded-full items-center justify-center">
                      <FontAwesome name="lock" size={20} color={brandColors.shanaOrange} />
                    </View>
                    <TextInput
                      className="flex-1 ml-4 text-lg text-neutral-800"
                      placeholder="Enter new password"
                      value={password}
                      onChangeText={setPassword}
                      autoCapitalize="none"
                      autoComplete="new-password"
                      autoCorrect={false}
                      onFocus={() => scrollToInput(220)}
                      secureTextEntry
                      placeholderTextColor={brandColors.neutral[400]}
                      returnKeyType="next"
                      style={readableTextInputStyle}
                      textContentType="newPassword"
                    />
                  </View>
                </View>

                <View className="mb-5">
                  <Text className="text-secondary-700 mb-3 text-lg">Confirm New Password</Text>
                  <View className="flex-row items-center bg-secondary-50 rounded-2xl px-5 py-4 border-2 border-secondary-100">
                    <View className="bg-secondary-200 w-10 h-10 rounded-full items-center justify-center">
                      <FontAwesome name="lock" size={20} color={brandColors.shanaOrange} />
                    </View>
                    <TextInput
                      className="flex-1 ml-4 text-lg text-neutral-800"
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry
                      autoCapitalize="none"
                      autoComplete="new-password"
                      autoCorrect={false}
                      onFocus={() => scrollToInput(300)}
                      placeholderTextColor={brandColors.neutral[400]}
                      returnKeyType="done"
                      style={readableTextInputStyle}
                      textContentType="newPassword"
                    />
                  </View>
                </View>

                <TouchableOpacity
                  className={`bg-secondary-500 py-4 rounded-xl items-center shadow-md ${loading ? "opacity-70" : ""}`}
                  onPress={handleResetPassword}
                  disabled={loading}
                  activeOpacity={0.84}
                >
                  <Text variant="bold" className="text-white text-xl">
                    {loading ? "Updating..." : "Reset Password"}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <View className="items-center py-4">
                <View className="bg-success-100 p-4 rounded-2xl mb-4 w-full">
                  <Text className="text-success-700 text-center text-base">
                    Your new password has been set.
                  </Text>
                </View>
                <TouchableOpacity
                  className="bg-primary-500 py-4 rounded-xl items-center shadow-md w-full"
                  onPress={() => router.replace("/login")}
                  activeOpacity={0.84}
                >
                  <Text variant="bold" className="text-white text-xl">
                    Back to Login
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {!passwordSent && (
              <View className="mt-8 items-center">
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
            )}
          </Animated.View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}
