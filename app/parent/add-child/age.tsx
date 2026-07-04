"use client"

import { useState } from "react"
import { Alert, StatusBar, TouchableOpacity, View } from "react-native"
import { FontAwesome5 } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { Text } from "@/components/StyledText"
import { TranslatedText } from "@/components/translated-text"
import { useUser } from "@/context/UserContext"

const NUMERIC_AGE_OPTIONS = Array.from({ length: 10 }, (_, index) => String(index + 3))
const ABOVE_TWELVE_AGE_OPTION = "12+"
const ABOVE_TWELVE_MESSAGE =
  "Baby Steps is mainly designed for children aged 3-12, but that's okay. Older learners can still use it for practice, revision, and building confidence in their mother tongue."

export default function AgeSelectionScreen() {
  const { age, setAge } = useUser()
  const [selectedAge, setSelectedAge] = useState<string | null>(age || null)
  const router = useRouter()

  const handleBack = () => {
    router.replace("/parent/add-child/gender")
  }

  const handleNext = () => {
    if (!selectedAge) {
      Alert.alert("Choose an age", "Please select your child's age.")
      return
    }

    setAge(selectedAge)
    router.replace("/parent/add-child/language" as any)
  }

  const renderAgeChip = (option: string, wide = false) => {
    const isSelected = selectedAge === option

    return (
      <TouchableOpacity
        key={option}
        className={`min-h-[58px] mx-1.5 mb-3 rounded-2xl items-center justify-center border-2 ${
          isSelected ? "border-secondary-500 bg-secondary-50" : "border-gray-200 bg-white"
        } shadow-sm`}
        style={{ width: wide ? "58%" : "28%" }}
        onPress={() => setSelectedAge(option)}
        activeOpacity={0.7}
      >
        <Text
          variant={isSelected ? "bold" : "medium"}
          className={`text-2xl ${isSelected ? "text-secondary-700" : "text-neutral-700"}`}
        >
          {option}
        </Text>
      </TouchableOpacity>
    )
  }

  return (
    <>
      <StatusBar translucent backgroundColor="white" barStyle="dark-content" />

      <SafeAreaView className="flex-1 bg-primary-50">
        <View className="flex-row items-center p-4 bg-white border-b border-gray-200">
          <TouchableOpacity
            onPress={handleBack}
            className="w-10 h-10 rounded-full bg-primary-100 items-center justify-center"
          >
            <FontAwesome5 name="arrow-left" size={16} color="#3e4685" />
          </TouchableOpacity>
          <TranslatedText variant="bold" className="flex-1 text-center text-2xl text-primary-800 mr-10">
            {"Child's Age"}
          </TranslatedText>
        </View>

        <View className="absolute w-[100px] h-[100px] rounded-full bg-primary-100/30 top-[20%] left-[5%] -z-10" />
        <View className="absolute w-[80px] h-[80px] rounded-full bg-secondary-100/30 bottom-[25%] right-[8%] -z-10" />
        <View className="absolute w-[50px] h-[50px] rounded-full bg-accent-100/30 top-[40%] right-[15%] -z-10" />

        <View className="flex-1 justify-center px-6 py-8">
          <View className="bg-white p-6 rounded-3xl shadow-md mb-8">
            <TranslatedText variant="bold" className="text-2xl text-center text-primary-800 mb-3">
              How old is your child?
            </TranslatedText>
            <TranslatedText className="text-base text-center text-neutral-500 mb-6">
              Choose one age so learning can feel right for them.
            </TranslatedText>

            <View className="flex-row flex-wrap justify-center">
              {NUMERIC_AGE_OPTIONS.map((option) => renderAgeChip(option))}
              {renderAgeChip(ABOVE_TWELVE_AGE_OPTION, true)}
            </View>

            {selectedAge === ABOVE_TWELVE_AGE_OPTION ? (
              <View className="bg-accent-50 border border-accent-200 rounded-2xl p-4 mt-2 mb-2">
                <TranslatedText className="text-neutral-700 text-base leading-6 text-center">
                  {ABOVE_TWELVE_MESSAGE}
                </TranslatedText>
              </View>
            ) : null}

            <TouchableOpacity
              className="self-center mt-4"
              onPress={() => {
                setAge("")
                router.replace("/parent/add-child/language" as any)
              }}
            >
              <TranslatedText variant="medium" className="text-neutral-500">
                Prefer not to answer
              </TranslatedText>
            </TouchableOpacity>
          </View>
        </View>

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
