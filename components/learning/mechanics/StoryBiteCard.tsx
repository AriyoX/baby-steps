import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TouchableOpacity, View, useWindowDimensions } from "react-native";
import { Text } from "@/components/StyledText";
import { CachedImage } from "@/components/common/CachedImage";
import { brandColors } from "@/constants/Brand";
import { useAudio } from "@/context/AudioContext";
import { resolveImageSource } from "@/content/assets";
import type {
  ItemResult,
  StoryBiteItem,
  StoryBitePage,
} from "@/content/learningHubTypes";
import {
  isValidLearningAudioAsset,
  resolveLearningAudioSource,
} from "@/lib/audioAssets";
import { MechanicScreenFrame } from "./MechanicScreenFrame";

type StoryBiteCardProps = {
  item: StoryBiteItem;
  isLastItem: boolean;
  stageImageKey?: string;
  onComplete: (result: ItemResult) => void;
};

const hasPageImage = (page: StoryBitePage): boolean =>
  Boolean(page.imageAsset || page.imageKey);

const hasPageAudio = (page: StoryBitePage): boolean =>
  isValidLearningAudioAsset(page.audioAsset) ||
  isValidLearningAudioAsset(page.audioKey);

export function StoryBiteCard({
  item,
  stageImageKey,
  onComplete,
}: StoryBiteCardProps) {
  const { createAppSound, replayAppSound, unloadAppSound } = useAudio();
  const { width, height } = useWindowDimensions();
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);
  const [audioLoadFailed, setAudioLoadFailed] = useState(false);
  const pagesViewedRef = useRef(1);
  const completionCalledRef = useRef(false);
  const audioReplayInFlightRef = useRef(false);

  const pages = useMemo(() => item.pages, [item.pages]);
  const currentPage = pages[currentPageIndex] ?? pages[0];
  const isFinalPage = currentPageIndex >= pages.length - 1;
  const pageHasAudio = currentPage ? hasPageAudio(currentPage) : false;
  const audioResolution = useMemo(
    () =>
      currentPage
        ? resolveLearningAudioSource(currentPage.audioAsset, currentPage.audioKey)
        : null,
    [currentPage],
  );
  const isShortScreen = height < 430;
  const isWideLayout = width >= 680;
  const horizontalInset = width < 380 ? 32 : 48;
  const cardWidth = Math.min(720, Math.max(240, width - horizontalInset));
  const visualSize = Math.min(isShortScreen ? 104 : 136, Math.max(84, height * 0.24));

  useEffect(() => {
    pagesViewedRef.current = 1;
    completionCalledRef.current = false;
    audioReplayInFlightRef.current = false;
    setCurrentPageIndex(0);
    setIsCompleting(false);
    setAudioLoadFailed(false);
  }, [item.id]);

  const replayPageAudio = useCallback(() => {
    if (!pageHasAudio || !audioResolution || audioReplayInFlightRef.current) {
      return;
    }

    audioReplayInFlightRef.current = true;
    setAudioLoadFailed(false);

    void (async () => {
      const sound = await createAppSound(audioResolution.source);

      try {
        if (!sound) {
          setAudioLoadFailed(true);
          return;
        }

        await replayAppSound(sound);
      } catch (error) {
        console.warn("Could not replay story bite audio:", error);
        setAudioLoadFailed(true);
      } finally {
        await unloadAppSound(sound);
        audioReplayInFlightRef.current = false;
      }
    })().catch((error) => {
      console.warn("Could not load story bite audio:", error);
      setAudioLoadFailed(true);
      audioReplayInFlightRef.current = false;
    });
  }, [
    audioResolution,
    createAppSound,
    pageHasAudio,
    replayAppSound,
    unloadAppSound,
  ]);

  const goToNextPage = () => {
    if (isFinalPage || isCompleting) {
      return;
    }

    setAudioLoadFailed(false);
    setCurrentPageIndex((index) => {
      const nextIndex = Math.min(index + 1, pages.length - 1);
      pagesViewedRef.current = Math.max(pagesViewedRef.current, nextIndex + 1);
      return nextIndex;
    });
  };

  const completeStory = () => {
    if (!isFinalPage || completionCalledRef.current) {
      return;
    }

    completionCalledRef.current = true;
    setIsCompleting(true);
    onComplete({
      itemId: item.id,
      mechanic: "story_bite",
      completedAt: Date.now(),
      attempts: Math.max(pagesViewedRef.current, currentPageIndex + 1),
    });
  };

  const actionLabel = isFinalPage ? "I finished the story" : "Next";
  const actionIcon = isFinalPage ? "checkmark" : "chevron-forward";
  const actionColor = isFinalPage ? brandColors.success : brandColors.shanaOrange;

  return (
    <MechanicScreenFrame
      isShortScreen={isShortScreen}
      footer={
        <TouchableOpacity
          className="rounded-full px-5 py-3 flex-row items-center justify-center"
          style={{
            backgroundColor: actionColor,
            maxWidth: "100%",
            opacity: isCompleting ? 0.72 : 1,
          }}
          onPress={isFinalPage ? completeStory : goToNextPage}
          disabled={isCompleting}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          accessibilityState={{ disabled: isCompleting }}
        >
          <Text
            variant="bold"
            className="text-white text-base mr-1"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.82}
          >
            {actionLabel}
          </Text>
          <Ionicons name={actionIcon} size={18} color="#ffffff" />
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
                Story bite
              </Text>
              <Text
                className="text-neutral-500 text-center mt-1"
                style={{ fontSize: isShortScreen ? 12 : 13 }}
                numberOfLines={1}
              >
                Page {Math.min(currentPageIndex + 1, pages.length)} of {pages.length}
              </Text>

              <View
                className="rounded-2xl items-center justify-center border-2 border-primary-100"
                style={{
                  width: visualSize,
                  height: visualSize,
                  backgroundColor: brandColors.blue[50],
                  overflow: "hidden",
                  marginTop: isShortScreen ? 8 : 12,
                }}
                testID="story-bite-visual"
                accessibilityLabel={`${currentPage?.title ?? item.title} picture`}
              >
                {currentPage && hasPageImage(currentPage) ? (
                  <CachedImage
                    source={resolveImageSource(
                      currentPage.imageAsset ?? currentPage.imageKey,
                      stageImageKey,
                    )}
                    fallbackSource={resolveImageSource(stageImageKey)}
                    style={{ width: visualSize, height: visualSize }}
                    resizeMode="cover"
                    accessibilityLabel={`${currentPage.title ?? item.title} picture`}
                  />
                ) : currentPage?.emoji ? (
                  <Text
                    style={{ fontSize: isShortScreen ? 48 : 60 }}
                    accessibilityLabel={`${currentPage.title ?? item.title} picture`}
                  >
                    {currentPage.emoji}
                  </Text>
                ) : (
                  <Ionicons
                    name="book-outline"
                    size={isShortScreen ? 42 : 54}
                    color={brandColors.victoriaBlue}
                    testID="story-bite-fallback-visual"
                  />
                )}
              </View>

              {pageHasAudio ? (
                <TouchableOpacity
                  className="rounded-full border-2 border-primary-100 flex-row items-center"
                  style={{
                    marginTop: isShortScreen ? 8 : 12,
                    paddingHorizontal: 14,
                    paddingVertical: isShortScreen ? 8 : 9,
                    backgroundColor: audioLoadFailed
                      ? brandColors.orange[50]
                      : brandColors.blue[50],
                  }}
                  onPress={replayPageAudio}
                  accessibilityRole="button"
                  accessibilityLabel="Replay story audio"
                >
                  <Ionicons
                    name={audioLoadFailed ? "alert-circle-outline" : "volume-high"}
                    size={17}
                    color={brandColors.victoriaBlue}
                  />
                  <Text
                    variant="bold"
                    className="text-primary-700 ml-2"
                    style={{ fontSize: isShortScreen ? 12 : 13 }}
                    numberOfLines={1}
                  >
                    Listen
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <View
              style={{
                flex: isWideLayout ? 1 : undefined,
                width: isWideLayout ? undefined : "100%",
                marginTop: isWideLayout ? 0 : isShortScreen ? 10 : 14,
                justifyContent: "center",
              }}
            >
              <Text
                variant="bold"
                className="text-primary-700 text-center"
                style={{
                  fontSize: isShortScreen ? 24 : 30,
                  lineHeight: isShortScreen ? 29 : 36,
                }}
                numberOfLines={3}
                adjustsFontSizeToFit
                minimumFontScale={0.76}
              >
                {currentPage?.title ?? item.title}
              </Text>

              {currentPage?.localTitle ? (
                <Text
                  variant="medium"
                  className="text-neutral-500 text-center mt-1"
                  style={{ flexShrink: 1, fontSize: isShortScreen ? 13 : 15 }}
                  numberOfLines={2}
                  adjustsFontSizeToFit
                  minimumFontScale={0.84}
                >
                  {currentPage.localTitle}
                </Text>
              ) : null}

              <Text
                className="text-neutral-700 text-center mt-2"
                style={{
                  fontSize: isShortScreen ? 16 : 18,
                  lineHeight: isShortScreen ? 21 : 24,
                  flexShrink: 1,
                }}
              >
                {currentPage?.bodyText ?? "This story page is being prepared."}
              </Text>

              {currentPage?.localText ? (
                <View
                  className="bg-accent-50 rounded-2xl border-2 border-accent-100 items-center"
                  style={{
                    marginTop: isShortScreen ? 8 : 12,
                    paddingHorizontal: 12,
                    paddingVertical: isShortScreen ? 8 : 10,
                  }}
                >
                  <Text
                    variant="bold"
                    className="text-primary-700 text-center"
                    style={{
                      flexShrink: 1,
                      fontSize: isShortScreen ? 15 : 17,
                      lineHeight: isShortScreen ? 19 : 21,
                    }}
                    numberOfLines={3}
                    adjustsFontSizeToFit
                    minimumFontScale={0.82}
                  >
                    {currentPage.localText}
                  </Text>
                </View>
              ) : null}

              {isFinalPage && item.reflectionPrompt ? (
                <Text
                  variant="medium"
                  className="text-neutral-600 text-center mt-2"
                  style={{
                    flexShrink: 1,
                    fontSize: isShortScreen ? 13 : 15,
                    lineHeight: isShortScreen ? 17 : 19,
                  }}
                >
                  {item.reflectionPrompt}
                </Text>
              ) : null}
            </View>
          </View>
        </View>
    </MechanicScreenFrame>
  );
}
