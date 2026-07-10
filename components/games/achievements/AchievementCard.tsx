import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";
import { Text } from "@/components/StyledText";
import { brandColors, brandRadius, brandShadows } from "@/constants/Brand";
import type { AchievementDefinition } from "./achievementTypes";

export interface AchievementChildBadge {
  id: string;
  name: string;
  avatar?: string;
}

interface AchievementCardProps {
  achievement: AchievementDefinition;
  unlocked: boolean;
  earnedAtLabel?: string;
  earnedByChildren?: AchievementChildBadge[];
  unearnedChildren?: AchievementChildBadge[];
  emptyEarnedText?: string;
  testID?: string;
}

export function AchievementCard({
  achievement,
  unlocked,
  earnedAtLabel,
  earnedByChildren,
  unearnedChildren,
  emptyEarnedText = "Not earned yet.",
  testID,
}: AchievementCardProps) {
  const hasChildBadges = earnedByChildren !== undefined || unearnedChildren !== undefined;

  return (
    <View
      style={[styles.card, unlocked ? styles.unlockedCard : styles.lockedCard]}
      testID={testID}
    >
      <View style={styles.row}>
        <View style={[styles.iconBadge, unlocked ? styles.unlockedBadge : styles.lockedBadge]}>
          <Ionicons
            name={
              (unlocked
                ? achievement.icon_name
                : "lock-closed-outline") as keyof typeof Ionicons.glyphMap
            }
            size={28}
            color={unlocked ? brandColors.gold[800] : brandColors.neutral[500]}
          />
        </View>

        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text variant="bold" style={styles.title}>
              {achievement.name}
            </Text>
            <View style={[styles.statusPill, unlocked ? styles.unlockedPill : styles.lockedPill]}>
              <Text
                variant="bold"
                style={[styles.statusText, unlocked ? styles.unlockedText : styles.lockedText]}
              >
                {unlocked ? "Unlocked" : "Locked"}
              </Text>
            </View>
          </View>

          <Text style={styles.description}>{achievement.description}</Text>

          <View style={styles.metaRow}>
            {achievement.points > 0 && (
              <View style={styles.pointsPill}>
                <Ionicons name="star" size={13} color={brandColors.gold[700]} />
                <Text variant="bold" style={styles.pointsText}>
                  +{achievement.points}
                </Text>
              </View>
            )}
            {earnedAtLabel && <Text style={styles.earnedAt}>{earnedAtLabel}</Text>}
          </View>

          {hasChildBadges && (
            <View style={styles.childSection}>
              <Text variant="bold" style={styles.childLabel}>
                Earned by
              </Text>
              {earnedByChildren && earnedByChildren.length > 0 ? (
                <View style={styles.chipWrap}>
                  {earnedByChildren.map((child) => (
                    <View key={child.id} style={[styles.childChip, styles.earnedChip]}>
                      {child.avatar && <Text style={styles.avatar}>{child.avatar}</Text>}
                      <Text variant="bold" style={styles.earnedChipText}>
                        {child.name}
                      </Text>
                    </View>
                  ))}
                  {unearnedChildren?.map((child) => (
                    <View key={child.id} style={[styles.childChip, styles.unearnedChip]}>
                      {child.avatar && <Text style={styles.avatar}>{child.avatar}</Text>}
                      <Text style={styles.unearnedChipText}>{child.name}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.emptyText}>{emptyEarnedText}</Text>
              )}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...brandShadows.soft,
    backgroundColor: brandColors.white,
    borderRadius: brandRadius.lg,
    borderWidth: 2,
    padding: 14,
  },
  unlockedCard: {
    borderColor: brandColors.gold[200],
  },
  lockedCard: {
    backgroundColor: brandColors.neutral[50],
    borderColor: brandColors.neutral[200],
  },
  row: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
  },
  iconBadge: {
    alignItems: "center",
    borderRadius: brandRadius.pill,
    height: 58,
    justifyContent: "center",
    width: 58,
  },
  unlockedBadge: {
    backgroundColor: brandColors.gold[100],
  },
  lockedBadge: {
    backgroundColor: brandColors.neutral[100],
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },
  title: {
    color: brandColors.charcoalBlack,
    flex: 1,
    fontSize: 16,
    lineHeight: 21,
  },
  statusPill: {
    borderRadius: brandRadius.pill,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  unlockedPill: {
    backgroundColor: brandColors.gold[50],
  },
  lockedPill: {
    backgroundColor: brandColors.neutral[100],
  },
  statusText: {
    fontSize: 11,
    textTransform: "uppercase",
  },
  unlockedText: {
    color: brandColors.gold[800],
  },
  lockedText: {
    color: brandColors.neutral[500],
  },
  description: {
    color: brandColors.neutral[700],
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  metaRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  pointsPill: {
    alignItems: "center",
    backgroundColor: brandColors.gold[50],
    borderColor: brandColors.gold[200],
    borderRadius: brandRadius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  pointsText: {
    color: brandColors.gold[800],
    fontSize: 12,
  },
  earnedAt: {
    color: brandColors.neutral[500],
    fontSize: 12,
  },
  childSection: {
    marginTop: 12,
  },
  childLabel: {
    color: brandColors.neutral[700],
    fontSize: 12,
    marginBottom: 6,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  childChip: {
    alignItems: "center",
    borderRadius: brandRadius.pill,
    borderWidth: 1,
    flexDirection: "row",
    maxWidth: "100%",
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  earnedChip: {
    backgroundColor: brandColors.blue[50],
    borderColor: brandColors.blue[200],
  },
  unearnedChip: {
    backgroundColor: brandColors.neutral[100],
    borderColor: brandColors.neutral[200],
  },
  avatar: {
    fontSize: 14,
    marginRight: 4,
  },
  earnedChipText: {
    color: brandColors.blue[800],
    fontSize: 12,
  },
  unearnedChipText: {
    color: brandColors.neutral[500],
    fontSize: 12,
  },
  emptyText: {
    color: brandColors.neutral[500],
    fontSize: 12,
    lineHeight: 18,
  },
});
