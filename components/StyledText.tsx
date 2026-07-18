import { Text as DefaultText, TextProps } from "react-native";
import { brandFonts } from "@/constants/Brand";

type FontVariant = "regular" | "bold" | "medium" | "light" | "semibold" | "display";

export interface StyledTextProps extends TextProps {
  variant?: FontVariant;
}

export function Text({
  variant = "regular",
  style,
  ...props
}: StyledTextProps) {
  const fontFamily = {
    regular: brandFonts.body,
    bold: brandFonts.heading,
    medium: brandFonts.medium,
    light: brandFonts.light,
    semibold: brandFonts.semibold,
    display: brandFonts.display,
  }[variant];

  return <DefaultText style={[{ fontFamily }, style]} {...props} />;
}
