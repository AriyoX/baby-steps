import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import { TouchableOpacity, View, useWindowDimensions } from "react-native";
import { Text } from "@/components/StyledText";
import { CachedImage } from "@/components/common/CachedImage";
import { brandColors } from "@/constants/Brand";
import { useChildUiLanguage } from "@/context/ChildUiLanguageContext";
import { resolveImageSource } from "@/content/assets";
import type {
  ItemResult,
  MatchWordPictureItem,
  MatchWordPictureOption,
} from "@/content/learningHubTypes";
import { MechanicScreenFrame } from "./MechanicScreenFrame";

type MatchWordPictureCardProps = {
  item: MatchWordPictureItem;
  isLastItem: boolean;
  stageImageKey?: string;
  onComplete: (result: ItemResult) => void;
};

type AnswerState = "idle" | "correct" | "incorrect";

const getOptionTitle = (option: MatchWordPictureOption): string =>
  option.englishText ?? option.localText ?? option.id;

const hasOptionImage = (option: MatchWordPictureOption): boolean =>
  Boolean(option.imageAsset || option.imageKey);

export function MatchWordPictureCard({
  item,
  isLastItem,
  stageImageKey,
  onComplete,
}: MatchWordPictureCardProps) {
  const { t } = useChildUiLanguage();
  const { width, height } = useWindowDimensions();
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [answerState, setAnswerState] = useState<AnswerState>("idle");
  const [attempts, setAttempts] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);
  const attemptsRef = useRef(0);
  const completionCalledRef = useRef(false);

  const options = useMemo(() => item.options.slice(0, 4), [item.options]);
  const correctOption = options.find(
    (option) => option.id === item.correctOptionId,
  );
  const canAnswer = options.length >= 2 && Boolean(correctOption);
  const canComplete = answerState === "correct";
  const isShortScreen = height < 430;
  const isWideLayout = width >= 620;
  const horizontalInset = width < 380 ? 32 : 48;
  const cardWidth = Math.min(860, Math.max(240, width - horizontalInset));
  const optionGap = isShortScreen ? 8 : 10;
  const optionVisualSize = Math.min(
    isShortScreen ? 64 : 80,
    Math.max(54, height * 0.145),
  );
  const optionWidth = isWideLayout || width >= 520 ? "48%" : "100%";

  useEffect(() => {
    attemptsRef.current = 0;
    completionCalledRef.current = false;
    setSelectedOptionId(null);
    setAnswerState("idle");
    setAttempts(0);
    setIsCompleting(false);
  }, [item.id]);

  const selectOption = (optionId: string) => {
    if (!canAnswer || answerState === "correct" || isCompleting) {
      return;
    }

    attemptsRef.current += 1;
    setAttempts(attemptsRef.current);
    setSelectedOptionId(optionId);

    if (optionId === item.correctOptionId) {
      setAnswerState("correct");
      return;
    }

    setAnswerState("incorrect");
  };

  const completeItem = () => {
    if (!canComplete || completionCalledRef.current) {
      return;
    }

    completionCalledRef.current = true;
    setIsCompleting(true);
    onComplete({
      itemId: item.id,
      mechanic: "match_word_picture",
      completedAt: Date.now(),
      correct: true,
      attempts: attemptsRef.current,
    });
  };

  return (
    <MechanicScreenFrame
      isShortScreen={isShortScreen}
      footer={
        <TouchableOpacity
          className="rounded-full px-6 py-3 flex-row items-center justify-center"
          style={{
            backgroundColor: isLastItem
              ? brandColors.success
              : brandColors.shanaOrange,
            maxWidth: "100%",
            opacity: canComplete && !isCompleting ? 1 : 0.55,
          }}
          onPress={completeItem}
          disabled={!canComplete || isCompleting}
          accessibilityRole="button"
          accessibilityLabel={t(isLastItem ? "common.finish" : "common.next")}
          accessibilityState={{ disabled: !canComplete || isCompleting }}
        >
          <Text
            variant="bold"
            className="text-white text-lg mr-1"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.82}
          >
            {t(isLastItem ? "common.finish" : "common.next")}
          </Text>
          <Ionicons
            name={isLastItem ? "checkmark" : "chevron-forward"}
            size={20}
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
              width: isWideLayout ? "32%" : "100%",
              paddingRight: isWideLayout ? 20 : 0,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              variant="bold"
              className="text-primary-700 text-center"
              style={{
                fontSize: isShortScreen ? 22 : 26,
                lineHeight: isShortScreen ? 27 : 31,
              }}
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.78}
            >
              Match the word
            </Text>
            <Text
              variant="medium"
              className="text-neutral-600 text-center mt-1"
              style={{ flexShrink: 1, fontSize: isShortScreen ? 15 : 17 }}
              numberOfLines={3}
              adjustsFontSizeToFit
              minimumFontScale={0.82}
            >
              {item.promptText}
            </Text>

            <View
              className="bg-primary-50 rounded-2xl border-2 border-primary-100 items-center"
              style={{
                marginTop: isShortScreen ? 8 : 12,
                paddingHorizontal: isShortScreen ? 14 : 18,
                paddingVertical: isShortScreen ? 9 : 12,
                maxWidth: "100%",
                minWidth: 150,
              }}
            >
              <Text
                variant="bold"
                className="text-primary-700 text-center"
                style={{ flexShrink: 1, fontSize: isShortScreen ? 26 : 32 }}
                numberOfLines={2}
                adjustsFontSizeToFit
                minimumFontScale={0.72}
              >
                {item.targetText}
              </Text>
              {item.targetEnglishText ? (
                <Text
                  variant="medium"
                  className="text-neutral-600 text-center mt-1"
                  style={{ fontSize: isShortScreen ? 13 : 15 }}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.84}
                >
                  {item.targetEnglishText}
                </Text>
              ) : null}
            </View>

            <Text
              className="text-neutral-500 text-center mt-2"
              style={{ fontSize: isShortScreen ? 12 : 13 }}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
            >
              Tap the picture that matches
            </Text>
          </View>

          <View
            style={{
              flex: isWideLayout ? 1 : undefined,
              width: isWideLayout ? undefined : "100%",
              marginTop: isWideLayout ? 0 : isShortScreen ? 10 : 14,
            }}
          >
            <View className="flex-row flex-wrap justify-between">
              {options.map((option) => {
                const selected = selectedOptionId === option.id;
                const correctSelection = answerState === "correct" && selected;
                const wrongSelection = answerState === "incorrect" && selected;
                const optionTitle = getOptionTitle(option);

                return (
                  <TouchableOpacity
                    key={option.id}
                    className="rounded-2xl border-2 items-center"
                    style={{
                      width: optionWidth,
                      minHeight: isShortScreen ? 92 : 112,
                      marginBottom: optionGap,
                      paddingHorizontal: 8,
                      paddingVertical: isShortScreen ? 8 : 10,
                      backgroundColor: correctSelection
                        ? "#DCFCE7"
                        : wrongSelection
                          ? brandColors.orange[50]
                          : selected
                            ? brandColors.gold[50]
                            : brandColors.neutral[50],
                      borderColor: correctSelection
                        ? brandColors.success
                        : wrongSelection
                          ? brandColors.shanaOrange
                          : selected
                            ? brandColors.equatorialGold
                            : brandColors.neutral[200],
                      opacity: canAnswer ? 1 : 0.64,
                    }}
                    onPress={() => selectOption(option.id)}
                    disabled={
                      !canAnswer || answerState === "correct" || isCompleting
                    }
                    activeOpacity={0.76}
                    accessibilityRole="button"
                    accessibilityLabel={`Choose ${optionTitle}`}
                    accessibilityState={{
                      disabled:
                        !canAnswer || answerState === "correct" || isCompleting,
                      selected,
                    }}
                  >
                    {hasOptionImage(option) ? (
                      <CachedImage
                        source={resolveImageSource(
                          option.imageAsset ?? option.imageKey,
                          stageImageKey,
                        )}
                        fallbackSource={resolveImageSource(stageImageKey)}
                        style={{
                          width: optionVisualSize,
                          height: optionVisualSize,
                          borderRadius: 16,
                        }}
                        resizeMode="cover"
                        accessibilityLabel={`${optionTitle} picture`}
                      />
                    ) : option.emoji ? (
                      <View
                        className="rounded-2xl items-center justify-center"
                        style={{
                          width: optionVisualSize,
                          height: optionVisualSize,
                          backgroundColor: selected
                            ? brandColors.gold[100]
                            : brandColors.blue[50],
                        }}
                      >
                        <Text
                          style={{ fontSize: isShortScreen ? 30 : 38 }}
                          accessibilityLabel={`${optionTitle} picture`}
                        >
                          {option.emoji}
                        </Text>
                      </View>
                    ) : (
                      <View
                        className="rounded-2xl items-center justify-center"
                        style={{
                          width: optionVisualSize,
                          height: optionVisualSize,
                          backgroundColor: selected
                            ? brandColors.equatorialGold
                            : brandColors.blue[50],
                        }}
                      >
                        <Ionicons
                          name={
                            correctSelection ? "checkmark" : "image-outline"
                          }
                          size={isShortScreen ? 24 : 28}
                          color={
                            selected
                              ? brandColors.white
                              : brandColors.victoriaBlue
                          }
                        />
                      </View>
                    )}

                    <Text
                      variant="bold"
                      className="text-primary-700 text-center mt-2"
                      style={{
                        flexShrink: 1,
                        fontSize: isShortScreen ? 13 : 14,
                        lineHeight: isShortScreen ? 16 : 18,
                      }}
                      numberOfLines={2}
                      adjustsFontSizeToFit
                      minimumFontScale={0.78}
                    >
                      {optionTitle}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View
              className="items-center justify-center"
              style={{
                marginTop: 2,
                minHeight: isShortScreen ? 30 : 36,
                paddingHorizontal: 4,
              }}
            >
              <Text
                variant="bold"
                className="text-center"
                style={{
                  fontSize: isShortScreen ? 15 : 17,
                  color:
                    answerState === "correct"
                      ? brandColors.success
                      : answerState === "incorrect"
                        ? brandColors.shanaOrange
                        : brandColors.neutral[600],
                }}
                numberOfLines={2}
                adjustsFontSizeToFit
                minimumFontScale={0.78}
              >
                {!canAnswer
                  ? "This card needs picture choices."
                  : answerState === "correct"
                    ? "Yes, that matches!"
                    : answerState === "incorrect"
                      ? "Nice try. Tap another picture."
                      : attempts > 0
                        ? "Choose again"
                        : "Tap the matching picture"}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </MechanicScreenFrame>
  );
}
