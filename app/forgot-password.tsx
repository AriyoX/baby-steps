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

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const router = useRouter();

  // Animation values
  const bounceValue = useRef(new Animated.Value(0)).current;
  const floatValue = useRef(new Animated.Value(0)).current;
  const scaleValue = useRef(new Animated.Value(0)).current;
  const spinValue = useRef(new Animated.Value(0)).current;

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

    // Spin animation for the key icon
    Animated.loop(
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
    ).start();
  }, []);

  async function resetPassword() {
    if (!email) {
      Alert.alert("Oops!", "Please enter your email address.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `babysteps://reset-password`,
    });

    if (error) {
      Alert.alert("Oops!", error.message);
    } else {
      setResetSent(true);
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

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-accent-50"
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
              className="w-12 h-12 rounded-full bg-accent-200 opacity-50"
              style={{ transform: [{ translateY: bounceDot1 }] }}
            />
          </View>
          <View className="absolute top-20 right-12">
            <Animated.View
              className="w-8 h-8 rounded-full bg-accent-300 opacity-60"
              style={{ transform: [{ translateY: bounceDot2 }] }}
            />
          </View>

          {/* Header */}
          <View className="items-center mt-12 mb-4">
            <Animated.View
              style={{
                transform: [{ translateY }, { scale: scaleValue }],
              }}
            >
              <Text variant="bold" className="text-3xl  text-accent-700 ps-3 pt-3">
                Forgot Your Password?
              </Text>
              <Text className="text-lg text-center text-neutral-600 mt-3 px-8">
                No worries! We'll send a reset link to your email.
              </Text>
            </Animated.View>
          </View>

          {/* Animated icon */}
          <View className="items-center my-8">
            <Animated.View
              className="w-32 h-32 bg-white rounded-full items-center justify-center shadow-lg border-4 border-accent-200"
              style={{
                transform: [{ translateY }, { scale: scaleValue }],
              }}
            >
              {!resetSent ? (
                <Animated.View style={{ transform: [{ rotate: spin }] }}>
                  <FontAwesome name="key" size={60} color="#b559e6" />
                </Animated.View>
              ) : (
                <Text className="text-[60px]">✉️</Text>
              )}
            </Animated.View>
          </View>

          {/* Form */}
          <Animated.View
            className="mx-6 bg-white p-6 rounded-3xl shadow-md border-2 border-accent-100"
            style={{
              transform: [{ scale: scaleValue }],
              opacity: scaleValue,
            }}
          >
            {!resetSent ? (
              <>
                {/* Email Input */}
                <View className="mb-8">
                  <Text className="text-accent-700  mb-3 text-lg">
                    Your Email
                  </Text>
                  <View className="flex-row items-center bg-accent-50 rounded-2xl px-5 py-4 border-2 border-accent-100">
                    <View className="bg-accent-200 w-10 h-10 rounded-full flex items-center justify-center">
                      <FontAwesome name="envelope" size={20} color="#b559e6" />
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

                {/* Reset Button */}
                <TouchableOpacity
                  className={`bg-accent-500 py-4 rounded-xl items-center shadow-md ${
                    loading ? "opacity-70" : ""
                  }`}
                  onPress={resetPassword}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <Text variant="bold" className="text-white  text-xl">
                    {loading ? "Sending..." : "Send Reset Link"}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              /* Success Message */
              <View className="items-center py-4">
                <View className="bg-success-100 p-4 rounded-2xl mb-4 w-full">
                  <Text className="text-success-700 text-center text-base">
                    Reset link sent! Check your email inbox or spam for instructions.
                  </Text>
                </View>
                <TouchableOpacity
                  className="bg-accent-500 py-4 rounded-xl items-center shadow-md w-full"
                  onPress={() => router.replace("/login")}
                >
                  <Text variant="bold" className="text-white  text-xl">
                    Back to Login
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Back to Login */}
            {!resetSent && (
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
            )}
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
