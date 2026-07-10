import { Ionicons } from "@expo/vector-icons";
import { ScrollView, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { Text } from "@/components/StyledText";
import { brandColors } from "@/constants/Brand";

export type ChildCompletionMetric = {
  label: string;
  value: string | number;
  icon?: keyof typeof Ionicons.glyphMap;
};

export type ChildCompletionAction = {
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  variant?: "primary" | "secondary" | "quiet";
  disabled?: boolean;
};

type ChildCompletionCardProps = {
  title: string;
  message: string;
  metrics?: ChildCompletionMetric[];
  actions: ChildCompletionAction[];
  icon?: keyof typeof Ionicons.glyphMap;
  accentColor?: string;
  availableWidth?: number;
  testID?: string;
};

const getActionColors = (
  variant: ChildCompletionAction["variant"],
  accentColor: string,
) => {
  if (variant === "quiet") {
    return {
      backgroundColor: brandColors.neutral[100],
      borderColor: brandColors.neutral[200],
      textColor: brandColors.neutral[700],
    };
  }

  if (variant === "secondary") {
    return {
      backgroundColor: brandColors.white,
      borderColor: accentColor,
      textColor: accentColor,
    };
  }

  return {
    backgroundColor: accentColor,
    borderColor: accentColor,
    textColor: brandColors.white,
  };
};

export function ChildCompletionCard({
  title,
  message,
  metrics = [],
  actions,
  icon = "trophy",
  accentColor = brandColors.victoriaBlue,
  availableWidth,
  testID,
}: ChildCompletionCardProps) {
  const { height, width } = useWindowDimensions();
  const isCompact = height < 430;
  const layoutWidth = availableWidth ?? width;
  const cardWidth = Math.min(
    620,
    Math.max(280, layoutWidth - (isCompact ? 48 : 64)),
  );

  return (
    <View
      accessibilityLabel={`${title}. ${message}`}
      className="bg-white rounded-3xl border-4 border-primary-100 shadow-xl overflow-hidden"
      style={{ maxHeight: "94%", width: cardWidth }}
      testID={testID}
    >
      <ScrollView
        alwaysBounceVertical={false}
        contentContainerStyle={{
          alignItems: "center",
          paddingHorizontal: isCompact ? 18 : 24,
          paddingVertical: isCompact ? 16 : 22,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View
          className="rounded-full items-center justify-center border-4 border-white shadow-md"
          style={{
            backgroundColor: accentColor,
            height: isCompact ? 60 : 72,
            width: isCompact ? 60 : 72,
          }}
        >
          <Ionicons name={icon} size={isCompact ? 30 : 36} color={brandColors.white} />
        </View>

        <Text
          variant="bold"
          className="text-primary-700 text-center mt-3"
          style={{ fontSize: isCompact ? 24 : 30, lineHeight: isCompact ? 29 : 36 }}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
          {title}
        </Text>
        <Text
          className="text-neutral-600 text-center mt-2"
          style={{ fontSize: isCompact ? 14 : 16, lineHeight: isCompact ? 19 : 22 }}
        >
          {message}
        </Text>

        {metrics.length > 0 ? (
          <View
            className="w-full bg-primary-50 rounded-2xl border-2 border-primary-100 mt-4 flex-row flex-wrap"
            style={{ padding: isCompact ? 10 : 14, gap: isCompact ? 8 : 10 }}
          >
            {metrics.map((metric) => (
              <View
                key={metric.label}
                className="bg-white rounded-xl border border-primary-100 flex-row items-center"
                style={{
                  flexBasis: metrics.length === 1 ? "100%" : "47%",
                  flexGrow: 1,
                  minHeight: 48,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                }}
              >
                <Ionicons
                  name={metric.icon ?? "checkmark-circle"}
                  size={19}
                  color={accentColor}
                />
                <View className="flex-1 ml-2" style={{ minWidth: 0 }}>
                  <Text className="text-neutral-500 text-xs" numberOfLines={1}>
                    {metric.label}
                  </Text>
                  <Text
                    variant="bold"
                    className="text-primary-700"
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.78}
                  >
                    {metric.value}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        <View
          className="w-full flex-row flex-wrap justify-center mt-4"
          style={{ gap: 10 }}
        >
          {actions.map((action) => {
            const colors = getActionColors(action.variant, accentColor);

            return (
              <TouchableOpacity
                key={action.label}
                accessibilityLabel={action.accessibilityLabel ?? action.label}
                accessibilityRole="button"
                accessibilityState={{ disabled: Boolean(action.disabled) }}
                activeOpacity={0.76}
                disabled={action.disabled}
                onPress={action.onPress}
                className="rounded-full border-2 flex-row items-center justify-center"
                style={{
                  backgroundColor: colors.backgroundColor,
                  borderColor: colors.borderColor,
                  minHeight: 48,
                  minWidth: actions.length === 1 ? 180 : 136,
                  opacity: action.disabled ? 0.55 : 1,
                  paddingHorizontal: 18,
                  paddingVertical: 10,
                }}
              >
                {action.icon ? (
                  <Ionicons
                    name={action.icon}
                    size={18}
                    color={colors.textColor}
                    style={{ marginRight: 6 }}
                  />
                ) : null}
                <Text
                  variant="bold"
                  style={{ color: colors.textColor, flexShrink: 1 }}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.78}
                >
                  {action.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
