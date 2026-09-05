import type { Audio } from "expo-av";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAudio } from "@/context/AudioContext";
import { useChildUiLanguage } from "@/context/ChildUiLanguageContext";
import type {
  ItemResult,
  ListenAndChooseItem,
  ListenAndChooseOption,
} from "@/content/learningHubTypes";
import {
  LEARNING_PLACEHOLDER_SOUND,
  resolveLearningAudioSource,
} from "@/lib/audioAssets";
import { LearningChoiceBoard } from "./LearningChoiceBoard";
import { childHaptics } from "@/lib/childHaptics";

type ListenAndChooseCardProps = {
  item: ListenAndChooseItem;
  isLastItem: boolean;
  stageImageKey?: string;
  onComplete: (result: ItemResult) => void;
};

type AnswerState = "idle" | "correct" | "incorrect";

const getOptionTitle = (option: ListenAndChooseOption): string =>
  option.localText ?? option.englishText ?? option.id;

const getOptionSubtitle = (
  option: ListenAndChooseOption,
): string | undefined =>
  option.localText && option.englishText ? option.englishText : undefined;

export function ListenAndChooseCard({
  item,
  isLastItem,
  stageImageKey,
  onComplete,
}: ListenAndChooseCardProps) {
  const { t } = useChildUiLanguage();
  const { createLearningVoice, replayAppSound, unloadAppSound } = useAudio();
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [answerState, setAnswerState] = useState<AnswerState>("idle");
  const [audioLoadFailed, setAudioLoadFailed] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const learningSoundRef = useRef<Audio.Sound | null>(null);
  const attemptsRef = useRef(0);
  const completionCalledRef = useRef(false);
  const audioReplayInFlightRef = useRef(false);
  const audioReplayCooldownRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const options = useMemo(() => item.options.slice(0, 4), [item.options]);
  const correctOption = options.find(
    (option) => option.id === item.correctOptionId,
  );
  const canAnswer = options.length >= 2 && Boolean(correctOption);
  const canComplete = answerState === "correct";
  const promptText = item.promptText ?? item.prompt ?? "Tap the word you hear";
  const currentAudioResolution = useMemo(
    () => resolveLearningAudioSource(item.audioAsset, item.audioKey),
    [item.audioAsset, item.audioKey],
  );

  const releaseReplayLockSoon = useCallback(() => {
    if (audioReplayCooldownRef.current) {
      clearTimeout(audioReplayCooldownRef.current);
    }

    audioReplayCooldownRef.current = setTimeout(() => {
      audioReplayInFlightRef.current = false;
      audioReplayCooldownRef.current = null;
    }, 120);
  }, []);

  const playSound = useCallback(
    async (sound: Audio.Sound) => {
      if (audioReplayInFlightRef.current) {
        return;
      }

      audioReplayInFlightRef.current = true;

      try {
        await replayAppSound(sound);
      } catch (error) {
        console.warn("Could not replay listen-and-choose audio:", error);
        setAudioLoadFailed(true);
      } finally {
        releaseReplayLockSoon();
      }
    },
    [releaseReplayLockSoon, replayAppSound],
  );

  useEffect(() => {
    if (audioReplayCooldownRef.current) {
      clearTimeout(audioReplayCooldownRef.current);
      audioReplayCooldownRef.current = null;
    }

    audioReplayInFlightRef.current = false;
    learningSoundRef.current = null;
    attemptsRef.current = 0;
    completionCalledRef.current = false;
    setSelectedOptionId(null);
    setAnswerState("idle");
    setAudioLoadFailed(false);
    setIsCompleting(false);

    let isMounted = true;
    let loadedSound: Audio.Sound | null = null;

    const loadCurrentSound = async () => {
      const primarySound = await createLearningVoice(currentAudioResolution.source);

      if (!isMounted) {
        await unloadAppSound(primarySound);
        return;
      }

      if (primarySound) {
        loadedSound = primarySound;
        learningSoundRef.current = primarySound;
        await playSound(primarySound);
        return;
      }

      if (!currentAudioResolution.isPlaceholder) {
        const fallbackSound = await createLearningVoice(LEARNING_PLACEHOLDER_SOUND);

        if (!isMounted) {
          await unloadAppSound(fallbackSound);
          return;
        }

        if (fallbackSound) {
          loadedSound = fallbackSound;
          learningSoundRef.current = fallbackSound;
          await playSound(fallbackSound);
          return;
        }
      }

      setAudioLoadFailed(true);
    };

    void loadCurrentSound().catch((error) => {
      console.warn("Could not load listen-and-choose audio:", error);
      if (isMounted) {
        setAudioLoadFailed(true);
      }
    });

    return () => {
      isMounted = false;

      if (loadedSound) {
        void unloadAppSound(loadedSound).catch((error) => {
          console.warn("Could not unload listen-and-choose audio:", error);
        });
      }
    };
  }, [
    createLearningVoice,
    currentAudioResolution.isPlaceholder,
    currentAudioResolution.source,
    item.id,
    playSound,
    unloadAppSound,
  ]);

  useEffect(() => {
    return () => {
      if (audioReplayCooldownRef.current) {
        clearTimeout(audioReplayCooldownRef.current);
      }
    };
  }, []);

  const replayCurrentItemAudio = useCallback(() => {
    const sound = learningSoundRef.current;

    if (!sound) {
      childHaptics.warning();
      setAudioLoadFailed(true);
      return;
    }

    childHaptics.selection();
    void playSound(sound);
  }, [playSound]);

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
      mechanic: "listen_and_choose",
      completedAt: Date.now(),
      correct: true,
      attempts: attemptsRef.current,
    });
  };

  return (
    <LearningChoiceBoard
      prompt={promptText}
      options={options.map((option) => ({
        ...option,
        title: getOptionTitle(option),
        subtitle: getOptionSubtitle(option),
      }))}
      stageImageKey={stageImageKey}
      selectedOptionId={selectedOptionId}
      answerState={answerState}
      choicesDisabled={!canAnswer || answerState === "correct" || isCompleting}
      onSelect={selectOption}
      audio={{ failed: audioLoadFailed, onReplay: replayCurrentItemAudio }}
      feedback={
        audioLoadFailed && answerState === "idle"
          ? "Sound is quiet. You can still choose."
          : !canAnswer
            ? "This card needs choices."
            : answerState === "correct"
              ? "Yes, that's it!"
              : answerState === "incorrect"
                ? "Try again. Listen one more time."
                : ""
      }
      actionLabel={t(isLastItem ? "common.finish" : "common.next")}
      actionDisabled={!canComplete || isCompleting}
      isFinish={isLastItem}
      onContinue={completeItem}
    />
  );
}
