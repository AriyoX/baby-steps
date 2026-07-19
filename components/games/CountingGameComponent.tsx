"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import {
  View,
  Image,
  ImageBackground,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  FlatList, // Ensure FlatList is imported
  useWindowDimensions,
  // ScrollView - Will be removed if FlatList replaces its primary use here
} from "react-native"
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context"
import type { Audio } from "expo-av"
import { StatusBar } from "expo-status-bar"
import { useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons" // Already imported
import { useChild } from "@/context/ChildContext"
import { useChildUiLanguage } from "@/context/ChildUiLanguageContext"
import { brandColors } from "@/constants/Brand"
import { ChildLoadingState } from "@/components/child/ChildLoadingState"
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
import {
  completeLocallyFirst,
  type LocalFirstCompletionResult,
  type LocalPersistenceStatus,
} from "@/lib/completionReliability"
import { recordQualifiedStreakActivity } from "@/lib/streakRepository"
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
import type { AchievementDefinition } from "./achievements/achievementTypes"
import { audioManager } from "@/lib/audioManager"
import { useChildNotice } from "@/context/ChildNoticeContext"
import { playWordAudio } from "./utils/audioManager"
import {
  GameHeader,
  GameStatChip,
  GameTour,
  GameTourProvider,
  TourTarget,
  useGameTour,
} from "./GameTour"

const GAME_SCREEN_OVERLAY = "rgba(2, 116, 187, 0.88)"

interface CountingCompletionOrderOptions {
  persistProgress: (progress: CountingGameProgress) => Promise<void>
  revealCompletion: (progress: CountingGameProgress) => void
  runBestEffortNetworkWork: (
    progress: CountingGameProgress,
    persistence: LocalPersistenceStatus,
  ) => Promise<void>
  onLocalError?: (error: unknown) => void
  onNetworkError?: (error: unknown) => void
}

const completeCountingProgressLocallyFirst = (
  completedProgress: CountingGameProgress,
  options: CountingCompletionOrderOptions,
): Promise<LocalFirstCompletionResult<CountingGameProgress>> =>
  completeLocallyFirst({
    persistLocal: async () => {
      await options.persistProgress(completedProgress)
      return completedProgress
    },
    fallbackValue: completedProgress,
    revealCompletion: (progress) => options.revealCompletion(progress),
    runBestEffortNetworkWork: (progress, persistence) =>
      options.runBestEffortNetworkWork(progress, persistence),
    onLocalError: options.onLocalError,
    onNetworkError: options.onNetworkError,
  })

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
  const { t } = useChildUiLanguage()
  const languageCode = activeChild?.selected_language_code || DEFAULT_LEARNING_LANGUAGE_CODE
  const countingTour = useGameTour("counting", activeChild?.id)
  const { width: windowWidth, height: windowHeight } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const landscapeWidth = Math.max(windowWidth, windowHeight)
  const landscapeHeight = Math.min(windowWidth, windowHeight)
  const stageCardGap = 16
  const stageCardWidth = Math.min(270, Math.max(230, landscapeWidth * 0.32))
  const stageCardHeight = Math.max(190, Math.min(232, landscapeHeight * 0.56))
  const stageCardImageHeight = Math.round(stageCardHeight * 0.54)
  const stageCardBodyHeight = stageCardHeight - stageCardImageHeight
  const stageListEndPadding = Math.max(16, landscapeWidth - stageCardWidth - 32)
  const countingCanvasHeight = getCountingCanvasHeight(landscapeHeight)
  const [gameState, setGameState] = useState<GameState>("stageSelect")
  const [currentStage, setCurrentStage] = useState<number>(1)
  const [currentLevel, setCurrentLevel] = useState<number>(1)
  const [countingContent, setCountingContent] = useState<CountingGameContent | null>(null)
  const [currentItem, setCurrentItem] = useState<CountingGameItem | null>(null)
  const [itemsToCount, setItemsToCount] = useState<CountItem[]>([])
  const [selectedCount, setSelectedCount] = useState<number | null>(null)
  const [showFeedback, setShowFeedback] = useState<boolean>(false)
  const [isCorrect, setIsCorrect] = useState<boolean>(false)
  const [score, setScore] = useState<number>(0)
  const [sound, setSound] = useState<Audio.Sound | null>(null)
  const [numberOptions, setNumberOptions] = useState<number[]>([])
  const [levelSetupError, setLevelSetupError] = useState<string | null>(null)
  const [dimensions, setDimensions] = useState<WindowDimensions>({
    width: landscapeWidth,
    height: landscapeHeight,
  })
  const [targetNumber, setTargetNumber] = useState<number>(1)
  const [gameLevels, setGameLevels] = useState<number[]>([])
  const [stageCompleted, setStageCompleted] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [contentRetrySequence, setContentRetrySequence] = useState(0)
  // Progress state
  const [progress, setProgress] = useState<CountingGameProgress>(DEFAULT_PROGRESS)
  const progressRef = useRef<CountingGameProgress>(DEFAULT_PROGRESS)
  const progressRevisionRef = useRef(0)
  const contentProgressRevisionRef = useRef<string | undefined>(undefined)
  const progressOwnerRef = useRef({
    childId: activeChild?.id,
    languageCode,
  })
  const isMountedRef = useRef(false)
  const hydrationGenerationRef = useRef(0)
  const correctAnswerLockRef = useRef(false)
  const stageCompletionLockRef = useRef(false)
  const answerAdvanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [fadeAnim] = useState(new Animated.Value(0))

  const bounceAnim = useRef(new Animated.Value(1)).current
  const rotateAnim = useRef(new Animated.Value(0)).current
  const gameStartTime = useRef(Date.now())
  const countingStages = countingContent?.stages ?? []
  const countingStageIds = countingStages.map((stage) => stage.id)
  const countingItems = countingContent?.culturalItems ?? []
  const currencyItems = countingContent?.currency ?? []

  progressOwnerRef.current = {
    childId: activeChild?.id,
    languageCode,
  }

  const updateProgressState = (nextProgress: CountingGameProgress): number => {
    progressRef.current = nextProgress
    progressRevisionRef.current += 1
    setProgress(nextProgress)
    return progressRevisionRef.current
  }

  const clearGameTimers = useCallback((): void => {
    if (answerAdvanceTimeoutRef.current) {
      clearTimeout(answerAdvanceTimeoutRef.current)
      answerAdvanceTimeoutRef.current = null
    }
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current)
      feedbackTimeoutRef.current = null
    }
  }, [])

  useEffect(() => {
    isMountedRef.current = true

    return () => {
      isMountedRef.current = false
      hydrationGenerationRef.current += 1
      clearGameTimers()
    }
  }, [clearGameTimers])

  const {
    checkAndGrantNewAchievements,
  } = useAchievements(activeChild?.id, "counting_game")
  const { enqueueAchievementUnlocked } = useChildNotice()

  const getStageById = (stageId: number): CountingGameStage | undefined =>
    countingStages.find((stage) => stage.id === stageId) ?? countingStages[0]

  const getNumberLabel = (number: number): string => {
    const currencyItem = currencyItems.find((item) => item.value === number)
    if (currencyItem) {
      return currencyItem.targetText
    }

    return countingContent?.numbers.find((item) => item.number === number)?.targetText ?? ""
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
    const requestGeneration = ++hydrationGenerationRef.current
    const requestedChildId = activeChild?.id
    const requestedLanguageCode = languageCode
    const isCurrentRequest = (): boolean => {
      const owner = progressOwnerRef.current
      return (
        isMountedRef.current &&
        hydrationGenerationRef.current === requestGeneration &&
        owner.childId === requestedChildId &&
        owner.languageCode === requestedLanguageCode
      )
    }

    const loadSavedProgress = async () => {
      setIsLoading(true)

      try {
        const contentResult = await loadContentBundle(requestedLanguageCode, {
          forceRefresh: true,
        })
        const loadedCountingContent = contentResult.bundle?.countingGame ?? null
        const contentProgressRevision =
          contentResult.bundle?.progressRevisions?.counting_game
        if (contentResult.bundle) {
          void preloadContentBundleImages(contentResult.bundle).catch((error) => {
            console.warn("Could not preload Counting Game images:", error)
          })
        }

        if (!isCurrentRequest()) return

        contentProgressRevisionRef.current = contentProgressRevision

        setCountingContent(loadedCountingContent)
        setCurrentItem(loadedCountingContent?.culturalItems[0] ?? null)

        if (requestedChildId) {
          console.log(`Loading progress for child: ${requestedChildId}`)
          const availableStageIds =
            loadedCountingContent?.stages.map((stage) => stage.id) ?? []
          const savedProgress = contentProgressRevision
            ? await loadGameProgress(
                requestedChildId,
                requestedLanguageCode,
                availableStageIds,
                contentProgressRevision,
              )
            : await loadGameProgress(
                requestedChildId,
                requestedLanguageCode,
                availableStageIds,
              )

          if (!isCurrentRequest()) return

          updateProgressState(savedProgress)

          if (savedProgress.currentStage) {
            setCurrentStage(savedProgress.currentStage)
          }
        } else {
          updateProgressState(DEFAULT_PROGRESS)
        }

        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start()
      } catch (error) {
        console.error("Error loading counting game content or progress:", error)
        if (!isCurrentRequest()) return

        setCountingContent(null)
        updateProgressState(requestedChildId ? { ...DEFAULT_PROGRESS, childId: requestedChildId } : DEFAULT_PROGRESS)
      } finally {
        if (isCurrentRequest()) {
          setIsLoading(false)
        }
      }
    }

    void loadSavedProgress().catch((error) => {
      console.warn("Could not finish Counting Game hydration:", error)
    })

    return () => {
      if (hydrationGenerationRef.current === requestGeneration) {
        hydrationGenerationRef.current += 1
      }
      clearGameTimers()
      correctAnswerLockRef.current = false
      stageCompletionLockRef.current = false
    }
  }, [activeChild?.id, languageCode, clearGameTimers, contentRetrySequence])

  useEffect(() => {
    setDimensions({
      width: landscapeWidth,
      height: landscapeHeight,
    })
  }, [landscapeWidth, landscapeHeight])

  // Handle stage completion and update progress before best-effort network work.
  const handleStageCompletion = async (completedStageScore: number) => {
    if (stageCompletionLockRef.current) return
    stageCompletionLockRef.current = true

    if (!activeChild) {
      stageCompletionLockRef.current = false
      return
    }

    const completionChildId = activeChild.id
    const completionLanguageCode = languageCode
    const completionStageId = currentStage
    const completionSessionStartedAt = gameStartTime.current
    const streakCompletedAt = new Date().toISOString()
    const progressAtCompletion = progressRef.current
    const completedProgress = updateProgressForStageCompletion(
      {
        ...progressAtCompletion,
        unlockedStages: [...progressAtCompletion.unlockedStages],
        completedStages: [...progressAtCompletion.completedStages],
        lastPlayedLevel: { ...progressAtCompletion.lastPlayedLevel },
        playHistory: [...progressAtCompletion.playHistory],
      },
      completionStageId,
      completedStageScore,
      countingStageIds,
      completionChildId,
    )
    const achievementEvents: Parameters<typeof checkAndGrantNewAchievements>[0][] = [
      {
        type: "score_updated",
        gameKey: "counting_game",
        newTotalScore: completedStageScore,
      },
      {
        type: "stage_completed",
        gameKey: "counting_game",
        stageId: completionStageId,
        newTotalScore: completedProgress.totalScore,
      },
    ]
    let completionRevision = 0

    await completeCountingProgressLocallyFirst(completedProgress, {
      persistProgress: (nextProgress) =>
        saveGameProgress(nextProgress, completionChildId, completionLanguageCode, {
          availableStageIds: countingStageIds,
          contentRevision: contentProgressRevisionRef.current,
        }),
      revealCompletion: (savedProgress) => {
        const owner = progressOwnerRef.current
        if (
          !isMountedRef.current ||
          owner.childId !== completionChildId ||
          owner.languageCode !== completionLanguageCode
        ) {
          return
        }

        completionRevision = updateProgressState(savedProgress)
        setStageCompleted(true)
      },
      runBestEffortNetworkWork: async (savedProgress, persistence) => {
        const achievementWork = async () => {
          const outcomes = await Promise.allSettled(
            achievementEvents.map((event) => checkAndGrantNewAchievements(event)),
          )
          const newlyAwarded = new Map<string, AchievementDefinition>()

          outcomes.forEach((outcome) => {
            if (outcome.status === "rejected") {
              console.warn("Could not evaluate a Counting Game achievement:", outcome.reason)
              return
            }

            outcome.value.forEach((achievement) => {
              if (!newlyAwarded.has(achievement.id)) {
                newlyAwarded.set(achievement.id, achievement)
              }
            })
          })

          const awardedAchievements = [...newlyAwarded.values()]
          const achievementPoints = awardedAchievements.reduce(
            (total, achievement) => total + achievement.points,
            0,
          )
          const owner = progressOwnerRef.current
          if (
            !isMountedRef.current ||
            owner.childId !== completionChildId ||
            owner.languageCode !== completionLanguageCode ||
            progressRevisionRef.current !== completionRevision ||
            progressRef.current !== savedProgress
          ) {
            return
          }

          awardedAchievements.forEach((achievement) => enqueueAchievementUnlocked(achievement))
          if (achievementPoints <= 0) return

          const progressWithAchievementPoints = {
            ...savedProgress,
            totalScore: savedProgress.totalScore + achievementPoints,
          }
          updateProgressState(progressWithAchievementPoints)
          await saveGameProgress(
            progressWithAchievementPoints,
            completionChildId,
            completionLanguageCode,
            {
              availableStageIds: countingStageIds,
              contentRevision: contentProgressRevisionRef.current,
            },
          )
        }
        const outcomes = await Promise.allSettled([
          trackActivity(true, completedStageScore),
          achievementWork(),
          syncProgressNow(completionChildId),
          persistence.persisted
            ? recordQualifiedStreakActivity({
                childId: completionChildId,
                sourceType: "game",
                sourceId: `counting-stage-${completionStageId}`,
                completionId: `counting:${completionStageId}:${completionSessionStartedAt}`,
                completedAt: streakCompletedAt,
              })
            : Promise.resolve(),
        ])

        outcomes.forEach((outcome) => {
          if (outcome.status === "rejected") {
            console.warn("Could not finish Counting Game best-effort network work:", outcome.reason)
          }
        })
      },
      onLocalError: (error) => {
        console.warn("Counting Game completion was not durably saved locally:", error)
      },
      onNetworkError: (error) => {
        console.warn("Could not finish Counting Game best-effort network work:", error)
      },
    })

    console.log(`Stage ${completionStageId} completed for child: ${completionChildId}`)
  }

  // Initialize exactly once when play starts or the selected stage changes.
  // Keeping this in one effect avoids generating two different random level
  // sequences when gameState and currentStage change in the same render.
  useEffect(() => {
    if (gameState === "playing") {
      console.log(`Stage changed to ${currentStage}`)
      initializeStage(currentStage)
      // Reset UI states when changing stages
      setShowFeedback(false)
      setSelectedCount(null)
      setNumberOptions([])
      setScore(0)
    }
  }, [currentStage, countingStages, gameState])

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
        updateProgressState(updatedProgress)
        void saveGameProgress(updatedProgress, activeChild.id, languageCode, {
          availableStageIds: countingStageIds,
          contentRevision: contentProgressRevisionRef.current,
        }).catch((error) => {
          console.warn("Could not save Counting Game level position:", error)
        })
      }
    }

    return () => {
      if (sound) {
        void audioManager.unloadAppSound(sound).catch((error) => {
          console.warn("Could not unload Counting Game sound:", error)
        })
      }
    }
  }, [currentLevel, gameLevels, gameState, activeChild, languageCode, dimensions.width, dimensions.height])

  // Initialize a stage with randomized levels
  const initializeStage = (stageId: number): void => {
    try {
      setLevelSetupError(null)
      correctAnswerLockRef.current = false
      stageCompletionLockRef.current = false

      // Get random numbers for this stage
      const randomNumbers = getRandomNumbersForStage(stageId)

      // Verify we have numbers before proceeding
      if (randomNumbers.length === 0) {
        console.error(`No numbers generated for stage ${stageId}`)
        setGameLevels([])
        setLevelSetupError("This stage does not have any playable number activities yet.")
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
      setGameLevels([])
      setLevelSetupError("This counting stage could not be prepared.")
    }
  }

  const setupLevel = (targetNum = 0, stageId = currentStage): void => {
    try {
      setLevelSetupError(null)
      correctAnswerLockRef.current = false

      // Get the current stage
      const stage = getStageById(stageId)
      if (!stage) {
        setItemsToCount([])
        setNumberOptions([])
        setLevelSetupError("This counting stage is no longer available.")
        return
      }

      const randomItemIndex = Math.floor(Math.random() * countingItems.length)
      const newItem = countingItems[randomItemIndex]
      if (!stage.usesCurrency && !newItem) {
        setItemsToCount([])
        setNumberOptions([])
        setLevelSetupError("This question is missing the pictures needed for counting.")
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

      setCurrentItem(newItem ?? null)
      setItemsToCount(newItemsToCount)
      setSelectedCount(null)
      setShowFeedback(false)
      setNumberOptions(options)
    } catch (error) {
      console.error("Error setting up level:", error)
      setItemsToCount([])
      setNumberOptions([])
      setLevelSetupError("This counting question could not be prepared.")
    }
  }

  const playNumberSound = async (number: number): Promise<void> => {
    try {
      const targetText = getNumberLabel(number)
      const newSound = await playWordAudio({ targetText }, sound ?? undefined)
      if (isMountedRef.current) {
        setSound(newSound ?? null)
      } else if (newSound) {
        void audioManager.unloadAppSound(newSound).catch((error) => {
          console.warn("Could not unload late Counting Game sound:", error)
        })
      }
    } catch (error) {
      console.error("Error playing sound", error)
    }
  }

  const trackActivity = async (isStageComplete = false, activityScore = score) => {
    if (!activeChild) return

    const duration = Math.round((Date.now() - gameStartTime.current) / 1000) // duration in seconds

    const saved = await saveActivity({
      child_id: activeChild.id,
      activity_type: "counting",
      activity_name: isStageComplete ? `Completed Counting Stage ${currentStage}` : "Practiced Counting",
      score: activityScore.toString(),
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
    if (!saved) {
      throw new Error("Could not save Counting Game activity.")
    }
  }

  const handleNumberPress = (number: number): void => {
    const isAnswerCorrect = number === targetNumber
    if (isAnswerCorrect && correctAnswerLockRef.current) return
    if (isAnswerCorrect) {
      correctAnswerLockRef.current = true
    }

    setSelectedCount(number)
    void playNumberSound(number).catch((error) => {
      console.warn("Could not play Counting Game number sound:", error)
    })

    // Check if the answer is correct
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
        newTotalScore: newScore,
      }

      // Move to next level after a delay
      if (answerAdvanceTimeoutRef.current) {
        clearTimeout(answerAdvanceTimeoutRef.current)
      }
      const answerChildId = activeChild?.id
      const answerLanguageCode = languageCode
      answerAdvanceTimeoutRef.current = setTimeout(() => {
        answerAdvanceTimeoutRef.current = null
        const owner = progressOwnerRef.current
        if (
          !isMountedRef.current ||
          owner.childId !== answerChildId ||
          owner.languageCode !== answerLanguageCode
        ) {
          return
        }

        const currentStageData = getStageById(currentStage)
        if (!currentStageData) {
          correctAnswerLockRef.current = false
          return
        }
        if (currentLevel < currentStageData.levels) {
          setCurrentLevel((prevLevel) => prevLevel + 1)

          const completionChildId = answerChildId
          const completionLanguageCode = answerLanguageCode
          const baselineProgress = progressRef.current
          const baselineRevision = progressRevisionRef.current
          void Promise.allSettled([
            trackActivity(false, newScore),
            checkAndGrantNewAchievements(scoreEvent).then(async (newlyAwarded) => {
              const achievementPoints = newlyAwarded.reduce(
                (total, achievement) => total + achievement.points,
                0,
              )
              const owner = progressOwnerRef.current
              if (
                !completionChildId ||
                !isMountedRef.current ||
                owner.childId !== completionChildId ||
                owner.languageCode !== completionLanguageCode ||
                progressRevisionRef.current !== baselineRevision ||
                progressRef.current !== baselineProgress
              ) {
                return
              }

              newlyAwarded.forEach((achievement) => enqueueAchievementUnlocked(achievement))
              if (achievementPoints <= 0) return

              const progressWithAchievementPoints = {
                ...baselineProgress,
                totalScore: baselineProgress.totalScore + achievementPoints,
              }
              updateProgressState(progressWithAchievementPoints)
              await saveGameProgress(
                progressWithAchievementPoints,
                completionChildId,
                completionLanguageCode,
                {
                  availableStageIds: countingStageIds,
                  contentRevision: contentProgressRevisionRef.current,
                },
              )
            }),
          ]).then((outcomes) => {
            outcomes.forEach((outcome) => {
              if (outcome.status === "rejected") {
                console.warn("Could not finish Counting Game level network work:", outcome.reason)
              }
            })
          }).catch((error) => {
            console.warn("Could not inspect Counting Game level network work:", error)
          })
        } else {
          if (answerChildId) {
            void handleStageCompletion(newScore).catch((error) => {
              stageCompletionLockRef.current = false
              correctAnswerLockRef.current = false
              console.warn("Could not finish Counting Game stage completion:", error)
            })
          } else {
            setStageCompleted(true)
          }
        }
      }, 1500)
    } else {
      // For incorrect answers, clear feedback after a short delay to allow another try
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current)
      }
      feedbackTimeoutRef.current = setTimeout(() => {
        feedbackTimeoutRef.current = null
        if (!isMountedRef.current) return
        setShowFeedback(false)
        setSelectedCount(null)
      }, 1500)
    }
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
    return currentItem
      ? (resolveImageSource(currentItem.image, "african-logic.png") as any)
      : null
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
        return []
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
              accessibilityLabel={currentItem?.name ?? "Counting item"}
            />
          </Animated.View>
          <Text variant="bold" className="text-xs bg-white/80 px-2 py-1 rounded mt-1">
            {item.bunch} {currentItem?.name}
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
          accessibilityLabel={currentItem?.name ?? "Counting item"}
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
        .replace(/\{item\}/g, currentItem?.name ?? "")
    }

    return (stage.prompt ?? "How many {item} do you see?").replace(
      /\{item\}/g,
      currentItem?.name ?? "",
    )
  }

  const selectStage = (stageId: number) => {
    if (isStageUnlocked(progress, stageId)) {
      clearGameTimers()
      correctAnswerLockRef.current = false
      stageCompletionLockRef.current = false
      setCurrentStage(stageId)

      if (activeChild) {
        // Update current stage in progress
        const updatedProgress = {
          ...progress,
          currentStage: stageId,
          childId: activeChild.id, // Ensure child ID is set
        }
        updateProgressState(updatedProgress)
        void saveGameProgress(updatedProgress, activeChild.id, languageCode, {
          availableStageIds: countingStageIds,
          contentRevision: contentProgressRevisionRef.current,
        }).catch((error) => {
          console.warn("Could not save Counting Game stage selection:", error)
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
      <ImageBackground source={require("@/assets/images/gameBackground.jpg")} className="flex-1 bg-cover">
        <SafeAreaView className="flex-1" edges={[]} style={{ backgroundColor: GAME_SCREEN_OVERLAY }}>
          <StatusBar style="light" translucent backgroundColor="transparent" />

          <View className="flex-1 px-6 pt-6 pb-5">
            <View className="flex-row items-center justify-between mb-4">
              <TouchableOpacity
                className="w-12 h-12 rounded-full bg-white justify-center items-center border-2 border-accent-500"
                onPress={() => router.back()}
                accessibilityRole="button"
                accessibilityLabel={t("games.backToGames")}
              >
                <Ionicons name="arrow-back" size={22} color={brandColors.victoriaBlue} />
              </TouchableOpacity>

              <View className="flex-1 px-4">
                <Text variant="bold" className="text-white text-3xl text-center" numberOfLines={1}>
                  {countingContent?.title ?? "Counting Game"}
                </Text>
                <Text className="text-white/85 text-sm text-center" numberOfLines={2}>
                  {t("games.chooseStageIntro")}
                </Text>
              </View>

              <View className="flex-row items-center bg-white rounded-full px-4 py-2 border-2 border-accent-500">
                <Image source={require("@/assets/images/coin.png")} className="w-5 h-5 mr-1.5" resizeMode="contain" />
                <Text variant="bold" className="text-amber-500 text-base" numberOfLines={1}>
                  {progress.totalScore}
                </Text>
              </View>
            </View>

            <View className="bg-white/15 rounded-2xl px-4 py-3 mb-4">
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-4">
                  <Text variant="bold" className="text-white text-lg" numberOfLines={1}>
                    {t("learning.chooseStage")}
                  </Text>
                  <Text className="text-white/85 text-sm" numberOfLines={2}>
                    {t("games.countingStageHint")}
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <Ionicons name="calculator-outline" size={22} color="#ffffff" />
                  <Text variant="bold" className="text-white text-sm ml-2" numberOfLines={1}>
                    {t("games.stagesCount", { count: countingStages.length })}
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
                data={countingStages}
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
                  const isUnlocked = isStageUnlocked(progress, stage.id)
                  const isCompleted = progress.completedStages.includes(stage.id)

                  let stageIconName: keyof typeof Ionicons.glyphMap = "list-outline"
                  if (stage.usesCurrency) {
                    stageIconName = "cash-outline"
                  } else if (stage.useBunches) {
                    stageIconName = "apps-outline"
                  }

                  const statusIcon: keyof typeof Ionicons.glyphMap = !isUnlocked
                    ? "lock-closed"
                    : isCompleted
                      ? "checkmark-circle"
                      : stageIconName
                  const statusLabel = !isUnlocked
                    ? t("common.locked")
                    : isCompleted
                      ? t("common.done")
                      : progress.lastPlayedLevel[stage.id]
                        ? `${t("learning.levelShort")} ${progress.lastPlayedLevel[stage.id]}`
                        : t("common.start")
                  const statusColor = !isUnlocked
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
                        borderColor: !isUnlocked ? brandColors.neutral[200] : brandColors.equatorialGold,
                        opacity: !isUnlocked ? 0.74 : 1,
                      }}
                      className="bg-white rounded-2xl overflow-hidden shadow-md border-2"
                      onPress={() => selectStage(stage.id)}
                      disabled={!isUnlocked}
                      activeOpacity={isUnlocked ? 0.75 : 1}
                      accessibilityRole="button"
                      accessibilityLabel={`${stage.title}. ${stage.description}. ${statusLabel}.`}
                      accessibilityState={{ disabled: !isUnlocked }}
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
                        {!isUnlocked ? <View className="absolute top-0 bottom-0 left-0 right-0 bg-black/20" /> : null}
                        <View className="absolute top-2 left-2 bg-white/95 px-2.5 py-1 rounded-full">
                          <Text variant="bold" className="text-[11px] text-primary-700" numberOfLines={1}>
                            {t("learning.stage")} {stage.id}
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
                            <Ionicons name="layers-outline" size={14} color={brandColors.victoriaBlue} />
                            <Text variant="medium" className="text-[11px] text-primary-700 ml-1" numberOfLines={1}>
                              {t("games.levelsCount", { count: stage.levels })}
                            </Text>
                          </View>
                          <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: !isUnlocked ? brandColors.neutral[100] : brandColors.blue[50] }}>
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

  // Show loading state if game is loading
  if (isLoading) {
    return (
      <ChildLoadingState
        title={t("games.gettingNumbersReady")}
        message={t("games.loadingGame")}
        icon="calculator-outline"
      />
    )
  }

  if (!countingContent || countingStages.length === 0) {
    return (
      <ComingSoonState
        title={t("games.countingComingSoon")}
        onRetry={() => setContentRetrySequence((current) => current + 1)}
      />
    )
  }

  // Render the appropriate screen based on game state
  if (gameState === "stageSelect") {
    return renderStageSelectionScreen()
  }

  if (levelSetupError) {
    return (
      <ComingSoonState
        title={t("games.questionNotReady")}
        message={levelSetupError}
        showBackButton={false}
        onRetry={() => {
          setLevelSetupError(null)
          setGameState("stageSelect")
        }}
        actionLabel={t("games.chooseAnotherStage")}
        actionAccessibilityLabel="Return to the counting stage list"
      />
    )
  }

  const activeStage = getStageById(currentStage) ?? countingStages[0]

  // Render the game screen
  return (
    <GameTourProvider>
      <View className="flex-1 bg-blue-50">
      <SafeAreaView className="flex-1">
      <StatusBar style={stageCompleted ? "light" : "dark"} />

      <GameHeader
        title={activeStage.title}
        subtitle={t("games.levelProgress", {
          stage: currentStage,
          level: currentLevel,
          total: activeStage.levels,
        })}
        onBack={() => setGameState("stageSelect")}
        backAccessibilityLabel="Back to counting stages"
        onHelp={countingTour.open}
        trailing={
          <>
            <GameStatChip
              icon="layers-outline"
              label={`${currentLevel}/${activeStage.levels}`}
              accessibilityLabel={`Level ${currentLevel} of ${activeStage.levels}`}
            />
            <GameStatChip
              icon="star"
              label={`${score}`}
              tint="#D99D19"
              accessibilityLabel={`${score} points`}
              tourTargetId="counting-score"
            />
          </>
        }
      />

      {/* Main content area */}
      <Animated.View
        className="flex-1 flex-row w-full px-4 pb-3"
        style={{
          opacity: fadeAnim,
          columnGap: 12,
          transform: [
            {
              translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [12, 0],
              }),
            },
          ],
        }}
      >
        {/* Center section - Items to count */}
        <View className="items-center justify-center pr-2" style={{ flex: 2.7 }}>
          <View className="w-full items-center mb-2 bg-white px-5 py-2 rounded-2xl shadow-sm border border-blue-100">
            <Text variant="bold" className="text-xl text-slate-800 text-center" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.84}>
              {getQuestionText()}
            </Text>
          </View>

          {/* Items container */}
          <TourTarget id="counting-objects">
          <View className="w-full relative bg-white rounded-3xl p-4 shadow-sm border border-blue-100 overflow-hidden" style={{ height: countingCanvasHeight }}>
            <Text className="hidden">{getNumberLabel(targetNumber)} = {targetNumber}</Text>
            <View className="absolute top-3 left-3 flex-row items-center bg-blue-50 rounded-full px-2.5 py-1">
              <Ionicons name="eye-outline" size={16} color="#0274BB" />
              <Text variant="medium" className="text-xs text-primary-600 ml-1">{t("games.countPictures")}</Text>
            </View>
            {/* Render counting items */}
            {renderItemsToCount()}
          </View>
          </TourTarget>
        </View>

        {/* Right section - Number options */}
        <View className="items-center justify-center pl-2" style={{ flex: 1 }}>
          <TourTarget id="counting-answers">
          <View className="bg-white rounded-3xl shadow-sm px-3 py-3 w-full border border-blue-100 justify-center">
            <Text variant="bold" className="text-center text-base text-primary-700 mb-2" numberOfLines={1}>
              {t("games.howMany")}
            </Text>
            <Text className="text-center text-xs text-slate-400 mb-2" numberOfLines={1}>
              {t("games.howMany")}
            </Text>

            <View className="items-center justify-center py-1">
              {numberOptions.length > 0 ? (
                numberOptions.map((number) => (
                  <TouchableOpacity
                    key={number}
                    className={`w-16 h-16 rounded-2xl justify-center items-center shadow mb-2 border-2 ${
                      selectedCount === number && isCorrect
                        ? "bg-emerald-500 border-emerald-200"
                        : selectedCount === number && !isCorrect
                          ? "bg-red-500 border-red-200"
                          : "bg-indigo-500 border-indigo-300"
                    }`}
                    onPress={() => handleNumberPress(number)}
                    disabled={showFeedback && isCorrect}
                    activeOpacity={0.78}
                  >
                    <Text variant="bold" className="text-2xl text-white" numberOfLines={1}>
                      {number}
                    </Text>
                    <Text className="text-sm text-white opacity-90" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78}>
                      {getNumberLabel(number).split(" ")[0]}
                    </Text>
                  </TouchableOpacity>
                ))
              ) : (
                <ActivityIndicator size="small" color="#818cf8" />
              )}
            </View>
          </View>
          </TourTarget>
        </View>
      </Animated.View>
      </SafeAreaView>

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
            <View className={`w-12 h-12 rounded-full items-center justify-center mb-2 ${isCorrect ? "bg-emerald-50" : "bg-red-50"}`}>
              <Ionicons
                name={isCorrect ? "sparkles" : "refresh-circle"}
                size={28}
                color={isCorrect ? brandColors.success : brandColors.danger}
              />
            </View>
            <Text className="hidden">{isCorrect ? "🎉" : "😕"}</Text>
            <Text
              variant="bold"
              className={`text-xl text-center mb-1 ${isCorrect ? "text-emerald-600" : "text-red-600"}`}
            >
              {isCorrect ? t("common.great") : t("common.retry")}
            </Text>
            <Text className="text-slate-600 text-center">
              {isCorrect ? t("common.correct") : t("common.retry")}
            </Text>
          </View>
        </Animated.View>
      )}

      {/* Stage completion overlay */}
      {stageCompleted && (
        <View
          className="absolute inset-0 items-center justify-center"
          style={{
            backgroundColor: "#020617B3",
            paddingBottom: Math.max(insets.bottom, 16),
            paddingLeft: Math.max(insets.left, 20),
            paddingRight: Math.max(insets.right, 20),
            paddingTop: Math.max(insets.top, 16),
          }}
        >
          <View className="bg-white rounded-2xl p-6 w-3/5 max-w-md items-center shadow-xl">
            <View className="absolute -top-10 bg-indigo-500 w-20 h-20 rounded-full items-center justify-center border-4 border-white">
              <Ionicons name="trophy" size={38} color="#ffffff" />
            </View>

            <Text variant="bold" className="text-2xl text-indigo-800 mt-6 mb-3 text-center">
              {t("games.stageDone", { stage: currentStage })}
            </Text>

            <Text className="text-slate-600 text-center mb-5 text-base">
              {t("games.countedRange", {
                min: activeStage.numbersRange.min,
                max: activeStage.numbersRange.max,
              })}
            </Text>

            <View className="bg-blue-50 w-full rounded-xl p-4 mb-5">
              <View className="flex-row justify-between items-center mb-3">
                <View className="flex-row items-center">
                  <Ionicons name="star" size={20} color="#f59e0b" />
                  <Text className="ml-2 text-slate-700">{t("common.score")}</Text>
                </View>
                <Text variant="bold" className="text-amber-500 text-lg">
                  {score + 10}
                </Text>
              </View>

              <View className="flex-row justify-between items-center">
                <View className="flex-row items-center">
                  <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                  <Text className="ml-2 text-slate-700">{t("common.levels")}</Text>
                </View>
                <Text variant="bold" className="text-emerald-600 text-lg">
                  {activeStage.levels}
                </Text>
              </View>
            </View>

            <TouchableOpacity className="bg-indigo-500 py-4 px-6 rounded-xl shadow-md" onPress={continueStage}>
              <Text variant="bold" className="text-white text-lg text-center">
                {currentStage < countingStages.length ? t("games.nextStage") : t("common.playAgain")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      <GameTour
        visible={countingTour.visible}
        onCancel={countingTour.close}
        onComplete={countingTour.complete}
        steps={[
          { id: "objects", targetId: "counting-objects", icon: "eye-outline", placement: "right", title: t("games.count"), description: t("games.countOnce") },
          { id: "answers", targetId: "counting-answers", icon: "calculator-outline", placement: "left", title: t("games.pickNumber"), description: t("games.pickNumberHint") },
          { id: "score", targetId: "counting-score", icon: "star-outline", placement: "bottom", title: t("games.yourStars"), description: t("games.starsHint") },
        ]}
      />
      </View>
    </GameTourProvider>
  )
}

export default LugandaCountingGame
