import { View, type ViewStyle } from "react-native";
import { LocalSvg } from "react-native-svg/css";
import type { SvgProps } from "react-native-svg";
import { brandAssets } from "@/constants/brandAssets";

type BrandMarkKind = "logo" | "wordmark" | "mascot" | "icon";
type BrandMarkTone = "main" | "blue" | "orange" | "gold" | "mono" | "shana" | "profile";

type BrandMarkProps = Omit<SvgProps, "width" | "height"> & {
  kind?: BrandMarkKind;
  tone?: BrandMarkTone;
  width?: number;
  height?: number;
  containerStyle?: ViewStyle;
};

const resolveBrandAsset = (kind: BrandMarkKind, tone: BrandMarkTone) => {
  if (kind === "mascot") return brandAssets.mascot.shana;
  if (kind === "icon") return brandAssets.icon.profile;

  const group = brandAssets[kind];
  const fallbackTone = tone in group ? tone : "main";

  return group[fallbackTone as keyof typeof group];
};

export function BrandMark({
  kind = "logo",
  tone = "main",
  width = kind === "wordmark" ? 180 : 96,
  height = kind === "wordmark" ? 44 : 96,
  containerStyle,
  ...svgProps
}: BrandMarkProps) {
  const asset = resolveBrandAsset(kind, tone);

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={asset.name}
      pointerEvents="none"
      style={[{ width, height, alignItems: "center", justifyContent: "center" }, containerStyle]}
    >
      <LocalSvg asset={asset.source} width={width} height={height} {...svgProps} />
    </View>
  );
}
