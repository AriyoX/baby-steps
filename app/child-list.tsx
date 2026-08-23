"use client"

import { useState, useEffect, useRef } from "react"
import { View, TouchableOpacity, Animated, FlatList, StatusBar } from "react-native"
import { Text } from "@/components/StyledText"
import { TranslatedText } from "@/components/translated-text"
import { FontAwesome5 } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { supabase } from "../lib/supabase"
import { SafeAreaView } from "react-native-safe-area-context"
import { BrandMark } from "@/components/brand/BrandMark"
import { brandColors } from "@/constants/Brand"
import { fetchActiveChildProfiles } from "@/lib/accountManagement"

// Define the child profile type
type ChildProfile = {
  id: string
  parent_id: string
  name: string
  gender: string
  age: string
  reason: string
  selected_language_code?: string
  created_at: string
}

export default function ChildListScreen() {
  const [profiles, setProfiles] = useState<ChildProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const router = useRouter()

  // Animation values
  const bounceValue = useRef(new Animated.Value(0)).current
  const scaleValue = useRef(new Animated.Value(0)).current

  useEffect(() => {
    // Start animations
    Animated.spring(scaleValue, {
      toValue: 1,
      tension: 20,
      friction: 7,
      useNativeDriver: true,
    }).start()

    // Floating animation for decorative elements
    const floatingAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceValue, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(bounceValue, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]),
    )
    floatingAnimation.start()

    // Fetch child profiles
    fetchProfiles()

    return () => {
      floatingAnimation.stop()
      bounceValue.stopAnimation()
      scaleValue.stopAnimation()
    }
  }, [bounceValue, scaleValue])

  const fetchProfiles = async () => {
    try {
      setLoading(true)
      setLoadError(false)

      // Get the current user session
      const { data: sessionData } = await supabase.auth.getSession()

      if (!sessionData.session) {
        setLoading(false)
        return
      }

      const userId = sessionData.session.user.id

      const data = await fetchActiveChildProfiles(userId)
      setProfiles(data as ChildProfile[])
      setLoading(false)
    } catch (error) {
      console.error("Error in fetchProfiles:", error)
      setLoadError(true)
      setLoading(false)
    }
  }

  // Animation transformations
  const translateY = bounceValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -15],
  })

  const navigateToAddChild = () => {
    router.push("/parent/add-child/gender")
  }

  const navigateToProfile = (childId: string) => {
    // Navigate to profile and pass the child ID
    router.push({
      pathname: "/parent/child-detail/[id]" as any,
      params: { id: childId },
    })
  }

  // Render a single child profile card
  const renderProfileCard = ({ item }: { item: ChildProfile }) => (
    <Animated.View
      className="mb-4 rounded-3xl bg-white shadow-sm overflow-hidden border border-primary-100"
      style={{ transform: [{ scale: scaleValue }] }}
    >
      <TouchableOpacity
        className="flex-row p-4 items-center"
        onPress={() => navigateToProfile(item.id)}
        activeOpacity={0.8}
      >
        {/* Profile avatar */}
        <View className="relative w-[70px] h-[70px] rounded-2xl bg-primary-50 justify-center items-center mr-4">
          <FontAwesome5 name="child" size={34} color={brandColors.victoriaBlue} />
        </View>

        {/* Profile details */}
        <View className="flex-1">
          <Text variant="bold" className="text-lg text-neutral-800 mb-1">
            {item.name}
          </Text>
          <Text className="text-sm text-neutral-500 mb-2">{item.age}</Text>

        </View>

        {/* Arrow indicator */}
        <View className="w-9 h-9 rounded-full bg-neutral-50 items-center justify-center">
          <FontAwesome5 name="chevron-right" size={15} color={brandColors.neutral[400]} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  )

  return (
    <>
      {/* Status Bar - Added for visibility */}
      <StatusBar translucent backgroundColor="white" barStyle="dark-content" />

      <SafeAreaView className="flex-1 bg-primary-50" edges={["top"]}>
        {/* Header with back button */}
        <View className="px-5 py-4 bg-white border-b border-neutral-100">
          <View className="flex-row items-center mb-2">
            <TouchableOpacity
              onPress={() => router.replace("/parent")}
              className="w-10 h-10 rounded-full bg-primary-100 items-center justify-center mr-3"
            >
              <FontAwesome5 name="arrow-left" size={16} color={brandColors.victoriaBlue} />
            </TouchableOpacity>
            <TranslatedText variant="bold" className="text-2xl text-neutral-900">
              Your little learners
            </TranslatedText>
          </View>
        </View>

        {/* Main content */}
        {loading ? (
          <View className="flex-1 justify-center items-center">
            <BrandMark kind="mascot" width={96} height={128} />
            <TranslatedText variant="medium" className="mt-5 text-base text-neutral-500">
              Loading profiles...
            </TranslatedText>
          </View>
        ) : (
          <>
            {loadError && profiles.length === 0 ? (
              <View className="flex-1 items-center justify-center px-6">
                <View className="w-full rounded-3xl border border-amber-200 bg-white p-6 items-center">
                  <View className="w-16 h-16 rounded-2xl bg-amber-50 items-center justify-center">
                    <FontAwesome5
                      name="cloud"
                      size={28}
                      color={brandColors.gold[700]}
                    />
                  </View>
                  <Text variant="bold" className="mt-4 text-xl text-neutral-900 text-center">
                    Profiles could not refresh
                  </Text>
                  <Text className="mt-2 text-sm leading-5 text-neutral-600 text-center">
                    Your saved profiles have not been removed. Try again when the
                    connection improves.
                  </Text>
                  <TouchableOpacity
                    className="mt-5 rounded-2xl bg-primary-500 px-6 py-3"
                    onPress={() => void fetchProfiles()}
                    accessibilityRole="button"
                    accessibilityLabel="Retry loading child profiles"
                  >
                    <Text variant="bold" className="text-white">Try again</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : profiles.length > 0 ? (
              <>
                <FlatList
                  data={profiles}
                  renderItem={renderProfileCard}
                  keyExtractor={(item) => item.id}
                  contentContainerClassName="p-4"
                  showsVerticalScrollIndicator={false}
                />

                {/* Add another child button */}
                <View className="p-4 items-center">
                  <TouchableOpacity
                    className="flex-row bg-secondary-500 py-4 px-6 rounded-full items-center justify-center shadow-md"
                    onPress={navigateToAddChild}
                    activeOpacity={0.8}
                  >
                    <FontAwesome5 name="plus" size={18} color="#fff" />
                    <TranslatedText variant="bold" className="text-white text-base ml-2">
                      Add Another Child
                    </TranslatedText>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <Animated.View
                className="flex-1 justify-center items-center p-5"
                style={{ transform: [{ scale: scaleValue }] }}
              >
                {/* Decorative floating elements */}
                <Animated.View
                  className="absolute w-[120px] h-[120px] rounded-full bg-primary-100/30 top-[10%] left-[10%]"
                  style={{ transform: [{ translateY }] }}
                />
                <Animated.View
                  className="absolute w-[80px] h-[80px] rounded-full bg-secondary-100/30 bottom-[15%] right-[10%]"
                  style={{
                    transform: [{ translateY: Animated.multiply(translateY, 1.2) }],
                  }}
                />
                <Animated.View
                  className="absolute w-[60px] h-[60px] rounded-full bg-accent-100/30 top-[30%] right-[20%]"
                  style={{
                    transform: [{ translateY: Animated.multiply(translateY, 0.8) }],
                  }}
                />

                {/* Empty state content */}
                <View className="w-full items-center bg-white p-6 rounded-3xl shadow-md">
                  <BrandMark kind="mascot" width={92} height={122} containerStyle={{ marginBottom: 16 }} />
                  <Text variant="bold" className="hidden">
                    👶
                  </Text>
                  <TranslatedText variant="display" className="text-3xl text-primary-700 mb-3 text-center">
                    Let’s meet your learner
                  </TranslatedText>

                  <TouchableOpacity
                    className="flex-row bg-primary-500 py-4 px-6 rounded-full items-center justify-center w-full shadow-lg"
                    onPress={navigateToAddChild}
                    activeOpacity={0.8}
                  >
                    <FontAwesome5 name="plus" size={18} color="#fff" />
                    <TranslatedText variant="bold" className="text-white text-base ml-2">
                      Add Child Profile
                    </TranslatedText>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            )}
          </>
        )}
      </SafeAreaView>
    </>
  )
}
