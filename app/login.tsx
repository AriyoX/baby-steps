import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Alert,
  TouchableOpacity,
  Animated,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
} from "react-native";
import { Text } from "@/components/StyledText";
import { supabase } from "../lib/supabase";
import { useRouter } from "expo-router";
import { resetOnboardingStatus } from "@/lib/utils";
import { SafeAreaView } from "react-native-safe-area-context";
import { FontAwesome } from "@expo/vector-icons";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // Add this state for password visibility
  const router = useRouter();

  // Animation values
  const bounceValue = useRef(new Animated.Value(0)).current;
  const floatValue = useRef(new Animated.Value(0)).current;
  const scaleValue = useRef(new Animated.Value(0)).current;

  // Set up animations
  useEffect(() => {
    // Entrance animation
    Animated.spring(scaleValue, {
      toValue: 1,
      tension: 20,
      friction: 7,
      useNativeDriver: true,
    }).start();

    // Floating animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatValue, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(floatValue, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Bounce animation for decorative elements
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceValue, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(bounceValue, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  async function signInWithEmail() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      Alert.alert("Oops!", error.message);
    } else {
      router.replace("/parent");
    }

    setLoading(false);
  }

  // Animation transformations
  const translateY = floatValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -15],
  });

  const bounceDot1 = bounceValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });

  const bounceDot2 = bounceValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, -14, 0],
  });

  const bounceDot3 = bounceValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, -6, 0],
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-primary-50"
    >
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="dark-content"
      />

      <SafeAreaView className="flex-1">
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Decorative elements */}
          <View className="absolute top-5 left-5">
            <Animated.View
              className="w-12 h-12 rounded-full bg-primary-200 opacity-50"
              style={{ transform: [{ translateY: bounceDot1 }] }}
            />
          </View>
          <View className="absolute top-10 right-10">
            <Animated.View
              className="w-8 h-8 rounded-full bg-secondary-300 opacity-60"
              style={{ transform: [{ translateY: bounceDot2 }] }}
            />
          </View>
          <View className="absolute bottom-20 left-20">
            <Animated.View
              className="w-10 h-10 rounded-full bg-accent-200 opacity-50"
              style={{ transform: [{ translateY: bounceDot3 }] }}
            />
          </View>

          {/* Header */}
          <View className="items-center mt-8 mb-4">
            <Animated.View
              style={{
                transform: [{ translateY }, { scale: scaleValue }],
              }}
            >
              <Text variant="bold" className="text-4xl  text-primary-600 pt-3">
                Welcome Back!
              </Text>
              <Text className="text-lg text-center text-neutral-600 mt-2">
                Let's continue your adventure!
              </Text>
            </Animated.View>
          </View>

          {/* Mascot image */}
          <View className="items-center my-6">
            <Animated.View
              className="w-36 h-36 bg-white rounded-full items-center justify-center shadow-lg border-4 border-primary-200"
              style={{
                transform: [{ translateY }, { scale: scaleValue }],
              }}
            >
              <Text className="text-[70px]">👶</Text>
            </Animated.View>
          </View>

          {/* Login Form */}
          <Animated.View
            className="mx-6 bg-white p-6 rounded-3xl shadow-md border-2 border-primary-100"
            style={{
              transform: [{ scale: scaleValue }],
              opacity: scaleValue,
            }}
          >
            {/* Email Input - Redesigned */}
            <View className="mb-6">
              <Text className="text-primary-700  mb-3 text-lg">Email</Text>
              <View className="flex-row items-center bg-primary-50 rounded-2xl px-5 py-4 border-2 border-primary-100">
                <View className="bg-primary-200 p-2 rounded-full">
                  <FontAwesome name="envelope" size={20} color="#3399ff" />
                </View>
                <TextInput
                  className="flex-1 ml-4 text-base text-neutral-800"
                  placeholder="parent@email.com"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholderTextColor="#a0aec0"
                  style={{
                    textDecorationLine: "none",
                    fontFamily: "Atma-Regular",
                  }}
                />
              </View>
            </View>

            {/* Password Input - Redesigned */}
            <View className="mb-8">
              <Text className="text-primary-700  mb-3 text-lg">Password</Text>
              <View className="flex-row items-center bg-primary-50 rounded-2xl px-5 py-4 border-2 border-primary-100">
                <View className="bg-primary-200 w-10 h-10 rounded-full flex items-center justify-center">
                  <FontAwesome name="lock" size={20} color="#3399ff" />
                </View>
                <TextInput
                  className="flex-1 ml-4 text-base text-neutral-800"
                  placeholder="Your password"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  autoCapitalize="none"
                  placeholderTextColor="#a0aec0"
                  style={{
                    textDecorationLine: "none",
                    fontFamily: "Atma-Regular",
                  }}
                />
                {/* Password visibility toggle button */}
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  className="px-2"
                >
                  <FontAwesome
                    name={showPassword ? "eye-slash" : "eye"}
                    size={20}
                    color="#3399ff"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Sign In Button */}
            <TouchableOpacity
              className={`bg-primary-500 py-4 rounded-xl items-center shadow-md ${
                loading ? "opacity-70" : ""
              }`}
              onPress={signInWithEmail}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text variant="bold" className="text-white  text-xl">
                {loading ? "Signing In..." : "Sign In"}
              </Text>
            </TouchableOpacity>

            {/* Extra options row */}
            <View className="flex-row items-center justify-between mt-6 px-2">
              {/* Forgot Password */}
              <TouchableOpacity
                onPress={() => router.replace("/forgot-password")}
              >
                <Text variant="bold" className="text-secondary-600  text-base">
                  Forgot password?
                </Text>
              </TouchableOpacity>

              {/* Sign Up Link */}
              <TouchableOpacity onPress={() => router.replace("/signup")}>
                <Text variant="bold" className="text-primary-600  text-base">
                  Create Account
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Developer Options - Hidden for Production */}
          {/* <View className="mt-8 mx-6">
            <TouchableOpacity
              className="bg-muted-200 py-3 rounded-xl items-center"
              onPress={() => resetOnboardingStatus()}
              disabled={loading}
            >
              <Text className="text-neutral-600 font-bold">
                Reset Onboarding
              </Text>
            </TouchableOpacity>
          </View> */}
          <View className="mt-8 mx-6">
            <TouchableOpacity
              className="bg-muted-200 py-3 rounded-xl items-center"
              onPress={() => router.push("/reset-password")}
              disabled={loading}
            >
              <Text className="text-orange-600 font-bold">Reset Password</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
