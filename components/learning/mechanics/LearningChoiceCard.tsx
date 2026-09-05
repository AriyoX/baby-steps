import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { TouchableOpacity } from "react-native";

import { brandColors } from "@/constants/Brand";

export type LearningChoiceState =
  | "default"
  | "selected"
  | "correct"
  | "incorrect";

type LearningChoiceCardProps = {
  accessibilityLabel: string;
  children: ReactNode;
  disabled?: boolean;
  isShortScreen: boolean;
  onPress: () => void;
  state: LearningChoiceState;
  style?: StyleProp<ViewStyle>;
  variant?: "text" | "picture";
};

const stateColors = (state: LearningChoiceState) => {
  switch (state) {
    case "correct":
      return { backgroundColor: "#DCFCE7", borderColor: brandColors.success };
    case "incorrect":
      return {
        backgroundColor: brandColors.orange[50],
        borderColor: brandColors.shanaOrange,
      };
    case "selected":
      return {
        backgroundColor: brandColors.gold[50],
        borderColor: brandColors.equatorialGold,
      };
    default:
      return {
        backgroundColor: brandColors.white,
        borderColor: brandColors.equatorialGold,
      };
  }
};

export function LearningChoiceCard({
  accessibilityLabel,
  children,
  disabled = false,
  isShortScreen,
  onPress,
  state,
  style,
  variant = "text",
}: LearningChoiceCardProps) {
  const minimumHeight = variant === "picture"
    ? isShortScreen ? 112 : 136
    : isShortScreen ? 68 : 80;

  return (
    <TouchableOpacity
      accessibilityLabel={`${accessibilityLabel}${
        state === "correct"
          ? ", correct"
          : state === "incorrect"
            ? ", incorrect"
            : ""
      }`}
      accessibilityRole="button"
      accessibilityState={{ disabled, selected: state !== "default" }}
      activeOpacity={0.68}
      disabled={disabled}
      onPress={onPress}
      testID="learning-choice-card"
      style={[
        {
          minHeight: minimumHeight,
          alignItems: "stretch",
          borderRadius: isShortScreen ? 16 : 22,
          borderWidth: 2,
          flexDirection: "column",
          flexShrink: 0,
          justifyContent: "flex-start",
          opacity: disabled && state === "default" ? 0.62 : 1,
          padding: isShortScreen ? 4 : 6,
          shadowColor: brandColors.victoriaBlue,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: state === "default" ? 0.12 : 0.18,
          shadowRadius: 7,
          elevation: state === "default" ? 3 : 5,
          width: "100%",
          ...stateColors(state),
        },
        style,
      ]}
    >
      {children}
    </TouchableOpacity>
  );
}
