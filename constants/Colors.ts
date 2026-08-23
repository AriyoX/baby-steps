import { brandColors } from "@/constants/Brand";

const tintColorLight = brandColors.victoriaBlue;
const tintColorDark = brandColors.equatorialGold;

export const Colors = {
  light: {
    text: brandColors.charcoalBlack,
    background: brandColors.babyStepsWhite,
    tint: tintColorLight,
    icon: brandColors.neutral[600],
    tabIconDefault: brandColors.neutral[500],
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: brandColors.neutral[50],
    background: brandColors.neutral[900],
    tint: tintColorDark,
    icon: brandColors.neutral[300],
    tabIconDefault: brandColors.neutral[300],
    tabIconSelected: tintColorDark,
  },
};
