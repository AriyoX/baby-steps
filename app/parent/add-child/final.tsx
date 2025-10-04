"use client"

import { useState, useEffect } from "react"
import { View, TouchableOpacity, StatusBar, ActivityIndicator } from "react-native"
import { useUser } from "@/context/UserContext"
import { useRouter } from "expo-router"
import { Text } from "@/components/StyledText"
import { TranslatedText } from "@/components/translated-text"
import { FontAwesome5 } from "@expo/vector-icons"
import { SafeAreaView } from "react-native-safe-area-context"
import { LinearGradient } from "expo-linear-gradient"

export default function SubmitScreen() {
  const router = useRouter()
  const { name, gender, age, reason, addChildProfile } = useUser()
  const [isLoading, setIsLoading] = useState(true)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const submitData = async () => {
      try {
        setIsLoading(true)
        // Simulate a slight delay for better UX
        await new Promise((resolve) => setTimeout(resolve, 1000))
        await addChildProfile()
        setIsSuccess(true)
      } catch (err) {
        console.error("Error submitting profile:", err)
        setError("Failed to save profile. Please try again.")
      } finally {
        setIsLoading(false)
      }
    }

    submitData()
  }, [])

  const handleBack = () => {
    router.push("/parent/add-child/mindCapacity")
  }

  const handleContinue = () => {
    router.push("/parent")
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
            Saving Profile
          </TranslatedText>
        </View>

        {/* Decorative elements */}
        <View className="absolute w-[100px] h-[100px] rounded-full bg-primary-100/30 top-[15%] left-[5%] -z-10" />
        <View className="absolute w-[80px] h-[80px] rounded-full bg-secondary-100/30 bottom-[20%] right-[8%] -z-10" />
        <View className="absolute w-[60px] h-[60px] rounded-full bg-accent-100/30 top-[40%] right-[15%] -z-10" />

        {/* Main content */}
        <View className="flex-1 justify-center items-center px-6">
          <View className="bg-white p-8 rounded-3xl shadow-md items-center w-full max-w-[340px]">
            {/* Status icon */}
            <View className="w-20 h-20 rounded-full items-center justify-center mb-6">
              {isLoading ? (
                <View className="w-full h-full rounded-full bg-primary-100 items-center justify-center">
                  <ActivityIndicator size="large" color="#3e4685" />
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
            <TranslatedText variant="bold" className="text-2xl text-center text-primary-800 mb-4">
              {isLoading ? "Saving Profile" : isSuccess ? "Profile Saved!" : "Something Went Wrong"}
            </TranslatedText>

            <TranslatedText className="text-base text-center text-neutral-600 mb-8">
              {isLoading
                ? `We're saving ${name}'s profile information...`
                : isSuccess
                  ? `${name}'s profile has been successfully created. You can now access personalized content.`
                  : error || "An error occurred while saving the profile."}
            </TranslatedText>

            {/* Profile summary (only show on success) */}
            {isSuccess && (
              <View className="bg-primary-50 p-4 rounded-xl w-full mb-6">
                <TranslatedText variant="semibold" className="text-primary-800 mb-2">
                  Profile Summary:
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
                  <TouchableOpacity
                    className="py-4 rounded-full items-center justify-center overflow-hidden"
                    onPress={handleContinue}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={["#6366f1", "#8b5cf6"]}
                      start={[0, 0]}
                      end={[1, 0]}
                      className="absolute inset-0"
                    />
                    <TranslatedText variant="bold" className="text-white text-lg">
                      Continue to Dashboard
                    </TranslatedText>
                  </TouchableOpacity>
                ) : (
                  <View className="space-y-3">
                    <TouchableOpacity
                      className="py-4 rounded-full bg-primary-500 items-center"
                      onPress={() => {
                        setIsLoading(true)
                        setError(null)
                        // Try again
                        setTimeout(() => {
                          addChildProfile()
                            .then(() => {
                              setIsSuccess(true)
                              setIsLoading(false)
                            })
                            .catch((err) => {
                              console.error("Error retrying:", err)
                              setError("Failed to save profile. Please try again.")
                              setIsLoading(false)
                            })
                        }, 1000)
                      }}
                    >
                      <TranslatedText variant="bold" className="text-white">
                        Try Again
                      </TranslatedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="py-4 rounded-full bg-gray-200 items-center"
                      onPress={() => router.push("/child-list")}
                    >
                      <TranslatedText variant="medium" className="text-neutral-700">
                        Skip for Now
                      </TranslatedText>
                    </TouchableOpacity>
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
              This may take a moment. Please don't close the app.
            </TranslatedText>
          </View>
        )}
      </SafeAreaView>
    </>
  )
}
