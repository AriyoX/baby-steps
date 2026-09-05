"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import {
  View,
  TouchableOpacity,
  ImageBackground,
  Animated,
  ScrollView,
  FlatList,
  useWindowDimensions,
  type ImageSourcePropType,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import type { Audio } from "expo-av"
import { LinearGradient } from "expo-linear-gradient"
import { StatusBar } from "expo-status-bar"
import { useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { Text } from "@/components/StyledText"
import { ChildLoadingState } from "@/components/child/ChildLoadingState"
import { ComingSoonState } from "@/components/child/ComingSoonState"
import { CachedImage } from "@/components/common/CachedImage"
import { useChild } from "@/context/ChildContext"
import { useChildUiLanguage } from "@/context/ChildUiLanguageContext"
import { useChildNotice } from "@/context/ChildNoticeContext"
import { brandColors } from "@/constants/Brand"
import { activityColors } from "@/constants/ActivityTheme"
import { CHILD_GAME_SAFE_AREA_EDGES } from "@/constants/SystemUi"
import { ActivityButton } from "@/components/learning/ActivityControls"
import { LearningIllustratedScreen, LearningWordContent } from "@/components/learning/LearningIllustratedScreen"
import { LearningQuizBoard } from "./LearningQuizBoard"
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
import {
  completeLocallyFirst,
  type LocalFirstCompletionResult,
  type LocalPersistenceStatus,
} from "@/lib/completionReliability"
import { recordQualifiedStreakActivity } from "@/lib/streakRepository"
import { childHaptics } from "@/lib/childHaptics"
import { useAchievements } from "./achievements/useAchievements"
import type { AchievementDefinition } from "./achievements/achievementTypes"
import { playWordAudio, loadGameSounds } from "./utils/audioManager"
import { audioManager } from "@/lib/audioManager"
import {
  GameHeader,
  GameTour,
  GameTourProvider,
  TourTarget,
  useGameTour,
} from "./GameTour"
import { GameLevelSelector } from "./GameLevelSelector"
import {
  getGameStageCarouselSizing,
  getLearningGameSizing,
} from "./responsiveSizing"

import {
  applyLegacyLearningAccessLocks,
  loadGameProgress as loadProgress,
  saveGameProgress as saveProgress,
  type UserStats,
  DEFAULT_USER_STATS,
} from "./utils/progressManagerLugandaLearning" // Adjust the import path as necessary

type GameState = "menu" | "stageSelect" | "levelSelect" | "learning" | "playing" | "levelComplete"

interface LearningGameCompletionOrderOptions {
  persistProgress: (totalScore: number) => Promise<unknown>
  revealCompletion: (totalScore: number) => void
  runBestEffortNetworkWork: (
    totalScore: number,
    persistence: LocalPersistenceStatus,
  ) => Promise<void>
  onLocalError?: (error: unknown) => void
  onNetworkError?: (error: unknown) => void
}

const completeLearningGameProgressLocallyFirst = (
  completedTotalScore: number,
  options: LearningGameCompletionOrderOptions,
): Promise<LocalFirstCompletionResult<number>> =>
  completeLocallyFirst({
    persistLocal: async () => {
      const persisted = await options.persistProgress(completedTotalScore)
      if (persisted === false) {
        throw new Error("Legacy Learning Game progress was not saved locally.")
      }
      return completedTotalScore
    },
    fallbackValue: completedTotalScore,
    revealCompletion: (totalScore) => options.revealCompletion(totalScore),
    runBestEffortNetworkWork: (totalScore, persistence) =>
      options.runBestEffortNetworkWork(totalScore, persistence),
    onLocalError: options.onLocalError,
    onNetworkError: options.onNetworkError,
  })

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

const LugandaLearningGame: React.FC = () => {
  const router = useRouter()
  const { activeChild } = useChild()
  const { t } = useChildUiLanguage()
  const languageCode = activeChild?.selected_language_code || DEFAULT_LEARNING_LANGUAGE_CODE
  const learningTour = useGameTour("learning-quiz", activeChild?.id)
  const achievementGameKey = languageCode === "lg" ? "luganda_learning_game" : "learning_game"
  const {
    checkAndGrantNewAchievements,
  } = useAchievements(activeChild?.id, achievementGameKey) // Pass childId and gameKey
  const { enqueueAchievementUnlocked } = useChildNotice()

  const gameStartTime = useRef(Date.now())

  // Get dimensions for responsive layout
  const { width: windowWidth, height: windowHeight } = useWindowDimensions()
  const isLandscape = windowWidth > windowHeight
  const landscapeWidth = Math.max(windowWidth, windowHeight)
  const stageCarouselSizing = getGameStageCarouselSizing(windowWidth, windowHeight)
  const learningGameSizing = getLearningGameSizing(windowWidth, windowHeight, 3)
  const compactLandscape = stageCarouselSizing.isShort
  const stageCardGap = stageCarouselSizing.cardGap
  const stageCardWidth = stageCarouselSizing.cardWidth
  const stageCardHeight = stageCarouselSizing.cardHeight
  const stageCardImageHeight = stageCarouselSizing.cardImageHeight
  const stageCardBodyHeight = stageCarouselSizing.cardBodyHeight
  const stageListEndPadding = stageCarouselSizing.listEndPadding

  // Game state management
  const [gameState, setGameState] = useState<GameState>("stageSelect")
  const [gameTitle, setGameTitle] = useState<string>("Learning")
  const [stages, setStages] = useState<LearningGameStage[]>([])
  const [selectedStage, setSelectedStage] = useState<LearningGameStage | null>(null)
  const [selectedLevel, setSelectedLevel] = useState<LearningGameLevel | null>(null)
  const [currentLearningIndex, setCurrentLearningIndex] = useState<number>(0)
  const [currentWords, setCurrentWords] = useState<LearningGameWord[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [contentRetrySequence, setContentRetrySequence] = useState(0)

  // Game progress state
  const [totalScore, setTotalScore] = useState<number>(0)
  const [completedLevels, setCompletedLevels] = useState<number[]>([])
  const userStatsRef = useRef<UserStats>({ ...DEFAULT_USER_STATS })
  const completionRevisionRef = useRef(0)
  const contentProgressRevisionRef = useRef<string | undefined>(undefined)
  const progressOwnerRef = useRef({
    childId: activeChild?.id,
    languageCode,
  })
  const isMountedRef = useRef(false)
  const hydrationGenerationRef = useRef(0)
  const answerLockRef = useRef(false)
  const completionLockRef = useRef(false)
  const answerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const optionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
  const soundRef = useRef<Audio.Sound | undefined>(undefined)
  const correctSoundRef = useRef<Audio.Sound | undefined>(undefined)
  const wrongSoundRef = useRef<Audio.Sound | undefined>(undefined)

  // Animations
  const progressWidth = useState<Animated.Value>(new Animated.Value(0))[0]
  const shakeAnimation = useState<Animated.Value>(new Animated.Value(0))[0]
  const fadeAnim = useState<Animated.Value>(new Animated.Value(0))[0]
  const confettiAnim = useState<Animated.Value>(new Animated.Value(0))[0]
  const [shakingOption, setShakingOption] = useState<string | null>(null)

  progressOwnerRef.current = {
    childId: activeChild?.id,
    languageCode,
  }

  const updateUserStatsState = (nextUserStats: UserStats): void => {
    userStatsRef.current = nextUserStats
  }

  const unloadSound = useCallback((loadedSound?: Audio.Sound): void => {
    if (!loadedSound) return

    void audioManager.unloadAppSound(loadedSound).catch((error) => {
      console.warn("Could not unload learning-game sound:", error)
    })
  }, [])

  const loadSounds = useCallback(async (
    isCurrentRequest: () => boolean = () => isMountedRef.current,
  ): Promise<void> => {
    try {
      const { correctSound: newCorrectSound, wrongSound: newWrongSound } = await loadGameSounds()
      if (isCurrentRequest()) {
        correctSoundRef.current = newCorrectSound
        wrongSoundRef.current = newWrongSound
        setCorrectSound(newCorrectSound)
        setWrongSound(newWrongSound)
      } else {
        unloadSound(newCorrectSound)
        unloadSound(newWrongSound)
      }
    } catch (error) {
      console.error("Error loading sounds", error)
    }
  }, [unloadSound])

  const clearGameTimers = useCallback((): void => {
    if (answerTimeoutRef.current) {
      clearTimeout(answerTimeoutRef.current)
      answerTimeoutRef.current = null
    }
    if (optionTimeoutRef.current) {
      clearTimeout(optionTimeoutRef.current)
      optionTimeoutRef.current = null
    }
  }, [])

  useEffect(() => {
    isMountedRef.current = true

    return () => {
      isMountedRef.current = false
      hydrationGenerationRef.current += 1
      clearGameTimers()
      unloadSound(soundRef.current)
      unloadSound(correctSoundRef.current)
      unloadSound(wrongSoundRef.current)
    }
  }, [clearGameTimers, unloadSound])

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
  }, [currentLearningIndex, currentWordIndex, fadeAnim, gameState])

  // Load game progress on mount
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

    const init = async () => {
      setIsLoading(true)
      completionRevisionRef.current += 1

      try {
        const contentResult = await loadContentBundle(requestedLanguageCode, {
          forceRefresh: true,
        })
        const contentStages = contentResult.bundle?.learningGame.stages ?? []
        const contentProgressRevision =
          contentResult.bundle?.progressRevisions?.learning_game
        if (contentResult.bundle) {
          void preloadContentBundleImages(contentResult.bundle).catch((error) => {
            console.warn("Could not preload legacy Learning images:", error)
          })
        }
        // Audio is an enhancement, not a prerequisite for showing the game.
        // Playback already tolerates sounds that are still loading.
        void loadSounds(isCurrentRequest)

        if (!isCurrentRequest()) return

        contentProgressRevisionRef.current = contentProgressRevision

        setGameTitle(contentResult.bundle?.learningGame.title ?? "Learning")
        setSelectedStage(null)
        setSelectedLevel(null)
        setCurrentWords([])

        if (requestedChildId && contentStages.length > 0) {
          const progress = contentProgressRevision
            ? await loadProgress(
                requestedChildId,
                requestedLanguageCode,
                contentStages,
                contentProgressRevision,
              )
            : await loadProgress(
                requestedChildId,
                requestedLanguageCode,
                contentStages,
              )

          if (!isCurrentRequest()) return

          setTotalScore(progress.totalScore)
          setCompletedLevels(progress.completedLevels)
          setStages(progress.stages.length > 0 ? progress.stages : contentStages)
          updateUserStatsState(progress.userStats)
        } else {
          setTotalScore(0)
          setCompletedLevels([])
          setStages(contentStages)
          updateUserStatsState({ ...DEFAULT_USER_STATS })
        }
      } catch (error) {
        console.error("Error loading learning game content:", error)
        if (isCurrentRequest()) {
          setStages([])
          updateUserStatsState({ ...DEFAULT_USER_STATS })
        }
      } finally {
        if (isCurrentRequest()) {
          setIsLoading(false)
        }
      }
    }

    void init().catch((error) => {
      console.warn("Could not finish legacy Learning hydration:", error)
    })

    return () => {
      if (hydrationGenerationRef.current === requestGeneration) {
        hydrationGenerationRef.current += 1
      }
      clearGameTimers()
      answerLockRef.current = false
      completionLockRef.current = false
    }
  }, [activeChild?.id, languageCode, clearGameTimers, contentRetrySequence, loadSounds])

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
    // generateOptions uses the stage collection already listed here. Depending
    // on its render-local identity would regenerate randomized options after
    // each state update performed by this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  }, [currentWordIndex, currentWords, gameState, progressWidth])

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
        if (isMountedRef.current) {
          setShakingOption(null)
        }
      })
    }
  }, [shakeAnimation, shakingOption])

  const playWordSound = async (word: LearningGameWord = currentWord!): Promise<void> => {
    try {
      const newSound = await playWordAudio(word, sound)
      if (isMountedRef.current) {
        soundRef.current = newSound
        setSound(newSound)
      } else {
        unloadSound(newSound)
      }
    } catch (error) {
      console.error("Error playing sound", error)
    }
  }

  // Stage selection
  const selectStage = (stage: LearningGameStage) => {
    if (!stage.isLocked) {
      childHaptics.tap()
      setSelectedStage(stage)
      setGameState("levelSelect")
      // Reset timer when selecting a stage
      gameStartTime.current = Date.now()
    }
  }

  // Level selection
  const selectLevel = (level: LearningGameLevel) => {
    if (!level.isLocked) {
      childHaptics.tap()
      clearGameTimers()
      answerLockRef.current = false
      completionLockRef.current = false
      completionRevisionRef.current += 1
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
      childHaptics.selection()
      fadeAnim.setValue(0)
      setCurrentLearningIndex(currentLearningIndex + 1)
    }
  }

  const previousLearningWord = (): void => {
    if (currentLearningIndex > 0) {
      childHaptics.selection()
      fadeAnim.setValue(0)
      fadeAnim.setValue(0)
      setCurrentLearningIndex(currentLearningIndex - 1)
    }
  }

  const startGame = (): void => {
    childHaptics.tap()
    clearGameTimers()
    answerLockRef.current = false
    completionLockRef.current = false
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
    const allGameWords = stages.flatMap((stage) =>
      stage.levels.flatMap((level) => level.words),
    )
    const distractors = [...new Set(
      [...wordList, ...allGameWords]
        .map((candidate) => candidate.english)
        .filter((answer) => answer && answer !== correctAnswer),
    )]
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
    const optionsArray = [correctAnswer, ...distractors].sort(
      () => Math.random() - 0.5,
    )

    // Small replacement content sets can contain fewer than four unique
    // answers. Building from a finite pool avoids the old unbounded loop that
    // froze the game as soon as a two-word level started.
    setOptions(optionsArray)
  }

  const handleOptionSelect = (option: string): void => {
    if (!currentWord || selectedOption || answerLockRef.current) return
    answerLockRef.current = true

    setSelectedOption(option)

    if (option === currentWord.english) {
      childHaptics.success()
      // Correct answer
      const scoreAfterAnswer = levelScore + 10
      setIsCorrect(true)
      setLevelScore(scoreAfterAnswer)

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
      if (answerTimeoutRef.current) {
        clearTimeout(answerTimeoutRef.current)
      }
      const answerChildId = activeChild?.id
      const answerLanguageCode = languageCode
      answerTimeoutRef.current = setTimeout(() => {
        answerTimeoutRef.current = null
        const owner = progressOwnerRef.current
        if (
          !isMountedRef.current ||
          owner.childId !== answerChildId ||
          owner.languageCode !== answerLanguageCode
        ) {
          return
        }
        nextWord(scoreAfterAnswer)
      }, 1500)
    } else {
      childHaptics.error()
      // Wrong answer
      setIsCorrect(false)
      setShakingOption(option)

      if (wrongSound) {
        void audioManager.replayAppSound(wrongSound).catch((error) => {
          console.warn("Could not replay wrong sound:", error)
        })
      }

      // Allow trying again after a delay
      if (answerTimeoutRef.current) {
        clearTimeout(answerTimeoutRef.current)
      }
      answerTimeoutRef.current = setTimeout(() => {
        answerTimeoutRef.current = null
        if (!isMountedRef.current) return
        setSelectedOption(null)
        setIsCorrect(null)
        answerLockRef.current = false
      }, 1500)
    }
  }

  const nextWord = (completedLevelScore: number): void => {
    const nextIndex = currentWordIndex + 1
    fadeAnim.setValue(0)

    if (nextIndex < currentWords.length) {
      setCurrentWordIndex(nextIndex)
      setCurrentWord(currentWords[nextIndex])
      setSelectedOption(null)
      setIsCorrect(null)
      answerLockRef.current = false

      if (optionTimeoutRef.current) {
        clearTimeout(optionTimeoutRef.current)
      }
      optionTimeoutRef.current = setTimeout(() => {
        optionTimeoutRef.current = null
        if (!isMountedRef.current) return
        generateOptions(currentWords[nextIndex], currentWords)
      }, 300)
    } else {
      // Level completed
      void completeLevelAndUpdateProgress(completedLevelScore).catch((error) => {
        completionLockRef.current = false
        answerLockRef.current = false
        console.warn("Could not finish legacy Learning Game completion:", error)
      })
    }
  }

  const trackActivity = async (isStageComplete = false, activityScore = levelScore) => {
    if (!activeChild) return

    const duration = Math.round((Date.now() - gameStartTime.current) / 1000) // duration in seconds

    const saved = await saveActivity({
      child_id: activeChild.id,
      activity_type: "language",
      activity_name: isStageComplete
        ? `Completed ${selectedStage?.title} Stage`
        : `Mastered ${selectedLevel?.title} Words`,
      score: activityScore.toString(),
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
    if (!saved) {
      throw new Error("Could not save legacy Learning Game activity.")
    }

  }

  const completeLevelAndUpdateProgress = async (completedLevelScore: number) => {
    if (completionLockRef.current) return
    completionLockRef.current = true

    if (!activeChild || !selectedLevel || !selectedStage) {
      console.error("Missing activeChild, selectedLevel, or selectedStage in completeLevelAndUpdateProgress")
      completionLockRef.current = false
      answerLockRef.current = false
      return
    }

    const completionChildId = activeChild.id
    const completionLanguageCode = languageCode
    const completionSessionStartedAt = gameStartTime.current
    const newTotalScoreState = totalScore + completedLevelScore
    const newCompletedLevelsState = [...completedLevels]
    if (!newCompletedLevelsState.includes(selectedLevel.id)) {
      newCompletedLevelsState.push(selectedLevel.id)
    }

    const previousStageIndex = stages.findIndex(
      (stage) => stage.id === selectedStage.id,
    )
    const previouslyLockedNextStage =
      previousStageIndex >= 0
        ? stages[previousStageIndex + 1]?.isLocked
        : undefined
    const wasCurrentStageCompleted = isStageCompleted(
      selectedStage.id,
      completedLevels,
      stages,
    )
    const currentLocalStagesState = applyLegacyLearningAccessLocks(
      stages,
      newCompletedLevelsState,
      newTotalScoreState,
    )

    // The centralized access calculation unlocks exactly one next level and
    // opens the following stage only after this stage is complete.
    const isCurrentStageNowCompleted = isStageCompleted(selectedStage.id, newCompletedLevelsState, currentLocalStagesState)
    const wasStageNewlyCompleted =
      !wasCurrentStageCompleted && isCurrentStageNowCompleted
    const currentStageIndex = currentLocalStagesState.findIndex(
      (stage) => stage.id === selectedStage.id,
    )
    const nextStage =
      currentStageIndex >= 0
        ? currentLocalStagesState[currentStageIndex + 1]
        : undefined
    const nextStageUnlocked = Boolean(
      previouslyLockedNextStage && nextStage && !nextStage.isLocked,
    )

    const existingUserStats = userStatsRef.current
    const lastPlayedDate = new Date(existingUserStats.lastPlayed || 0)
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
      correctAnswers: (existingUserStats.correctAnswers || 0) + completedLevelScore / 10,
      wrongAnswers: (existingUserStats.wrongAnswers || 0) + (currentWords.length - completedLevelScore / 10),
      lastPlayed: today.toISOString(),
      streakDays: newStreakDays,
    }

    const eventsForAchievements: Parameters<typeof checkAndGrantNewAchievements>[0][] = []

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
    if (completedLevelScore === maxPossibleScoreForLevel) {
      eventsForAchievements.push({
        type: "level_perfect_clear" as const,
        gameKey: achievementGameKey,
        levelId: selectedLevel.id,
        currentLevelScore: completedLevelScore,
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

    let completionRevision = 0
    await completeLearningGameProgressLocallyFirst(newTotalScoreState, {
      persistProgress: (completedTotalScore) =>
        saveProgress(
          completedTotalScore,
          newCompletedLevelsState,
          currentLocalStagesState,
          updatedUserStatsState,
          completionChildId,
          completionLanguageCode,
          { contentRevision: contentProgressRevisionRef.current },
        ),
      revealCompletion: (completedTotalScore) => {
        const owner = progressOwnerRef.current
        if (
          !isMountedRef.current ||
          owner.childId !== completionChildId ||
          owner.languageCode !== completionLanguageCode
        ) {
          return
        }

        completionRevisionRef.current += 1
        completionRevision = completionRevisionRef.current
        setTotalScore(completedTotalScore)
        setCompletedLevels(newCompletedLevelsState)
        setStages(currentLocalStagesState)
        setSelectedStage(
          currentLocalStagesState.find((stage) => stage.id === selectedStage.id) ??
            selectedStage,
        )
        updateUserStatsState(updatedUserStatsState)
        childHaptics.success()
        setGameState("levelComplete")
        gameStartTime.current = Date.now()
      },
      runBestEffortNetworkWork: async (completedTotalScore, persistence) => {
        const achievementWork = async () => {
          const outcomes = await Promise.allSettled(
            eventsForAchievements.map((event) => checkAndGrantNewAchievements(event)),
          )
          const newlyAwarded = new Map<string, AchievementDefinition>()

          outcomes.forEach((outcome) => {
            if (outcome.status === "rejected") {
              console.warn("Could not evaluate a legacy Learning Game achievement:", outcome.reason)
              return
            }

            outcome.value.forEach((achievement) => {
              if (!newlyAwarded.has(achievement.id)) {
                newlyAwarded.set(achievement.id, achievement)
              }
            })
          })

          const awardedAchievements = [...newlyAwarded.values()]
          const owner = progressOwnerRef.current
          if (
            !isMountedRef.current ||
            owner.childId !== completionChildId ||
            owner.languageCode !== completionLanguageCode ||
            completionRevisionRef.current !== completionRevision
          ) {
            return
          }

          awardedAchievements.forEach((achievement) => enqueueAchievementUnlocked(achievement))
        }
        const outcomes = await Promise.allSettled([
          trackActivity(nextStageUnlocked, completedLevelScore),
          achievementWork(),
          syncProgressNow(completionChildId),
          persistence.persisted
            ? recordQualifiedStreakActivity({
                childId: completionChildId,
                sourceType: "game",
                sourceId: `learning-game:${selectedStage.id}:${selectedLevel.id}`,
                completionId: `learning-game:${selectedStage.id}:${selectedLevel.id}:${completionSessionStartedAt}`,
                completedAt: today.toISOString(),
              })
            : Promise.resolve(),
        ])

        outcomes.forEach((outcome) => {
          if (outcome.status === "rejected") {
            console.warn("Could not finish legacy Learning Game best-effort network work:", outcome.reason)
          }
        })
      },
      onLocalError: (error) => {
        console.warn("Legacy Learning completion was not durably saved locally:", error)
      },
      onNetworkError: (error) => {
        console.warn("Could not finish legacy Learning Game best-effort network work:", error)
      },
    })

  }

  // STAGE SELECTION SCREEN
  const renderStageSelectScreen = () => {
    const totalLevelCount = stages.reduce(
      (total, stage) => total + stage.levels.length,
      0,
    )
    const completedLevelCount = stages.reduce(
      (total, stage) =>
        total +
        stage.levels.filter((level) => completedLevels.includes(level.id)).length,
      0,
    )

    return (
      <ImageBackground source={require("@/assets/images/gameBackground.jpg")} className="flex-1 bg-cover">
        <SafeAreaView className="flex-1" edges={[]} style={{ backgroundColor: GAME_SCREEN_OVERLAY }}>
          <StatusBar style="light" translucent backgroundColor="transparent" />

          <View
            className="flex-1"
            style={{
              paddingBottom: compactLandscape ? 10 : 20,
              paddingHorizontal: stageCarouselSizing.screenPadding,
              paddingTop: compactLandscape ? 10 : 24,
            }}
          >
            <View
              className="flex-row items-center justify-between"
              style={{ marginBottom: compactLandscape ? 8 : 16 }}
            >
              <TouchableOpacity
                className="w-12 h-12 rounded-full bg-white justify-center items-center border-2 border-accent-500"
                style={{
                  height: stageCarouselSizing.headerControlSize,
                  width: stageCarouselSizing.headerControlSize,
                }}
                onPress={() => router.back()}
                accessibilityRole="button"
                accessibilityLabel="Back to Games"
              >
                <Ionicons
                  name="arrow-back"
                  size={stageCarouselSizing.isTablet ? 26 : 22}
                  color={brandColors.victoriaBlue}
                />
              </TouchableOpacity>

              <View className="flex-1 px-4">
                <Text
                  variant="bold"
                  className="text-white text-center"
                  style={{ fontSize: stageCarouselSizing.headerTitleFontSize }}
                  numberOfLines={1}
                >
                  {gameTitle}
                </Text>
              </View>

              <View
                accessible
                accessibilityLabel={`${completedLevelCount} of ${totalLevelCount} levels completed`}
                className="flex-row items-center bg-white rounded-full px-4 py-2 border-2 border-accent-500"
              >
                <Ionicons name="checkmark-circle" size={19} color={brandColors.success} />
                <Text variant="bold" className="text-emerald-600 text-base ml-1.5" numberOfLines={1}>
                  {completedLevelCount}/{totalLevelCount}
                </Text>
              </View>
            </View>

            <View
              className="bg-white/15 rounded-2xl px-4"
              style={{
                marginBottom: compactLandscape ? 8 : 16,
                paddingVertical: compactLandscape ? 8 : 12,
              }}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-4">
                  <Text variant="bold" className="text-white text-lg" numberOfLines={1}>
                    Choose a stage
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
                  const statusLabel = stage.isLocked ? t("common.locked") : isCompleted ? t("common.done") : t("common.start")
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
                          <Text
                            variant="bold"
                            className="text-primary-700"
                            style={{ fontSize: stageCarouselSizing.isTablet ? 13 : 11 }}
                            numberOfLines={1}
                          >
                            Stage {stage.id}
                          </Text>
                        </View>
                        <View
                          className="absolute top-2 right-2 bg-white/95 rounded-full items-center justify-center"
                          style={{
                            height: stageCarouselSizing.isTablet ? 44 : 36,
                            width: stageCarouselSizing.isTablet ? 44 : 36,
                          }}
                        >
                          <Ionicons
                            name={statusIcon}
                            size={stageCarouselSizing.statusIconSize}
                            color={statusColor}
                          />
                        </View>
                      </View>

                      <View className="bg-white px-3.5 py-3 justify-between" style={{ height: stageCardBodyHeight }}>
                        <View>
                          <Text
                            variant="bold"
                            className="text-primary-700 leading-5 mb-1"
                            style={{
                              fontSize: stageCarouselSizing.stageTitleFontSize,
                              lineHeight: stageCarouselSizing.isTablet ? 26 : 20,
                            }}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            minimumFontScale={0.86}
                          >
                            {stage.title}
                          </Text>
                        </View>

                        <View className="flex-row items-center justify-between mt-2">
                          <View className="flex-row items-center flex-1 pr-2">
                            <Ionicons
                              name="school-outline"
                              size={stageCarouselSizing.isTablet ? 17 : 14}
                              color={brandColors.victoriaBlue}
                            />
                            <Text
                              variant="medium"
                              className="text-primary-700 ml-1"
                              style={{ fontSize: stageCarouselSizing.isTablet ? 13 : 11 }}
                              numberOfLines={1}
                            >
                              {completedLevelCount}/{stage.levels.length} levels
                            </Text>
                          </View>
                          <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: stage.isLocked ? brandColors.neutral[100] : brandColors.blue[50] }}>
                            <Text
                              variant="bold"
                              style={{
                                color: statusColor,
                                fontSize: stageCarouselSizing.isTablet ? 13 : 11,
                              }}
                              numberOfLines={1}
                            >
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
    const stageForSelection =
      stages.find((stage) => stage.id === selectedStage.id) ?? selectedStage
    const completedInStage = stageForSelection.levels.filter((level) => completedLevels.includes(level.id)).length
    const progressPercent = (completedInStage / stageForSelection.levels.length) * 100

    return (
      <ImageBackground source={require("@/assets/images/gameBackground.jpg")} className="flex-1 bg-cover">
        <SafeAreaView className="flex-1" edges={[]} style={{ backgroundColor: GAME_SCREEN_OVERLAY }}>
          <StatusBar style="light" translucent backgroundColor="transparent" />

          <View
            className="flex-1"
            style={{
              paddingBottom: compactLandscape ? 10 : 20,
              paddingHorizontal: stageCarouselSizing.screenPadding,
              paddingTop: compactLandscape ? 10 : 24,
            }}
          >
            <View
              className="flex-row items-center justify-between"
              style={{ marginBottom: compactLandscape ? 8 : 16 }}
            >
              <TouchableOpacity
                className="w-12 h-12 rounded-full bg-white justify-center items-center border-2 border-accent-500"
                style={{
                  height: stageCarouselSizing.headerControlSize,
                  width: stageCarouselSizing.headerControlSize,
                }}
                onPress={() => setGameState("stageSelect")}
                accessibilityRole="button"
                accessibilityLabel="Back to stages"
              >
                <Ionicons
                  name="arrow-back"
                  size={stageCarouselSizing.isTablet ? 26 : 22}
                  color={brandColors.victoriaBlue}
                />
              </TouchableOpacity>

              <View className="flex-1 px-4">
                <Text
                  variant="bold"
                  className="text-white text-center"
                  style={{ fontSize: stageCarouselSizing.headerTitleFontSize }}
                  numberOfLines={1}
                >
                  {stageForSelection.title}
                </Text>
              </View>

              <View
                accessible
                accessibilityLabel={`${completedInStage} of ${stageForSelection.levels.length} levels completed`}
                className="flex-row items-center bg-white rounded-full px-4 py-2 border-2 border-accent-500"
              >
                <Ionicons name="checkmark-circle" size={19} color={brandColors.success} />
                <Text variant="bold" className="text-emerald-600 text-base ml-1.5" numberOfLines={1}>
                  {completedInStage}/{stageForSelection.levels.length}
                </Text>
              </View>
            </View>

            <View
              className="bg-white/15 rounded-2xl px-4"
              style={{
                marginBottom: compactLandscape ? 8 : 16,
                paddingVertical: compactLandscape ? 8 : 12,
              }}
            >
              <View className="flex-row items-center">
                <View
                  className="bg-white rounded-full w-14 h-14 items-center justify-center mr-4 border-2 border-accent-500"
                  style={{
                    height: stageCarouselSizing.isTablet ? 64 : 56,
                    width: stageCarouselSizing.isTablet ? 64 : 56,
                  }}
                >
                  <CachedImage
                    source={stageForSelection.image as any}
                    fallbackSource={resolveImageSource("learning-beginner.jpg")}
                    style={{
                      height: stageCarouselSizing.isTablet ? 40 : 34,
                      width: stageCarouselSizing.isTablet ? 40 : 34,
                    }}
                    resizeMode="contain"
                    accessibilityLabel={`${stageForSelection.title} picture`}
                  />
                </View>

                <View className="flex-1">
                  <View className="flex-row items-center justify-between">
                    <Text variant="bold" className="text-white text-lg" numberOfLines={1}>
                      Stage {stageForSelection.id}
                    </Text>
                    <Text className="text-white/90 text-xs" numberOfLines={1}>
                      {completedInStage}/{stageForSelection.levels.length} complete
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
                    Pick a level
                  </Text>
                  <Text className="text-white/85 text-xs" numberOfLines={1}>
                    {stageForSelection.levels.length} levels
                  </Text>
                </View>

                <GameLevelSelector
                  availableWidth={Math.max(0, landscapeWidth - 48)}
                  choices={stageForSelection.levels.map((level) => {
                    const isCompleted = completedLevels.includes(level.id)
                    const isCurrent =
                      !isCompleted &&
                      !level.isLocked &&
                      stageForSelection.levels.find(
                        (candidate) =>
                          !candidate.isLocked &&
                          !completedLevels.includes(candidate.id),
                      )?.id === level.id

                    return {
                      id: level.id,
                      meta: `${level.words.length} ${level.words.length === 1 ? "word" : "words"}`,
                      order: level.order,
                      status: level.isLocked
                        ? "locked" as const
                        : isCompleted
                          ? "review" as const
                          : isCurrent
                            ? "current" as const
                            : "available" as const,
                      title: level.title,
                    }
                  })}
                  compact={compactLandscape}
                  containerTestID="learning-game-level-selector"
                  onSelect={(levelId) => {
                    const level = stageForSelection.levels.find(
                      (candidate) => candidate.id === levelId,
                    )
                    if (level) selectLevel(level)
                  }}
                  statusLabels={{
                    available: t("common.start"),
                    current: t("learning.current"),
                    locked: t("common.locked"),
                    review: t("learning.review"),
                  }}
                  testIDPrefix="learning-game-level"
                />
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
        <ComingSoonState
          title="This level is not ready"
          message="There are no learning cards in this level yet. Choose another level while it is being prepared."
          showBackButton={false}
          onRetry={() => setGameState("levelSelect")}
          actionLabel="Choose another level"
          actionAccessibilityLabel="Return to the level list"
        />
      )
    }

    const safeLearningIndex = Math.min(currentLearningIndex, currentWords.length - 1)
    const currentLearnWord = currentWords[safeLearningIndex]
    if (!currentLearnWord) return null
    const replayLearningWord = () => {
      void playWordSound(currentLearnWord).catch((error) => {
        console.warn("Could not play legacy Learning word sound:", error)
      })
    }
    const isFinalWord = currentLearningIndex >= currentWords.length - 1

    return (
      <SafeAreaView className="flex-1" edges={CHILD_GAME_SAFE_AREA_EDGES} style={{ backgroundColor: activityColors.canvas }}>
        <StatusBar style="light" />
        <GameHeader
          appearance="activity"
          title={selectedLevel.title}
          subtitle={selectedStage?.title}
          onBack={() => setGameState("levelSelect")}
          backAccessibilityLabel="Back to levels"
          trailing={<ActivityButton label="Play Game" icon="game-controller-outline" onPress={startGame} />}
        />
        <Animated.View style={{
          flex: 1, minHeight: 0, opacity: fadeAnim,
          paddingHorizontal: learningGameSizing.isTablet ? 24 : 16,
          paddingBottom: compactLandscape ? 8 : 16,
        }}>
          <LearningIllustratedScreen
            progress={`${safeLearningIndex + 1} of ${currentWords.length}`}
            imageSource={(currentLearnWord.image || resolveImageSource("learning-beginner.jpg")) as ImageSourcePropType}
            fallbackSource={resolveImageSource("learning-beginner.jpg")}
            imageLabel={`${currentLearnWord.english} picture`}
            onCardPress={replayLearningWord}
            cardAccessibilityLabel={`Listen to ${currentLearnWord.targetText}`}
            footerAside={
              <ActivityButton
                label="Previous"
                icon="chevron-back"
                tone="secondary"
                disabled={currentLearningIndex === 0}
                onPress={previousLearningWord}
                style={{ alignSelf: "flex-start" }}
              />
            }
            footer={
              <ActivityButton
                label={isFinalWord ? "Start Quiz" : "Next"}
                icon={isFinalWord ? "game-controller-outline" : "chevron-forward"}
                onPress={isFinalWord ? startGame : nextLearningWord}
              />
            }
          >
            {(layout) => (
              <LearningWordContent
                localText={currentLearnWord.targetText}
                englishText={currentLearnWord.english}
                example={currentLearnWord.example}
                exampleTranslation={currentLearnWord.exampleTranslation}
                layout={layout}
              />
            )}
          </LearningIllustratedScreen>
        </Animated.View>
      </SafeAreaView>
    )
  }

  // GAME SCREEN
  const renderGameScreen = () => {
    if (!currentWord) return null

    return (
      <GameTourProvider>
        <SafeAreaView className="flex-1" edges={CHILD_GAME_SAFE_AREA_EDGES} style={{ backgroundColor: activityColors.canvas }}>
          <StatusBar style="light" />
          <GameHeader
            appearance="activity"
            title={`${selectedLevel?.title} Quiz`}
            subtitle={`${currentWordIndex + 1} of ${currentWords.length}`}
            onBack={() => {
              clearGameTimers()
              answerLockRef.current = false
              completionLockRef.current = false
              setGameState("learning")
            }}
            backAccessibilityLabel="Back to word cards"
            onHelp={learningTour.open}
          />
          <TourTarget id="learning-quiz-progress">
            <View style={{ paddingHorizontal: learningGameSizing.isTablet ? 24 : 16, paddingBottom: 10 }}>
              <View style={{ backgroundColor: "rgba(255,255,255,0.3)", borderRadius: 99, height: 8, overflow: "hidden" }}>
                <Animated.View style={{
                  backgroundColor: activityColors.outline,
                  height: "100%",
                  width: progressWidth.interpolate({
                    inputRange: [0, 100],
                    outputRange: ["0%", "100%"],
                  }),
                }} />
              </View>
            </View>
          </TourTarget>
          <Animated.View style={{
            flex: 1, minHeight: 0, opacity: fadeAnim,
            paddingHorizontal: learningGameSizing.isTablet ? 24 : 16,
            paddingBottom: compactLandscape ? 8 : 16,
          }}>
            <LearningQuizBoard
              word={currentWord.targetText}
              correctAnswer={currentWord.english}
              options={options}
              selectedOption={selectedOption}
              isCorrect={isCorrect}
              shakingOption={shakingOption}
              shakeAnimation={shakeAnimation}
              celebrationAnimation={confettiAnim}
              onSelect={handleOptionSelect}
              onReplay={() => {
                void playWordSound().catch((error) => {
                  console.warn("Could not play legacy Learning word sound:", error)
                })
              }}
            />
          </Animated.View>
        <GameTour
          visible={learningTour.visible}
          onDismiss={learningTour.dismiss}
          onUnavailable={learningTour.close}
          onComplete={learningTour.complete}
          steps={[
            { id: "prompt", targetId: "learning-quiz-prompt", icon: "volume-high-outline", placement: "auto", title: "Listen or read", description: "Tap the speaker to hear the phrase." },
            { id: "answers", targetId: "learning-quiz-answers", icon: "list-outline", placement: "auto", title: "Pick an answer", description: "Tap the matching meaning." },
            { id: "progress", targetId: "learning-quiz-progress", icon: "trending-up-outline", placement: "bottom", title: "Quiz progress", description: "This bar shows how much is left." },
          ]}
        />
        </SafeAreaView>
      </GameTourProvider>
    )
  }

  // LEVEL COMPLETION SCREEN
  const renderLevelCompletionScreen = () => {
    if (!selectedStage || !selectedLevel) return null

    const completedStage =
      stages.find((stage) => stage.id === selectedStage.id) ?? selectedStage
    const completedStageIndex = stages.findIndex(
      (stage) => stage.id === completedStage.id,
    )
    const completedLevelIndex = completedStage.levels.findIndex(
      (level) => level.id === selectedLevel.id,
    )
    const nextLevel = completedStage.levels[completedLevelIndex + 1]
    const nextStage = stages[completedStageIndex + 1]
    const canOpenNextLevel = Boolean(nextLevel && !nextLevel.isLocked)
    const canOpenNextStage = Boolean(nextStage && !nextStage.isLocked)
    const primaryActionLabel = canOpenNextLevel
      ? t("learning.nextLevel")
      : canOpenNextStage
        ? t("games.nextStage")
        : t("common.playAgain")

    const handlePrimaryCompletionAction = () => {
      if (canOpenNextLevel && nextLevel) {
        selectLevel(nextLevel)
        return
      }

      if (canOpenNextStage && nextStage) {
        setSelectedStage(nextStage)
        setSelectedLevel(null)
        setGameState("levelSelect")
        gameStartTime.current = Date.now()
        return
      }

      selectLevel(
        completedStage.levels.find((level) => level.id === selectedLevel.id) ??
          selectedLevel,
      )
    }

    return (
      <LinearGradient
        colors={[
          completedStage.color || brandColors.equatorialGold,
          brandColors.victoriaBlue,
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1 }}
      >
        <StatusBar style="light" />

        <SafeAreaView className="flex-1" edges={[]}>
          <View
            pointerEvents="none"
            className="absolute rounded-full bg-white/10"
            style={{ height: 190, left: -48, top: -72, width: 190 }}
          />
          <View
            pointerEvents="none"
            className="absolute rounded-full bg-white/10"
            style={{ bottom: -85, height: 220, right: -54, width: 220 }}
          />

          <View
            className="flex-1 justify-center items-center"
            style={{ padding: compactLandscape ? 16 : 28 }}
          >
            <View
              className="bg-white rounded-3xl border-4 border-white/60 overflow-hidden"
              style={{
                elevation: 10,
                maxHeight: "96%",
                maxWidth: 1040,
                shadowColor: brandColors.black,
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.2,
                shadowRadius: 20,
                width: "100%",
              }}
              testID="learning-game-completion-card"
            >
              <View
                style={{
                  alignItems: "stretch",
                  flexDirection: isLandscape ? "row" : "column",
                  padding: compactLandscape ? 18 : 28,
                }}
              >
                <View
                  className="items-center justify-center"
                  style={{
                    borderRightColor: isLandscape
                      ? brandColors.gold[100]
                      : "transparent",
                    borderRightWidth: isLandscape ? 2 : 0,
                    paddingHorizontal: compactLandscape ? 12 : 22,
                    paddingVertical: compactLandscape ? 4 : 12,
                    width: isLandscape ? "38%" : "100%",
                  }}
                >
                  <View
                    className="rounded-full justify-center items-center border-4 border-accent-500"
                    style={{
                      backgroundColor: brandColors.gold[50],
                      height: compactLandscape ? 68 : 88,
                      width: compactLandscape ? 68 : 88,
                    }}
                  >
                    <Ionicons
                      name="trophy"
                      size={compactLandscape ? 34 : 44}
                      color={brandColors.equatorialGold}
                    />
                  </View>

                  <Text
                    variant="bold"
                    className="text-primary-700 text-center mt-2"
                    style={{
                      fontSize: compactLandscape ? 25 : 34,
                      lineHeight: compactLandscape ? 30 : 40,
                    }}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                  >
                    Level done!
                  </Text>
                  <Text
                    className="text-neutral-600 text-center mt-1"
                    style={{ fontSize: compactLandscape ? 14 : 17 }}
                    numberOfLines={2}
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                  >
                    {`You finished ${selectedLevel.title}!`}
                  </Text>
                </View>

                <View
                  className="justify-center"
                  style={{
                    flex: 1,
                    paddingLeft: isLandscape ? (compactLandscape ? 22 : 34) : 0,
                    paddingTop: isLandscape ? 0 : 18,
                  }}
                >
                  <View
                    className="bg-primary-50 rounded-2xl border-2 border-primary-100 flex-row items-center"
                    style={{
                      minHeight: compactLandscape ? 58 : 70,
                      paddingHorizontal: compactLandscape ? 16 : 20,
                      paddingVertical: 10,
                    }}
                  >
                    <View
                      className="rounded-full bg-white items-center justify-center"
                      style={{
                        height: compactLandscape ? 40 : 48,
                        width: compactLandscape ? 40 : 48,
                      }}
                    >
                      <Ionicons
                        name="chatbubbles"
                        size={compactLandscape ? 22 : 26}
                        color={brandColors.victoriaBlue}
                      />
                    </View>
                    <Text
                      variant="bold"
                      className="text-primary-700 ml-3"
                      style={{ fontSize: compactLandscape ? 17 : 20 }}
                    >
                      {`${currentWords.length} ${currentWords.length === 1 ? "word" : "words"} practiced`}
                    </Text>
                  </View>

                  <View
                    className="flex-row flex-wrap"
                    style={{ gap: 10, marginTop: compactLandscape ? 14 : 20 }}
                  >
                    <TouchableOpacity
                      className="bg-primary-600 rounded-full flex-1 flex-row items-center justify-center"
                      style={{
                        minHeight: compactLandscape ? 52 : 58,
                        minWidth: 170,
                        paddingHorizontal: 22,
                      }}
                      onPress={handlePrimaryCompletionAction}
                      accessibilityRole="button"
                      accessibilityLabel={primaryActionLabel}
                    >
                      <Text
                        variant="bold"
                        className="text-white mr-2"
                        style={{ fontSize: compactLandscape ? 17 : 19 }}
                        numberOfLines={1}
                      >
                        {primaryActionLabel}
                      </Text>
                      <Ionicons
                        name={canOpenNextStage ? "flag" : canOpenNextLevel ? "arrow-forward" : "refresh"}
                        size={20}
                        color={brandColors.white}
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      className="bg-white rounded-full border-2 border-primary-600 flex-1 flex-row items-center justify-center"
                      style={{
                        minHeight: compactLandscape ? 52 : 58,
                        minWidth: 170,
                        paddingHorizontal: 20,
                      }}
                      onPress={() => {
                        setSelectedStage(completedStage)
                        setGameState("levelSelect")
                        gameStartTime.current = Date.now()
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={t("learning.chooseLevel")}
                    >
                      <Ionicons
                        name="grid-outline"
                        size={20}
                        color={brandColors.victoriaBlue}
                      />
                      <Text
                        variant="bold"
                        className="text-primary-700 ml-2"
                        style={{ fontSize: compactLandscape ? 17 : 19 }}
                        numberOfLines={1}
                      >
                        {t("learning.chooseLevel")}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>
    )
  }

  // Loading screen
  if (isLoading) {
    return (
      <ChildLoadingState
        title={t("games.gettingWordsReady")}
        message={t("games.loadingGame")}
        icon="school-outline"
      />
    )
  }

  if (stages.length === 0) {
    return (
      <ComingSoonState
        title={t("games.learningComingSoon")}
        onRetry={() => setContentRetrySequence((current) => current + 1)}
      />
    )
  }

  // Main render function that switches between game states
  switch (gameState) {
    case "stageSelect":
      return renderStageSelectScreen()
    case "levelSelect":
      return renderLevelSelectScreen()
    case "learning":
      return renderLearningScreen()
    case "playing":
      return renderGameScreen()
    case "levelComplete":
      return renderLevelCompletionScreen()
    default:
      return renderStageSelectScreen()
  }
}

export default LugandaLearningGame
