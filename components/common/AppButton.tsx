import type { ComponentProps } from "react";
import { ActivityIndicator, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/StyledText";
import { brandColors } from "@/constants/Brand";

type AppButtonVariant = "primary" | "secondary" | "ghost" | "destructive";

interface AppButtonProps extends Omit<ComponentProps<typeof TouchableOpacity>, "children"> {
  label: string;
  variant?: AppButtonVariant;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: "left" | "right";
  loading?: boolean;
  loadingLabel?: string;
  fullWidth?: boolean;
  textClassName?: string;
}

const variantStyles: Record<
  AppButtonVariant,
  {
    container: string;
    disabledContainer: string;
    text: string;
    disabledText: string;
    iconColor: string;
    disabledIconColor: string;
    indicatorColor: string;
  }
> = {
  primary: {
    container: "bg-primary-500 border border-primary-500",
    disabledContainer: "bg-gray-200 border-gray-200",
    text: "text-white",
    disabledText: "text-gray-500",
    iconColor: brandColors.white,
    disabledIconColor: brandColors.neutral[500],
    indicatorColor: brandColors.white,
  },
  secondary: {
    container: "bg-white border border-primary-200",
    disabledContainer: "bg-gray-100 border-gray-200",
    text: "text-primary-700",
    disabledText: "text-gray-500",
    iconColor: brandColors.victoriaBlue,
    disabledIconColor: brandColors.neutral[500],
    indicatorColor: brandColors.victoriaBlue,
  },
  ghost: {
    container: "bg-transparent border border-transparent",
    disabledContainer: "bg-transparent border border-transparent",
    text: "text-primary-700",
    disabledText: "text-gray-400",
    iconColor: brandColors.victoriaBlue,
    disabledIconColor: brandColors.neutral[400],
    indicatorColor: brandColors.victoriaBlue,
  },
  destructive: {
    container: "bg-destructive-600 border border-destructive-600",
    disabledContainer: "bg-gray-200 border-gray-200",
    text: "text-white",
    disabledText: "text-gray-500",
    iconColor: brandColors.white,
    disabledIconColor: brandColors.neutral[500],
    indicatorColor: brandColors.white,
  },
};

export function AppButton({
  label,
  variant = "primary",
  icon,
  iconPosition = "right",
  loading = false,
  loadingLabel,
  fullWidth = true,
  disabled,
  className,
  textClassName,
  activeOpacity = 0.84,
  ...props
}: AppButtonProps) {
  const isDisabled = disabled || loading;
  const styles = variantStyles[variant];
  const displayedLabel = loading && loadingLabel ? loadingLabel : label;
  const iconColor = isDisabled ? styles.disabledIconColor : styles.iconColor;

  return (
    <TouchableOpacity
      {...props}
      activeOpacity={activeOpacity}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      className={[
        "min-h-[52px] rounded-xl px-5 py-3 flex-row items-center justify-center",
        fullWidth ? "w-full" : "",
        isDisabled ? styles.disabledContainer : styles.container,
        loading ? "opacity-80" : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      disabled={isDisabled}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={styles.indicatorColor}
          style={{ marginRight: displayedLabel ? 8 : 0 }}
        />
      ) : null}
      {!loading && icon && iconPosition === "left" ? (
        <Ionicons name={icon} size={19} color={iconColor} style={{ marginRight: 8 }} />
      ) : null}
      <Text
        variant="bold"
        className={[
          "text-base text-center",
          isDisabled ? styles.disabledText : styles.text,
          textClassName ?? "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {displayedLabel}
      </Text>
      {!loading && icon && iconPosition === "right" ? (
        <View className="ml-2">
          <Ionicons name={icon} size={19} color={iconColor} />
        </View>
      ) : null}
    </TouchableOpacity>
  );
}
