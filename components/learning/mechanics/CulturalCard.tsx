import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { Text } from "@/components/StyledText";
import { ActivityButton } from "@/components/learning/ActivityControls";
import { LearningIllustratedScreen } from "@/components/learning/LearningIllustratedScreen";
import { activityColors, activityStyles } from "@/constants/ActivityTheme";
import { useChildUiLanguage } from "@/context/ChildUiLanguageContext";
import { resolveImageSource } from "@/content/assets";
import type { CulturalCardItem, ItemResult } from "@/content/learningHubTypes";

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
  const { t } = useChildUiLanguage();
  const [isCompleting, setIsCompleting] = useState(false);
  const completionCalledRef = useRef(false);
  const actionLabel = t(isLastItem ? "common.finish" : "common.continue");

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
    <LearningIllustratedScreen
      imageSource={hasImage(item) ? resolveImageSource(item.imageAsset ?? item.imageKey, stageImageKey) : undefined}
      fallbackSource={resolveImageSource(stageImageKey)}
      imageLabel={`${item.title} picture`}
      emoji={item.emoji}
      fallbackIcon="sparkles-outline"
      visualTestID="cultural-card-visual"
      fallbackTestID="cultural-card-fallback-visual"
      footer={
        <ActivityButton
          label={actionLabel}
          icon={isLastItem ? "checkmark" : "chevron-forward"}
          tone={isLastItem ? "success" : "primary"}
          disabled={isCompleting}
          onPress={completeItem}
        />
      }
    >
      {({ isShort, isTablet }) => (
        <>
          <Text variant="bold" style={{ color: activityColors.ink, fontSize: isShort ? 24 : isTablet ? 34 : 30 }}>
            {item.title}
          </Text>
          <Text style={{ color: activityColors.muted, fontSize: isShort ? 16 : isTablet ? 20 : 18, lineHeight: isShort ? 22 : isTablet ? 28 : 25, marginTop: 12 }}>
            {item.bodyText}
          </Text>
          {item.localText ? (
            <View style={[activityStyles.inset, { marginTop: isShort ? 12 : 20 }]}>
              {item.localTitle ? (
                <Text style={{ color: activityColors.muted, fontSize: isShort ? 13 : 16, marginBottom: 4 }}>
                  {item.localTitle}
                </Text>
              ) : null}
              <Text variant="bold" style={{ color: activityColors.ink, fontSize: isShort ? 20 : isTablet ? 27 : 24 }}>
                {item.localText}
              </Text>
            </View>
          ) : null}
          {item.funFact ? (
            <View style={{ marginTop: isShort ? 12 : 20 }}>
              <Text variant="bold" style={{ color: activityColors.ink, fontSize: isShort ? 15 : 19 }}>Fun fact</Text>
              <Text style={{ color: activityColors.muted, fontSize: isShort ? 14 : 18, marginTop: 4 }}>{item.funFact}</Text>
            </View>
          ) : null}
          {item.reflectionPrompt ? (
            <Text variant="medium" style={{ color: activityColors.muted, fontSize: isShort ? 14 : 17, marginTop: 12 }}>
              {item.reflectionPrompt}
            </Text>
          ) : null}
        </>
      )}
    </LearningIllustratedScreen>
  );
}
