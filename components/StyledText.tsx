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
    regular: "Atma-Regular",
    bold: "Atma-Bold",
    medium: "Atma-Medium",
    light: "Atma-Light",
    semibold: "Atma-SemiBold",
  }[variant];

  return <DefaultText style={[{ fontFamily }, style]} {...props} />;
}
