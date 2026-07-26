import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/StyledText";
import { brandColors } from "@/constants/Brand";
import { useChildUiLanguage } from "@/context/ChildUiLanguageContext";
import { useStreak } from "@/context/StreakContext";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export function StreakCelebrationHost() {
  const { celebration, dismissCelebration } = useStreak();
  const { t } = useChildUiLanguage();
  const reduceMotion = useReducedMotion();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-8)).current;

  useEffect(() => {
    if (!celebration) return;

    if (reduceMotion) {
      opacity.setValue(1);
      translateY.setValue(0);
    } else {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          damping: 18,
          stiffness: 180,
          mass: 0.7,
          useNativeDriver: true,
        }),
      ]).start();
    }

    const timer = setTimeout(dismissCelebration, 3_200);
    return () => clearTimeout(timer);
  }, [celebration, dismissCelebration, opacity, reduceMotion, translateY]);

  if (!celebration) return null;
  const message = celebration.currentStreak > 1
    ? t("streak.celebration", { count: celebration.currentStreak })
    : t("streak.learningComplete");

  return (
    <View pointerEvents="box-none" style={styles.layer}>
      <Animated.View
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
        style={[styles.card, { opacity, transform: [{ translateY }] }]}
        testID="streak-celebration"
      >
        <View style={styles.icon}>
          <Ionicons name="flame" color={brandColors.shanaOrange} size={20} />
        </View>
        <Text variant="bold" style={styles.message}>{message}</Text>
        <Pressable
          accessibilityLabel={t("common.close")}
          accessibilityRole="button"
          hitSlop={8}
          onPress={dismissCelebration}
        >
          <Ionicons name="close" color={brandColors.neutral[500]} size={18} />
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: brandColors.white,
    borderColor: "rgba(248, 194, 62, 0.6)",
    borderRadius: 20,
    borderWidth: 1,
    elevation: 8,
    flexDirection: "row",
    maxWidth: 440,
    minHeight: 48,
    paddingHorizontal: 14,
    shadowColor: brandColors.charcoalBlack,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
  },
  icon: {
    alignItems: "center",
    backgroundColor: "#FFF4E8",
    borderRadius: 14,
    height: 32,
    justifyContent: "center",
    marginRight: 10,
    width: 32,
  },
  layer: {
    left: 16,
    position: "absolute",
    right: 16,
    top: 62,
    zIndex: 1000,
  },
  message: {
    color: brandColors.neutral[800],
    flex: 1,
    fontSize: 14,
    lineHeight: 19,
    marginRight: 8,
  },
});
