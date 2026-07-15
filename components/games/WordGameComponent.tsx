import React, { useState, useEffect, useRef } from "react";
import {
  View,
  TouchableOpacity,
  Image,
  Animated,
  Modal,
  type ModalProps,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import type { Audio } from "expo-av";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/StyledText";
import { ComingSoonState } from "@/components/child/ComingSoonState";
import { CachedImage } from "@/components/common/CachedImage";
import { useChild } from "@/context/ChildContext"; // Import useChild context
import { brandColors } from "@/constants/Brand";
import { DEFAULT_LEARNING_LANGUAGE_CODE } from "@/content/languages";
import {
  loadContentBundle,
  resolveImageSource,
  type WordGameLevel,
} from "@/content/contentRepository";
import { preloadContentBundleImages } from "@/content/imagePreloader";
import { saveActivity } from "@/lib/utils"; // Import saveActivity function
import { syncProgressNow } from "@/lib/progressRepository";
import {
  completeLocallyFirst,
  runCompletionOnce,
  type LocalFirstCompletionResult,
} from "@/lib/completionReliability";
import {
  WordGameProgress,
  DEFAULT_PROGRESS,
  loadGameProgress,
  saveGameProgress,
  updateProgressForLevelCompletion,
  isLevelUnlocked
} from './utils/progressManagerWordGame';
import { useAchievements } from "./achievements/useAchievements"; 
import type { AchievementDefinition } from "./achievements/achievementTypes";
import { audioManager } from "@/lib/audioManager";
import { useChildNotice } from "@/context/ChildNoticeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getWordGameSizing } from "./responsiveSizing";

const WORD_GAME_MODAL_ORIENTATIONS: ModalProps["supportedOrientations"] = ["landscape-left", "landscape-right"];

interface WordCompletionOrderOptions {
  persistProgress: (progress: WordGameProgress) => Promise<void>;
  revealCompletion: (progress: WordGameProgress) => void;
  runBestEffortNetworkWork: (progress: WordGameProgress) => Promise<void>;
  onLocalError?: (error: unknown) => void;
  onNetworkError?: (error: unknown) => void;
}

const completeWordProgressLocallyFirst = (
  completedProgress: WordGameProgress,
  options: WordCompletionOrderOptions,
): Promise<LocalFirstCompletionResult<WordGameProgress>> =>
  completeLocallyFirst({
    persistLocal: async () => {
      await options.persistProgress(completedProgress);
      return completedProgress;
    },
    fallbackValue: completedProgress,
    revealCompletion: (progress) => options.revealCompletion(progress),
    runBestEffortNetworkWork: (progress) => options.runBestEffortNetworkWork(progress),
    onLocalError: options.onLocalError,
    onNetworkError: options.onNetworkError,
  });

// Define types for the component's state and props
type LetterPosition = {
  letter: string;
  index: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  width: number;
  height: number;
  destWidth: number;
  destHeight: number;
};

const getImageSource = (imageName: string | undefined) => {
  return resolveImageSource(imageName, "coin.png") as any;
};

const WordGame: React.FC = () => {
  // Add child context
  const { activeChild } = useChild();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const wordGameSizing = getWordGameSizing(windowWidth, windowHeight);
  const languageCode = activeChild?.selected_language_code || DEFAULT_LEARNING_LANGUAGE_CODE;
  const { 
    isLoadingAchievements, 
    checkAndGrantNewAchievements 
  } = useAchievements(activeChild?.id, 'word_game'); // Game key
  const { enqueueAchievementUnlocked } = useChildNotice();

  const [hintUsedCurrentLevel, setHintUsedCurrentLevel] = useState<boolean>(false); // For no-hint achievement
  const [consecutiveWins, setConsecutiveWins] = useState<number>(0);
  
  // Add state to track level start time
  const levelStartTime = useRef<number>(Date.now());
  
  // State variables
  const [currentLevelIndex, setCurrentLevelIndex] = useState<number>(0);
  const [gameLevels, setGameLevels] = useState<WordGameLevel[]>([]);
  const [currentWord, setCurrentWord] = useState<string>("");
  const [displayWord, setDisplayWord] = useState<string>("");
  const [currentQuestion, setCurrentQuestion] = useState<string>("");
  const [letters, setLetters] = useState<string[]>([]);
  const [selectedLetters, setSelectedLetters] = useState<string[]>([]);
  const [correctSound, setCorrectSound] = useState<Audio.Sound | undefined>();
  const [wrongSound, setWrongSound] = useState<Audio.Sound | undefined>();
  const [successSound, setSuccessSound] = useState<Audio.Sound | undefined>();
  const [animatingLetter, setAnimatingLetter] = useState<LetterPosition | null>(
    null
  );
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [isGameCompleted, setIsGameCompleted] = useState<boolean>(false);
  const [showLevelIntroModal, setShowLevelIntroModal] = useState<boolean>(false);
  const [showHintModal, setShowHintModal] = useState<boolean>(false);
  const [showSubHint, setShowSubHint] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [contentRetrySequence, setContentRetrySequence] = useState(0);
  const [progress, setProgress] = useState<WordGameProgress>(DEFAULT_PROGRESS);
  const progressRef = useRef<WordGameProgress>(DEFAULT_PROGRESS);
  const progressRevisionRef = useRef(0);
  const progressOwnerRef = useRef({
    childId: activeChild?.id,
    languageCode,
  });
  const isMountedRef = useRef(false);
  const hydrationGenerationRef = useRef(0);
  const completionLockRef = useRef<Promise<void> | null>(null);
  const [showLevelSelect, setShowLevelSelect] = useState<boolean>(false);
  const [fadeAnim] = useState(new Animated.Value(1));
  const levelIntroTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bounceResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  progressOwnerRef.current = {
    childId: activeChild?.id,
    languageCode,
  };

  const updateProgressState = (nextProgress: WordGameProgress): number => {
    progressRef.current = nextProgress;
    progressRevisionRef.current += 1;
    setProgress(nextProgress);
    return progressRevisionRef.current;
  };

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      hydrationGenerationRef.current += 1;
      if (levelIntroTimeoutRef.current) {
        clearTimeout(levelIntroTimeoutRef.current);
        levelIntroTimeoutRef.current = null;
      }
      if (bounceResetTimeoutRef.current) {
        clearTimeout(bounceResetTimeoutRef.current);
        bounceResetTimeoutRef.current = null;
      }
    };
  }, []);

  // Animation values
  const letterScale = useState(new Animated.Value(1))[0];
  const bounceValue = useState(new Animated.Value(0))[0];

  // For letter flying animation
  const flyingLetterPosition = useRef(
    new Animated.ValueXY({ x: 0, y: 0 })
  ).current;
  const flyingLetterOpacity = useRef(new Animated.Value(0)).current;
  const flyingLetterScale = useRef(new Animated.Value(1)).current;

  // References to measure positions
  const letterRefs = useRef<{ [key: number]: View | null }>({});
  const wordSlotRefs = useRef<{ [key: number]: View | null }>({});
  const containerRef = useRef<View | null>(null);

  const router = useRouter();

  // Function to generate random letters for choices
  const generateLetterChoices = (word: string): string[] => {
    // Remove the first letter which is always given
    const wordLetters = word.slice(1).split("");

    // Create array of unique letters from the word
    const uniqueLetters = Array.from(new Set(wordLetters));

    // Add some random letters to make it challenging
    const alphabetLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    const remainingCount = 10 - uniqueLetters.length;

    // Filter out letters that are already in uniqueLetters
    const availableLetters = alphabetLetters.filter(
      (letter) => !uniqueLetters.includes(letter)
    );

    // Randomly select remaining letters
    const randomLetters = [];
    for (let i = 0; i < remainingCount && availableLetters.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * availableLetters.length);
      randomLetters.push(availableLetters[randomIndex]);
      availableLetters.splice(randomIndex, 1);
    }

    // Combine and shuffle
    const allLetters = [...uniqueLetters, ...randomLetters];
    return allLetters.sort(() => Math.random() - 0.5);
  };

  // Modified loadLevel to track level start time
  const loadLevel = (levelIndex: number, levels: WordGameLevel[] = gameLevels) => {
    if (levels.length === 0) {
      return;
    }

    if (levelIndex >= levels.length) {
      setCurrentLevelIndex(levels.length - 1);
      setIsGameCompleted(true);
      void trackGameCompletion().catch((error) => {
        console.warn("Could not track Word Game completion:", error);
      });
      return;
    }

    const safeLevelIndex = Math.max(0, levelIndex);

    // Reset the level start time when loading a new level
    levelStartTime.current = Date.now();

    const level = levels[safeLevelIndex];
    const word = level.word;
    const firstLetter = level.firstLetter || word[0];

    // Create display word with first letter shown
    let initialDisplay = firstLetter;
    for (let i = 1; i < word.length; i++) {
      initialDisplay += "_";
    }

    setCurrentWord(word);
    setDisplayWord(initialDisplay);
    setCurrentQuestion(level.question);
    setLetters(generateLetterChoices(word));
    setSelectedLetters([]);
    setCurrentLevelIndex(safeLevelIndex);

    // Reset refs
    letterRefs.current = {};
    wordSlotRefs.current = {};

    if (levelIntroTimeoutRef.current) {
      clearTimeout(levelIntroTimeoutRef.current);
    }

    levelIntroTimeoutRef.current = setTimeout(() => {
      levelIntroTimeoutRef.current = null;
      if (isMountedRef.current) {
        setShowLevelIntroModal(true);
      }
    }, 250);

  };

  // Function to handle level selection from the level select modal
  const selectLevel = (levelIndex: number) => {
    if (isLevelUnlocked(progress, levelIndex, gameLevels[levelIndex]?.id)) {
      // Update the current level in progress
      if (activeChild) {
        const updatedProgress = {
          ...progress,
          currentLevel: levelIndex,
          currentLevelId: gameLevels[levelIndex]?.id,
        };
        updateProgressState(updatedProgress);
        void saveGameProgress(updatedProgress, activeChild.id, languageCode, {
          levels: gameLevels,
        }).catch((error) => {
          console.warn("Could not save Word Game level selection:", error);
        });
      }
      
      setCurrentLevelIndex(levelIndex);
      setShowLevelSelect(false);
      loadLevel(levelIndex);
    }
  };

  // Function to track level completion
  const trackLevelCompletion = async () => {
    if (!activeChild) return;

    const duration = Date.now() - levelStartTime.current; // Duration in milliseconds

    const saved = await saveActivity({
      child_id: activeChild.id,
      activity_type: "words", // Using 'words' activity type
      activity_name: `Word Game Level ${currentLevelIndex + 1}`,
      score: "100%", // They completed the word successfully
      duration: duration,
      completed_at: new Date().toISOString(),
      details: `Completed word: "${currentWord}" - ${currentQuestion}`,
      level: currentLevelIndex + 1,
      language_code: languageCode,
    });
    if (!saved) {
      throw new Error("Could not save Word Game level activity.");
    }
  };

  // Function to track game completion
  const trackGameCompletion = async () => {
    if (!activeChild) return;

    const saved = await saveActivity({
      child_id: activeChild.id,
      activity_type: "words",
      activity_name: "Word Game Completed",
      score: `${currentLevelIndex + 1}/${gameLevels.length}`,
      completed_at: new Date().toISOString(),
      details: `Completed all ${gameLevels.length} words in the Word Game`,
      language_code: languageCode,
    });
    if (!saved) {
      throw new Error("Could not save Word Game completion activity.");
    }
  };

  // Persist the completed level before any Supabase-backed activity or achievement work.
  const performNextLevelCompletion = async (): Promise<void> => {
    const completionChildId = activeChild?.id;
    const completionLanguageCode = languageCode;
    const nextLevelIdx = currentLevelIndex + 1;
    const isLastLevel = nextLevelIdx >= gameLevels.length;
    const nextCurrentLevel = Math.min(nextLevelIdx, Math.max(0, gameLevels.length - 1));
    const currentConsecutiveWins = consecutiveWins + 1;
    const progressAtCompletion = progressRef.current;
    const progressAfterLevel = updateProgressForLevelCompletion(
      {
        ...progressAtCompletion,
        unlockedLevels: [...progressAtCompletion.unlockedLevels],
        completedLevels: [...progressAtCompletion.completedLevels],
        playHistory: [...progressAtCompletion.playHistory],
      },
      currentLevelIndex,
      currentWord,
      gameLevels,
      completionChildId,
    );
    const completedProgress: WordGameProgress = {
      ...progressAfterLevel,
      currentLevel: nextCurrentLevel,
      currentLevelId: gameLevels[nextCurrentLevel]?.id,
    };

    const revealCompletion = (savedProgress: WordGameProgress): number => {
      const owner = progressOwnerRef.current;
      if (
        !isMountedRef.current ||
        owner.childId !== completionChildId ||
        owner.languageCode !== completionLanguageCode
      ) {
        return 0;
      }

      const revision = updateProgressState(savedProgress);
      setConsecutiveWins(currentConsecutiveWins);
      setShowSuccessModal(false);
      setSelectedLetters([]);
      setHintUsedCurrentLevel(false);

      if (isLastLevel) {
        setIsGameCompleted(true);
      } else {
        setCurrentLevelIndex(nextLevelIdx);
        loadLevel(nextLevelIdx);
      }

      return revision;
    };

    if (!completionChildId) {
      revealCompletion(completedProgress);
      return;
    }

    let completionRevision = 0;
    const achievementEvents: Parameters<typeof checkAndGrantNewAchievements>[0][] = [
      {
        type: "word_game_level_just_completed",
        gameKey: "word_game",
        levelIndex: currentLevelIndex,
        wordGameProgress: completedProgress,
        hintUsedThisLevel: hintUsedCurrentLevel,
      },
      {
        type: "word_game_stats_updated",
        gameKey: "word_game",
        wordGameProgress: completedProgress,
      },
    ];

    if (currentConsecutiveWins >= 3) {
      achievementEvents.push({
        type: "word_game_level_just_completed",
        gameKey: "word_game",
        levelIndex: currentLevelIndex,
        consecutiveLevelsCompleted: currentConsecutiveWins,
        wordGameProgress: completedProgress,
      });
    }

    if (isLastLevel) {
      achievementEvents.push({
        type: "game_completed",
        gameKey: "word_game",
        wordGameProgress: completedProgress,
        allLevelsInGameCount: gameLevels.length,
      });
    }

    await completeWordProgressLocallyFirst(completedProgress, {
      persistProgress: (nextProgress) =>
        saveGameProgress(nextProgress, completionChildId, completionLanguageCode, {
          levels: gameLevels,
        }),
      revealCompletion: (savedProgress) => {
        completionRevision = revealCompletion(savedProgress);
      },
      runBestEffortNetworkWork: async (savedProgress) => {
        const achievementWork = async () => {
          const outcomes = await Promise.allSettled(
            achievementEvents.map((event) => checkAndGrantNewAchievements(event)),
          );
          const newlyAwarded = new Map<string, AchievementDefinition>();

          outcomes.forEach((outcome) => {
            if (outcome.status === "rejected") {
              console.warn("Could not evaluate a Word Game achievement:", outcome.reason);
              return;
            }

            outcome.value.forEach((achievement) => {
              if (!newlyAwarded.has(achievement.id)) {
                newlyAwarded.set(achievement.id, achievement);
              }
            });
          });

          const awardedAchievements = [...newlyAwarded.values()];
          const achievementPoints = awardedAchievements.reduce(
            (total, achievement) => total + achievement.points,
            0,
          );
          const owner = progressOwnerRef.current;
          if (
            !isMountedRef.current ||
            owner.childId !== completionChildId ||
            owner.languageCode !== completionLanguageCode ||
            progressRevisionRef.current !== completionRevision ||
            progressRef.current !== savedProgress
          ) {
            return;
          }

          awardedAchievements.forEach((achievement) => enqueueAchievementUnlocked(achievement));
          if (achievementPoints <= 0) return;

          const progressWithAchievementPoints = {
            ...savedProgress,
            totalScore: savedProgress.totalScore + achievementPoints,
          };
          updateProgressState(progressWithAchievementPoints);
          await saveGameProgress(
            progressWithAchievementPoints,
            completionChildId,
            completionLanguageCode,
            { levels: gameLevels },
          );
        };
        const networkTasks: Promise<unknown>[] = [
          trackLevelCompletion(),
          achievementWork(),
          syncProgressNow(completionChildId),
        ];
        if (isLastLevel) {
          networkTasks.push(trackGameCompletion());
        }

        const outcomes = await Promise.allSettled(networkTasks);
        outcomes.forEach((outcome) => {
          if (outcome.status === "rejected") {
            console.warn("Could not finish Word Game best-effort network work:", outcome.reason);
          }
        });
      },
      onLocalError: (error) => {
        console.warn("Word Game completion was not durably saved locally:", error);
      },
      onNetworkError: (error) => {
        console.warn("Could not finish Word Game best-effort network work:", error);
      },
    });
  };

  const goToNextLevel = (): Promise<void> =>
    runCompletionOnce(completionLockRef, performNextLevelCompletion);

  // Load game sounds on mount.
  useEffect(() => {
    const loadedSounds: Audio.Sound[] = [];

    // Load sounds
    async function loadSounds() {
      try {
        // Add error handling for each sound file
        try {
          const correctSoundObject = await audioManager.createAppSound(
            require("@/assets/sounds/correct.mp3")
          );
          if (correctSoundObject) {
            loadedSounds.push(correctSoundObject);
            if (isMountedRef.current) {
              setCorrectSound(correctSoundObject);
            } else {
              void audioManager.unloadAppSound(correctSoundObject).catch((error) => {
                console.warn("Could not unload late Word Game sound:", error);
              });
            }
          }
        } catch (error) {
          console.log("Could not load correct sound:", error);
        }

        try {
          const wrongSoundObject = await audioManager.createAppSound(
            require("@/assets/sounds/wrong.mp3")
          );
          if (wrongSoundObject) {
            loadedSounds.push(wrongSoundObject);
            if (isMountedRef.current) {
              setWrongSound(wrongSoundObject);
            } else {
              void audioManager.unloadAppSound(wrongSoundObject).catch((error) => {
                console.warn("Could not unload late Word Game sound:", error);
              });
            }
          }
        } catch (error) {
          console.log("Could not load wrong sound:", error);
        }

        try {
          const successSoundObject = await audioManager.createAppSound(
            require("@/assets/sounds/correct.mp3")
          );
          if (successSoundObject) {
            loadedSounds.push(successSoundObject);
            if (isMountedRef.current) {
              setSuccessSound(successSoundObject);
            } else {
              void audioManager.unloadAppSound(successSoundObject).catch((error) => {
                console.warn("Could not unload late Word Game sound:", error);
              });
            }
          }
        } catch (error) {
          console.log("Could not load success sound:", error);
        }
      } catch (error) {
        console.error("Error in sound loading process", error);
      }
    }

    // Initialize level start time
    levelStartTime.current = Date.now();

    void loadSounds().catch((error) => {
      console.warn("Could not finish loading Word Game sounds:", error);
    });

    return () => {
      if (levelIntroTimeoutRef.current) {
        clearTimeout(levelIntroTimeoutRef.current);
      }
      loadedSounds.forEach((loadedSound) => {
        void audioManager.unloadAppSound(loadedSound).catch((error) => {
          console.warn("Could not unload Word Game sound:", error);
        });
      });
    };
  }, []);

  // This useEffect will load the saved progress when the component mounts
  useEffect(() => {
    const requestGeneration = ++hydrationGenerationRef.current;
    const requestedChildId = activeChild?.id;
    const requestedLanguageCode = languageCode;
    completionLockRef.current = null;
    const isCurrentRequest = (): boolean => {
      const owner = progressOwnerRef.current;
      return (
        isMountedRef.current &&
        hydrationGenerationRef.current === requestGeneration &&
        owner.childId === requestedChildId &&
        owner.languageCode === requestedLanguageCode
      );
    };

    const loadSavedProgress = async () => {
      try {
        // Reset all game-related state when child changes
        setIsLoading(true);
        setShowSuccessModal(false);
        setIsGameCompleted(false);
        setShowLevelIntroModal(false);
        setShowHintModal(false);
        setShowSubHint(false);
        setSelectedLetters([]);

        const contentResult = await loadContentBundle(requestedLanguageCode, {
          forceRefresh: contentRetrySequence > 0,
        });
        const levels = contentResult.bundle?.wordGame.levels ?? [];
        if (contentResult.bundle) {
          void preloadContentBundleImages(contentResult.bundle).catch((error) => {
            console.warn("Could not preload Word Game images:", error);
          });
        }

        if (!isCurrentRequest()) return;

        setGameLevels(levels);

        if (levels.length === 0) {
          return;
        }

        let levelToLoad = 0;

        if (requestedChildId) {
          try {
            console.log(`Loading word game progress for child: ${requestedChildId}`);
            const savedProgress = await loadGameProgress(
              requestedChildId,
              requestedLanguageCode,
              levels,
            );
            if (!isCurrentRequest()) return;

            console.log('Loaded progress:', JSON.stringify(savedProgress));
            updateProgressState(savedProgress);
            levelToLoad = savedProgress.currentLevel;
          } catch (error) {
            console.error("Error loading progress:", error);
            if (!isCurrentRequest()) return;
            updateProgressState({ ...DEFAULT_PROGRESS, childId: requestedChildId });
          }
        } else {
          updateProgressState(DEFAULT_PROGRESS);
        }

        const safeLevelToLoad = Math.min(Math.max(levelToLoad, 0), levels.length - 1);
        if (!isCurrentRequest()) return;

        console.log(`Loading level: ${safeLevelToLoad}`);
        loadLevel(safeLevelToLoad, levels);

        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      } catch (error) {
        console.error("Error loading word game:", error);
        if (isCurrentRequest()) {
          setGameLevels([]);
        }
      } finally {
        if (isCurrentRequest()) {
          setIsLoading(false);
        }
      }
    };

    void loadSavedProgress().catch((error) => {
      console.warn("Could not finish Word Game hydration:", error);
    });

    return () => {
      if (hydrationGenerationRef.current === requestGeneration) {
        hydrationGenerationRef.current += 1;
      }
      completionLockRef.current = null;
      if (levelIntroTimeoutRef.current) {
        clearTimeout(levelIntroTimeoutRef.current);
        levelIntroTimeoutRef.current = null;
      }
    };
  }, [activeChild?.id, languageCode, contentRetrySequence]);

  // Move to next level
  const animateLetterToWord = (
    letter: string,
    letterIndex: number,
    destinationIndex: number
  ) => {
    const letterRef = letterRefs.current[letterIndex];
    const wordRef = wordSlotRefs.current[destinationIndex];

    if (!letterRef || !wordRef || !containerRef.current) return;

    letterRef.measureLayout(
      containerRef.current,
      (letterX, letterY, letterWidth, letterHeight) => {
        wordRef?.measureLayout(
          containerRef.current!,
          (wordX, wordY, wordWidth, wordHeight) => {
            setAnimatingLetter({
              letter,
              index: destinationIndex,
              startX: letterX,
              startY: letterY,
              endX: wordX,
              endY: wordY,
              width: letterWidth,
              height: letterHeight,
              destWidth: wordWidth,
              destHeight: wordHeight,
            });

            flyingLetterOpacity.setValue(1);
            flyingLetterPosition.setValue({ x: 0, y: 0 });

            Animated.parallel([
              Animated.timing(flyingLetterPosition.x, {
                toValue: wordX - letterX + (wordWidth - letterWidth) / 2,
                duration: 600,
                useNativeDriver: true,
              }),
              Animated.timing(flyingLetterPosition.y, {
                toValue: wordY - letterY + (wordHeight - letterHeight) / 2,
                duration: 600,
                useNativeDriver: true,
              }),
              Animated.sequence([
                Animated.timing(flyingLetterScale, {
                  toValue: 1.2,
                  duration: 300,
                  useNativeDriver: true,
                }),
                Animated.timing(flyingLetterScale, {
                  toValue: 1,
                  duration: 300,
                  useNativeDriver: true,
                }),
              ]),
            ]).start(() => {
              if (!isMountedRef.current) return;
              flyingLetterOpacity.setValue(0);
              setAnimatingLetter(null);

              updateDisplayWord(letter, destinationIndex);
            });
          },
          () => console.error("Failed to measure word slot")
        );
      },
      () => console.error("Failed to measure letter")
    );
  };

  const updateDisplayWord = (letter: string, letterPosition: number) => {
    let newDisplay = "";
    for (let i = 0; i < currentWord.length; i++) {
      if (i === letterPosition || displayWord[i] !== "_") {
        newDisplay += currentWord[i];
      } else {
        newDisplay += "_";
      }
    }

    setDisplayWord(newDisplay);

    // Check if word is complete
    if (!newDisplay.includes("_")) {
      completionLockRef.current = null;

      // Play success sound
      if (successSound) {
        void audioManager.replayAppSound(successSound).catch((error) => {
          console.warn("Could not replay Word Game success sound:", error);
        });
      }

      // Animate word bounce
      Animated.spring(bounceValue, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }).start(() => {
        if (!isMountedRef.current) return;
        setShowSuccessModal(true);
        if (bounceResetTimeoutRef.current) {
          clearTimeout(bounceResetTimeoutRef.current);
        }
        bounceResetTimeoutRef.current = setTimeout(() => {
          bounceResetTimeoutRef.current = null;
          if (!isMountedRef.current) return;
          bounceValue.setValue(0);
        }, 1000);
      });
    }
  };

  const handleLetterPress = (letter: string, letterIndex: number) => {
    Animated.sequence([
      Animated.timing(letterScale, {
        toValue: 1.2,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(letterScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    if (currentWord.includes(letter)) {
      // Count remaining occurrences of this letter that still need to be filled
      let remainingOccurrences = 0;
      for (let i = 0; i < currentWord.length; i++) {
        if (currentWord[i] === letter && displayWord[i] === "_") {
          remainingOccurrences++;
        }
      }

      if (remainingOccurrences > 0) {
        if (correctSound) {
          void audioManager.replayAppSound(correctSound).catch((error) => {
            console.warn("Could not replay Word Game correct sound:", error);
          });
        }

        // Only add to selectedLetters if all occurrences are now filled
        if (remainingOccurrences === 1) {
          const newSelectedLetters = [...selectedLetters, letter];
          setSelectedLetters(newSelectedLetters);
        }

        const positions = [];
        for (let i = 0; i < currentWord.length; i++) {
          if (currentWord[i] === letter && displayWord[i] === "_") {
            positions.push(i);
            break; // Just get the first unfilled position
          }
        }

        if (positions.length > 0) {
          animateLetterToWord(letter, letterIndex, positions[0]);
        }
      } else {
        if (wrongSound) {
          void audioManager.replayAppSound(wrongSound).catch((error) => {
            console.warn("Could not replay Word Game wrong sound:", error);
          });
        }
      }
    } else {
      if (wrongSound) {
        void audioManager.replayAppSound(wrongSound).catch((error) => {
          console.warn("Could not replay Word Game wrong sound:", error);
        });
      }
    }
  };

  // Modified layout for landscape orientation with NativeWind styling
  if (isLoading) {
    return (
      <View className="flex-1 bg-primary-50 justify-center items-center">
        <StatusBar style="dark" translucent backgroundColor="transparent" />
        <ActivityIndicator size="large" color="#7b5af0" />
        <Text variant="medium" className="text-primary-700 mt-4">Loading your progress...</Text>
      </View>
    );
  }

  if (gameLevels.length === 0) {
    return (
      <ComingSoonState
        title="Word game coming soon"
        onRetry={() => setContentRetrySequence((current) => current + 1)}
      />
    );
  }

  const currentLevel = gameLevels[currentLevelIndex] ?? gameLevels[0];

  return (
    <View
      ref={containerRef}
      className="flex-1 bg-blue-50"
      style={{ paddingLeft: insets.left, paddingRight: insets.right }}
    >
      <StatusBar style="dark" translucent backgroundColor="transparent" />
      {/* Top navigation bar with all elements aligned horizontally */}
      <View className="flex-row justify-between items-center px-5 pt-6 pb-2">
        {/* Back button */}
        <TouchableOpacity
          className="w-12 h-12 rounded-full bg-white items-center justify-center shadow-md border-2 border-primary-200"
          onPress={() => router.back()}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Back to Games"
        >
          <Ionicons name="arrow-back" size={22} color="#7b5af0" />
        </TouchableOpacity>

        {/* Question text in the middle */}
        <View className="flex-1 mx-3 bg-white px-4 py-2 rounded-2xl shadow-md border-2 border-blue-100">
          <Text
            variant="medium"
            className="text-primary-700 text-center"
            style={{
              fontSize: wordGameSizing.titleFontSize,
              lineHeight: wordGameSizing.titleLineHeight,
            }}
            numberOfLines={2}
          >
            {currentQuestion}
          </Text>
        </View>

        {/* Level navigation controls */}
        <View className="flex-row items-center">
          {/* Level selector button */}
          <TouchableOpacity
            className="w-11 h-11 rounded-full bg-white items-center justify-center shadow-md border-2 border-accent-200 mr-2"
            onPress={() => setShowLevelSelect(true)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Choose word game level"
          >
            <Ionicons name="list" size={22} color="#7b5af0" />
          </TouchableOpacity>
          
          {/* Level indicator */}
          <View className="flex-row items-center bg-white px-3 py-1.5 rounded-full shadow-md border-2 border-primary-200">
            <Text variant="bold" className="text-primary-700">
              {Math.min(currentLevelIndex + 1, gameLevels.length)}/{gameLevels.length}
            </Text>
          </View>
        </View>
      </View>


      {/* Main content area */}
      <View className="flex-1 flex-row justify-between items-center px-4 pb-3 pt-1">
        {/* Left character */}
        <View className="w-[15%] items-center justify-center">
          <View className="w-24 h-24 bg-white rounded-3xl items-center justify-center shadow-lg border-4 border-secondary-200 overflow-hidden">
            <CachedImage
              source={getImageSource(currentLevel.image)}
              fallbackSource={resolveImageSource("coin.png")}
              className="w-full h-full"
              resizeMode="cover"
              accessibilityLabel={`${currentLevel.question} picture`}
            />
          </View>
        </View>

        {/* Center game area */}
        <View className="w-[70%] items-center justify-center">
          {/* Word to guess */}
          <Animated.View
            className="flex-row flex-wrap items-center justify-center py-2 px-3 bg-white rounded-3xl shadow-md mb-3 border-2 border-primary-100 max-w-full"
            style={{
              transform: [
                {
                  scale: bounceValue.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [1, 1.2, 1],
                  }),
                },
              ],
            }}
          >
            {displayWord.split("").map((char, index) => (
              <View
                key={index}
                ref={(ref) => { wordSlotRefs.current[index] = ref; }}
                className="justify-center items-center relative"
                style={{
                  height: wordGameSizing.answerSlotHeight,
                  margin: wordGameSizing.answerSlotMargin,
                  width: wordGameSizing.answerSlotWidth,
                }}
              >
                <Text
                  variant="bold"
                  className="text-primary-700"
                  style={{
                    fontSize: wordGameSizing.answerLetterFontSize,
                    lineHeight: wordGameSizing.answerLetterLineHeight,
                  }}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.75}
                >
                  {char !== "_" ? char : ""}
                </Text>
                {char === "_" && (
                  <View
                    className="absolute bottom-0 h-1.5 bg-primary-500 rounded-full"
                    style={{ width: wordGameSizing.answerSlotWidth * 0.82 }}
                  />
                )}
              </View>
            ))}
          </Animated.View>

          {/* Letter choices */}
          <View className="flex-row flex-wrap justify-center w-full pb-2">
            {letters.map((letter, index) => {
              // Check if this letter still has any unfilled positions in the word
              const hasUnfilledPositions = currentWord
                .split("")
                .some((char, i) => char === letter && displayWord[i] === "_");

              // A letter is disabled only if it doesn't appear in the word OR has no unfilled positions left
              const isDisabled =
                !currentWord.includes(letter) || !hasUnfilledPositions;

              // A letter is greyed out if it's disabled
              const isGreyedOut = isDisabled && currentWord.includes(letter);

              return (
                <TouchableOpacity
                  key={index}
                  ref={(ref) => {
                    letterRefs.current[index] = ref;
                  }}
                  className={`rounded-full justify-center items-center shadow-lg border-2 ${
                    isGreyedOut
                      ? "bg-gray-300 border-gray-400 opacity-70"
                      : "bg-secondary-500 border-secondary-300"
                  }`}
                  style={{
                    height: wordGameSizing.choiceButtonSize,
                    margin: wordGameSizing.choiceButtonMargin,
                    width: wordGameSizing.choiceButtonSize,
                  }}
                  onPress={() => handleLetterPress(letter, index)}
                  disabled={isDisabled}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={`Letter ${letter}`}
                  accessibilityState={{ disabled: isDisabled }}
                >
                  <Text
                    variant="bold"
                    className="text-white"
                    style={{
                      fontSize: wordGameSizing.choiceLetterFontSize,
                      lineHeight: wordGameSizing.choiceLetterLineHeight,
                    }}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.75}
                  >
                    {letter}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Right hint button */}
        <View className="w-[15%] items-center justify-center">
          <TouchableOpacity 
            className="w-16 h-16 bg-white rounded-full justify-center items-center shadow-lg border-4 border-accent-200"
            onPress={() => setShowHintModal(true)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Show hint"
          >
            <Image
              source={require("@/assets/images/info.png")}
              className="w-12 h-12 rounded-full"
              resizeMode="cover"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Flying letter animation */}
      {animatingLetter && (
        <Animated.View
          style={[
            {
              position: "absolute",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 100,
              left: animatingLetter.startX,
              top: animatingLetter.startY,
              width: animatingLetter.width,
              height: animatingLetter.height,
              transform: [
                { translateX: flyingLetterPosition.x },
                { translateY: flyingLetterPosition.y },
                { scale: flyingLetterScale },
              ],
              opacity: flyingLetterOpacity,
            },
          ]}
        >
          <Text
            variant="bold"
            className="text-primary-600 shadow"
            style={{
              fontSize: wordGameSizing.choiceLetterFontSize,
              lineHeight: wordGameSizing.choiceLetterLineHeight,
            }}
          >
            {animatingLetter.letter}
          </Text>
        </Animated.View>
      )}

      {/* Success Modal */}
      <Modal
        transparent={true}
        visible={showSuccessModal}
        animationType="fade"
        presentationStyle="overFullScreen"
        supportedOrientations={WORD_GAME_MODAL_ORIENTATIONS}
      >
        <View className="flex-1 justify-center items-center bg-black/50 px-5">
          <View className="bg-white rounded-3xl p-6 pt-8 w-4/5 max-w-xl items-center shadow-xl border-4 border-primary-100">
            <View className="absolute -top-6 left-1/2 -ml-12 w-24 h-24 bg-primary-100 rounded-full items-center justify-center border-4 border-white shadow-lg">
              <Ionicons name="sparkles" size={42} color={brandColors.equatorialGold} />
            </View>

            {/* Title with styling matching app */}
            <Text
              variant="bold"
              className="text-3xl text-primary-600 mb-3 mt-2"
              numberOfLines={1}
            >
              Good Job!
            </Text>

            {/* Word display with highlight */}
            <View className="bg-primary-50/70 w-full rounded-2xl px-4 py-4 mb-6 border-2 border-primary-100">
              <Text
                variant="medium"
                className="text-lg text-primary-700 text-center mb-2"
                numberOfLines={2}
              >
                You correctly guessed the word:
              </Text>
              <View className="flex-row flex-wrap justify-center items-center">
                {currentWord.split("").map((letter, index) => (
                  <View
                    key={index}
                    className="w-10 h-10 m-1 justify-center items-center bg-white rounded-lg shadow-sm border border-primary-200"
                  >
                    <Text variant="bold" className="text-xl text-primary-700" numberOfLines={1}>
                      {letter}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Add navigation controls */}
            <View className="flex-row justify-between w-full mt-4 mb-2">
              {/* Previous level button - only show if there's a previous level and it's unlocked */}
              {currentLevelIndex > 0 ? (
                <TouchableOpacity
                  className="bg-secondary-500 py-3 px-5 rounded-full shadow-lg border-2 border-secondary-400 min-w-[112px] items-center"
                  onPress={() => {
                    setShowSuccessModal(false);
                    setCurrentLevelIndex(currentLevelIndex - 1);
                    loadLevel(currentLevelIndex - 1);
                  }}
                  activeOpacity={0.7}
                >
                  <Text variant="bold" className="text-white text-sm" numberOfLines={1}>Previous</Text>
                </TouchableOpacity>
              ) : (
                <View style={{ width: 100 }} />
              )}
              
              {/* Next level or play again button */}
              <TouchableOpacity
                className="bg-primary-500 py-3 px-5 rounded-full shadow-lg border-2 border-primary-400 active:scale-95 min-w-[124px] items-center"
                onPress={() => {
                  void goToNextLevel().catch((error) => {
                    console.warn("Could not finish Word Game level completion:", error);
                  });
                }}
                activeOpacity={0.7}
              >
                <Text variant="bold" className="text-white text-sm" numberOfLines={1}>
                  {isGameCompleted ? "Play Again" : "Next Level"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Game Completed Modal */}
      <Modal
        transparent={true}
        visible={isGameCompleted}
        animationType="fade"
        presentationStyle="overFullScreen"
        supportedOrientations={WORD_GAME_MODAL_ORIENTATIONS}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          className="flex-1 bg-black/50"
        >
          <View className="flex-1 justify-center items-center px-4 py-10">
            <View className="bg-white rounded-3xl p-6 w-[70%] max-w-xl items-center shadow-xl border-4 border-primary-100">
              {/* Trophy decoration on top - repositioned to be more visible */}
              <View className="absolute -top-6 left-1/2 -ml-10 w-20 h-20 bg-accent-100 rounded-full items-center justify-center border-4 border-white shadow-lg">
                <Ionicons name="trophy" size={36} color={brandColors.equatorialGold} />
              </View>

              {/* Title with styling matching app */}
              <Text
                variant="bold"
                className="text-2xl text-primary-600 mb-3 mt-8"
                numberOfLines={1}
              >
                Congratulations!
              </Text>

              {/* Completion message - made more compact */}
              <View className="bg-primary-50/80 w-full rounded-2xl px-4 py-3 mb-4 border-2 border-primary-100">
                <Text
                  variant="medium"
                  className="text-lg text-primary-700 text-center"
                  numberOfLines={2}
                >
                  You have completed all levels!
                </Text>

                {/* Badge or achievement indicator */}

                {/* uncomment this when needed */}
                {/* <View className="flex-row justify-center items-center mt-2 py-1.5 px-3 bg-white/90 rounded-full self-center border-2 border-accent-100">
                  <Ionicons
                    name="star"
                    size={18}
                    color="#ffb900"
                    style={{ marginRight: 4 }}
                  />
                  <Text variant="bold" className="text-sm text-primary-700">
                    Word Master Badge Earned!
                  </Text>
                </View> */}
              </View>

              {/* Button with improved styling */}
              <TouchableOpacity
                className="bg-primary-500 py-3 px-8 rounded-full shadow-lg border-2 border-primary-400 active:scale-95"
                onPress={() => {
                  setIsGameCompleted(false);
                  setCurrentLevelIndex(0);
                  // Reset level start time
                  levelStartTime.current = Date.now();
                  loadLevel(0);
                }}
                activeOpacity={0.7}
              >
                <Text variant="bold" className="text-white text-lg">
                  Play Again
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </Modal>

      {/* Level Intro Modal */}
      <Modal
        transparent={true}
        visible={showLevelIntroModal}
        animationType="fade"
        presentationStyle="overFullScreen"
        supportedOrientations={WORD_GAME_MODAL_ORIENTATIONS}
        onShow={() => console.log("Word game level intro modal shown")}
      >
        <View className="flex-1 justify-center items-center bg-black/50 px-4">
          <View className="bg-white rounded-2xl p-4 w-[80%] max-w-md items-center shadow-xl border-4 border-primary-100">
            {/* Close button - repositioned to be more visible */}
            <TouchableOpacity
              className="absolute -top-3 -right-3 w-10 h-10 bg-white rounded-full items-center justify-center shadow-lg border-2 border-primary-300 z-10"
              onPress={() => setShowLevelIntroModal(false)}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={20} color="#7b5af0" />
            </TouchableOpacity>
            
            {/* Level title - reduced margin */}
            <Text
              variant="bold"
              className="text-xl text-primary-600 mb-1"
              numberOfLines={1}
            >
              Level {currentLevelIndex + 1}
            </Text>

            {/* Image - slightly smaller */}
            <View className="w-1/2 aspect-square bg-white rounded-xl items-center justify-center shadow-lg border-2 border-secondary-200 mb-2 overflow-hidden">
              <CachedImage
                source={getImageSource(currentLevel.image)}
                fallbackSource={resolveImageSource("coin.png")}
                className="w-full h-full"
                resizeMode="cover"
                accessibilityLabel={`${currentLevel.question} picture`}
              />
            </View>

            {/* Word hint - more compact */}
            <View className="bg-primary-50/80 w-full rounded-xl px-2 py-1.5 mb-2 border-2 border-primary-100">
              <Text
                variant="medium"
                className="text-xs text-primary-700 text-center"
              >
                Find the word:
              </Text>
              <Text
                variant="bold" 
                className="text-base text-primary-800 text-center"
                numberOfLines={2}
                adjustsFontSizeToFit
                minimumFontScale={0.82}
              >
                {currentQuestion}
              </Text>
            </View>

            {/* Button to start the level - more compact */}
            <TouchableOpacity
              className="bg-primary-500 py-1.5 px-6 rounded-full shadow-lg border-2 border-primary-400 active:scale-95"
              onPress={() => setShowLevelIntroModal(false)}
              activeOpacity={0.7}
            >
              <Text variant="bold" className="text-white text-sm">
                Start Level
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Hint Modal */}
      <Modal
        transparent={true}
        visible={showHintModal}
        animationType="fade"
        presentationStyle="overFullScreen"
        supportedOrientations={WORD_GAME_MODAL_ORIENTATIONS}
      >
        <View className="flex-1 justify-center items-center bg-black/50 px-4">
          <View className="bg-white rounded-2xl p-4 w-[80%] max-w-md items-center shadow-xl border-4 border-primary-100">
            {/* Close button */}
            <TouchableOpacity
              className="absolute -top-3 -right-3 w-10 h-10 bg-white rounded-full items-center justify-center shadow-lg border-2 border-primary-300 z-10"
              onPress={() => {
                setShowHintModal(false);
                setShowSubHint(false); // Reset sub-hint visibility when closing modal
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={20} color="#7b5af0" />
            </TouchableOpacity>
            
            {/* Title */}
            <View className="flex-row items-center mb-3">
              <Ionicons name="bulb-outline" size={22} color="#7b5af0" style={{ marginRight: 6 }} />
              <Text
                variant="bold"
                className="text-xl text-primary-600"
              >
                Hint
              </Text>
            </View>

            {/* Main Hint */}
            <View className="bg-primary-50/80 w-full rounded-xl px-3 py-2.5 mb-3 border-2 border-primary-100">
              <Text
                variant="medium"
                className="text-base text-primary-700 text-center"
                numberOfLines={4}
              >
                {currentLevel.hint}
              </Text>
            </View>

            {/* Show Sub-Hint Button - only show if sub-hint is hidden */}
            {!showSubHint && (
              <TouchableOpacity
                className="bg-secondary-500 py-2 px-5 rounded-full shadow-md border-2 border-secondary-400 mb-4"
                onPress={() => setShowSubHint(true)}
                activeOpacity={0.7}
              >
                <Text variant="bold" className="text-white text-sm">
                  Need More Help?
                </Text>
              </TouchableOpacity>
            )}

            {/* Sub Hint - only show if requested */}
            {showSubHint && (
              <View className="bg-secondary-50/80 w-full rounded-xl px-3 py-2.5 mb-4 border-2 border-secondary-100">
                <Text
                  variant="bold" 
                  className="text-sm text-secondary-700 text-center mb-1"
                >
                  Additional Hint:
                </Text>
                <Text
                  variant="medium"
                  className="text-sm text-secondary-700 text-center"
                  numberOfLines={4}
                >
                  {currentLevel.subHint}
                </Text>
              </View>
            )}

            {/* Got it button */}
            <TouchableOpacity
              className="bg-primary-500 py-2 px-7 rounded-full shadow-lg border-2 border-primary-400 active:scale-95"
              onPress={() => {
                setShowHintModal(false);
                setShowSubHint(false); // Reset sub-hint visibility
              }}
              activeOpacity={0.7}
            >
              <Text variant="bold" className="text-white text-sm">
                Got it!
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Level Select Modal */}
      <Modal
        transparent={true}
        visible={showLevelSelect}
        animationType="fade"
        presentationStyle="overFullScreen"
        supportedOrientations={WORD_GAME_MODAL_ORIENTATIONS}
      >
        <View className="flex-1 justify-center items-center bg-black/50 px-4">
          <View className="bg-white rounded-2xl p-4 max-h-[80%] w-[80%] items-center shadow-xl border-4 border-primary-100">
            {/* Close button */}
            <TouchableOpacity
              className="absolute -top-3 -right-3 w-10 h-10 bg-white rounded-full items-center justify-center shadow-lg border-2 border-primary-300 z-10"
              onPress={() => setShowLevelSelect(false)}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={20} color="#7b5af0" />
            </TouchableOpacity>
            
            <Text variant="bold" className="text-xl text-primary-600 mb-2">
              Select Level
            </Text>
            
            <ScrollView className="w-full max-h-[260px]">
              <View className="flex-row flex-wrap justify-center">
                {gameLevels.map((level, index) => {
                  // Use isLevelUnlocked which now considers current level too
                  const isUnlocked = isLevelUnlocked(progress, index, level.id);
                  const isCompleted = progress.completedLevels.includes(index);
                  const isCurrent = index === currentLevelIndex;
                  
                  return (
                    <TouchableOpacity
                      key={index}
                      className={`w-16 h-16 m-1 rounded-xl justify-center items-center shadow-md border-2
                        ${isCurrent ? 'bg-primary-600 border-primary-300' : 
                          isCompleted ? 'bg-green-500 border-green-300' : 
                            isUnlocked ? 'bg-secondary-500 border-secondary-300' : 
                              'bg-gray-300 border-gray-400 opacity-60'}`}
                      onPress={() => selectLevel(index)}
                      disabled={!isUnlocked}
                      activeOpacity={0.8}
                      accessibilityRole="button"
                      accessibilityLabel={`Level ${index + 1}${isCompleted ? ", completed" : ""}${!isUnlocked ? ", locked" : ""}`}
                      accessibilityState={{ disabled: !isUnlocked, selected: isCurrent }}
                    >
                      <Text variant="bold" className="text-white text-lg" numberOfLines={1}>{index + 1}</Text>
                      {!isUnlocked && (
                        <View className="absolute inset-0 items-center justify-center">
                          <Ionicons name="lock-closed" size={20} color="rgba(255,255,255,0.7)" />
                        </View>
                      )}
                      {isCompleted && (
                        <View className="absolute -top-1 -right-1">
                          <Ionicons name="checkmark-circle" size={14} color="#ffffff" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
            
            <TouchableOpacity
              className="bg-primary-500 py-2 px-6 rounded-full shadow-lg border-2 border-primary-400 mt-3"
              onPress={() => setShowLevelSelect(false)}
              activeOpacity={0.7}
            >
              <Text variant="bold" className="text-white text-sm">Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default WordGame;
