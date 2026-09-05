import { Ionicons } from "@expo/vector-icons";
import {
  TouchableOpacity,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Text } from "@/components/StyledText";
import { brandColors } from "@/constants/Brand";
import { activityColors, activityStyles } from "@/constants/ActivityTheme";
import { getResponsiveViewport } from "@/lib/responsiveLayout";

type ActivityButtonProps = {
  label: string;
  accessibilityLabel?: string;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  tone?: "primary" | "secondary" | "success";
};

export function ActivityButton({
  label,
  accessibilityLabel = label,
  disabled = false,
  icon = "chevron-forward",
  onPress,
  style,
  tone = "primary",
}: ActivityButtonProps) {
  const { width, height } = useWindowDimensions();
  const { isShort, isTablet } = getResponsiveViewport(width, height);
  const foreground = tone === "secondary" ? activityColors.ink : brandColors.white;

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      activeOpacity={0.78}
      disabled={disabled}
      onPress={onPress}
      style={[
        {
          alignItems: "center",
          backgroundColor: tone === "secondary"
            ? activityColors.paper
            : tone === "success" ? brandColors.success : activityColors.action,
          borderColor: tone === "secondary" ? activityColors.outline : "transparent",
          borderRadius: 999,
          borderWidth: 2,
          columnGap: 5,
          flexDirection: "row",
          justifyContent: "center",
          maxWidth: "100%",
          minHeight: isShort ? 44 : isTablet ? 56 : 48,
          opacity: disabled ? 0.5 : 1,
          paddingHorizontal: isShort ? 18 : 24,
          paddingVertical: isShort ? 6 : 10,
        },
        style,
      ]}
    >
      <Text
        variant="bold"
        style={{ color: foreground, flexShrink: 1, fontSize: isShort ? 16 : isTablet ? 22 : 18 }}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.82}
      >
        {label}
      </Text>
      <Ionicons name={icon} size={isShort ? 20 : 25} color={foreground} />
    </TouchableOpacity>
  );
}

type ActivityAudioButtonProps = {
  accessibilityLabel: string;
  failed?: boolean;
  onPress: () => void;
};

export function ActivityAudioButton({
  accessibilityLabel,
  failed = false,
  onPress,
}: ActivityAudioButtonProps) {
  const { width, height } = useWindowDimensions();
  const { isShort, isTablet } = getResponsiveViewport(width, height);
  const size = isShort ? 44 : isTablet ? 68 : 56;

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      activeOpacity={0.78}
      onPress={onPress}
      style={[
        activityStyles.roundControl,
        {
          alignItems: "center",
          borderColor: failed ? brandColors.neutral[300] : activityColors.outline,
          flexShrink: 0,
          height: size,
          justifyContent: "center",
          width: size,
        },
      ]}
    >
      <Ionicons
        name={failed ? "volume-mute" : "volume-high"}
        size={isShort ? 25 : isTablet ? 36 : 30}
        color={failed ? activityColors.muted : activityColors.ink}
      />
    </TouchableOpacity>
  );
}
