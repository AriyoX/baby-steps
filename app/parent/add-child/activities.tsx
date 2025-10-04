"use client"

import { View, TouchableOpacity, StatusBar, ScrollView } from "react-native"
import { useUser } from "@/context/UserContext"
import { useRouter } from "expo-router"
import { Text } from "@/components/StyledText"
import { TranslatedText } from "@/components/translated-text"
import { FontAwesome5 } from "@expo/vector-icons"
import { SafeAreaView } from "react-native-safe-area-context"

export default function StatisticsDisplayScreen() {
  const router = useRouter()
  const { name } = useUser()

  const handleBack = () => {
    router.push("/parent/add-child/reason")
  }

  const handleNext = () => {
    router.push("/parent/add-child/ourPriority")
  }

  // Sample testimonials data
  const testimonials = [
    {
      quote: "My child has improved so much since we started using Baby Steps!",
      author: "Sarah M.",
      avatar: "👩‍👧",
    },
    {
      quote: "An amazing tool for early childhood learning and development.",
      author: "Michael P.",
      avatar: "👨‍👦",
    },
    {
      quote: "The perfect balance between fun and educational content.",
      author: "Jessica T.",
      avatar: "👩‍👧‍👦",
    },
  ]

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
          <TranslatedText variant="bold" className="flex-1 text-center text-xl text-primary-800 mr-10">
            Baby Steps Community
          </TranslatedText>
        </View>

        {/* Decorative elements - Fixed relative to SafeAreaView */}
        <View className="absolute w-[70px] h-[70px] rounded-full bg-primary-100/30 top-[15%] left-[8%] -z-10" />
        <View className="absolute w-[50px] h-[50px] rounded-full bg-secondary-100/30 bottom-[25%] right-[10%] -z-10" />

        {/* Scrollable main content */}
        <ScrollView className="flex-1" contentContainerClassName="px-6 py-4 pb-6" showsVerticalScrollIndicator={false}>
          <View className="bg-white p-5 rounded-3xl shadow-md">
            {/* Stats and image section */}
            <View className="items-center mb-6">
              <TranslatedText variant="bold" className="text-xl text-primary-800 text-center mb-4">
                Joined by 10,000+ children every day!
              </TranslatedText>

              {/* Replace with actual image */}
              <View className="w-full h-[180px] bg-primary-200 rounded-2xl mb-2 overflow-hidden">
                <View className="absolute inset-0 flex items-center justify-center">
                  <Text className="text-6xl text-center pt-10">👶👧👦</Text>
                </View>
              </View>

              <View className="flex-row justify-around w-full mt-2 mb-4">
                <View className="items-center">
                  <Text variant="bold" className="text-2xl text-secondary-600">
                    10k+
                  </Text>
                  <TranslatedText className="text-xs text-neutral-500">Daily Users</TranslatedText>
                </View>
                <View className="items-center">
                  <Text variant="bold" className="text-2xl text-secondary-600">
                    4.8★
                  </Text>
                  <TranslatedText className="text-xs text-neutral-500">User Rating</TranslatedText>
                </View>
                <View className="items-center">
                  <Text variant="bold" className="text-2xl text-secondary-600">
                    50+
                  </Text>
                  <TranslatedText className="text-xs text-neutral-500">Activities</TranslatedText>
                </View>
              </View>
            </View>

            {/* Testimonials section */}
            <TranslatedText variant="semibold" className="text-lg text-primary-800 mb-4">
              Here's what other parents are saying:
            </TranslatedText>

            {testimonials.map((testimonial, index) => (
              <View key={index} className="bg-gray-50 p-3 rounded-xl mb-2 border border-gray-100">
                <View className="flex-row items-center">
                  <Text className="text-2xl mr-2">{testimonial.avatar}</Text>
                  <View className="flex-1">
                    <Text className="text-sm italic text-neutral-700 mb-1">"{testimonial.quote}"</Text>
                    <Text className="text-xs text-neutral-500">— {testimonial.author}</Text>
                  </View>
                </View>
              </View>
            ))}

            {/* Personal message for the user */}
            {name && (
              <View className="bg-secondary-50 rounded-xl p-3 mt-3 border border-secondary-100">
                <TranslatedText className="text-sm text-primary-800 text-center">
                  Ready to start {name}'s learning adventure with Baby Steps!
                </TranslatedText>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Next button - Fixed at bottom */}
        <View className="p-4 bg-white border-t border-gray-200">
          <TouchableOpacity
            className="flex-row py-3 rounded-full items-center justify-center bg-secondary-500 shadow-md"
            onPress={handleNext}
            activeOpacity={0.8}
          >
            <TranslatedText variant="bold" className="text-white text-base mr-2">
              Continue
            </TranslatedText>
            <FontAwesome5 name="arrow-right" size={14} color="white" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </>
  )
}
