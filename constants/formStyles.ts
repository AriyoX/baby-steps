import type { TextStyle } from "react-native";

export const readableTextInputStyle = {
  fontFamily: "Quicksand-Regular",
  fontSize: 18,
  lineHeight: 24,
  paddingVertical: 0,
  textAlignVertical: "center",
  textDecorationLine: "none",
} satisfies TextStyle;

export const keyboardAwareScrollContentStyle = {
  flexGrow: 1,
  paddingBottom: 56,
};
