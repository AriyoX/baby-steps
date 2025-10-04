import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Dimensions,
  Animated,
  TouchableOpacity,
  FlatList,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "@/components/StyledText";

const { width, height } = Dimensions.get("window");

// Child-friendly content with consistent color data
const onboardingData = [
  {
    id: "1",
    title: "Hello, Friend!",
    description: "Let's explore Uganda together! 🇺🇬",
    image: "👶",
    shapeColor: "bg-primary-300",
    textColor: "text-primary-700",
    color: "rgb(219, 242, 255)", // Light blue corresponding to primary-100
  },
  {
    id: "2",
    title: "Magical Stories!",
    description: "Listen to fun stories from Uganda!",
    image: "📚",
    shapeColor: "bg-secondary-300",
    textColor: "text-secondary-700",
    color: "rgb(255, 247, 237)", // Light orange corresponding to secondary-100
  },
  {
    id: "3",
    title: "Fun Games!",
    description: "Play and learn Luganda words!",
    image: "🎮",
    shapeColor: "bg-accent-300",
    textColor: "text-accent-700",
    color: "rgb(250, 240, 255)", // Light purple corresponding to accent-100
  },
];

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);

  // Animation values for playful effects
  const bounceValue = useRef(new Animated.Value(0)).current;
  const rotateValue = useRef(new Animated.Value(0)).current;
  const scaleValue = useRef(new Animated.Value(1)).current;

  const router = useRouter();

  // Set up animations
  useEffect(() => {
    // Bounce animation for the image
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceValue, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(bounceValue, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Slow rotation for the image
    Animated.loop(
      Animated.sequence([
        Animated.timing(rotateValue, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(rotateValue, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Subtle pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleValue, {
          toValue: 1.1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(scaleValue, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handleOnboardingComplete = async () => {
    try {
      await AsyncStorage.setItem("@onboarding_completed", "true");
      router.replace("/login");
    } catch (error) {
      console.error("Failed to save onboarding status", error);
    }
  };

  // Render fun shapes in background with animated opacity based on scroll position
  const renderBackgroundShapes = () => {
    return onboardingData.map((item, index) => {
      // Calculate opacity based on scroll position to fade shapes in/out
      const inputRange = [
        (index - 0.5) * width, // Start fading in
        index * width, // Full opacity
        (index + 0.5) * width, // Start fading out
      ];

      const opacity = scrollX.interpolate({
        inputRange,
        outputRange: [0, 1, 0],
        extrapolate: "clamp",
      });

      return (
        <Animated.View
          key={`shapes-${index}`}
          style={{
            opacity,
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        >
          <View
            className={`absolute top-5 left-5 w-16 h-16 rounded-full ${item.shapeColor} opacity-20`}
          />
          <View
            className={`absolute bottom-20 right-10 w-14 h-14 rounded-full ${item.shapeColor} opacity-30`}
          />
          <View
            className={`absolute top-40 right-8 w-10 h-10 rounded-full ${item.shapeColor} opacity-25`}
          />
          <View
            className={`absolute bottom-60 left-12 w-12 h-12 rounded-lg rotate-45 ${item.shapeColor} opacity-20`}
          />
        </Animated.View>
      );
    });
  };

  // Create a smoothly interpolated background color
  const backgroundColor = scrollX.interpolate({
    inputRange: onboardingData.map((_, i) => i * width),
    outputRange: onboardingData.map((item) => item.color),
    extrapolate: "clamp",
  });

  const renderItem = ({ item }: { item: (typeof onboardingData)[0] }) => {
    // Animation transformations
    const translateY = bounceValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -15], // More noticeable bounce for kids
    });

    const rotate = rotateValue.interpolate({
      inputRange: [0, 1],
      outputRange: ["-5deg", "5deg"],
    });

    return (
      <View
        style={{ width }}
        className="h-full items-center justify-center" // Removed bg-color class
      >
        {/* Animated emoji in a fun container */}
        <Animated.View
          className="w-40 h-40 rounded-full items-center justify-center shadow-xl mb-10 bg-white border-4 border-white"
          style={{
            transform: [{ translateY }, { rotate }, { scale: scaleValue }],
          }}
        >
          <Text className="text-[80px]">{item.image}</Text>
        </Animated.View>

        {/* Title with playful styling */}
        <Text variant="bold" className={`text-3xl pt-3  mb-4 ${item.textColor}`}>
          {item.title}
        </Text>

        {/* Simple description for kids */}
        <Text className="text-xl text-center text-neutral-700 px-12 leading-7">
          {item.description}
        </Text>
      </View>
    );
  };

  // Child-friendly button with emoji
  const renderNextButton = () => {
    if (currentIndex === onboardingData.length - 1) {
      return (
        <TouchableOpacity
          className="w-64 h-16 bg-success-500 rounded-full flex-row items-center justify-center shadow-lg"
          onPress={handleOnboardingComplete}
        >
          <Text variant="bold" className="text-white text-xl mr-2">Let's Play!</Text>
          <Text className="text-2xl">🎮</Text>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        className="w-64 h-16 bg-primary-500 rounded-full flex-row items-center justify-center shadow-lg"
        onPress={() => {
          if (currentIndex < onboardingData.length - 1) {
            flatListRef.current?.scrollToIndex({
              index: currentIndex + 1,
              animated: true,
            });
          }
        }}
      >
        <Text variant="bold" className="text-white text-xl  mr-2">Next</Text>
        <Text className="text-2xl">👉</Text>
      </TouchableOpacity>
    );
  };

  return (
    <Animated.View className="flex-1" style={{ backgroundColor }}>
      {/* Set StatusBar to transparent to allow background color to show through */}
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="dark-content"
      />

      {/* Fun background shapes with smooth transitions */}
      {renderBackgroundShapes()}

      {/* App title at the top - with more padding to account for status bar */}
      <SafeAreaView className="w-full items-center pb-4">
        <Text variant="bold" className="text-2xl text-primary-600  mt-4">
          Baby Steps
        </Text>
        <Text className="text-base text-neutral-600">Learn & Play!</Text>
      </SafeAreaView>

      {/* Skip button - repositioned for better visibility */}
      <TouchableOpacity
        className="absolute top-16 right-6 bg-white/80 py-2 px-5 rounded-full z-10 shadow-sm"
        onPress={handleOnboardingComplete}
      >
        <Text className="text-primary-600">Skip</Text>
      </TouchableOpacity>

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={onboardingData}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onViewableItemsChanged={({ viewableItems }) => {
          if (viewableItems.length > 0) {
            setCurrentIndex(viewableItems[0].index || 0);
          }
        }}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        className="flex-1"
      />

      {/* Improved pagination dots with consistent shapes */}
      <View className="flex-row justify-center items-center my-6">
        {onboardingData.map((_, index) => {
          const inputRange = [
            (index - 1) * width,
            index * width,
            (index + 1) * width,
          ];

          // Instead of scaling in X/Y separately which distorts the shape,
          // use a uniform scale that maintains the circular shape
          const scale = scrollX.interpolate({
            inputRange,
            outputRange: [0.8, 1.6, 0.8], // Scale factor for dots
            extrapolate: "clamp",
          });

          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.5, 1, 0.5],
            extrapolate: "clamp",
          });

          // Different colors for each dot
          const dotColor =
            index === 0
              ? "bg-primary-500"
              : index === 1
              ? "bg-secondary-500"
              : "bg-accent-500";

          // Add border to make dots more visually distinct
          const borderColor =
            index === 0
              ? "border-primary-200"
              : index === 1
              ? "border-secondary-200"
              : "border-accent-200";

          // Active dot styling
          const isActive = index === currentIndex;

          return (
            <Animated.View
              key={index}
              className={`mx-3 rounded-full ${dotColor} border-2 ${borderColor} ${
                isActive ? "shadow" : ""
              }`}
              style={{
                width: isActive ? 20 : 12,
                height: isActive ? 20 : 12,
                opacity,
                transform: [{ scale }],
                // Additional shadow styling for active dot
                ...(isActive && {
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 3,
                  elevation: 3,
                }),
              }}
            />
          );
        })}
      </View>

      {/* Navigation button at bottom */}
      <View className="items-center mb-12 mt-2">{renderNextButton()}</View>
    </Animated.View>
  );
}
