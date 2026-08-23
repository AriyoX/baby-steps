import { View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { Text } from "@/components/StyledText"
import { brandColors } from "@/constants/Brand"
import type { ChildStreakSnapshot } from "@/lib/streakDate"

export const ChildHeaderStreak = ({
  activeChildId,
  accessibilityLabel,
  isLoading,
  snapshot,
}: {
  activeChildId: string | null
  accessibilityLabel: string
  isLoading: boolean
  snapshot: ChildStreakSnapshot | null
}) => {
  if (
    isLoading ||
    !snapshot ||
    snapshot.childId !== activeChildId ||
    !snapshot.preferences.streakEnabled
  ) return null

  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel}
      className="ml-1 flex-row items-center rounded-full bg-white/15 px-2 py-0.5"
      testID="child-header-streak"
    >
      <Ionicons name="flame" size={13} color={brandColors.equatorialGold} />
      <Text variant="bold" className="ml-1 text-xs text-white">
        {snapshot.summary.currentStreak}
      </Text>
    </View>
  )
}
