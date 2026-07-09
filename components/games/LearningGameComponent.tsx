"use client"

import type React from "react"
import { useState, useEffect, useCallback, useRef } from "react"
import {
  View,
  TouchableOpacity,
  Image,
  ImageBackground,
  Animated,
  ScrollView,
  FlatList,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import type { Audio } from "expo-av"
import { LinearGradient } from "expo-linear-gradient"
import { StatusBar } from "expo-status-bar"
import { useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { Text } from "@/components/StyledText"
import { ComingSoonState } from "@/components/child/ComingSoonState"
import { CachedImage } from "@/components/common/CachedImage"
import { useChild } from "@/context/ChildContext"
import { brandColors } from "@/constants/Brand"
import { DEFAULT_LEARNING_LANGUAGE_CODE } from "@/content/languages"
import {
  loadContentBundle,
  resolveImageSource,
  type LearningGameLevel,
  type LearningGameStage,
  type LearningGameWord,
} from "@/content/contentRepository"
import { preloadContentBundleImages } from "@/content/imagePreloader"
import { saveActivity } from "@/lib/utils"
import { syncProgressNow } from "@/lib/progressRepository"
import { useAchievements } from "./achievements/useAchievements"
import type { AchievementDefinition } from "./achievements/achievementTypes"
import { playWordAudio, loadGameSounds } from "./utils/audioManager"
import { audioManager } from "@/lib/audioManager"

import {
  loadGameProgress as loadProgress,
  saveGameProgress as saveProgress,
  type UserStats,
  DEFAULT_USER_STATS,
} from "./utils/progressManagerLugandaLearning" // Adjust the import path as necessary

type GameState = "menu" | "stageSelect" | "levelSelect" | "learning" | "playing" | "levelComplete"

const GAME_SCREEN_OVERLAY = "rgba(2, 116, 187, 0.88)"

const getWordsForLevel = (
  stages: LearningGameStage[],
  stageId: number,
  levelId: number,
): LearningGameWord[] => {
  const stage = stages.find((item) => item.id === stageId)
  const level = stage?.levels.find((item) => item.id === levelId)
  return level?.words ?? []
}

const isStageCompleted = (
  stageId: number,
  completedLevels: number[],
  stages: LearningGameStage[],
): boolean => {
  const stage = stages.find((item) => item.id === stageId)
  return stage ? stage.levels.every((level) => completedLevels.includes(level.id)) : false
}

const unlockNextLevel = (
  currentStageId: number,
  currentLevelId: number,
  stages: LearningGameStage[],
): LearningGameStage[] => {
  return stages.map((stage) => {
    if (stage.id !== currentStageId) return stage

    return {
      ...stage,
      levels: stage.levels.map((level, index, levels) => {
        if (levels[index - 1]?.id === currentLevelId && level.isLocked) {
          return { ...level, isLocked: false }
        }

        return level
      }),
    }
  })
}

const unlockNextStage = (
  currentStageId: number,
  stages: LearningGameStage[],
): LearningGameStage[] => {
  return stages.map((stage, index, allStages) => {
    if (allStages[index - 1]?.id === currentStageId && stage.isLocked) {
      return {
        ...stage,
        isLocked: false,
        levels: stage.levels.map((level, levelIndex) =>
          levelIndex === 0 ? { ...level, isLocked: false } : level,
        ),
      }
    }

    return stage
  })
}

const LugandaLearningGame: React.FC = () => {
  const router = useRouter()
  const { activeChild } = useChild()
  const languageCode = activeChild?.selected_language_code || DEFAULT_LEARNING_LANGUAGE_CODE
  const achievementGameKey = languageCode === "lg" ? "luganda_learning_game" : "learning_game"
  const {
    // definedAchievements, // Not directly used for display in-game, but hook needs it
    // earnedChildAchievements, // Not directly used for display in-game
    isLoadingAchievements, // Can be combined with main isLoading
    checkAndGrantNewAchievements,
  } = useAchievements(activeChild?.id, achievementGameKey) // Pass childId and gameKey

  const [newlyEarnedAchievementLL, setNewlyEarnedAchievementLL] = useState<AchievementDefinition | null>(null)
  const gameStartTime = useRef(Date.now())

  // Get dimensions for responsive layout
  const { width: windowWidth, height: windowHeight } = useWindowDimensions()
  const isLandscape = windowWidth > windowHeight
  const landscapeWidth = Math.max(windowWidth, windowHeight)
  const landscapeHeight = Math.min(windowWidth, windowHeight)
  const stageCardGap = 16
  const stageCardWidth = Math.min(270, Math.max(230, landscapeWidth * 0.32))
  const stageCardHeight = Math.max(190, Math.min(232, landscapeHeight * 0.56))
  const stageCardImageHeight = Math.round(stageCardHeight * 0.54)
  const stageCardBodyHeight = stageCardHeight - stageCardImageHeight
  const stageListEndPadding = Math.max(16, landscapeWidth - stageCardWidth - 32)
  const learningImageHeight = Math.min(260, Math.max(180, landscapeHeight * 0.5))

  // Game state management
  const [gameState, setGameState] = useState<GameState>("stageSelect")
  const [gameTitle, setGameTitle] = useState<string>("Learning")
  const [stages, setStages] = useState<LearningGameStage[]>([])
  const [selectedStage, setSelectedStage] = useState<LearningGameStage | null>(null)
  const [selectedLevel, setSelectedLevel] = useState<LearningGameLevel | null>(null)
  const [currentLearningIndex, setCurrentLearningIndex] = useState<number>(0)
  const [currentWords, setCurrentWords] = useState<LearningGameWord[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)

  // Game progress state
  const [totalScore, setTotalScore] = useState<number>(0)
  const [completedLevels, setCompletedLevels] = useState<number[]>([])

  // Playing state
  const [currentWordIndex, setCurrentWordIndex] = useState<number>(0)
  const [currentWord, setCurrentWord] = useState<LearningGameWord | null>(null)
  const [options, setOptions] = useState<string[]>([])
  const [levelScore, setLevelScore] = useState<number>(0)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [sound, setSound] = useState<Audio.Sound | undefined>()
  const [correctSound, setCorrectSound] = useState<Audio.Sound | undefined>()
  const [wrongSound, setWrongSound] = useState<Audio.Sound | undefined>()

  // Animations
  const progressWidth = useState<Animated.Value>(new Animated.Value(0))[0]
  const shakeAnimation = useState<Animated.Value>(new Animated.Value(0))[0]
  const fadeAnim = useState<Animated.Value>(new Animated.Value(0))[0]
  const confettiAnim = useState<Animated.Value>(new Animated.Value(0))[0]
  const [shakingOption, setShakingOption] = useState<string | null>(null)

  const unloadSound = (loadedSound?: Audio.Sound) => {
    if (!loadedSound) return

    void audioManager.unloadAppSound(loadedSound).catch((error) => {
      console.warn("Could not unload learning-game sound:", error)
    })
  }

  // Update animation when state changes
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start()

    return () => {
      fadeAnim.setValue(0)
    }
  }, [gameState, currentLearningIndex, currentWordIndex])

  // Load game progress on mount
  useEffect(() => {
    let isMounted = true

    const init = async () => {
      setIsLoading(true)

      try {
        const contentResult = await loadContentBundle(languageCode)
        const contentStages = contentResult.bundle?.learningGame.stages ?? []
        if (contentResult.bundle) {
          void preloadContentBundleImages(contentResult.bundle)
        }
        await loadSounds()

        if (!isMounted) return

        setGameTitle(contentResult.bundle?.learningGame.title ?? "Learning")
        setSelectedStage(null)
        setSelectedLevel(null)
        setCurrentWords([])

        if (activeChild && contentStages.length > 0) {
          const progress = await loadProgress(activeChild.id, languageCode, contentStages)

          if (!isMounted) return

          setTotalScore(progress.totalScore)
          setCompletedLevels(progress.completedLevels)
          setStages(progress.stages.length > 0 ? progress.stages : contentStages)
        } else {
          setTotalScore(0)
          setCompletedLevels([])
          setStages(contentStages)
        }
      } catch (error) {
        console.error("Error loading learning game content:", error)
        if (isMounted) {
          setStages([])
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    init()

    return () => {
      isMounted = false
      unloadSound(sound)
      unloadSound(correctSound)
      unloadSound(wrongSound)
    }
  }, [activeChild, languageCode])

  // Setup when selecting a level
  useEffect(() => {
    if (!selectedLevel || !selectedStage) {
      return
    }

    const words =
      selectedLevel.words.length > 0
        ? selectedLevel.words
        : getWordsForLevel(stages, selectedStage.id, selectedLevel.id)

    setCurrentWords(words)

    if (gameState === "learning") {
      setCurrentLearningIndex((index) => Math.min(index, Math.max(words.length - 1, 0)))
    }

    if (gameState === "playing") {
      setCurrentWordIndex(0)
      setLevelScore(0)
      setSelectedOption(null)
      setIsCorrect(null)

      if (words.length > 0) {
        setCurrentWord(words[0])
        generateOptions(words[0], words)
      } else {
        setCurrentWord(null)
        setOptions([])
      }
    }
  }, [selectedLevel, gameState, selectedStage, stages])

  // Update progress bar
  useEffect(() => {
    if (gameState === "playing" && currentWords.length > 0) {
      Animated.timing(progressWidth, {
        toValue: (currentWordIndex / currentWords.length) * 100,
        duration: 500,
        useNativeDriver: false,
      }).start()
    }
  }, [currentWordIndex, gameState, currentWords])

  // Handle shaking animation for wrong answers
  useEffect(() => {
    if (shakingOption !== null) {
      Animated.sequence([
        Animated.timing(shakeAnimation, {
          toValue: 10,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnimation, {
          toValue: -10,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnimation, {
          toValue: 10,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnimation, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShakingOption(null)
      })
    }
  }, [shakingOption])

  const loadSounds = async (): Promise<void> => {
    try {
      const { correctSound: newCorrectSound, wrongSound: newWrongSound } = await loadGameSounds()
      setCorrectSound(newCorrectSound)
      setWrongSound(newWrongSound)
    } catch (error) {
      console.error("Error loading sounds", error)
    }
  }

  const playWordSound = async (word: LearningGameWord = currentWord!): Promise<void> => {
    try {
      const newSound = await playWordAudio(word, sound)
      setSound(newSound)
    } catch (error) {
      console.error("Error playing sound", error)
    }
  }

  // Stage selection
  const selectStage = (stage: LearningGameStage) => {
    if (!stage.isLocked) {
      setSelectedStage(stage)
      setGameState("levelSelect")
      // Reset timer when selecting a stage
      gameStartTime.current = Date.now()
    }
  }

  // Level selection
  const selectLevel = (level: LearningGameLevel) => {
    if (!level.isLocked) {
      const words = selectedStage
        ? getWordsForLevel(stages, selectedStage.id, level.id)
        : level.words

      fadeAnim.setValue(0)
      progressWidth.setValue(0)
      setSelectedLevel(level)
      setCurrentWords(words)
      setCurrentWord(null)
      setOptions([])
      setCurrentWordIndex(0)
      setLevelScore(0)
      setSelectedOption(null)
      setIsCorrect(null)
      setGameState("learning")
      setCurrentLearningIndex(0)
      // Reset timer when selecting a level
      gameStartTime.current = Date.now()
    }
  }

  // Learning navigation
  const nextLearningWord = (): void => {
    if (currentLearningIndex < currentWords.length - 1) {
      fadeAnim.setValue(0)
      setCurrentLearningIndex(currentLearningIndex + 1)
    }
  }

  const previousLearningWord = (): void => {
    if (currentLearningIndex > 0) {
      fadeAnim.setValue(0)
      fadeAnim.setValue(0)
      setCurrentLearningIndex(currentLearningIndex - 1)
    }
  }

  const startGame = (): void => {
    setGameState("playing")
    setCurrentWordIndex(0)
    setLevelScore(0)
    setSelectedOption(null)
    setIsCorrect(null)
    if (currentWords.length > 0) {
      setCurrentWord(currentWords[0])
      generateOptions(currentWords[0], currentWords)
    }
  }

  // Generate options for the game
  const generateOptions = (word: LearningGameWord, wordList: LearningGameWord[]): void => {
    const correctAnswer = word.english
    let optionsArray: string[] = [correctAnswer]

    // Add 3 random incorrect options
    while (optionsArray.length < 4) {
      const randomIndex = Math.floor(Math.random() * wordList.length)
      const randomOption = wordList[randomIndex].english

      if (!optionsArray.includes(randomOption)) {
        optionsArray.push(randomOption)
      }
    }

    // Shuffle options
    optionsArray = optionsArray.sort(() => Math.random() - 0.5)
    setOptions(optionsArray)
  }

  const handleOptionSelect = (option: string): void => {
    if (!currentWord || selectedOption) return

    setSelectedOption(option)

    if (option === currentWord.english) {
      // Correct answer
      setIsCorrect(true)
      setLevelScore(levelScore + 10)

      // Play sound and animate
      if (correctSound) {
        void audioManager.replayAppSound(correctSound).catch((error) => {
          console.warn("Could not replay correct sound:", error)
        })
      }

      // Animate confetti on correct answer
      Animated.timing(confettiAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start(() => {
        confettiAnim.setValue(0)
      })

      // Move to next word after a delay
      setTimeout(() => {
        nextWord()
      }, 1500)
    } else {
      // Wrong answer
      setIsCorrect(false)
      setShakingOption(option)

      if (wrongSound) {
        void audioManager.replayAppSound(wrongSound).catch((error) => {
          console.warn("Could not replay wrong sound:", error)
        })
      }

      // Allow trying again after a delay
      setTimeout(() => {
        setSelectedOption(null)
        setIsCorrect(null)
      }, 1500)
    }
  }

  const nextWord = useCallback((): void => {
    const nextIndex = currentWordIndex + 1
    fadeAnim.setValue(0)

    if (nextIndex < currentWords.length) {
      setCurrentWordIndex(nextIndex)
      setCurrentWord(currentWords[nextIndex])
      setSelectedOption(null)
      setIsCorrect(null)

      setTimeout(() => {
        generateOptions(currentWords[nextIndex], currentWords)
      }, 300)
    } else {
      // Level completed
      completeLevelAndUpdateProgress()
    }
  }, [currentWordIndex, currentWords])

  const trackActivity = async (isStageComplete = false) => {
    if (!activeChild) return

    const duration = Math.round((Date.now() - gameStartTime.current) / 1000) // duration in seconds

    await saveActivity({
      child_id: activeChild.id,
      activity_type: "language",
      activity_name: isStageComplete
        ? `Completed ${selectedStage?.title} Stage`
        : `Mastered ${selectedLevel?.title} Words`,
      score: levelScore.toString(),
      duration,
      completed_at: new Date().toISOString(),
      details: `${
        isStageComplete
          ? `Completed all levels in ${selectedStage?.title} stage`
          : `Learned ${currentWords.length} words in ${selectedLevel?.title}`
      }`,
      stage: selectedStage?.id,
      level: selectedLevel?.id,
      language_code: languageCode,
    })

    // Reset timer for next activity
    gameStartTime.current = Date.now()
  }

  // REMOVE this function from your component, its logic will be integrated:
  // const saveGameProgress = async () => { ... };

  // MODIFY completeLevelAndUpdateProgress like this:
  const completeLevelAndUpdateProgress = async () => {
    // Make it async
    if (!activeChild || !selectedLevel || !selectedStage) {
      console.error("Missing activeChild, selectedLevel, or selectedStage in completeLevelAndUpdateProgress")
      return
    }

    const newTotalScoreState = totalScore + levelScore // Use this for UI update
    const newCompletedLevelsState = [...completedLevels]
    if (!newCompletedLevelsState.includes(selectedLevel.id)) {
      newCompletedLevelsState.push(selectedLevel.id)
    }

    let currentLocalStagesState = [...stages]
    let wasStageNewlyCompleted = false
    let nextStageUnlocked = false

    currentLocalStagesState = unlockNextLevel(selectedStage.id, selectedLevel.id, currentLocalStagesState)

    // Check if current stage is completed and unlock next if criteria met
    const isCurrentStageNowCompleted = isStageCompleted(selectedStage.id, newCompletedLevelsState, currentLocalStagesState)
    if (isCurrentStageNowCompleted) {
      wasStageNewlyCompleted = true // Mark that this stage was just completed
      const currentStageIndex = currentLocalStagesState.findIndex((s) => s.id === selectedStage.id)
      const nextStageDefinition =
        currentStageIndex >= 0 ? currentLocalStagesState[currentStageIndex + 1] : undefined
      if (nextStageDefinition && newTotalScoreState >= nextStageDefinition.requiredScore) {
        currentLocalStagesState = unlockNextStage(selectedStage.id, currentLocalStagesState)
        nextStageUnlocked = true
      }
    }

    await trackActivity(nextStageUnlocked)

    // Prepare User Stats (integrate logic similar to progressManager.updateUserStats)
    const progressSoFar = await loadProgress(activeChild.id, languageCode, currentLocalStagesState) // Load existing stats
    const existingUserStats = progressSoFar.userStats || { ...DEFAULT_USER_STATS } // Use default if undefined

    const lastPlayedDate = new Date(existingUserStats.lastPlayed || 0) // Handle case where lastPlayed might be missing
    const today = new Date()

    const isNewDay =
      today.getFullYear() !== lastPlayedDate.getFullYear() ||
      today.getMonth() !== lastPlayedDate.getMonth() ||
      today.getDate() !== lastPlayedDate.getDate()

    let newStreakDays = existingUserStats.streakDays
    if (isNewDay) {
      newStreakDays = existingUserStats.streakDays + 1
    } else if (existingUserStats.streakDays === 0) {
      // First play ever, or first play today after a reset
      newStreakDays = 1
    }

    const updatedUserStatsState: UserStats = {
      totalWords: (existingUserStats.totalWords || 0) + currentWords.length,
      correctAnswers: (existingUserStats.correctAnswers || 0) + levelScore / 10,
      wrongAnswers: (existingUserStats.wrongAnswers || 0) + (currentWords.length - levelScore / 10),
      lastPlayed: today.toISOString(),
      streakDays: newStreakDays,
    }

    // --- ACHIEVEMENT CHECKING ---
    let achievementPointsEarned = 0
    const eventsForAchievements = []

    // Event for level completion
    eventsForAchievements.push({
      type: "level_completed" as const, // Use 'as const' for literal types
      gameKey: achievementGameKey,
      levelId: selectedLevel.id,
      stageId: selectedStage.id, // Good to have context
      // newTotalScore: newTotalScoreState, // Can be sent if achievements depend on it at this exact moment
      // currentUserStats: updatedUserStatsState, // Can be sent
    })

    // Event for perfect quiz (if applicable)
    const maxPossibleScoreForLevel = currentWords.length * 10
    if (levelScore === maxPossibleScoreForLevel) {
      eventsForAchievements.push({
        type: "level_perfect_clear" as const,
        gameKey: achievementGameKey,
        levelId: selectedLevel.id,
        currentLevelScore: levelScore,
        currentLevelMaxScore: maxPossibleScoreForLevel,
      })
    }

    // Event for stage completion (if it happened)
    if (wasStageNewlyCompleted) {
      eventsForAchievements.push({
        type: "stage_completed" as const,
        gameKey: achievementGameKey,
        stageId: selectedStage.id,
        // newTotalScore: newTotalScoreState,
        // currentUserStats: updatedUserStatsState,
      })
    }

    // Event for score update and stats update (always send, achievements will check thresholds)
    eventsForAchievements.push({
      type: "score_updated" as const, // Could also be 'stats_updated' or both
      gameKey: achievementGameKey,
      newTotalScore: newTotalScoreState, // Pass the score *before* achievement points
      currentUserStats: updatedUserStatsState, // Pass the latest stats
    })
    // Also an explicit stats_updated if you have achievements that only look at stats
    eventsForAchievements.push({
      type: "stats_updated" as const,
      gameKey: achievementGameKey,
      currentUserStats: updatedUserStatsState,
    })

    for (const event of eventsForAchievements) {
      const newlyEarnedFromEvent = await checkAndGrantNewAchievements(event)
      if (newlyEarnedFromEvent.length > 0) {
        newlyEarnedFromEvent.forEach((ach) => {
          achievementPointsEarned += ach.points
          console.log(`LEARNING GAME - NEW ACHIEVEMENT: ${ach.name}`)
          setNewlyEarnedAchievementLL(ach) // For modal/toast
          // Toast.show(`Achievement: ${ach.name}! +${ach.points} pts`, Toast.LONG);
        })
      }
    }

    // Add achievement points to the total score that will be saved
    const finalTotalScoreToSave = newTotalScoreState + achievementPointsEarned

    // Update React state with final scores including achievement points
    setTotalScore(finalTotalScoreToSave) // UI reflects score + achievement points
    setCompletedLevels(newCompletedLevelsState)
    setStages(currentLocalStagesState)

    // Now, save everything using the newly computed values
    try {
      await saveProgress(
        finalTotalScoreToSave, // Save the score including achievement points
        newCompletedLevelsState,
        currentLocalStagesState,
        updatedUserStatsState,
        activeChild.id,
        languageCode,
      )
      void syncProgressNow(activeChild.id)
      console.log("Learning game progress saved successfully.")
    } catch (error) {
      console.error("Learning game: Failed to save game progress:", error)
    }

    setGameState("levelComplete")
  }

  const renderAchievementUnlockedModalLL = () => {
    if (!newlyEarnedAchievementLL) return null

    return (
      <View
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: "rgba(0,0,0,0.6)",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 100,
        }}
      >
        <View
          style={{
            backgroundColor: "white",
            borderRadius: 20,
            padding: 24,
            width: "85%",
            maxWidth: 380,
            alignItems: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
          }}
        >
          <View
            style={{
              position: "absolute",
              top: -40,
              backgroundColor: "#f59e0b",
              width: 80,
              height: 80,
              borderRadius: 40,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 4,
              borderColor: "white",
            }}
          >
            <Ionicons name={(newlyEarnedAchievementLL.icon_name as any) || "star"} size={36} color="white" />
          </View>
          <Text
            style={{
              fontWeight: "bold",
              fontSize: 20,
              color: "#b45309",
              marginTop: 48,
              marginBottom: 8,
              textAlign: "center",
            }}
          >
            Achievement Unlocked!
          </Text>
          <Text style={{ fontWeight: "bold", fontSize: 24, color: "#374151", marginBottom: 8, textAlign: "center" }}>
            {newlyEarnedAchievementLL.name}
          </Text>
          <Text style={{ fontSize: 14, color: "#4b5563", textAlign: "center", marginBottom: 16 }}>
            {newlyEarnedAchievementLL.description}
          </Text>
          <Text style={{ fontWeight: "bold", fontSize: 18, color: "#f59e0b", marginBottom: 24 }}>
            +{newlyEarnedAchievementLL.points} Points!
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: "#f59e0b",
              paddingVertical: 12,
              paddingHorizontal: 40,
              borderRadius: 12,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.2,
              shadowRadius: 1.41,
              elevation: 2,
            }}
            onPress={() => setNewlyEarnedAchievementLL(null)}
          >
            <Text style={{ fontWeight: "bold", color: "white", fontSize: 16, textAlign: "center" }}>Awesome!</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  const saveGameProgress = async () => {
    if (!activeChild) return

    await saveProgress(
      totalScore,
      completedLevels,
      stages,
      {
        totalWords: currentWords.length,
        correctAnswers: levelScore / 10, // Assuming 10 points per correct answer
        wrongAnswers: currentWords.length - levelScore / 10,
        lastPlayed: new Date().toISOString(),
        streakDays: 1, // This would need more complex logic to properly track
      },
      activeChild.id,
      languageCode,
    )
  }

  // STAGE SELECTION SCREEN
  const renderStageSelectScreen = () => {
    return (
      <ImageBackground source={require("@/assets/images/gameBackground.jpg")} className="flex-1 bg-cover">
        <SafeAreaView className="flex-1" edges={[]} style={{ backgroundColor: GAME_SCREEN_OVERLAY }}>
          <StatusBar style="light" translucent backgroundColor="transparent" />

          <View className="flex-1 px-6 pt-6 pb-5">
            <View className="flex-row items-center justify-between mb-4">
              <TouchableOpacity
                className="w-12 h-12 rounded-full bg-white justify-center items-center border-2 border-accent-500"
                onPress={() => router.back()}
                accessibilityRole="button"
                accessibilityLabel="Back to Games"
              >
                <Ionicons name="arrow-back" size={22} color={brandColors.victoriaBlue} />
              </TouchableOpacity>

              <View className="flex-1 px-4">
                <Text variant="bold" className="text-white text-3xl text-center" numberOfLines={1}>
                  {gameTitle}
                </Text>
                <Text className="text-white/85 text-sm text-center" numberOfLines={2}>
                  Pick a word stage, review the cards, then play the quiz.
                </Text>
              </View>

              <View className="flex-row items-center bg-white rounded-full px-4 py-2 border-2 border-accent-500">
                <Image
                  source={require("../../assets/images/coin.png")}
                  style={{ width: 20, height: 20, marginRight: 6 }}
                  resizeMode="contain"
                />
                <Text variant="bold" className="text-amber-500 text-base" numberOfLines={1}>
                  {totalScore}
                </Text>
              </View>
            </View>

            <View className="bg-white/15 rounded-2xl px-4 py-3 mb-4">
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-4">
                  <Text variant="bold" className="text-white text-lg" numberOfLines={1}>
                    Choose a stage
                  </Text>
                  <Text className="text-white/85 text-sm" numberOfLines={2}>
                    Swipe through friendly practice sets and continue where you left off.
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <Ionicons name="sparkles-outline" size={22} color="#ffffff" />
                  <Text variant="bold" className="text-white text-sm ml-2" numberOfLines={1}>
                    {stages.length} stages
                  </Text>
                </View>
              </View>
            </View>

            <Animated.View
              className="flex-1"
              style={{
                opacity: fadeAnim,
                transform: [
                  {
                    translateY: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [18, 0],
                    }),
                  },
                ],
              }}
            >
              <FlatList
                data={stages}
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={stageCardWidth + stageCardGap}
                snapToAlignment="start"
                decelerationRate="fast"
                contentContainerStyle={{
                  alignItems: "center",
                  paddingTop: 6,
                  paddingBottom: 10,
                  paddingRight: stageListEndPadding,
                }}
                renderItem={({ item: stage }) => {
                  const completedLevelCount = stage.levels.filter((level) => completedLevels.includes(level.id)).length
                  const isCompleted = completedLevelCount === stage.levels.length
                  const statusLabel = stage.isLocked ? `${stage.requiredScore} pts` : isCompleted ? "Done" : "Start"
                  const statusIcon: keyof typeof Ionicons.glyphMap = stage.isLocked
                    ? "lock-closed"
                    : isCompleted
                      ? "checkmark-circle"
                      : "play-circle"
                  const statusColor = stage.isLocked
                    ? brandColors.neutral[600]
                    : isCompleted
                      ? brandColors.success
                      : brandColors.victoriaBlue

                  return (
                    <TouchableOpacity
                      key={stage.id}
                      style={{
                        width: stageCardWidth,
                        marginRight: stageCardGap,
                        height: stageCardHeight,
                        borderColor: stage.isLocked ? brandColors.neutral[200] : brandColors.equatorialGold,
                        opacity: stage.isLocked ? 0.74 : 1,
                      }}
                      className="bg-white rounded-2xl overflow-hidden shadow-md border-2"
                      onPress={() => selectStage(stage)}
                      disabled={stage.isLocked}
                      activeOpacity={stage.isLocked ? 1 : 0.75}
                      accessibilityRole="button"
                      accessibilityLabel={`${stage.title}. ${stage.description}. ${statusLabel}.`}
                      accessibilityState={{ disabled: stage.isLocked }}
                    >
                      <View>
                        <CachedImage
                          source={stage.image as any}
                          fallbackSource={resolveImageSource("learning-beginner.jpg")}
                          className="w-full"
                          style={{ height: stageCardImageHeight }}
                          resizeMode="cover"
                          accessibilityLabel={`${stage.title} picture`}
                        />
                        {stage.isLocked ? <View className="absolute top-0 bottom-0 left-0 right-0 bg-black/20" /> : null}
                        <View className="absolute top-2 left-2 bg-white/95 px-2.5 py-1 rounded-full">
                          <Text variant="bold" className="text-[11px] text-primary-700" numberOfLines={1}>
                            Stage {stage.id}
                          </Text>
                        </View>
                        <View className="absolute top-2 right-2 bg-white/95 w-9 h-9 rounded-full items-center justify-center">
                          <Ionicons name={statusIcon} size={20} color={statusColor} />
                        </View>
                      </View>

                      <View className="bg-white px-3.5 py-3 justify-between" style={{ height: stageCardBodyHeight }}>
                        <View>
                          <Text
                            variant="bold"
                            className="text-lg text-primary-700 leading-5 mb-1"
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            minimumFontScale={0.86}
                          >
                            {stage.title}
                          </Text>
                          <Text className="text-xs text-neutral-600 leading-4" numberOfLines={2}>
                            {stage.description}
                          </Text>
                        </View>

                        <View className="flex-row items-center justify-between mt-2">
                          <View className="flex-row items-center flex-1 pr-2">
                            <Ionicons name="school-outline" size={14} color={brandColors.victoriaBlue} />
                            <Text variant="medium" className="text-[11px] text-primary-700 ml-1" numberOfLines={1}>
                              {completedLevelCount}/{stage.levels.length} levels
                            </Text>
                          </View>
                          <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: stage.isLocked ? brandColors.neutral[100] : brandColors.blue[50] }}>
                            <Text variant="bold" className="text-[11px]" style={{ color: statusColor }} numberOfLines={1}>
                              {statusLabel}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  )
                }}
                ListFooterComponent={() => (
                  <View style={{ width: 1 }} />
                )}
              />
            </Animated.View>
          </View>
        </SafeAreaView>
      </ImageBackground>
    )
  }

  // LEVEL SELECTION SCREEN
  const renderLevelSelectScreen = () => {
    if (!selectedStage) return null
    const completedInStage = selectedStage.levels.filter((level) => completedLevels.includes(level.id)).length
    const progressPercent = (completedInStage / selectedStage.levels.length) * 100

    return (
      <ImageBackground source={require("@/assets/images/gameBackground.jpg")} className="flex-1 bg-cover">
        <SafeAreaView className="flex-1" edges={[]} style={{ backgroundColor: GAME_SCREEN_OVERLAY }}>
          <StatusBar style="light" translucent backgroundColor="transparent" />

          <View className="flex-1 px-6 pt-6 pb-5">
            <View className="flex-row items-center justify-between mb-4">
              <TouchableOpacity
                className="w-12 h-12 rounded-full bg-white justify-center items-center border-2 border-accent-500"
                onPress={() => setGameState("stageSelect")}
                accessibilityRole="button"
                accessibilityLabel="Back to stages"
              >
                <Ionicons name="arrow-back" size={22} color={brandColors.victoriaBlue} />
              </TouchableOpacity>

              <View className="flex-1 px-4">
                <Text variant="bold" className="text-white text-3xl text-center" numberOfLines={1}>
                  {selectedStage.title}
                </Text>
                <Text className="text-white/85 text-sm text-center" numberOfLines={2}>
                  Choose a level to review its word cards.
                </Text>
              </View>

              <View className="flex-row items-center bg-white rounded-full px-4 py-2 border-2 border-accent-500">
                <Image
                  source={require("../../assets/images/coin.png")}
                  style={{ width: 20, height: 20, marginRight: 6 }}
                  resizeMode="contain"
                />
                <Text variant="bold" className="text-amber-500 text-base" numberOfLines={1}>
                  {totalScore}
                </Text>
              </View>
            </View>

            <View className="bg-white/15 rounded-2xl px-4 py-3 mb-4">
              <View className="flex-row items-center">
                <View className="bg-white rounded-full w-14 h-14 items-center justify-center mr-4 border-2 border-accent-500">
                  <CachedImage
                    source={selectedStage.image as any}
                    fallbackSource={resolveImageSource("learning-beginner.jpg")}
                    style={{ width: 34, height: 34 }}
                    resizeMode="contain"
                    accessibilityLabel={`${selectedStage.title} picture`}
                  />
                </View>

                <View className="flex-1">
                  <View className="flex-row items-center justify-between">
                    <Text variant="bold" className="text-white text-lg" numberOfLines={1}>
                      Stage {selectedStage.id}
                    </Text>
                    <Text className="text-white/90 text-xs" numberOfLines={1}>
                      {completedInStage}/{selectedStage.levels.length} complete
                    </Text>
                  </View>

                  <View className="h-2 bg-white/30 rounded-full overflow-hidden mt-2">
                    <View
                      className="h-full bg-white"
                      style={{
                        width: `${progressPercent}%`,
                      }}
                    />
                  </View>

                  <Text className="text-white/85 text-sm mt-2" numberOfLines={2}>
                    {selectedStage.description}
                  </Text>
                </View>
              </View>
            </View>

            <ScrollView
              className="flex-1"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 10 }}
            >
              <Animated.View
                style={{
                  opacity: fadeAnim,
                  transform: [
                    {
                      translateY: fadeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [18, 0],
                      }),
                    },
                  ],
                }}
              >
                <View className="flex-row justify-between items-center mb-3">
                  <Text variant="bold" className="text-white text-lg" numberOfLines={1}>
                    Select a level
                  </Text>
                  <Text className="text-white/85 text-xs" numberOfLines={1}>
                    {selectedStage.levels.length} levels
                  </Text>
                </View>

                <View className="flex-row flex-wrap justify-between">
                  {selectedStage.levels.map((level) => {
                    const isCompleted = completedLevels.includes(level.id)
                    const statusLabel = level.isLocked ? "Locked" : isCompleted ? "Review" : "Start"
                    const statusIcon: keyof typeof Ionicons.glyphMap = level.isLocked
                      ? "lock-closed"
                      : isCompleted
                        ? "checkmark-circle"
                        : "play-circle"
                    const statusColor = level.isLocked
                      ? brandColors.neutral[600]
                      : isCompleted
                        ? brandColors.success
                        : brandColors.victoriaBlue

                    return (
                      <TouchableOpacity
                        key={level.id}
                        style={{
                          width: "48%",
                          minHeight: 132,
                          marginBottom: 12,
                          borderColor: level.isLocked
                            ? brandColors.neutral[200]
                            : isCompleted
                              ? brandColors.success
                              : brandColors.equatorialGold,
                          opacity: level.isLocked ? 0.76 : 1,
                        }}
                        className="bg-white rounded-2xl shadow-sm overflow-hidden border-2"
                        onPress={() => selectLevel(level)}
                        disabled={level.isLocked}
                        activeOpacity={level.isLocked ? 1 : 0.74}
                        accessibilityRole="button"
                        accessibilityLabel={`${level.title}. ${statusLabel}. ${level.words.length} words.`}
                        accessibilityState={{ disabled: level.isLocked }}
                      >
                        <View className="p-4 flex-1 justify-between">
                          <View className="flex-row items-start justify-between">
                            <View
                              className="w-12 h-12 rounded-full justify-center items-center mr-3"
                              style={{ backgroundColor: level.isLocked ? brandColors.neutral[100] : brandColors.blue[50] }}
                            >
                              <Text variant="bold" className="text-primary-700 text-lg" numberOfLines={1}>
                                {level.id}
                              </Text>
                            </View>
                            <View className="rounded-full px-3 py-1.5 flex-row items-center" style={{ backgroundColor: level.isLocked ? brandColors.neutral[100] : brandColors.blue[50] }}>
                              <Ionicons name={statusIcon} size={14} color={statusColor} />
                              <Text variant="bold" className="text-[11px] ml-1" style={{ color: statusColor }} numberOfLines={1}>
                                {statusLabel}
                              </Text>
                            </View>
                          </View>

                          <View className="mt-3">
                            <Text
                              variant="bold"
                              className="text-primary-700 text-lg leading-5"
                              numberOfLines={2}
                              adjustsFontSizeToFit
                              minimumFontScale={0.84}
                            >
                              {level.title}
                            </Text>
                            <View className="flex-row items-center mt-2">
                              <Ionicons name="albums-outline" size={15} color={brandColors.neutral[600]} />
                              <Text className="text-neutral-600 text-xs ml-1" numberOfLines={1}>
                                {level.words.length} {level.words.length === 1 ? "word" : "words"}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              </Animated.View>
            </ScrollView>
          </View>
        </SafeAreaView>
      </ImageBackground>
    )
  }

  // LEARNING SCREEN
  const renderLearningScreen = () => {
    if (!selectedLevel) return null

    if (currentWords.length === 0) {
      return (
        <SafeAreaView className="flex-1 bg-blue-50 justify-center items-center px-6">
          <ActivityIndicator size="large" color={brandColors.victoriaBlue} />
          <Text className="mt-4 text-primary-700 text-center">Getting your first card ready...</Text>
        </SafeAreaView>
      )
    }

    const safeLearningIndex = Math.min(currentLearningIndex, currentWords.length - 1)
    const currentLearnWord = currentWords[safeLearningIndex]
    const layout = isLandscape ? "landscape" : "portrait"

    if (!currentLearnWord) return null

    return (
      <SafeAreaView className="flex-1 bg-blue-50 pt-6">
        <StatusBar style="dark" />

        {/* Header */}
        <View className="flex-row justify-between items-center px-4 pb-2">
          <TouchableOpacity
            className="w-10 h-10 rounded-full bg-white justify-center items-center shadow-sm border border-indigo-200"
            onPress={() => setGameState("levelSelect")}
            accessibilityRole="button"
            accessibilityLabel="Back to levels"
          >
            <Ionicons name="arrow-back" size={20} color="#7b5af0" />
          </TouchableOpacity>

          <View className="flex-row items-center">
            <Text variant="bold" className="text-indigo-800 text-sm">
              {safeLearningIndex + 1}/{currentWords.length}
            </Text>
            <View className="w-16 h-1.5 bg-slate-200 rounded-full ml-2 overflow-hidden">
              <View
                className="h-full bg-indigo-500"
                style={{
                  width: `${((safeLearningIndex + 1) / currentWords.length) * 100}%`,
                }}
              />
            </View>
          </View>

          <TouchableOpacity className="bg-indigo-500 py-2 px-4 rounded-full" onPress={startGame}>
            <Text variant="bold" className="text-white  text-sm">
              Play Game
            </Text>
          </TouchableOpacity>
        </View>

        {layout === "landscape" ? (
          // Landscape layout
          <View className="flex-1 flex-row">
            <View className="w-1/2 p-4 justify-center items-center">
              <Animated.View
                className="bg-white p-5 rounded-2xl shadow-sm w-full justify-center items-center border border-blue-100"
                style={{ opacity: fadeAnim, minHeight: learningImageHeight + 40 }}
              >
                <CachedImage
                  source={(currentLearnWord.image || resolveImageSource("learning-beginner.jpg")) as any}
                  fallbackSource={resolveImageSource("learning-beginner.jpg")}
                  style={{ width: "100%", height: learningImageHeight }}
                  resizeMode="contain"
                  accessibilityLabel={`${currentLearnWord.english} picture`}
                />
              </Animated.View>
            </View>

            <View className="w-1/2 p-4">
              <Animated.View
                className="bg-white p-5 rounded-2xl shadow-sm mb-4 border border-blue-100"
                style={{
                  opacity: fadeAnim,
                  transform: [
                    {
                      translateX: fadeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      }),
                    },
                  ],
                }}
              >
                <View className="flex-row justify-between items-center mb-3">
                  <Text className="text-sm text-indigo-500 flex-1 pr-3" numberOfLines={1}>
                    {selectedStage?.title} - {selectedLevel.title}
                  </Text>
                  <TouchableOpacity
                    className="bg-indigo-100 w-10 h-10 rounded-full items-center justify-center"
                    onPress={() => playWordSound(currentLearnWord)}
                    accessibilityRole="button"
                    accessibilityLabel={`Hear ${currentLearnWord.targetText}`}
                  >
                    <Ionicons name="volume-high" size={18} color="#6366f1" />
                  </TouchableOpacity>
                </View>

                <Text
                  variant="bold"
                  className="text-3xl text-indigo-700"
                  numberOfLines={2}
                  adjustsFontSizeToFit
                  minimumFontScale={0.78}
                >
                  {currentLearnWord.targetText}
                </Text>
                <Text className="text-xl text-slate-700 mb-4" numberOfLines={2}>
                  {currentLearnWord.english}
                </Text>

                <View className="bg-slate-50 p-4 rounded-xl">
                  <Text className="text-base text-slate-800 italic mb-2" numberOfLines={3}>
                    {`"${currentLearnWord.example ?? ""}"`}
                  </Text>
                  <Text className="text-sm text-slate-500" numberOfLines={3}>
                    {currentLearnWord.exampleTranslation}
                  </Text>
                </View>
              </Animated.View>

              <View className="flex-row justify-between px-1">
                <TouchableOpacity
                  className={`min-w-[116px] py-3 px-5 rounded-xl items-center ${currentLearningIndex === 0 ? "bg-slate-200" : "bg-indigo-500"}`}
                  onPress={previousLearningWord}
                  disabled={currentLearningIndex === 0}
                  activeOpacity={currentLearningIndex === 0 ? 1 : 0.78}
                >
                  <Text className={` ${currentLearningIndex === 0 ? "text-slate-400" : "text-white"}`} variant="bold">
                    Previous
                  </Text>
                </TouchableOpacity>

                {currentLearningIndex < currentWords.length - 1 ? (
                  <TouchableOpacity className="bg-indigo-500 min-w-[116px] py-3 px-5 rounded-xl items-center" onPress={nextLearningWord}>
                    <Text variant="bold" className="text-white">
                      Next
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity className="bg-emerald-500 min-w-[124px] py-3 px-5 rounded-xl items-center" onPress={startGame}>
                    <Text variant="bold" className="text-white">
                      Start Quiz
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        ) : (
          // Portrait layout
          <ScrollView
            className="flex-1"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 30 }}
          >
            <Animated.View style={{ opacity: fadeAnim }}>
              <View className="mx-4 my-2">
                <View className="bg-white p-4 rounded-2xl shadow-sm items-center mb-5 border border-blue-100">
                  <CachedImage
                    source={(currentLearnWord.image || resolveImageSource("learning-beginner.jpg")) as any}
                    fallbackSource={resolveImageSource("learning-beginner.jpg")}
                    style={{ width: windowWidth * 0.7, height: windowWidth * 0.5 }}
                    resizeMode="contain"
                    accessibilityLabel={`${currentLearnWord.english} picture`}
                  />
                </View>

                <View className="bg-white p-5 rounded-2xl shadow-sm mb-6 border border-blue-100">
                  <View className="flex-row justify-between items-center mb-5">
                    <Text className="text-sm text-indigo-500 flex-1 pr-3" numberOfLines={1}>
                      {selectedStage?.title} - {selectedLevel.title}
                    </Text>
                    <TouchableOpacity
                      className="bg-indigo-100 w-10 h-10 rounded-full items-center justify-center"
                      onPress={() => playWordSound(currentLearnWord)}
                      accessibilityRole="button"
                      accessibilityLabel={`Hear ${currentLearnWord.targetText}`}
                    >
                      <Ionicons name="volume-high" size={18} color="#6366f1" />
                    </TouchableOpacity>
                  </View>

                  <Text
                    variant="bold"
                    className="text-3xl text-indigo-700 mb-1"
                    numberOfLines={2}
                    adjustsFontSizeToFit
                    minimumFontScale={0.78}
                  >
                    {currentLearnWord.targetText}
                  </Text>
                  <Text className="text-xl text-slate-700 mb-4" numberOfLines={2}>
                    {currentLearnWord.english}
                  </Text>

                  <View className="bg-slate-50 p-4 rounded-xl">
                    <Text className="text-base text-slate-800 italic mb-2" numberOfLines={3}>
                      {`"${currentLearnWord.example ?? ""}"`}
                    </Text>
                    <Text className="text-sm text-slate-500" numberOfLines={3}>
                      {currentLearnWord.exampleTranslation}
                    </Text>
                  </View>
                </View>

                <View className="flex-row justify-between px-2">
                  <TouchableOpacity
                    className={`min-w-[116px] py-3 px-6 rounded-xl items-center ${currentLearningIndex === 0 ? "bg-slate-200" : "bg-indigo-500"}`}
                    onPress={previousLearningWord}
                    disabled={currentLearningIndex === 0}
                    activeOpacity={currentLearningIndex === 0 ? 1 : 0.78}
                  >
                    <Text className={` ${currentLearningIndex === 0 ? "text-slate-400" : "text-white"}`} variant="bold">
                      Previous
                    </Text>
                  </TouchableOpacity>

                  {currentLearningIndex < currentWords.length - 1 ? (
                    <TouchableOpacity className="bg-indigo-500 min-w-[116px] py-3 px-6 rounded-xl items-center" onPress={nextLearningWord}>
                      <Text variant="bold" className="text-white">
                        Next
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity className="bg-emerald-500 min-w-[124px] py-3 px-6 rounded-xl items-center" onPress={startGame}>
                      <Text variant="bold" className="text-white">
                        Start Quiz
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </Animated.View>
          </ScrollView>
        )}
      </SafeAreaView>
    )
  }

  // GAME SCREEN
  const renderGameScreen = () => {
    if (!currentWord) return null
    const layout = isLandscape ? "landscape" : "portrait"

    return (
      <SafeAreaView className="flex-1 bg-blue-50">
        <StatusBar style="dark" />

        {/* Header */}
        <View className="flex-row justify-between items-center px-4 pt-5 pb-3">
          <TouchableOpacity
            className="w-10 h-10 rounded-full bg-white justify-center items-center shadow-sm border border-indigo-200"
            onPress={() => setGameState("learning")}
            accessibilityRole="button"
            accessibilityLabel="Back to word cards"
          >
            <Ionicons name="arrow-back" size={20} color="#7b5af0" />
          </TouchableOpacity>

          <Text variant="bold" className="text-indigo-800 flex-1 text-center px-3" numberOfLines={1}>
            {selectedLevel?.title} Quiz
          </Text>

          <View className="flex-row items-center bg-white px-3 py-1.5 rounded-full shadow-sm border border-amber-200">
            <Image
              source={require("../../assets/images/coin.png")}
              style={{ width: 20, height: 20, marginRight: 4 }}
              resizeMode="contain"
            />
            <Text variant="bold" className=" text-amber-500">
              {levelScore}
            </Text>
          </View>
        </View>

        {/* Progress bar */}
        <View className="px-4 mb-4">
          <View className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
            <Animated.View
              className="h-full bg-indigo-500"
              style={{
                width: progressWidth.interpolate({
                  inputRange: [0, 100],
                  outputRange: ["0%", "100%"],
                }),
              }}
            />
          </View>
          <View className="flex-row justify-between mt-1">
            <Text className="text-xs text-slate-500">
              Question {currentWordIndex + 1} of {currentWords.length}
            </Text>
            <Text className="text-xs text-slate-500">
              {Math.round((currentWordIndex / currentWords.length) * 100)}% Complete
            </Text>
          </View>
        </View>

        <Animated.View className="flex-1" style={{ opacity: fadeAnim }}>
          {layout === "landscape" ? (
            // Landscape layout
            <View className="flex-1 flex-row px-3">
              <View className="w-1/2 p-2 justify-center">
                <View className="bg-white p-6 rounded-2xl shadow-sm border border-blue-100">
                  <Text className="text-lg text-slate-600 mb-6 text-center" numberOfLines={2}>
                    What is the English translation of:
                  </Text>

                  <View className="items-center mb-5">
                    <View className="flex-row items-center">
                      <Text
                        variant="bold"
                        className="text-3xl text-indigo-700 text-center pt-3 flex-1"
                        numberOfLines={2}
                        adjustsFontSizeToFit
                        minimumFontScale={0.78}
                      >
                        {currentWord.targetText}
                      </Text>
                      <TouchableOpacity
                        className="ml-3 w-10 h-10 bg-indigo-100 rounded-full items-center justify-center"
                        onPress={() => playWordSound()}
                        accessibilityRole="button"
                        accessibilityLabel={`Hear ${currentWord.targetText}`}
                      >
                        <Ionicons name="volume-high" size={20} color="#6366f1" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Feedback */}
                  {isCorrect !== null && (
                    <View className={`items-center my-4 rounded-full px-4 py-2 ${isCorrect ? "bg-emerald-50" : "bg-red-50"}`}>
                      <Text className={`text-lg ${isCorrect ? "text-emerald-600" : "text-red-600"}`} variant="bold">
                        {isCorrect ? "Correct!" : "Try again!"}
                      </Text>
                      <Text className="hidden" variant="bold">
                        {isCorrect ? "Correct! 🎉" : "Try again! 😕"}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <View className="w-1/2 p-2 justify-center">
                <View className="space-y-3">
                  {options.map((option, index) => (
                    <Animated.View
                      key={index}
                      style={[option === shakingOption ? { transform: [{ translateX: shakeAnimation }] } : {}]}
                    >
                      <TouchableOpacity
                        className={`
                          min-h-[54px] py-3 px-5 rounded-xl shadow-sm border-2 items-center justify-center mb-2
                          ${
                            selectedOption === null
                              ? "bg-white border-slate-200"
                              : option === currentWord.english
                                ? "bg-emerald-100 border-emerald-500"
                                : option === selectedOption
                                  ? "bg-red-100 border-red-500"
                                  : "bg-white border-slate-200"
                          }
                        `}
                        onPress={() => handleOptionSelect(option)}
                        disabled={selectedOption !== null}
                        activeOpacity={0.8}
                      >
                        <Text
                          className={`
                          ${
                            selectedOption === null
                              ? "text-slate-700"
                              : option === currentWord.english
                                ? "text-emerald-700"
                                : option === selectedOption
                                  ? "text-red-700"
                                  : "text-slate-700"
                          }
                        `}
                          variant="bold"
                          numberOfLines={2}
                          adjustsFontSizeToFit
                          minimumFontScale={0.82}
                        >
                          {option}
                        </Text>
                      </TouchableOpacity>
                    </Animated.View>
                  ))}
                </View>
              </View>
            </View>
          ) : (
            // Portrait layout
            <View className="flex-1 px-4">
              <View className="bg-white p-6 rounded-2xl shadow-sm mb-5 border border-blue-100">
                <Text className="text-base text-slate-600 mb-5 text-center" numberOfLines={2}>
                  What is the English translation of:
                </Text>

                <View className="items-center mb-5">
                  <View className="flex-row items-center">
                    <Text
                      variant="bold"
                      className="text-3xl text-indigo-700 text-center flex-1"
                      numberOfLines={2}
                      adjustsFontSizeToFit
                      minimumFontScale={0.78}
                    >
                      {currentWord.targetText}
                    </Text>
                    <TouchableOpacity
                      className="ml-3 w-10 h-10 bg-indigo-100 rounded-full items-center justify-center"
                      onPress={() => playWordSound()}
                      accessibilityRole="button"
                      accessibilityLabel={`Hear ${currentWord.targetText}`}
                    >
                      <Ionicons name="volume-high" size={20} color="#6366f1" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Feedback */}
                {isCorrect !== null && (
                  <View className={`items-center my-3 rounded-full px-4 py-2 ${isCorrect ? "bg-emerald-50" : "bg-red-50"}`}>
                    <Text variant="bold" className={`text-lg ${isCorrect ? "text-emerald-600" : "text-red-600"}`}>
                      {isCorrect ? "Correct!" : "Try again!"}
                    </Text>
                    <Text variant="bold" className="hidden">
                      {isCorrect ? "Correct! 🎉" : "Try again 😕"}
                    </Text>
                  </View>
                )}
              </View>

              <View className="space-y-3">
                {options.map((option, index) => (
                  <Animated.View
                    key={index}
                    style={[option === shakingOption ? { transform: [{ translateX: shakeAnimation }] } : {}]}
                  >
                    <TouchableOpacity
                      className={`
                        min-h-[58px] py-4 px-5 rounded-xl shadow-sm border-2 items-center justify-center
                        ${
                          selectedOption === null
                            ? "bg-white border-slate-200"
                            : option === currentWord.english
                              ? "bg-emerald-100 border-emerald-500"
                              : option === selectedOption
                                ? "bg-red-100 border-red-500"
                                : "bg-white border-slate-200"
                        }
                      `}
                      onPress={() => handleOptionSelect(option)}
                      disabled={selectedOption !== null}
                      activeOpacity={0.8}
                    >
                      <Text
                        variant="bold"
                        numberOfLines={2}
                        adjustsFontSizeToFit
                        minimumFontScale={0.82}
                        className={`
                        
                        ${
                          selectedOption === null
                            ? "text-slate-700"
                            : option === currentWord.english
                              ? "text-emerald-700"
                              : option === selectedOption
                                ? "text-red-700"
                                : "text-slate-700"
                        }
                      `}
                      >
                        {option}
                      </Text>
                    </TouchableOpacity>
                  </Animated.View>
                ))}
              </View>

              {/* Animated confetti when correct */}
              {isCorrect === true && (
                <Animated.View
                  className="items-center justify-center mt-6"
                  style={{
                    opacity: confettiAnim.interpolate({
                      inputRange: [0, 0.2, 1],
                      outputRange: [0, 1, 0],
                    }),
                  }}
                >
                  <View className="flex-row items-center">
                    <Ionicons name="sparkles" size={28} color={brandColors.equatorialGold} />
                    <Ionicons name="star" size={28} color={brandColors.shanaOrange} />
                    <Ionicons name="sparkles" size={28} color={brandColors.equatorialGold} />
                  </View>
                  <View className="hidden">
                    <Text className="text-3xl">🎉</Text>
                    <Text className="text-3xl">✨</Text>
                    <Text className="text-3xl">🎊</Text>
                  </View>
                </Animated.View>
              )}
            </View>
          )}
        </Animated.View>
      </SafeAreaView>
    )
  }

  // LEVEL COMPLETION SCREEN
  const renderLevelCompletionScreen = () => {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 ">
        <StatusBar style="light" />

        <View className="flex-1 justify-center items-center">
          <LinearGradient
            colors={[selectedStage?.color || "#6366f1", (selectedStage?.color || "#6366f1") + "CC"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="p-12 rounded-3xl w-full items-center shadow-lg"
          >
            <View className="bg-white w-12 h-12 rounded-full mb-2 justify-center items-center">
              <Ionicons name="trophy" size={24} color={brandColors.equatorialGold} />
            </View>

            <Text variant="bold" className="text-xl text-white mb-2">
              Level Complete!
            </Text>
            <Text className="text-white text-center  mb-2">
              {`Congratulations, you've completed ${selectedLevel?.title}!`}
            </Text>

            <View className="bg-white/20 w-full rounded-2xl p-5 mb-2">
              <View className="flex-row justify-between mb-2">
                <Text variant="bold" className="text-white">
                  Words Learned:
                </Text>
                <Text variant="bold" className="text-white">
                  {currentWords.length}
                </Text>
              </View>
              <View className="flex-row justify-between mb-2">
                <Text variant="bold" className="text-white ">
                  Score Earned:
                </Text>
                <Text variant="bold" className="text-white">
                  {levelScore}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text variant="bold" className="text-white">
                  Total Score:
                </Text>
                <Text variant="bold" className="text-white">
                  {totalScore}
                </Text>
              </View>
            </View>

            <View className="flex-row space-x-3 mt-2">
              <TouchableOpacity
                className="bg-white py-3 px-5 rounded-xl"
                onPress={() => {
                  setGameState("levelSelect")
                  // Reset timer for next activity
                  gameStartTime.current = Date.now()
                }}
              >
                <Text variant="bold" className="text-indigo-600">
                  Choose Level
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="bg-emerald-500 py-3 px-5 rounded-xl"
                onPress={() => {
                  setGameState("stageSelect")
                  // Reset timer for next activity
                  gameStartTime.current = Date.now()
                }}
              >
                <Text variant="bold" className="text-white">
                  Home
                </Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </SafeAreaView>
    )
  }

  // Loading screen
  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 justify-center items-center">
        <ActivityIndicator size="large" color="#6366f1" />
        <Text className="mt-4 text-slate-600">Loading your learning journey...</Text>
      </SafeAreaView>
    )
  }

  if (stages.length === 0) {
    return <ComingSoonState title="Learning coming soon" />
  }

  // Main render function that switches between game states
  switch (gameState) {
    case "stageSelect":
      return (
        <>
          {renderStageSelectScreen()}
          {renderAchievementUnlockedModalLL()}
        </>
      )
    case "levelSelect":
      return (
        <>
          {renderLevelSelectScreen()}
          {renderAchievementUnlockedModalLL()}
        </>
      )
    case "learning":
      return (
        <>
          {renderLearningScreen()}
          {renderAchievementUnlockedModalLL()}
        </>
      )
    case "playing":
      return (
        <>
          {renderGameScreen()}
          {renderAchievementUnlockedModalLL()}
        </>
      )
    case "levelComplete":
      return (
        <>
          {renderLevelCompletionScreen()}
          {renderAchievementUnlockedModalLL()}
        </>
      )
    default:
      return (
        <>
          {renderStageSelectScreen()}
          {renderAchievementUnlockedModalLL()}
        </>
      )
  }
}

export default LugandaLearningGame
