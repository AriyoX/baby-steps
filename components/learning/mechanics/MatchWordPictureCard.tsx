import { useEffect, useMemo, useRef, useState } from "react";
import { useChildUiLanguage } from "@/context/ChildUiLanguageContext";
import type {
  ItemResult,
  MatchWordPictureItem,
  MatchWordPictureOption,
} from "@/content/learningHubTypes";
import { LearningChoiceBoard } from "./LearningChoiceBoard";
import { childHaptics } from "@/lib/childHaptics";

type MatchWordPictureCardProps = {
  item: MatchWordPictureItem;
  isLastItem: boolean;
  stageImageKey?: string;
  onComplete: (result: ItemResult) => void;
};

type AnswerState = "idle" | "correct" | "incorrect";

const getOptionTitle = (option: MatchWordPictureOption): string =>
  option.englishText ?? option.localText ?? option.id;

export function MatchWordPictureCard({
  item,
  isLastItem,
  stageImageKey,
  onComplete,
}: MatchWordPictureCardProps) {
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
      mechanic: "match_word_picture",
      completedAt: Date.now(),
      correct: true,
      attempts: attemptsRef.current,
    });
  };

  return (
    <LearningChoiceBoard
      prompt={item.promptText}
      targetText={item.targetText}
      targetEnglishText={item.targetEnglishText}
      options={options.map((option) => ({
        ...option,
        title: getOptionTitle(option),
        imageAccessibilityLabel: `${getOptionTitle(option)} picture`,
      }))}
      stageImageKey={stageImageKey}
      selectedOptionId={selectedOptionId}
      answerState={answerState}
      choicesDisabled={!canAnswer || answerState === "correct" || isCompleting}
      onSelect={selectOption}
      fallbackIcon="image-outline"
      feedback={
        !canAnswer
          ? "This card needs picture choices."
          : answerState === "correct"
            ? "Yes, that matches!"
            : answerState === "incorrect"
              ? "Nice try. Tap another picture."
              : ""
      }
      actionLabel={t(isLastItem ? "common.finish" : "common.next")}
      actionDisabled={!canComplete || isCompleting}
      isFinish={isLastItem}
      onContinue={completeItem}
    />
  );
}
