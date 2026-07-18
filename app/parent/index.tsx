"use client"

import { useCallback, useState, useEffect, useRef } from "react"
import { View, ScrollView, TouchableOpacity } from "react-native"
import { Text } from "@/components/StyledText"
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons, FontAwesome5 } from "@expo/vector-icons"
import { supabase } from "@/lib/supabase"
import { getActivityStats } from "@/lib/utils"
import { TranslatedText } from "@/components/translated-text"
import { BrandMark } from "@/components/brand/BrandMark"
import { brandColors } from "@/constants/Brand"
import { PARENTING_TIPS } from "@/content/parentingTips"
import { PARENT_DASHBOARD_TOUR_STEPS } from "@/lib/parentDashboardTour"
import {
  GameTour,
  GameTourProvider,
  TourTarget,
  useGameTour,
} from "@/components/games/GameTour"

type ChildProfile = {
  id: string
  name: string
  gender: string
  age: string
  reason: string
  created_at: string
  // UI display properties with default values
  level?: number
  progress?: number
  lastActive?: string
  topSkill?: string
  avatar?: string
}

// Portrait dashboard tuning only. Increase this value to move every Parent
// Dashboard spotlight lower on Android; the shared game-tour value stays intact.
const PARENT_DASHBOARD_ANDROID_SPOTLIGHT_OFFSET_Y = 0

const ParentDashboard = () => {
  const router = useRouter()
  const params = useLocalSearchParams<{ showTour?: string }>()
  const [childProfiles, setChildProfiles] = useState<ChildProfile[]>([])
  const [parentId, setParentId] = useState<string>()
  const [loading, setLoading] = useState(true)
  const [recentActivities, setRecentActivities] = useState<any[]>([])
  const [weeklyStats, setWeeklyStats] = useState({
    dailyMinutes: [0, 0, 0, 0, 0, 0, 0],
    totalActivities: 0,
    averageScore: 0
  })
  const {
    complete: completeParentTour,
    open: openParentTour,
    visible: parentTourVisible,
  } = useGameTour(
    "parent-dashboard",
    parentId,
    !loading && Boolean(parentId),
  )
  const replayRequestHandledRef = useRef(false)

  useEffect(() => {
    if (
      params.showTour !== "1" ||
      loading ||
      !parentId ||
      replayRequestHandledRef.current
    ) {
      return
    }

    replayRequestHandledRef.current = true
    openParentTour()
  }, [loading, openParentTour, params.showTour, parentId])

  const fetchChildProfiles = useCallback(async () => {
    try {
      setLoading(true)

      // Get the current user session
      const { data: sessionData } = await supabase.auth.getSession()

      if (!sessionData.session) {
        console.log("No active session found")
        setParentId(undefined)
        setLoading(false)
        return
      }

      const userId = sessionData.session.user.id
      setParentId(userId)

      // Fetch child profiles from the 'children' table
      const { data, error } = await supabase
        .from("children")
        .select("*")
        .eq("parent_id", userId)
        .is("deleted_at", null)

      if (error) {
        console.error("Error fetching profiles:", error.message)
        throw error
      }

      // Transform the data to include UI display properties
      const transformedData =
        data?.map((child) => ({
          ...child,
          level: 1, // Default level
          progress: Math.random() * 0.7 + 0.1, // Random progress between 10-80%
          lastActive: "Today", // Default last active
          topSkill: child.reason || "Learning", // Use reason as top skill or default
          avatar: child.gender === "male" ? "👦" : child.gender === "female" ? "👧" : "👶",
        })) || []

      setChildProfiles(transformedData)
      setLoading(false)
    } catch (error) {
      console.error("Error in fetchChildProfiles:", error)
      setLoading(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      void fetchChildProfiles()
    }, [fetchChildProfiles]),
  )

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        // Get the current user session
        const { data: sessionData } = await supabase.auth.getSession()
        if (!sessionData.session) return

        // Get all child profiles for this parent
        const { data: children } = await supabase
          .from("children")
          .select("id")
          .eq("parent_id", sessionData.session.user.id)
          .is("deleted_at", null)

        if (!children?.length) return

        // Fetch activities for all children
        const childIds = children.map(child => child.id)
        const promises = childIds.map(id => getActivityStats(id))
        const allStats = await Promise.all(promises)

        // Combine all activities and stats
        const combinedActivities: any[] = []
        const weeklyMinutes = [0, 0, 0, 0, 0, 0, 0]
        let totalActivities = 0
        let totalScore = 0
        let activitiesWithScore = 0

        for (const stats of allStats) {
          if (stats) {
            const activities = await stats.recentActivities
            combinedActivities.push(...activities)
            stats.dailyMinutes.forEach((minutes, i) => {
              weeklyMinutes[i] += minutes
            })
            totalActivities += stats.totalActivities
            if (stats.averageScore) {
              totalScore += stats.averageScore
              activitiesWithScore++
            }
          }
        }

        // Improved sorting for chronological order
        // Sort activities by date AND time (most recent first)
        combinedActivities.sort((a, b) => {
          // If activities have date and time properties already formatted
          if (a.date && a.time && b.date && b.time) {
            const dateTimeA = `${a.date} ${a.time}`;
            const dateTimeB = `${b.date} ${b.time}`;
            return dateTimeB.localeCompare(dateTimeA);
          }
          
          // If activities have a combined time property
          // This fallback uses the existing code which might be working with a different format
          return new Date(b.time).getTime() - new Date(a.time).getTime();
        });

        setRecentActivities(combinedActivities.slice(0, 3)) // Show 3 most recent
        setWeeklyStats({
          dailyMinutes: weeklyMinutes,
          totalActivities,
          averageScore: activitiesWithScore ? Math.round(totalScore / activitiesWithScore) : 0
        })
      } catch (error) {
        console.error("Error fetching activities:", error)
      }
    }

    fetchActivities()
    const interval = setInterval(fetchActivities, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  return (
    <GameTourProvider>
    <>
      <StatusBar style="dark" />

      <SafeAreaView className="flex-1 bg-background" edges={["right", "top", "left"]}>
        <View className="flex-1">
          {/* Header */}
          <View className="flex-row justify-between items-center px-5 py-4 border-b border-neutral-100 bg-white">
            <View className="flex-row items-center flex-1 pr-3">
              <BrandMark kind="wordmark" tone="main" width={58} height={58} containerStyle={{ marginRight: 12 }} />
              <View className="flex-1">
                <TranslatedText variant="bold" className="text-neutral-900 text-2xl">
                  Your family
                </TranslatedText>
                <TranslatedText className="text-neutral-500">Small steps worth celebrating</TranslatedText>
              </View>
            </View>

            <View className="flex-row">
              <TourTarget id="parent-dashboard-settings">
              <TouchableOpacity
                className="w-10 h-10 rounded-full bg-primary-100 items-center justify-center mr-3"
                onPress={() => router.push("/parent/settings")}
                accessibilityRole="button"
                accessibilityLabel="Open parent settings"
              >
                <Ionicons name="settings-outline" size={22} color={brandColors.victoriaBlue} />
              </TouchableOpacity>
              </TourTarget>

              <TouchableOpacity
                className="w-10 h-10 rounded-full bg-accent-100 items-center justify-center"
                onPress={() => router.push("/parent/settings/notifications" as any)}
                accessibilityRole="button"
                accessibilityLabel="Open notification reminders"
              >
                <Ionicons name="notifications-outline" size={22} color={brandColors.equatorialGold} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Main content */}
          <ScrollView className="flex-1" contentContainerClassName="p-4 pb-10" showsVerticalScrollIndicator={false}>
            <View className="bg-primary-700 rounded-[28px] p-5 mb-6 overflow-hidden">
              <View className="absolute -right-8 -top-10 w-36 h-36 rounded-full bg-primary-500" />
              <View className="absolute right-16 -bottom-12 w-28 h-28 rounded-full bg-accent-400 opacity-30" />
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-4">
                  <Text variant="bold" className="text-white text-xl mb-2">Ready for today’s little win?</Text>
                  <Text className="text-primary-100 leading-5">Ten playful minutes together can be enough to build a habit.</Text>
                </View>
                <View className="w-14 h-14 rounded-2xl bg-white/20 items-center justify-center">
                  <Ionicons name="sunny-outline" size={28} color={brandColors.equatorialGold} />
                </View>
              </View>
            </View>
            {/* Child profiles section */}
            <TourTarget id="parent-dashboard-profiles">
            <View className="mb-6">
              <View className="flex-row justify-between items-center mb-3">
                <TranslatedText variant="bold" className="text-neutral-800 text-lg">
                  Child Profiles
                </TranslatedText>
                <TourTarget id="parent-dashboard-language">
                <TouchableOpacity
                  className="bg-primary-100 px-3 py-1 rounded-full"
                  onPress={() => router.push("/parent/settings/child-profiles" as any)}
                  accessibilityRole="button"
                  accessibilityLabel="View all child profiles and learning languages"
                >
                  <TranslatedText variant="medium" className="text-primary-700">
                    View All
                  </TranslatedText>
                </TouchableOpacity>
                </TourTarget>
              </View>

              {loading ? (
                <View className="items-center justify-center py-4">
                  <Text>Loading profiles...</Text>
                </View>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-4 pb-2">
                  {/* Child profile cards */}
                  {childProfiles.length > 0
                    ? childProfiles.map((child) => (
                        <TouchableOpacity
                          key={child.id}
                          className="bg-white rounded-xl p-4 w-[150px] shadow-sm border border-primary-100"
                          onPress={() =>
                            router.push({
                              pathname: "/parent/child-detail/1" as any,
                              params: { childId: child.id },
                            })
                          }
                          activeOpacity={0.8}
                        >
                          <View className="items-center mb-2">
                            <View className="relative">
                              <View className="w-[60px] h-[60px] rounded-full bg-primary-100 items-center justify-center">
                                <FontAwesome5
                                  name={child.gender === "male" ? "child" : child.gender === "female" ? "star" : "smile"}
                                  size={26}
                                  color={brandColors.victoriaBlue}
                                />
                              </View>
                              <View className="absolute -bottom-2 -right-2 bg-primary-500 rounded-full w-6 h-6 items-center justify-center shadow-sm">
                                <Text variant="bold" className="text-xs text-white">
                                  {child.level}
                                </Text>
                              </View>
                            </View>
                          </View>

                          <Text variant="bold" className="text-gray-800 text-center mb-1">
                            {child.name}
                          </Text>
                          <Text className="text-gray-500 text-xs text-center">{child.age} years old</Text>

                          {/* Progress bar */}
                          <View className="mt-3 bg-accent-100 h-2 rounded-full overflow-hidden">
                            <View
                              className="bg-accent-500 h-full rounded-full"
                              style={{ width: `${(child.progress || 0.1) * 100}%` }}
                            />
                          </View>
                          <Text className="text-gray-500 text-xs text-right mt-1">
                            {Math.round((child.progress || 0) * 100)}%
                          </Text>
                        </TouchableOpacity>
                      ))
                    : null}

                  {/* Add child card */}
                  <TouchableOpacity
                    className="bg-white rounded-xl p-4 w-[150px] items-center justify-center border-2 border-dashed border-primary-200 shadow-sm"
                    onPress={() => router.push("/parent/add-child/gender")}
                    activeOpacity={0.8}
                  >
                    <View className="w-[60px] h-[60px] rounded-full bg-primary-100 items-center justify-center mb-3">
                      <Ionicons name="add" size={30} color={brandColors.victoriaBlue} />
                    </View>
                    <TranslatedText variant="medium" className="text-gray-800 text-center">
                      Add Child
                    </TranslatedText>
                    <TranslatedText className="text-gray-500 text-xs text-center mt-1">New profile</TranslatedText>
                  </TouchableOpacity>
                </ScrollView>
              )}
            </View>
            </TourTarget>

            {/* Recent activities section */}
            <View className="mb-6">
              <TourTarget id="parent-dashboard-progress">
                <View className="mb-3">
                  <TranslatedText variant="bold" className="text-neutral-800 text-lg">
                    Recent Activities
                  </TranslatedText>
                </View>
              </TourTarget>

              <View className="bg-white rounded-xl p-4 shadow-sm border border-muted-200">
                {recentActivities.length > 0 ? (
                  recentActivities.map((activity, index) => (
                    <View
                      key={activity.id}
                      className={`${index !== recentActivities.length - 1 ? "border-b border-gray-100 pb-3 mb-3" : ""}`}
                    >
                      <View className="flex-row">
                        <View
                          style={{ backgroundColor: `${activity.color}15` }}
                          className="w-10 h-10 rounded-full items-center justify-center mr-3"
                        >
                          <FontAwesome5 name={activity.icon} size={16} color={activity.color} />
                        </View>
                        <View className="flex-1">
                          <Text variant="medium" className="text-gray-800 text-sm">
                            {activity.childName} {activity.activity}
                          </Text>
                          <View className="flex-row justify-between">
                            <Text className="text-gray-500 text-xs">
                              {activity.categoryLabel ? `${activity.time} - ${activity.categoryLabel}` : activity.time}
                            </Text>
                            <Text className="text-primary-700 text-xs font-medium">{activity.score}</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  ))
                ) : (
                  <Text className="text-gray-500 text-center py-2">No recent activities</Text>
                )}

                <TouchableOpacity
                  className="mt-3 border-t border-gray-100 pt-3"
                  onPress={() => router.push("/parent/activities")}
                  accessibilityRole="button"
                  accessibilityLabel="View all child learning activities"
                >
                  <TranslatedText variant="medium" className="text-primary-700 text-center">
                    View All Activities
                  </TranslatedText>
                </TouchableOpacity>
              </View>
            </View>

            <View className="mb-6">
              <View className="flex-row justify-between items-center mb-3">
                <TranslatedText variant="bold" className="text-neutral-800 text-lg">
                  Achievements Overview
                </TranslatedText>
                {/* Optional: maybe a small stat like "X total achievements defined" */}
              </View>

              <TouchableOpacity
                className="bg-white rounded-xl p-4 shadow-sm border border-muted-200 flex-row items-center justify-between"
                onPress={() => router.push("/parent/all-achievements")} // Adjust route as needed
                activeOpacity={0.8}
              >
                <View className="flex-row items-center">
                    <View className="w-10 h-10 bg-amber-100 rounded-full items-center justify-center mr-3">
                        <Ionicons name="trophy-outline" size={20} color={brandColors.equatorialGold} />
                    </View>
                    <View>
                        <Text variant="medium" className="text-gray-700">View All Achievements</Text>
                        <Text className="text-xs text-gray-500">See progress for each child</Text>
                    </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            {/* Parenting tips */}
            <View className="mb-8">
              <View className="flex-row items-end justify-between mb-3">
                <View className="flex-1 pr-4">
                  <TranslatedText variant="bold" className="text-neutral-900 text-lg">
                    Parenting ideas that work in real life
                  </TranslatedText>
                  <Text className="text-sm text-neutral-500 mt-1">Specific, gentle things to try—no perfection required.</Text>
                </View>
                <View className="bg-secondary-50 rounded-full px-3 py-1.5">
                  <Text variant="bold" className="text-xs text-secondary-700">6 ideas</Text>
                </View>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3 pr-4">
                {PARENTING_TIPS.map((tip) => (
                  <View
                    key={tip.id}
                    className="w-[290px] bg-white rounded-3xl p-5 border border-neutral-100 shadow-sm"
                  >
                    <View className="flex-row items-center mb-4">
                      <View className="w-11 h-11 rounded-2xl items-center justify-center" style={{ backgroundColor: tip.tint }}>
                        <Ionicons name={tip.icon} size={22} color={tip.color} />
                      </View>
                      <View className="ml-3">
                        <Text variant="bold" className="text-xs uppercase tracking-[1px]" style={{ color: tip.color }}>
                          {tip.category}
                        </Text>
                        <Text className="text-xs text-neutral-400 mt-0.5">A two-minute read</Text>
                      </View>
                    </View>
                    <Text variant="bold" className="text-lg leading-6 text-neutral-900 mb-2">{tip.title}</Text>
                    <Text className="text-sm leading-5 text-neutral-600 mb-4">{tip.tip}</Text>
                    <View className="rounded-2xl p-3" style={{ backgroundColor: tip.tint }}>
                      <Text variant="bold" className="text-xs mb-1" style={{ color: tip.color }}>TRY THIS TODAY</Text>
                      <Text className="text-sm leading-5 text-neutral-700">{tip.tryThis}</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
      <GameTour
        androidSpotlightOffsetY={PARENT_DASHBOARD_ANDROID_SPOTLIGHT_OFFSET_Y}
        visible={parentTourVisible}
        onCancel={completeParentTour}
        onComplete={completeParentTour}
        finishLabel="Explore"
        steps={PARENT_DASHBOARD_TOUR_STEPS}
      />
    </>
    </GameTourProvider>
  )
}

export default ParentDashboard
