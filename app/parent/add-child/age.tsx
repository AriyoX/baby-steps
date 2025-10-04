"use client"

import { useState } from "react"
import { View, TouchableOpacity, StatusBar } from "react-native"
import { useUser } from "@/context/UserContext"
import { useRouter } from "expo-router"
import { Text } from "@/components/StyledText"
import { TranslatedText } from "@/components/translated-text"
import { FontAwesome5 } from "@expo/vector-icons"
import { SafeAreaView } from "react-native-safe-area-context"

export default function AgeSelectionScreen() {
  const [selectedAge, setSelectedAge] = useState<string | null>(null)
  const { setAge } = useUser()
  const router = useRouter()

  const handleBack = () => {
    router.push("/parent/add-child/gender")
  }

  const handleNext = () => {
    if (selectedAge) {
      setAge(selectedAge)
      // Navigate to next screen
      router.push("/parent/add-child/reason")
    } else {
      // Simple validation
      alert("Please select your child's age")
    }
  }

  // Age options with icons for visual appeal
  const ageOptions = [
    { value: "Under 4", label: "Under 4", icon: "🍼" },
    { value: "4-5 years", label: "4-5 years", icon: "🧸" },
    { value: "6 years", label: "6 years", icon: "🚀" },
    { value: "7 years", label: "7 years", icon: "✏️" },
    { value: "8 years", label: "8 years", icon: "🎨" },
    { value: "9-15 years", label: "9-15 years", icon: "📚" },
  ]

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
          <TranslatedText variant="bold" className="flex-1 text-center text-2xl text-primary-800 mr-10">
            Child's Age
          </TranslatedText>
        </View>

        {/* Decorative elements */}
        <View className="absolute w-[100px] h-[100px] rounded-full bg-primary-100/30 top-[20%] left-[5%] -z-10" />
        <View className="absolute w-[80px] h-[80px] rounded-full bg-secondary-100/30 bottom-[25%] right-[8%] -z-10" />
        <View className="absolute w-[50px] h-[50px] rounded-full bg-accent-100/30 top-[40%] right-[15%] -z-10" />

        {/* Main content */}
        <View className="flex-1 justify-center px-6 py-8">
          <View className="bg-white p-6 rounded-3xl shadow-md mb-8">
            <TranslatedText variant="bold" className="text-2xl text-center text-primary-800 mb-8">
              How old is your child?
            </TranslatedText>

            <View className="flex-row flex-wrap justify-between">
              {ageOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  className={`w-[48%] mb-4 p-4 rounded-2xl items-center justify-center border-2 ${
                    selectedAge === option.value ? "border-secondary-500 bg-secondary-50" : "border-gray-200 bg-white"
                  } shadow-sm`}
                  onPress={() => setSelectedAge(option.value)}
                  activeOpacity={0.7}
                >
                  <Text className="text-[28px] mb-2">{option.icon}</Text>
                  <TranslatedText
                    variant={selectedAge === option.value ? "bold" : "medium"}
                    className={`text-base ${selectedAge === option.value ? "text-secondary-700" : "text-neutral-700"}`}
                  >
                    {option.label}
                  </TranslatedText>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              className="self-center mt-4"
              onPress={() => {
                setAge("")
                router.push("/parent/add-child/reason")
              }}
            >
              <TranslatedText variant="medium" className="text-neutral-500">
                Prefer not to answer
              </TranslatedText>
            </TouchableOpacity>
          </View>
        </View>

        {/* Next button */}
        <View className="p-6 bg-white border-t border-gray-200">
          <TouchableOpacity
            className="flex-row bg-secondary-500 py-4 rounded-full items-center justify-center shadow-md"
            onPress={handleNext}
            activeOpacity={0.8}
          >
            <TranslatedText variant="bold" className="text-white text-lg mr-2">
              Next
            </TranslatedText>
            <FontAwesome5 name="arrow-right" size={16} color="white" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </>
  )
}
