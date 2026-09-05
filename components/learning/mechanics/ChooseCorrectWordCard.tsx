import { useEffect, useMemo, useRef, useState } from "react";
import { useChildUiLanguage } from "@/context/ChildUiLanguageContext";
import type {
  ChooseCorrectWordItem,
  ChooseCorrectWordOption,
  ItemResult,
} from "@/content/learningHubTypes";
import { LearningChoiceBoard } from "./LearningChoiceBoard";
import { childHaptics } from "@/lib/childHaptics";

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

export function ChooseCorrectWordCard({
  item,
  isLastItem,
  stageImageKey,
  onComplete,
}: ChooseCorrectWordCardProps) {
  const { t } = useChildUiLanguage();
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [answerState, setAnswerState] = useState<AnswerState>("idle");
  const [isCompleting, setIsCompleting] = useState(false);
  const attemptsRef = useRef(0);
  const completionCalledRef = useRef(false);

  const options = useMemo(() => item.options.slice(0, 4), [item.options]);
  const correctOption = options.find(
    (option) => option.id === item.correctOptionId,
  );
  const canAnswer = options.length >= 2 && Boolean(correctOption);
  const canComplete = answerState === "correct";

  useEffect(() => {
    attemptsRef.current = 0;
    completionCalledRef.current = false;
    setSelectedOptionId(null);
    setAnswerState("idle");
    setIsCompleting(false);
  }, [item.id]);

  const selectOption = (optionId: string) => {
    if (!canAnswer || answerState === "correct" || isCompleting) {
      return;
    }

    attemptsRef.current += 1;
    setSelectedOptionId(optionId);

    if (optionId === item.correctOptionId) {
      childHaptics.success();
      setAnswerState("correct");
      return;
    }

    childHaptics.error();
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
    <LearningChoiceBoard
      prompt={item.promptText}
      targetText={item.questionText}
      options={options.map((option) => ({
        ...option,
        title: option.localText,
        subtitle: getOptionSubtitle(option),
      }))}
      stageImageKey={stageImageKey}
      selectedOptionId={selectedOptionId}
      answerState={answerState}
      choicesDisabled={!canAnswer || answerState === "correct" || isCompleting}
      onSelect={selectOption}
      feedback={
        !canAnswer
          ? "This card needs choices."
          : answerState === "correct"
            ? "Yes, that's it!"
            : answerState === "incorrect"
              ? "Try again. Pick another word."
              : ""
      }
      actionLabel={t(isLastItem ? "common.finish" : "common.next")}
      actionDisabled={!canComplete || isCompleting}
      isFinish={isLastItem}
      onContinue={completeItem}
    />
  );
}
