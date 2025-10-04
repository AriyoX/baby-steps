import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Image,
  TouchableOpacity,
  Dimensions,
  Animated,
  Modal,
  ScrollView,
} from "react-native";
import { Audio } from "expo-av";
import * as Speech from "expo-speech";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
// Added imports for activity tracking
import StoryProgress from "./StoryProgress";
import { saveActivity } from "@/lib/utils";
import { useChild } from "@/context/ChildContext";
import { StatusBar } from "expo-status-bar";
import { Text } from "@/components/StyledText";

const { width, height } = Dimensions.get("window");

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

const WalumbeStory: React.FC = () => {
  const router = useRouter();
  // Added context hook for activity tracking
  const { activeChild } = useChild();
  // Story content - The Tale of Walumbe
  const coinImage = require("@/assets/images/coin.png"); // Placeholder image
  const storyPages: StoryPage[] = [
    {
      text: "After Kintu and Nambi came to Earth, they were followed by Walumbe, who was Death, Nambi's brother. At first, Walumbe lived peacefully among the people.",
      image: coinImage,
      altText: "Walumbe arriving on Earth after Kintu and Nambi",
    },
    {
      text: "One day, Walumbe asked Kintu to give him one of his daughters as a wife. Kintu refused, knowing that no good could come from such a union with Death.",
      image: coinImage,
      altText: "Walumbe speaking with Kintu who refuses his request",
    },
    {
      text: "Angered by the rejection, Walumbe began to take Kintu's children, one by one. He would hide them underground in the caverns where he lived, causing great sorrow.",
      image: coinImage,
      altText: "Walumbe taking children into underground caverns",
    },
    {
      text: "Kintu appealed to Gulu, the sky god. Gulu sent his son, Kayikuuzi, to capture Walumbe and take him back to the sky so he would stop bringing death to Earth.",
      image: coinImage,
      altText: "Kintu appealing to Gulu in the sky",
    },
    {
      text: "Kayikuuzi chased Walumbe across the land. Finally, Walumbe fled into the ground at a place now called Ttanda, and Kayikuuzi followed him into the deep caves.",
      image: coinImage,
      altText: "Kayikuuzi chasing Walumbe who is diving into the ground",
    },
    {
      text: "The chase went on for days. Each time Kayikuuzi almost caught Walumbe, the people above ground would make noise, warning Walumbe, who would escape deeper into the earth.",
      image: coinImage,
      altText: "People making noise above ground as the chase continues below",
    },
    {
      text: "Eventually, Kayikuuzi gave up. He told the people, 'Because you warned Walumbe, I cannot capture him. Now death will remain on Earth forever.'",
      image: coinImage,
      altText: "Kayikuuzi emerging from the ground speaking to the people",
    },
    {
      text: "To this day, the Baganda say that Walumbe still lives in the caves of Ttanda, and that is why death comes to all people. The caves remain a sacred and feared place.",
      image: coinImage,
      altText:
        "The caves of Ttanda with people paying respects from a distance",
    },
  ];

  const [currentPage, setCurrentPage] = useState<number>(0);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [isReading, setIsReading] = useState<boolean>(false);
  const [pageSound, setPageSound] = useState<Audio.Sound | null>(null);
  const [textSize, setTextSize] = useState<"small" | "medium" | "large">(
    "medium"
  );
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
      question: "Who was Walumbe in relation to Nambi?",
      options: ["Her father", "Her husband", "Her brother", "Her son"],
      correctAnswer: 2,
    },
    {
      question: "What did Walumbe ask from Kintu?",
      options: [
        "A piece of land",
        "One of his daughters as a wife",
        "Help building a home",
        "Food and shelter",
      ],
      correctAnswer: 1,
    },
    {
      question: "What did Walumbe do when Kintu refused his request?",
      options: [
        "Left peacefully",
        "Began taking Kintu's children one by one",
        "Asked Gulu for help",
        "Built his own kingdom",
      ],
      correctAnswer: 1,
    },
    {
      question: "Who did Gulu send to capture Walumbe?",
      options: ["Nambi", "Kintu", "Kayikuuzi", "A powerful animal"],
      correctAnswer: 2,
    },
    {
      question: "Why couldn't Kayikuuzi capture Walumbe?",
      options: [
        "Walumbe was too strong",
        "The people warned Walumbe by making noise",
        "Gulu changed his mind",
        "Kintu protected Walumbe",
      ],
      correctAnswer: 1,
    },
  ];
  // Load sounds
  useEffect(() => {
    async function loadSounds() {
      const pageTurnSound = new Audio.Sound();
      try {
        await pageTurnSound.loadAsync(require("@/assets/audio/page-turn.mp3"));
        setPageSound(pageTurnSound);
      } catch (error) {
        console.error("Error loading sounds", error);
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
  const words = storyPages[currentPage].text.split(" ");

  const handlePageTurn = (direction: "next" | "prev") => {
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
      }),
    ]).start();

    // Set new page after fade out
    setTimeout(() => {
      if (direction === "next" && currentPage < storyPages.length - 1) {
        setCurrentPage(currentPage + 1);
      } else if (direction === "prev" && currentPage > 0) {
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
          },
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
    switch (textSize) {
      case "small":
        return 16;
      case "large":
        return 22;
      default:
        return 18;
    }
  };

  const handleAnswerSelection = (
    questionIndex: number,
    answerIndex: number
  ) => {
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
        activity_type: "stories",
        activity_name: "Completed Walumbe Story Quiz",
        score: `${correctAnswers}/${storyQuestions.length}`,
        completed_at: new Date().toISOString(),
        details: `Scored ${correctAnswers} out of ${storyQuestions.length} questions correctly in the Walumbe story quiz`,
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
      storyId="walumbe"
      storyTitle="The Tale of Walumbe"
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
                <Text className="text-slate-800">
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
                    accessibilityLabel={
                      isReading ? "Stop reading" : "Read to Me"
                    }
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
                  : "The Tale of Walumbe - Quiz"}
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
                            onPress={() =>
                              handleAnswerSelection(qIndex, oIndex)
                            }
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
                                userAnswers[qIndex] !==
                                  question.correctAnswer && (
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

export default WalumbeStory;
