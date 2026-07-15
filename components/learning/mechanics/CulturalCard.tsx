import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { TouchableOpacity, View, useWindowDimensions } from "react-native";
import { Text } from "@/components/StyledText";
import { CachedImage } from "@/components/common/CachedImage";
import { brandColors } from "@/constants/Brand";
import { resolveImageSource } from "@/content/assets";
import type { CulturalCardItem, ItemResult } from "@/content/learningHubTypes";
import { MechanicScreenFrame } from "./MechanicScreenFrame";

type CulturalCardProps = {
  item: CulturalCardItem;
  isLastItem: boolean;
  stageImageKey?: string;
  onComplete: (result: ItemResult) => void;
};

const hasImage = (item: CulturalCardItem): boolean =>
  Boolean(item.imageAsset || item.imageKey);

export function CulturalCard({
  item,
  isLastItem,
  stageImageKey,
  onComplete,
}: CulturalCardProps) {
  const { width, height } = useWindowDimensions();
  const [isCompleting, setIsCompleting] = useState(false);
  const completionCalledRef = useRef(false);
  const isShortScreen = height < 430;
  const isWideLayout = width >= 620;
  const horizontalInset = width < 380 ? 32 : 48;
  const cardWidth = Math.min(860, Math.max(240, width - horizontalInset));
  const visualSize = Math.min(
    isShortScreen ? 116 : 154,
    Math.max(94, height * 0.28),
  );
  const actionLabel = isLastItem ? "Finish" : "Continue";

  useEffect(() => {
    completionCalledRef.current = false;
    setIsCompleting(false);
  }, [item.id]);

  const completeItem = () => {
    if (completionCalledRef.current) {
      return;
    }

    completionCalledRef.current = true;
    setIsCompleting(true);
    onComplete({
      itemId: item.id,
      mechanic: "cultural_card",
      completedAt: Date.now(),
      attempts: 1,
    });
  };

  return (
    <MechanicScreenFrame
      isShortScreen={isShortScreen}
      footer={
        <TouchableOpacity
          className="rounded-full px-5 py-3 flex-row items-center justify-center"
          style={{
            backgroundColor: isLastItem
              ? brandColors.success
              : brandColors.shanaOrange,
            maxWidth: "100%",
            opacity: isCompleting ? 0.72 : 1,
          }}
          onPress={completeItem}
          disabled={isCompleting}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          accessibilityState={{ disabled: isCompleting }}
        >
          <Text
            variant="bold"
            className="text-white text-base mr-1"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.82}
          >
            {actionLabel}
          </Text>
          <Ionicons
            name={isLastItem ? "checkmark" : "chevron-forward"}
            size={18}
            color="#ffffff"
          />
        </TouchableOpacity>
      }
    >
      <View
        className="bg-white rounded-2xl border-2 border-accent-500"
        style={{ width: cardWidth, padding: isShortScreen ? 14 : 18 }}
      >
        <View
          style={{
            flexDirection: isWideLayout ? "row" : "column",
            alignItems: isWideLayout ? "stretch" : "center",
          }}
        >
          <View
            style={{
              width: isWideLayout ? "31%" : "100%",
              paddingRight: isWideLayout ? 22 : 0,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <View
              className="rounded-2xl items-center justify-center border-2 border-primary-100"
              style={{
                width: visualSize,
                height: visualSize,
                backgroundColor: brandColors.blue[50],
                overflow: "hidden",
              }}
              testID="cultural-card-visual"
              accessibilityLabel={`${item.title} picture`}
            >
              {hasImage(item) ? (
                <CachedImage
                  source={resolveImageSource(
                    item.imageAsset ?? item.imageKey,
                    stageImageKey,
                  )}
                  fallbackSource={resolveImageSource(stageImageKey)}
                  style={{ width: visualSize, height: visualSize }}
                  resizeMode="cover"
                  accessibilityLabel={`${item.title} picture`}
                />
              ) : item.emoji ? (
                <Text
                  style={{ fontSize: isShortScreen ? 48 : 60 }}
                  accessibilityLabel={`${item.title} picture`}
                >
                  {item.emoji}
                </Text>
              ) : (
                <Ionicons
                  name="sparkles-outline"
                  size={isShortScreen ? 42 : 54}
                  color={brandColors.victoriaBlue}
                  testID="cultural-card-fallback-visual"
                />
              )}
            </View>

            {item.localText ? (
              <View
                className="bg-accent-50 rounded-2xl border-2 border-accent-100 items-center"
                style={{
                  marginTop: isShortScreen ? 8 : 12,
                  maxWidth: "100%",
                  paddingHorizontal: 14,
                  paddingVertical: isShortScreen ? 8 : 10,
                  minWidth: 150,
                }}
              >
                {item.localTitle ? (
                  <Text
                    className="text-neutral-500 text-center"
                    style={{ fontSize: isShortScreen ? 11 : 12 }}
                    numberOfLines={2}
                    adjustsFontSizeToFit
                    minimumFontScale={0.85}
                  >
                    {item.localTitle}
                  </Text>
                ) : null}
                <Text
                  variant="bold"
                  className="text-primary-700 text-center"
                  style={{ flexShrink: 1, fontSize: isShortScreen ? 20 : 24 }}
                  numberOfLines={3}
                  adjustsFontSizeToFit
                  minimumFontScale={0.74}
                >
                  {item.localText}
                </Text>
              </View>
            ) : null}
          </View>

          <View
            style={{
              flex: isWideLayout ? 1 : undefined,
              width: isWideLayout ? undefined : "100%",
              marginTop: isWideLayout ? 0 : isShortScreen ? 10 : 14,
              justifyContent: "center",
            }}
          >
            <Text
              variant="bold"
              className="text-primary-700 text-center"
              style={{
                fontSize: isShortScreen ? 23 : 29,
                lineHeight: isShortScreen ? 28 : 34,
              }}
              numberOfLines={3}
              adjustsFontSizeToFit
              minimumFontScale={0.76}
            >
              {item.title}
            </Text>

            <Text
              className="text-neutral-700 text-center mt-2"
              style={{
                fontSize: isShortScreen ? 15 : 17,
                lineHeight: isShortScreen ? 20 : 23,
                flexShrink: 1,
              }}
            >
              {item.bodyText}
            </Text>

            {item.funFact ? (
              <View
                className="rounded-2xl border-2 border-secondary-100 bg-secondary-50"
                style={{
                  marginTop: isShortScreen ? 8 : 12,
                  paddingHorizontal: 12,
                  paddingVertical: isShortScreen ? 8 : 10,
                }}
              >
                <Text
                  variant="bold"
                  className="text-primary-700 text-center"
                  style={{ fontSize: isShortScreen ? 13 : 14 }}
                  numberOfLines={1}
                >
                  Fun fact
                </Text>
                <Text
                  className="text-neutral-700 text-center mt-1"
                  style={{
                    flexShrink: 1,
                    fontSize: isShortScreen ? 13 : 14,
                    lineHeight: isShortScreen ? 17 : 18,
                  }}
                >
                  {item.funFact}
                </Text>
              </View>
            ) : null}

            {item.reflectionPrompt ? (
              <Text
                variant="medium"
                className="text-neutral-600 text-center mt-2"
                style={{
                  flexShrink: 1,
                  fontSize: isShortScreen ? 13 : 15,
                  lineHeight: isShortScreen ? 17 : 19,
                }}
              >
                {item.reflectionPrompt}
              </Text>
            ) : null}
          </View>
        </View>
      </View>
    </MechanicScreenFrame>
  );
}
