"use client"

import { View, TouchableOpacity, StatusBar } from "react-native"
import { useUser } from "@/context/UserContext"
import { useRouter } from "expo-router"
import { Text } from "@/components/StyledText"
import { TranslatedText } from "@/components/translated-text"
import { FontAwesome5 } from "@expo/vector-icons"
import { SafeAreaView } from "react-native-safe-area-context"
import { LEARNING_LANGUAGES } from "@/content/languages"

export default function LearningLanguageScreen() {
  const { selectedLanguageCode, setSelectedLanguageCode } = useUser()
  const router = useRouter()

  const handleBack = () => {
    router.push("/parent/add-child/age")
  }

  const handleNext = () => {
    if (selectedLanguageCode) {
      router.push("/parent/add-child/reason")
      return
    }

    alert("Please select a learning language")
  }

  return (
    <>
      <StatusBar translucent backgroundColor="white" barStyle="dark-content" />

      <SafeAreaView className="flex-1 bg-primary-50" testID="language-selection-screen">
        <View className="flex-row items-center p-4 bg-white border-b border-gray-200">
          <TouchableOpacity
            onPress={handleBack}
            className="w-10 h-10 rounded-full bg-primary-100 items-center justify-center"
            testID="language-back-button"
            accessibilityLabel="Back from learning language selection"
          >
            <FontAwesome5 name="arrow-left" size={16} color="#3e4685" />
          </TouchableOpacity>
          <TranslatedText variant="bold" className="flex-1 text-center text-2xl text-primary-800 mr-10">
            Learning Language
          </TranslatedText>
        </View>

        <View className="absolute w-[100px] h-[100px] rounded-full bg-primary-100/30 top-[18%] left-[6%] -z-10" />
        <View className="absolute w-[80px] h-[80px] rounded-full bg-secondary-100/30 bottom-[24%] right-[9%] -z-10" />

        <View className="flex-1 justify-center px-6 py-8">
          <View className="bg-white p-6 rounded-3xl shadow-md">
            <TranslatedText variant="bold" className="text-2xl text-center text-primary-800 mb-3">
              Which language should this child learn in?
            </TranslatedText>
            <TranslatedText className="text-center text-neutral-500 mb-8">
              We want to know which language this child should focus on such that we tailor content to their preferences.
            </TranslatedText>

            <View className="gap-4">
              {LEARNING_LANGUAGES.filter((language) => language.isActive).map((language) => {
                const isSelected = selectedLanguageCode === language.code

                return (
                  <TouchableOpacity
                    key={language.code}
                    className={`p-5 rounded-2xl border-2 ${
                      isSelected ? "border-secondary-500 bg-secondary-50" : "border-gray-200 bg-white"
                    } shadow-sm`}
                    onPress={() => setSelectedLanguageCode(language.code)}
                    activeOpacity={0.75}
                    testID={`language-card-${language.name.toLowerCase()}`}
                    accessibilityLabel={`Select ${language.name}`}
                  >
                    <View className="flex-row items-center">
                      <View
                        className={`w-12 h-12 rounded-full items-center justify-center mr-4 ${
                          isSelected ? "bg-secondary-500" : "bg-primary-100"
                        }`}
                      >
                        <FontAwesome5 name="language" size={22} color={isSelected ? "#fff" : "#3e4685"} />
                      </View>
                      <View className="flex-1">
                        <Text variant="bold" className="text-lg text-neutral-800">
                          {language.name}
                        </Text>
                        <Text className="text-sm text-neutral-500">{language.nativeName}</Text>
                      </View>
                      {isSelected && <FontAwesome5 name="check-circle" size={22} color="#6366f1" />}
                    </View>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        </View>

        <View className="p-6 bg-white border-t border-gray-200">
          <TouchableOpacity
            className={`flex-row py-4 rounded-full items-center justify-center shadow-md ${
              selectedLanguageCode ? "bg-secondary-500" : "bg-gray-300"
            }`}
            onPress={handleNext}
            activeOpacity={0.8}
            disabled={!selectedLanguageCode}
            testID="language-next-button"
            accessibilityLabel="Continue after choosing learning language"
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
