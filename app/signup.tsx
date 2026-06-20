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
    if (password !== confirmPassword) {
      Alert.alert("Oops!", "Passwords don't match. Please try again.");
      return;
    }

    setLoading(true);
    const {
      data: { session },
      error,
    } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      Alert.alert("Oops!", error.message);
    } else if (!session) {
      Alert.alert("Almost there!", "Please check your email to verify your account!");
    }
    setLoading(false);
  }

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
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-secondary-50"
    >
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      <SafeAreaView className="flex-1">
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
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

          <View className="items-center mt-8 mb-4">
            <BrandMark kind="wordmark" width={180} height={44} containerStyle={{ marginBottom: 12 }} />
            <Animated.View style={{ transform: [{ translateY }, { scale: scaleValue }] }}>
              <Text variant="bold" className="text-4xl text-secondary-600 pt-3 text-center">
                Join the Fun!
              </Text>
              <Text className="text-lg text-center text-neutral-600 mt-2">
                Create a new account for your child
              </Text>
            </Animated.View>
          </View>

          <View className="items-center my-6">
            <Animated.View
              className="w-32 h-32 bg-white rounded-full items-center justify-center shadow-lg border-4 border-secondary-200 overflow-hidden"
              style={{ transform: [{ translateY }, { scale: scaleValue }] }}
            >
              <BrandMark kind="mascot" width={78} height={104} />
            </Animated.View>
          </View>

          <Animated.View
            className="mx-6 bg-white p-6 rounded-3xl shadow-md border-2 border-secondary-100"
            style={{ transform: [{ scale: scaleValue }], opacity: scaleValue }}
          >
            <View className="mb-5">
              <Text className="text-secondary-700 mb-3 text-lg">Email</Text>
              <View className="flex-row items-center bg-secondary-50 rounded-2xl px-5 py-4 border-2 border-secondary-100">
                <View className="bg-secondary-200 w-10 h-10 rounded-full items-center justify-center">
                  <FontAwesome name="envelope" size={20} color={brandColors.shanaOrange} />
                </View>
                <TextInput
                  className="flex-1 ml-4 text-base text-neutral-800"
                  placeholder="parent@email.com"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholderTextColor={brandColors.neutral[400]}
                  style={{ textDecorationLine: "none", fontFamily: "Quicksand-Regular" }}
                />
              </View>
            </View>

            <View className="mb-5">
              <Text className="text-secondary-700 mb-3 text-lg">Password</Text>
              <View className="flex-row items-center bg-secondary-50 rounded-2xl px-5 py-4 border-2 border-secondary-100">
                <View className="bg-secondary-200 w-10 h-10 rounded-full items-center justify-center">
                  <FontAwesome name="lock" size={20} color={brandColors.shanaOrange} />
                </View>
                <TextInput
                  className="flex-1 ml-4 text-base text-neutral-800"
                  placeholder="Create password"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  autoCapitalize="none"
                  placeholderTextColor={brandColors.neutral[400]}
                  style={{ textDecorationLine: "none", fontFamily: "Quicksand-Regular" }}
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
              <Text className="text-secondary-700 mb-3 text-lg">Confirm Password</Text>
              <View className="flex-row items-center bg-secondary-50 rounded-2xl px-5 py-4 border-2 border-secondary-100">
                <View className="bg-secondary-200 w-10 h-10 rounded-full items-center justify-center">
                  <FontAwesome name="check-circle" size={20} color={brandColors.shanaOrange} />
                </View>
                <TextInput
                  className="flex-1 ml-4 text-base text-neutral-800"
                  placeholder="Confirm password"
                  secureTextEntry={!showPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  autoCapitalize="none"
                  placeholderTextColor={brandColors.neutral[400]}
                  style={{ textDecorationLine: "none", fontFamily: "Quicksand-Regular" }}
                />
              </View>
            </View>

            <TouchableOpacity
              className={`bg-secondary-500 py-4 rounded-xl items-center shadow-md ${loading ? "opacity-70" : ""}`}
              onPress={signUpWithEmail}
              disabled={loading}
              activeOpacity={0.84}
            >
              <Text variant="bold" className="text-white text-xl">
                {loading ? "Creating Account..." : "Create Account"}
              </Text>
            </TouchableOpacity>

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
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
