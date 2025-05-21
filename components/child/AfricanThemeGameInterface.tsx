"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import {
  View,
  Image,
  TouchableOpacity,
  Dimensions,
  ImageBackground,
  ScrollView,
  Animated,
  Easing,
  BackHandler,
} from "react-native"
import { StatusBar } from "expo-status-bar"
import { useRouter, usePathname, useFocusEffect } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import * as Speech from "expo-speech"
import { Text } from "@/components/StyledText"
import { TranslatedText } from "@/components/translated-text"
import { SafeAreaView } from "react-native-safe-area-context"
import * as ScreenOrientation from "expo-screen-orientation"
import { useCallback } from "react"
import { useChild } from "@/context/ChildContext"

// Define types
type LearningCard = {
  id: string
  title: string
  image: any
  description: string
  targetPage: string // Add this property to specify which page to navigate to
}

type NavItem = {
  id: string
  icon: any
  label: string
}

const AfricanThemeGameInterface: React.FC = () => {
  const [selectedLevel, setSelectedLevel] = useState<string>("Basic")
  const [selectedNavItem, setSelectedNavItem] = useState<string>("home")
  const [learningCards, setLearningCards] = useState<LearningCard[]>([])
  const router = useRouter()
  const { activeChild } = useChild()

  // Animation values for avatar
  const pulseAnim = useRef(new Animated.Value(1)).current
  const bounceAnim = useRef(new Animated.Value(0)).current

  useFocusEffect(
    useCallback(() => {
      console.log("AfricanThemeGameInterface focused - locking to landscape")
      const lockToLandscape = async () => {
        try {
          await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_LEFT)
        } catch (error) {
          console.error("Failed to lock orientation:", error)
        }
      }

      lockToLandscape()

      return () => {
        // No cleanup needed here as we want to keep landscape
        // when navigating to games
      }
    }, []),
  )

  useEffect(() => {
    console.log("AfricanThemeGameInterface arrived - locking to landscape")
    const lockToLandscape = async () => {
      try {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_LEFT)
      } catch (error) {
        console.error("Failed to lock orientation:", error)
      }
    }

    lockToLandscape()
  }, [])

  // Set up animation
  useEffect(() => {
    // Create combined animation sequence
    const pulseSequence = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    )

    const bounceSequence = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -3,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    )

    // Start animations
    pulseSequence.start()
    bounceSequence.start()

    return () => {
      // Clean up animations
      pulseSequence.stop()
      bounceSequence.stop()
    }
  }, [])

  // Add this effect to handle hardware back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
      // Navigate to parent gate instead of default back behavior
      router.push("/child/parent-gate")
      return true // Prevents default back behavior
    })

    return () => backHandler.remove() // Clean up on unmount
  }, [router])

  // Get the current path to determine which tab we're on
  const pathname = usePathname()
  const tabId = pathname.split("/").pop() || "profile" // Extract tab ID from path

  // Set the title based on the tab
  const [screenTitle, setScreenTitle] = useState("Games")

  useEffect(() => {
    // Set cards based on the selected tab
    switch (tabId) {
      case "profile": // Games
        setScreenTitle("Games")
        setLearningCards([
          {
            id: "words",
            title: "Words",
            image: require("@/assets/images/african-focus.png"),
            description: "Fill in the missing letters to complete the word",
            targetPage: "child/games/wordgame",
          },
          {
            id: "logic",
            title: "Logic",
            image: require("@/assets/images/african-logic.png"),
            description: "Solve puzzles inspired by popular Buganda heritage sites",
            targetPage: "child/games/puzzlegame",
          },
          {
            id: "cards",
            title: "Cards Matching",
            image: require("@/assets/images/cards-matching.png"),
            description: "Match the cards to learn about Buganda cultural items",
            targetPage: "child/games/cardgame",
          },
          {
            id: "learning",
            title: "Learning",
            image: require("@/assets/images/african-patterns.png"),
            description: "Learning common Luganda words and how they are used in sentences",
            targetPage: "child/games/learninggame",
          },
          {
            id: "numbers",
            title: "Numbers",
            image: require("@/assets/images/numbers.png"),
            description: "Count with traditional Luganda number systems",
            targetPage: "child/games/lugandacountinggame",
          },
        ])
        break

      case "coloring":
        setScreenTitle("Coloring")
        setLearningCards([
          {
            id: "emblem",
            title: "Buganda Emblem",
            image: require("@/assets/images/emblem.png"),
            description: "Buganda's emblem",
            targetPage: "child/games/coloring/emblem",
          },
          {
            id: "king",
            title: "kings",
            image: require("@/assets/images/king.jpg"),
            description: "King's image",
            targetPage: "child/games/coloring/king",
          },
          {
            id: "animals",
            title: "Animals",
            image: require("@/assets/images/cow.png"),
            description: "Color African wildlife animals",
            targetPage: "child/games/coloring/animals",
          },
          {
            id: "shapes",
            title: "Shapes",
            image: require("@/assets/images/shapes.jpg"),
            description: "Color different shapes",
            targetPage: "child/games/coloring/shapes",
          },
          {
            id: "masks",
            title: "Masks",
            image: require("@/assets/images/mask.png"),
            description: "Color traditional African masks",
            targetPage: "child/games/coloring/mask",
          },
        ])
        break

      case "Stories":
        setScreenTitle("Stories")
        setLearningCards([
          {
            id: "kintu",
            title: "Kintu",
            image: require("@/assets/images/kintu.jpg"),
            description: "Learn about Kintu, the first person on Earth according to Buganda mythology",
            targetPage: "child/stories/kintustory",
          },
          {
            id: "mwanga",
            title: "Kabaka Mwanga",
            image: require("@/assets/images/mwanga.jpg"),
            description: "Discover the story of Kabaka Mwanga II of Buganda",
            targetPage: "child/stories/mwangastory",
          },
          {
            id: "kasubi",
            title: "Kasubi Tombs",
            image: require("@/assets/images/kasubi.jpg"),
            description: "Explore the UNESCO World Heritage Site of Kasubi Tombs",
            targetPage: "child/stories/kasubitombsstory",
          },
          {
            id: "walumbe",
            title: "Walumbe and Death",
            image: require("@/assets/images/buganda-kingdom.jpg"),
            description: "Learn about the story of Walumbe and the origin of death",
            targetPage: "child/stories/walumbestory",
          },
          {
            id: "ssezibwa",
            title: "Ssezibwa Falls",
            image: require("@/assets/images/kabaka-trail.jpg"),
            description: "Follow the historical origin of Ssezibwa Falls",
            targetPage: "child/stories/ssezibwafallsstory",
          },
          {
            id: "millet",
            title: "Nambi and the First Millet",
            image: require("@/assets/images/culture.jpg"),
            description: "Discover the story of Nambi and the first millet",
            targetPage: "child/stories/milletstory",
          },
          {
            id: "kasokambirye",
            title: "Kasokambirye and the Moon",
            image: require("@/assets/images/culture.jpg"),
            description: "Discover the story of Kasokambirye and the moon",
            targetPage: "child/stories/kasokambiryestory",
          },
          {
            id: "fig-tree",
            title: "The Generous Fig Tree",
            image: require("@/assets/images/culture.jpg"),
            description: "Discover the story of the generous fig tree",
            targetPage: "child/stories/figtreestory",
          },
        ])
        break

      case "museum":
        setScreenTitle("Museum")
        setLearningCards([
          {
            id: "artifacts",
            title: "Artifacts",
            image: require("@/assets/images/artifacts.jpg"),
            description: "Explore ancient African artifacts",
            targetPage: "child/games/museum/ArtifactsScreen",
          },
          {
            id: "art",
            title: "Art",
            image: require("@/assets/images/art.jpg"),
            description: "Discover traditional and contemporary African art",
            targetPage: "child/games/museum/ArtScreen",
          },
          {
            id: "instruments",
            title: "Instruments",
            image: require("@/assets/images/drums.jpg"),
            description: "Learn about traditional African musical instruments",
            targetPage: "child/games/museum/InstrumentsScreen",
          },
          {
            id: "textiles",
            title: "Textiles",
            image: require("@/assets/images/textile.jpg"),
            description: "Explore the rich tradition of African textiles",
            targetPage: "child/games/museum/TextilesScreen",
          },
        ])
        break
      default:
        // Default to games if no tab is specified
        setScreenTitle("Games")
        setLearningCards([
          {
            id: "logic",
            title: "Logic",
            image: require("@/assets/images/african-logic.png"),
            description: "Solve puzzles inspired by African traditions",
            targetPage: "tester",
          },
          {
            id: "patterns",
            title: "Patterns",
            image: require("@/assets/images/african-patterns.png"),
            description: "Learn about beautiful Kente cloth patterns",
            targetPage: "tester",
          },
          {
            id: "focus",
            title: "Focus",
            image: require("@/assets/images/african-focus.png"),
            description: "Improve concentration with Adinkra symbols",
            targetPage: "tester",
          },
          {
            id: "numbers",
            title: "Numbers",
            image: require("@/assets/images/numbers.png"),
            description: "Count with traditional Luganda number systems",
            targetPage: "tester",
          },
          {
            id: "stories",
            title: "Stories",
            image: require("@/assets/images/stories.png"),
            description: "Learn through African folktales and proverbs",
            targetPage: "tester",
          },
        ])
    }
  }, [tabId])

  const handleParentalPress = () => {
    Speech.speak("For parents only", {
      language: "en",
      pitch: 1,
      rate: 1,
    })
    router.push("/child/parent-gate" as any)
  }

  // Updated function to navigate to the card's target page with type assertion
  const handleCardPress = (card: LearningCard) => {
    // Use type assertion to tell TypeScript this is a valid route
    router.push(`/${card.targetPage}` as any)
  }

  const { width } = Dimensions.get("window")

  return (
    <>
      {/* Make StatusBar transparent to show background behind it */}
      <StatusBar style="light" translucent backgroundColor="transparent" />

      {/* ImageBackground now covers the entire screen including status bar */}
      <ImageBackground source={require("@/assets/images/gameBackground.jpg")} className="flex-1 bg-cover">
        {/* SafeAreaView moved inside ImageBackground */}
        <SafeAreaView className="flex-1" edges={["right", "bottom", "left"]}>
          {/* Main content area */}
          <View className="flex-1 flex-row bg-[#7b5af0d9]">
            {/* Left sidebar - Profile */}
            <View className="flex-row items-center gap-2.5 absolute pt-8 left-5">
              {/* animated avatar */}
              <Animated.View
                style={{
                  transform: [{ scale: pulseAnim }, { translateY: bounceAnim }],
                }}
              >
                <Image
                  source={require("@/assets/images/african-avatar.jpg")}
                  className="w-[70px] h-[70px] rounded-full border-3 border-[#FFD700]"
                />
              </Animated.View>
              <View className="pl-3">
                <Text variant="bold" className="text-white text-lg mt-2">
                  {activeChild?.name || "Learner"}
                </Text>
                <Text className="text-white/80 text-sm">{activeChild ? `Age ${activeChild.age}` : "Age 9+"}</Text>
              </View>
            </View>

            {/* Right content area */}
            <View className="flex-1 px-4 pt-8">
              {/* Header */}
              <View className="flex-row justify-between items-center mb-5 ml-[45%]">
                <View className="flex-row items-center">
                  <TranslatedText variant="bold" className="text-white text-3xl mr-2.5 pt-3">
                    {screenTitle}
                  </TranslatedText>
                </View>

                <TouchableOpacity
                  className="bg-white rounded-3xl px-4 py-1.5 flex-row items-center border-2 border-[#FFD700] mt-0.5"
                  onPress={handleParentalPress}
                >
                  <Ionicons name="people-sharp" size={30} color="#FF6F61" />
                  <TranslatedText variant="medium" className="text-[#5A3CBE] text-base ml-1">
                    For parents
                  </TranslatedText>
                </TouchableOpacity>
              </View>

              {/* Cards section */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="py-4"
                contentContainerClassName="py-4 pb-8"
              >
                {/* Start card */}
                <View className="bg-white/15 rounded-2xl p-4 mt-5 mr-2.5 w-[200px] mb-6">
                  <TranslatedText variant="bold" className="text-white text-2xl">
                    Start
                  </TranslatedText>
                  <TranslatedText className="text-white text-base">of learning</TranslatedText>
                  <TranslatedText className="text-white text-base">journey</TranslatedText>

                  {/* Optional Adinkra symbol */}
                  <View className="mt-2.5">
                    <Text className="text-white text-3xl">✨</Text>
                  </View>
                </View>

                {/* Learning cards */}
                {learningCards.map((card) => (
                  <TouchableOpacity
                    key={card.id}
                    className="bg-white rounded-2xl w-[250px]  mr-4 overflow-hidden shadow-md border-2 border-[#FFD700] mb-4"
                    activeOpacity={0.7}
                    onPress={() => handleCardPress(card)}
                  >
                    <Image source={card.image} className="w-full h-[60%] object-cover" resizeMode="cover" />
                    <View className="p-3 bg-white h-[40%] justify-center">
                      <TranslatedText variant="bold" className="text-base text-[#5A3CBE] mb-1" numberOfLines={1}>
                        {card.title}
                      </TranslatedText>
                      <TranslatedText className="text-xs text-neutral-600 leading-4" numberOfLines={2}>
                        {card.description}
                      </TranslatedText>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </SafeAreaView>
      </ImageBackground>
    </>
  )
}

export default AfricanThemeGameInterface
