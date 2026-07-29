"use client"

import type React from "react"
import { useCallback, useState, useEffect, useMemo, useRef } from "react"
import {
  View,
  TouchableOpacity,
  ImageBackground,
  ScrollView,
  Animated,
  Easing,
  BackHandler,
  Modal,
  StyleSheet,
  Switch,
  useWindowDimensions,
} from "react-native"
import { StatusBar } from "expo-status-bar"
import { useFocusEffect, useRouter, usePathname } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { Text } from "@/components/StyledText"
import { MarqueeText } from "@/components/common/MarqueeText"
import { SafeAreaView } from "react-native-safe-area-context"
import { useAudio } from "@/context/AudioContext"
import { useChild } from "@/context/ChildContext"
import { useChildUiLanguage } from "@/context/ChildUiLanguageContext"
import { useStreak } from "@/context/StreakContext"
import {
  loadContentBundle,
  getStartableMenuCards,
  type ChildMenuCard,
  type ContentBundle,
} from "@/content/contentRepository"
import { preloadContentBundleImages } from "@/content/imagePreloader"
import { ShanaPortrait } from "@/components/brand/ShanaPortrait"
import { ChildLoadingCard } from "@/components/child/ChildLoadingState"
import {
  ChildActivityCard,
  type ChildActivityCardModel,
} from "@/components/child/ChildActivityCard"
import {
  CHILD_LEAD_CARD_GAP,
  CHILD_LEAD_CARD_WIDTH,
  ChildLeadCard,
} from "@/components/child/ChildLeadCard"
import {
  GameTour,
  GameTourProvider,
  TourTarget,
  useGameTour,
  type GameTourPositioning,
} from "@/components/games/GameTour"
import { brandColors, brandShadows } from "@/constants/Brand"
import { useChildLandscapeOrientation } from "@/hooks/useChildLandscapeOrientation"
import { audioManager } from "@/lib/audioManager"
import { getChildInterfaceCardLayout } from "@/components/child/childInterfaceSizing"
import type { LearningHubStage } from "@/content/learningHubRepository"
import {
  DEFAULT_LEARNING_LANGUAGE_CODE,
  getLearningLanguage,
} from "@/content/languages"
import { useLearningHubProgress } from "@/hooks/useLearningHubProgress"
import { getLearningProgressChildId } from "@/lib/learningProgressRepository"
import { getLearningStageAccessStates } from "@/lib/learningStageAccess"
import {
  COLORING_ACHIEVEMENTS,
  EMPTY_COLORING_PROGRESS,
  getColoringProgress,
  type ColoringProgress,
} from "@/lib/coloringProgress"
import type { ChildUiTranslationKey } from "@/lib/childUiTranslations"
import { ChildHeaderStreak } from "@/components/child/ChildHeaderStreak"
import { childHaptics } from "@/lib/childHaptics"

type LearningCard = ChildActivityCardModel

const CHILD_TAB_BAR_CLEARANCE = 76
const CHILD_LEARNING_TOUR_POSITIONING: GameTourPositioning = {
  androidSpotlightOffsetY: 0,
  includeAndroidStatusBarOffset: false,
  orientation: "landscape",
}

type HeaderIconButtonProps = {
  accessibilityLabel: string
  color: string
  compact: boolean
  icon: keyof typeof Ionicons.glyphMap
  onPress: () => void
  selected?: boolean
}

const HeaderIconButton = ({
  accessibilityLabel,
  color,
  compact,
  icon,
  onPress,
  selected,
}: HeaderIconButtonProps) => (
  <TouchableOpacity
    accessibilityLabel={accessibilityLabel}
    accessibilityRole="button"
    accessibilityState={
      typeof selected === "boolean" ? { selected } : undefined
    }
    activeOpacity={0.78}
    onPress={() => {
      childHaptics.tap()
      onPress()
    }}
    style={[
      styles.headerIconButton,
      compact && styles.headerIconButtonCompact,
    ]}
  >
    <Ionicons color={color} name={icon} size={compact ? 20 : 22} />
  </TouchableOpacity>
)

const TAB_CONTENT_SLUGS: Record<string, string> = {
  index: "games",
  profile: "games",
  learning: "learning",
  coloring: "coloring",
  Stories: "stories",
  museum: "museum",
}

const TAB_TITLE_KEYS: Record<string, ChildUiTranslationKey> = {
  games: "navigation.games",
  learning: "navigation.learning",
  coloring: "navigation.coloring",
  stories: "navigation.stories",
  museum: "navigation.museum",
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
  t: (key: ChildUiTranslationKey, params?: Record<string, string | number | undefined>) => string,
): LearningCard[] => {
  return getLearningStageAccessStates(stages, completedLessonIds).map(
    ({
      completedLessonCount,
      isCompleted,
      isCurrent,
      isExplicitlyLocked,
      isLocked,
      isProgressLocked,
      lockedByStageTitle,
      stage,
      totalLessonCount,
    }) => {
      const status = isLocked
        ? {
            backgroundColor: "rgba(71, 79, 94, 0.9)",
            color: brandColors.white,
            icon: "lock-closed" as const,
            label: t("common.locked"),
          }
        : isCompleted
          ? {
              backgroundColor: "rgba(34, 197, 94, 0.92)",
              color: brandColors.white,
              icon: "checkmark-circle" as const,
              label: t("learning.completed"),
            }
          : isCurrent
            ? {
                backgroundColor: "rgba(248, 194, 62, 0.95)",
                color: brandColors.neutral[800],
                icon: "play-circle" as const,
                label: `${completedLessonCount}/${totalLessonCount} ${t("learning.current")}`,
              }
            : totalLessonCount === 0
              ? {
                  backgroundColor: "rgba(255, 123, 108, 0.94)",
                  color: brandColors.white,
                  icon: "construct" as const,
                  label: t("games.comingSoon"),
                }
              : {
                  backgroundColor: "rgba(2, 116, 187, 0.92)",
                  color: brandColors.white,
                  icon: "map" as const,
                  label: `${completedLessonCount}/${totalLessonCount}`,
                }

      return {
        id: stage.id,
        title: stage.title,
        image: stage.imageAsset ?? stage.imageKey,
        description: stage.description,
        targetPage: `child/learning/${stage.id}`,
        disabled: isLocked,
        stageId: stage.id,
        status,
        progressLabel:
          !isExplicitlyLocked && isProgressLocked && lockedByStageTitle
            ? t("learning.completeToUnlock", {
                required: lockedByStageTitle,
                target: stage.title,
              })
            : totalLessonCount > 0
              ? `${t("learning.progressPosition", { current: completedLessonCount, total: totalLessonCount })} ${t("learning.completed")}`
              : status.label,
      }
    },
  )
}

const AfricanThemeGameInterface: React.FC = () => {
  const [contentBundle, setContentBundle] = useState<ContentBundle | undefined>()
  const [isContentLoading, setIsContentLoading] = useState(true)
  const [contentRetrySequence, setContentRetrySequence] = useState(0)
  const [profileSettingsVisible, setProfileSettingsVisible] = useState(false)
  const [isScreenFocused, setIsScreenFocused] = useState(false)
  const [coloringProgress, setColoringProgress] = useState<ColoringProgress>(
    EMPTY_COLORING_PROGRESS,
  )
  const router = useRouter()
  const { activeChild } = useChild()
  const {
    enabled: useLearningLanguage,
    isLoading: isUiLanguagePreferenceLoading,
    setEnabled: setUseLearningLanguage,
    t,
    translateAchievement,
  } = useChildUiLanguage()
  const {
    settings: audioSettings,
    toggleBackgroundMusicMuted,
    toggleAppSoundsMuted,
  } = useAudio()
  useChildLandscapeOrientation("child activity screen")

  // Animation values for avatar
  const pulseAnim = useRef(new Animated.Value(1)).current
  const bounceAnim = useRef(new Animated.Value(0)).current
  const cardRailRef = useRef<ScrollView>(null)

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
  }, [bounceAnim, pulseAnim])

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
  const isColoringTab = tabId === "coloring"

  useFocusEffect(
    useCallback(() => {
      setIsScreenFocused(true)

      return () => {
        setIsScreenFocused(false)
      }
    }, []),
  )

  const learningLanguageCode =
    contentBundle?.learningHub?.languageCode ??
    activeChild?.selected_language_code ??
    ""
  const completedLearningLessonIds = useLearningHubProgress(
    getLearningProgressChildId(activeChild?.id),
    learningLanguageCode,
    isLearningTab && isScreenFocused && Boolean(contentBundle?.learningHub),
    contentBundle?.progressRevisions?.learning_hub,
  )

  useFocusEffect(
    useCallback(() => {
      let isActive = true

      if (!isColoringTab || !activeChild?.id) {
        setColoringProgress(EMPTY_COLORING_PROGRESS)
        return () => {
          isActive = false
        }
      }

      void getColoringProgress(activeChild.id).then((progress) => {
        if (isActive) setColoringProgress(progress)
      })

      return () => {
        isActive = false
      }
    }, [activeChild?.id, isColoringTab]),
  )

  useEffect(() => {
    let isMounted = true

    const loadMenuContent = async () => {
      setIsContentLoading(true)
      setContentBundle(undefined)
      const result = await loadContentBundle(activeChild?.selected_language_code, {
        // DB-backed curriculum is network-first so a newly published revision
        // is not hidden behind the six-hour last-known-good cache. The content
        // repository still falls back to that cache when the network is down.
        forceRefresh: true,
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

  const contentSlug = TAB_CONTENT_SLUGS[tabId] ?? "games"
  const screenTitle = t(TAB_TITLE_KEYS[contentSlug] ?? "navigation.games")
  const learningCards = useMemo(
    () =>
      contentSlug === "learning"
        ? toLearningHubCards(
            contentBundle?.learningHub?.stages ?? [],
            completedLearningLessonIds,
            t,
          )
        : toLearningCards(
            contentBundle
              ? getStartableMenuCards(contentBundle, contentSlug)
              : [],
          ),
    [completedLearningLessonIds, contentBundle, contentSlug, t],
  )
  const isLearningHubTourReady =
    isLearningTab &&
    isScreenFocused &&
    !isContentLoading &&
    learningCards.length > 0
  const learningHubTour = useGameTour(
    "learning-hub-home",
    activeChild?.id,
    isLearningHubTourReady,
  )
  const prepareLearningStagesTarget = useCallback(() => {
    cardRailRef.current?.scrollTo({
      animated: false,
      x: CHILD_LEAD_CARD_WIDTH + CHILD_LEAD_CARD_GAP,
      y: 0,
    })
  }, [])

  const handleParentalPress = () => {
    childHaptics.tap()
    audioManager.speakAppText("For parents only", {
      language: "en",
      pitch: 1,
      rate: 1,
    })
    router.push("/child/parent-gate" as any)
  }

  // Updated function to navigate to the card's target page with type assertion
  const handleCardPress = (card: LearningCard) => {
    if (card.disabled) {
      childHaptics.warning()
      return
    }

    childHaptics.tap()
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
  const { snapshot: streakSnapshot, isLoading: isStreakLoading } = useStreak()
  const cardLayout = getChildInterfaceCardLayout(width, height)
  const isCompactInterface = width < 700 || height < 350
  const showParentLabel = width >= 760
  const childGender = activeChild?.gender?.trim().toLowerCase()
  const childAvatar =
    activeChild?.avatar ||
    (childGender === "male" || childGender === "boy"
      ? "👦"
      : childGender === "female" || childGender === "girl"
        ? "👧"
        : "👶")
  const learningLanguageName =
    getLearningLanguage(
      activeChild?.selected_language_code ?? DEFAULT_LEARNING_LANGUAGE_CODE,
    )?.name ?? "Learning language"

  return (
    <GameTourProvider>
    <>
      <StatusBar style="light" translucent backgroundColor="transparent" />

      <ImageBackground
        source={require("@/assets/images/gameBackground.jpg")}
        style={styles.backgroundImage}
      >
        <LinearGradient
          colors={["rgba(2, 103, 166, 0.94)", "rgba(11, 69, 104, 0.94)"]}
          end={{ x: 1, y: 1 }}
          start={{ x: 0, y: 0 }}
          style={styles.backgroundWash}
        >
          <View style={styles.backgroundOrbGold} />
          <View style={styles.backgroundOrbOrange} />
          <SafeAreaView edges={[]} style={styles.safeArea}>
            <View
              style={[
                styles.screen,
                { paddingBottom: CHILD_TAB_BAR_CLEARANCE },
              ]}
            >
              <View
                style={[
                  styles.topBar,
                  isCompactInterface && styles.topBarCompact,
                ]}
              >
                <TouchableOpacity
                  accessibilityLabel={`${activeChild?.name || "Learner"} profile and language settings`}
                  accessibilityRole="button"
                  activeOpacity={0.82}
                  onPress={() => setProfileSettingsVisible(true)}
                  style={[
                    styles.profilePill,
                    isCompactInterface && styles.profilePillCompact,
                  ]}
                >
                  <Animated.View
                    style={{
                      transform: [
                        { scale: pulseAnim },
                        { translateY: bounceAnim },
                      ],
                    }}
                  >
                    <View
                      style={[
                        styles.avatar,
                        isCompactInterface && styles.avatarCompact,
                      ]}
                    >
                      <Text
                        accessible={false}
                        style={{
                          fontSize: isCompactInterface ? 26 : 31,
                        }}
                      >
                        {childAvatar}
                      </Text>
                    </View>
                  </Animated.View>
                  <View style={styles.profileCopy}>
                    <MarqueeText
                      className="text-base text-white"
                      variant="bold"
                    >
                      {activeChild?.name || "Learner"}
                    </MarqueeText>
                    <View className="flex-row items-center">
                      <MarqueeText
                        className="text-xs text-white/80"
                        containerStyle={{ flex: 1 }}
                      >
                        {activeChild ? `Age ${activeChild.age}` : "Age 9+"}
                      </MarqueeText>
                      <ChildHeaderStreak
                        activeChildId={activeChild?.id ?? null}
                        accessibilityLabel={t("streak.accessibilityLabel", {
                          count: streakSnapshot?.summary.currentStreak ?? 0,
                        })}
                        isLoading={isStreakLoading}
                        snapshot={streakSnapshot}
                      />
                    </View>
                    <TourTarget id="learning-hub-language">
                      <View style={{ width: "100%" }}>
                        <MarqueeText className="text-[10px] text-white/70">
                          {t("learning.learningLanguage", {
                            language: learningLanguageName,
                          })}
                        </MarqueeText>
                      </View>
                    </TourTarget>
                  </View>
                </TouchableOpacity>

                <View pointerEvents="none" style={styles.titleBlock}>
                  <View style={styles.titleAccentRow}>
                    <View style={styles.titleAccentDot} />
                    <View style={styles.titleAccentLine} />
                  </View>
                  <MarqueeText
                    align="center"
                    containerStyle={{ width: "100%" }}
                    style={{
                      color: brandColors.white,
                      fontSize: isCompactInterface ? 23 : 29,
                    }}
                    variant="display"
                  >
                    {screenTitle}
                  </MarqueeText>
                </View>

                <View style={styles.headerActions}>
                  {isLearningTab ? (
                    <HeaderIconButton
                      accessibilityLabel="Show Learning Hub guide"
                      color={brandColors.victoriaBlue}
                      compact={isCompactInterface}
                      icon="help-circle-outline"
                      onPress={learningHubTour.open}
                    />
                  ) : null}
                  <HeaderIconButton
                    accessibilityLabel={
                      audioSettings.backgroundMusicMuted
                        ? "Turn background music on"
                        : "Turn background music off"
                    }
                    color={
                      audioSettings.backgroundMusicMuted
                        ? brandColors.neutral[500]
                        : brandColors.gold[700]
                    }
                    compact={isCompactInterface}
                    icon={
                      audioSettings.backgroundMusicMuted
                        ? "volume-mute"
                        : "musical-notes"
                    }
                    onPress={toggleBackgroundMusicMuted}
                    selected={!audioSettings.backgroundMusicMuted}
                  />
                  <HeaderIconButton
                    accessibilityLabel={
                      audioSettings.appSoundsMuted
                        ? "Turn app sounds on"
                        : "Turn app sounds off"
                    }
                    color={
                      audioSettings.appSoundsMuted
                        ? brandColors.neutral[500]
                        : brandColors.victoriaBlue
                    }
                    compact={isCompactInterface}
                    icon={
                      audioSettings.appSoundsMuted
                        ? "volume-mute"
                        : "volume-high"
                    }
                    onPress={toggleAppSoundsMuted}
                    selected={!audioSettings.appSoundsMuted}
                  />
                  <TouchableOpacity
                    accessibilityLabel={t("child.forParents")}
                    accessibilityRole="button"
                    activeOpacity={0.8}
                    onPress={handleParentalPress}
                    style={[
                      styles.parentButton,
                      isCompactInterface && styles.parentButtonCompact,
                    ]}
                  >
                    <Ionicons
                      color={brandColors.shanaOrange}
                      name="people"
                      size={isCompactInterface ? 20 : 22}
                    />
                    {showParentLabel ? (
                      <Text
                        className="ml-1.5 text-sm text-primary-700"
                        numberOfLines={1}
                        variant="bold"
                      >
                        {t("child.forParents")}
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                </View>
              </View>

              <ScrollView
                contentContainerStyle={styles.cardRailContent}
                horizontal
                ref={cardRailRef}
                showsHorizontalScrollIndicator={false}
                style={styles.cardRail}
              >
                {isColoringTab ? (
                  <ChildLeadCard
                    accessibilityLabel={`${coloringProgress.savedArtworkCount} saved pictures. ${coloringProgress.unlockedAchievementIds.length} of ${COLORING_ACHIEVEMENTS.length} coloring badges unlocked. Creative spark: try 3 colors today.`}
                    badgeSummary={`${coloringProgress.unlockedAchievementIds.length}/${COLORING_ACHIEVEMENTS.length} ${t("coloring.badges")}`}
                    badges={COLORING_ACHIEVEMENTS.map((achievement) => {
                      const unlocked =
                        coloringProgress.unlockedAchievementIds.includes(
                          achievement.id,
                        )
                      const translatedAchievement = translateAchievement({
                        description: achievement.description,
                        game_key: "coloring",
                        id: achievement.id,
                        name: achievement.title,
                      })

                      return {
                        icon: achievement.icon,
                        id: achievement.id,
                        label: `${translatedAchievement.name}. ${
                          unlocked
                            ? t("common.unlocked")
                            : translatedAchievement.description
                        }`,
                        unlocked,
                      }
                    })}
                    cardHeight={cardLayout.cardHeight}
                    creativePrompt={t("coloring.creativeSparkShort")}
                    mode="coloring"
                    savedSummary={`${coloringProgress.savedArtworkCount} ${t("coloring.saved")}`}
                    title={t("coloring.artJourney")}
                  />
                ) : (
                  <ChildLeadCard
                    cardHeight={cardLayout.cardHeight}
                    mode="journey"
                    startLabel={t("common.start")}
                    subtitle={t("child.learningJourney")}
                  />
                )}

                {learningCards.map((card, index) => (
                  <TourTarget
                    id={
                      isLearningTab && index === 0
                        ? "learning-hub-stages"
                        : `child-menu-card-${contentSlug}-${card.id}`
                    }
                    key={card.id}
                  >
                    <ChildActivityCard
                      card={card}
                      cardGap={cardLayout.cardGap}
                      cardHeight={cardLayout.cardHeight}
                      cardWidth={cardLayout.cardWidth}
                      imageHeight={cardLayout.imageHeight}
                      onPress={() => handleCardPress(card)}
                      textHeight={cardLayout.textHeight}
                    />
                  </TourTarget>
                ))}
                {isContentLoading ? (
                  <ChildLoadingCard
                    label={t(
                      isLearningTab
                        ? "games.loadingLessons"
                        : "games.loadingActivities",
                    )}
                    style={{
                      height: cardLayout.cardHeight,
                      marginRight: cardLayout.cardGap,
                      width: cardLayout.cardWidth,
                    }}
                  />
                ) : null}
                {!isContentLoading && learningCards.length === 0 ? (
                  <View
                    style={[
                      styles.emptyCard,
                      {
                        height: cardLayout.cardHeight,
                        marginRight: cardLayout.cardGap,
                        width: cardLayout.cardWidth,
                      },
                    ]}
                  >
                    <View style={styles.emptyMascot}>
                      <ShanaPortrait
                        accessible={false}
                        importantForAccessibility="no"
                        variant="reading"
                        width={50}
                        height={76}
                      />
                    </View>
                    <View style={styles.emptyCopy}>
                      <Text
                        className="text-lg text-primary-700"
                        numberOfLines={1}
                        variant="display"
                      >
                        {t(
                          isLearningTab
                            ? "games.lessonsComingSoon"
                            : "games.comingSoon",
                        )}
                      </Text>
                      <Text
                        className="mt-1 text-[11px] leading-4 text-neutral-600"
                        numberOfLines={2}
                      >
                        {isLearningTab
                          ? t("learning.preparingHub", {
                              language:
                                getLearningLanguage(
                                  activeChild?.selected_language_code,
                                )?.name ?? t("learning.yourLanguage"),
                            })
                          : t("games.preparingLanguage")}
                      </Text>
                      <TouchableOpacity
                        accessibilityLabel={
                          isLearningTab
                            ? "Retry loading Learning Hub content"
                            : "Retry loading menu content"
                        }
                        accessibilityRole="button"
                        onPress={() =>
                          setContentRetrySequence((current) => current + 1)
                        }
                        style={styles.retryButton}
                      >
                        <Ionicons
                          color={brandColors.white}
                          name="refresh"
                          size={13}
                        />
                        <Text
                          className="ml-1 text-xs text-white"
                          variant="bold"
                        >
                          {t("common.retry")}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : null}
              </ScrollView>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </ImageBackground>
      <GameTour
        visible={learningHubTour.visible}
        onDismiss={learningHubTour.dismiss}
        onUnavailable={learningHubTour.close}
        onComplete={learningHubTour.complete}
        finishLabel={t("games.startLearning")}
        positioning={CHILD_LEARNING_TOUR_POSITIONING}
        steps={[
          {
            id: "language",
            targetId: "learning-hub-language",
            icon: "language-outline",
            placement: "right",
            title: t("learning.yourLanguage"),
            description: t("learning.lessonsInLanguage", { language: learningLanguageName }),
          },
          {
            id: "stages",
            targetId: "learning-hub-stages",
            icon: "map-outline",
            placement: "right",
            prepareTarget: prepareLearningStagesTarget,
            title: t("learning.chooseStage"),
            description: t("learning.chooseStageHint"),
          },
        ]}
      />
      <Modal
        animationType="fade"
        onRequestClose={() => setProfileSettingsVisible(false)}
        supportedOrientations={["landscape", "landscape-left", "landscape-right"]}
        transparent
        visible={profileSettingsVisible}
      >
        <SafeAreaView
          className="flex-1 bg-black/50 items-center justify-center px-6"
          edges={["top", "bottom", "left", "right"]}
          accessibilityViewIsModal
        >
          <View style={styles.profileModalCard}>
            <View style={styles.profileModalHeader}>
              <View style={styles.profileModalAvatar}>
                <Text accessible={false} style={{ fontSize: 27 }}>
                  {childAvatar}
                </Text>
              </View>
              <View style={styles.profileModalHeading}>
                <Text
                  className="text-xl text-primary-700"
                  numberOfLines={1}
                  variant="bold"
                >
                  {t("child.profileSettings")}
                </Text>
                <Text
                  className="text-xs text-neutral-500"
                  numberOfLines={1}
                >
                  {activeChild?.name || "Learner"} is learning {learningLanguageName}
                </Text>
              </View>
              <TouchableOpacity
                accessibilityLabel={t("common.close")}
                accessibilityRole="button"
                onPress={() => setProfileSettingsVisible(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={brandColors.neutral[700]} />
              </TouchableOpacity>
            </View>
            <View style={styles.languageSetting}>
              <View style={styles.languageSettingIcon}>
                <Ionicons
                  color={brandColors.victoriaBlue}
                  name="language"
                  size={22}
                />
              </View>
              <View className="flex-1 pr-3">
                <Text variant="bold" className="text-base text-primary-800">
                  {t("profile.useLearningLanguage")}
                </Text>
                <Text className="mt-0.5 text-xs leading-4 text-neutral-600">
                  {t("profile.useLearningLanguageDescription")}
                </Text>
              </View>
              <Switch
                accessibilityLabel={t("profile.useLearningLanguage")}
                accessibilityRole="switch"
                accessibilityState={{
                  checked: useLearningLanguage,
                  disabled: isUiLanguagePreferenceLoading,
                }}
                disabled={isUiLanguagePreferenceLoading}
                ios_backgroundColor={brandColors.neutral[300]}
                onValueChange={(enabled) => void setUseLearningLanguage(enabled)}
                thumbColor={
                  useLearningLanguage
                    ? brandColors.white
                    : brandColors.neutral[100]
                }
                trackColor={{
                  false: brandColors.neutral[300],
                  true: brandColors.victoriaBlue,
                }}
                value={useLearningLanguage}
              />
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </>
    </GameTourProvider>
  )
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    backgroundColor: brandColors.blue[50],
    borderColor: brandColors.equatorialGold,
    borderRadius: 28,
    borderWidth: 2.5,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  avatarCompact: {
    borderRadius: 24,
    height: 44,
    width: 44,
  },
  backgroundImage: {
    flex: 1,
  },
  backgroundOrbGold: {
    backgroundColor: "rgba(248, 194, 62, 0.12)",
    borderRadius: 90,
    height: 160,
    left: "39%",
    position: "absolute",
    top: -96,
    width: 160,
  },
  backgroundOrbOrange: {
    backgroundColor: "rgba(255, 123, 108, 0.12)",
    borderRadius: 80,
    bottom: -100,
    height: 150,
    position: "absolute",
    right: "13%",
    width: 150,
  },
  backgroundWash: {
    flex: 1,
  },
  cardRail: {
    flex: 1,
  },
  cardRailContent: {
    alignItems: "center",
    paddingBottom: 8,
    paddingLeft: 2,
    paddingRight: 20,
    paddingTop: 12,
  },
  emptyCard: {
    ...brandShadows.soft,
    alignItems: "center",
    backgroundColor: brandColors.white,
    borderColor: brandColors.gold[200],
    borderRadius: 22,
    borderWidth: 1.5,
    flexDirection: "row",
    padding: 13,
  },
  emptyCopy: {
    flex: 1,
    marginLeft: 12,
    minWidth: 0,
  },
  emptyMascot: {
    alignItems: "center",
    backgroundColor: brandColors.gold[50],
    borderColor: brandColors.gold[200],
    borderRadius: 40,
    borderWidth: 1,
    height: 82,
    justifyContent: "center",
    width: 68,
  },
  headerActions: {
    alignItems: "center",
    flexDirection: "row",
    marginLeft: "auto",
  },
  headerIconButton: {
    ...brandShadows.soft,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.96)",
    borderColor: brandColors.gold[200],
    borderRadius: 22,
    borderWidth: 1.5,
    height: 44,
    justifyContent: "center",
    marginLeft: 6,
    width: 44,
  },
  headerIconButtonCompact: {
    borderRadius: 19,
    height: 38,
    marginLeft: 5,
    width: 38,
  },
  parentButton: {
    ...brandShadows.soft,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.96)",
    borderColor: brandColors.gold[200],
    borderRadius: 22,
    borderWidth: 1.5,
    flexDirection: "row",
    height: 44,
    justifyContent: "center",
    marginLeft: 6,
    minWidth: 44,
    paddingHorizontal: 12,
  },
  parentButtonCompact: {
    borderRadius: 19,
    height: 38,
    marginLeft: 5,
    minWidth: 38,
    paddingHorizontal: 8,
  },
  languageSetting: {
    alignItems: "center",
    backgroundColor: brandColors.blue[50],
    borderColor: brandColors.blue[100],
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    padding: 13,
  },
  languageSettingIcon: {
    alignItems: "center",
    backgroundColor: brandColors.white,
    borderColor: brandColors.blue[100],
    borderRadius: 16,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    marginRight: 11,
    width: 42,
  },
  modalCloseButton: {
    alignItems: "center",
    backgroundColor: brandColors.neutral[100],
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  profileCopy: {
    flex: 1,
    marginLeft: 8,
    minWidth: 0,
  },
  profilePill: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.13)",
    borderColor: "rgba(255,255,255,0.25)",
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: "row",
    height: 64,
    paddingHorizontal: 6,
    width: 232,
  },
  profilePillCompact: {
    borderRadius: 21,
    height: 56,
    paddingHorizontal: 5,
    width: 176,
  },
  profileModalAvatar: {
    alignItems: "center",
    backgroundColor: brandColors.gold[50],
    borderColor: brandColors.equatorialGold,
    borderRadius: 22,
    borderWidth: 2,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  profileModalCard: {
    ...brandShadows.lifted,
    backgroundColor: brandColors.white,
    borderColor: brandColors.gold[200],
    borderRadius: 26,
    borderWidth: 2,
    maxWidth: 520,
    padding: 18,
    width: "100%",
  },
  profileModalHeader: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: 14,
  },
  profileModalHeading: {
    flex: 1,
    marginLeft: 11,
    minWidth: 0,
  },
  retryButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: brandColors.blue[600],
    borderRadius: 14,
    flexDirection: "row",
    marginTop: 7,
    minHeight: 28,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  safeArea: {
    flex: 1,
  },
  screen: {
    flex: 1,
    paddingHorizontal: 16,
  },
  titleAccentDot: {
    backgroundColor: brandColors.equatorialGold,
    borderRadius: 4,
    height: 7,
    width: 7,
  },
  titleAccentLine: {
    backgroundColor: "rgba(255,255,255,0.38)",
    borderRadius: 2,
    height: 3,
    marginLeft: 4,
    width: 24,
  },
  titleAccentRow: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: 1,
  },
  titleBlock: {
    alignItems: "center",
    left: 0,
    minWidth: 56,
    position: "absolute",
    right: 0,
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    height: 72,
    marginBottom: 2,
    marginTop: 28,
    position: "relative",
  },
  topBarCompact: {
    height: 64,
    marginTop: 24,
  },
})

export default AfricanThemeGameInterface
