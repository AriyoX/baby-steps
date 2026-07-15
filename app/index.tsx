import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  StatusBar,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { BrandMark } from "@/components/brand/BrandMark";
import { AppButton } from "@/components/common/AppButton";
import { Text } from "@/components/StyledText";
import { brandColors } from "@/constants/Brand";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { setOnboardingCompleted } from "@/lib/onboarding";

const onboardingData = [
  {
    id: "1",
    eyebrow: "LEARN THROUGH PLAY",
    title: "Little moments, big growth",
    description: "Playful stories and games help your child build language, confidence, and a connection to culture.",
    outcome: "Short activities made for young attention spans",
    icon: "child",
    mascot: true,
    shapeColor: "bg-primary-300",
    textColor: "text-primary-700",
    color: brandColors.blue[50],
  },
  {
    id: "2",
    eyebrow: "MADE FOR FAMILIES",
    title: "Their journey stays with you",
    description: "Create a profile for each child and see what they explore, practise, and enjoy over time.",
    outcome: "One private parent account for the whole family",
    icon: "book-open",
    shapeColor: "bg-secondary-300",
    textColor: "text-secondary-700",
    color: brandColors.orange[50],
  },
  {
    id: "3",
    eyebrow: "READY WHEN THEY ARE",
    title: "Start with one joyful step",
    description: "Choose a learning language and a comfortable starting point. We’ll guide you from there.",
    outcome: "No pressure, no ads, and room to explore",
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
  const currentIndexRef = useRef(0);
  const previousWidthRef = useRef(0);
  const reduceMotion = useReducedMotion();
  const router = useRouter();
  const { width } = useWindowDimensions();

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    if (previousWidthRef.current === width) return;

    previousWidthRef.current = width;
    scrollX.setValue(currentIndexRef.current * width);
    flatListRef.current?.scrollToIndex({
      animated: false,
      index: currentIndexRef.current,
    });
  }, [scrollX, width]);

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
      await setOnboardingCompleted();
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
      <View style={{ width }} className="h-full items-center justify-center px-6">
        <Animated.View
          className="w-44 h-44 rounded-[48px] items-center justify-center shadow-lg mb-8 bg-white border border-white"
          style={{ transform: [{ translateY }, { rotate }, { scale: scaleValue }] }}
        >
          {item.mascot ? (
            <BrandMark kind="mascot" width={116} height={150} />
          ) : (
            <FontAwesome5 name={item.icon as any} size={66} color={brandColors.victoriaBlue} />
          )}
        </Animated.View>

        <View className="bg-white/70 rounded-full px-4 py-2 mb-3">
          <Text variant="bold" className={`text-xs tracking-[2px] ${item.textColor}`}>
            {item.eyebrow}
          </Text>
        </View>

        <Text variant="display" className={`text-[34px] leading-10 pt-2 mb-4 text-center ${item.textColor}`}>
          {item.title}
        </Text>

        <Text className="text-lg text-center text-neutral-700 px-4 leading-7">
          {item.description}
        </Text>

        <View className="flex-row items-center bg-white/75 border border-white rounded-2xl px-4 py-3 mt-5 max-w-[330px]">
          <FontAwesome5 name="check-circle" size={17} color={brandColors.victoriaBlue} />
          <Text variant="medium" className="text-sm text-neutral-700 ml-2 flex-1">
            {item.outcome}
          </Text>
        </View>
      </View>
    );
  };

  const renderNextButton = () => {
    if (currentIndex === onboardingData.length - 1) {
      return (
        <AppButton
          label="Create your family space"
          icon="arrow-forward"
          className="w-[310px] rounded-2xl shadow-lg"
          fullWidth={false}
          onPress={handleOnboardingComplete}
        />
      );
    }

    return (
      <AppButton
        label="Next"
        icon="arrow-forward"
        className="w-[310px] rounded-2xl shadow-lg"
        fullWidth={false}
        onPress={() => {
          if (currentIndex < onboardingData.length - 1) {
            flatListRef.current?.scrollToIndex({
              index: currentIndex + 1,
              animated: true,
            });
          }
        }}
      />
    );
  };

  return (
    <Animated.View className="flex-1" style={{ backgroundColor }}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      {renderBackgroundShapes()}

      <SafeAreaView className="w-full items-center pb-4">
        <BrandMark kind="wordmark" width={172} height={42} containerStyle={{ marginTop: 16 }} />
        <Text className="text-sm text-neutral-500 mt-1">Play • Learn • Belong</Text>
      </SafeAreaView>

      <TouchableOpacity
        className="absolute top-16 right-5 bg-white/85 py-2 px-4 rounded-full z-10 shadow-sm border border-white"
        onPress={handleOnboardingComplete}
        activeOpacity={0.84}
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
        getItemLayout={(_, index) => ({
          index,
          length: width,
          offset: width * index,
        })}
        pagingEnabled
        snapToInterval={width}
        decelerationRate="fast"
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
              key={`onboarding-dot-${index}`}
              className={`mx-3 rounded-full ${dotColor} border-2 ${borderColor}`}
              style={{
                width: isActive ? 20 : 12,
                height: isActive ? 20 : 12,
                opacity,
                shadowColor: brandColors.charcoalBlack,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isActive ? 0.22 : 0,
                shadowRadius: isActive ? 3 : 0,
                transform: [{ scale }],
                elevation: isActive ? 3 : 0,
              }}
            />
          );
        })}
      </View>

      <View className="items-center mb-12 mt-2">{renderNextButton()}</View>
    </Animated.View>
  );
}
