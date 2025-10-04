"use client"

import { View, TouchableOpacity, TextInput, StatusBar } from "react-native"
import { useUser } from "@/context/UserContext"
import { useRouter } from "expo-router"
import { Text } from "@/components/StyledText"
import { TranslatedText } from "@/components/translated-text"
import { FontAwesome5 } from "@expo/vector-icons"
import { SafeAreaView } from "react-native-safe-area-context"

export default function GenderScreen() {
  const { setName, setGender, name, gender } = useUser()
  const router = useRouter()

  const handleBack = () => {
    router.back()
  }

  const handleNext = () => {
    if (gender && name?.trim()) {
      // Navigate to the next screen in your flow
      router.push("/parent/add-child/age")
    } else {
      // You could add some validation feedback here
      alert("Please select a gender and enter a name")
    }
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
          <TranslatedText variant="bold" className="flex-1 text-center text-2xl text-primary-800 mr-10">
            Add Child
          </TranslatedText>
        </View>

        {/* Decorative elements */}
        <View className="absolute w-[80px] h-[80px] rounded-full bg-primary-100/30 top-[15%] left-[5%]" />
        <View className="absolute w-[60px] h-[60px] rounded-full bg-secondary-100/30 bottom-[20%] right-[10%]" />

        {/* Main content */}
        <View className="flex-1 justify-center items-center px-6">
          <View className="w-full bg-white p-6 rounded-3xl shadow-md">
            <TranslatedText variant="bold" className="text-2xl text-center text-primary-800 mb-6">
              What is your child's gender and name?
            </TranslatedText>

            {/* Gender selection */}
            <View className="flex-row justify-center mb-8">
              <TouchableOpacity
                className={`items-center p-5 mx-4 rounded-2xl border-2 ${
                  gender === "male" ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white"
                } shadow-sm`}
                onPress={() => setGender("male")}
              >
                <Text className="text-[60px] mb-2">👦</Text>
                <TranslatedText variant="medium" className="text-lg text-neutral-700">
                  Boy
                </TranslatedText>
              </TouchableOpacity>

              <TouchableOpacity
                className={`items-center p-5 mx-4 rounded-2xl border-2 ${
                  gender === "female" ? "border-pink-500 bg-pink-50" : "border-gray-200 bg-white"
                } shadow-sm`}
                onPress={() => setGender("female")}
              >
                <Text className="text-[60px] mb-2">👧</Text>
                <TranslatedText variant="medium" className="text-lg text-neutral-700">
                  Girl
                </TranslatedText>
              </TouchableOpacity>
            </View>

            {/* Name input */}
            <View className="mb-6 w-full">
              <TranslatedText variant="medium" className="text-lg text-neutral-700 mb-2">
                Child's Name
              </TranslatedText>
              <View className="flex-row items-center bg-primary-50 rounded-xl px-4 py-3 border border-primary-100">
                <FontAwesome5 name="child" size={18} color="#6366f1" />
                <TextInput
                  className="flex-1 ml-3 text-base text-neutral-800"
                  placeholder="Enter your child's name"
                  placeholderTextColor="#9CA3AF"
                  value={name}
                  onChangeText={setName}
                  style={{ fontFamily: "Atma-Regular" }}
                />
              </View>
            </View>

            {/* Prefer not to answer */}
            <TouchableOpacity
              className="self-center mb-8"
              onPress={() => {
                setGender("")
                router.push("/parent/add-child/age")
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
