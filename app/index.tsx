import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  StatusBar,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FontAwesome5 } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { BrandMark } from "@/components/brand/BrandMark";
import { Text } from "@/components/StyledText";
import { brandColors } from "@/constants/Brand";
import { useReducedMotion } from "@/hooks/useReducedMotion";

const { width } = Dimensions.get("window");

const onboardingData = [
  {
    id: "1",
    title: "Hello, Friend!",
    description: "Let's explore Uganda together.",
    icon: "child",
    mascot: true,
    shapeColor: "bg-primary-300",
    textColor: "text-primary-700",
    color: brandColors.blue[50],
  },
  {
    id: "2",
    title: "Magical Stories!",
    description: "Listen to fun stories from Uganda!",
    icon: "book-open",
    shapeColor: "bg-secondary-300",
    textColor: "text-secondary-700",
    color: brandColors.orange[50],
  },
  {
    id: "3",
    title: "Fun Games!",
    description: "Play and learn Luganda words!",
    icon: "gamepad",
    shapeColor: "bg-accent-300",
    textColor: "text-accent-800",
    color: brandColors.gold[50],
  },
];

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);
  const bounceValue = useRef(new Animated.Value(0)).current;
  const rotateValue = useRef(new Animated.Value(0)).current;
  const scaleValue = useRef(new Animated.Value(1)).current;
  const reduceMotion = useReducedMotion();
  const router = useRouter();

  useEffect(() => {
    if (reduceMotion) {
      bounceValue.setValue(0);
      rotateValue.setValue(0);
      scaleValue.setValue(1);
      return;
    }

    const bounceAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceValue, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(bounceValue, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );

    const rotateAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(rotateValue, {
          toValue: 1,
          duration: 3600,
          useNativeDriver: true,
        }),
        Animated.timing(rotateValue, {
          toValue: 0,
          duration: 3600,
          useNativeDriver: true,
        }),
      ])
    );

    const scaleAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleValue, {
          toValue: 1.04,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(scaleValue, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );

    bounceAnimation.start();
    rotateAnimation.start();
    scaleAnimation.start();

    return () => {
      bounceAnimation.stop();
      rotateAnimation.stop();
      scaleAnimation.stop();
    };
  }, [bounceValue, rotateValue, scaleValue, reduceMotion]);

  const handleOnboardingComplete = async () => {
    try {
      await AsyncStorage.setItem("@onboarding_completed", "true");
      router.replace("/login");
    } catch (error) {
      console.error("Failed to save onboarding status", error);
    }
  };

  const renderBackgroundShapes = () =>
    onboardingData.map((item, index) => {
      const inputRange = [(index - 0.5) * width, index * width, (index + 0.5) * width];
      const opacity = scrollX.interpolate({
        inputRange,
        outputRange: [0, 1, 0],
        extrapolate: "clamp",
      });

      return (
        <Animated.View
          key={`shapes-${index}`}
          style={{ opacity, position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        >
          <View className={`absolute top-5 left-5 w-16 h-16 rounded-full ${item.shapeColor} opacity-20`} />
          <View className={`absolute bottom-20 right-10 w-14 h-14 rounded-full ${item.shapeColor} opacity-30`} />
          <View className={`absolute top-40 right-8 w-10 h-10 rounded-full ${item.shapeColor} opacity-25`} />
          <View className={`absolute bottom-60 left-12 w-12 h-12 rounded-lg rotate-45 ${item.shapeColor} opacity-20`} />
        </Animated.View>
      );
    });

  const backgroundColor = scrollX.interpolate({
    inputRange: onboardingData.map((_, i) => i * width),
    outputRange: onboardingData.map((item) => item.color),
    extrapolate: "clamp",
  });

  const renderItem = ({ item }: { item: (typeof onboardingData)[0] }) => {
    const translateY = bounceValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -10],
    });

    const rotate = rotateValue.interpolate({
      inputRange: [0, 1],
      outputRange: ["-2deg", "2deg"],
    });

    return (
      <View style={{ width }} className="h-full items-center justify-center">
        <Animated.View
          className="w-44 h-44 rounded-full items-center justify-center shadow-xl mb-10 bg-white border-4 border-white"
          style={{ transform: [{ translateY }, { rotate }, { scale: scaleValue }] }}
        >
          {item.mascot ? (
            <BrandMark kind="mascot" width={116} height={150} />
          ) : (
            <FontAwesome5 name={item.icon as any} size={66} color={brandColors.victoriaBlue} />
          )}
        </Animated.View>

        <Text variant="display" className={`text-4xl pt-3 mb-4 ${item.textColor}`}>
          {item.title}
        </Text>

        <Text className="text-xl text-center text-neutral-700 px-12 leading-7">
          {item.description}
        </Text>
      </View>
    );
  };

  const renderNextButton = () => {
    if (currentIndex === onboardingData.length - 1) {
      return (
        <TouchableOpacity
          className="w-64 h-16 bg-success-500 rounded-full flex-row items-center justify-center shadow-lg"
          onPress={handleOnboardingComplete}
          activeOpacity={0.84}
          testID="onboarding-complete-button"
          accessibilityLabel="Start Baby Steps"
        >
          <Text variant="bold" className="text-white text-xl mr-3">
            {"Let's Play!"}
          </Text>
          <FontAwesome5 name="play" size={18} color={brandColors.white} />
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
        activeOpacity={0.84}
        testID="onboarding-next-button"
        accessibilityLabel="Next onboarding page"
      >
        <Text variant="bold" className="text-white text-xl mr-3">
          Next
        </Text>
        <FontAwesome5 name="arrow-right" size={18} color={brandColors.white} />
      </TouchableOpacity>
    );
  };

  return (
    <Animated.View className="flex-1" style={{ backgroundColor }} testID="app-root">
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      {renderBackgroundShapes()}

      <SafeAreaView className="w-full items-center pb-4">
        <BrandMark kind="wordmark" width={172} height={42} containerStyle={{ marginTop: 16 }} />
        <Text className="text-base text-neutral-600 mt-1">Learn & Play</Text>
      </SafeAreaView>

      <TouchableOpacity
        className="absolute top-16 right-6 bg-white/85 py-2 px-5 rounded-full z-10 shadow-sm"
        onPress={handleOnboardingComplete}
        activeOpacity={0.84}
        testID="onboarding-skip-button"
        accessibilityLabel="Skip onboarding"
      >
        <Text variant="medium" className="text-primary-600">
          Skip
        </Text>
      </TouchableOpacity>

      <FlatList
        ref={flatListRef}
        data={onboardingData}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
          useNativeDriver: false,
        })}
        onViewableItemsChanged={({ viewableItems }) => {
          if (viewableItems.length > 0) {
            setCurrentIndex(viewableItems[0].index || 0);
          }
        }}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        className="flex-1"
      />

      <View className="flex-row justify-center items-center my-6">
        {onboardingData.map((_, index) => {
          const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
          const scale = scrollX.interpolate({
            inputRange,
            outputRange: [0.8, 1.6, 0.8],
            extrapolate: "clamp",
          });
          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.5, 1, 0.5],
            extrapolate: "clamp",
          });
          const dotColor =
            index === 0 ? "bg-primary-500" : index === 1 ? "bg-secondary-500" : "bg-accent-500";
          const borderColor =
            index === 0 ? "border-primary-200" : index === 1 ? "border-secondary-200" : "border-accent-200";
          const isActive = index === currentIndex;

          return (
            <Animated.View
              key={index}
              className={`mx-3 rounded-full ${dotColor} border-2 ${borderColor} ${isActive ? "shadow" : ""}`}
              style={{
                width: isActive ? 20 : 12,
                height: isActive ? 20 : 12,
                opacity,
                transform: [{ scale }],
                ...(isActive && {
                  shadowColor: brandColors.charcoalBlack,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.22,
                  shadowRadius: 3,
                  elevation: 3,
                }),
              }}
            />
          );
        })}
      </View>

      <View className="items-center mb-12 mt-2">{renderNextButton()}</View>
    </Animated.View>
  );
}
