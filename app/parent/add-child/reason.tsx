import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  StatusBar,
  Alert,
  ScrollView,
} from "react-native";
import { useUser } from "@/context/UserContext";
import { useRouter } from "expo-router";
import { Text } from "@/components/StyledText";
import { FontAwesome5 } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ReasonForDownloadingScreen() {
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const { setReason } = useUser();
  const router = useRouter();

  const handleBack = () => {
    router.push("/parent/add-child/age");
  };

  const handleNext = () => {
    if (selectedReason) {
      setReason(selectedReason);
      // Navigate to next screen
      router.push("/parent/add-child/activities");
    } else {
      // Simple validation matching the age screen format
      Alert.alert("Selection Required", "Please select a reason to continue");
    }
  };

  // Reason options with icons for visual appeal
  const reasonOptions = [
    {
      value: "Develop logical thinking and memory",
      icon: "🧠",
      color: "bg-blue-50 border-blue-200",
    },
    {
      value: "Boost creativity",
      icon: "🎨",
      color: "bg-purple-50 border-purple-200",
    },
    {
      value: "Learn culture",
      icon: "🌍",
      color: "bg-green-50 border-green-200",
    },
    {
      value: "Prepare for school",
      icon: "📚",
      color: "bg-yellow-50 border-yellow-200",
    },
    {
      value: "Healthy screen time",
      icon: "⏱️",
      color: "bg-red-50 border-red-200",
    },
    {
      value: "Other",
      icon: "✨",
      color: "bg-gray-50 border-gray-200",
    },
  ];

  return (
    <>
      <StatusBar translucent backgroundColor="white" barStyle="dark-content" />

      <SafeAreaView className="flex-1 bg-primary-50">
        {/* Header with back button - Fixed at top */}
        <View className="flex-row items-center p-4 bg-white border-b border-gray-200">
          <TouchableOpacity
            onPress={handleBack}
            className="w-10 h-10 rounded-full bg-primary-100 items-center justify-center"
          >
            <FontAwesome5 name="arrow-left" size={16} color="#3e4685" />
          </TouchableOpacity>
          <Text
            variant="bold"
            className="flex-1 text-center text-2xl text-primary-800 mr-10"
          >
            Your Goals
          </Text>
        </View>

        <View className="flex-1 justify-center px-6">
          {/* Main content card */}
          <View className="bg-white p-6 rounded-3xl shadow-md">
            <Text
              variant="bold"
              className="text-2xl text-center text-primary-800 mb-8"
            >
              What was the main reason for downloading BabySteps?
            </Text>

            <View className="flex-row flex-wrap justify-between">
              {reasonOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  className={`w-[48%] mb-4 p-4 rounded-2xl items-center justify-center border-2 ${
                    selectedReason === option.value
                      ? "border-secondary-500 bg-secondary-50"
                      : `${option.color}`
                  } shadow-sm`}
                  onPress={() => setSelectedReason(option.value)}
                  activeOpacity={0.7}
                >
                  <Text className="text-[28px] mb-2">{option.icon}</Text>
                  <Text
                    variant={
                      selectedReason === option.value ? "bold" : "medium"
                    }
                    className={`text-center text-sm ${
                      selectedReason === option.value
                        ? "text-secondary-700"
                        : "text-neutral-700"
                    }`}
                  >
                    {option.value}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* "Prefer not to answer" option */}
            <TouchableOpacity
              className="self-center mt-4"
              onPress={() => {
                setReason("");
                router.push("/parent/add-child/activities");
              }}
            >
              <Text variant="medium" className="text-neutral-500">
                Prefer not to answer
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Next button - Fixed at bottom */}
        <View className="p-6 bg-white border-t border-gray-200">
          <TouchableOpacity
            className="flex-row bg-secondary-500 py-4 rounded-full items-center justify-center shadow-md"
            onPress={handleNext}
            activeOpacity={0.8}
          >
            <Text variant="bold" className="text-white text-lg mr-2">
              Next
            </Text>
            <FontAwesome5 name="arrow-right" size={16} color="white" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </>
  );
}
