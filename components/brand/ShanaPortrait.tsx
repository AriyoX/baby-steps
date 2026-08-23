import {
  Image,
  type ImageProps,
  type ImageSourcePropType,
  type ImageStyle,
  type StyleProp,
} from "react-native";

export type ShanaPortraitVariant =
  | "celebrate"
  | "family"
  | "offline"
  | "reading"
  | "welcome";

const SHANA_PORTRAITS: Record<ShanaPortraitVariant, ImageSourcePropType> = {
  celebrate: require("@/assets/images/shana/shana-celebrate.png"),
  family: require("@/assets/images/shana/shana-family.png"),
  offline: require("@/assets/images/shana/shana-offline.png"),
  reading: require("@/assets/images/shana/shana-reading.png"),
  welcome: require("@/assets/images/shana/shana-welcome.png"),
};

const SHANA_LABELS: Record<ShanaPortraitVariant, string> = {
  celebrate: "Shana celebrating an achievement",
  family: "Shana holding a heart",
  offline: "Shana offering reassurance",
  reading: "Shana reading a picture book",
  welcome: "Shana waving hello",
};

type ShanaPortraitProps = Omit<ImageProps, "source" | "style"> & {
  height: number;
  style?: StyleProp<ImageStyle>;
  variant: ShanaPortraitVariant;
  width: number;
};

export function ShanaPortrait({
  accessibilityLabel,
  height,
  resizeMode = "contain",
  style,
  variant,
  width,
  ...imageProps
}: ShanaPortraitProps) {
  return (
    <Image
      accessibilityLabel={accessibilityLabel ?? SHANA_LABELS[variant]}
      resizeMode={resizeMode}
      source={SHANA_PORTRAITS[variant]}
      style={[{ height, width }, style]}
      {...imageProps}
    />
  );
}
