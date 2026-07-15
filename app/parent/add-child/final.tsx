"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { View, TouchableOpacity, StatusBar, ActivityIndicator } from "react-native"
import { AppButton } from "@/components/common/AppButton"
import { useUser } from "@/context/UserContext"
import { useChild } from "@/context/ChildContext"
import { useRouter } from "expo-router"
import { Text } from "@/components/StyledText"
import { TranslatedText } from "@/components/translated-text"
import { FontAwesome5 } from "@expo/vector-icons"
import { SafeAreaView } from "react-native-safe-area-context"
import { getLearningLanguage } from "@/content/languages"
import { BrandMark } from "@/components/brand/BrandMark"
import { brandColors } from "@/constants/Brand"
import { CHILD_HOME_ROUTE } from "@/constants/ChildNavigation"

type SavedChildProfile = {
  id: string
  name: string
  gender: string
  age: string
  selected_language_code?: string
}

export default function SubmitScreen() {
  const router = useRouter()
  const { name, gender, age, reason, selectedLanguageCode, addChildProfile } = useUser()
  const { setActiveChild } = useChild()
  const [isLoading, setIsLoading] = useState(true)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedChild, setSavedChild] = useState<SavedChildProfile | null>(null)
  const hasSubmitted = useRef(false)
  const selectedLanguage = getLearningLanguage(selectedLanguageCode)

  const submitData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      setIsSuccess(false)
      const child = await addChildProfile()
      setSavedChild(child)
      setIsSuccess(true)
    } catch (err) {
      console.error("Error submitting profile:", err)
      setError("Failed to save profile. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }, [addChildProfile])

  useEffect(() => {
    if (hasSubmitted.current) return
    hasSubmitted.current = true
    void submitData()
  }, [submitData])

  const handleBack = () => {
    router.replace("/parent/add-child/reason")
  }

  const handleStartLearning = () => {
    if (!savedChild) return

    setActiveChild({
      ...savedChild,
      selected_language_code: savedChild.selected_language_code || selectedLanguageCode,
      avatar: savedChild.gender === "male" ? "boy" : savedChild.gender === "female" ? "girl" : "child",
    })
    router.replace({
      pathname: CHILD_HOME_ROUTE as any,
      params: { active: savedChild.id },
    })
  }

  const handleViewDashboard = () => {
    router.replace("/parent")
  }

  return (
    <>
      <StatusBar translucent backgroundColor="white" barStyle="dark-content" />

      <SafeAreaView className="flex-1 bg-[#F8F6F1]">
        {/* Header */}
        <View className="flex-row items-center px-5 py-4 bg-white border-b border-neutral-100">
          {!isLoading && !isSuccess ? (
            <TouchableOpacity
              onPress={handleBack}
              className="w-10 h-10 rounded-full bg-primary-100 items-center justify-center"
            >
              <FontAwesome5 name="arrow-left" size={16} color={brandColors.victoriaBlue} />
            </TouchableOpacity>
          ) : (
            <View className="w-10 h-10" />
          )}
          <TranslatedText variant="bold" className="flex-1 text-center text-xl text-neutral-900 mr-10">
            {isLoading ? "Creating Profile" : isSuccess ? "Ready to Learn" : "Profile Needs Help"}
          </TranslatedText>
        </View>

        {/* Decorative elements */}
        <View className="absolute w-[100px] h-[100px] rounded-full bg-primary-100/30 top-[15%] left-[5%] -z-10" />
        <View className="absolute w-[80px] h-[80px] rounded-full bg-secondary-100/30 bottom-[20%] right-[8%] -z-10" />
        <View className="absolute w-[60px] h-[60px] rounded-full bg-accent-100/30 top-[40%] right-[15%] -z-10" />

        {/* Main content */}
        <View className="flex-1 justify-center items-center px-6">
          <View className="bg-white p-7 rounded-[28px] shadow-sm border border-primary-100 items-center w-full max-w-[360px]">
            {/* Status icon */}
            <View className="w-20 h-20 rounded-full items-center justify-center mb-6">
              {isLoading ? (
                <View className="w-full h-full rounded-full bg-primary-100 items-center justify-center">
                  <ActivityIndicator size="large" color={brandColors.victoriaBlue} />
                </View>
              ) : isSuccess ? (
                <View className="w-full h-full rounded-full bg-green-100 items-center justify-center">
                  <FontAwesome5 name="check" size={32} color="#22c55e" />
                </View>
              ) : (
                <View className="w-full h-full rounded-full bg-red-100 items-center justify-center">
                  <FontAwesome5 name="exclamation-triangle" size={32} color="#ef4444" />
                </View>
              )}
            </View>

            {/* Status message */}
            {isSuccess && (
              <BrandMark kind="mascot" width={70} height={94} containerStyle={{ marginTop: -8, marginBottom: 8 }} />
            )}
            <TranslatedText variant={isSuccess ? "display" : "bold"} className="text-2xl text-center text-neutral-900 mb-3">
              {isLoading ? "Saving profile" : isSuccess ? `${name} is ready!` : "Something went wrong"}
            </TranslatedText>

            <TranslatedText className="text-base text-center text-neutral-600 mb-8">
              {isLoading
                ? `We're saving ${name}'s profile information...`
                : isSuccess
                  ? `${name} is ready to begin. Start with playful games, stories, and activities made for their learning journey.`
                  : error || "An error occurred while saving the profile."}
            </TranslatedText>

            {/* Profile summary (only show on success) */}
            {isSuccess && (
              <View className="bg-primary-50 p-4 rounded-2xl w-full mb-6 border border-primary-100">
                <TranslatedText variant="semibold" className="text-primary-800 mb-3">
                  Profile summary
                </TranslatedText>
                <View className="flex-row mb-1">
                  <TranslatedText variant="medium" className="text-neutral-700 w-20">
                    Name:
                  </TranslatedText>
                  <Text className="text-neutral-700 flex-1">{name}</Text>
                </View>
                <View className="flex-row mb-1">
                  <TranslatedText variant="medium" className="text-neutral-700 w-20">
                    Gender:
                  </TranslatedText>
                  <TranslatedText className="text-neutral-700 flex-1">
                    {gender === "male" ? "Boy" : gender === "female" ? "Girl" : "Not specified"}
                  </TranslatedText>
                </View>
                <View className="flex-row mb-1">
                  <TranslatedText variant="medium" className="text-neutral-700 w-20">
                    Age:
                  </TranslatedText>
                  <Text className="text-neutral-700 flex-1">{age || "Not specified"}</Text>
                </View>
                <View className="flex-row mb-1">
                  <TranslatedText variant="medium" className="text-neutral-700 w-20">
                    Language:
                  </TranslatedText>
                  <Text className="text-neutral-700 flex-1">
                    {selectedLanguage ? `${selectedLanguage.name} (${selectedLanguage.nativeName})` : "Not specified"}
                  </Text>
                </View>
                <View className="flex-row">
                  <TranslatedText variant="medium" className="text-neutral-700 w-20">
                    Focus:
                  </TranslatedText>
                  <Text className="text-neutral-700 flex-1">{reason || "Not specified"}</Text>
                </View>
              </View>
            )}

            {/* Action buttons */}
            {!isLoading && (
              <View className="w-full">
                {isSuccess ? (
                  <View className="gap-3">
                    <AppButton
                      label="Start learning"
                      icon="play"
                      onPress={handleStartLearning}
                      disabled={!savedChild}
                    />
                    <AppButton
                      label="View dashboard"
                      variant="secondary"
                      icon="home-outline"
                      onPress={handleViewDashboard}
                    />
                  </View>
                ) : (
                  <View className="gap-3">
                    <AppButton
                      label="Try again"
                      icon="refresh"
                      onPress={() => {
                        void submitData()
                      }}
                    />
                    <AppButton
                      label="Edit details"
                      variant="secondary"
                      icon="create-outline"
                      onPress={handleBack}
                    />
                  </View>
                )}
              </View>
            )}
          </View>
        </View>

        {/* Footer message */}
        {isLoading && (
          <View className="p-6 items-center">
            <TranslatedText className="text-sm text-center text-neutral-500">
              {"This may take a moment. Please don't close the app."}
            </TranslatedText>
          </View>
        )}
      </SafeAreaView>
    </>
  )
}
