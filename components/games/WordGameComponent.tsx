import React, { useState, useEffect, useRef } from "react";
import {
  View,
  TouchableOpacity,
  Image,
  Dimensions,
  Animated,
  Modal,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Audio } from "expo-av";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import * as ScreenOrientation from "expo-screen-orientation";
import { Ionicons } from "@expo/vector-icons";
import { gameLevels } from "./utils/wordgamewords"; // Import game levels
import { Text } from "@/components/StyledText";
import { useChild } from "@/context/ChildContext"; // Import useChild context
import { saveActivity } from "@/lib/utils"; // Import saveActivity function
import {
  WordGameProgress,
  DEFAULT_PROGRESS,
  loadGameProgress,
  saveGameProgress,
  updateProgressForLevelCompletion,
  isLevelUnlocked
} from './utils/progressManagerWordGame';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAchievements } from "./achievements/useAchievements"; 
import { AchievementDefinition } from "./achievements/achievementTypes"; 

// Get screen dimensions
const { width, height } = Dimensions.get("window");

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

type GameLevel = {
  word: string;
  question: string;
  firstLetter: string;
};

// Add this helper function near the top of your component
const getImageSource = (imageName: string | undefined) => {
  // For now, all images will use coin.png as requested
  if (!imageName) return require("@/assets/images/coin.png");
  
  switch (imageName) {
    case 'wildlife.jpg':
      return require('@/assets/images/wildlife.jpg');
    case 'coin.jpg':
      return require('@/assets/images/wildlife.jpg');
    case 'rain.jpg':
      return require('@/assets/images/rain.jpg');
    case 'chicken.jpg':
      return require('@/assets/images/chicken.jpg');
    case 'black-kid.jpg':
      return require('@/assets/images/black-kid.jpg');
    case 'river-kids.jpg':
      return require('@/assets/images/river-kids.jpg');

    // Add cases for other images
    default:
      return require('@/assets/images/coin.png');
  }
};

const WordGame: React.FC = () => {
  // Add child context
  const { activeChild } = useChild();
  const { 
    isLoadingAchievements, 
    checkAndGrantNewAchievements 
  } = useAchievements(activeChild?.id, 'word_game'); // Game key

  const [newlyEarnedAchievementWG, setNewlyEarnedAchievementWG] = useState<AchievementDefinition | null>(null);
  const [hintUsedCurrentLevel, setHintUsedCurrentLevel] = useState<boolean>(false); // For no-hint achievement
  const [consecutiveWins, setConsecutiveWins] = useState<number>(0);
  
  // Add state to track level start time
  const levelStartTime = useRef<number>(Date.now());
  
  // State variables
  const [currentLevelIndex, setCurrentLevelIndex] = useState<number>(0);
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
  const [progress, setProgress] = useState<WordGameProgress>(DEFAULT_PROGRESS);
  const [showLevelSelect, setShowLevelSelect] = useState<boolean>(false);
  const [fadeAnim] = useState(new Animated.Value(1));

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
  const loadLevel = (levelIndex: number) => {
    if (levelIndex >= gameLevels.length) {
      setIsGameCompleted(true);
      trackGameCompletion(); // Track full game completion
      return;
    }

    // Reset the level start time when loading a new level
    levelStartTime.current = Date.now();

    const level = gameLevels[levelIndex];
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

    // Reset refs
    letterRefs.current = {};
    wordSlotRefs.current = {};

    // Show the level intro modal
    setShowLevelIntroModal(true);
    
    // Update current level in progress if it's different
    if (activeChild && progress.currentLevel !== levelIndex) {
      const updatedProgress = {
        ...progress,
        currentLevel: levelIndex
      };
      setProgress(updatedProgress);
      saveGameProgress(updatedProgress, activeChild.id);
    }
  };

  // Function to handle level selection from the level select modal
  const selectLevel = (levelIndex: number) => {
    if (isLevelUnlocked(progress, levelIndex)) {
      // Update the current level in progress
      if (activeChild) {
        const updatedProgress = {
          ...progress,
          currentLevel: levelIndex
        };
        setProgress(updatedProgress);
        saveGameProgress(updatedProgress, activeChild.id);
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

    await saveActivity({
      child_id: activeChild.id,
      activity_type: "words", // Using 'words' activity type
      activity_name: `Word Game Level ${currentLevelIndex + 1}`,
      score: "100%", // They completed the word successfully
      duration: duration,
      completed_at: new Date().toISOString(),
      details: `Completed word: "${currentWord}" - ${currentQuestion}`,
      level: currentLevelIndex + 1
    });
  };

  // Function to track game completion
  const trackGameCompletion = async () => {
    if (!activeChild) return;

    await saveActivity({
      child_id: activeChild.id,
      activity_type: "words",
      activity_name: "Word Game Completed",
      score: `${currentLevelIndex + 1}/${gameLevels.length}`,
      completed_at: new Date().toISOString(),
      details: `Completed all ${gameLevels.length} words in the Word Game`
    });
  };

  // Modified goToNextLevel to track level completion and unlock the next level
  const goToNextLevel = async () => {
    await trackLevelCompletion(); // Original tracking
    
    let finalProgress = progress; // Start with current progress

    if (activeChild) {
      const progressAfterLevel = updateProgressForLevelCompletion(
        progress,
        currentLevelIndex,
        currentWord,
        activeChild.id
      );
      // No need to push to completedLevels or unlockedLevels here, updateProgressForLevelCompletion handles it.
      
      // --- ACHIEVEMENT CHECKING (AFTER LEVEL COMPLETE) ---
      let achievementPointsEarned = 0;
      const eventsForAchievements: Parameters<typeof checkAndGrantNewAchievements>[0][] = [];

      // Event for level completion
      eventsForAchievements.push({
          type: 'word_game_level_just_completed',
          gameKey: 'word_game',
          levelIndex: currentLevelIndex,
          wordGameProgress: progressAfterLevel, // Pass the progress *after* this level is notionally complete
          hintUsedThisLevel: hintUsedCurrentLevel,
          // consecutiveLevelsCompleted: currentConsecutiveWins, // If tracking this
      });

      // Event for stats update (score, completed levels count)
      eventsForAchievements.push({
          type: 'word_game_stats_updated', // Or just use 'word_game_level_just_completed' and let manager derive
          gameKey: 'word_game',
          wordGameProgress: progressAfterLevel,
      });
      
      // Handle consecutive wins (simplified example: assumes linear play)
      // If they can jump levels, this needs more robust logic, perhaps from playHistory.
      const currentConsecutiveWins = consecutiveWins + 1;
      setConsecutiveWins(currentConsecutiveWins); // Update state
      if (currentConsecutiveWins >= 3) { // Example for "Three in a Row"
          eventsForAchievements.push({
              type: 'word_game_level_just_completed', // Re-use or make specific 'word_game_streak_achieved'
              gameKey: 'word_game',
              levelIndex: currentLevelIndex, // Context
              consecutiveLevelsCompleted: currentConsecutiveWins,
              wordGameProgress: progressAfterLevel, 
          });
      }


      for (const event of eventsForAchievements) {
          const newlyEarnedFromEvent = await checkAndGrantNewAchievements(event);
          if (newlyEarnedFromEvent.length > 0) {
              newlyEarnedFromEvent.forEach(ach => {
                  achievementPointsEarned += ach.points;
                  console.log(`WORD GAME - NEW ACHIEVEMENT: ${ach.name}`);
                  setNewlyEarnedAchievementWG(ach);
              });
          }
      }

      // Add achievement points to the progress that will be saved
      finalProgress = {
          ...progressAfterLevel,
          totalScore: progressAfterLevel.totalScore + achievementPointsEarned,
      };
      // --- END ACHIEVEMENT CHECKING ---

      setProgress(finalProgress); // Update local state with points
      await saveGameProgress(finalProgress, activeChild.id); // Save progress with new points
    } else {
      // If no active child, still update local state for non-persistent play
      finalProgress = updateProgressForLevelCompletion(
          progress,
          currentLevelIndex,
          currentWord,
          undefined // no childId
        );
      setProgress(finalProgress);
    }
    
    const nextLevelIdx = currentLevelIndex + 1;
    setShowSuccessModal(false);
    setSelectedLetters([]); // Should be done when new level loads
    
    // Reset for next level BEFORE loading it
    setHintUsedCurrentLevel(false); 
    
    // Check if this was the last level
    if (nextLevelIdx >= gameLevels.length) {
        setIsGameCompleted(true);
        await trackGameCompletion(); // Original tracking
        // --- ACHIEVEMENT CHECKING (ALL LEVELS COMPLETE) ---
        if (activeChild) {
            const eventAllComplete: Parameters<typeof checkAndGrantNewAchievements>[0] = {
                type: 'game_completed', // Using generic 'game_completed'
                gameKey: 'word_game',
                wordGameProgress: finalProgress, // Pass the latest progress
                allLevelsInGameCount: gameLevels.length,
            };
            const newlyEarnedAllComplete = await checkAndGrantNewAchievements(eventAllComplete);
            if (newlyEarnedAllComplete.length > 0) {
                let pointsFromAllComplete = 0;
                newlyEarnedAllComplete.forEach(ach => {
                    pointsFromAllComplete += ach.points;
                    console.log(`WORD GAME - ALL LEVELS COMPLETE - NEW ACHIEVEMENT: ${ach.name}`);
                    setNewlyEarnedAchievementWG(ach);
                });
                if (pointsFromAllComplete > 0) {
                    const finalProgressWithAllCompletePoints = {
                        ...finalProgress,
                        totalScore: finalProgress.totalScore + pointsFromAllComplete,
                    };
                    setProgress(finalProgressWithAllCompletePoints);
                    await saveGameProgress(finalProgressWithAllCompletePoints, activeChild.id);
                }
            }
        }
        // --- END ALL LEVELS COMPLETE ACHIEVEMENT CHECKING ---
    } else {
        setCurrentLevelIndex(nextLevelIdx);
        loadLevel(nextLevelIdx);
    }
  };

  // Updated useEffect to lock screen orientation and load the first level
  useEffect(() => {
    // Lock to landscape orientation
    async function setLandscapeOrientation() {
      await ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.LANDSCAPE
      );
    }

    // Load sounds
    async function loadSounds() {
      const correctSoundObject = new Audio.Sound();
      const wrongSoundObject = new Audio.Sound();
      const successSoundObject = new Audio.Sound();

      try {
        // Add error handling for each sound file
        try {
          await correctSoundObject.loadAsync(
            require("@/assets/sounds/correct.mp3")
          );
          setCorrectSound(correctSoundObject);
        } catch (error) {
          console.log("Could not load correct sound:", error);
        }

        try {
          await wrongSoundObject.loadAsync(
            require("@/assets/sounds/wrong.mp3")
          );
          setWrongSound(wrongSoundObject);
        } catch (error) {
          console.log("Could not load wrong sound:", error);
        }

        try {
          await successSoundObject.loadAsync(
            require("@/assets/sounds/correct.mp3")
          );
          setSuccessSound(successSoundObject);
        } catch (error) {
          console.log("Could not load success sound:", error);
        }
      } catch (error) {
        console.error("Error in sound loading process", error);
      }
    }

    // Initialize level start time
    levelStartTime.current = Date.now();

    setLandscapeOrientation();
    loadSounds();
    loadLevel(0);

    return () => {
      if (correctSound) correctSound.unloadAsync();
      if (wrongSound) wrongSound.unloadAsync();
      if (successSound) successSound.unloadAsync();
    };
  }, []);

  // This useEffect will load the saved progress when the component mounts
  useEffect(() => {
    const loadSavedProgress = async () => {
      // Reset all game-related state when child changes
      setIsLoading(true);
      setShowSuccessModal(false);
      setIsGameCompleted(false);
      setShowLevelIntroModal(false);
      setShowHintModal(false);
      setShowSubHint(false);
      setSelectedLetters([]);
      
      if (activeChild) {
        // Declare the variable outside the try block so it's accessible in finally
        let savedProgress: WordGameProgress | undefined;
        
        try {
          console.log(`Loading word game progress for child: ${activeChild.id}`);
          savedProgress = await loadGameProgress(activeChild.id);
          console.log('Loaded progress:', JSON.stringify(savedProgress));
          
          // Completely reset the previous progress before setting new progress
          setProgress(savedProgress);
          
          // If we have a current level saved, set it
          if (savedProgress.currentLevel >= 0) {
            setCurrentLevelIndex(savedProgress.currentLevel);
          } else {
            setCurrentLevelIndex(0); // Explicitly reset to level 0 if no saved level
          }
        } catch (error) {
          console.error("Error loading progress:", error);
          // Set default progress specific to this child
          const defaultProgress = {...DEFAULT_PROGRESS, childId: activeChild.id};
          setProgress(defaultProgress);
          setCurrentLevelIndex(0);
          // Update savedProgress so we can use it safely in finally
          savedProgress = defaultProgress;
        } finally {
          setIsLoading(false);
          
          // Fade in animation
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }).start();
          
          // Now load the correct level - savedProgress is now accessible
          try {
            const levelToLoad = savedProgress?.currentLevel ?? 0;
            console.log(`Loading level: ${levelToLoad}`);
            loadLevel(levelToLoad);
          } catch (err) {
            console.error("Error loading level:", err);
            // Fallback to level 0 if anything goes wrong
            loadLevel(0);
          }
        }
      } else {
        setIsLoading(false);
        // Set a temporary default progress 
        setProgress(DEFAULT_PROGRESS);
        setCurrentLevelIndex(0);
        loadLevel(0);
      }
    };

    loadSavedProgress();
  }, [activeChild]);

  const renderAchievementUnlockedModalWG = () => {
    if (!newlyEarnedAchievementWG) return null;
    // Use same modal structure as other games, just different state variable
    return (
      <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
        <View style={{ backgroundColor: 'white', borderRadius: 20, padding: 24, width: '85%', maxWidth: 380, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5 }}>
          <View style={{ position: 'absolute', top: -40, backgroundColor: '#f59e0b', width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: 'white' }}>
            <Ionicons name={(newlyEarnedAchievementWG.icon_name as any) || "star"} size={36} color="white" />
          </View>
          <Text style={{ fontWeight: 'bold', fontSize: 20, color: '#b45309', marginTop: 48, marginBottom: 8, textAlign: 'center' }}>
            Achievement Unlocked!
          </Text>
          <Text style={{ fontWeight: 'bold', fontSize: 24, color: '#374151', marginBottom: 8, textAlign: 'center' }}>
            {newlyEarnedAchievementWG.name}
          </Text>
          <Text style={{ fontSize: 14, color: '#4b5563', textAlign: 'center', marginBottom: 16 }}>
            {newlyEarnedAchievementWG.description}
          </Text>
          <Text style={{ fontWeight: 'bold', fontSize: 18, color: '#f59e0b', marginBottom: 24 }}>
            +{newlyEarnedAchievementWG.points} Points!
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: '#f59e0b', paddingVertical: 12, paddingHorizontal: 40, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1.41, elevation: 2 }}
            onPress={() => setNewlyEarnedAchievementWG(null)}
          >
            <Text style={{ fontWeight: 'bold', color: 'white', fontSize: 16, textAlign: 'center' }}>
              Awesome!
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

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
      // Play success sound
      if (successSound) {
        successSound.replayAsync();
      }

      // Animate word bounce
      Animated.spring(bounceValue, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }).start(() => {
        setShowSuccessModal(true);
        setTimeout(() => {
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
          correctSound.replayAsync();
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
          wrongSound.replayAsync();
        }
      }
    } else {
      if (wrongSound) {
        wrongSound.replayAsync();
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

  return (
    <View ref={containerRef} className="flex-1 bg-primary-50">
      <StatusBar style="dark" translucent backgroundColor="transparent" />
      {renderAchievementUnlockedModalWG()}

      {/* Background decorative elements */}
      <View className="absolute top-5 left-5">
        <View className="w-12 h-12 rounded-full bg-primary-200 opacity-50" />
      </View>
      <View className="absolute bottom-10 right-10">
        <View className="w-16 h-16 rounded-full bg-secondary-200 opacity-30" />
      </View>

      {/* Top navigation bar with all elements aligned horizontally */}
      <View className="flex-row justify-between items-center px-4 pt-8">
        {/* Back button */}
        <TouchableOpacity
          className="w-12 h-12 rounded-full bg-white items-center justify-center shadow-md border-2 border-primary-200"
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color="#7b5af0" />
        </TouchableOpacity>

        {/* Question text in the middle */}
        <View className="flex-1 mx-3 bg-white/95 px-5 py-3 rounded-2xl shadow-md border-2 border-secondary-100">
          <Text
            variant="medium"
            className="text-lg text-primary-700 text-center"
            numberOfLines={2}
          >
            {currentQuestion}
          </Text>
        </View>

        {/* Level navigation controls */}
        <View className="flex-row items-center">
          {/* Level selector button */}
          <TouchableOpacity
            className="w-12 h-12 rounded-full bg-white items-center justify-center shadow-md border-2 border-accent-200 mr-2"
            onPress={() => setShowLevelSelect(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="list" size={22} color="#7b5af0" />
          </TouchableOpacity>
          
          {/* Level indicator */}
          <View className="flex-row items-center bg-white px-4 py-2 rounded-full shadow-md border-2 border-primary-200">
            <Text variant="bold" className="text-primary-700">
              {currentLevelIndex + 1}/{gameLevels.length}
            </Text>
          </View>
        </View>
      </View>


      {/* Main content area */}
      <View className="flex-1 flex-row justify-between items-center px-5">
        {/* Left character */}
        <View className="w-[15%] items-center justify-center">
          <View className="w-24 h-24 bg-white rounded-full items-center justify-center shadow-lg border-4 border-secondary-200">
            <Image
              source={getImageSource(gameLevels[currentLevelIndex].image)}
              className="w-20 h-20 rounded-full"
              resizeMode="cover"
            />
          </View>
        </View>

        {/* Center game area */}
        <View className="w-[70%] items-center justify-center">
          {/* Word to guess */}
          <Animated.View
            className="flex-row items-center justify-center py-4 px-6 bg-white/80 rounded-3xl shadow-md mb-5 border-2 border-primary-100"
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
                ref={(ref) => (wordSlotRefs.current[index] = ref)}
                className="w-14 h-14 justify-center items-center mx-1.5 relative"
              >
                <Text variant="bold" className="text-4xl text-primary-700 pt-3">
                  {char !== "_" ? char : ""}
                </Text>
                {char === "_" && (
                  <View className="absolute bottom-0 w-12 h-1.5 bg-primary-500 rounded-full" />
                )}
              </View>
            ))}
          </Animated.View>

          {/* Letter choices */}
          <View className="flex-row flex-wrap justify-center w-full pb-6">
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
                  ref={(ref) => (letterRefs.current[index] = ref)}
                  className={`w-16 h-16 rounded-full m-2 justify-center items-center shadow-lg border-2 ${
                    isGreyedOut
                      ? "bg-gray-300 border-gray-400 opacity-70"
                      : "bg-secondary-500 border-secondary-300"
                  }`}
                  onPress={() => handleLetterPress(letter, index)}
                  disabled={isDisabled}
                  activeOpacity={0.8}
                >
                  <Text variant="bold" className="text-white text-2xl">
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
            className="w-20 h-20 bg-white rounded-full justify-center items-center shadow-lg border-4 border-accent-200"
            onPress={() => setShowHintModal(true)}
            activeOpacity={0.8}
          >
            <Image
              source={require("@/assets/images/info.png")}
              className="w-16 h-16 rounded-full"
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
          <Text variant="bold" className="text-3xl text-primary-600 shadow">
            {animatingLetter.letter}
          </Text>
        </Animated.View>
      )}

      {/* Success Modal */}
      <Modal transparent={true} visible={showSuccessModal} animationType="fade">
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-white rounded-3xl p-6 pt-8 w-4/5 items-center shadow-xl border-4 border-primary-100">
            {/* Decorative elements */}
            <View className="absolute -top-6 left-1/2 -ml-12 w-24 h-24 bg-primary-100 rounded-full items-center justify-center border-4 border-white shadow-lg">
              <Text className="text-5xl">🎉</Text>
            </View>
            <View className="absolute top-3 left-6">
              <View className="w-8 h-8 rounded-full bg-accent-200 opacity-60" />
            </View>
            <View className="absolute bottom-4 right-8">
              <View className="w-6 h-6 rounded-full bg-primary-200 opacity-50" />
            </View>

            {/* Title with styling matching app */}
            <Text
              variant="bold"
              className="text-3xl text-primary-600 mb-3 mt-2"
            >
              Good Job!
            </Text>

            {/* Word display with highlight */}
            <View className="bg-primary-50/70 w-full rounded-2xl px-4 py-4 mb-6 border-2 border-primary-100">
              <Text
                variant="medium"
                className="text-lg text-primary-700 text-center mb-2"
              >
                You correctly guessed the word:
              </Text>
              <View className="flex-row justify-center items-center">
                {currentWord.split("").map((letter, index) => (
                  <View
                    key={index}
                    className="w-12 h-12 mx-1 justify-center items-center bg-white rounded-lg shadow-sm border border-primary-200"
                  >
                    <Text variant="bold" className="text-2xl text-primary-700">
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
                  className="bg-secondary-500 py-3 px-5 rounded-full shadow-lg border-2 border-secondary-400"
                  onPress={() => {
                    setShowSuccessModal(false);
                    setCurrentLevelIndex(currentLevelIndex - 1);
                    loadLevel(currentLevelIndex - 1);
                  }}
                  activeOpacity={0.7}
                >
                  <Text variant="bold" className="text-white text-sm">Previous</Text>
                </TouchableOpacity>
              ) : (
                <View style={{ width: 100 }} /> /* Empty spacer */
              )}
              
              {/* Next level or play again button */}
              <TouchableOpacity
                className="bg-primary-500 py-3 px-5 rounded-full shadow-lg border-2 border-primary-400 active:scale-95"
                onPress={goToNextLevel}
                activeOpacity={0.7}
              >
                <Text variant="bold" className="text-white text-sm">
                  {isGameCompleted ? "Play Again" : "Next Level"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Game Completed Modal */}
      <Modal transparent={true} visible={isGameCompleted} animationType="fade">
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          className="flex-1 bg-black/50"
        >
          <View className="flex-1 justify-center items-center px-4 py-10">
            <View className="bg-white rounded-3xl p-6 w-[70%] items-center shadow-xl border-4 border-primary-100">
              {/* Trophy decoration on top - repositioned to be more visible */}
              <View className="absolute -top-6 left-1/2 -ml-10 w-20 h-20 bg-accent-100 rounded-full items-center justify-center border-4 border-white shadow-lg">
                <Text className="text-4xl">🏆</Text>
              </View>

              {/* Decorative elements - positions adjusted */}
              <View className="absolute top-4 left-6">
                <View className="w-8 h-8 rounded-full bg-primary-200 opacity-60" />
              </View>
              <View className="absolute bottom-4 right-6">
                <View className="w-6 h-6 rounded-full bg-secondary-200 opacity-50" />
              </View>

              {/* Confetti-like elements - made smaller and repositioned */}
              <View className="absolute top-12 left-10">
                <Text className="text-xl">✨</Text>
              </View>
              <View className="absolute bottom-6 left-6">
                <Text className="text-xl">🎊</Text>
              </View>
              <View className="absolute top-8 right-10">
                <Text className="text-xl">🎉</Text>
              </View>

              {/* Title with styling matching app */}
              <Text
                variant="bold"
                className="text-2xl text-primary-600 mb-3 mt-8"
              >
                Congratulations!
              </Text>

              {/* Completion message - made more compact */}
              <View className="bg-primary-50/80 w-full rounded-2xl px-4 py-3 mb-4 border-2 border-primary-100">
                <Text
                  variant="medium"
                  className="text-lg text-primary-700 text-center"
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
                onPress={async () => {
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
      <Modal transparent={true} visible={showLevelIntroModal} animationType="fade">
        <View className="flex-1 justify-center items-center bg-black/50 px-4">
          <View className="bg-white rounded-2xl p-3 w-[80%] max-w-md items-center shadow-xl border-4 border-primary-100">
            {/* Close button - repositioned to be more visible */}
            <TouchableOpacity
              className="absolute -top-3 -right-3 w-10 h-10 bg-white rounded-full items-center justify-center shadow-lg border-2 border-primary-300 z-10"
              onPress={() => setShowLevelIntroModal(false)}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={20} color="#7b5af0" />
            </TouchableOpacity>
            
            {/* Decorative elements - made smaller and moved closer to edges */}
            <View className="absolute top-2 left-2">
              <View className="w-5 h-5 rounded-full bg-primary-200 opacity-60" />
            </View>
            <View className="absolute bottom-2 right-2">
              <View className="w-3 h-3 rounded-full bg-secondary-200 opacity-50" />
            </View>

            {/* Level title - reduced margin */}
            <Text
              variant="bold"
              className="text-xl text-primary-600 mb-1"
            >
              Level {currentLevelIndex + 1}
            </Text>

            {/* Image - slightly smaller */}
            <View className="w-1/2 aspect-square bg-white rounded-xl items-center justify-center shadow-lg border-2 border-secondary-200 mb-2 overflow-hidden">
              <Image
                source={getImageSource(gameLevels[currentLevelIndex].image)}
                className="w-full h-full"
                resizeMode="cover"
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
      <Modal transparent={true} visible={showHintModal} animationType="fade">
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
            
            {/* Decorative elements */}
            <View className="absolute top-2 left-2">
              <View className="w-5 h-5 rounded-full bg-accent-200 opacity-60" />
            </View>
            <View className="absolute bottom-2 right-2">
              <View className="w-3 h-3 rounded-full bg-secondary-200 opacity-50" />
            </View>

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
              >
                {gameLevels[currentLevelIndex].hint}
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
                >
                  {gameLevels[currentLevelIndex].subHint}
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
      <Modal transparent={true} visible={showLevelSelect} animationType="fade">
        <View className="flex-1 justify-center items-center bg-black/50 px-4">
          <View className="bg-white rounded-2xl p-3 max-h-[80%] w-[80%] items-center shadow-xl border-4 border-primary-100">
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
            
            <ScrollView className="w-full max-h-[250px]">
              <View className="flex-row flex-wrap justify-center">
                {gameLevels.map((level, index) => {
                  // Use isLevelUnlocked which now considers current level too
                  const isUnlocked = isLevelUnlocked(progress, index);
                  const isCompleted = progress.completedLevels.includes(index);
                  const isCurrent = index === currentLevelIndex;
                  
                  return (
                    <TouchableOpacity
                      key={index}
                      className={`w-16 h-16 m-1 rounded-lg justify-center items-center shadow-md border 
                        ${isCurrent ? 'bg-primary-600 border-primary-300' : 
                          isCompleted ? 'bg-green-500 border-green-300' : 
                            isUnlocked ? 'bg-secondary-500 border-secondary-300' : 
                              'bg-gray-300 border-gray-400 opacity-60'}`}
                      onPress={() => selectLevel(index)}
                      disabled={!isUnlocked}
                      activeOpacity={0.8}
                    >
                      <Text variant="bold" className="text-white text-lg">{index + 1}</Text>
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