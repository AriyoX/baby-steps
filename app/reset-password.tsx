import { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  Animated,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
  StatusBar,
  ScrollView,
} from "react-native";
import { Text } from "@/components/StyledText";
import { FontAwesome } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Linking from "expo-linking";

export default function ResetPassword() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [passwordSent, setPasswordSent] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);

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

  // Handle deep link when the app is opened from the reset password email
  useEffect(() => {
    const handleDeepLink = (url: string) => {
      if (!url) return;

      // Parse the URL
      const { queryParams } = Linking.parse(url);

      if (queryParams && queryParams.access_token) {
        if (typeof queryParams.access_token === 'string') {
          setAccessToken(queryParams.access_token);
        }
        console.log(
          "Received access token from deep link:",
          queryParams.access_token
        );

        // You might want to verify the token here
        // This depends on your specific authentication flow
      }
    };

    const getInitialURL = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        handleDeepLink(initialUrl);
      }
    };
    
    getInitialURL();
    const linkingListener = Linking.addEventListener("url", (event) => {
      handleDeepLink(event.url);
    });

   return () => {
     linkingListener.remove();
   };
  }, []);
  
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

      // Update the user's password
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        throw error;
      } else {
        setPasswordSent(true);
      }
      
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.message || "An error occurred while resetting your password"
      );
    } finally {
      setLoading(false);
    }
  };

  const checkUserSession = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      // No active session, redirect to login
      Alert.alert(
        "Error",
        "Your reset link has expired. Please request a new one."
      );
      router.replace("/forgot-password");
    }
  };

  

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-orange-100"
    >
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="dark-content"
      />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Decorative elements */}
          <View className="absolute top-20 left-8">
            <Animated.View
              className="w-12 h-12 rounded-full bg-orange-200 opacity-50"
              style={{ transform: [{ translateY: bounceDot1 }] }}
            />
          </View>
          <View className="absolute top-20 right-12">
            <Animated.View
              className="w-8 h-8 rounded-full bg-orange-300 opacity-60"
              style={{ transform: [{ translateY: bounceDot2 }] }}
            />
          </View>
          {/* Header */}
          <View className="items-center mt-14 mb-4">
            <Animated.View
              style={{
                transform: [{ translateY }, { scale: scaleValue }],
              }}
            >
              <Text
                variant="bold"
                className="text-3xl  text-orange-500 ps-3 pt-3"
              >
                Reset Password
              </Text>
              <Text className="text-lg text-center text-neutral-600 mt-3 px-8">
                Enter your new password
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
              {!passwordSent ? (
                <Animated.View style={{ transform: [{ rotate: spin }] }}>
                  <FontAwesome name="lock" size={60} color="#b559e6" />
                </Animated.View>
              ) : (
                <Text className="text-[60px]">✉️</Text>
              )}
            </Animated.View>
          </View>

          {/* {Form} */}
          <Animated.View
            className="mx-6 bg-white p-6 rounded-3xl shadow-md border-2 border-orange-100"
            style={{
              transform: [{ scale: scaleValue }],
              opacity: scaleValue,
            }}
          >
            {!passwordSent ? (
              <>
                <View className="mb-5">
                  <Text className="text-orange-700  mb-3 text-lg">
                    New Password
                  </Text>
                  <View className="flex-row items-center bg-orange-50 rounded-2xl px-5 py-4 border-2 border-orange-100">
                    <View className="bg-orange-200 w-10 h-10 rounded-full flex items-center justify-center">
                      <FontAwesome name="lock" size={20} color="#b559e6" />
                    </View>
                    <TextInput
                      className="flex-1 ml-4 text-base text-neutral-800"
                      placeholder="Enter new password"
                      value={password}
                      onChangeText={setPassword}
                      autoCapitalize="none"
                      secureTextEntry
                      placeholderTextColor="#a0aec0"
                      style={{
                        textDecorationLine: "none",
                        fontFamily: "Atma-Regular",
                      }}
                    />
                  </View>
                </View>

                <View className="mb-5">
                  <Text className="text-orange-700  mb-3 text-lg">
                    Confirm New Password
                  </Text>
                  <View className="flex-row items-center bg-orange-50 rounded-2xl px-5 py-4 border-2 border-orange-100">
                    <View className="bg-orange-200 w-10 h-10 rounded-full flex items-center justify-center">
                      <FontAwesome name="lock" size={20} color="#b559e6" />
                    </View>
                    <TextInput
                      className="flex-1 ml-4 text-base text-neutral-800"
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry
                      autoCapitalize="none"
                      placeholderTextColor="#a0aec0"
                      style={{
                        textDecorationLine: "none",
                        fontFamily: "Atma-Regular",
                      }}
                    />
                  </View>
                </View>
                <TouchableOpacity
                  className={`bg-orange-500 py-4 rounded-xl items-center shadow-md ${
                    loading ? "opacity-70" : ""
                  }`}
                  onPress={handleResetPassword}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <Text variant="bold" className="text-white  text-xl">
                    {loading ? "Updating..." : "Reset Password"}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              /* Success Message */
              <View className="items-center py-4">
                <View className="bg-success-100 p-4 rounded-2xl mb-4 w-full">
                  <Text className="text-success-700 text-center text-base">
                    Your new password has been set.
                  </Text>
                </View>
                <TouchableOpacity
                  className="bg-orange-500 py-4 rounded-xl items-center shadow-md w-full"
                  onPress={() => router.replace("/login")}
                >
                  <Text variant="bold" className="text-white  text-xl">
                    Back to Login
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            {/* Back to Login */}
            {!passwordSent && (
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
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}
