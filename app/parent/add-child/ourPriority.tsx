"use client"
import { View, TouchableOpacity, StatusBar } from "react-native"
import { useRouter } from "expo-router"
import { Text } from "@/components/StyledText"
import { TranslatedText } from "@/components/translated-text"
import { FontAwesome5 } from "@expo/vector-icons"
import { SafeAreaView } from "react-native-safe-area-context"
import { LinearGradient } from "expo-linear-gradient"

export default function YourChildIsOurPriorityScreen() {
  const router = useRouter()

  const handleBack = () => {
    router.push("/parent/add-child/activities")
  }

  const navigateToNextScreen = () => {
    router.push("/parent/add-child/knowledge")
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
            Our Promise
          </TranslatedText>
        </View>

        {/* Decorative elements */}
        <View className="absolute w-[100px] h-[100px] rounded-full bg-primary-100/30 top-[15%] left-[5%] -z-10" />
        <View className="absolute w-[80px] h-[80px] rounded-full bg-secondary-100/30 bottom-[15%] right-[10%] -z-10" />
        <View className="absolute w-[60px] h-[60px] rounded-full bg-accent-100/30 top-[35%] right-[20%] -z-10" />

        {/* Main content */}
        <View className="flex-1 justify-center px-6">
          <View className="bg-white p-6 rounded-3xl shadow-md">
            {/* Illustrated header image */}
            <View className="items-center mb-6">
              <View className="w-40 h-40 rounded-full bg-primary-100 items-center justify-center mb-4">
                <Text className="text-[70px]">👨‍👩‍👧‍👦</Text>
              </View>
            </View>

            <TranslatedText variant="bold" className="text-2xl text-center text-primary-800 mb-4">
              Your Child is Our Priority
            </TranslatedText>

            <TranslatedText className="text-base text-center text-neutral-600 mb-6 leading-6">
              At BabySteps, we understand the importance of fostering your child's growth and development. We are
              committed to providing content and activities that are tailored to their learning journey, helping them
              grow in a healthy and positive environment.
            </TranslatedText>

            {/* Key points with icons */}
            <View className="mb-6">
              <View className="flex-row items-center mb-3">
                <View className="w-10 h-10 rounded-full bg-secondary-100 items-center justify-center mr-3">
                  <Text className="text-xl">🔒</Text>
                </View>
                <View className="flex-1">
                  <TranslatedText variant="bold" className="text-sm text-neutral-700">
                    Safe Environment:
                  </TranslatedText>
                  <TranslatedText className="text-sm text-neutral-700">
                    Child-friendly content with no ads
                  </TranslatedText>
                </View>
              </View>

              <View className="flex-row items-center mb-3">
                <View className="w-10 h-10 rounded-full bg-primary-100 items-center justify-center mr-3">
                  <Text className="text-xl">🧠</Text>
                </View>
                <View className="flex-1">
                  <TranslatedText variant="bold" className="text-sm text-neutral-700">
                    Educational Focus:
                  </TranslatedText>
                  <TranslatedText className="text-sm text-neutral-700">
                    Activities designed by child development experts
                  </TranslatedText>
                </View>
              </View>

              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-full bg-accent-100 items-center justify-center mr-3">
                  <Text className="text-xl">💗</Text>
                </View>
                <View className="flex-1">
                  <TranslatedText variant="bold" className="text-sm text-neutral-700">
                    Personalized Journey:
                  </TranslatedText>
                  <TranslatedText className="text-sm text-neutral-700">
                    Content adapts to your child's progress
                  </TranslatedText>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Footer with next button */}
        <View className="p-6 bg-white border-t border-gray-200">
          <TouchableOpacity
            className="py-4 rounded-full items-center justify-center shadow-md overflow-hidden"
            onPress={navigateToNextScreen}
            activeOpacity={0.8}
          >
            <LinearGradient colors={["#6366f1", "#8b5cf6"]} start={[0, 0]} end={[1, 0]} className="absolute inset-0" />
            <View className="flex-row items-center">
              <TranslatedText variant="bold" className="text-white text-lg mr-2">
                Continue
              </TranslatedText>
              <FontAwesome5 name="arrow-right" size={16} color="white" />
            </View>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </>
  )
}
