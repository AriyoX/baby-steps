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
  description?: string;
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
  navigationPending?: boolean;
  onPress: () => void;
  showDescription?: boolean;
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
    navigationPending = false,
    onPress,
    showDescription = false,
    textHeight,
  },
  ref,
) {
  const isNarrow = cardWidth < 96;

  return (
    <TouchableOpacity
      ref={ref}
      accessibilityLabel={`${card.title}. ${card.status?.label ?? "Open"}.${card.description ? ` ${card.description}.` : ""}${card.progressLabel ? ` ${card.progressLabel}` : ""}`}
      accessibilityRole="button"
      accessibilityState={{
        busy: navigationPending,
        disabled: card.disabled || navigationPending,
      }}
      activeOpacity={0.82}
      disabled={card.disabled || navigationPending}
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
          opacity: card.disabled ? 0.8 : navigationPending ? 0.68 : 1,
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
            className="absolute right-2 top-2 flex-row items-center justify-center rounded-full"
            style={{
              backgroundColor: card.status.backgroundColor,
              height: isNarrow ? 28 : undefined,
              paddingHorizontal: isNarrow ? 0 : 10,
              paddingVertical: isNarrow ? 0 : 4,
              width: isNarrow ? 28 : undefined,
            }}
          >
            <Ionicons
              color={card.status.color}
              name={card.status.icon}
              size={13}
            />
            {!isNarrow ? (
              <Text
                className="ml-1 text-[10px]"
                numberOfLines={1}
                style={{ color: card.status.color }}
                variant="bold"
              >
                {card.status.label}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>

      <View
        className="justify-center bg-white"
        style={{
          height: textHeight,
          paddingHorizontal: isNarrow ? 7 : 12,
        }}
      >
        <View className="flex-row items-center">
          <MarqueeText
            className="text-[15px] text-primary-700"
            containerStyle={{ flex: 1, marginRight: isNarrow ? 4 : 8 }}
            variant="bold"
          >
            {card.title}
          </MarqueeText>
          <View
            className="items-center justify-center rounded-full bg-primary-50"
            style={{ height: isNarrow ? 24 : 28, width: isNarrow ? 24 : 28 }}
          >
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
        {showDescription && card.description ? (
          <Text
            className="mt-0.5 text-[11px] leading-4 text-neutral-600"
            numberOfLines={1}
          >
            {card.description}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
});
