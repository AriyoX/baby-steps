import { forwardRef, type ComponentRef } from "react";
import { TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { CachedImage } from "@/components/common/CachedImage";
import { MarqueeText } from "@/components/common/MarqueeText";
import { Text } from "@/components/StyledText";
import { brandColors, brandShadows } from "@/constants/Brand";
import { resolveImageSource } from "@/content/contentRepository";

export type ChildActivityCardStatus = {
  backgroundColor: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
};

export type ChildActivityCardModel = {
  description: string;
  disabled?: boolean;
  id: string;
  image?: string;
  progressLabel?: string;
  stageId?: string;
  status?: ChildActivityCardStatus;
  targetPage: string;
  title: string;
};

type ChildActivityCardProps = {
  card: ChildActivityCardModel;
  cardGap: number;
  cardHeight: number;
  cardWidth: number;
  imageHeight: number;
  onPress: () => void;
  textHeight: number;
};

export const ChildActivityCard = forwardRef<
  ComponentRef<typeof TouchableOpacity>,
  ChildActivityCardProps
>(function ChildActivityCard(
  {
    card,
    cardGap,
    cardHeight,
    cardWidth,
    imageHeight,
    onPress,
    textHeight,
  },
  ref,
) {
  return (
    <TouchableOpacity
      ref={ref}
      accessibilityLabel={`${card.title}. ${card.status?.label ?? "Open"}. ${card.description}${card.progressLabel ? `. ${card.progressLabel}` : ""}`}
      accessibilityRole="button"
      accessibilityState={{ disabled: card.disabled }}
      activeOpacity={0.82}
      disabled={card.disabled}
      onPress={onPress}
      style={[
        brandShadows.soft,
        {
          backgroundColor: brandColors.white,
          borderColor: card.disabled
            ? brandColors.neutral[200]
            : brandColors.gold[200],
          borderRadius: 22,
          borderWidth: 1.5,
          height: cardHeight,
          marginRight: cardGap,
          opacity: card.disabled ? 0.8 : 1,
          overflow: "hidden",
          width: cardWidth,
        },
      ]}
    >
      <View style={{ height: imageHeight }}>
        <CachedImage
          accessibilityLabel={card.title}
          className="h-full w-full"
          fallbackSource={resolveImageSource("african-focus.png")}
          resizeMode="cover"
          source={resolveImageSource(card.image, "african-focus.png")}
        />
        <LinearGradient
          colors={["transparent", "rgba(35, 41, 53, 0.2)"]}
          pointerEvents="none"
          style={{
            bottom: 0,
            height: 44,
            left: 0,
            position: "absolute",
            right: 0,
          }}
        />
        {card.status ? (
          <View
            className="absolute right-2 top-2 flex-row items-center rounded-full px-2.5 py-1"
            style={{ backgroundColor: card.status.backgroundColor }}
          >
            <Ionicons
              color={card.status.color}
              name={card.status.icon}
              size={13}
            />
            <Text
              className="ml-1 text-[10px]"
              numberOfLines={1}
              style={{ color: card.status.color }}
              variant="bold"
            >
              {card.status.label}
            </Text>
          </View>
        ) : null}
      </View>

      <View
        className="justify-center bg-white px-3"
        style={{ height: textHeight }}
      >
        <View className="flex-row items-center">
          <MarqueeText
            className="text-[15px] text-primary-700"
            containerStyle={{ flex: 1, marginRight: 8 }}
            variant="bold"
          >
            {card.title}
          </MarqueeText>
          <View className="h-7 w-7 items-center justify-center rounded-full bg-primary-50">
            <Ionicons
              color={
                card.disabled
                  ? brandColors.neutral[500]
                  : brandColors.victoriaBlue
              }
              name={card.disabled ? "lock-closed" : "arrow-forward"}
              size={14}
            />
          </View>
        </View>
        <Text
          className="mt-1 text-xs leading-4 text-neutral-600"
          numberOfLines={2}
        >
          {card.description}
        </Text>
      </View>
    </TouchableOpacity>
  );
});
