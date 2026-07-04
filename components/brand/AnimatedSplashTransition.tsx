import React from "react";
import { Animated, Easing, Image, StyleSheet, View } from "react-native";
import { BrandMark } from "@/components/brand/BrandMark";
import { brandColors } from "@/constants/Brand";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface AnimatedSplashTransitionProps {
  onDone: () => void;
}

const SPLASH_GOLD = brandColors.equatorialGold;
const SPLASH_PROFILE_IMAGE = require("@/assets/logo/Profile-pic.png");

export function AnimatedSplashTransition({ onDone }: AnimatedSplashTransitionProps) {
  const progress = React.useRef(new Animated.Value(0)).current;
  const reduceMotion = useReducedMotion();

  React.useEffect(() => {
    if (reduceMotion) {
      progress.setValue(1);
      const timeout = setTimeout(onDone, 180);
      return () => clearTimeout(timeout);
    }

    const animation = Animated.sequence([
      Animated.delay(120),
      Animated.timing(progress, {
        toValue: 1,
        duration: 760,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.delay(120),
    ]);

    animation.start(({ finished }) => {
      if (finished) onDone();
    });

    return () => {
      animation.stop();
    };
  }, [onDone, progress, reduceMotion]);

  const containerOpacity = progress.interpolate({
    inputRange: [0, 0.82, 1],
    outputRange: [1, 1, 0],
  });

  const iconOpacity = progress.interpolate({
    inputRange: [0, 0.42, 0.66],
    outputRange: [1, 0.55, 0],
  });

  const iconScale = progress.interpolate({
    inputRange: [0, 0.66],
    outputRange: [1, 0.88],
  });

  const wordmarkOpacity = progress.interpolate({
    inputRange: [0.28, 0.72],
    outputRange: [0, 1],
  });

  const wordmarkTranslateY = progress.interpolate({
    inputRange: [0.28, 0.72],
    outputRange: [18, 0],
  });

  const wordmarkScale = progress.interpolate({
    inputRange: [0.28, 0.72],
    outputRange: [0.94, 1],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        styles.container,
        { opacity: containerOpacity },
      ]}
    >
      <View style={styles.brandStage}>
        <Animated.View
          style={[
            styles.logoLayer,
            {
              opacity: iconOpacity,
              transform: [{ scale: iconScale }],
            },
          ]}
        >
          <Image source={SPLASH_PROFILE_IMAGE} resizeMode="contain" style={styles.launchImage} />
        </Animated.View>

        <Animated.View
          style={[
            styles.logoLayer,
            {
              opacity: wordmarkOpacity,
              transform: [{ translateY: wordmarkTranslateY }, { scale: wordmarkScale }],
            },
          ]}
        >
          <BrandMark kind="wordmark" tone="main" width={244} height={60} />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: SPLASH_GOLD,
    justifyContent: "center",
    zIndex: 1000,
  },
  brandStage: {
    alignItems: "center",
    height: 160,
    justifyContent: "center",
    width: 280,
  },
  logoLayer: {
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
  },
  launchImage: {
    height: 156,
    width: 156,
  },
});
