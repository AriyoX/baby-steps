import { Ionicons } from "@expo/vector-icons";
import type { Audio } from "expo-av";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { Text } from "@/components/StyledText";
import { CachedImage } from "@/components/common/CachedImage";
import { brandColors } from "@/constants/Brand";
import { useAudio } from "@/context/AudioContext";
import { resolveImageSource } from "@/content/assets";
import type {
  ItemResult,
  ListenAndChooseItem,
  ListenAndChooseOption,
} from "@/content/learningHubTypes";
import {
  LEARNING_PLACEHOLDER_SOUND,
  resolveLearningAudioSource,
} from "@/lib/audioAssets";
import { MechanicScreenFrame } from "./MechanicScreenFrame";

type ListenAndChooseCardProps = {
  item: ListenAndChooseItem;
  isLastItem: boolean;
  stageImageKey?: string;
  onComplete: (result: ItemResult) => void;
};

type AnswerState = "idle" | "correct" | "incorrect";

const getOptionTitle = (option: ListenAndChooseOption): string =>
  option.localText ?? option.englishText ?? option.id;

const getOptionSubtitle = (option: ListenAndChooseOption): string | undefined =>
  option.localText && option.englishText ? option.englishText : undefined;

const hasOptionImage = (option: ListenAndChooseOption): boolean =>
  Boolean(option.imageAsset || option.imageKey);

export function ListenAndChooseCard({
  item,
  isLastItem,
  stageImageKey,
  onComplete,
}: ListenAndChooseCardProps) {
  const { createAppSound, replayAppSound, unloadAppSound } = useAudio();
  const { width, height } = useWindowDimensions();
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [answerState, setAnswerState] = useState<AnswerState>("idle");
  const [audioLoadFailed, setAudioLoadFailed] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const learningSoundRef = useRef<Audio.Sound | null>(null);
  const attemptsRef = useRef(0);
  const completionCalledRef = useRef(false);
  const audioReplayInFlightRef = useRef(false);
  const audioReplayCooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const options = useMemo(() => item.options.slice(0, 4), [item.options]);
  const correctOption = options.find((option) => option.id === item.correctOptionId);
  const canAnswer = options.length >= 2 && Boolean(correctOption);
  const canComplete = answerState === "correct";
  const promptText = item.promptText ?? item.prompt ?? "Tap the word you hear";
  const currentAudioResolution = useMemo(
    () => resolveLearningAudioSource(item.audioAsset, item.audioKey),
    [item.audioAsset, item.audioKey],
  );
  const isShortScreen = height < 430;
  const isWideLayout = width >= 680;
  const horizontalInset = width < 380 ? 32 : 48;
  const cardWidth = Math.min(680, Math.max(240, width - horizontalInset));
  const optionGap = isShortScreen ? 8 : 10;
  const replayButtonSize = isShortScreen ? 72 : 84;
  const optionImageSize = Math.min(
    isShortScreen ? 52 : 64,
    Math.max(44, height * 0.11),
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
    setAttempts(0);

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
    const sound = learningSoundRef.current;

    if (!sound) {
      setAudioLoadFailed(true);
      return;
    }

    void playSound(sound);
  }, [playSound]);

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
      mechanic: "listen_and_choose",
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
          className="rounded-full px-5 py-3 flex-row items-center justify-center"
          style={{
            backgroundColor: isLastItem ? brandColors.success : brandColors.shanaOrange,
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
                width: isWideLayout ? "38%" : "100%",
                paddingRight: isWideLayout ? 16 : 0,
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
                Listen and choose
              </Text>
              <Text
                variant="medium"
                className="text-neutral-600 text-center mt-1"
                style={{ flexShrink: 1, fontSize: isShortScreen ? 15 : 17 }}
                numberOfLines={3}
                adjustsFontSizeToFit
                minimumFontScale={0.82}
              >
                {promptText}
              </Text>

              <TouchableOpacity
                className="rounded-full items-center justify-center border-4"
                style={{
                  width: replayButtonSize,
                  height: replayButtonSize,
                  marginTop: isShortScreen ? 8 : 12,
                  backgroundColor: audioLoadFailed ? brandColors.neutral[100] : brandColors.gold[50],
                  borderColor: audioLoadFailed ? brandColors.neutral[300] : brandColors.equatorialGold,
                }}
                onPress={replayCurrentItemAudio}
                activeOpacity={0.78}
                accessibilityRole="button"
                accessibilityLabel="Replay word"
              >
                <Ionicons
                  name={audioLoadFailed ? "volume-mute" : "volume-high"}
                  size={isShortScreen ? 34 : 38}
                  color={audioLoadFailed ? brandColors.neutral[600] : brandColors.victoriaBlue}
                />
              </TouchableOpacity>

              <Text
                className="text-neutral-500 text-center mt-2"
                style={{ fontSize: isShortScreen ? 12 : 13 }}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
              >
                {audioLoadFailed ? "Sound is quiet. You can still choose." : "Tap to listen again"}
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
                const optionTitle = getOptionTitle(option);
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
                    disabled={!canAnswer || answerState === "correct" || isCompleting}
                    activeOpacity={0.76}
                    accessibilityRole="button"
                    accessibilityLabel={`Choose ${optionTitle}`}
                    accessibilityState={{
                      disabled: !canAnswer || answerState === "correct" || isCompleting,
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
                        accessibilityLabel={`${optionTitle} choice`}
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
                          name={correctSelection ? "checkmark" : "text"}
                          size={isShortScreen ? 20 : 22}
                          color={selected ? brandColors.white : brandColors.victoriaBlue}
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
                        {optionTitle}
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
                        ? "Try again. Listen one more time."
                        : attempts > 0
                          ? "Choose again"
                          : "Pick the word you hear"}
                </Text>
              </View>
            </View>
          </View>
        </View>
    </MechanicScreenFrame>
  );
}
