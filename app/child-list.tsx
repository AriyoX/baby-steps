"use client"

import { useState, useEffect, useRef } from "react"
import { View, TouchableOpacity, Animated, FlatList, StatusBar } from "react-native"
import { Text } from "@/components/StyledText"
import { TranslatedText } from "@/components/translated-text"
import { FontAwesome5 } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { supabase } from "../lib/supabase"
import { SafeAreaView } from "react-native-safe-area-context"

// Define the child profile type
type ChildProfile = {
  id: string
  parent_id: string
  name: string
  gender: string
  age: string
  reason: string
  created_at: string
}

export default function ChildListScreen() {
  const [profiles, setProfiles] = useState<ChildProfile[]>([])
  const [loading, setLoading] = useState(true)
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
    Animated.loop(
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
    ).start()

    // Fetch child profiles
    fetchProfiles()
  }, [])

  const fetchProfiles = async () => {
    try {
      setLoading(true)

      // Get the current user session
      const { data: sessionData } = await supabase.auth.getSession()

      if (!sessionData.session) {
        console.log("No active session found")
        setLoading(false)
        return
      }

      const userId = sessionData.session.user.id

      // Fetch child profiles from the 'children' table
      const { data, error } = await supabase.from("children").select("*").eq("parent_id", userId)

      if (error) {
        console.error("Error fetching profiles:", error.message)
        throw error
      }

      console.log("Fetched profiles:", data)
      setProfiles(data || [])
      setLoading(false)
    } catch (error) {
      console.error("Error in fetchProfiles:", error)
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
      pathname: "/parent/child-detail/1" as any,
      params: { childId },
    })
  }

  // Render a single child profile card
  const renderProfileCard = ({ item }: { item: ChildProfile }) => (
    <Animated.View
      className="mb-4 rounded-2xl bg-white shadow-md overflow-hidden"
      style={{ transform: [{ scale: scaleValue }] }}
    >
      <TouchableOpacity
        className="flex-row p-4 items-center"
        onPress={() => navigateToProfile(item.id)}
        activeOpacity={0.8}
      >
        {/* Avatar with gender-based emoji */}
        <View className="relative w-[70px] h-[70px] rounded-full bg-primary-50 justify-center items-center mr-4">
          <Text className="text-[36px]">{item.gender === "male" ? "👦" : item.gender === "female" ? "👧" : "👶"}</Text>
          {/* Level badge - using a placeholder level for now */}
          <View className="absolute -bottom-1 -right-1 bg-primary-500 rounded-xl w-6 h-6 justify-center items-center border-2 border-white">
            <Text variant="bold" className="text-[10px] text-white">
              Lv1
            </Text>
          </View>
        </View>

        {/* Profile details */}
        <View className="flex-1">
          <Text variant="bold" className="text-lg text-neutral-800 mb-1">
            {item.name}
          </Text>
          <Text className="text-sm text-neutral-500 mb-2">{item.age}</Text>

          {/* Last activity indicator - using created_at for now */}
          <View className="flex-row items-center">
            <FontAwesome5 name="clock" size={12} color="#6366f1" />
            <Text className="text-xs text-neutral-500 ml-1">{new Date(item.created_at).toLocaleDateString()}</Text>
          </View>
        </View>

        {/* Arrow indicator */}
        <View className="p-2">
          <FontAwesome5 name="chevron-right" size={18} color="#ccc" />
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
        <View className="px-5 py-4 bg-white border-b border-gray-200">
          <View className="flex-row items-center mb-2">
            <TouchableOpacity
              onPress={() => router.push("/")}
              className="w-10 h-10 rounded-full bg-primary-100 items-center justify-center mr-3"
            >
              <FontAwesome5 name="arrow-left" size={16} color="#3e4685" />
            </TouchableOpacity>
            <TranslatedText variant="bold" className="text-2xl text-primary-800">
              Child Profiles
            </TranslatedText>
          </View>
          <TranslatedText className="text-sm text-neutral-400 mt-1 ml-1">Personalized learning journeys</TranslatedText>
        </View>

        {/* Main content */}
        {loading ? (
          <View className="flex-1 justify-center items-center">
            <FontAwesome5 name="child" size={150} color="#6366f1" />
            <TranslatedText variant="medium" className="mt-5 text-base text-neutral-500">
              Loading profiles...
            </TranslatedText>
          </View>
        ) : (
          <>
            {profiles.length > 0 ? (
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
                  <Text variant="bold" className="text-[80px] mb-4">
                    👶
                  </Text>
                  <TranslatedText variant="bold" className="text-2xl text-neutral-800 mb-3 text-center">
                    No Child Profiles Yet
                  </TranslatedText>
                  <TranslatedText className="text-base text-neutral-500 text-center mb-6 leading-6">
                    You haven't added any child profiles yet. Create a profile to start your child's personalized
                    learning journey!
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
