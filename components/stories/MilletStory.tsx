import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  Dimensions,
  Animated,
  Modal,
  ScrollView,
} from 'react-native';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from 'expo-router';
// Added imports for activity tracking
import StoryProgress from './StoryProgress';
import { saveActivity } from '@/lib/utils';
import { useChild } from '@/context/ChildContext';
import { StatusBar } from "expo-status-bar";
import { Text } from "@/components/StyledText";

const { width, height } = Dimensions.get('window');

interface StoryPage {
  text: string;
  image: any;
  altText: string;
}

interface StoryQuestion {
  question: string;
  options: string[];
  correctAnswer: number; // index of the correct option
}

const MilletStory: React.FC = () => {
  const router = useRouter();
  // Added context hook for activity tracking
  const { activeChild } = useChild();
  // Story content - The Tale of Nnambi and the Millet
  const coinImage = require('@/assets/images/coin.png'); // Placeholder image
  const storyPages: StoryPage[] = [
    {
      text: "Long ago when the Baganda people first settled in their lands, they did not know how to grow food. They survived by hunting animals and gathering wild fruits.",
      image: coinImage,
      altText: "People hunting and gathering wild fruits"
    },
    {
      text: "A woman named Nnambi lived with her husband in a small hut. Each day grew harder as there were more people but less food to be found in the forests.",
      image: coinImage,
      altText: "Nnambi and her husband looking worried about food"
    },
    {
      text: "One night, Nnambi had a dream. A beautiful spirit came to her and said, 'Follow the morning star until you reach the red hill. There you will find what your people need.'",
      image: coinImage,
      altText: "Nnambi dreaming of a spirit speaking to her"
    },
    {
      text: "When she awoke, Nnambi told no one about her dream. Before sunrise, she followed the morning star, walking for many hours until she reached a hill with reddish soil.",
      image: coinImage,
      altText: "Nnambi walking alone following the morning star"
    },
    {
      text: "On the hill grew tall plants with golden seeds that Nnambi had never seen before. The spirit appeared again and said, 'This is millet. Take these seeds and learn to grow them.'",
      image: coinImage,
      altText: "Nnambi discovering millet plants on the red hill"
    },
    {
      text: "The spirit showed Nnambi how to plant the seeds, tend the young plants, and harvest the grain when it was ripe. She also learned how to grind the millet and cook it.",
      image: coinImage,
      altText: "The spirit teaching Nnambi how to plant and prepare millet"
    },
    {
      text: "Nnambi returned to her village carrying the precious millet seeds. She taught everyone what she had learned, and soon fields of golden millet were growing throughout the land.",
      image: coinImage,
      altText: "Nnambi sharing millet seeds with villagers"
    },
    {
      text: "The Baganda people no longer went hungry. They honored Nnambi as a hero, and to this day, millet porridge is a sacred food in Buganda, used in many important ceremonies and celebrations.",
      image: coinImage,
      altText: "People celebrating with millet porridge at a ceremony"
    },
  ];

  const [currentPage, setCurrentPage] = useState<number>(0);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [isReading, setIsReading] = useState<boolean>(false);
  const [pageSound, setPageSound] = useState<Audio.Sound | null>(null);
  const [textSize, setTextSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [readingSpeed, setReadingSpeed] = useState<number>(0.8); // Default speed
  const [settingsVisible, setSettingsVisible] = useState<boolean>(false);
  const [showQuestions, setShowQuestions] = useState<boolean>(false);
  const [userAnswers, setUserAnswers] = useState<number[]>(Array(5).fill(-1));
  const [quizCompleted, setQuizCompleted] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const readTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const storyQuestions: StoryQuestion[] = [
    {
      question: "How did the Baganda people survive before they knew how to grow food?",
      options: ["By trading with neighbors", "By hunting animals and gathering wild fruits", "By fishing in lakes", "By stealing from other tribes"],
      correctAnswer: 1
    },
    {
      question: "What did the spirit in Nnambi's dream tell her to do?",
      options: ["Build a new village", "Follow the morning star to the red hill", "Pray to the ancestors", "Search for a hidden treasure"],
      correctAnswer: 1
    },
    {
      question: "What did Nnambi discover on the red hill?",
      options: ["Gold and jewels", "A magic spring", "Tall plants with golden seeds (millet)", "A new type of animal"],
      correctAnswer: 2
    },
    {
      question: "What did the spirit teach Nnambi?",
      options: ["How to hunt better", "How to plant, tend, harvest, and cook millet", "How to predict the weather", "How to make clothing"],
      correctAnswer: 1
    },
    {
      question: "Why is millet porridge considered sacred in Buganda?",
      options: ["Because it has healing properties", "Because it is used in many important ceremonies", "Because only royalty can eat it", "Because it glows in the dark"],
      correctAnswer: 1
    }
  ];
  
  // Load sounds
  useEffect(() => {
    async function loadSounds() {
      const pageTurnSound = new Audio.Sound();
      try {
        await pageTurnSound.loadAsync(require('@/assets/audio/page-turn.mp3'));
        setPageSound(pageTurnSound);
      } catch (error) {
        console.error('Error loading sounds', error);
      }
    }

    loadSounds();

    // Cleanup on unmount
    return () => {
      if (pageSound) pageSound.unloadAsync();
      if (readTimeoutRef.current) clearTimeout(readTimeoutRef.current);
      Speech.stop();
    };
  }, []);

  // Split current page text into words
  const words = storyPages[currentPage].text.split(' ');

  const handlePageTurn = (direction: 'next' | 'prev') => {
    if (isReading) {
      // Stop reading if in progress
      Speech.stop();
      if (readTimeoutRef.current) clearTimeout(readTimeoutRef.current);
      setIsReading(false);
      setHighlightedIndex(-1);
    }

    // Play page turn sound
    if (pageSound) {
      pageSound.replayAsync();
    }

    // Page transition animation
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start();

    // Set new page after fade out
    setTimeout(() => {
      if (direction === 'next' && currentPage < storyPages.length - 1) {
        setCurrentPage(currentPage + 1);
      } else if (direction === 'prev' && currentPage > 0) {
        setCurrentPage(currentPage - 1);
      }
    }, 300);
  };

  const readStory = () => {
    if (isReading) {
      // Stop reading
      Speech.stop();
      if (readTimeoutRef.current) clearTimeout(readTimeoutRef.current);
      setIsReading(false);
      setHighlightedIndex(-1);
      return;
    }

    setIsReading(true);

    // Start reading word by word
    const readNextWord = (index: number) => {
      if (index < words.length) {
        setHighlightedIndex(index);

        // Read current word
        Speech.speak(words[index], {
          rate: readingSpeed,
          onDone: () => {
            // Schedule next word after a short delay
            readTimeoutRef.current = setTimeout(() => {
              readNextWord(index + 1);
            }, 200);
          }
        });
      } else {
        // Finished reading this page
        setIsReading(false);
        setHighlightedIndex(-1);
      }
    };

    readNextWord(0);
  };

  const getTextSize = (): number => {
    switch(textSize) {
      case 'small': return 16;
      case 'large': return 22;
      default: return 18;
    }
  };

  const handleAnswerSelection = (questionIndex: number, answerIndex: number) => {
    const newAnswers = [...userAnswers];
    newAnswers[questionIndex] = answerIndex;
    setUserAnswers(newAnswers);
  };

  const handleQuizSubmit = async () => {
    let correctAnswers = 0;
    storyQuestions.forEach((question, index) => {
      if (userAnswers[index] === question.correctAnswer) {
        correctAnswers++;
      }
    });

    // Added activity saving logic
    if (activeChild) {
      await saveActivity({
        child_id: activeChild.id,
        activity_type: 'stories',
        activity_name: 'Completed Nnambi and the Millet Story Quiz',
        score: `${correctAnswers}/${storyQuestions.length}`,
        completed_at: new Date().toISOString(),
        details: `Scored ${correctAnswers} out of ${storyQuestions.length} questions correctly in the Nnambi and the Millet story quiz`
      });
    }

    setScore(correctAnswers);
    setQuizCompleted(true);
  };

  const handleRestartQuiz = () => {
    setUserAnswers(Array(storyQuestions.length).fill(-1));
    setQuizCompleted(false);
    setScore(0);
  };

  const handleQuizComplete = (score: number, total: number) => {
    console.log(`Quiz completed with score ${score}/${total}`);
  };

  return (
    <StoryProgress
      storyId="millet"
      storyTitle="Nnambi and the Millet"
      totalPages={storyPages.length}
      currentPage={currentPage}
      onQuizComplete={handleQuizComplete}
    >
      
        <StatusBar style="dark" />
        {!showQuestions ? (
          // Story UI
          <View className="flex-1 flex-row p-5 pt-12">
            {/* Back Button */}
            <TouchableOpacity
              className="absolute top-6 left-4 z-10 bg-amber-50/80 p-2 rounded-full shadow-sm"
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#8B4513" />
            </TouchableOpacity>

            {/* Left Panel: Story Image */}
            <Animated.View
              className="flex-1 bg-white rounded-3xl p-4 mr-3 shadow-md border border-amber-200"
              style={{ opacity: fadeAnim }}
            >
              <Image
                source={storyPages[currentPage].image}
                className="w-full h-full rounded-2xl"
                resizeMode="contain"
                accessibilityLabel={storyPages[currentPage].altText}
              />
            </Animated.View>

            {/* Right Panel: Text and Controls */}
            <View className="flex-1 pl-3">
              {/* Settings button */}
              <View className="items-end mb-3">
                <TouchableOpacity
                  className="bg-amber-700 px-4 py-2 rounded-full shadow-sm flex-row items-center"
                  onPress={() => setSettingsVisible(true)}
                  accessibilityLabel="Open settings"
                  accessibilityRole="button"
                >
                  <Ionicons name="settings-outline" size={18} color="#fff" />
                  <Text className="ml-1.5 text-white">Settings</Text>
                </TouchableOpacity>
              </View>

              {/* Story Text */}
              <Animated.View
                className="flex-1 bg-white rounded-3xl p-5 mb-3 shadow-md border border-amber-200"
                style={{ opacity: fadeAnim }}
              >
                <Text className="text-slate-800 text-sm pt-3">
                  {words.map((word, index) => (
                    <Text
                      key={index}
                      className={`${
                        index === highlightedIndex ? "bg-amber-200 rounded" : ""
                      }`}
                      style={{ fontSize: getTextSize() }}
                    >
                      {word}{" "}
                    </Text>
                  ))}
                </Text>
              </Animated.View>

              {/* Navigation and Controls */}
              <View className="flex-row justify-between items-center mb-3">
                <TouchableOpacity
                  className={`w-12 h-12 rounded-full justify-center items-center shadow ${
                    currentPage === 0 ? "bg-gray-300" : "bg-amber-700"
                  }`}
                  onPress={() => handlePageTurn("prev")}
                  disabled={currentPage === 0}
                  accessibilityLabel="Previous page"
                  accessibilityRole="button"
                  accessibilityState={{ disabled: currentPage === 0 }}
                >
                  <Ionicons name="chevron-back" size={24} color="#fff" />
                </TouchableOpacity>

                {currentPage === storyPages.length - 1 ? (
                  <TouchableOpacity
                    className="bg-indigo-700 py-3 px-6 rounded-full shadow-md"
                    onPress={() => setShowQuestions(true)}
                    accessibilityLabel="Take the quiz"
                    accessibilityRole="button"
                  >
                    <Text variant="bold" className="text-white text-lg">
                      Take Quiz
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    className={`py-3 px-6 rounded-full shadow-md ${
                      isReading ? "bg-red-600" : "bg-emerald-700"
                    }`}
                    onPress={readStory}
                    accessibilityLabel={isReading ? "Stop reading" : "Read to Me"}
                    accessibilityRole="button"
                  >
                    <Text variant="bold" className="text-white text-lg">
                      {isReading ? "Stop" : "Read to Me"}
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  className={`w-12 h-12 rounded-full justify-center items-center shadow ${
                    currentPage === storyPages.length - 1
                      ? "bg-gray-300"
                      : "bg-amber-700"
                  }`}
                  onPress={() => handlePageTurn("next")}
                  disabled={currentPage === storyPages.length - 1}
                  accessibilityLabel="Next page"
                  accessibilityRole="button"
                  accessibilityState={{
                    disabled: currentPage === storyPages.length - 1,
                  }}
                >
                  <Ionicons name="chevron-forward" size={24} color="#fff" />
                </TouchableOpacity>
              </View>

              {/* Page indicator */}
              <View className="flex-row justify-center">
                {storyPages.map((_, index) => (
                  <View
                    key={index}
                    className={`mx-1 ${
                      index === currentPage
                        ? "w-4 h-4 rounded-full bg-amber-700"
                        : "w-2.5 h-2.5 rounded-full bg-amber-300"
                    }`}
                  />
                ))}
              </View>
            </View>
          </View>
        ) : (
          // Quiz UI
          <View className="flex-1 pt-3 px-5">
            {/* Back button and title row */}
            <View className="flex-row items-center justify-between mt-3 mb-2">
              <TouchableOpacity
                className="p-2 rounded-full bg-white/80 shadow-sm"
                onPress={() => {
                  setShowQuestions(false);
                  if (quizCompleted) {
                    setQuizCompleted(false);
                    setUserAnswers(Array(storyQuestions.length).fill(-1));
                  }
                }}
              >
                <Ionicons name="arrow-back" size={24} color="#8B4513" />
              </TouchableOpacity>

              <Text
                variant="bold"
                className={`text-xl ${
                  quizCompleted ? "text-indigo-700" : "text-amber-800"
                } flex-1 text-center mr-10`}
              >
                {quizCompleted
                  ? score === storyQuestions.length
                    ? "Perfect Score! 🎉"
                    : `Your Score: ${score}/${storyQuestions.length}`
                  : "Nnambi and the Millet - Quiz"}
              </Text>
            </View>

            {/* Main quiz container without border */}
            <View className="flex-1 rounded-3xl px-6">
              {/* Score display for completed quiz */}
              {quizCompleted && (
                <View className="bg-indigo-50 p-4 rounded-xl mb-5 items-center">
                  <Text variant="bold" className="text-2xl text-indigo-700">
                    {score === storyQuestions.length
                      ? "You got all answers correct!"
                      : `You got ${score} out of ${storyQuestions.length} correct`}
                  </Text>
                </View>
              )}

              <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={true}
              >
                {!quizCompleted ? (
                  <>
                    {storyQuestions.map((question, qIndex) => (
                      <View
                        key={qIndex}
                        className="mb-6 bg-amber-50 p-4 rounded-xl shadow-sm"
                      >
                        <Text
                          variant="bold"
                          className="text-lg text-slate-800 mb-3"
                        >
                          {qIndex + 1}. {question.question}
                        </Text>

                        {question.options.map((option, oIndex) => (
                          <TouchableOpacity
                            key={oIndex}
                            className={`p-3.5 rounded-lg mb-2 ${
                              userAnswers[qIndex] === oIndex
                                ? "bg-amber-600 border border-amber-700"
                                : "bg-amber-100 border border-amber-200"
                            }`}
                            onPress={() => handleAnswerSelection(qIndex, oIndex)}
                          >
                            <Text
                              className={`${
                                userAnswers[qIndex] === oIndex
                                  ? "text-white"
                                  : "text-slate-700"
                              }`}
                            >
                              {option}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    ))}

                    {/* Submit button moved inside ScrollView at the end */}
                    <View className="mt-8 mb-4">
                      <TouchableOpacity
                        className={`py-4 rounded-xl items-center shadow-sm ${
                          userAnswers.includes(-1)
                            ? "bg-gray-300"
                            : "bg-amber-700"
                        }`}
                        onPress={handleQuizSubmit}
                        disabled={userAnswers.includes(-1)}
                      >
                        <Text variant="bold" className="text-white text-lg">
                          Submit Answers
                        </Text>
                      </TouchableOpacity>

                      {userAnswers.includes(-1) && (
                        <Text className="text-amber-700 text-center mt-3 italic">
                          Please answer all questions before submitting
                        </Text>
                      )}
                    </View>
                  </>
                ) : (
                  // Results view
                  <>
                    <View className="mt-2">
                      {storyQuestions.map((question, qIndex) => (
                        <View
                          key={qIndex}
                          className="mb-6 bg-slate-50 p-4 rounded-xl shadow-sm"
                        >
                          <Text
                            variant="bold"
                            className="text-lg text-slate-800 mb-3"
                          >
                            {qIndex + 1}. {question.question}
                          </Text>

                          {question.options.map((option, oIndex) => (
                            <View
                              key={oIndex}
                              className={`p-3.5 rounded-lg mb-2 flex-row justify-between items-center ${
                                oIndex === question.correctAnswer
                                  ? "bg-emerald-100 border border-emerald-300"
                                  : userAnswers[qIndex] === oIndex
                                  ? "bg-red-100 border border-red-300"
                                  : "bg-white border border-gray-200"
                              }`}
                            >
                              <Text
                                className={`text-base ${
                                  oIndex === question.correctAnswer
                                    ? "text-emerald-800 font-medium"
                                    : userAnswers[qIndex] === oIndex
                                    ? "text-red-800 font-medium"
                                    : "text-slate-600"
                                }`}
                              >
                                {option}
                              </Text>
                              {oIndex === question.correctAnswer && (
                                <View className="bg-emerald-600 w-6 h-6 rounded-full items-center justify-center">
                                  <Ionicons
                                    name="checkmark-sharp"
                                    size={16}
                                    color="#fff"
                                  />
                                </View>
                              )}
                              {userAnswers[qIndex] === oIndex &&
                                userAnswers[qIndex] !== question.correctAnswer && (
                                  <View className="bg-red-600 w-6 h-6 rounded-full items-center justify-center">
                                    <Ionicons
                                      name="close"
                                      size={16}
                                      color="#fff"
                                    />
                                  </View>
                                )}
                            </View>
                          ))}
                        </View>
                      ))}
                    </View>

                    {/* Try Again button moved inside ScrollView at the end */}
                    <View className="mt-8 mb-4">
                      <TouchableOpacity
                        className="bg-indigo-700 py-4 rounded-xl items-center shadow-sm"
                        onPress={handleRestartQuiz}
                      >
                        <Text variant="bold" className="text-white text-lg">
                          Try Again
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </ScrollView>
            </View>
          </View>
        )}

        {/* Settings Modal */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={settingsVisible}
          onRequestClose={() => setSettingsVisible(false)}
        >
          <View className="flex-1 bg-black/40 justify-center items-center">
            <View className="bg-white rounded-2xl p-4 w-3/4 max-w-sm shadow-lg border border-amber-200">
              <View className="items-center mb-1">
                <View className="bg-amber-100 rounded-full p-2 mb-1">
                  <Ionicons name="settings" size={24} color="#8B4513" />
                </View>
                <Text className="text-lg text-amber-800">Story Settings</Text>
              </View>

              {/* Text Size Controls */}
              <View className="mt-3 mb-3">
                <Text className="text-sm text-slate-700 mb-1.5">Text Size</Text>
                <View className="flex-row justify-between">
                  <TouchableOpacity
                    onPress={() => setTextSize("small")}
                    className={`flex-1 py-2 mx-0.5 rounded-lg border ${
                      textSize === "small"
                        ? "bg-amber-700 border-amber-800"
                        : "bg-white border-slate-300"
                    }`}
                  >
                    <Text
                      className={`text-center text-sm ${
                        textSize === "small" ? "text-white" : "text-slate-700"
                      }`}
                    >
                      Small
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setTextSize("medium")}
                    className={`flex-1 py-2 mx-0.5 rounded-lg border ${
                      textSize === "medium"
                        ? "bg-amber-700 border-amber-800"
                        : "bg-white border-slate-300"
                    }`}
                  >
                    <Text
                      className={`text-center text-sm ${
                        textSize === "medium" ? "text-white" : "text-slate-700"
                      }`}
                    >
                      Medium
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setTextSize("large")}
                    className={`flex-1 py-2 mx-0.5 rounded-lg border ${
                      textSize === "large"
                        ? "bg-amber-700 border-amber-800"
                        : "bg-white border-slate-300"
                    }`}
                  >
                    <Text
                      className={`text-center text-sm ${
                        textSize === "large" ? "text-white" : "text-slate-700"
                      }`}
                    >
                      Large
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Reading Speed Controls */}
              <View className="mb-3">
                <Text className="text-sm text-slate-700 mb-1.5">
                  Reading Speed
                </Text>
                <View className="flex-row justify-between">
                  <TouchableOpacity
                    onPress={() => setReadingSpeed(0.5)}
                    className={`flex-1 py-2 mx-0.5 rounded-lg border ${
                      readingSpeed === 0.5
                        ? "bg-amber-700 border-amber-800"
                        : "bg-white border-slate-300"
                    }`}
                  >
                    <Text
                      className={`text-center text-sm ${
                        readingSpeed === 0.5 ? "text-white" : "text-slate-700"
                      }`}
                    >
                      Slow
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setReadingSpeed(0.8)}
                    className={`flex-1 py-2 mx-0.5 rounded-lg border ${
                      readingSpeed === 0.8
                        ? "bg-amber-700 border-amber-800"
                        : "bg-white border-slate-300"
                    }`}
                  >
                    <Text
                      className={`text-center text-sm ${
                        readingSpeed === 0.8 ? "text-white" : "text-slate-700"
                      }`}
                    >
                      Normal
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setReadingSpeed(1.5)}
                    className={`flex-1 py-2 mx-0.5 rounded-lg border ${
                      readingSpeed === 1.5
                        ? "bg-amber-700 border-amber-800"
                        : "bg-white border-slate-300"
                    }`}
                  >
                    <Text
                      className={`text-center text-sm ${
                        readingSpeed === 1.5 ? "text-white" : "text-slate-700"
                      }`}
                    >
                      Fast
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Close Button */}
              <TouchableOpacity
                className="bg-indigo-700 py-2.5 rounded-lg items-center shadow-sm"
                onPress={() => setSettingsVisible(false)}
              >
                <Text className="text-white text-sm">Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
    </StoryProgress>
  );
};

export default MilletStory;