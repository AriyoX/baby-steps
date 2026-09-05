import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { View, useWindowDimensions } from "react-native";

import { Text } from "@/components/StyledText";
import { ActivityButton, ActivityAudioButton } from "@/components/learning/ActivityControls";
import { activityColors } from "@/constants/ActivityTheme";
import { CachedImage } from "@/components/common/CachedImage";
import { brandColors } from "@/constants/Brand";
import { resolveImageSource } from "@/content/assets";
import { getLearningActivityLayout } from "@/lib/responsiveLayout";
import { LearningChoiceCard } from "./LearningChoiceCard";
import { MechanicScreenFrame } from "./MechanicScreenFrame";

type ChoiceOption = {
  id: string;
  title: string;
  subtitle?: string;
  imageAsset?: string;
  imageKey?: string;
  emoji?: string;
  imageAccessibilityLabel?: string;
};

type LearningChoiceBoardProps = {
  title?: string;
  prompt: string;
  targetText?: string;
  targetEnglishText?: string;
  progressText?: string;
  options: ChoiceOption[];
  stageImageKey?: string;
  selectedOptionId: string | null;
  answerState: "idle" | "correct" | "incorrect";
  choicesDisabled: boolean;
  onSelect: (optionId: string) => void;
  feedback: string;
  actionLabel: string;
  actionDisabled: boolean;
  isFinish: boolean;
  onContinue: () => void;
  fallbackIcon?: "text" | "help" | "image-outline";
  audio?: { failed: boolean; onReplay: () => void };
};

const inkColor = activityColors.ink;

export function LearningChoiceBoard({
  title,
  prompt,
  targetText,
  targetEnglishText,
  progressText,
  options,
  stageImageKey,
  selectedOptionId,
  answerState,
  choicesDisabled,
  onSelect,
  feedback,
  actionLabel,
  actionDisabled,
  isFinish,
  onContinue,
  fallbackIcon = "text",
  audio,
}: LearningChoiceBoardProps) {
  const { width, height } = useWindowDimensions();
  const [contentSize, setContentSize] = useState({
    width: 0,
    height: 0,
    windowWidth: width,
    windowHeight: height,
  });
  const [headerHeight, setHeaderHeight] = useState(0);
  const hasCurrentMeasurements =
    contentSize.windowWidth === width && contentSize.windowHeight === height;
  const layout = getLearningActivityLayout(
    width,
    height,
    options.length,
    hasCurrentMeasurements ? { ...contentSize, headerHeight } : undefined,
  );
  const { isShort, isTablet, cardPadding, choiceGap } = layout;
  const normalizedPrompt = prompt.toLowerCase();
  const showTarget = targetText && (
    !normalizedPrompt.includes(targetText.toLowerCase()) ||
    (targetEnglishText && !normalizedPrompt.includes(targetEnglishText.toLowerCase()))
  );

  return (
    <MechanicScreenFrame
      isShortScreen={isShort}
      surface="panel"
      contentPadding={cardPadding}
      style={{ alignSelf: "center", maxWidth: isTablet ? 1280 : 920, width: "100%" }}
      onViewportLayout={(size) => {
        setContentSize((current) =>
          current.width === size.width && current.height === size.height &&
          current.windowWidth === width && current.windowHeight === height
            ? current
            : { ...size, windowWidth: width, windowHeight: height },
        );
      }}
      footerAside={
          <Text
            accessibilityLiveRegion="polite"
            variant="bold"
            style={{
              color: answerState === "correct"
                ? brandColors.success
                : answerState === "incorrect"
                  ? brandColors.orange[700]
                  : brandColors.neutral[600],
              fontSize: isShort ? 13 : isTablet ? 17 : 15,
              minWidth: 0,
            }}
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.82}
          >
            {feedback}
          </Text>
      }
      footer={
        <ActivityButton
          label={actionLabel}
          disabled={actionDisabled}
          onPress={onContinue}
          icon={isFinish ? "checkmark" : "chevron-forward"}
          tone={isFinish ? "success" : "primary"}
        />
      }
    >
      <View
        onLayout={(event) => {
          const nextHeight = Math.ceil(event.nativeEvent.layout.height);
          setHeaderHeight((current) => current === nextHeight ? current : nextHeight);
        }}
        testID="learning-choice-header"
        style={{ alignItems: "center", columnGap: choiceGap, flexDirection: "row", marginBottom: choiceGap, width: "100%" }}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          {title ? <Text
            variant="bold"
            style={{ color: inkColor, fontSize: isShort ? 20 : isTablet ? 29 : 25, lineHeight: isShort ? 24 : isTablet ? 35 : 30 }}
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.82}
          >
            {title}
          </Text> : null}
          <Text
            variant="medium"
            style={{ color: brandColors.neutral[600], fontSize: isShort ? 13 : isTablet ? 17 : 15, lineHeight: isShort ? 17 : isTablet ? 23 : 20, marginTop: title ? (isShort ? 2 : 5) : 0 }}
            numberOfLines={3}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
          >
            {prompt}
          </Text>
          {showTarget ? (
            <Text
              variant="bold"
              style={{ color: inkColor, fontSize: isShort ? 17 : isTablet ? 24 : 20, marginTop: 4 }}
            >
              {targetText}{targetEnglishText ? ` · ${targetEnglishText}` : ""}
            </Text>
          ) : null}
          {progressText ? (
            <Text variant="medium" style={{ color: inkColor, fontSize: isShort ? 12 : 15, marginTop: 4 }}>
              {progressText}
            </Text>
          ) : null}
        </View>
        {audio ? (
          <ActivityAudioButton
            accessibilityLabel="Replay word"
            failed={audio.failed}
            onPress={audio.onReplay}
          />
        ) : null}
      </View>

      <View
        testID="learning-choice-grid"
        style={{ alignItems: "stretch", columnGap: choiceGap, flexDirection: "row", flexWrap: "wrap", justifyContent: "center", rowGap: choiceGap, width: "100%" }}
      >
        {options.map((option) => {
          const selected = option.id === selectedOptionId;
          const state = selected && answerState !== "idle" ? answerState : selected ? "selected" : "default";
          const hasImage = Boolean(option.imageAsset || option.imageKey);
          const visualLabel = option.imageAccessibilityLabel ?? `${option.title} choice`;

          return (
            <LearningChoiceCard
              key={option.id}
              accessibilityLabel={`Choose ${option.title}`}
              disabled={choicesDisabled}
              isShortScreen={isShort}
              onPress={() => onSelect(option.id)}
              state={state}
              style={{ minHeight: layout.choiceHeight, width: layout.choiceWidth }}
              variant={hasImage || option.emoji ? "picture" : "text"}
            >
              {hasImage ? (
                <CachedImage
                  source={resolveImageSource(option.imageAsset ?? option.imageKey, stageImageKey)}
                  fallbackSource={resolveImageSource(stageImageKey)}
                  accessibilityLabel={visualLabel}
                  resizeMode="cover"
                  style={{ borderRadius: isShort ? 11 : 16, height: layout.choiceImageHeight, width: "100%" }}
                />
              ) : (
                <View
                  style={{ alignItems: "center", backgroundColor: selected ? brandColors.gold[100] : brandColors.blue[50], borderRadius: isShort ? 11 : 16, height: layout.choiceImageHeight, justifyContent: "center", width: "100%" }}
                >
                  {option.emoji ? (
                    <Text accessibilityLabel={visualLabel} style={{ fontSize: layout.imageSize }}>{option.emoji}</Text>
                  ) : (
                    <Ionicons name={state === "correct" ? "checkmark" : state === "incorrect" ? "refresh" : fallbackIcon} size={layout.imageSize} color={inkColor} />
                  )}
                </View>
              )}
              <View style={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: isShort ? 4 : 10, paddingVertical: isShort ? 5 : 12, width: "100%" }}>
                <Text
                  variant="bold"
                  style={{ color: inkColor, fontSize: isShort ? 16 : isTablet ? 24 : 20, lineHeight: isShort ? 19 : isTablet ? 29 : 24, textAlign: "center" }}
                  numberOfLines={2}
                  adjustsFontSizeToFit
                  minimumFontScale={0.82}
                >
                  {option.title}
                </Text>
                {option.subtitle ? (
                  <Text
                    style={{ color: brandColors.neutral[600], fontSize: isShort ? 12 : isTablet ? 17 : 14, lineHeight: isShort ? 15 : isTablet ? 22 : 18, marginTop: isShort ? 2 : 5, textAlign: "center" }}
                    numberOfLines={3}
                    adjustsFontSizeToFit
                    minimumFontScale={0.85}
                  >
                    {option.subtitle}
                  </Text>
                ) : null}
              </View>
            </LearningChoiceCard>
          );
        })}
      </View>
    </MechanicScreenFrame>
  );
}
