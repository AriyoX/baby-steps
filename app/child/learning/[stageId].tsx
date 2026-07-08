import { Ionicons } from "@expo/vector-icons"
import { Stack, useLocalSearchParams, useRouter } from "expo-router"
import { StatusBar } from "expo-status-bar"
import type { Audio } from "expo-av"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ActivityIndicator,
  ImageBackground,
  ScrollView,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Text } from "@/components/StyledText"
import { CachedImage } from "@/components/common/CachedImage"
import { brandColors } from "@/constants/Brand"
import { useAudio } from "@/context/AudioContext"
import { useChild } from "@/context/ChildContext"
import { DEFAULT_LEARNING_LANGUAGE_CODE } from "@/content/languages"
import {
  getFirstLessonByMechanic,
  getLearningStageById,
  type LearningHubLessonItem,
} from "@/content/learningHubRepository"
import { resolveImageSource } from "@/content/assets"
import { useChildLandscapeOrientation } from "@/hooks/useChildLandscapeOrientation"
import {
  LEARNING_PLACEHOLDER_SOUND,
  resolveLearningAudioSource,
} from "@/lib/audioAssets"

const getRouteStageId = (value: unknown): string => {
  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0] : ""
  }

  return typeof value === "string" ? value : ""
}

const getItemFallbackLabel = (item?: LearningHubLessonItem): string => {
  switch (item?.type) {
    case "story":
      return "Story"
    case "culture":
      return "Culture"
    case "prompt":
      return "Look"
    case "review":
      return "Review"
    default:
      return "Word"
  }
}

type LessonStateProps = {
  icon: keyof typeof Ionicons.glyphMap
  title: string
  message: string
  buttonLabel: string
  onButtonPress: () => void
}

const LessonState = ({
  icon,
  title,
  message,
  buttonLabel,
  onButtonPress,
}: LessonStateProps) => (
  <ImageBackground source={require("@/assets/images/gameBackground.jpg")} className="flex-1 bg-cover">
    <SafeAreaView className="flex-1" edges={[]} style={{ backgroundColor: "rgba(2, 116, 187, 0.88)" }}>
      <View className="flex-1 items-center justify-center px-8">
        <View className="bg-white rounded-2xl border-2 border-accent-500 p-6 w-full max-w-md items-center">
          <View className="w-16 h-16 rounded-full bg-primary-50 items-center justify-center mb-4">
            <Ionicons name={icon} size={32} color={brandColors.victoriaBlue} />
          </View>
          <Text variant="bold" className="text-primary-700 text-2xl text-center mb-2">
            {title}
          </Text>
          <Text className="text-neutral-600 text-base text-center leading-6 mb-5">
            {message}
          </Text>
          <TouchableOpacity
            className="bg-primary-600 rounded-full px-6 py-3"
            onPress={onButtonPress}
            accessibilityRole="button"
            accessibilityLabel={buttonLabel}
          >
            <Text variant="bold" className="text-white text-base">
              {buttonLabel}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  </ImageBackground>
)

export default function LearningStageLessonScreen() {
  const router = useRouter()
  const params = useLocalSearchParams()
  const { activeChild } = useChild()
  const { createAppSound, replayAppSound, unloadAppSound } = useAudio()
  const { width, height } = useWindowDimensions()
  const stageId = getRouteStageId(params.stageId)
  const languageCode = activeChild?.selected_language_code || DEFAULT_LEARNING_LANGUAGE_CODE
  const [isLoading, setIsLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isRevealed, setIsRevealed] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [learningSound, setLearningSound] = useState<Audio.Sound | null>(null)
  const [audioLoadFailed, setAudioLoadFailed] = useState(false)
  const [audioReplayCount, setAudioReplayCount] = useState(0)
  const audioReplayInFlightRef = useRef(false)
  const audioReplayCooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useChildLandscapeOrientation("child learning lesson")

  const stage = useMemo(
    () => getLearningStageById(languageCode, stageId),
    [languageCode, stageId],
  )
  const lesson = useMemo(
    () => getFirstLessonByMechanic(languageCode, stageId, "tap_to_learn"),
    [languageCode, stageId],
  )
  const items = lesson?.items ?? []
  const currentItem = items[currentIndex]
  const currentAudioResolution = useMemo(
    () => resolveLearningAudioSource(currentItem?.audioAsset),
    [currentItem?.audioAsset],
  )
  const isLastItem = currentIndex === items.length - 1
  const lessonImageSize = Math.min(172, Math.max(116, height * 0.36))
  const availableLessonCardWidth = Math.max(240, width - 48)
  const lessonCardWidth = Math.min(
    540,
    Math.max(300, width * 0.48),
    availableLessonCardWidth,
  )

  useEffect(() => {
    let isMounted = true
    setIsLoading(true)

    Promise.resolve().then(() => {
      if (isMounted) {
        setIsLoading(false)
      }
    })

    return () => {
      isMounted = false
    }
  }, [languageCode, stageId])

  useEffect(() => {
    if (audioReplayCooldownRef.current) {
      clearTimeout(audioReplayCooldownRef.current)
      audioReplayCooldownRef.current = null
    }

    audioReplayInFlightRef.current = false
    setLearningSound(null)
    setAudioLoadFailed(false)
    setAudioReplayCount(0)

    if (!currentItem) {
      return
    }

    let isMounted = true
    let loadedSound: Audio.Sound | null = null

    const loadCurrentSound = async () => {
      const primarySound = await createAppSound(currentAudioResolution.source)

      if (!isMounted) {
        await unloadAppSound(primarySound)
        return
      }

      if (primarySound) {
        loadedSound = primarySound
        setLearningSound(primarySound)
        return
      }

      if (!currentAudioResolution.isPlaceholder) {
        const fallbackSound = await createAppSound(LEARNING_PLACEHOLDER_SOUND)

        if (!isMounted) {
          await unloadAppSound(fallbackSound)
          return
        }

        if (fallbackSound) {
          loadedSound = fallbackSound
          setLearningSound(fallbackSound)
          return
        }
      }

      setAudioLoadFailed(true)
    }

    void loadCurrentSound().catch((error) => {
      console.warn("Could not load tap-to-learn audio:", error)
      if (isMounted) {
        setAudioLoadFailed(true)
      }
    })

    return () => {
      isMounted = false

      if (loadedSound) {
        void unloadAppSound(loadedSound).catch((error) => {
          console.warn("Could not unload tap-to-learn audio:", error)
        })
      }
    }
  }, [
    createAppSound,
    currentAudioResolution.isPlaceholder,
    currentAudioResolution.source,
    currentItem,
    unloadAppSound,
  ])

  useEffect(() => {
    return () => {
      if (audioReplayCooldownRef.current) {
        clearTimeout(audioReplayCooldownRef.current)
      }
    }
  }, [])

  useEffect(() => {
    setCurrentIndex(0)
    setIsRevealed(false)
    setIsComplete(false)
  }, [lesson?.id, stageId])

  const goBackToLearning = () => {
    router.replace("/child/learning" as any)
  }

  const showPreviousItem = () => {
    setCurrentIndex((index) => Math.max(0, index - 1))
    setIsRevealed(false)
  }

  const showNextItem = () => {
    setCurrentIndex((index) => Math.min(items.length - 1, index + 1))
    setIsRevealed(false)
  }

  const replayCurrentItemAudio = useCallback(() => {
    setIsRevealed(true)
    setAudioReplayCount((count) => count + 1)

    if (!learningSound || audioReplayInFlightRef.current) {
      return
    }

    audioReplayInFlightRef.current = true

    void replayAppSound(learningSound)
      .catch((error) => {
        console.warn("Could not replay tap-to-learn audio:", error)
        setAudioLoadFailed(true)
      })
      .finally(() => {
        if (audioReplayCooldownRef.current) {
          clearTimeout(audioReplayCooldownRef.current)
        }

        audioReplayCooldownRef.current = setTimeout(() => {
          audioReplayInFlightRef.current = false
          audioReplayCooldownRef.current = null
        }, 120)
      })
  }, [learningSound, replayAppSound])

  const advanceLesson = () => {
    if (isLastItem) {
      finishLesson()
      return
    }

    showNextItem()
  }

  const finishLesson = () => {
    // TODO: Save lesson progress once the Learning hub has a local-first progress model.
    setIsComplete(true)
  }

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false, animation: "slide_from_right" }} />
        <ImageBackground source={require("@/assets/images/gameBackground.jpg")} className="flex-1 bg-cover">
          <SafeAreaView className="flex-1 items-center justify-center" edges={[]} style={{ backgroundColor: "rgba(2, 116, 187, 0.88)" }}>
            <StatusBar style="light" translucent backgroundColor="transparent" />
            <ActivityIndicator size="large" color={brandColors.equatorialGold} />
            <Text className="text-white text-base mt-4">Loading lesson...</Text>
          </SafeAreaView>
        </ImageBackground>
      </>
    )
  }

  if (!stage) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false, animation: "slide_from_right" }} />
        <StatusBar style="light" translucent backgroundColor="transparent" />
        <LessonState
          icon="search-outline"
          title="Lesson not found"
          message="This Learning stage is not available right now."
          buttonLabel="Back to Learning"
          onButtonPress={goBackToLearning}
        />
      </>
    )
  }

  if (!lesson) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false, animation: "slide_from_right" }} />
        <StatusBar style="light" translucent backgroundColor="transparent" />
        <LessonState
          icon="construct-outline"
          title="Coming soon"
          message={`${stage.title} does not have a tap-to-learn lesson yet.`}
          buttonLabel="Back to Learning"
          onButtonPress={goBackToLearning}
        />
      </>
    )
  }

  if (items.length === 0 || !currentItem) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false, animation: "slide_from_right" }} />
        <StatusBar style="light" translucent backgroundColor="transparent" />
        <LessonState
          icon="images-outline"
          title="Cards coming soon"
          message={`${lesson.title} needs learning cards before it can start.`}
          buttonLabel="Back to Learning"
          onButtonPress={goBackToLearning}
        />
      </>
    )
  }

  if (isComplete) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false, animation: "slide_from_right" }} />
        <StatusBar style="light" translucent backgroundColor="transparent" />
        <ImageBackground source={require("@/assets/images/gameBackground.jpg")} className="flex-1 bg-cover">
          <SafeAreaView className="flex-1" edges={[]} style={{ backgroundColor: "rgba(2, 116, 187, 0.88)" }}>
            <View className="flex-1 items-center justify-center px-8">
              <View className="bg-white rounded-2xl border-2 border-accent-500 p-6 w-full max-w-md items-center">
                <View className="w-20 h-20 rounded-full bg-green-100 items-center justify-center mb-4">
                  <Ionicons name="checkmark-circle" size={44} color={brandColors.success} />
                </View>
                <Text variant="bold" className="text-primary-700 text-3xl text-center mb-2">
                  Great learning!
                </Text>
                <Text className="text-neutral-600 text-base text-center leading-6 mb-5">
                  You finished {lesson.title} in {stage.title}.
                </Text>
                <View className="flex-row">
                  <TouchableOpacity
                    className="bg-neutral-100 rounded-full px-5 py-3 mr-3"
                    onPress={() => {
                      setCurrentIndex(0)
                      setIsRevealed(false)
                      setIsComplete(false)
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Practice again"
                  >
                    <Text variant="bold" className="text-primary-700 text-base">
                      Practice again
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="bg-primary-600 rounded-full px-5 py-3"
                    onPress={goBackToLearning}
                    accessibilityRole="button"
                    accessibilityLabel="Back to Learning"
                  >
                    <Text variant="bold" className="text-white text-base">
                      Back to Learning
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </SafeAreaView>
        </ImageBackground>
      </>
    )
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false, animation: "slide_from_right" }} />
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <ImageBackground source={require("@/assets/images/gameBackground.jpg")} className="flex-1 bg-cover">
        <SafeAreaView className="flex-1" edges={[]} style={{ backgroundColor: "rgba(2, 116, 187, 0.88)" }}>
          <View className="flex-1 px-6 pt-6 pb-5">
            <View className="flex-row items-center justify-between mb-4">
              <TouchableOpacity
                className="w-12 h-12 rounded-full bg-white items-center justify-center border-2 border-accent-500"
                onPress={goBackToLearning}
                accessibilityRole="button"
                accessibilityLabel="Back to Learning"
              >
                <Ionicons name="arrow-back" size={22} color={brandColors.victoriaBlue} />
              </TouchableOpacity>

              <View className="flex-1 px-4">
                <Text variant="bold" className="text-white text-2xl text-center" numberOfLines={1}>
                  {lesson.title}
                </Text>
                <Text className="text-white/80 text-sm text-center" numberOfLines={1}>
                  {stage.title}
                </Text>
              </View>

              <View className="bg-white rounded-full px-4 py-2 border-2 border-accent-500">
                <Text variant="bold" className="text-primary-700 text-sm">
                  {currentIndex + 1}/{items.length}
                </Text>
              </View>
            </View>

            <View className="h-2 bg-white/30 rounded-full overflow-hidden mb-4">
              <View
                className="h-full bg-accent-500 rounded-full"
                style={{ width: `${((currentIndex + 1) / items.length) * 100}%` }}
              />
            </View>

            <ScrollView
              className="flex-1"
              contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
              showsVerticalScrollIndicator={false}
            >
              <View className="flex-row items-center justify-center">
                <TouchableOpacity
                  className="bg-white rounded-2xl border-2 border-accent-500 p-5 items-center"
                  style={{ width: lessonCardWidth }}
                  onPress={replayCurrentItemAudio}
                  activeOpacity={0.82}
                  accessibilityRole="button"
                  accessibilityLabel={`Tap the card to hear ${currentItem.localText}`}
                >
                  <CachedImage
                    source={resolveImageSource(currentItem.imageKey, stage.imageKey)}
                    fallbackSource={resolveImageSource(stage.imageKey)}
                    style={{ width: lessonImageSize, height: lessonImageSize, borderRadius: 18 }}
                    resizeMode="cover"
                    accessibilityLabel={`${currentItem.englishText} picture`}
                  />

                  <View className="mt-4 items-center w-full">
                    <Text className="text-primary-700 text-base mb-1">
                      {audioLoadFailed
                        ? "Tap the card to learn"
                        : audioReplayCount > 0
                          ? "Tap again to listen"
                          : "Tap the card to listen"}
                    </Text>
                    <Text
                      variant="bold"
                      className="text-primary-700 text-4xl text-center"
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.7}
                    >
                      {currentItem.localText}
                    </Text>
                    <View className="bg-neutral-100 rounded-2xl px-5 py-3 mt-4 min-w-[220px] items-center">
                      <Text
                        variant="bold"
                        className={`text-center ${isRevealed ? "text-success text-2xl" : "text-neutral-500 text-lg"}`}
                        numberOfLines={2}
                      >
                        {isRevealed ? currentItem.englishText : getItemFallbackLabel(currentItem)}
                      </Text>
                    </View>
                    {isRevealed ? (
                      <Text variant="bold" className="text-accent-600 text-lg mt-3">
                        Great!
                      </Text>
                    ) : (
                      <Text className="text-neutral-500 text-sm mt-3">
                        Tap once to hear and see the meaning
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View className="flex-row items-center justify-between pt-4">
              <TouchableOpacity
                className="rounded-full px-5 py-3 flex-row items-center"
                style={{
                  backgroundColor: currentIndex === 0 ? brandColors.neutral[200] : "#ffffff",
                  opacity: currentIndex === 0 ? 0.72 : 1,
                }}
                onPress={showPreviousItem}
                disabled={currentIndex === 0}
                accessibilityRole="button"
                accessibilityLabel="Back"
                accessibilityState={{ disabled: currentIndex === 0 }}
              >
                <Ionicons
                  name="chevron-back"
                  size={18}
                  color={currentIndex === 0 ? brandColors.neutral[500] : brandColors.victoriaBlue}
                />
                <Text
                  variant="bold"
                  className={`text-base ml-1 ${currentIndex === 0 ? "text-neutral-500" : "text-primary-700"}`}
                >
                  Back
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="rounded-full px-5 py-3 flex-row items-center"
                style={{
                  backgroundColor: isLastItem ? brandColors.success : brandColors.shanaOrange,
                }}
                onPress={advanceLesson}
                accessibilityRole="button"
                accessibilityLabel={isLastItem ? "Finish" : "Next"}
              >
                <Text variant="bold" className="text-white text-base mr-1">
                  {isLastItem ? "Finish" : "Next"}
                </Text>
                <Ionicons
                  name={isLastItem ? "checkmark" : "chevron-forward"}
                  size={18}
                  color="#ffffff"
                />
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </ImageBackground>
    </>
  )
}
