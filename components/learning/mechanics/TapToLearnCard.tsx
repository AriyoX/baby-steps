import type { Audio } from "expo-av";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Text } from "@/components/StyledText";
import { ActivityButton } from "@/components/learning/ActivityControls";
import { LearningIllustratedScreen, LearningWordContent } from "@/components/learning/LearningIllustratedScreen";
import { activityColors } from "@/constants/ActivityTheme";
import { useAudio } from "@/context/AudioContext";
import { useChildUiLanguage } from "@/context/ChildUiLanguageContext";
import { resolveImageSource } from "@/content/assets";
import type { ItemResult, TapToLearnItem } from "@/content/learningHubTypes";
import {
  LEARNING_PLACEHOLDER_SOUND,
  resolveLearningAudioSource,
} from "@/lib/audioAssets";
import { childHaptics } from "@/lib/childHaptics";

type TapToLearnCardProps = {
  item: TapToLearnItem;
  isLastItem: boolean;
  stageImageKey?: string;
  onComplete: (result: ItemResult) => void;
};

export function TapToLearnCard({
  item,
  isLastItem,
  stageImageKey,
  onComplete,
}: TapToLearnCardProps) {
  const { t } = useChildUiLanguage();
  const { createLearningVoice, replayAppSound, unloadAppSound } = useAudio();
  const [audioLoadFailed, setAudioLoadFailed] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const learningSoundRef = useRef<Audio.Sound | null>(null);
  const replayCountRef = useRef(0);
  const completionCalledRef = useRef(false);
  const audioReplayInFlightRef = useRef(false);
  const audioReplayCooldownRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const localText = item.localText;
  const englishText = item.englishText;

  const currentAudioResolution = useMemo(
    () => resolveLearningAudioSource(item.audioAsset, item.audioKey),
    [item.audioAsset, item.audioKey],
  );
  const visualSource = resolveImageSource(
    item.imageAsset ?? item.imageKey,
    stageImageKey,
  );
  const fallbackVisualSource = resolveImageSource(stageImageKey);
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
        console.warn("Could not replay tap-to-learn audio:", error);
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
    replayCountRef.current = 0;
    completionCalledRef.current = false;
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
      console.warn("Could not load tap-to-learn audio:", error);
      if (isMounted) {
        setAudioLoadFailed(true);
      }
    });

    return () => {
      isMounted = false;

      if (loadedSound) {
        void unloadAppSound(loadedSound).catch((error) => {
          console.warn("Could not unload tap-to-learn audio:", error);
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
    replayCountRef.current += 1;

    const sound = learningSoundRef.current;
    if (!sound) {
      childHaptics.warning();
      setAudioLoadFailed(true);
      return;
    }

    childHaptics.selection();
    void playSound(sound);
  }, [playSound]);

  const completeItem = () => {
    if (completionCalledRef.current) {
      return;
    }

    completionCalledRef.current = true;
    setIsCompleting(true);
    onComplete({
      itemId: item.id,
      mechanic: "tap_to_learn",
      completedAt: Date.now(),
      attempts: replayCountRef.current,
    });
  };

  return (
    <LearningIllustratedScreen
      imageSource={visualSource}
      fallbackSource={fallbackVisualSource}
      imageLabel={`${englishText} picture`}
      onCardPress={replayCurrentItemAudio}
      cardAccessibilityLabel={audioLoadFailed ? `Review ${localText}` : `Listen to ${localText}`}
      footerAside={audioLoadFailed ? (
        <Text accessibilityLiveRegion="polite" style={{ color: activityColors.muted }}>
          Sound unavailable.
        </Text>
      ) : undefined}
      footer={
        <ActivityButton
          label={t(isLastItem ? "common.finish" : "common.next")}
          icon={isLastItem ? "checkmark" : "chevron-forward"}
          tone={isLastItem ? "success" : "primary"}
          disabled={isCompleting}
          onPress={completeItem}
        />
      }
    >
      {(layout) => (
        <LearningWordContent
          localText={localText}
          englishText={englishText}
          phoneticText={item.phoneticText}
          example={item.exampleSentence}
          layout={layout}
        />
      )}
    </LearningIllustratedScreen>
  );
}
