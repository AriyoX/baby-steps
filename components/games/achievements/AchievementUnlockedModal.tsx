import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "@/components/StyledText";
import { brandColors, brandRadius, brandShadows } from "@/constants/Brand";
import type { AchievementDefinition } from "./achievementTypes";

interface AchievementUnlockedModalProps {
  achievement: AchievementDefinition | null;
  visible: boolean;
  message?: string;
  onClose: () => void;
}

export function AchievementUnlockedModal({
  achievement,
  visible,
  message = "You earned a new badge.",
  onClose,
}: AchievementUnlockedModalProps) {
  if (!visible || !achievement) {
    return null;
  }

  return (
    <View
      style={styles.overlay}
      testID="achievement-unlock-modal"
      accessibilityViewIsModal
    >
      <View style={styles.card}>
        <View style={styles.badge}>
          <Ionicons
            name={(achievement.icon_name as keyof typeof Ionicons.glyphMap) || "star-outline"}
            size={38}
            color={brandColors.white}
          />
        </View>
        <Text variant="bold" style={styles.kicker}>
          Achievement unlocked!
        </Text>
        <Text variant="bold" style={styles.title}>
          {achievement.name}
        </Text>
        <Text style={styles.description}>{message}</Text>
        <Text style={styles.detail}>{achievement.description}</Text>
        {achievement.points > 0 && (
          <View style={styles.pointsPill}>
            <Ionicons name="star" size={14} color={brandColors.gold[700]} />
            <Text variant="bold" style={styles.pointsText}>
              +{achievement.points} points
            </Text>
          </View>
        )}
        <TouchableOpacity
          style={styles.button}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close achievement notification"
        >
          <Text variant="bold" style={styles.buttonText}>
            Yay!
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    backgroundColor: "rgba(17, 24, 39, 0.58)",
    justifyContent: "center",
    padding: 24,
    zIndex: 1000,
  },
  card: {
    ...brandShadows.lifted,
    alignItems: "center",
    backgroundColor: brandColors.white,
    borderColor: brandColors.gold[300],
    borderRadius: brandRadius.xl,
    borderWidth: 3,
    maxWidth: 380,
    paddingBottom: 22,
    paddingHorizontal: 22,
    paddingTop: 54,
    width: "100%",
  },
  badge: {
    alignItems: "center",
    backgroundColor: brandColors.shanaOrange,
    borderColor: brandColors.white,
    borderRadius: 42,
    borderWidth: 4,
    height: 84,
    justifyContent: "center",
    position: "absolute",
    top: -42,
    width: 84,
  },
  kicker: {
    color: brandColors.orange[700],
    fontSize: 18,
    marginBottom: 8,
    textAlign: "center",
  },
  title: {
    color: brandColors.charcoalBlack,
    fontSize: 24,
    marginBottom: 8,
    textAlign: "center",
  },
  description: {
    color: brandColors.neutral[700],
    fontSize: 15,
    lineHeight: 21,
    marginBottom: 6,
    textAlign: "center",
  },
  detail: {
    color: brandColors.neutral[600],
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
    textAlign: "center",
  },
  pointsPill: {
    alignItems: "center",
    backgroundColor: brandColors.gold[50],
    borderColor: brandColors.gold[200],
    borderRadius: brandRadius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    marginBottom: 18,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pointsText: {
    color: brandColors.gold[800],
    fontSize: 13,
    textTransform: "uppercase",
  },
  button: {
    backgroundColor: brandColors.victoriaBlue,
    borderRadius: brandRadius.pill,
    minWidth: 136,
    paddingHorizontal: 26,
    paddingVertical: 12,
  },
  buttonText: {
    color: brandColors.white,
    fontSize: 16,
    textAlign: "center",
  },
});
