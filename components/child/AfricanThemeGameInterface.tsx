"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import {
  View,
  TouchableOpacity,
  ImageBackground,
  ScrollView,
  Animated,
  Easing,
  BackHandler,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native"
import { StatusBar } from "expo-status-bar"
import { useRouter, usePathname } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { Text } from "@/components/StyledText"
import { TranslatedText } from "@/components/translated-text"
import { SafeAreaView } from "react-native-safe-area-context"
import { useAudio } from "@/context/AudioContext"
import { useChild } from "@/context/ChildContext"
import { CachedImage } from "@/components/common/CachedImage"
import {
  loadContentBundle,
  resolveImageSource,
  type ChildMenuCard,
  type ContentBundle,
} from "@/content/contentRepository"
import { preloadContentBundleImages } from "@/content/imagePreloader"
import { BrandMark } from "@/components/brand/BrandMark"
import { brandColors } from "@/constants/Brand"
import { useChildLandscapeOrientation } from "@/hooks/useChildLandscapeOrientation"
import { audioManager } from "@/lib/audioManager"
import { getChildInterfaceCardLayout } from "@/components/child/childInterfaceSizing"
import {
  getLessonStatus,
  type LearningHubStage,
} from "@/content/learningHubRepository"
import { getLearningLanguage } from "@/content/languages"
import { useLearningHubProgress } from "@/hooks/useLearningHubProgress"
import { getLearningProgressChildId } from "@/lib/learningProgressRepository"

// Define types
type LearningCard = {
  id: string
  title: string
  image?: string
  description: string
  targetPage: string // Add this property to specify which page to navigate to
  stageId?: string
  status?: {
    backgroundColor: string
    color: string
    icon: keyof typeof Ionicons.glyphMap
    label: string
  }
  progressLabel?: string
}

type NavItem = {
  id: string
  icon: any
  label: string
}

const CHILD_TAB_BAR_CLEARANCE = 86

const TAB_CONTENT_SLUGS: Record<string, string> = {
  index: "games",
  profile: "games",
  learning: "learning",
  coloring: "coloring",
  Stories: "stories",
  museum: "museum",
}

const TAB_TITLES: Record<string, string> = {
  games: "Games",
  learning: "Learning",
  coloring: "Coloring",
  stories: "Stories",
  museum: "Museum",
}

const toLearningCards = (cards: ChildMenuCard[]): LearningCard[] =>
  cards.map((card) => ({
    id: card.id,
    title: card.title,
    image: card.image,
    description: card.description,
    targetPage: card.targetPage,
  }))

const toLearningHubCards = (
  stages: LearningHubStage[],
  completedLessonIds: string[],
): LearningCard[] => {
  const completedIds = new Set(completedLessonIds)
  const progressByStage = stages.map((stage) => {
    const startableLessonIds = stage.lessons
      .filter((lesson) => getLessonStatus(lesson, stage) === "startable")
      .map((lesson) => lesson.id)
    const completedLessons = startableLessonIds.filter((lessonId) =>
      completedIds.has(lessonId),
    ).length

    return {
      completedLessons,
      stage,
      totalLessons: startableLessonIds.length,
    }
  })
  const currentStageId = progressByStage.find(
    ({ completedLessons, stage, totalLessons }) =>
      !stage.isLocked && totalLessons > 0 && completedLessons < totalLessons,
  )?.stage.id

  return progressByStage.map(({ completedLessons, stage, totalLessons }) => {
    const isCompleted = totalLessons > 0 && completedLessons === totalLessons
    const status = stage.isLocked
      ? {
          backgroundColor: "rgba(71, 79, 94, 0.9)",
          color: brandColors.white,
          icon: "lock-closed" as const,
          label: "Locked",
        }
      : isCompleted
        ? {
            backgroundColor: "rgba(34, 197, 94, 0.92)",
            color: brandColors.white,
            icon: "checkmark-circle" as const,
            label: "Completed",
          }
        : stage.id === currentStageId
          ? {
              backgroundColor: "rgba(248, 194, 62, 0.95)",
              color: brandColors.neutral[800],
              icon: "play-circle" as const,
              label: `${completedLessons}/${totalLessons} Current`,
            }
          : totalLessons === 0
            ? {
                backgroundColor: "rgba(255, 123, 108, 0.94)",
                color: brandColors.white,
                icon: "construct" as const,
                label: "Coming soon",
              }
            : {
                backgroundColor: "rgba(2, 116, 187, 0.92)",
                color: brandColors.white,
                icon: "map" as const,
                label: `${completedLessons}/${totalLessons}`,
              }

    return {
      id: stage.id,
      title: stage.title,
      image: stage.imageAsset ?? stage.imageKey,
      description: stage.description,
      targetPage: `child/learning/${stage.id}`,
      stageId: stage.id,
      status,
      progressLabel:
        totalLessons > 0
          ? `${completedLessons} of ${totalLessons} lessons complete`
          : status.label,
    }
  })
}

const AfricanThemeGameInterface: React.FC = () => {
  const [selectedLevel, setSelectedLevel] = useState<string>("Basic")
  const [selectedNavItem, setSelectedNavItem] = useState<string>("home")
  const [learningCards, setLearningCards] = useState<LearningCard[]>([])
  const [contentBundle, setContentBundle] = useState<ContentBundle | undefined>()
  const [isContentLoading, setIsContentLoading] = useState(true)
  const [contentRetrySequence, setContentRetrySequence] = useState(0)
  const router = useRouter()
  const { activeChild } = useChild()
  const {
    settings: audioSettings,
    toggleBackgroundMusicMuted,
    toggleAppSoundsMuted,
  } = useAudio()
  useChildLandscapeOrientation("child activity screen")

  // Animation values for avatar
  const pulseAnim = useRef(new Animated.Value(1)).current
  const bounceAnim = useRef(new Animated.Value(0)).current

  // Set up animation
  useEffect(() => {
    // Create combined animation sequence
    const pulseSequence = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    )

    const bounceSequence = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -3,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    )

    // Start animations
    pulseSequence.start()
    bounceSequence.start()

    return () => {
      // Clean up animations
      pulseSequence.stop()
      bounceSequence.stop()
    }
  }, [])

  // Add this effect to handle hardware back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
      // Navigate to parent gate instead of default back behavior
      router.push("/child/parent-gate")
      return true // Prevents default back behavior
    })

    return () => backHandler.remove() // Clean up on unmount
  }, [router])

  // Get the current path to determine which tab we're on
  const pathname = usePathname()
  const pathSegments = pathname.split("/").filter(Boolean)
  const tabId = pathSegments.length <= 1 ? "index" : pathSegments[pathSegments.length - 1]
  const isLearningTab = tabId === "learning"
  const learningLanguageCode =
    contentBundle?.learningHub?.languageCode ??
    activeChild?.selected_language_code ??
    ""
  const completedLearningLessonIds = useLearningHubProgress(
    getLearningProgressChildId(activeChild?.id),
    learningLanguageCode,
    isLearningTab && Boolean(contentBundle?.learningHub),
  )

  // Set the title based on the tab
  const [screenTitle, setScreenTitle] = useState("Games")

  useEffect(() => {
    let isMounted = true

    const loadMenuContent = async () => {
      setIsContentLoading(true)
      setContentBundle(undefined)
      const result = await loadContentBundle(activeChild?.selected_language_code, {
        forceRefresh: contentRetrySequence > 0,
      })

      if (isMounted) {
        setContentBundle(result.bundle)
        setIsContentLoading(false)
      }

      if (result.bundle) {
        void preloadContentBundleImages(result.bundle)
      }
    }

    loadMenuContent()

    return () => {
      isMounted = false
    }
  }, [activeChild?.selected_language_code, contentRetrySequence])

  useEffect(() => {
    const contentSlug = TAB_CONTENT_SLUGS[tabId] ?? "games"
    setScreenTitle(TAB_TITLES[contentSlug] ?? "Games")
    setLearningCards(
      contentSlug === "learning"
        ? toLearningHubCards(
            contentBundle?.learningHub?.stages ?? [],
            completedLearningLessonIds,
          )
        : toLearningCards(contentBundle?.menuCardsByTab[contentSlug] ?? []),
    )
  }, [completedLearningLessonIds, contentBundle, tabId])

  const handleParentalPress = () => {
    audioManager.speakAppText("For parents only", {
      language: "en",
      pitch: 1,
      rate: 1,
    })
    router.push("/child/parent-gate" as any)
  }

  // Updated function to navigate to the card's target page with type assertion
  const handleCardPress = (card: LearningCard) => {
    if (card.stageId) {
      router.push({
        pathname: "/child/learning/[stageId]",
        params: { stageId: card.stageId },
      } as any)
      return
    }

    // Use type assertion to tell TypeScript this is a valid route
    router.push(`/${card.targetPage}` as any)
  }

  const { height, width } = useWindowDimensions()
  const cardLayout = getChildInterfaceCardLayout(width, height)

  return (
    <>
      {/* Make StatusBar transparent to show background behind it */}
      <StatusBar style="light" translucent backgroundColor="transparent" />

      {/* ImageBackground now covers the entire screen including status bar */}
      <ImageBackground source={require("@/assets/images/gameBackground.jpg")} className="flex-1 bg-cover">
        {/* SafeAreaView moved inside ImageBackground */}
        <SafeAreaView className="flex-1" edges={[]} style={{ backgroundColor: "rgba(2, 116, 187, 0.88)" }}>
          {/* Main content area */}
          <View className="flex-1 flex-row" style={{ backgroundColor: "rgba(2, 116, 187, 0.88)" }}>
            {/* Left sidebar - Profile */}
            <View className="flex-row items-center gap-2.5 absolute pt-8 left-5">
              {/* animated avatar */}
              <Animated.View
                style={{
                  transform: [{ scale: pulseAnim }, { translateY: bounceAnim }],
                }}
              >
                <CachedImage
                  source={require("@/assets/images/african-avatar.jpg")}
                  className="w-[70px] h-[70px] rounded-full border-3 border-accent-500"
                  resizeMode="cover"
                  accessibilityLabel={`${activeChild?.name || "Learner"} profile picture`}
                />
              </Animated.View>
              <View className="pl-3">
                <Text variant="bold" className="text-white text-lg mt-2" numberOfLines={1}>
                  {activeChild?.name || "Learner"}
                </Text>
                <Text className="text-white/80 text-sm" numberOfLines={1}>
                  {activeChild ? `Age ${activeChild.age}` : "Age 9+"}
                </Text>
              </View>
            </View>

            {/* Right content area */}
            <View className="flex-1 px-4 pt-8" style={{ paddingBottom: CHILD_TAB_BAR_CLEARANCE }}>
              {/* Header */}
              <View className="flex-row justify-between items-center mb-5 ml-[45%]">
                <View className="flex-row items-center">
                  <TranslatedText variant="bold" className="text-white text-3xl mr-2.5 pt-3" numberOfLines={1}>
                    {screenTitle}
                  </TranslatedText>
                </View>

                <View className="flex-row items-center">
                  <TouchableOpacity
                    className="bg-white rounded-full w-11 h-11 items-center justify-center border-2 border-accent-500 mr-2"
                    onPress={toggleBackgroundMusicMuted}
                    accessibilityRole="button"
                    accessibilityLabel={
                      audioSettings.backgroundMusicMuted ? "Turn background music on" : "Turn background music off"
                    }
                    accessibilityState={{ selected: !audioSettings.backgroundMusicMuted }}
                  >
                    <Ionicons
                      name={audioSettings.backgroundMusicMuted ? "volume-mute" : "musical-notes"}
                      size={23}
                      color={audioSettings.backgroundMusicMuted ? "#64748b" : "#F59E0B"}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="bg-white rounded-full w-11 h-11 items-center justify-center border-2 border-accent-500 mr-2"
                    onPress={toggleAppSoundsMuted}
                    accessibilityRole="button"
                    accessibilityLabel={audioSettings.appSoundsMuted ? "Turn app sounds on" : "Turn app sounds off"}
                    accessibilityState={{ selected: !audioSettings.appSoundsMuted }}
                  >
                    <Ionicons
                      name={audioSettings.appSoundsMuted ? "volume-mute" : "volume-high"}
                      size={23}
                      color={audioSettings.appSoundsMuted ? "#64748b" : brandColors.victoriaBlue}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="bg-white rounded-3xl px-4 py-1.5 flex-row items-center border-2 border-accent-500 mt-0.5"
                    onPress={handleParentalPress}
                  >
                    <Ionicons name="people-sharp" size={30} color={brandColors.shanaOrange} />
                    <TranslatedText variant="medium" className="text-primary-700 text-base ml-1">
                      For parents
                    </TranslatedText>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Cards section */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="flex-1"
                contentContainerStyle={{ alignItems: "center", paddingTop: 12, paddingBottom: 16 }}
              >
                {/* Start card */}
                <View className="bg-white/15 rounded-2xl p-4 mr-2.5 w-[200px]" style={{ height: cardLayout.cardHeight }}>
                  <TranslatedText variant="bold" className="text-white text-2xl">
                    Start
                  </TranslatedText>
                  <TranslatedText className="text-white text-base">of learning</TranslatedText>
                  <TranslatedText className="text-white text-base">journey</TranslatedText>

                  {/* Optional Adinkra symbol */}
                  <View className="mt-2.5 w-12 h-12 rounded-full bg-white/20 items-center justify-center">
                    <Ionicons name="sparkles" size={28} color="#ffffff" />
                  </View>
                  <View className="hidden">
                    <Text className="text-white text-3xl">✨</Text>
                  </View>
                </View>

                {/* Learning cards */}
                {learningCards.map((card) => (
                  <TouchableOpacity
                    key={card.id}
                    accessibilityLabel={`${card.title}. ${card.status?.label ?? "Open"}. ${card.description}${card.progressLabel ? `. ${card.progressLabel}` : ""}`}
                    accessibilityRole="button"
                    className="bg-white rounded-2xl overflow-hidden shadow-md border-2 border-accent-500"
                    style={{
                      height: cardLayout.cardHeight,
                      marginRight: cardLayout.cardGap,
                      width: cardLayout.cardWidth,
                    }}
                    activeOpacity={0.7}
                    onPress={() => handleCardPress(card)}
                  >
                    <View style={{ height: cardLayout.imageHeight }}>
                      <CachedImage
                        source={resolveImageSource(card.image, "african-focus.png")}
                        fallbackSource={resolveImageSource("african-focus.png")}
                        className="w-full h-full"
                        resizeMode="cover"
                        accessibilityLabel={card.title}
                      />
                      {card.status ? (
                        <View
                          className="absolute top-2 right-2 rounded-full px-2.5 py-1 flex-row items-center"
                          style={{ backgroundColor: card.status.backgroundColor }}
                        >
                          <Ionicons
                            name={card.status.icon}
                            size={13}
                            color={card.status.color}
                          />
                          <Text
                            variant="bold"
                            className="text-[10px] ml-1"
                            numberOfLines={1}
                            style={{ color: card.status.color }}
                          >
                            {card.status.label}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <View className="p-3 bg-white justify-center" style={{ height: cardLayout.textHeight }}>
                      <TranslatedText
                        variant="bold"
                        className="text-base text-primary-700 mb-1"
                        numberOfLines={card.stageId ? 2 : 1}
                      >
                        {card.title}
                      </TranslatedText>
                      <TranslatedText className="text-xs text-neutral-600 leading-4" numberOfLines={2}>
                        {card.description}
                      </TranslatedText>
                    </View>
                  </TouchableOpacity>
                ))}
                {isContentLoading && (
                  <View
                    className="bg-white rounded-2xl items-center justify-center border-2 border-accent-500"
                    style={{
                      height: cardLayout.cardHeight,
                      marginRight: cardLayout.cardGap,
                      width: cardLayout.cardWidth,
                    }}
                  >
                    <ActivityIndicator size="large" color={brandColors.victoriaBlue} />
                  </View>
                )}
                {!isContentLoading && learningCards.length === 0 && (
                  <View
                    className="bg-white rounded-2xl items-center justify-center p-4 border-2 border-accent-500"
                    style={{
                      height: cardLayout.cardHeight,
                      marginRight: cardLayout.cardGap,
                      width: cardLayout.cardWidth,
                    }}
                  >
                    <BrandMark kind="mascot" width={54} height={72} />
                    <Text variant="display" className="text-xl text-primary-700 mt-3 text-center">
                      {isLearningTab ? "Lessons coming soon" : "Coming soon"}
                    </Text>
                    <Text className="text-xs text-neutral-600 leading-4 mt-2 text-center">
                      {isLearningTab
                        ? `${getLearningLanguage(activeChild?.selected_language_code)?.name ?? "Your language"} Learning Hub lessons are being prepared.`
                        : "This activity is being prepared for your learning language."}
                    </Text>
                    <TouchableOpacity
                      className="mt-3 rounded-full bg-primary-600 px-4 py-2"
                      onPress={() =>
                        setContentRetrySequence((current) => current + 1)
                      }
                      accessibilityRole="button"
                      accessibilityLabel={
                        isLearningTab
                          ? "Retry loading Learning Hub content"
                          : "Retry loading menu content"
                      }
                    >
                      <Text variant="bold" className="text-xs text-white">
                        Try again
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </SafeAreaView>
      </ImageBackground>
    </>
  )
}

export default AfricanThemeGameInterface
