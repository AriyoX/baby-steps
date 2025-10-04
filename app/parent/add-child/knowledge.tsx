"use client"

import { useState } from "react"
import { View, TouchableOpacity, StatusBar } from "react-native"
import { useRouter } from "expo-router"
import { Text } from "@/components/StyledText"
import { TranslatedText } from "@/components/translated-text"
import { FontAwesome5 } from "@expo/vector-icons"
import { SafeAreaView } from "react-native-safe-area-context"

export default function CanYourKidMatchNumbersToObjectsScreen() {
  const router = useRouter()
  const [selectedOption, setSelectedOption] = useState<string | null>(null)

  const handleBack = () => {
    router.push("/parent/add-child/ourPriority")
  }

  const navigateToNextScreen = () => {
    router.push("/parent/add-child/mindCapacity")
  }

  return (
    <>
      <StatusBar translucent backgroundColor="white" barStyle="dark-content" />

      <SafeAreaView className="flex-1 bg-primary-50">
        {/* Header with back button */}
        <View className="flex-row items-center p-4 bg-white border-b border-gray-200">
          <TouchableOpacity
            onPress={handleBack}
            className="w-10 h-10 rounded-full bg-primary-100 items-center justify-center"
          >
            <FontAwesome5 name="arrow-left" size={16} color="#3e4685" />
          </TouchableOpacity>
          <TranslatedText variant="bold" className="flex-1 text-center text-xl text-primary-800 mr-10">
            Child Assessment
          </TranslatedText>
        </View>

        {/* Decorative elements */}
        <View className="absolute w-[80px] h-[80px] rounded-full bg-primary-100/30 top-[15%] left-[5%] -z-10" />
        <View className="absolute w-[60px] h-[60px] rounded-full bg-secondary-100/30 bottom-[15%] right-[8%] -z-10" />
        <View className="absolute w-[50px] h-[50px] rounded-full bg-accent-100/30 top-[30%] right-[20%] -z-10" />

        {/* Main content */}
        <View className="flex-1 justify-center px-6">
          <View className="bg-white p-6 rounded-3xl shadow-md">
            {/* Illustration */}
            <View className="items-center mb-6">
              <View className="flex-row items-center justify-center mb-2">
                <Text className="text-5xl mr-2 pt-6">3️⃣</Text>
                <Text className="text-5xl pt-6">=</Text>
                <Text className="text-5xl ml-2 pt-6">🍎🍎🍎</Text>
              </View>
            </View>

            <TranslatedText variant="bold" className="text-2xl text-center text-primary-800 mb-4">
              Can Your Child Match Numbers to Objects?
            </TranslatedText>

            <TranslatedText className="text-base text-center text-neutral-600 mb-8 leading-6">
              Can your child match numbers with objects? For example, matching the number "3" with three apples or three
              toys.
            </TranslatedText>

            {/* Options */}
            <View className="flex-row justify-between mb-6">
              <TouchableOpacity
                onPress={() => setSelectedOption("yes")}
                className={`w-[48%] py-4 rounded-2xl items-center justify-center border-2 ${
                  selectedOption === "yes" ? "border-secondary-500 bg-secondary-50" : "border-gray-200 bg-white"
                }`}
                activeOpacity={0.7}
              >
                <TranslatedText
                  variant={selectedOption === "yes" ? "bold" : "medium"}
                  className={`text-lg ${selectedOption === "yes" ? "text-secondary-700" : "text-neutral-700"}`}
                >
                  Yes
                </TranslatedText>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setSelectedOption("no")}
                className={`w-[48%] py-4 rounded-2xl items-center justify-center border-2 ${
                  selectedOption === "no" ? "border-secondary-500 bg-secondary-50" : "border-gray-200 bg-white"
                }`}
                activeOpacity={0.7}
              >
                <TranslatedText
                  variant={selectedOption === "no" ? "bold" : "medium"}
                  className={`text-lg ${selectedOption === "no" ? "text-secondary-700" : "text-neutral-700"}`}
                >
                  No
                </TranslatedText>
              </TouchableOpacity>
            </View>

            {/* Explanation message that shows based on selection */}
            {selectedOption && (
              <View
                className={`p-3 rounded-xl mb-4 ${
                  selectedOption === "yes" ? "bg-green-50 border border-green-200" : "bg-blue-50 border border-blue-200"
                }`}
              >
                <TranslatedText className="text-sm text-neutral-700 text-center">
                  {selectedOption === "yes"
                    ? "Great! Your child has started developing number sense."
                    : "No problem! We'll help develop this skill with fun activities."}
                </TranslatedText>
              </View>
            )}
          </View>
        </View>

        {/* Next button */}
        <View className="p-6 bg-white border-t border-gray-200">
          <TouchableOpacity
            className={`py-4 rounded-full items-center justify-center shadow-md ${
              selectedOption ? "bg-secondary-500" : "bg-gray-300"
            }`}
            onPress={navigateToNextScreen}
            activeOpacity={0.8}
            disabled={!selectedOption}
          >
            <TranslatedText variant="bold" className="text-white text-lg">
              Next
            </TranslatedText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </>
  )
}
