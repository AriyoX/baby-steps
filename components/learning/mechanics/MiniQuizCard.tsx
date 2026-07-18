import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import { TouchableOpacity, View, useWindowDimensions } from "react-native";
import { Text } from "@/components/StyledText";
import { brandColors } from "@/constants/Brand";
import { useChildUiLanguage } from "@/context/ChildUiLanguageContext";
import type {
  ItemResult,
  MiniQuizItem,
  MiniQuizOption,
} from "@/content/learningHubTypes";
import { MechanicScreenFrame } from "./MechanicScreenFrame";

type MiniQuizCardProps = {
  item: MiniQuizItem;
  isLastItem: boolean;
  stageImageKey?: string;
  onComplete: (result: ItemResult) => void;
};

type AnswerState = "idle" | "correct" | "incorrect";

const getOptionSubtitle = (option: MiniQuizOption): string | undefined =>
  option.englishText;

export function MiniQuizCard({
  item,
  isLastItem,
  onComplete,
}: MiniQuizCardProps) {
  const { t } = useChildUiLanguage();
  const { width, height } = useWindowDimensions();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [answerState, setAnswerState] = useState<AnswerState>("idle");
  const [attempts, setAttempts] = useState(0);
  const [correctQuestionCount, setCorrectQuestionCount] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);
  const attemptsRef = useRef(0);
  const correctQuestionIdsRef = useRef<Set<string>>(new Set());
  const completionCalledRef = useRef(false);

  const questions = useMemo(() => item.questions, [item.questions]);
  const currentQuestion = questions[currentQuestionIndex];
  const options = currentQuestion?.options ?? [];
  const correctOption = currentQuestion
    ? options.find((option) => option.id === currentQuestion.correctOptionId)
    : undefined;
  const canAnswer = Boolean(currentQuestion) && options.length >= 2 && Boolean(correctOption);
  const isCurrentQuestionCorrect = answerState === "correct";
  const isFinalQuizQuestion = currentQuestionIndex >= questions.length - 1;
  const canContinue = isCurrentQuestionCorrect && !isCompleting;
  const isShortScreen = height < 430;
  const isWideLayout = width >= 620;
  const horizontalInset = width < 380 ? 32 : 48;
  const cardWidth = Math.min(860, Math.max(240, width - horizontalInset));
  const optionGap = isShortScreen ? 8 : 10;

  useEffect(() => {
    attemptsRef.current = 0;
    correctQuestionIdsRef.current = new Set();
    completionCalledRef.current = false;
    setCurrentQuestionIndex(0);
    setSelectedOptionId(null);
    setAnswerState("idle");
    setAttempts(0);
    setCorrectQuestionCount(0);
    setIsCompleting(false);
  }, [item.id]);

  const selectOption = (optionId: string) => {
    if (!canAnswer || isCurrentQuestionCorrect || isCompleting || !currentQuestion) {
      return;
    }

    attemptsRef.current += 1;
    setAttempts(attemptsRef.current);
    setSelectedOptionId(optionId);

    if (optionId === currentQuestion.correctOptionId) {
      const correctQuestionIds = new Set(correctQuestionIdsRef.current);
      correctQuestionIds.add(currentQuestion.id);
      correctQuestionIdsRef.current = correctQuestionIds;
      setCorrectQuestionCount(correctQuestionIds.size);
      setAnswerState("correct");
      return;
    }

    setAnswerState("incorrect");
  };

  const resetQuestionState = () => {
    setSelectedOptionId(null);
    setAnswerState("idle");
  };

  const continueQuiz = () => {
    if (!canContinue || !currentQuestion) {
      return;
    }

    if (!isFinalQuizQuestion) {
      setCurrentQuestionIndex((index) => Math.min(index + 1, questions.length - 1));
      resetQuestionState();
      return;
    }

    if (
      completionCalledRef.current ||
      correctQuestionIdsRef.current.size !== questions.length
    ) {
      return;
    }

    completionCalledRef.current = true;
    setIsCompleting(true);
    onComplete({
      itemId: item.id,
      mechanic: "mini_quiz",
      completedAt: Date.now(),
      correct: true,
      attempts: attemptsRef.current,
    });
  };

  const actionLabel = !isFinalQuizQuestion
    ? t("learning.nextQuestion")
    : isLastItem
      ? t("common.finish")
      : t("common.next");
  const actionIcon = !isFinalQuizQuestion
    ? "chevron-forward"
    : isLastItem
      ? "checkmark"
      : "chevron-forward";

  return (
    <MechanicScreenFrame
      isShortScreen={isShortScreen}
      footer={
        <TouchableOpacity
          className="rounded-full px-6 py-3 flex-row items-center justify-center"
          style={{
            backgroundColor: isLastItem && isFinalQuizQuestion
              ? brandColors.success
              : brandColors.shanaOrange,
            maxWidth: "100%",
            opacity: canContinue ? 1 : 0.55,
          }}
          onPress={continueQuiz}
          disabled={!canContinue}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          accessibilityState={{ disabled: !canContinue }}
        >
          <Text
            variant="bold"
            className="text-white text-lg mr-1"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.82}
          >
            {actionLabel}
          </Text>
          <Ionicons name={actionIcon} size={20} color="#ffffff" />
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
                width: isWideLayout ? "35%" : "100%",
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
                Quick quiz
              </Text>
              <Text
                variant="medium"
                className="text-neutral-600 text-center mt-1"
                style={{ flexShrink: 1, fontSize: isShortScreen ? 15 : 17 }}
                numberOfLines={3}
                adjustsFontSizeToFit
                minimumFontScale={0.82}
              >
                {item.title}
              </Text>

              {item.instructions ? (
                <Text
                  className="text-neutral-500 text-center mt-2"
                  style={{ flexShrink: 1, fontSize: isShortScreen ? 12 : 13 }}
                  numberOfLines={3}
                  adjustsFontSizeToFit
                  minimumFontScale={0.85}
                >
                  {item.instructions}
                </Text>
              ) : null}

              <View
                className="bg-primary-50 rounded-2xl border-2 border-primary-100 items-center"
                style={{
                  marginTop: isShortScreen ? 8 : 12,
                  paddingHorizontal: isShortScreen ? 14 : 18,
                  paddingVertical: isShortScreen ? 9 : 12,
                  maxWidth: "100%",
                  minWidth: 170,
                }}
              >
                <Text
                  className="text-neutral-500 text-center"
                  style={{ fontSize: isShortScreen ? 12 : 13 }}
                  numberOfLines={1}
                >
                  Question {Math.min(currentQuestionIndex + 1, questions.length)} of {questions.length}
                </Text>
                <Text
                  variant="bold"
                  className="text-primary-700 text-center mt-1"
                  style={{ flexShrink: 1, fontSize: isShortScreen ? 19 : 22 }}
                  numberOfLines={4}
                  adjustsFontSizeToFit
                  minimumFontScale={0.78}
                >
                  {currentQuestion?.promptText ?? "Quiz questions are coming soon."}
                </Text>
                {currentQuestion?.promptEnglishText ? (
                  <Text
                    variant="medium"
                    className="text-neutral-600 text-center mt-1"
                    style={{ fontSize: isShortScreen ? 13 : 15 }}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.84}
                  >
                    {currentQuestion.promptEnglishText}
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
                {correctQuestionCount} of {questions.length} correct
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
                    disabled={!canAnswer || isCurrentQuestionCorrect || isCompleting}
                    activeOpacity={0.76}
                    accessibilityRole="button"
                    accessibilityLabel={`Choose ${option.text}`}
                    accessibilityState={{
                      disabled: !canAnswer || isCurrentQuestionCorrect || isCompleting,
                      selected,
                    }}
                  >
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
                              : "help"
                        }
                        size={isShortScreen ? 20 : 22}
                        color={selected ? brandColors.white : brandColors.victoriaBlue}
                      />
                    </View>

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
                        {option.text}
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
                  minHeight: isShortScreen ? 38 : 44,
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
                  numberOfLines={3}
                  adjustsFontSizeToFit
                  minimumFontScale={0.78}
                >
                  {!canAnswer
                    ? "This quiz needs answer choices."
                    : answerState === "correct"
                      ? currentQuestion?.explanationText ?? "Yes, that's right!"
                      : answerState === "incorrect"
                        ? "Nice try. Choose another answer."
                        : attempts > 0
                          ? "Try another answer"
                          : "Tap the best answer"}
                </Text>
              </View>
            </View>
          </View>
        </View>
    </MechanicScreenFrame>
  );
}
