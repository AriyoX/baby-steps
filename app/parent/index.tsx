"use client"

import {
  useCallback,
  useState,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react"
import {
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native"
import { Text } from "@/components/StyledText"
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons, FontAwesome5 } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { supabase } from "@/lib/supabase"
import { getActivityStats } from "@/lib/utils"
import { TranslatedText } from "@/components/translated-text"
import { BrandMark } from "@/components/brand/BrandMark"
import { brandColors } from "@/constants/Brand"
import { PARENTING_TIPS } from "@/content/parentingTips"
import { getParentDashboardGreeting } from "@/content/parentDashboardGreeting"
import {
  PARENT_DASHBOARD_TOUR_POSITIONING,
  PARENT_DASHBOARD_TOUR_STEPS,
} from "@/lib/parentDashboardTour"
import { fetchActiveChildProfiles } from "@/lib/accountManagement"
import {
  GameTour,
  GameTourProvider,
  TourTarget,
  useGameTour,
} from "@/components/games/GameTour"
import { useParentProfile } from "@/context/ParentProfileContext"

type ChildProfile = {
  id: string
  name: string
  gender: string
  age: string
  reason: string
  created_at: string
}

const DashboardSectionHeader = ({
  action,
  title,
}: {
  action?: ReactNode
  title: string
}) => (
  <View className="mb-3 flex-row items-end justify-between">
    <View className="min-w-0 flex-1 pr-3">
      <TranslatedText variant="bold" className="text-lg text-neutral-900">
        {title}
      </TranslatedText>
    </View>
    {action}
  </View>
)

const getChildAvatarEmoji = (gender: string) => {
  const normalizedGender = gender.trim().toLowerCase()
  if (normalizedGender === "male" || normalizedGender === "boy") return "👦"
  if (normalizedGender === "female" || normalizedGender === "girl") return "👧"
  return "🧒"
}

const ParentDashboard = () => {
  const router = useRouter()
  const { profile: parentProfile } = useParentProfile()
  const params = useLocalSearchParams<{ showTour?: string }>()
  const [childProfiles, setChildProfiles] = useState<ChildProfile[]>([])
  const [parentId, setParentId] = useState<string>()
  const [loading, setLoading] = useState(true)
  const [profileLoadError, setProfileLoadError] = useState(false)
  const [greetingTime, setGreetingTime] = useState(() => new Date())
  const [recentActivities, setRecentActivities] = useState<any[]>([])
  const {
    close: closeParentTour,
    complete: completeParentTour,
    dismiss: dismissParentTour,
    open: openParentTour,
    visible: parentTourVisible,
  } = useGameTour(
    "parent-dashboard",
    parentId,
    !loading && Boolean(parentId),
  )
  const dashboardScrollRef = useRef<ScrollView>(null)
  const dashboardTourOffsetsRef = useRef({ profiles: 0, progress: 0 })
  const replayRequestHandledRef = useRef(false)
  const dashboardGreeting = getParentDashboardGreeting(greetingTime)
  const prepareDashboardTourTarget = useCallback((stepId: string) => {
    const y =
      stepId === "progress"
        ? dashboardTourOffsetsRef.current.progress
        : stepId === "profiles" || stepId === "language"
          ? dashboardTourOffsetsRef.current.profiles
          : 0

    dashboardScrollRef.current?.scrollTo({
      animated: false,
      y: Math.max(0, y - 12),
    })
  }, [])
  const parentTourSteps = useMemo(
    () =>
      PARENT_DASHBOARD_TOUR_STEPS.map((step) => ({
        ...step,
        prepareTarget: () => prepareDashboardTourTarget(step.id),
      })),
    [prepareDashboardTourTarget],
  )

  useEffect(() => {
    const interval = setInterval(() => setGreetingTime(new Date()), 60_000)
    return () => clearInterval(interval)
  }, [])

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
      setProfileLoadError(false)

      // Get the current user session
      const { data: sessionData } = await supabase.auth.getSession()

      if (!sessionData.session) {
        setParentId(undefined)
        setLoading(false)
        return
      }

      const userId = sessionData.session.user.id
      setParentId(userId)

      const profiles = await fetchActiveChildProfiles(userId)
      setChildProfiles(profiles as ChildProfile[])
      setLoading(false)
    } catch (error) {
      console.error("Error in fetchChildProfiles:", error)
      setProfileLoadError(true)
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
        for (const stats of allStats) {
          if (stats) {
            const activities = await stats.recentActivities
            combinedActivities.push(...activities)
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
              <BrandMark
                containerStyle={{ marginRight: 12 }}
                height={58}
                kind="wordmark"
                tone="main"
                width={58}
              />
              <View className="flex-1">
                <TranslatedText variant="bold" className="text-neutral-900 text-2xl">
                  {parentProfile?.displayName
                    ? `Welcome, ${parentProfile.displayName}`
                    : "Your family"}
                </TranslatedText>
                <TranslatedText className="text-neutral-500">
                  Small steps worth celebrating
                </TranslatedText>
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
          <ScrollView
            ref={dashboardScrollRef}
            className="flex-1"
            contentContainerClassName="p-4 pb-10"
            showsVerticalScrollIndicator={false}
          >
            <LinearGradient
              colors={[brandColors.blue[800], brandColors.blue[600]]}
              end={{ x: 1, y: 1 }}
              start={{ x: 0, y: 0 }}
              style={{
                borderColor: "rgba(248,194,62,0.32)",
                borderRadius: 28,
                borderWidth: 1,
                marginBottom: 24,
                overflow: "hidden",
                padding: 20,
              }}
            >
              <View className="absolute -right-8 -top-10 h-36 w-36 rounded-full bg-primary-400 opacity-30" />
              <View className="absolute -bottom-12 right-16 h-28 w-28 rounded-full bg-accent-400 opacity-20" />
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-4">
                  <Text variant="bold" className="text-xl text-white">
                    {dashboardGreeting.title}
                  </Text>
                </View>
                <View className="h-16 w-16 items-center justify-center rounded-3xl border border-accent-200 bg-accent-50">
                  <Ionicons
                    name={dashboardGreeting.icon}
                    size={29}
                    color={brandColors.gold[700]}
                  />
                </View>
              </View>
            </LinearGradient>
            {/* Child profiles section */}
            <View
              className="mb-6"
              onLayout={({ nativeEvent }) => {
                dashboardTourOffsetsRef.current.profiles = nativeEvent.layout.y
              }}
            >
              <TourTarget id="parent-dashboard-profiles">
                <View>
                  <DashboardSectionHeader
                    action={
                      <TourTarget id="parent-dashboard-language">
                        <TouchableOpacity
                          accessibilityLabel="View all child profiles and learning languages"
                          accessibilityRole="button"
                          className="flex-row items-center rounded-full bg-primary-50 px-3 py-1.5"
                          onPress={() =>
                            router.push("/parent/settings/child-profiles" as any)
                          }
                        >
                          <TranslatedText
                            className="text-xs text-primary-700"
                            variant="bold"
                          >
                            View all
                          </TranslatedText>
                          <Ionicons
                            color={brandColors.victoriaBlue}
                            name="chevron-forward"
                            size={14}
                          />
                        </TouchableOpacity>
                      </TourTarget>
                    }
                    title="Child profiles"
                  />
                </View>
              </TourTarget>

              {loading ? (
                <View className="flex-row items-center justify-center rounded-3xl border border-primary-100 bg-white px-4 py-6">
                  <ActivityIndicator
                    color={brandColors.victoriaBlue}
                    size="small"
                  />
                  <Text className="ml-3 text-sm text-neutral-600">
                    Loading profiles...
                  </Text>
                </View>
              ) : profileLoadError && childProfiles.length === 0 ? (
                <View className="rounded-3xl border border-amber-200 bg-amber-50 p-4">
                  <View className="flex-row items-center">
                    <Ionicons
                      name="cloud-offline-outline"
                      size={22}
                      color={brandColors.gold[700]}
                    />
                    <Text variant="bold" className="ml-3 flex-1 text-amber-900">
                      {"We couldn't load child profiles"}
                    </Text>
                  </View>
                  <Text className="mt-2 text-sm leading-5 text-amber-800">
                    Your profiles have not been removed. Check the connection and
                    try again.
                  </Text>
                  <TouchableOpacity
                    className="mt-3 self-start rounded-xl bg-amber-900 px-4 py-2"
                    onPress={() => void fetchChildProfiles()}
                    accessibilityRole="button"
                    accessibilityLabel="Retry loading child profiles"
                  >
                    <Text variant="bold" className="text-white">Try again</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <ScrollView
                  contentContainerClassName="gap-4 pb-2 pr-4"
                  horizontal
                  showsHorizontalScrollIndicator={false}
                >
                  {/* Child profile cards */}
                  {childProfiles.length > 0
                    ? childProfiles.map((child) => (
                        <TouchableOpacity
                          key={child.id}
                          accessibilityLabel={`Open profile for ${child.name}`}
                          accessibilityRole="button"
                          className="min-h-[190px] w-[164px] rounded-3xl border border-primary-100 bg-white p-4 shadow-sm"
                          onPress={() =>
                            router.push({
                              pathname: "/parent/child-detail/[id]" as any,
                              params: { id: child.id },
                            })
                          }
                          activeOpacity={0.8}
                        >
                          <View className="mb-3 items-center">
                            <View className="h-16 w-16 items-center justify-center rounded-3xl border border-primary-100 bg-primary-50">
                              <Text accessible={false} className="text-[32px]">
                                {getChildAvatarEmoji(child.gender)}
                              </Text>
                            </View>
                          </View>

                          <Text
                            className="mb-1 text-center text-neutral-800"
                            numberOfLines={1}
                            variant="bold"
                          >
                            {child.name}
                          </Text>
                          <View className="flex-row items-center justify-center">
                            <Ionicons
                              color={brandColors.neutral[400]}
                              name="calendar-outline"
                              size={13}
                            />
                            <Text className="ml-1 text-center text-xs text-neutral-500">
                              {child.age} years old
                            </Text>
                          </View>

                          <View className="mt-3 flex-row items-center justify-between border-t border-neutral-100 pt-3">
                            <Text
                              className="flex-1 text-[11px] text-primary-700"
                              numberOfLines={1}
                              variant="bold"
                            >
                              See their learning
                            </Text>
                            <Ionicons
                              color={brandColors.victoriaBlue}
                              name="arrow-forward"
                              size={14}
                            />
                          </View>
                        </TouchableOpacity>
                      ))
                    : null}

                  {/* Add child card */}
                  <TouchableOpacity
                    accessibilityLabel="Add a new child profile"
                    accessibilityRole="button"
                    className="min-h-[190px] w-[164px] items-center justify-center rounded-3xl border-2 border-dashed border-primary-200 bg-primary-50/60 p-4"
                    onPress={() => router.push("/parent/add-child/gender")}
                    activeOpacity={0.8}
                  >
                    <View className="mb-3 h-16 w-16 items-center justify-center rounded-3xl border border-primary-100 bg-white">
                      <Ionicons name="add" size={30} color={brandColors.victoriaBlue} />
                    </View>
                    <TranslatedText variant="bold" className="text-center text-neutral-800">
                      Add Child
                    </TranslatedText>
                    <TranslatedText className="mt-1 text-center text-xs text-neutral-500">
                      New profile
                    </TranslatedText>
                  </TouchableOpacity>
                </ScrollView>
              )}
            </View>

            {/* Recent activities section */}
            <View
              className="mb-6"
              onLayout={({ nativeEvent }) => {
                dashboardTourOffsetsRef.current.progress = nativeEvent.layout.y
              }}
            >
              <TourTarget id="parent-dashboard-progress">
                <View>
                  <DashboardSectionHeader
                    title="Recent Activities"
                  />
                </View>
              </TourTarget>

              <View className="rounded-3xl border border-neutral-100 bg-white p-4 shadow-sm">
                {recentActivities.length > 0 ? (
                  recentActivities.map((activity, index) => (
                    <View
                      key={activity.id}
                      className={`${index !== recentActivities.length - 1 ? "mb-3 border-b border-neutral-100 pb-3" : ""}`}
                    >
                      <View className="flex-row items-center">
                        <View
                          style={{ backgroundColor: `${activity.color}15` }}
                          className="mr-3 h-11 w-11 items-center justify-center rounded-2xl"
                        >
                          <FontAwesome5 name={activity.icon} size={16} color={activity.color} />
                        </View>
                        <View className="flex-1">
                          <Text
                            className="text-sm text-neutral-800"
                            numberOfLines={2}
                            variant="bold"
                          >
                            {activity.childName} {activity.activity}
                          </Text>
                          <View className="mt-1 flex-row items-center justify-between">
                            <Text className="flex-1 text-xs text-neutral-500">
                              {activity.categoryLabel ? `${activity.time} - ${activity.categoryLabel}` : activity.time}
                            </Text>
                            <View className="ml-2 rounded-full bg-primary-50 px-2 py-1">
                              <Text className="text-[11px] text-primary-700" variant="bold">
                                {activity.score}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    </View>
                  ))
                ) : (
                  <View className="items-center py-4">
                    <View className="mb-2 h-11 w-11 items-center justify-center rounded-2xl bg-primary-50">
                      <Ionicons
                        color={brandColors.victoriaBlue}
                        name="sparkles-outline"
                        size={21}
                      />
                    </View>
                    <Text className="text-center text-sm text-neutral-500">
                      No recent activities yet
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  className="mt-3 flex-row items-center justify-center rounded-2xl bg-primary-50 px-4 py-3"
                  onPress={() => router.push("/parent/activities")}
                  accessibilityRole="button"
                  accessibilityLabel="View all child learning activities"
                >
                  <TranslatedText variant="bold" className="text-center text-sm text-primary-700">
                    See All Learning
                  </TranslatedText>
                  <Ionicons
                    color={brandColors.victoriaBlue}
                    name="arrow-forward"
                    size={16}
                    style={{ marginLeft: 6 }}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View className="mb-6">
              <DashboardSectionHeader
                title="Badges and proud moments"
              />

              <TouchableOpacity
                accessibilityLabel="View achievements for every child"
                accessibilityRole="button"
                activeOpacity={0.8}
                className="flex-row items-center justify-between rounded-3xl border border-accent-200 bg-accent-50 p-4"
                onPress={() => router.push("/parent/all-achievements")}
              >
                <View className="min-w-0 flex-1 flex-row items-center">
                  <View className="mr-3 h-12 w-12 items-center justify-center rounded-2xl border border-accent-200 bg-white">
                    <Ionicons
                      name="trophy"
                      size={24}
                      color={brandColors.gold[700]}
                    />
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text variant="bold" className="text-neutral-800">
                      See Every Achievement
                    </Text>
                  </View>
                </View>
                <View className="ml-3 h-9 w-9 items-center justify-center rounded-full bg-white">
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={brandColors.gold[700]}
                  />
                </View>
              </TouchableOpacity>
            </View>

            {/* Parenting tips */}
            <View className="mb-8">
              <DashboardSectionHeader
                action={
                  <View className="rounded-full bg-secondary-50 px-3 py-1.5">
                    <Text
                      className="text-xs text-secondary-700"
                      variant="bold"
                    >
                      {PARENTING_TIPS.length} ideas
                    </Text>
                  </View>
                }
                title="Parenting ideas that work in real life"
              />

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
        visible={parentTourVisible}
        onComplete={completeParentTour}
        onDismiss={dismissParentTour}
        onUnavailable={closeParentTour}
        finishLabel="Explore"
        positioning={PARENT_DASHBOARD_TOUR_POSITIONING}
        steps={parentTourSteps}
      />
    </>
    </GameTourProvider>
  )
}

export default ParentDashboard
