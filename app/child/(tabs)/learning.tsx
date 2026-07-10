// TODO: Extract shared child tab shell/card rail from AfricanThemeGameInterface so Learning, Games, Stories, Coloring, and future Museum can share the same layout while still using different data/actions.

import { Ionicons } from "@expo/vector-icons"
import { StatusBar } from "expo-status-bar"
import { useRouter } from "expo-router"
import { useEffect, useMemo, useRef } from "react"
import {
  Animated,
  Dimensions,
  Easing,
  ImageBackground,
  ScrollView,
  TouchableOpacity,
  View,
  type ImageSourcePropType,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Text } from "@/components/StyledText"
import { CachedImage } from "@/components/common/CachedImage"
import { LearningLanguageUnavailableState } from "@/components/learning/LearningLanguageUnavailableState"
import { brandColors } from "@/constants/Brand"
import { useAudio } from "@/context/AudioContext"
import { useChild } from "@/context/ChildContext"
import {
  DEFAULT_LEARNING_LANGUAGE_CODE,
  getLearningLanguage,
} from "@/content/languages"
import {
  getLearningLanguageContent,
  resolveLearningHubLanguageCode,
  type LearningHubStage,
} from "@/content/learningHubRepository"
import { resolveImageSource } from "@/content/assets"
import { useChildLandscapeOrientation } from "@/hooks/useChildLandscapeOrientation"
import { audioManager } from "@/lib/audioManager"

type LearningHubCard = {
  id: string
  stageLabel: string
  title: string
  description: string
  imageSource: ImageSourcePropType
  fallbackImage: ImageSourcePropType
  icon: keyof typeof Ionicons.glyphMap
  accentColor: string
  stage: LearningHubStage
}

type LearningStageCardProps = {
  card: LearningHubCard
  height: number
  onPress: (card: LearningHubCard) => void
}

const CHILD_TAB_BAR_CLEARANCE = 86

type StagePresentation = {
  icon: keyof typeof Ionicons.glyphMap
  accentColor: string
  fallbackImageKey: string
}

const STAGE_PRESENTATION: Record<string, StagePresentation> = {
  "first-words": {
    icon: "chatbubble-ellipses-outline",
    accentColor: brandColors.shanaOrange,
    fallbackImageKey: "learning-beginner.jpg",
  },
  "family-home": {
    icon: "home-outline",
    accentColor: brandColors.victoriaBlue,
    fallbackImageKey: "african-focus.png",
  },
  "everyday-things": {
    icon: "shapes-outline",
    accentColor: brandColors.equatorialGold,
    fallbackImageKey: "numbers.png",
  },
  "culture-stories": {
    icon: "book-outline",
    accentColor: brandColors.success,
    fallbackImageKey: "culture.jpg",
  },
  "practice-mix": {
    icon: "sparkles-outline",
    accentColor: brandColors.neutral[600],
    fallbackImageKey: "learning-beginner.jpg",
  },
}

const DEFAULT_STAGE_PRESENTATION: StagePresentation = {
  icon: "school-outline",
  accentColor: brandColors.victoriaBlue,
  fallbackImageKey: "learning-beginner.jpg",
}

const buildLearningStageCards = (stages: LearningHubStage[]): LearningHubCard[] =>
  stages.map((stage) => {
    const presentation = STAGE_PRESENTATION[stage.id] ?? DEFAULT_STAGE_PRESENTATION

    return {
      id: stage.id,
      stageLabel: stage.isPractice ? "Practice" : `Stage ${stage.stageNumber}`,
      title: stage.title,
      description: stage.description,
      imageSource: resolveImageSource(stage.imageKey, presentation.fallbackImageKey),
      fallbackImage: resolveImageSource(presentation.fallbackImageKey),
      icon: presentation.icon,
      accentColor: presentation.accentColor,
      stage,
    }
  })

const LearningStageCard = ({
  card,
  height,
  onPress,
}: LearningStageCardProps) => (
  <TouchableOpacity
    className="bg-white rounded-2xl w-[250px] mr-4 overflow-hidden shadow-md border-2 border-accent-500"
    style={{ height }}
    onPress={() => onPress(card)}
    activeOpacity={0.7}
    accessibilityRole="button"
    accessibilityLabel={`${card.title}. ${card.description}`}
  >
    <CachedImage
      source={card.imageSource}
      fallbackSource={card.fallbackImage}
      className="w-full h-[60%]"
      resizeMode="cover"
      accessibilityLabel={`${card.title} picture`}
    />

    <View className="bg-white p-3 h-[40%] justify-center">
      <Text variant="bold" className="text-base text-primary-700 mb-1" numberOfLines={1}>
        {card.title}
      </Text>
      <Text className="text-xs text-neutral-600 leading-4" numberOfLines={2}>
        {card.description}
      </Text>
    </View>
  </TouchableOpacity>
)

export default function LearningHubScreen() {
  const router = useRouter()
  const { activeChild } = useChild()
  const {
    settings: audioSettings,
    toggleBackgroundMusicMuted,
    toggleAppSoundsMuted,
  } = useAudio()
  const languageCode = resolveLearningHubLanguageCode(
    activeChild?.selected_language_code || DEFAULT_LEARNING_LANGUAGE_CODE,
  )
  const languageContent = useMemo(
    () => getLearningLanguageContent(languageCode),
    [languageCode],
  )
  const languageName = getLearningLanguage(languageCode)?.name
  const cards = useMemo(
    () => buildLearningStageCards(languageContent?.stages ?? []),
    [languageContent],
  )
  const { height } = Dimensions.get("window")
  const cardHeight = Math.max(156, Math.min(194, height * 0.44))
  const pulseAnim = useRef(new Animated.Value(1)).current
  const bounceAnim = useRef(new Animated.Value(0)).current

  useChildLandscapeOrientation("child learning hub")

  useEffect(() => {
    if (!languageContent) {
      return
    }

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

    pulseSequence.start()
    bounceSequence.start()

    return () => {
      pulseSequence.stop()
      bounceSequence.stop()
    }
  }, [bounceAnim, languageContent, pulseAnim])

  const handleParentalPress = () => {
    audioManager.speakAppText("For parents only", {
      language: "en",
      pitch: 1,
      rate: 1,
    })
    router.push("/child/parent-gate" as any)
  }

  const handleCardPress = (card: LearningHubCard) => {
    router.push({
      pathname: "/child/learning/[stageId]",
      params: { stageId: card.id },
    } as any)
  }

  if (!languageContent) {
    return (
      <>
        <StatusBar style="light" translucent backgroundColor="transparent" />
        <LearningLanguageUnavailableState
          languageName={languageName}
          actionLabel="Back to Games"
          onAction={() => router.replace("/child" as any)}
          bottomClearance={CHILD_TAB_BAR_CLEARANCE}
        />
      </>
    )
  }

  return (
    <>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <ImageBackground source={require("@/assets/images/gameBackground.jpg")} className="flex-1 bg-cover">
        <SafeAreaView className="flex-1" edges={[]} style={{ backgroundColor: "rgba(2, 116, 187, 0.88)" }}>
          <View className="flex-1 flex-row" style={{ backgroundColor: "rgba(2, 116, 187, 0.88)" }}>
            <View className="flex-row items-center gap-2.5 absolute pt-6 left-5">
              <Animated.View
                style={{
                  transform: [{ scale: pulseAnim }, { translateY: bounceAnim }],
                }}
              >
                <CachedImage
                  source={require("@/assets/images/african-avatar.jpg")}
                  className="w-16 h-16 rounded-full border-3 border-accent-500"
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

            <View className="flex-1 px-4 pt-6" style={{ paddingBottom: CHILD_TAB_BAR_CLEARANCE }}>
              <View className="flex-row justify-between items-center mb-3 ml-[45%]">
                <View className="flex-row items-center">
                  <Text variant="bold" className="text-white text-2xl mr-2.5 pt-2" numberOfLines={1}>
                    Learning
                  </Text>
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
                      color={audioSettings.backgroundMusicMuted ? "#64748b" : brandColors.equatorialGold}
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
                    accessibilityRole="button"
                    accessibilityLabel="For parents"
                  >
                    <Ionicons name="people-sharp" size={30} color={brandColors.shanaOrange} />
                    <Text variant="medium" className="text-primary-700 text-base ml-1">
                      For parents
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="flex-1"
                style={{ marginTop: 3 }}
                contentContainerStyle={{ alignItems: "center", paddingTop: 6, paddingBottom: 8 }}
              >
                <View className="bg-white/15 rounded-2xl p-3 mr-2.5 w-[200px]" style={{ height: cardHeight }}>
                  <Text variant="bold" className="text-white text-2xl">
                    Start
                  </Text>
                  <Text className="text-white text-base">of learning</Text>
                  <Text className="text-white text-base">journey</Text>

                  <View className="mt-2.5">
                    <Text className="text-white text-3xl">{"\u2728"}</Text>
                  </View>
                </View>

                {cards.map((item) => (
                  <LearningStageCard
                    key={item.id}
                    card={item}
                    height={cardHeight}
                    onPress={handleCardPress}
                  />
                ))}
              </ScrollView>

          </View>
          </View>
        </SafeAreaView>
      </ImageBackground>

    </>
  )
}
