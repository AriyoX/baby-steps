import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  TouchableOpacity,
  Image,
  Animated,
  SafeAreaView,
  Dimensions,
  ScrollView,
  FlatList,
  ActivityIndicator,
  ImageBackground,
} from "react-native";
import { Audio } from "expo-av";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Text } from "@/components/StyledText";
import { useChild } from "@/context/ChildContext";
import { saveActivity } from "@/lib/utils";
import { useAchievements } from "./achievements/useAchievements";
import { AchievementDefinition } from "./achievements/achievementTypes"; 

// Import our data structure
import {
  LUGANDA_STAGES,
  Stage,
  Level,
  WordItem,
  getWordsForLevel,
  unlockNextLevel,
  unlockNextStage,
  isStageCompleted,
} from "./utils/lugandawords";

import {
  loadGameProgress as loadProgress,
  saveGameProgress as saveProgress,
  updateUserStats,  UserStats,       
  DEFAULT_USER_STATS
} from './utils/progressManagerLugandaLearning'; // Adjust the import path as necessary

const SOUNDS = {
  // Word pronunciations
  Bubi: require("@/assets/audio/Bubi.mp3"),
  Amazzi: require("@/assets/audio/Amazzi.mp3"),
  Bulungi: require("@/assets/audio/Bulungi.mp3"),
  Ekibira: require("@/assets/audio/Ekibira.mp3"),
  Ekibuga: require("@/assets/audio/Ekibuga.mp3"),
  Eggulu: require("@/assets/audio/Eggulu.mp3"),
  Eddwaliro: require("@/assets/audio/Eddwaliro.mp3"),
  
  // Game sounds
  complete: require("@/assets/audio/complete.mp3"),
  backgroundMusic: require("@/assets/audio/background-music.mp3"),
  
  // Keep your existing sounds
  correct: require("../../assets/audio/complete.mp3"),
  wrong: require("../../assets/audio/complete.mp3"),
};
// Game state types
type GameState =
  | "menu"
  | "stageSelect"
  | "levelSelect"
  | "learning"
  | "playing"
  | "levelComplete";

const LugandaLearningGame: React.FC = () => {
  const router = useRouter();
  const { activeChild } = useChild();
  const { 
  // definedAchievements, // Not directly used for display in-game, but hook needs it
  // earnedChildAchievements, // Not directly used for display in-game
  isLoadingAchievements, // Can be combined with main isLoading
  checkAndGrantNewAchievements 
} = useAchievements(activeChild?.id, 'luganda_learning_game'); // Pass childId and gameKey

const [newlyEarnedAchievementLL, setNewlyEarnedAchievementLL] = useState<AchievementDefinition | null>(null);
  const gameStartTime = useRef(Date.now());

  // Get dimensions for responsive layout
  const { width, height } = Dimensions.get("window");
  const isLandscape = width > height;

  // Game state management
  const [gameState, setGameState] = useState<GameState>("stageSelect");
  const [stages, setStages] = useState<Stage[]>(LUGANDA_STAGES);
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<Level | null>(null);
  const [currentLearningIndex, setCurrentLearningIndex] = useState<number>(0);
  const [currentWords, setCurrentWords] = useState<WordItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Game progress state
  const [totalScore, setTotalScore] = useState<number>(0);
  const [completedLevels, setCompletedLevels] = useState<number[]>([]);

  // Playing state
  const [currentWordIndex, setCurrentWordIndex] = useState<number>(0);
  const [currentWord, setCurrentWord] = useState<WordItem | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [levelScore, setLevelScore] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [sound, setSound] = useState<Audio.Sound | undefined>();
  const [correctSound, setCorrectSound] = useState<Audio.Sound | undefined>();
  const [wrongSound, setWrongSound] = useState<Audio.Sound | undefined>();

  // Animations
  const progressWidth = useState<Animated.Value>(new Animated.Value(0))[0];
  const shakeAnimation = useState<Animated.Value>(new Animated.Value(0))[0];
  const fadeAnim = useState<Animated.Value>(new Animated.Value(0))[0];
  const confettiAnim = useState<Animated.Value>(new Animated.Value(0))[0];
  const [shakingOption, setShakingOption] = useState<string | null>(null);

  // Update animation when state changes
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    return () => {
      fadeAnim.setValue(0);
    };
  }, [gameState, currentLearningIndex, currentWordIndex]);

  // Load game progress on mount
  useEffect(() => {
    const init = async () => {
      if (activeChild) {
        setIsLoading(true);
        const progress = await loadProgress(activeChild.id);
        
        setTotalScore(progress.totalScore);
        setCompletedLevels(progress.completedLevels);
        setStages(progress.stages);
        
        await loadSounds();
        setIsLoading(false);
      }
    };

    init();

    return () => {
      if (sound) sound.unloadAsync();
      if (correctSound) correctSound.unloadAsync();
      if (wrongSound) wrongSound.unloadAsync();
    };
  }, [activeChild]);

  // Setup when selecting a level
  useEffect(() => {
    if (selectedLevel) {
      const words = getWordsForLevel(selectedStage?.id || 0, selectedLevel.id);
      setCurrentWords(words);

      if (gameState === "playing") {
        setCurrentWordIndex(0);
        setLevelScore(0);
        setCurrentWord(words[0]);
        generateOptions(words[0], words);
      }
    }
  }, [selectedLevel, gameState]);

  // Update progress bar
  useEffect(() => {
    if (gameState === "playing" && currentWords.length > 0) {
      Animated.timing(progressWidth, {
        toValue: (currentWordIndex / currentWords.length) * 100,
        duration: 500,
        useNativeDriver: false,
      }).start();
    }
  }, [currentWordIndex, gameState, currentWords]);

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
        setShakingOption(null);
      });
    }
  }, [shakingOption]);

  const loadSounds = async (): Promise<void> => {
    try {
      const correctSoundObject = new Audio.Sound();
      await correctSoundObject.loadAsync(
        require("../../assets/sounds/correct.mp3")
      );
      setCorrectSound(correctSoundObject);

      const wrongSoundObject = new Audio.Sound();
      await wrongSoundObject.loadAsync(
        require("../../assets/sounds/wrong.mp3")
      );
      setWrongSound(wrongSoundObject);
    } catch (error) {
      console.error("Error loading sounds", error);
    }
  };

  const playWordSound = async (
    word: WordItem = currentWord!
  ): Promise<void> => {
    try {
      if (sound) {
        await sound.unloadAsync();
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        require("../../assets/sounds/wrong.mp3") // Replace with actual sound file
      );
      setSound(newSound);
      await newSound.playAsync();
    } catch (error) {
      console.error("Error playing sound", error);
    }
  };

  // Stage selection
  const selectStage = (stage: Stage) => {
    if (!stage.isLocked) {
      setSelectedStage(stage);
      setGameState("levelSelect");
      // Reset timer when selecting a stage
      gameStartTime.current = Date.now();
    }
  };

  // Level selection
  const selectLevel = (level: Level) => {
    if (!level.isLocked) {
      setSelectedLevel(level);
      setGameState("learning");
      setCurrentLearningIndex(0);
      // Reset timer when selecting a level
      gameStartTime.current = Date.now();
    }
  };

  // Learning navigation
  const nextLearningWord = (): void => {
    if (currentLearningIndex < currentWords.length - 1) {
      fadeAnim.setValue(0);
      setCurrentLearningIndex(currentLearningIndex + 1);
    }
  };

  const previousLearningWord = (): void => {
    if (currentLearningIndex > 0) {
      fadeAnim.setValue(0);
      setCurrentLearningIndex(currentLearningIndex - 1);
    }
  };

  const startGame = (): void => {
    setGameState("playing");
    setCurrentWordIndex(0);
    setLevelScore(0);
    setSelectedOption(null);
    setIsCorrect(null);
    if (currentWords.length > 0) {
      setCurrentWord(currentWords[0]);
      generateOptions(currentWords[0], currentWords);
    }
  };

  // Generate options for the game
  const generateOptions = (word: WordItem, wordList: WordItem[]): void => {
    const correctAnswer = word.english;
    let optionsArray: string[] = [correctAnswer];

    // Add 3 random incorrect options
    while (optionsArray.length < 4) {
      const randomIndex = Math.floor(Math.random() * wordList.length);
      const randomOption = wordList[randomIndex].english;

      if (!optionsArray.includes(randomOption)) {
        optionsArray.push(randomOption);
      }
    }

    // Shuffle options
    optionsArray = optionsArray.sort(() => Math.random() - 0.5);
    setOptions(optionsArray);
  };

  const handleOptionSelect = (option: string): void => {
    if (!currentWord || selectedOption) return;

    setSelectedOption(option);

    if (option === currentWord.english) {
      // Correct answer
      setIsCorrect(true);
      setLevelScore(levelScore + 10);

      // Play sound and animate
      if (correctSound) {
        correctSound.replayAsync();
      }

      // Animate confetti on correct answer
      Animated.timing(confettiAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start(() => {
        confettiAnim.setValue(0);
      });

      // Move to next word after a delay
      setTimeout(() => {
        nextWord();
      }, 1500);
    } else {
      // Wrong answer
      setIsCorrect(false);
      setShakingOption(option);

      if (wrongSound) {
        wrongSound.replayAsync();
      }

      // Allow trying again after a delay
      setTimeout(() => {
        setSelectedOption(null);
        setIsCorrect(null);
      }, 1500);
    }
  };

  const nextWord = useCallback((): void => {
    const nextIndex = currentWordIndex + 1;
    fadeAnim.setValue(0);

    if (nextIndex < currentWords.length) {
      setCurrentWordIndex(nextIndex);
      setCurrentWord(currentWords[nextIndex]);
      setSelectedOption(null);
      setIsCorrect(null);

      setTimeout(() => {
        generateOptions(currentWords[nextIndex], currentWords);
      }, 300);
    } else {
      // Level completed
      completeLevelAndUpdateProgress();
    }
  }, [currentWordIndex, currentWords]);

  const trackActivity = async (isStageComplete: boolean = false) => {
    if (!activeChild) return;

    const duration = Math.round((Date.now() - gameStartTime.current) / 1000); // duration in seconds

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
    });

    // Reset timer for next activity
    gameStartTime.current = Date.now();
  };

  // REMOVE this function from your component, its logic will be integrated:
// const saveGameProgress = async () => { ... };

// MODIFY completeLevelAndUpdateProgress like this:
const completeLevelAndUpdateProgress = async () => { // Make it async
  if (!activeChild || !selectedLevel || !selectedStage) {
      console.error("Missing activeChild, selectedLevel, or selectedStage in completeLevelAndUpdateProgress");
      return;
  }

  const newTotalScoreState = totalScore + levelScore; // Use this for UI update
  let newCompletedLevelsState = [...completedLevels];
  if (!newCompletedLevelsState.includes(selectedLevel.id)) {
    newCompletedLevelsState.push(selectedLevel.id);
  }

  let currentLocalStagesState = [...stages];
  let wasStageNewlyCompleted = false;
  let nextStageUnlocked = false;

  currentLocalStagesState = unlockNextLevel(
    selectedStage.id,
    selectedLevel.id,
    currentLocalStagesState
  );

  // Check if current stage is completed and unlock next if criteria met
  const isCurrentStageNowCompleted = isStageCompleted(selectedStage.id, newCompletedLevelsState);
  if (isCurrentStageNowCompleted) {
    wasStageNewlyCompleted = true; // Mark that this stage was just completed
    const nextStageDefinition = currentLocalStagesState.find((s) => s.id === selectedStage.id + 1);
    if (nextStageDefinition && newTotalScoreState >= nextStageDefinition.requiredScore) {
      currentLocalStagesState = unlockNextStage(
        selectedStage.id,
        currentLocalStagesState
      );
      nextStageUnlocked = true;
    }
  }

  await trackActivity(nextStageUnlocked); 

  // Prepare User Stats (integrate logic similar to progressManager.updateUserStats)
  const progressSoFar = await loadProgress(activeChild.id); // Load existing stats
  let existingUserStats = progressSoFar.userStats || { ...DEFAULT_USER_STATS }; // Use default if undefined

  const lastPlayedDate = new Date(existingUserStats.lastPlayed || 0); // Handle case where lastPlayed might be missing
  const today = new Date();
  
  const isNewDay =
      today.getFullYear() !== lastPlayedDate.getFullYear() ||
      today.getMonth() !== lastPlayedDate.getMonth() ||
      today.getDate() !== lastPlayedDate.getDate();

  let newStreakDays = existingUserStats.streakDays;
  if (isNewDay) {
      newStreakDays = existingUserStats.streakDays + 1;
  } else if (existingUserStats.streakDays === 0) { // First play ever, or first play today after a reset
      newStreakDays = 1;
  }


  const updatedUserStatsState: UserStats = {
    totalWords: (existingUserStats.totalWords || 0) + currentWords.length,
    correctAnswers: (existingUserStats.correctAnswers || 0) + (levelScore / 10),
    wrongAnswers: (existingUserStats.wrongAnswers || 0) + (currentWords.length - (levelScore / 10)),
    lastPlayed: today.toISOString(),
    streakDays: newStreakDays,
  };

  // --- ACHIEVEMENT CHECKING ---
  let achievementPointsEarned = 0;
  const eventsForAchievements = [];

  // Event for level completion
  eventsForAchievements.push({
    type: 'level_completed' as const, // Use 'as const' for literal types
    gameKey: 'luganda_learning_game',
    levelId: selectedLevel.id,
    stageId: selectedStage.id, // Good to have context
    // newTotalScore: newTotalScoreState, // Can be sent if achievements depend on it at this exact moment
    // currentUserStats: updatedUserStatsState, // Can be sent
  });

  // Event for perfect quiz (if applicable)
  const maxPossibleScoreForLevel = currentWords.length * 10;
  if (levelScore === maxPossibleScoreForLevel) {
    eventsForAchievements.push({
        type: 'level_perfect_clear' as const,
        gameKey: 'luganda_learning_game',
        levelId: selectedLevel.id,
        currentLevelScore: levelScore,
        currentLevelMaxScore: maxPossibleScoreForLevel,
    });
  }

  // Event for stage completion (if it happened)
  if (wasStageNewlyCompleted) {
    eventsForAchievements.push({
      type: 'stage_completed' as const,
      gameKey: 'luganda_learning_game',
      stageId: selectedStage.id,
      // newTotalScore: newTotalScoreState,
      // currentUserStats: updatedUserStatsState,
    });
  }
  
  // Event for score update and stats update (always send, achievements will check thresholds)
  eventsForAchievements.push({
    type: 'score_updated' as const, // Could also be 'stats_updated' or both
    gameKey: 'luganda_learning_game',
    newTotalScore: newTotalScoreState, // Pass the score *before* achievement points
    currentUserStats: updatedUserStatsState, // Pass the latest stats
  });
  // Also an explicit stats_updated if you have achievements that only look at stats
   eventsForAchievements.push({
    type: 'stats_updated' as const,
    gameKey: 'luganda_learning_game',
    currentUserStats: updatedUserStatsState,
  });


  for (const event of eventsForAchievements) {
      const newlyEarnedFromEvent = await checkAndGrantNewAchievements(event);
      if (newlyEarnedFromEvent.length > 0) {
        newlyEarnedFromEvent.forEach(ach => {
          achievementPointsEarned += ach.points;
          console.log(`LUGANDA LEARNING - NEW ACHIEVEMENT: ${ach.name}`);
          setNewlyEarnedAchievementLL(ach); // For modal/toast
          // Toast.show(`Achievement: ${ach.name}! +${ach.points} pts`, Toast.LONG);
        });
      }
  }
  
  // Add achievement points to the total score that will be saved
  const finalTotalScoreToSave = newTotalScoreState + achievementPointsEarned;

  // Update React state with final scores including achievement points
  setTotalScore(finalTotalScoreToSave); // UI reflects score + achievement points
  setCompletedLevels(newCompletedLevelsState);
  setStages(currentLocalStagesState);

  // Now, save everything using the newly computed values
  try {
    await saveProgress(
      finalTotalScoreToSave, // Save the score including achievement points
      newCompletedLevelsState,
      currentLocalStagesState,
      updatedUserStatsState,
      activeChild.id
    );
    console.log("Luganda Learning: Game progress saved successfully.");
  } catch (error) {
    console.error("Luganda Learning: Failed to save game progress:", error);
  }

  setGameState("levelComplete");
};

  const renderAchievementUnlockedModalLL = () => {
  if (!newlyEarnedAchievementLL) return null;

    return (
      <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
        <View style={{ backgroundColor: 'white', borderRadius: 20, padding: 24, width: '85%', maxWidth: 380, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5 }}>
          <View style={{ position: 'absolute', top: -40, backgroundColor: '#f59e0b', width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: 'white' }}>
            <Ionicons name={(newlyEarnedAchievementLL.icon_name as any) || "star"} size={36} color="white" />
          </View>
          <Text style={{ fontWeight: 'bold', fontSize: 20, color: '#b45309', marginTop: 48, marginBottom: 8, textAlign: 'center' }}>
            Achievement Unlocked!
          </Text>
          <Text style={{ fontWeight: 'bold', fontSize: 24, color: '#374151', marginBottom: 8, textAlign: 'center' }}>
            {newlyEarnedAchievementLL.name}
          </Text>
          <Text style={{ fontSize: 14, color: '#4b5563', textAlign: 'center', marginBottom: 16 }}>
            {newlyEarnedAchievementLL.description}
          </Text>
          <Text style={{ fontWeight: 'bold', fontSize: 18, color: '#f59e0b', marginBottom: 24 }}>
            +{newlyEarnedAchievementLL.points} Points!
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: '#f59e0b', paddingVertical: 12, paddingHorizontal: 40, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1.41, elevation: 2 }}
            onPress={() => setNewlyEarnedAchievementLL(null)}
          >
            <Text style={{ fontWeight: 'bold', color: 'white', fontSize: 16, textAlign: 'center' }}>
              Awesome!
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const saveGameProgress = async () => {
    if (!activeChild) return;
    
    await saveProgress(
      totalScore,
      completedLevels,
      stages,
      {
        totalWords: currentWords.length,
        correctAnswers: levelScore / 10, // Assuming 10 points per correct answer
        wrongAnswers: (currentWords.length - (levelScore / 10)),
        lastPlayed: new Date().toISOString(),
        streakDays: 1 // This would need more complex logic to properly track
      },
      activeChild.id
    );
  };

  // STAGE SELECTION SCREEN
  const renderStageSelectScreen = () => {
    return (
      <SafeAreaView className="flex-1 bg-slate-50">
        <StatusBar style="dark" />

        {/* Header with back button and score */}
        <View className="flex-row justify-between items-center px-4 pt-6 pb-2">
          <TouchableOpacity
            className="w-10 h-10 rounded-full bg-white justify-center items-center shadow-sm border border-indigo-200"
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={20} color="#7b5af0" />
          </TouchableOpacity>

          <Text variant="bold" className="text-xl text-indigo-800">
            Luganda Learning
          </Text>

          <View className="flex-row items-center bg-white px-3 py-1.5 rounded-full shadow-sm border border-amber-200">
            <Image
              source={require("../../assets/images/coin.png")}
              style={{ width: 20, height: 20, marginRight: 4 }}
              resizeMode="contain"
            />
            <Text variant="bold" className="text-amber-500">
              {totalScore}
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
              <Text className="text-xs text-slate-500 mr-2">
                Swipe to explore
              </Text>
              <Ionicons name="arrow-forward" size={14} color="#6366f1" />
            </View>
          </View>

          {/* Stage Cards with Snap Scrolling */}
          <FlatList
            data={stages}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={width * 0.55 + 8}
            snapToAlignment="start"
            decelerationRate="fast"
            contentContainerStyle={{
              paddingVertical: 12,
              paddingLeft: 6,
              paddingRight: width * 0.45,
            }}
            renderItem={({ item: stage }) => (
              <TouchableOpacity
                key={stage.id}
                style={{
                  width: width * 0.4,
                  marginRight: 8,
                  height: height * 0.5,
                  maxHeight: 450,
                }}
                className={`rounded-2xl overflow-hidden shadow-md mx-2 ${
                  stage.isLocked ? "opacity-70" : ""
                }`}
                onPress={() => selectStage(stage)}
                disabled={stage.isLocked}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={[stage.color, `${stage.color}DD`]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  className="p-4 flex-1"
                >
                  {/* Top section */}
                  <View>
                    {/* Stage Header */}
                    <View className="flex-row items-center mb-2">
                      <View className="w-8 h-8 rounded-full bg-white bg-opacity-40 justify-center items-center mr-2">
                        <Text variant="bold" style={{ color: stage.color }}>
                          {stage.id}
                        </Text>
                      </View>

                      {/* Image alongside title */}
                      <View className="ml-auto bg-white p-2 rounded-full shadow-sm">
                        <Image
                          source={stage.image}
                          style={{ width: 24, height: 24 }}
                          resizeMode="contain"
                        />
                      </View>
                    </View>

                    {/* Stage title */}
                    <Text
                      variant="bold"
                      className="text-lg  text-white mb-1.5 tracking-wide"
                    >
                      {stage.title}
                    </Text>

                    {/* Description */}
                    <Text
                      className="text-white text-opacity-95 mb-3 text-sm"
                      style={{ lineHeight: 18 }}
                      numberOfLines={2}
                    >
                      {stage.description}
                    </Text>
                  </View>

                  {/* Info badges and action button in one horizontal line */}
                  <View className="flex-row items-center justify-between mt-3">
                    {/* Left side - Info badges */}
                    <View className="flex-row flex-wrap">
                      {/* Level count badge */}
                      <View className="flex-row items-center bg-white bg-opacity-60 px-3 py-1.5 rounded-full mr-2">
                        <Ionicons
                          name="school-outline"
                          size={14}
                          color={stage.color}
                        />
                        <Text
                          variant="bold"
                          className="text-sm ml-1"
                          style={{ color: stage.color }}
                        >
                          {stage.levels.length}
                        </Text>
                      </View>

                      {/* Completed levels badge */}
                      <View className="flex-row items-center bg-white bg-opacity-60 px-3 py-1.5 rounded-full mr-2">
                        <Ionicons
                          name="checkmark-circle-outline"
                          size={14}
                          color={stage.color}
                        />
                        <Text
                          variant="bold"
                          className="ml-1"
                          style={{ color: stage.color }}
                        >
                          {
                            stage.levels.filter((level) =>
                              completedLevels.includes(level.id)
                            ).length
                          }
                          /{stage.levels.length}
                        </Text>
                      </View>
                    </View>

                    {/* Right side - Action button */}
                    <View className="ml-auto">
                      {!stage.isLocked ? (
                        <TouchableOpacity
                          className="bg-white px-3 py-1.5 rounded-full items-center shadow-sm"
                          onPress={() => selectStage(stage)}
                        >
                          <Text variant="bold" style={{ color: stage.color }}>
                            Start
                          </Text>
                        </TouchableOpacity>
                      ) : (
                        <View className="flex-row items-center justify-center bg-black bg-opacity-25 px-3 py-1.5 rounded-full border border-white border-opacity-30">
                          <Ionicons
                            name="lock-closed"
                            size={14}
                            color="white"
                          />
                          <Text variant="bold" className="text-white ml-1">
                            {stage.requiredScore}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            )}
            ListFooterComponent={() => (
              <View style={{ width: 20 }} /> // Small spacer at the end
            )}
          />
        </Animated.View>
      </SafeAreaView>
    );
  };

  // LEVEL SELECTION SCREEN
  const renderLevelSelectScreen = () => {
    if (!selectedStage) return null;

    return (
      <SafeAreaView className="flex-1 bg-slate-50 pt-3">
        <StatusBar style="dark" />

        {/* Fixed Header with back button and stage info */}
        <View className="flex-row justify-between items-center px-4 pt-4 pb-2">
          <TouchableOpacity
            className="w-10 h-10 rounded-full bg-white justify-center items-center shadow-sm border border-indigo-200"
            onPress={() => setGameState("stageSelect")}
          >
            <Ionicons name="arrow-back" size={20} color="#7b5af0" />
          </TouchableOpacity>

          <Text variant="bold" className="text-xl text-indigo-800">
            {selectedStage.title}
          </Text>

          <View className="flex-row items-center bg-white px-3 py-1.5 rounded-full shadow-sm border border-amber-200">
            <Image
              source={require("../../assets/images/coin.png")}
              style={{ width: 20, height: 20, marginRight: 4 }}
              resizeMode="contain"
            />
            <Text variant="bold" className="text-amber-500">
              {totalScore}
            </Text>
          </View>
        </View>

        {/* Scrollable Content Area */}
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
        >
          <Animated.View className="px-4 pt-2" style={{ opacity: fadeAnim }}>
            {/* More Compact Stage Banner */}
            <View
              className="p-3 rounded mb-3 shadow-sm py-8"
              style={{ backgroundColor: selectedStage.color }}
            >
              <View className="flex-row items-center">
                {/* Image and Title in one row */}
                <View className="bg-white p-2 rounded-full mr-3">
                  <Image
                    source={selectedStage.image}
                    style={{ width: 24, height: 24 }}
                    resizeMode="contain"
                  />
                </View>

                <View className="flex-1">
                  <View className="flex-row items-baseline">
                    <Text className="text-white text-opacity-90 text-xs mr-2">
                      Stage {selectedStage.id}
                    </Text>
                    <Text variant="bold" className="text-white text-lg">
                      {selectedStage.title}
                    </Text>
                  </View>

                  {/* Progress info in the same row */}
                  <View className="flex-row items-center mt-1">
                    <Text className="text-white text-opacity-90 text-xs mr-2">
                      {
                        selectedStage.levels.filter((level) =>
                          completedLevels.includes(level.id)
                        ).length
                      }{" "}
                      / {selectedStage.levels.length}
                    </Text>

                    {/* Progress bar takes remaining space */}
                    <View className="flex-1 h-1.5 bg-white bg-opacity-30 rounded-full overflow-hidden mr-2">
                      <View
                        className="h-full bg-white"
                        style={{
                          width: `${
                            (selectedStage.levels.filter((level) =>
                              completedLevels.includes(level.id)
                            ).length /
                              selectedStage.levels.length) *
                            100
                          }%`,
                        }}
                      />
                    </View>

                    <Text className="text-white text-opacity-90 text-xs">
                      {selectedStage.levels.filter((level) =>
                        completedLevels.includes(level.id)
                      ).length === selectedStage.levels.length
                        ? "Completed"
                        : "In Progress"}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Level selection grid */}
            <View className="flex-row justify-between items-center mb-3">
              <Text variant="bold" className="text-lg text-slate-800">
                Select a Level
              </Text>
              <Text className="text-xs text-slate-500">
                {selectedStage.levels.length} levels
              </Text>
            </View>

            {/* More efficient level grid */}
            <View className="flex-row flex-wrap justify-between">
              {selectedStage.levels.map((level) => (
                <TouchableOpacity
                  key={level.id}
                  style={{ width: "48%", marginBottom: 10 }}
                  className={`rounded shadow-sm overflow-hidden border
                  ${
                    level.isLocked
                      ? "bg-slate-100 border-slate-200"
                      : completedLevels.includes(level.id)
                      ? "bg-white border-emerald-300"
                      : "bg-white border-indigo-200"
                  }
                `}
                  onPress={() => selectLevel(level)}
                  disabled={level.isLocked}
                  activeOpacity={level.isLocked ? 1 : 0.7}
                >
                  <View className="px-2 py-3 items-center">
                    {level.isLocked ? (
                      <View className="items-center">
                        <View className="w-10 h-10 rounded-full bg-slate-200 justify-center items-center mb-2">
                          <Ionicons
                            name="lock-closed"
                            size={18}
                            color="#94a3b8"
                          />
                        </View>
                        <Text
                          variant="bold"
                          className="text-sm text-slate-400 text-center"
                        >
                          {level.title}
                        </Text>
                        <Text className="text-xs text-slate-400 mt-0.5">
                          Locked
                        </Text>
                      </View>
                    ) : completedLevels.includes(level.id) ? (
                      <View className="items-center">
                        <View className="w-10 h-10 rounded-full bg-emerald-100 justify-center items-center mb-2">
                          <Ionicons
                            name="checkmark-circle"
                            size={20}
                            color="#10b981"
                          />
                        </View>
                        <Text
                          variant="bold"
                          className="text-sm text-slate-700 text-center"
                        >
                          {level.title}
                        </Text>
                        <Text className="text-xs text-emerald-600 mt-0.5">
                          Completed
                        </Text>
                      </View>
                    ) : (
                      <View className="items-center">
                        <View className="w-10 h-10 rounded-full bg-indigo-100 justify-center items-center mb-2">
                          <Ionicons
                            name="play-circle"
                            size={20}
                            color="#7b5af0"
                          />
                        </View>
                        <Text
                          variant="bold"
                          className="text-sm text-slate-700 text-center"
                        >
                          {level.title}
                        </Text>
                        <Text className="text-xs text-slate-500 mt-0.5">
                          {level.words.length} Words
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    );
  };

  // LEARNING SCREEN
  const renderLearningScreen = () => {
    if (!selectedLevel || currentWords.length === 0) return null;

    const currentLearnWord = currentWords[currentLearningIndex];
    const layout = isLandscape ? "landscape" : "portrait";
    return (
      <SafeAreaView className="flex-1 bg-slate-50 pt-6">
        <StatusBar style="dark" />

        {/* Header */}
        <View className="flex-row justify-between items-center px-4">
          <TouchableOpacity
            className="w-10 h-10 rounded-full bg-white justify-center items-center shadow-sm border border-indigo-200"
            onPress={() => setGameState("levelSelect")}
          >
            <Ionicons name="arrow-back" size={20} color="#7b5af0" />
          </TouchableOpacity>

          <View className="flex-row items-center">
            <Text variant="bold" className="text-indigo-800 text-sm">
              {currentLearningIndex + 1}/{currentWords.length}
            </Text>
            <View className="w-16 h-1.5 bg-slate-200 rounded-full ml-2 overflow-hidden">
              <View
                className="h-full bg-indigo-500"
                style={{
                  width: `${
                    ((currentLearningIndex + 1) / currentWords.length) * 100
                  }%`,
                }}
              />
            </View>
          </View>

          <TouchableOpacity
            className="bg-indigo-500 py-1.5 px-3 rounded-full"
            onPress={startGame}
          >
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
                className="bg-white p-5 rounded-2xl shadow-sm w-full justify-center items-center"
                style={{ opacity: fadeAnim }}
              >
                <Image
                  source={currentLearnWord.image}
                  style={{ width: "100%", height: "80%" }}
                  resizeMode="contain"
                />
              </Animated.View>
            </View>

            <View className="w-1/2 p-4">
              <Animated.View
                className="bg-white px-5 pt-3 rounded-2xl shadow-sm mb-4"
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
                <View className="flex-row justify-between items-center">
                  <Text className="text-sm text-indigo-500">
                    {selectedStage?.title} - {selectedLevel.title}
                  </Text>
                  <TouchableOpacity
                    className="bg-indigo-100 p-2 rounded-full"
                    onPress={() => playWordSound(currentLearnWord)}
                  >
                    <Ionicons name="volume-high" size={18} color="#6366f1" />
                  </TouchableOpacity>
                </View>

                <Text variant="bold" className="text-3xl text-indigo-700 pt-3">
                  {currentLearnWord.luganda}
                </Text>
                <Text className="text-xl text-slate-700 mb-4">
                  {currentLearnWord.english}
                </Text>

                <View className="bg-slate-50 p-4 rounded-lg mb-2">
                  <Text className="text-base text-slate-800 italic mb-2">
                    "{currentLearnWord.example}"
                  </Text>
                  <Text className="text-sm text-slate-500">
                    {currentLearnWord.exampleTranslation}
                  </Text>
                </View>
              </Animated.View>

              <View className="flex-row justify-between p">
                <TouchableOpacity
                  className={`py-3 px-5 rounded-xl ${
                    currentLearningIndex === 0
                      ? "bg-slate-200"
                      : "bg-indigo-500"
                  }`}
                  onPress={previousLearningWord}
                  disabled={currentLearningIndex === 0}
                >
                  <Text
                    className={` ${
                      currentLearningIndex === 0
                        ? "text-slate-400"
                        : "text-white"
                    }`}
                    variant="bold"
                  >
                    Previous
                  </Text>
                </TouchableOpacity>

                {currentLearningIndex < currentWords.length - 1 ? (
                  <TouchableOpacity
                    className="bg-indigo-500 py-3 px-5 rounded-xl"
                    onPress={nextLearningWord}
                  >
                    <Text variant="bold" className="text-white">
                      Next
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    className="bg-emerald-500 py-3 px-5 rounded-xl"
                    onPress={startGame}
                  >
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
                <View className="bg-white p-4 rounded-2xl shadow-sm items-center mb-5">
                  <Image
                    source={currentLearnWord.image}
                    style={{ width: width * 0.7, height: width * 0.5 }}
                    resizeMode="contain"
                  />
                </View>

                <View className="bg-white p-5 rounded-2xl shadow-sm mb-8">
                  <View className="flex-row justify-between items-center mb-5">
                    <Text className="text-sm text-indigo-500">
                      {selectedStage?.title} - {selectedLevel.title}
                    </Text>
                    <TouchableOpacity
                      className="bg-indigo-100 p-2 rounded-full"
                      onPress={() => playWordSound(currentLearnWord)}
                    >
                      <Ionicons name="volume-high" size={18} color="#6366f1" />
                    </TouchableOpacity>
                  </View>

                  <Text
                    variant="bold"
                    className="text-3xl text-indigo-700 mb-1"
                  >
                    {currentLearnWord.luganda}
                  </Text>
                  <Text className="text-xl text-slate-700 mb-4">
                    {currentLearnWord.english}
                  </Text>

                  <View className="bg-slate-50 p-4 rounded-lg">
                    <Text className="text-base text-slate-800 italic mb-2">
                      "{currentLearnWord.example}"
                    </Text>
                    <Text className="text-sm text-slate-500">
                      {currentLearnWord.exampleTranslation}
                    </Text>
                  </View>
                </View>

                <View className="flex-row justify-between px-2">
                  <TouchableOpacity
                    className={`py-3 px-6 rounded-xl ${
                      currentLearningIndex === 0
                        ? "bg-slate-200"
                        : "bg-indigo-500"
                    }`}
                    onPress={previousLearningWord}
                    disabled={currentLearningIndex === 0}
                  >
                    <Text
                      className={` ${
                        currentLearningIndex === 0
                          ? "text-slate-400"
                          : "text-white"
                      }`}
                      variant="bold"
                    >
                      Previous
                    </Text>
                  </TouchableOpacity>

                  {currentLearningIndex < currentWords.length - 1 ? (
                    <TouchableOpacity
                      className="bg-indigo-500 py-3 px-6 rounded-xl"
                      onPress={nextLearningWord}
                    >
                      <Text variant="bold" className="text-white">
                        Next
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      className="bg-emerald-500 py-3 px-6 rounded-xl"
                      onPress={startGame}
                    >
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
    );
  };

  // GAME SCREEN
  const renderGameScreen = () => {
    if (!currentWord) return null;
    const layout = isLandscape ? "landscape" : "portrait";

    return (
      <SafeAreaView className="flex-1 bg-slate-50">
        <StatusBar style="dark" />

        {/* Header */}
        <View className="flex-row justify-between items-center px-4 pt-6 pb-2">
          <TouchableOpacity
            className="w-10 h-10 rounded-full bg-white justify-center items-center shadow-sm border border-indigo-200"
            onPress={() => setGameState("learning")}
          >
            <Ionicons name="arrow-back" size={20} color="#7b5af0" />
          </TouchableOpacity>

          <Text variant="bold" className="text-indigo-800">
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
              {Math.round((currentWordIndex / currentWords.length) * 100)}%
              Complete
            </Text>
          </View>
        </View>

        <Animated.View className="flex-1" style={{ opacity: fadeAnim }}>
          {layout === "landscape" ? (
            // Landscape layout
            <View className="flex-1 flex-row px-3">
              <View className="w-1/2 p-2 justify-center">
                <View className="bg-white p-6 rounded-2xl shadow-sm">
                  <Text className="text-lg text-slate-600 mb-6 text-center">
                    What is the English translation of:
                  </Text>

                  <View className="items-center mb-5">
                    <View className="flex-row items-center">
                      <Text
                        variant="bold"
                        className="text-3xl text-indigo-700 text-center pt-3"
                      >
                        {currentWord.luganda}
                      </Text>
                      <TouchableOpacity
                        className="ml-3 p-2 bg-indigo-100 rounded-full"
                        onPress={() => playWordSound()}
                      >
                        <Ionicons
                          name="volume-high"
                          size={20}
                          color="#6366f1"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Feedback */}
                  {isCorrect !== null && (
                    <View className="items-center my-4">
                      <Text
                        className={`text-lg ${
                          isCorrect ? "text-emerald-500" : "text-red-500"
                        }`}
                        variant="bold"
                      >
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
                      style={[
                        option === shakingOption
                          ? { transform: [{ translateX: shakeAnimation }] }
                          : {},
                      ]}
                    >
                      <TouchableOpacity
                        className={`
                          py-3 px-5 rounded-xl shadow-sm border-2 items-center justify-center mb-2
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
              <View className="bg-white p-6 rounded-2xl shadow-sm mb-5">
                <Text className="text-base text-slate-600 mb-5 text-center">
                  What is the English translation of:
                </Text>

                <View className="items-center mb-5">
                  <View className="flex-row items-center">
                    <Text
                      variant="bold"
                      className="text-3xl text-indigo-700 text-center"
                    >
                      {currentWord.luganda}
                    </Text>
                    <TouchableOpacity
                      className="ml-3 p-2 bg-indigo-100 rounded-full"
                      onPress={() => playWordSound()}
                    >
                      <Ionicons name="volume-high" size={20} color="#6366f1" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Feedback */}
                {isCorrect !== null && (
                  <View className="items-center my-3">
                    <Text
                      variant="bold"
                      className={`text-lg ${
                        isCorrect ? "text-emerald-500" : "text-red-500"
                      }`}
                    >
                      {isCorrect ? "Correct! 🎉" : "Try again 😕"}
                    </Text>
                  </View>
                )}
              </View>

              <View className="space-y-3">
                {options.map((option, index) => (
                  <Animated.View
                    key={index}
                    style={[
                      option === shakingOption
                        ? { transform: [{ translateX: shakeAnimation }] }
                        : {},
                    ]}
                  >
                    <TouchableOpacity
                      className={`
                        py-4 px-5 rounded-xl shadow-sm border-2 items-center
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
                  <View className="flex-row">
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
    );
  };

  // LEVEL COMPLETION SCREEN
  const renderLevelCompletionScreen = () => {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 ">
        <StatusBar style="light" />

        <View className="flex-1 justify-center items-center">
          <LinearGradient
            colors={[
              selectedStage?.color || "#6366f1",
              (selectedStage?.color || "#6366f1") + "CC",
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="p-12 rounded-3xl w-full items-center shadow-lg"
          >
            <View className="bg-white w-12 h-12 rounded-full mb-2 justify-center items-center">
              <Text className="text-xl">🏆</Text>
            </View>

            <Text variant="bold" className="text-xl text-white mb-2">
              Level Complete!
            </Text>
            <Text className="text-white text-center  mb-2">
              Congratulations, you've completed {selectedLevel?.title}!
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
                  setGameState("levelSelect");
                  // Reset timer for next activity
                  gameStartTime.current = Date.now();
                }}
              >
                <Text variant="bold" className="text-indigo-600">
                  Choose Level
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="bg-emerald-500 py-3 px-5 rounded-xl"
                onPress={() => {
                  setGameState("stageSelect");
                  // Reset timer for next activity
                  gameStartTime.current = Date.now();
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
    );
  };

  // Loading screen
  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 justify-center items-center">
        <ActivityIndicator size="large" color="#6366f1" />
        <Text className="mt-4 text-slate-600">
          Loading your learning journey...
        </Text>
      </SafeAreaView>
    );
  }

  // Main render function that switches between game states
  switch (gameState) {
    case "stageSelect":
      return <>{renderStageSelectScreen()}{renderAchievementUnlockedModalLL()}</>;
    case "levelSelect":
      return <>{renderLevelSelectScreen()}{renderAchievementUnlockedModalLL()}</>;
    case "learning":
      return <>{renderLearningScreen()}{renderAchievementUnlockedModalLL()}</>;
    case "playing":
      return <>{renderGameScreen()}{renderAchievementUnlockedModalLL()}</>;
    case "levelComplete":
      return <>{renderLevelCompletionScreen()}{renderAchievementUnlockedModalLL()}</>;
    default:
      return <>{renderStageSelectScreen()}{renderAchievementUnlockedModalLL()}</>;
  }
};

export default LugandaLearningGame;