"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import {
  View,
  Image,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  FlatList, // Ensure FlatList is imported
  useWindowDimensions,
  // ScrollView - Will be removed if FlatList replaces its primary use here
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Audio } from "expo-av"
import { StatusBar } from "expo-status-bar"
import { useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons" // Already imported
import { LinearGradient } from "expo-linear-gradient"
import { useChild } from "@/context/ChildContext"
import { ComingSoonState } from "@/components/child/ComingSoonState"
import { CachedImage } from "@/components/common/CachedImage"
import { DEFAULT_LEARNING_LANGUAGE_CODE } from "@/content/languages"
import {
  loadContentBundle,
  resolveImageSource,
  type CountingGameContent,
  type CountingGameItem,
  type CountingGameStage,
} from "@/content/contentRepository"
import { preloadContentBundleImages } from "@/content/imagePreloader"
import { saveActivity } from "@/lib/utils"
import { syncProgressNow } from "@/lib/progressRepository"
import { Text } from "@/components/StyledText"
import {
  type CountingGameProgress,
  DEFAULT_PROGRESS,
  loadGameProgress,
  saveGameProgress,
  updateProgressForStageCompletion,
  updateLastPlayedLevel,
  isStageUnlocked,
} from "./utils/progressManagerCountingGame"
import { useAchievements } from "./achievements/useAchievements" // Adjust path
import type { AchievementDefinition } from "./achievements/achievementTypes" // Adjust path

const DEFAULT_COUNTING_ITEM: CountingGameItem = {
  name: "items",
  image: "coin.png",
}

const getCountingCanvasHeight = (screenHeight: number): number =>
  Math.min(224, Math.max(180, screenHeight * 0.48))

const getCountingStageImage = (stage: CountingGameStage) => {
  if (stage.usesCurrency) return resolveImageSource("coin.png")
  if (stage.useBunches) return resolveImageSource("basket.png")
  return resolveImageSource("numbers.png")
}

// Define TypeScript interfaces for our data structures
interface CountItem {
  id: number
  x: number
  y: number
  rotate: number
  scale: number
  bunch?: number // Optional bunch number for grouped items
}

interface WindowDimensions {
  width: number
  height: number
}

// Game states
type GameState = "stageSelect" | "playing" | "stageComplete"

const LugandaCountingGame: React.FC = () => {
  const router = useRouter()
  const { activeChild } = useChild()
  const languageCode = activeChild?.selected_language_code || DEFAULT_LEARNING_LANGUAGE_CODE
  const { width: windowWidth, height: windowHeight } = useWindowDimensions()
  const landscapeWidth = Math.max(windowWidth, windowHeight)
  const landscapeHeight = Math.min(windowWidth, windowHeight)
  const stageCardGap = 16
  const stageCardWidth = Math.min(250, Math.max(220, landscapeWidth * 0.3))
  const stageCardHeight = Math.max(166, Math.min(210, landscapeHeight * 0.48))
  const stageCardImageHeight = Math.round(stageCardHeight * 0.56)
  const stageCardBodyHeight = stageCardHeight - stageCardImageHeight
  const stageListEndPadding = Math.max(16, landscapeWidth - stageCardWidth - 32)
  const countingCanvasHeight = getCountingCanvasHeight(landscapeHeight)
  const [gameState, setGameState] = useState<GameState>("stageSelect")
  const [currentStage, setCurrentStage] = useState<number>(1)
  const [currentLevel, setCurrentLevel] = useState<number>(1)
  const [countingContent, setCountingContent] = useState<CountingGameContent | null>(null)
  const [currentItem, setCurrentItem] = useState<CountingGameItem>(DEFAULT_COUNTING_ITEM)
  const [itemsToCount, setItemsToCount] = useState<CountItem[]>([])
  const [selectedCount, setSelectedCount] = useState<number | null>(null)
  const [showFeedback, setShowFeedback] = useState<boolean>(false)
  const [isCorrect, setIsCorrect] = useState<boolean>(false)
  const [score, setScore] = useState<number>(0)
  const [sound, setSound] = useState<Audio.Sound | null>(null)
  const [numberOptions, setNumberOptions] = useState<number[]>([])
  const [dimensions, setDimensions] = useState<WindowDimensions>({
    width: landscapeWidth,
    height: landscapeHeight,
  })
  const [targetNumber, setTargetNumber] = useState<number>(1)
  const [gameLevels, setGameLevels] = useState<number[]>([])
  const [stageCompleted, setStageCompleted] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [newlyEarnedAchievement, setNewlyEarnedAchievement] = useState<AchievementDefinition | null>(null)

  // Progress state
  const [progress, setProgress] = useState<CountingGameProgress>(DEFAULT_PROGRESS)
  const [fadeAnim] = useState(new Animated.Value(0))

  const bounceAnim = useRef(new Animated.Value(1)).current
  const rotateAnim = useRef(new Animated.Value(0)).current
  const gameStartTime = useRef(Date.now())
  const countingStages = countingContent?.stages ?? []
  const countingStageIds = countingStages.map((stage) => stage.id)
  const countingItems = countingContent?.culturalItems ?? [DEFAULT_COUNTING_ITEM]
  const currencyItems = countingContent?.currency ?? []

  const {
    definedAchievements,
    earnedChildAchievements,
    isLoadingAchievements: isLoadingAch, // rename to avoid conflict
    checkAndGrantNewAchievements,
  } = useAchievements(activeChild?.id, "counting_game")

  const getStageById = (stageId: number): CountingGameStage | undefined =>
    countingStages.find((stage) => stage.id === stageId) ?? countingStages[0]

  const getNumberLabel = (number: number): string => {
    const currencyItem = currencyItems.find((item) => item.value === number)
    if (currencyItem) {
      return currencyItem.targetText
    }

    return countingContent?.numbers.find((item) => item.number === number)?.targetText ?? `${number}`
  }

  const getRandomNumbersForStage = (stageId: number): number[] => {
    const stage = getStageById(stageId)
    if (!stage) return []

    const { min, max } = stage.numbersRange
    const levelsCount = stage.levels

    if (stage.usesCurrency) {
      return [...currencyItems]
        .sort(() => 0.5 - Math.random())
        .slice(0, levelsCount)
        .map((item) => item.value)
    }

    if (stage.useBunches && stage.itemsPerBunch) {
      const possibleNumbers: number[] = []
      for (let i = min; i <= max; i += stage.itemsPerBunch) {
        possibleNumbers.push(i)
      }
      return possibleNumbers.sort(() => 0.5 - Math.random()).slice(0, levelsCount)
    }

    const usedNumbers = new Set<number>()
    while (usedNumbers.size < levelsCount && usedNumbers.size < max - min + 1) {
      const randomNum = Math.floor(Math.random() * (max - min + 1)) + min
      usedNumbers.add(randomNum)
    }

    return Array.from(usedNumbers)
  }

  // Load content and saved progress when the active child or language changes.
  useEffect(() => {
    let isMounted = true

    const loadSavedProgress = async () => {
      setIsLoading(true)

      try {
        const contentResult = await loadContentBundle(languageCode)
        const loadedCountingContent = contentResult.bundle?.countingGame ?? null
        if (contentResult.bundle) {
          void preloadContentBundleImages(contentResult.bundle)
        }

        if (!isMounted) return

        setCountingContent(loadedCountingContent)
        setCurrentItem(loadedCountingContent?.culturalItems[0] ?? DEFAULT_COUNTING_ITEM)

        if (activeChild) {
          console.log(`Loading progress for child: ${activeChild.id}`)
          const savedProgress = await loadGameProgress(
            activeChild.id,
            languageCode,
            loadedCountingContent?.stages.map((stage) => stage.id) ?? [],
          )
          setProgress(savedProgress)

          if (savedProgress.currentStage) {
            setCurrentStage(savedProgress.currentStage)
          }
        } else {
          setProgress(DEFAULT_PROGRESS)
        }

        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start()
      } catch (error) {
        console.error("Error loading counting game content or progress:", error)
        setCountingContent(null)
        setProgress(activeChild ? { ...DEFAULT_PROGRESS, childId: activeChild.id } : DEFAULT_PROGRESS)
      } finally {
        if (isMounted) {
          setIsLoading(isLoadingAch)
        }
      }
    }

    loadSavedProgress()

    return () => {
      isMounted = false
    }
  }, [isLoadingAch, activeChild, languageCode])

  useEffect(() => {
    setDimensions({
      width: landscapeWidth,
      height: landscapeHeight,
    })
  }, [landscapeWidth, landscapeHeight])

  // Handle stage completion and update progress
  const handleStageCompletion = async () => {
    if (!activeChild) return

    // Update progress to mark this stage as completed
    let updatedProgress = updateProgressForStageCompletion(
      progress,
      currentStage,
      score + 10, // Add bonus points for completing the stage
      countingStageIds,
      activeChild.id,
    )

    const event = {
      type: "stage_completed" as const, // Explicitly type as literal type
      gameKey: "counting_game",
      stageId: currentStage, // for stage_completed
      newTotalScore: updatedProgress.totalScore, // for score_updated
      // ... any other relevant data for counting game achievements
    }

    // Check for achievements related to stage completion
    const newlyEarnedFromStage = await checkAndGrantNewAchievements(event)

    let achievementPointsEarned = 0
    if (newlyEarnedFromStage.length > 0) {
      newlyEarnedFromStage.forEach((ach) => {
        achievementPointsEarned += ach.points
        console.log(`NEW ACHIEVEMENT: ${ach.name}`)
        setNewlyEarnedAchievement(ach) // For modal/toast
        // Toast.show(`Achievement Unlocked: ${ach.name}! +${ach.points} points`, Toast.LONG);
      })

      updatedProgress = {
        ...updatedProgress,
        totalScore: updatedProgress.totalScore + achievementPointsEarned,
      }
    }

    setProgress(updatedProgress)
    await saveGameProgress(updatedProgress, activeChild.id, languageCode, {
      availableStageIds: countingStageIds,
    })
    void syncProgressNow(activeChild.id)
    console.log(`Stage ${currentStage} completed for child: ${activeChild.id}`)
  }

  // When game state changes to playing, initialize the stage
  useEffect(() => {
    if (gameState === "playing") {
      initializeStage(currentStage)
    }
  }, [gameState, countingStages])

  // When the stage changes, initialize the new stage
  useEffect(() => {
    if (gameState === "playing") {
      console.log(`Stage changed to ${currentStage}`)
      setIsLoading(true)
      initializeStage(currentStage)
      // Reset UI states when changing stages
      setShowFeedback(false)
      setSelectedCount(null)
      setNumberOptions([])
      setScore(0)
      setIsLoading(false)
    }
  }, [currentStage, countingStages])

  // When level changes, setup the level
  useEffect(() => {
    if (gameState === "playing" && gameLevels.length > 0) {
      console.log(`Setting up level ${currentLevel} with game levels:`, gameLevels)
      const levelIndex = currentLevel - 1
      if (levelIndex < gameLevels.length) {
        setupLevel(gameLevels[levelIndex], currentStage)
      } else {
        console.error(`Level index ${levelIndex} out of bounds for game levels array of length ${gameLevels.length}`)
        // Handle edge case
        if (gameLevels.length > 0) {
          setupLevel(gameLevels[0], currentStage)
        }
      }

      if (activeChild) {
        // Update last played level in progress
        const updatedProgress = updateLastPlayedLevel(
          progress,
          currentStage,
          currentLevel,
          activeChild.id, // Pass the child ID to ensure it's set correctly
        )
        setProgress(updatedProgress)
        saveGameProgress(updatedProgress, activeChild.id, languageCode, {
          availableStageIds: countingStageIds,
        })
      }
    }

    return () => {
      if (sound) {
        sound.unloadAsync()
      }
    }
  }, [currentLevel, gameLevels, gameState, activeChild, languageCode, dimensions.width, dimensions.height])

  // Initialize a stage with randomized levels
  const initializeStage = (stageId: number): void => {
    try {
      // Get random numbers for this stage
      const randomNumbers = getRandomNumbersForStage(stageId)

      // Verify we have numbers before proceeding
      if (randomNumbers.length === 0) {
        console.error(`No numbers generated for stage ${stageId}`)
        // Default to some fallback numbers based on stage
        const stage = getStageById(stageId)
        const min = stage?.numbersRange.min ?? 1
        setGameLevels([min, min + 1, min + 2, min + 3])
      } else {
        console.log(`Stage ${stageId} initialized with levels:`, randomNumbers)
        setGameLevels(randomNumbers)
      }

      // Check if the stage is already completed
      const isStageCompleted = progress.completedStages.includes(stageId)

      // If stage is completed, always start from level 1
      if (isStageCompleted) {
        setCurrentLevel(1)
      } else {
        // Only use saved level if the stage is in progress (not completed)
        const savedLevel = progress.lastPlayedLevel[stageId]
        if (savedLevel && savedLevel > 1) {
          setCurrentLevel(savedLevel)
        } else {
          // Reset level to 1 when starting a new stage
          setCurrentLevel(1)
        }
      }

      setStageCompleted(false)

      // Ensure clean UI state
      setShowFeedback(false)
      setSelectedCount(null)
    } catch (error) {
      console.error("Error initializing stage:", error)
      // Set some default game levels to prevent the game from breaking
      setGameLevels([1, 2, 3, 4, 5])
    }
  }

  const setupLevel = (targetNum = 0, stageId = currentStage): void => {
    try {
      // Choose a random item from cultural items
      const randomItemIndex = Math.floor(Math.random() * countingItems.length)
      const newItem = countingItems[randomItemIndex] ?? DEFAULT_COUNTING_ITEM

      // Get the current stage
      const stage = getStageById(stageId)
      if (!stage) {
        setItemsToCount([])
        setNumberOptions([])
        return
      }

      // Get the target number for this level from the randomized levels
      const levelIndex = currentLevel - 1
      // Use provided targetNum if available, otherwise get from gameLevels
      const numberToUse = targetNum || (gameLevels[levelIndex] ?? stage.numbersRange.min)
      console.log(`Setting up level with target number: ${numberToUse}`)
      setTargetNumber(numberToUse)

      // Calculate container dimensions
      const containerWidth = Math.max(240, dimensions.width * 0.6 - 48)
      const containerHeight = getCountingCanvasHeight(dimensions.height)

      // Item dimensions
      const itemSize = 56 // Slightly smaller than before for better fit
      const itemsPerRow = Math.ceil(Math.sqrt(numberToUse)) // Distribute items in a grid-like pattern

      // Calculate spacing between items
      const horizontalSpacing = containerWidth / (itemsPerRow + 1)
      const verticalSpacing = containerHeight / (Math.ceil(numberToUse / itemsPerRow) + 1)

      let newItemsToCount: CountItem[] = []

      if (stage.useBunches) {
        // For stages with bunches, we show fewer visual items representing groups
        const bunches = Math.ceil(numberToUse / (stage.itemsPerBunch || 10))
        const bunchesPerRow = Math.ceil(Math.sqrt(bunches))

        // Create one item per bunch, arranged in a grid
        for (let i = 0; i < bunches; i++) {
          const row = Math.floor(i / bunchesPerRow)
          const col = i % bunchesPerRow

          newItemsToCount.push({
            id: i,
            x: horizontalSpacing + col * (containerWidth / (bunchesPerRow + 0.5)),
            y: verticalSpacing + row * (containerHeight / (Math.ceil(bunches / bunchesPerRow) + 0.5)),
            rotate: Math.random() * 20 - 10, // Less rotation for better readability
            scale: 0.9 + Math.random() * 0.2,
            bunch:
              i === bunches - 1 && numberToUse % (stage.itemsPerBunch || 10) !== 0
                ? numberToUse % (stage.itemsPerBunch || 10)
                : stage.itemsPerBunch || 10,
          })
        }
      } else if (stage.usesCurrency) {
        // For currency stage, show notes/coins based on the value
        // We'll simplify by showing one currency item
        newItemsToCount = [
          {
            id: 0,
            x: containerWidth / 2 - itemSize / 2,
            y: containerHeight / 2 - itemSize / 2,
            rotate: 0,
            scale: 1.5,
          },
        ]
      } else {
        // For basic counting (Stage 1), arrange items in a grid-like pattern
        for (let i = 0; i < numberToUse; i++) {
          const row = Math.floor(i / itemsPerRow)
          const col = i % itemsPerRow

          // Add some randomness to the position for a more natural look
          const randomOffsetX = Math.random() * 10 - 5
          const randomOffsetY = Math.random() * 10 - 5

          newItemsToCount.push({
            id: i,
            x: horizontalSpacing + col * horizontalSpacing + randomOffsetX,
            y: verticalSpacing + row * verticalSpacing + randomOffsetY,
            rotate: Math.random() * 20 - 10, // Less rotation for better readability
            scale: 0.8 + Math.random() * 0.3,
          })
        }
      }

      // Generate number options here and store them in state
      const correctAnswer = numberToUse
      const options: number[] = [correctAnswer]

      // Generate possible options within the stage's range
      const { min, max } = stage.numbersRange
      const possibleOptions: number[] = []

      // Add numbers within the range as possible options
      for (let i = min; i <= max; i++) {
        // For stages with bunches, only add multiples of the bunch size
        if (stage.useBunches && (stage.itemsPerBunch || 10)) {
          if (i % (stage.itemsPerBunch || 10) === 0 && i !== correctAnswer) {
            possibleOptions.push(i)
          }
        } else if (i !== correctAnswer) {
          possibleOptions.push(i)
        }
      }

      // Randomly select 2 more options
      while (options.length < 3 && possibleOptions.length > 0) {
        const randomIndex = Math.floor(Math.random() * possibleOptions.length)
        options.push(possibleOptions[randomIndex])
        possibleOptions.splice(randomIndex, 1)
      }

      // Shuffle the options
      options.sort(() => Math.random() - 0.5)

      setCurrentItem(newItem)
      setItemsToCount(newItemsToCount)
      setSelectedCount(null)
      setShowFeedback(false)
      setNumberOptions(options)
    } catch (error) {
      console.error("Error setting up level:", error)
      // Set default values to prevent crashes
      setItemsToCount([])
      setNumberOptions([1, 2, 3])
    }
  }

  const playNumberSound = async (number: number): Promise<void> => {
    try {
      if (sound) {
        await sound.unloadAsync()
      }

      // In a real app, you'd have actual audio files
      // For this example, we'll just log which sound would play
      console.log(`Playing sound for: ${getNumberLabel(number)}`)

      try {
        const { sound: newSound } = await Audio.Sound.createAsync(require("@/assets/sounds/correct.mp3"))
        setSound(newSound)
        await newSound.playAsync()
      } catch (audioError) {
        console.error("Error loading sound file:", audioError)
      }
    } catch (error) {
      console.error("Error playing sound", error)
    }
  }

  const trackActivity = async (isStageComplete = false) => {
    if (!activeChild) return

    const duration = Math.round((Date.now() - gameStartTime.current) / 1000) // duration in seconds

    await saveActivity({
      child_id: activeChild.id,
      activity_type: "counting",
      activity_name: isStageComplete ? `Completed Counting Stage ${currentStage}` : "Practiced Counting",
      score: score.toString(),
      duration,
      completed_at: new Date().toISOString(),
      details: `${
        isStageComplete
          ? `Completed all levels in Stage ${currentStage}`
          : `Completed level ${currentLevel} in Stage ${currentStage}`
      }`,
      stage: currentStage,
      level: currentLevel,
      language_code: languageCode,
    })
  }

  const handleNumberPress = async (number: number): Promise<void> => {
    setSelectedCount(number)
    playNumberSound(number)

    // Check if the answer is correct
    const isAnswerCorrect = number === targetNumber
    setIsCorrect(isAnswerCorrect)

    // Show feedback
    setShowFeedback(true)

    // Animate the feedback
    Animated.sequence([
      Animated.spring(bounceAnim, {
        toValue: 1.2,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.spring(bounceAnim, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start()

    // If correct, add to score and prepare for next level
    if (isAnswerCorrect) {
      const newScore = score + 10 // Calculate new score first
      setScore(newScore)

      // Create a temporary progress object with the new score for checking
      const tempProgressForAchievementCheck = {
        ...progress,
        totalScore: newScore, // Use the new score
      }

      // Rotate animation for correct answer
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }).start(() => {
        rotateAnim.setValue(0)
      })

      // Create event object for score updated achievements
      const scoreEvent = {
        type: "score_updated" as const,
        gameKey: "counting_game",
        newTotalScore: tempProgressForAchievementCheck.totalScore,
      }

      const newlyEarnedFromScore = await checkAndGrantNewAchievements(scoreEvent)

      let achievementPointsEarned = 0
      let progressWithScoreAchievements = progress
      if (newlyEarnedFromScore.length > 0) {
        newlyEarnedFromScore.forEach((ach) => {
          achievementPointsEarned += ach.points
          console.log(`NEW ACHIEVEMENT (Score): ${ach.name}`)
          setNewlyEarnedAchievement(ach) // For modal/toast
          // Toast.show(`Achievement Unlocked: ${ach.name}! +${ach.points} points`, Toast.LONG);
        })
        progressWithScoreAchievements = {
          ...progress,
          totalScore: progress.totalScore + achievementPointsEarned,
          childId: activeChild?.id || progress.childId,
        }
        setProgress(progressWithScoreAchievements)
      }

      // Move to next level after a delay
      setTimeout(async () => {
        const currentStageData = getStageById(currentStage)
        if (!currentStageData) return
        if (currentLevel < currentStageData.levels) {
          await trackActivity(false)
          if (achievementPointsEarned > 0 && activeChild) {
            await saveGameProgress(progressWithScoreAchievements, activeChild.id, languageCode, {
              availableStageIds: countingStageIds,
            })
          }
          setCurrentLevel((prevLevel) => prevLevel + 1)
        } else {
          // Stage completed!
          setStageCompleted(true)
          await trackActivity(true)

          // Use the new stage completion handler
          if (activeChild) {
            await handleStageCompletion()
          }
        }
      }, 1500)
    } else {
      // For incorrect answers, clear feedback after a short delay to allow another try
      setTimeout(() => {
        setShowFeedback(false)
        setSelectedCount(null)
      }, 1500)
    }
  }

  const renderAchievementUnlockedModal = () => {
    if (!newlyEarnedAchievement) return null

    return (
      <View className="absolute inset-0 bg-black/60 items-center justify-center z-50">
        <View className="bg-white rounded-2xl p-6 w-4/5 max-w-sm items-center shadow-xl">
          <View className="absolute -top-10 bg-amber-400 w-20 h-20 rounded-full items-center justify-center border-4 border-white">
            <Ionicons name={(newlyEarnedAchievement.icon_name as any) || "star"} size={36} color="white" />
          </View>
          <Text variant="bold" className="text-xl text-amber-600 mt-8 mb-2 text-center">
            Achievement Unlocked!
          </Text>
          <Text variant="bold" className="text-2xl text-slate-700 mb-2 text-center">
            {newlyEarnedAchievement.name}
          </Text>
          <Text className="text-slate-500 text-center mb-4">{newlyEarnedAchievement.description}</Text>
          <Text variant="bold" className="text-lg text-amber-500 mb-6">
            +{newlyEarnedAchievement.points} Points!
          </Text>
          <TouchableOpacity
            className="bg-amber-500 py-3 px-10 rounded-xl shadow-md"
            onPress={() => setNewlyEarnedAchievement(null)}
          >
            <Text variant="bold" className="text-white text-lg text-center">
              Awesome!
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  const renderNumberOptions = (): React.ReactElement[] => {
    return numberOptions.map((number) => (
      <TouchableOpacity
        key={number}
        className={`w-16 h-16 rounded-full justify-center items-center shadow mb-3
          ${
            selectedCount === number && isCorrect
              ? "bg-success"
              : selectedCount === number && !isCorrect
                ? "bg-destructive"
                : "bg-secondary"
          }`}
        onPress={() => handleNumberPress(number)}
        disabled={showFeedback && isCorrect} // Only disable if showing correct feedback
      >
        <Text variant="bold" className="text-lg text-white">
          {number}
        </Text>
        <Text variant="bold" className="text-xs text-white">
          {getNumberLabel(number)}
        </Text>
      </TouchableOpacity>
    ))
  }

  // Update the getImageSource function to return the appropriate image based on the current item
  const getImageSource = () => {
    return resolveImageSource(currentItem?.image, "african-logic.png") as any
  }

  // Update the renderItemsToCount function to handle currency items better
  const renderItemsToCount = (): React.ReactElement[] => {
    const stage = getStageById(currentStage)
    if (!stage) return []

    // For currency stage, render the currency item
    if (stage.usesCurrency) {
      const currencyItem = currencyItems.find((item) => item.value === targetNumber)

      if (!currencyItem) {
        console.warn(`No currency item found for value ${targetNumber}`)
        // Display a fallback
        return [
          <View
            key="currency-fallback"
            className="items-center justify-center absolute"
            style={{
              left: dimensions.width * 0.3,
              top: dimensions.height * 0.3,
            }}
          >
            <Text variant="bold" className="text-xl text-primary-800">
              {`Shs ${targetNumber}`}
            </Text>
          </View>,
        ]
      }

      const currencyImageSource = resolveImageSource(currencyItem.image, "coin.png") as any

      return [
        <View
          key="currency-item"
          className="items-center justify-center absolute"
          style={{
            left: itemsToCount[0]?.x || dimensions.width * 0.3,
            top: itemsToCount[0]?.y || dimensions.height * 0.3,
          }}
        >
          <Animated.View
            style={{
              transform: [{ scale: itemsToCount[0]?.scale || 1.5 }],
            }}
          >
            <CachedImage
              source={currencyImageSource}
              fallbackSource={resolveImageSource("coin.png")}
              className="w-24 h-24"
              resizeMode="contain"
              accessibilityLabel={currencyItem.name}
            />
          </Animated.View>
          <Text variant="bold" className="text-lg text-primary-800 mt-2">
            {currencyItem.name}
          </Text>
        </View>,
      ]
    }

    const imageSource = getImageSource()
    if (!imageSource) {
      // If image can't be loaded, show text placeholders
      return itemsToCount.map((item) => (
        <View
          key={item.id}
          className="items-center justify-center absolute bg-primary rounded-full w-16 h-16"
          style={{
            left: item.x,
            top: item.y,
          }}
        >
          <Text variant="bold" className="text-white">
            {item.id + 1}
          </Text>
        </View>
      ))
    }

    // For stages with bunches
    if (stage.useBunches) {
      return itemsToCount.map((item) => (
        <View
          key={item.id}
          className="items-center absolute"
          style={{
            left: item.x,
            top: item.y,
          }}
        >
          <Animated.View
            style={{
              transform: [{ rotate: `${item.rotate}deg` }, { scale: item.scale }],
            }}
          >
            <CachedImage
              source={imageSource}
              fallbackSource={resolveImageSource("african-logic.png")}
              className="w-16 h-16"
              resizeMode="contain"
              accessibilityLabel={currentItem.name}
            />
          </Animated.View>
          <Text variant="bold" className="text-xs bg-white/80 px-2 py-1 rounded mt-1">
            {item.bunch} {currentItem.name}
          </Text>
        </View>
      ))
    }

    // For basic counting (Stage 1)
    return itemsToCount.map((item) => (
      <Animated.View
        key={item.id}
        className="absolute"
        style={{
          left: item.x,
          top: item.y,
          transform: [{ rotate: `${item.rotate}deg` }, { scale: item.scale }],
        }}
      >
        <CachedImage
          source={imageSource}
          fallbackSource={resolveImageSource("african-logic.png")}
          className="w-16 h-16"
          resizeMode="contain"
          accessibilityLabel={currentItem.name}
        />
      </Animated.View>
    ))
  }

  const getQuestionText = (): string => {
    const stage = getStageById(currentStage)
    if (!stage) return "Count the items."

    if (stage.usesCurrency) {
      return stage.currencyPrompt ?? "How much is this currency worth?"
    }

    if (stage.useBunches) {
      const template =
        stage.groupedPrompt ??
        "Each bunch has {itemsPerBunch} {item}. How many {item} are there in total?"
      return template
        .replace(/\{itemsPerBunch\}/g, `${stage.itemsPerBunch ?? 10}`)
        .replace(/\{item\}/g, currentItem.name)
    }

    return (stage.prompt ?? "How many {item} do you see?").replace(/\{item\}/g, currentItem.name)
  }

  const selectStage = (stageId: number) => {
    if (isStageUnlocked(progress, stageId)) {
      setCurrentStage(stageId)

      if (activeChild) {
        // Update current stage in progress
        const updatedProgress = {
          ...progress,
          currentStage: stageId,
          childId: activeChild.id, // Ensure child ID is set
        }
        setProgress(updatedProgress)
        saveGameProgress(updatedProgress, activeChild.id, languageCode, {
          availableStageIds: countingStageIds,
        })
        console.log(`Selected stage ${stageId} for child: ${activeChild.id}`)
      }

      setGameState("playing")
    }
  }

  const continueStage = () => {
    // Continue with current stage
    setStageCompleted(false)
    setShowFeedback(false)
    setSelectedCount(null)

    if (currentStage < countingStages.length) {
      setCurrentStage((prevStage) => prevStage + 1)
    } else {
      // If this was the last stage, go back to stage selection
      setGameState("stageSelect")
    }
  }

  // RENDER: Stage Selection Screen
  const renderStageSelectionScreen = () => {
    return (
      <SafeAreaView className="flex-1 bg-slate-50">
        <StatusBar style="dark" />

        {/* Header with back button and title */}
        <View className="flex-row justify-between items-center px-4 pt-6 pb-2">
          <TouchableOpacity
            className="w-10 h-10 rounded-full bg-white justify-center items-center shadow-sm border border-indigo-100"
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={20} color="#818cf8" />
          </TouchableOpacity>

          <Text variant="bold" className="text-xl text-indigo-800">
            {countingContent?.title ?? "Counting Game"}
          </Text>

          <View className="flex-row items-center bg-white px-3 py-1.5 rounded-full shadow-sm border border-amber-200">
            <Image source={require("@/assets/images/coin.png")} className="w-5 h-5 mr-1" resizeMode="contain" />
            <Text variant="bold" className="text-amber-500">
              {progress.totalScore}
            </Text>
          </View>
        </View>

        <Animated.View className="flex-1 pt-2" style={{ opacity: fadeAnim }}>
          {/* Stage Navigation Header */}
          <View className="flex-row justify-between items-center px-4 mb-2">
            <Text variant="bold" className="text-lg text-indigo-800">
              Select a Stage
            </Text>
            <View className="flex-row items-center">
              <Text className="text-xs text-slate-500 mr-2">Swipe to explore</Text>
              <Ionicons name="arrow-forward" size={14} color="#6366f1" />
            </View>
          </View>

          {/* Stage Cards with Snap Scrolling */}
          <FlatList
            data={countingStages}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={stageCardWidth + stageCardGap}
            snapToAlignment="start"
            decelerationRate="fast"
            contentContainerStyle={{
              paddingVertical: 12,
              paddingLeft: 16,
              paddingRight: stageListEndPadding,
            }}
            renderItem={({ item: stage }) => {
              const isUnlocked = isStageUnlocked(progress, stage.id)

              const isCompleted = progress.completedStages.includes(stage.id)

              let stageIconName: keyof typeof Ionicons.glyphMap = "list-outline" // Default icon
              if (stage.usesCurrency) {
                stageIconName = "cash-outline"
              } else if (stage.useBunches) {
                stageIconName = "apps-outline"
              }

              return (
                <TouchableOpacity
                  key={stage.id}
                  style={{
                    width: stageCardWidth,
                    marginRight: stageCardGap,
                    height: stageCardHeight,
                  }}
                  className={`bg-white rounded-2xl overflow-hidden shadow-md border-2 border-accent-500 ${
                    !isUnlocked ? "opacity-70" : ""
                  }`}
                  onPress={() => selectStage(stage.id)}
                  disabled={!isUnlocked}
                  activeOpacity={isUnlocked ? 0.75 : 1}
                >
                  <View>
                    <CachedImage
                      source={getCountingStageImage(stage)}
                      fallbackSource={resolveImageSource("numbers.png")}
                      className="w-full"
                      style={{ height: stageCardImageHeight }}
                      resizeMode="cover"
                      accessibilityLabel={`${stage.title} picture`}
                    />
                    <View className="absolute top-2 left-2 bg-white/90 px-2 py-1 rounded-full">
                      <Text variant="bold" className="text-[11px] text-primary-700">
                        Stage {stage.id}
                      </Text>
                    </View>
                    <View className="absolute top-2 right-2 bg-white/90 w-8 h-8 rounded-full items-center justify-center">
                      <Ionicons
                        name={!isUnlocked ? "lock-closed" : isCompleted ? "checkmark-circle" : stageIconName}
                        size={18}
                        color={!isUnlocked ? "#64748b" : isCompleted ? "#10b981" : "#0274BB"}
                      />
                    </View>
                  </View>

                  <View className="bg-white px-3 py-2 justify-between" style={{ height: stageCardBodyHeight }}>
                    <View>
                      <Text variant="bold" className="text-base text-primary-700 mb-0.5" numberOfLines={1}>
                        {stage.title}
                      </Text>
                      <Text className="text-xs text-neutral-600 leading-4" numberOfLines={2}>
                        {stage.description}
                      </Text>
                    </View>

                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center">
                        <Ionicons name="layers-outline" size={13} color="#0274BB" />
                        <Text variant="medium" className="text-[11px] text-primary-700 ml-1">
                          {stage.levels} levels
                        </Text>
                      </View>
                      <Text variant="medium" className="text-[11px] text-neutral-600">
                        {isCompleted
                          ? "Done"
                          : progress.lastPlayedLevel[stage.id] && isUnlocked
                            ? `Lvl ${progress.lastPlayedLevel[stage.id]}`
                            : `${stage.numbersRange.min}-${stage.numbersRange.max}`}
                      </Text>
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
      </SafeAreaView>
    )
  }

  // Show loading state if game is loading
  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#f3f4ff" }}>
        <LinearGradient
          colors={["#f3f4ff", "#e9ebff"]}
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <StatusBar style="dark" />
          <Image
            source={require("@/assets/images/coin.png")}
            style={{ width: 80, height: 80, marginBottom: 16, opacity: 0.7 }}
            resizeMode="contain"
          />
          <ActivityIndicator size="large" color="#6366f1" />
          <Text
            style={{
              marginTop: 16,
              fontSize: 18,
              color: "#6366f1",
              fontWeight: "600",
            }}
          >
            Loading your counting adventure...
          </Text>
        </LinearGradient>
      </SafeAreaView>
    )
  }

  if (!countingContent || countingStages.length === 0) {
    return <ComingSoonState title="Counting game coming soon" />
  }

  // Render the appropriate screen based on game state
  if (gameState === "stageSelect") {
    return renderStageSelectionScreen()
  }

  const activeStage = getStageById(currentStage) ?? countingStages[0]

  // Render the game screen
  return (
    <SafeAreaView className="flex-1 bg-indigo-50 pt-3">
      <StatusBar style="dark" />

      {/* Decorative elements */}
      <View className="absolute top-5 right-5">
        <View className="w-12 h-12 rounded-full bg-indigo-500 opacity-10" />
      </View>

      <View className="absolute bottom-10 left-16">
        <View className="w-16 h-16 rounded-full bg-emerald-500 opacity-10" />
      </View>

      {/* Header with back button and game info */}
      <View className="flex-row justify-between items-center px-4 pt-3 pb-2">
        <TouchableOpacity
          className="w-10 h-10 rounded-full bg-white justify-center items-center shadow-sm border border-indigo-100"
          onPress={() => setGameState("stageSelect")}
        >
          <Ionicons name="arrow-back" size={20} color="#818cf8" />
        </TouchableOpacity>

        <View className="flex-row items-center  px-4 py-2 rounded-xl">
          <View className="flex-row items-center bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
            <Image source={require("@/assets/images/coin.png")} className="w-5 h-5 mr-1" resizeMode="contain" />
            <Text variant="bold" className="text-amber-500">
              {score}
            </Text>
          </View>
        </View>
      </View>

      {/* Main content area */}
      <View className="flex-1 flex-row w-full px-4 py-2">
        {/* Left section - Stage indicator */}
        <View className="w-1/6 items-center pt-4">
          <View className="bg-white rounded-xl shadow-sm p-3 w-full">
            <Text className="text-center text-sm text-indigo-400">STAGE</Text>
            <View className="items-center justify-center my-2">
              <View
                className="w-16 h-16 rounded-full items-center justify-center shadow-md"
                style={{
                  backgroundColor: "#818cf8",
                }}
              >
                <Text variant="bold" className="text-2xl text-white">
                  {currentStage}
                </Text>
              </View>
            </View>

            <View className="bg-indigo-100 rounded-full h-2 w-full mt-1 mb-2">
              <View
                className="bg-indigo-500 rounded-full h-2"
                style={{
                  width: `${(currentLevel / activeStage.levels) * 100}%`,
                }}
              />
            </View>

            <Text className="text-center text-xs text-indigo-500">
              Level {currentLevel}/{activeStage.levels}
            </Text>
          </View>
        </View>

        {/* Center section - Items to count */}
        <View className="w-3/5 items-center justify-center px-4">
          {/* Question prompt */}
          <View className="items-center mb-1 bg-white px-6 py-2 rounded-xl shadow-sm">
            <Text variant="bold" className="text-lg text-slate-800 text-center">
              {getQuestionText()}
            </Text>
            <Text className="text-sm text-indigo-600 text-center mt-1">
              {activeStage.description}
            </Text>
          </View>

          {/* Items container */}
          <View className="w-full relative bg-white rounded-xl p-4 shadow-sm" style={{ height: countingCanvasHeight }}>
            {/* Grid for visual guidance */}
            <View className="absolute inset-0 w-full h-full rounded-xl overflow-hidden">
              {Array.from({ length: 10 }).map((_, i) => (
                <View
                  key={`grid-h-${i}`}
                  className="absolute border-t border-indigo-50"
                  style={{
                    top: (i * countingCanvasHeight) / 10,
                    left: 0,
                    right: 0,
                  }}
                />
              ))}
              {Array.from({ length: 10 }).map((_, i) => (
                <View
                  key={`grid-v-${i}`}
                  className="absolute border-l border-indigo-50"
                  style={{
                    left: `${(i * 100) / 10}%`,
                    top: 0,
                    bottom: 0,
                  }}
                />
              ))}
            </View>

            {/* Render counting items */}
            {renderItemsToCount()}
          </View>

          {/* Number label */}
          <View className="flex-row items-center justify-center bg-blue-50 mt-3 px-4 py-2 rounded-lg border border-blue-100">
            <Text className="text-blue-600 text-center">
              {getNumberLabel(targetNumber)} = {targetNumber}
            </Text>
          </View>
        </View>

        {/* Right section - Number options */}
        <View className="w-1/4 items-center justify-center">
          <View className="bg-white rounded-xl shadow-sm p-4 w-full">
            <Text className="text-center text-sm text-indigo-400 mb-3">BALANGA EMEKA?</Text>

            <View className="items-center justify-around py-2 space-y-3">
              {numberOptions.length > 0 ? (
                numberOptions.map((number) => (
                  <TouchableOpacity
                    key={number}
                    className={`w-20 h-20 rounded-full justify-center items-center shadow mb-2 ${
                      selectedCount === number && isCorrect
                        ? "bg-emerald-500 border-2 border-emerald-200"
                        : selectedCount === number && !isCorrect
                          ? "bg-red-500 border-2 border-red-200"
                          : "bg-indigo-500"
                    }`}
                    onPress={() => handleNumberPress(number)}
                    disabled={showFeedback && isCorrect}
                  >
                    <Text variant="bold" className="text-xl text-white">
                      {number}
                    </Text>
                    <Text className="text-xs text-white opacity-90">
                      {getNumberLabel(number).split(" ")[0]}
                    </Text>
                  </TouchableOpacity>
                ))
              ) : (
                <ActivityIndicator size="small" color="#818cf8" />
              )}
            </View>
          </View>
        </View>
      </View>

      {/* Feedback animation */}
      {showFeedback && (
        <Animated.View
          className={`absolute bg-white px-6 py-5 rounded-3xl shadow-lg ${
            isCorrect ? "border-4 border-emerald-400" : "border-4 border-red-400"
          }`}
          style={{
            top: "50%",
            left: "50%",
            marginLeft: -110, // Half of width
            marginTop: -60, // Approximate half of height
            width: 220,
            transform: [
              { scale: bounceAnim },
              {
                rotate: rotateAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0deg", "360deg"],
                }) as any, // Type assertion for TypeScript
              },
            ],
          }}
        >
          <View className="items-center">
            <Text className="text-4xl mb-2 pt-3">{isCorrect ? "🎉" : "😕"}</Text>
            <Text
              variant="bold"
              className={`text-xl text-center mb-1 ${isCorrect ? "text-emerald-600" : "text-red-600"}`}
            >
              {isCorrect ? "Kirungi!" : "Gezaako nela!"}
            </Text>
            <Text className="text-slate-600 text-center">{isCorrect ? "Correct!" : "Try again!"}</Text>
          </View>
        </Animated.View>
      )}

      {/* Stage completion overlay */}
      {stageCompleted && (
        <View className="absolute inset-0 bg-black/50 items-center justify-center pt-12">
          <View className="bg-white rounded-2xl p-6 w-3/5 max-w-md items-center shadow-xl">
            <View className="absolute -top-10 bg-indigo-500 w-20 h-20 rounded-full items-center justify-center border-4 border-white">
              <Text className="text-4xl">🏆</Text>
            </View>

            <Text variant="bold" className="text-2xl text-indigo-800 mt-6 mb-3 text-center">
              Stage {currentStage} Complete!
            </Text>

            <Text className="text-slate-600 text-center mb-5 text-base">
              {`You've mastered counting from ${activeStage.numbersRange.min} to ${activeStage.numbersRange.max}!`}
            </Text>

            <View className="bg-blue-50 w-full rounded-xl p-4 mb-5">
              <View className="flex-row justify-between items-center mb-3">
                <View className="flex-row items-center">
                  <Ionicons name="star" size={20} color="#f59e0b" />
                  <Text className="ml-2 text-slate-700">Score</Text>
                </View>
                <Text variant="bold" className="text-amber-500 text-lg">
                  {score + 10}
                </Text>
              </View>

              <View className="flex-row justify-between items-center">
                <View className="flex-row items-center">
                  <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                  <Text className="ml-2 text-slate-700">Levels Completed</Text>
                </View>
                <Text variant="bold" className="text-emerald-600 text-lg">
                  {activeStage.levels}
                </Text>
              </View>
            </View>

            <TouchableOpacity className="bg-indigo-500 py-4 px-6 rounded-xl shadow-md" onPress={continueStage}>
              <Text variant="bold" className="text-white text-lg text-center">
                {currentStage < countingStages.length ? "Next Stage" : "Play Again"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      {renderAchievementUnlockedModal()}
    </SafeAreaView>
  )
}

export default LugandaCountingGame
