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
import { FontAwesome } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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

  async function signUpWithEmail() {
    // Validate passwords match
    if (password !== confirmPassword) {
      Alert.alert("Oops!", "Passwords don't match. Please try again.");
      return;
    }

    setLoading(true);
    const {
      data: { session },
      error,
    } = await supabase.auth.signUp({
      email: email,
      password: password,
    });

    if (error) {
      Alert.alert("Oops!", error.message);
    } else if (!session) {
      Alert.alert(
        "Almost there!",
        "Please check your email to verify your account!"
      );
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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-secondary-50"
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

          {/* Header */}
          <View className="items-center mt-8 mb-4">
            <Animated.View
              style={{
                transform: [{ translateY }, { scale: scaleValue }],
              }}
            >
              <Text variant="bold" className="text-4xl text-secondary-600 pt-3">
                Join the Fun!
              </Text>
              <Text className="text-lg text-center text-neutral-600 mt-2">
                Create a new account for your child
              </Text>
            </Animated.View>
          </View>

          {/* Mascot image */}
          <View className="items-center my-6">
            <Animated.View
              className="w-32 h-32 bg-white rounded-full items-center justify-center shadow-lg border-4 border-secondary-200"
              style={{
                transform: [{ translateY }, { scale: scaleValue }],
              }}
            >
              <Text className="text-[60px]">🧒</Text>
            </Animated.View>
          </View>

          {/* Signup Form */}
          <Animated.View
            className="mx-6 bg-white p-6 rounded-3xl shadow-md border-2 border-secondary-100"
            style={{
              transform: [{ scale: scaleValue }],
              opacity: scaleValue,
            }}
          >
            {/* Email Input */}
            <View className="mb-5">
              <Text className="text-secondary-700 mb-3 text-lg">Email</Text>
              <View className="flex-row items-center bg-secondary-50 rounded-2xl px-5 py-4 border-2 border-secondary-100">
                <View className="bg-secondary-200 w-10 h-10 rounded-full flex items-center justify-center">
                  <FontAwesome name="envelope" size={20} color="#ffb347" />
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

            {/* Password Input */}
            <View className="mb-5">
              <Text className="text-secondary-700 mb-3 text-lg">Password</Text>
              <View className="flex-row items-center bg-secondary-50 rounded-2xl px-5 py-4 border-2 border-secondary-100">
                <View className="bg-secondary-200 w-10 h-10 rounded-full flex items-center justify-center">
                  <FontAwesome name="lock" size={20} color="#ffb347" />
                </View>
                <TextInput
                  className="flex-1 ml-4 text-base text-neutral-800"
                  placeholder="Create password"
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
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  className="px-2"
                >
                  <FontAwesome
                    name={showPassword ? "eye-slash" : "eye"}
                    size={20}
                    color="#ffb347"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password Input */}
            <View className="mb-8">
              <Text className="text-secondary-700 mb-3 text-lg">
                Confirm Password
              </Text>
              <View className="flex-row items-center bg-secondary-50 rounded-2xl px-5 py-4 border-2 border-secondary-100">
                <View className="bg-secondary-200 w-10 h-10 rounded-full flex items-center justify-center">
                  <FontAwesome name="check-circle" size={20} color="#ffb347" />
                </View>
                <TextInput
                  className="flex-1 ml-4 text-base text-neutral-800"
                  placeholder="Confirm password"
                  secureTextEntry={!showPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  autoCapitalize="none"
                  placeholderTextColor="#a0aec0"
                  style={{
                    textDecorationLine: "none",
                    fontFamily: "Atma-Regular",
                  }}
                />
              </View>
            </View>

            {/* Sign Up Button */}
            <TouchableOpacity
              className={`bg-secondary-500 py-4 rounded-xl items-center shadow-md ${
                loading ? "opacity-70" : ""
              }`}
              onPress={signUpWithEmail}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text variant="bold" className="text-white  text-xl">
                {loading ? "Creating Account..." : "Create Account"}
              </Text>
            </TouchableOpacity>

            {/* Back to Login */}
            <View className="mt-8 items-center">
              <TouchableOpacity
                className="flex-row items-center"
                onPress={() => router.replace("/login")}
              >
                <FontAwesome
                  name="arrow-left"
                  size={16}
                  color="#3399ff"
                  style={{ marginRight: 6 }}
                />
                <Text variant="bold" className="text-primary-600  text-base">
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
