import { Text as DefaultText, TextProps } from "react-native";

type FontVariant = "regular" | "bold" | "medium" | "light" | "semibold";

interface StyledTextProps extends TextProps {
  variant?: FontVariant;
}

export function Text({
  variant = "regular",
  style,
  ...props
}: StyledTextProps) {
  const fontFamily = {
    regular: "Quicksand-Regular",
    bold: "Quicksand-Bold",
    medium: "Quicksand-Medium",
    light: "Quicksand-Light",
    semibold: "Quicksand-SemiBold",
  }[variant];

  return <DefaultText style={[{ fontFamily }, style]} {...props} />;
}
