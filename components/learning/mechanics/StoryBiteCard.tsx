import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import { Text } from "@/components/StyledText";
import { ActivityAudioButton, ActivityButton } from "@/components/learning/ActivityControls";
import { LearningIllustratedScreen } from "@/components/learning/LearningIllustratedScreen";
import { activityColors, activityStyles } from "@/constants/ActivityTheme";
import { useAudio } from "@/context/AudioContext";
import { useChildUiLanguage } from "@/context/ChildUiLanguageContext";
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
import { childHaptics } from "@/lib/childHaptics";

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
  const { t } = useChildUiLanguage();
  const { createLearningVoice, replayAppSound, unloadAppSound } = useAudio();
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);
  const [audioLoadFailed, setAudioLoadFailed] = useState(false);
  const pagesViewedRef = useRef(1);
  const completionCalledRef = useRef(false);
  const audioReplayInFlightRef = useRef(false);

  const pages = useMemo(() => item.pages, [item.pages]);
  const currentPage = pages[currentPageIndex] ?? pages[0];
  const pageTitle = currentPage?.title ?? (currentPageIndex === 0 ? item.title : undefined);
  const isFinalPage = currentPageIndex >= pages.length - 1;
  const pageHasAudio = currentPage ? hasPageAudio(currentPage) : false;
  const audioResolution = useMemo(
    () =>
      currentPage
        ? resolveLearningAudioSource(
            currentPage.audioAsset,
            currentPage.audioKey,
          )
        : null,
    [currentPage],
  );
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
      if (!pageHasAudio || !audioResolution) childHaptics.warning();
      return;
    }

    childHaptics.selection();
    audioReplayInFlightRef.current = true;
    setAudioLoadFailed(false);

    void (async () => {
      const sound = await createLearningVoice(audioResolution.source);

      try {
        if (!sound) {
          childHaptics.warning();
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
    createLearningVoice,
    pageHasAudio,
    replayAppSound,
    unloadAppSound,
  ]);

  const goToNextPage = () => {
    if (isFinalPage || isCompleting) {
      return;
    }

    childHaptics.selection();
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

  const actionLabel = t(
    isFinalPage ? "learning.finishedStory" : "common.next",
  );

  return (
    <LearningIllustratedScreen
      progress={`Page ${Math.min(currentPageIndex + 1, pages.length)} of ${pages.length}`}
      imageSource={currentPage && hasPageImage(currentPage)
        ? resolveImageSource(currentPage.imageAsset ?? currentPage.imageKey, stageImageKey)
        : undefined}
      fallbackSource={resolveImageSource(stageImageKey)}
      imageLabel={`${currentPage?.title ?? item.title} picture`}
      emoji={currentPage?.emoji}
      fallbackIcon="book-outline"
      visualTestID="story-bite-visual"
      fallbackTestID="story-bite-fallback-visual"
      footerAside={pageHasAudio ? (
        <View style={{ alignItems: "center", columnGap: 8, flexDirection: "row" }}>
          <ActivityAudioButton accessibilityLabel="Replay story audio" failed={audioLoadFailed} onPress={replayPageAudio} />
          {audioLoadFailed ? (
            <Text accessibilityLiveRegion="polite" style={{ color: activityColors.muted }}>
              Sound unavailable.
            </Text>
          ) : null}
        </View>
      ) : undefined}
      footer={
        <ActivityButton
          label={actionLabel}
          icon={isFinalPage ? "checkmark" : "chevron-forward"}
          tone={isFinalPage ? "success" : "primary"}
          disabled={isCompleting}
          onPress={isFinalPage ? completeStory : goToNextPage}
        />
      }
    >
      {({ isShort, isTablet }) => (
        <>
          {pageTitle ? (
            <Text variant="bold" style={{ color: activityColors.ink, fontSize: isShort ? 22 : isTablet ? 34 : 30 }}>
              {pageTitle}
            </Text>
          ) : null}
          {currentPage?.localTitle ? (
            <Text style={{ color: activityColors.muted, fontSize: isShort ? 14 : 18, marginTop: 5 }}>
              {currentPage.localTitle}
            </Text>
          ) : null}
          <Text style={{ color: activityColors.muted, fontSize: isShort ? 16 : isTablet ? 20 : 18, lineHeight: isShort ? 20 : isTablet ? 28 : 25, marginTop: pageTitle || currentPage?.localTitle ? (isShort ? 8 : 12) : 0 }}>
            {currentPage?.bodyText ?? "This story page is being prepared."}
          </Text>
          {currentPage?.localText ? (
            <View style={[activityStyles.inset, { marginTop: isShort ? 8 : 20, paddingHorizontal: isShort ? 8 : 14, paddingVertical: isShort ? 6 : 14 }]}>
              <Text variant="bold" style={{ color: activityColors.ink, fontSize: isShort ? 16 : isTablet ? 20 : 18, lineHeight: isShort ? 20 : isTablet ? 28 : 25 }}>
                {currentPage.localText}
              </Text>
            </View>
          ) : null}
          {isFinalPage && item.reflectionPrompt ? (
            <Text variant="medium" style={{ color: activityColors.muted, fontSize: isShort ? 14 : 17, lineHeight: isShort ? 18 : 24, marginTop: isShort ? 8 : 12 }}>
              {item.reflectionPrompt}
            </Text>
          ) : null}
        </>
      )}
    </LearningIllustratedScreen>
  );
}
