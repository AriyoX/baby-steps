import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import { TouchableOpacity, View, useWindowDimensions } from "react-native";
import { Text } from "@/components/StyledText";
import { CachedImage } from "@/components/common/CachedImage";
import { brandColors } from "@/constants/Brand";
import { resolveImageSource } from "@/content/assets";
import type {
  ChooseCorrectWordItem,
  ChooseCorrectWordOption,
  ItemResult,
} from "@/content/learningHubTypes";
import { MechanicScreenFrame } from "./MechanicScreenFrame";

type ChooseCorrectWordCardProps = {
  item: ChooseCorrectWordItem;
  isLastItem: boolean;
  stageImageKey?: string;
  onComplete: (result: ItemResult) => void;
};

type AnswerState = "idle" | "correct" | "incorrect";

const getOptionSubtitle = (
  option: ChooseCorrectWordOption,
): string | undefined => option.englishText;

const hasOptionImage = (option: ChooseCorrectWordOption): boolean =>
  Boolean(option.imageAsset || option.imageKey);

export function ChooseCorrectWordCard({
  item,
  isLastItem,
  stageImageKey,
  onComplete,
}: ChooseCorrectWordCardProps) {
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
  const cardWidth = Math.min(840, Math.max(240, width - horizontalInset));
  const optionGap = isShortScreen ? 8 : 10;
  const optionImageSize = Math.min(
    isShortScreen ? 54 : 66,
    Math.max(46, height * 0.115),
  );

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
      mechanic: "choose_correct_word",
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
          accessibilityLabel={isLastItem ? "Finish" : "Next"}
          accessibilityState={{ disabled: !canComplete || isCompleting }}
        >
          <Text
            variant="bold"
            className="text-white text-lg mr-1"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.82}
          >
            {isLastItem ? "Finish" : "Next"}
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
              width: isWideLayout ? "34%" : "100%",
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
              Choose the correct word
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

            {item.questionText ? (
              <View
                className="bg-primary-50 rounded-2xl border-2 border-primary-100 items-center"
                style={{
                  marginTop: isShortScreen ? 8 : 12,
                  paddingHorizontal: isShortScreen ? 14 : 18,
                  paddingVertical: isShortScreen ? 9 : 12,
                  minWidth: 150,
                }}
              >
                <Text
                  variant="bold"
                  className="text-primary-700 text-center"
                  style={{ flexShrink: 1, fontSize: isShortScreen ? 21 : 25 }}
                  numberOfLines={3}
                  adjustsFontSizeToFit
                  minimumFontScale={0.78}
                >
                  {item.questionText}
                </Text>
              </View>
            ) : null}

            <Text
              className="text-neutral-500 text-center mt-2"
              style={{ fontSize: isShortScreen ? 12 : 13 }}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
            >
              Tap the word that matches
            </Text>
          </View>

          <View
            style={{
              flex: isWideLayout ? 1 : undefined,
              width: isWideLayout ? undefined : "100%",
              marginTop: isWideLayout ? 0 : isShortScreen ? 10 : 14,
            }}
          >
            {options.map((option) => {
              const selected = selectedOptionId === option.id;
              const correctSelection = answerState === "correct" && selected;
              const wrongSelection = answerState === "incorrect" && selected;
              const optionSubtitle = getOptionSubtitle(option);

              return (
                <TouchableOpacity
                  key={option.id}
                  className="rounded-2xl border-2 px-3 flex-row items-center"
                  style={{
                    marginBottom: optionGap,
                    paddingVertical: isShortScreen ? 7 : 9,
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
                  accessibilityLabel={`Choose ${option.localText}`}
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
                        width: optionImageSize,
                        height: optionImageSize,
                        borderRadius: 14,
                        marginRight: 12,
                      }}
                      resizeMode="cover"
                      accessibilityLabel={`${option.localText} choice`}
                    />
                  ) : (
                    <View
                      className="rounded-full items-center justify-center mr-3"
                      style={{
                        width: isShortScreen ? 40 : 44,
                        height: isShortScreen ? 40 : 44,
                        backgroundColor: selected
                          ? brandColors.equatorialGold
                          : brandColors.blue[50],
                      }}
                    >
                      <Ionicons
                        name={
                          correctSelection
                            ? "checkmark"
                            : wrongSelection
                              ? "refresh"
                              : "text"
                        }
                        size={isShortScreen ? 20 : 22}
                        color={
                          selected
                            ? brandColors.white
                            : brandColors.victoriaBlue
                        }
                      />
                    </View>
                  )}

                  <View className="flex-1" style={{ minWidth: 0 }}>
                    <Text
                      variant="bold"
                      className="text-primary-700"
                      style={{
                        flexShrink: 1,
                        fontSize: isShortScreen ? 17 : 19,
                        lineHeight: isShortScreen ? 21 : 23,
                      }}
                      numberOfLines={2}
                      adjustsFontSizeToFit
                      minimumFontScale={0.78}
                    >
                      {option.localText}
                    </Text>
                    {optionSubtitle ? (
                      <Text
                        className="text-neutral-600 mt-0.5"
                        style={{
                          flexShrink: 1,
                          fontSize: isShortScreen ? 12 : 13,
                          lineHeight: isShortScreen ? 15 : 16,
                        }}
                        numberOfLines={2}
                        adjustsFontSizeToFit
                        minimumFontScale={0.85}
                      >
                        {optionSubtitle}
                      </Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            })}

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
                  ? "This card needs choices."
                  : answerState === "correct"
                    ? "Yes, that's it!"
                    : answerState === "incorrect"
                      ? "Try again. Pick another word."
                      : attempts > 0
                        ? "Choose again"
                        : "Tap the word that matches"}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </MechanicScreenFrame>
  );
}
