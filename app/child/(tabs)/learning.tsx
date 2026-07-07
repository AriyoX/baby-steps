import { Ionicons } from "@expo/vector-icons"
import { StatusBar } from "expo-status-bar"
import { useRouter } from "expo-router"
import { useCallback, useEffect, useRef, useState } from "react"
import {
  Animated,
  Dimensions,
  Easing,
  ImageBackground,
  Modal,
  ScrollView,
  TouchableOpacity,
  View,
  type ImageSourcePropType,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Text } from "@/components/StyledText"
import { CachedImage } from "@/components/common/CachedImage"
import { brandColors } from "@/constants/Brand"
import { useAudio } from "@/context/AudioContext"
import { useChild } from "@/context/ChildContext"
import { DEFAULT_LEARNING_LANGUAGE_CODE } from "@/content/languages"
import {
  loadContentBundle,
  resolveImageSource,
  type ContentBundle,
} from "@/content/contentRepository"
import { preloadContentBundleImages } from "@/content/imagePreloader"
import { useChildLandscapeOrientation } from "@/hooks/useChildLandscapeOrientation"
import { audioManager } from "@/lib/audioManager"

type LearningHubCard = {
  id: string
  stageLabel: string
  title: string
  description: string
  detailTitle: string
  detailMessage: string
  imageSource: ImageSourcePropType
  fallbackImage: ImageSourcePropType
  icon: keyof typeof Ionicons.glyphMap
  accentColor: string
}

type LearningStageCardProps = {
  card: LearningHubCard
  height: number
  onPress: (card: LearningHubCard) => void
}

const CHILD_TAB_BAR_CLEARANCE = 86

const buildLearningStageCards = (bundle?: ContentBundle): LearningHubCard[] => {
  const learningStages = bundle?.learningGame.stages ?? []
  const storyImage = bundle?.stories[0]?.pages[0]?.image

  return [
    {
      id: "first-words",
      stageLabel: "Stage 1",
      title: "First Words",
      description: "Greetings, names, and kind everyday words.",
      detailTitle: "First Words is being prepared",
      detailMessage: "Picture words, listening practice, and a tiny quiz will open here soon.",
      imageSource: learningStages[0]?.image
        ? (learningStages[0].image as ImageSourcePropType)
        : resolveImageSource("learning-beginner.jpg"),
      fallbackImage: resolveImageSource("learning-beginner.jpg"),
      icon: "chatbubble-ellipses-outline",
      accentColor: brandColors.shanaOrange,
    },
    {
      id: "family-home",
      stageLabel: "Stage 2",
      title: "Family & Home",
      description: "People, rooms, and familiar places.",
      detailTitle: "Family & Home is next",
      detailMessage: "A guided path for family names, home objects, and simple sentences is coming next.",
      imageSource: learningStages[1]?.image
        ? (learningStages[1].image as ImageSourcePropType)
        : resolveImageSource("african-focus.png"),
      fallbackImage: resolveImageSource("african-focus.png"),
      icon: "home-outline",
      accentColor: brandColors.victoriaBlue,
    },
    {
      id: "everyday-things",
      stageLabel: "Stage 3",
      title: "Everyday Things",
      description: "Foods, numbers, colors, and nearby things.",
      detailTitle: "Everyday Things is almost ready",
      detailMessage: "Objects, numbers, and listening prompts are being prepared.",
      imageSource: resolveImageSource("numbers.png"),
      fallbackImage: resolveImageSource("numbers.png"),
      icon: "shapes-outline",
      accentColor: brandColors.equatorialGold,
    },
    {
      id: "culture-stories",
      stageLabel: "Stage 4",
      title: "Culture & Stories",
      description: "Short tales and cultural moments.",
      detailTitle: "Culture & Stories is being shaped",
      detailMessage: "Story lessons with focused words and questions are coming here.",
      imageSource: resolveImageSource(storyImage ?? "culture.jpg"),
      fallbackImage: resolveImageSource("culture.jpg"),
      icon: "book-outline",
      accentColor: brandColors.success,
    },
    {
      id: "practice-mix",
      stageLabel: "Practice",
      title: "Practice Mix",
      description: "Review words after a few lessons.",
      detailTitle: "Practice will unlock later",
      detailMessage: "Practice will unlock after you finish some lessons.",
      imageSource: resolveImageSource("african-patterns.png"),
      fallbackImage: resolveImageSource("learning-beginner.jpg"),
      icon: "sparkles-outline",
      accentColor: brandColors.neutral[600],
    },
  ]
}

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
  const [cards, setCards] = useState<LearningHubCard[]>(() => buildLearningStageCards())
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selectedCard, setSelectedCard] = useState<LearningHubCard | null>(null)
  const languageCode = activeChild?.selected_language_code || DEFAULT_LEARNING_LANGUAGE_CODE
  const { height } = Dimensions.get("window")
  const cardHeight = Math.max(166, Math.min(210, height * 0.48))
  const pulseAnim = useRef(new Animated.Value(1)).current
  const bounceAnim = useRef(new Animated.Value(0)).current

  useChildLandscapeOrientation("child learning hub")

  useEffect(() => {
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
  }, [bounceAnim, pulseAnim])

  const loadHubContent = useCallback(async () => {
    setLoadError(null)

    try {
      const result = await loadContentBundle(languageCode)
      const bundle = result.bundle

      setCards(buildLearningStageCards(bundle))

      if (bundle) {
        void preloadContentBundleImages(bundle)
      }
    } catch (error) {
      console.error("Error loading learning hub preview content:", error)
      setCards(buildLearningStageCards())
      setLoadError("Using the preview path while lessons load.")
    }
  }, [languageCode])

  useEffect(() => {
    void loadHubContent()
  }, [loadHubContent])

  const handleParentalPress = () => {
    audioManager.speakAppText("For parents only", {
      language: "en",
      pitch: 1,
      rate: 1,
    })
    router.push("/child/parent-gate" as any)
  }

  const handleCardPress = (card: LearningHubCard) => {
    setSelectedCard(card)
  }

  const closeStageNotice = () => {
    setSelectedCard(null)
  }

  return (
    <>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <ImageBackground source={require("@/assets/images/gameBackground.jpg")} className="flex-1 bg-cover">
        <SafeAreaView className="flex-1" edges={[]} style={{ backgroundColor: "rgba(2, 116, 187, 0.88)" }}>
          <View className="flex-1 flex-row" style={{ backgroundColor: "rgba(2, 116, 187, 0.88)" }}>
            <View className="flex-row items-center gap-2.5 absolute pt-8 left-5">
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

            <View className="flex-1 px-4 pt-8" style={{ paddingBottom: CHILD_TAB_BAR_CLEARANCE }}>
              <View className="flex-row justify-between items-center mb-5 ml-[45%]">
                <View className="flex-row items-center">
                  <Text variant="bold" className="text-white text-3xl mr-2.5 pt-3" numberOfLines={1}>
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
                contentContainerStyle={{ alignItems: "center", paddingTop: 12, paddingBottom: 16 }}
              >
                <View className="bg-white/15 rounded-2xl p-4 mr-2.5 w-[200px]" style={{ height: cardHeight }}>
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

              {loadError ? (
                <TouchableOpacity
                  className="absolute bottom-24 left-4 bg-white rounded-3xl px-4 py-2 flex-row items-center border-2 border-accent-500"
                  onPress={loadHubContent}
                  accessibilityRole="button"
                  accessibilityLabel="Try loading learning content again"
                >
                  <Ionicons name="refresh" size={15} color={brandColors.shanaOrange} />
                  <Text variant="bold" className="text-primary-700 text-xs ml-1">
                    Try again
                  </Text>
                </TouchableOpacity>
              ) : null}
          </View>
          </View>
        </SafeAreaView>
      </ImageBackground>

      <Modal
        visible={selectedCard !== null}
        transparent
        animationType="fade"
        onRequestClose={closeStageNotice}
      >
        <View className="flex-1 bg-black/50 items-center justify-center px-6">
          <View className="bg-white rounded-2xl border-2 border-accent-500 p-5 w-full max-w-md">
            {selectedCard ? (
              <>
                <View className="flex-row items-center mb-4">
                  <View
                    className="w-12 h-12 rounded-full items-center justify-center mr-3"
                    style={{ backgroundColor: `${selectedCard.accentColor}22` }}
                  >
                    <Ionicons name={selectedCard.icon} size={24} color={selectedCard.accentColor} />
                  </View>
                  <View className="flex-1">
                    <Text variant="bold" className="text-primary-700 text-xs uppercase">
                      {selectedCard.stageLabel}
                    </Text>
                    <Text variant="bold" className="text-primary-700 text-xl" numberOfLines={1}>
                      {selectedCard.title}
                    </Text>
                  </View>
                  <TouchableOpacity
                    className="w-9 h-9 rounded-full bg-neutral-100 items-center justify-center"
                    onPress={closeStageNotice}
                    accessibilityRole="button"
                    accessibilityLabel="Close lesson notice"
                  >
                    <Ionicons name="close" size={19} color={brandColors.charcoalBlack} />
                  </TouchableOpacity>
                </View>

                <Text variant="bold" className="text-primary-700 text-lg mb-2">
                  {selectedCard.detailTitle}
                </Text>
                <Text className="text-neutral-600 text-sm leading-5 mb-5">
                  {selectedCard.detailMessage}
                </Text>

                <TouchableOpacity
                  className="rounded-full py-3 items-center"
                  style={{ backgroundColor: selectedCard.accentColor }}
                  onPress={closeStageNotice}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                >
                  <Text variant="bold" className="text-white text-base">
                    Got it
                  </Text>
                </TouchableOpacity>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </>
  )
}
