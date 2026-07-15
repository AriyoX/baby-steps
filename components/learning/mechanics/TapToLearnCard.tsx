import { Ionicons } from "@expo/vector-icons";
import type { Audio } from "expo-av";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TouchableOpacity, View, useWindowDimensions } from "react-native";
import { Text } from "@/components/StyledText";
import { CachedImage } from "@/components/common/CachedImage";
import { brandColors } from "@/constants/Brand";
import { useAudio } from "@/context/AudioContext";
import { resolveImageSource } from "@/content/assets";
import type { ItemResult, TapToLearnItem } from "@/content/learningHubTypes";
import {
  LEARNING_PLACEHOLDER_SOUND,
  resolveLearningAudioSource,
} from "@/lib/audioAssets";
import { MechanicScreenFrame } from "./MechanicScreenFrame";

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
  const { createAppSound, replayAppSound, unloadAppSound } = useAudio();
  const { width, height } = useWindowDimensions();
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
  const isShortScreen = height < 430;
  const horizontalInset = width < 380 ? 32 : 48;
  const availableLessonCardWidth = Math.max(240, width - horizontalInset);
  const lessonCardWidth = Math.min(620, availableLessonCardWidth);
  const maxLessonImageSize = Math.min(
    isShortScreen ? 132 : 166,
    lessonCardWidth - 56,
  );
  const lessonImageSize = Math.max(
    92,
    Math.min(maxLessonImageSize, height * 0.31),
  );
  const translationMinWidth = Math.min(220, lessonCardWidth - 56);

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
      const primarySound = await createAppSound(currentAudioResolution.source);

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
        const fallbackSound = await createAppSound(LEARNING_PLACEHOLDER_SOUND);

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
    createAppSound,
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
      setAudioLoadFailed(true);
      return;
    }

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
    <MechanicScreenFrame
      isShortScreen={isShortScreen}
      footer={
        <TouchableOpacity
          className="rounded-full px-5 py-3 flex-row items-center justify-center"
          style={{
            backgroundColor: isLastItem
              ? brandColors.success
              : brandColors.shanaOrange,
            maxWidth: "100%",
            opacity: isCompleting ? 0.72 : 1,
          }}
          onPress={completeItem}
          disabled={isCompleting}
          accessibilityRole="button"
          accessibilityLabel={isLastItem ? "Finish" : "Next"}
          accessibilityState={{ disabled: isCompleting }}
        >
          <Text
            variant="bold"
            className="text-white text-base mr-1"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.82}
          >
            {isLastItem ? "Finish" : "Next"}
          </Text>
          <Ionicons
            name={isLastItem ? "checkmark" : "chevron-forward"}
            size={18}
            color="#ffffff"
          />
        </TouchableOpacity>
      }
    >
      <TouchableOpacity
        className="bg-white rounded-2xl border-2 border-accent-500 items-center"
        style={{ width: lessonCardWidth, padding: isShortScreen ? 12 : 16 }}
        onPress={replayCurrentItemAudio}
        activeOpacity={0.82}
        accessibilityRole="button"
        accessibilityLabel={
          audioLoadFailed ? `Review ${localText}` : `Listen to ${localText}`
        }
      >
        <CachedImage
          source={visualSource}
          fallbackSource={fallbackVisualSource}
          style={{
            width: lessonImageSize,
            height: lessonImageSize,
            borderRadius: 16,
          }}
          resizeMode="cover"
          accessibilityLabel={`${englishText} picture`}
        />

        <View
          className="items-center w-full"
          style={{ marginTop: isShortScreen ? 8 : 11 }}
        >
          <Text
            variant="bold"
            className="text-primary-700 text-center"
            style={{
              fontSize: isShortScreen ? 30 : 36,
              lineHeight: isShortScreen ? 36 : 42,
              flexShrink: 1,
            }}
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {localText}
          </Text>
          <View
            className="bg-neutral-100 rounded-2xl px-5 items-center"
            style={{
              marginTop: isShortScreen ? 7 : 9,
              maxWidth: "100%",
              minWidth: translationMinWidth,
              paddingVertical: isShortScreen ? 8 : 10,
            }}
          >
            <Text
              variant="bold"
              className="text-success text-center"
              style={{ flexShrink: 1, fontSize: isShortScreen ? 20 : 23 }}
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.78}
            >
              {englishText}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </MechanicScreenFrame>
  );
}
