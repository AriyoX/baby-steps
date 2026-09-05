import { useEffect, useMemo, useRef, useState } from "react";
import { useChildUiLanguage } from "@/context/ChildUiLanguageContext";
import type {
  ItemResult,
  MiniQuizItem,
  MiniQuizOption,
} from "@/content/learningHubTypes";
import { LearningChoiceBoard } from "./LearningChoiceBoard";
import { childHaptics } from "@/lib/childHaptics";

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
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [answerState, setAnswerState] = useState<AnswerState>("idle");
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

  useEffect(() => {
    attemptsRef.current = 0;
    correctQuestionIdsRef.current = new Set();
    completionCalledRef.current = false;
    setCurrentQuestionIndex(0);
    setSelectedOptionId(null);
    setAnswerState("idle");
    setCorrectQuestionCount(0);
    setIsCompleting(false);
  }, [item.id]);

  const selectOption = (optionId: string) => {
    if (!canAnswer || isCurrentQuestionCorrect || isCompleting || !currentQuestion) {
      return;
    }

    attemptsRef.current += 1;
    setSelectedOptionId(optionId);

    if (optionId === currentQuestion.correctOptionId) {
      childHaptics.success();
      const correctQuestionIds = new Set(correctQuestionIdsRef.current);
      correctQuestionIds.add(currentQuestion.id);
      correctQuestionIdsRef.current = correctQuestionIds;
      setCorrectQuestionCount(correctQuestionIds.size);
      setAnswerState("correct");
      return;
    }

    childHaptics.error();
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

  return (
    <LearningChoiceBoard
      title={item.title}
      prompt={currentQuestion?.promptText ?? "Quiz questions are coming soon."}
      targetText={currentQuestion?.promptEnglishText}
      progressText={`Question ${Math.min(currentQuestionIndex + 1, questions.length)} of ${questions.length} · ${correctQuestionCount} correct`}
      options={options.map((option) => ({
        id: option.id,
        title: option.text,
        subtitle: getOptionSubtitle(option),
      }))}
      selectedOptionId={selectedOptionId}
      answerState={answerState}
      choicesDisabled={!canAnswer || isCurrentQuestionCorrect || isCompleting}
      onSelect={selectOption}
      fallbackIcon="help"
      feedback={
        !canAnswer
          ? "This quiz needs answer choices."
          : answerState === "correct"
            ? currentQuestion?.explanationText ?? "Yes, that's right!"
            : answerState === "incorrect"
              ? "Nice try. Choose another answer."
              : item.instructions ?? "Tap the best answer"
      }
      actionLabel={actionLabel}
      actionDisabled={!canContinue}
      isFinish={isLastItem && isFinalQuizQuestion}
      onContinue={continueQuiz}
    />
  );
}
