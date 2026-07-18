import { Ionicons } from "@expo/vector-icons";
import * as Speech from "expo-speech";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "@/components/StyledText";
import { ChildLoadingState } from "@/components/child/ChildLoadingState";
import { ComingSoonState } from "@/components/child/ComingSoonState";
import { ChildCompletionCard } from "@/components/child/ChildCompletionCard";
import { CachedImage } from "@/components/common/CachedImage";
import {
  GameTour,
  GameTourProvider,
  TourTarget,
  useGameTour,
} from "@/components/games/GameTour";
import { useAudio } from "@/context/AudioContext";
import { useChild } from "@/context/ChildContext";
import { useChildUiLanguage } from "@/context/ChildUiLanguageContext";
import { resolveImageSource } from "@/content/contentRepository";
import { DEFAULT_LEARNING_LANGUAGE_CODE } from "@/content/languages";
import { preloadStoryImages } from "@/content/imagePreloader";
import {
  getStageProgress,
  markStageStarted,
  markStageCompleted,
  syncProgressNow,
  updateActivityProgress,
} from "@/lib/progressRepository";
import { audioManager } from "@/lib/audioManager";
import { completeLocallyFirst } from "@/lib/completionReliability";
import { saveActivity } from "@/lib/utils";
import type { LocalStory } from "@/content/types";

interface GenericStoryRendererProps {
  story?: LocalStory;
  isLoading?: boolean;
}

type StoryTextSize = "small" | "medium" | "large";
type ReadingSpeed = "slow" | "normal" | "fast";

type SpokenWordRange = {
  value: string;
  start: number;
  end: number;
};

const TEXT_SIZE_OPTIONS: {
  value: StoryTextSize;
  label: string;
  fontSize: number;
  lineHeight: number;
  translationFontSize: number;
  translationLineHeight: number;
  textPanelFlex: number;
  portraitImageHeight: number;
}[] = [
  {
    value: "small",
    label: "Small",
    fontSize: 16,
    lineHeight: 24,
    translationFontSize: 14,
    translationLineHeight: 21,
    textPanelFlex: 0.94,
    portraitImageHeight: 232,
  },
  {
    value: "medium",
    label: "Medium",
    fontSize: 18,
    lineHeight: 28,
    translationFontSize: 16,
    translationLineHeight: 24,
    textPanelFlex: 1,
    portraitImageHeight: 224,
  },
  {
    value: "large",
    label: "Large",
    fontSize: 21,
    lineHeight: 33,
    translationFontSize: 18,
    translationLineHeight: 27,
    textPanelFlex: 1.12,
    portraitImageHeight: 204,
  },
];

const READING_SPEED_OPTIONS: {
  value: ReadingSpeed;
  label: string;
  rate: number;
}[] = [
  { value: "slow", label: "Slow", rate: 0.35 },
  { value: "normal", label: "Normal", rate: 0.6 },
  { value: "fast", label: "Fast", rate: 1.0 },
];

const getSpokenWordRanges = (text: string): SpokenWordRange[] => {
  const ranges: SpokenWordRange[] = [];
  const wordPattern = /\S+/g;
  let match: RegExpExecArray | null;

  while ((match = wordPattern.exec(text)) !== null) {
    ranges.push({
      value: match[0],
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  return ranges;
};

const getBoundaryWordIndex = (
  wordRanges: SpokenWordRange[],
  charIndex: number,
  charLength = 1,
): number | null => {
  if (!wordRanges.length || !Number.isFinite(charIndex)) {
    return null;
  }

  const boundaryStart = Math.max(0, charIndex);
  const boundaryEnd = boundaryStart + Math.max(1, charLength);
  const boundaryMatch = wordRanges.findIndex(
    (word) => boundaryStart < word.end && boundaryEnd > word.start,
  );

  if (boundaryMatch >= 0) {
    return boundaryMatch;
  }

  const nextWordIndex = wordRanges.findIndex(
    (word, index) =>
      boundaryStart < word.start &&
      (index === 0 || boundaryStart >= wordRanges[index - 1].end),
  );

  return nextWordIndex >= 0 ? nextWordIndex : null;
};

export function GenericStoryRenderer({ story, isLoading = false }: GenericStoryRendererProps) {
  const router = useRouter();
  const { activeChild } = useChild();
  const { t } = useChildUiLanguage();
  const { settings: audioSettings } = useAudio();
  const { width, height } = useWindowDimensions();
  const storyTour = useGameTour("stories", activeChild?.id);
  const [pageIndex, setPageIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [hasSavedCompletion, setHasSavedCompletion] = useState(false);
  const [hasCompletedStory, setHasCompletedStory] = useState(false);
  const [showCompletionCard, setShowCompletionCard] = useState(false);
  const [textSize, setTextSize] = useState<StoryTextSize>("medium");
  const [readingSpeed, setReadingSpeed] = useState<ReadingSpeed>("normal");
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [storyViewportHeight, setStoryViewportHeight] = useState(0);
  const [storyContentHeight, setStoryContentHeight] = useState(0);
  const [isReading, setIsReading] = useState(false);
  const [highlightedWordIndex, setHighlightedWordIndex] = useState<number | null>(null);
  const startedAtRef = useRef(Date.now());
  const isSavingCompletionRef = useRef(false);
  const isMountedRef = useRef(true);
  const speechFallbackTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const speechBoundaryReceivedRef = useRef(false);

  const page = story?.pages[pageIndex];
  const isLastPage = story ? pageIndex === story.pages.length - 1 : false;
  const totalQuestions = story?.questions?.length ?? 0;
  const answeredQuestionCount = story?.questions?.filter(
    (question) => selectedAnswers[question.id] !== undefined,
  ).length ?? 0;
  const hasQuiz = totalQuestions > 0;
  const hasAnsweredAllQuestions = !hasQuiz || answeredQuestionCount === totalQuestions;
  const languageCode = activeChild?.selected_language_code || DEFAULT_LEARNING_LANGUAGE_CODE;
  const contentRevision = story?.progressRevision;
  const progressScopeKey =
    activeChild && story
      ? `${activeChild.id}:${languageCode}:stories:${story.id}:${
          contentRevision ?? "unversioned"
        }`
      : null;
  const [restoredProgressKey, setRestoredProgressKey] = useState<string | null>(null);
  const useSplitLayout = width >= 700;
  const textSizeConfig =
    TEXT_SIZE_OPTIONS.find((option) => option.value === textSize) ?? TEXT_SIZE_OPTIONS[1];
  const readingSpeedConfig =
    READING_SPEED_OPTIONS.find((option) => option.value === readingSpeed) ??
    READING_SPEED_OPTIONS[1];
  const storyText = page?.text.trim() ?? "";
  const spokenWordRanges = useMemo(() => getSpokenWordRanges(storyText), [storyText]);
  const isCompactReader = height < 430;
  const storyCanScroll =
    storyViewportHeight > 0 && storyContentHeight > storyViewportHeight + 2;
  const outerPadding = isCompactReader ? 10 : 16;
  const availableContentWidth = Math.max(0, width - outerPadding * 2);
  const readerStageWidth = useSplitLayout
    ? Math.min(availableContentWidth, isCompactReader ? 800 : 880)
    : Math.min(availableContentWidth, 620);
  // Tweak this number to nudge the whole story reader left/right.
  const readerStageOffsetX = useSplitLayout ? 14 : 0;
  const headerButtonSize = isCompactReader ? 44 : 48;
  const headerIconSize = isCompactReader ? 22 : 24;
  const imagePanelPadding = isCompactReader ? 8 : 12;
  const footerButtonSize = isCompactReader ? 44 : 48;
  const footerIconSize = isCompactReader ? 22 : 24;
  const textPanelMinHeight = useSplitLayout
    ? Math.max(112, Math.min(isCompactReader ? 150 : 204, height - 220))
    : 0;
  const portraitImageHeight = Math.max(
    isCompactReader ? 124 : 170,
    Math.min(textSizeConfig.portraitImageHeight, height * (isCompactReader ? 0.24 : 0.32)),
  );

  const clearSpeechFallbackTimer = useCallback(() => {
    if (speechFallbackTimerRef.current) {
      clearInterval(speechFallbackTimerRef.current);
      speechFallbackTimerRef.current = null;
    }
  }, []);

  const finishReading = useCallback(() => {
    clearSpeechFallbackTimer();
    if (isMountedRef.current) {
      setIsReading(false);
      setHighlightedWordIndex(null);
    }
  }, [clearSpeechFallbackTimer]);

  const stopReading = useCallback(() => {
    Speech.stop();
    finishReading();
  }, [finishReading]);

  const startFallbackWordHighlight = useCallback(() => {
    clearSpeechFallbackTimer();

    if (!spokenWordRanges.length) {
      return;
    }

    let fallbackIndex = 0;
    setHighlightedWordIndex(fallbackIndex);
    speechFallbackTimerRef.current = setInterval(() => {
      if (speechBoundaryReceivedRef.current) {
        clearSpeechFallbackTimer();
        return;
      }

      fallbackIndex += 1;
      if (fallbackIndex >= spokenWordRanges.length) {
        clearSpeechFallbackTimer();
        return;
      }

      setHighlightedWordIndex(fallbackIndex);
    }, Math.max(180, Math.round(380 / readingSpeedConfig.rate)));
  }, [clearSpeechFallbackTimer, readingSpeedConfig.rate, spokenWordRanges.length]);

  const handleSpeechBoundary = useCallback(
    (event: { charIndex?: number; charLength?: number }) => {
      if (typeof event.charIndex !== "number") {
        return;
      }

      speechBoundaryReceivedRef.current = true;
      clearSpeechFallbackTimer();
      const wordIndex = getBoundaryWordIndex(
        spokenWordRanges,
        event.charIndex,
        event.charLength,
      );

      if (wordIndex !== null && isMountedRef.current) {
        setHighlightedWordIndex(wordIndex);
      }
    },
    [clearSpeechFallbackTimer, spokenWordRanges],
  );

  const renderStoryText = () => (
    <Text
      className="text-slate-800"
      style={{
        fontSize: textSizeConfig.fontSize,
        lineHeight: textSizeConfig.lineHeight,
      }}
    >
      {spokenWordRanges.map((word, index) => (
        <Text
          key={`${word.start}-${word.value}`}
          className={index === highlightedWordIndex ? "text-amber-950" : "text-slate-800"}
          style={[
            {
              fontSize: textSizeConfig.fontSize,
              lineHeight: textSizeConfig.lineHeight,
            },
            index === highlightedWordIndex
              ? {
                  backgroundColor: "#FDE68A",
                }
              : null,
          ]}
        >
          {word.value}
          {index < spokenWordRanges.length - 1 ? " " : ""}
        </Text>
      ))}
    </Text>
  );

  const toggleReading = useCallback(() => {
    if (!storyText) return;

    if (isReading) {
      stopReading();
      return;
    }

    if (audioSettings.appSoundsMuted) {
      finishReading();
      return;
    }

    Speech.stop();
    speechBoundaryReceivedRef.current = false;
    setIsReading(true);
    audioManager.speakAppText(storyText, {
      pitch: 1,
      rate: readingSpeedConfig.rate,
      onStart: startFallbackWordHighlight,
      onBoundary: handleSpeechBoundary,
      onDone: finishReading,
      onStopped: finishReading,
      onError: finishReading,
    });
  }, [
    audioSettings.appSoundsMuted,
    finishReading,
    handleSpeechBoundary,
    isReading,
    readingSpeedConfig.rate,
    startFallbackWordHighlight,
    stopReading,
    storyText,
  ]);

  useEffect(() => {
    if (story) {
      void preloadStoryImages(story).catch((error) => {
        console.warn("Could not preload story images:", error);
      });
    }
  }, [story]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      clearSpeechFallbackTimer();
      Speech.stop();
    };
  }, [clearSpeechFallbackTimer]);

  useEffect(() => {
    stopReading();
  }, [pageIndex, progressScopeKey, stopReading]);

  useEffect(() => {
    if (audioSettings.appSoundsMuted && isReading) {
      stopReading();
    }
  }, [audioSettings.appSoundsMuted, isReading, stopReading]);

  useEffect(() => {
    setPageIndex(0);
    setSelectedAnswers({});
    setHasSavedCompletion(false);
    setHasCompletedStory(false);
    setShowCompletionCard(false);
    setRestoredProgressKey(null);
    isSavingCompletionRef.current = false;
    startedAtRef.current = Date.now();
  }, [progressScopeKey]);

  useEffect(() => {
    let isMounted = true;

    const restoreStoryProgress = async () => {
      if (!activeChild || !story || !progressScopeKey) {
        if (isMounted) {
          setRestoredProgressKey(progressScopeKey);
        }
        return;
      }

      const progress = await getStageProgress(
        activeChild.id,
        languageCode,
        "stories",
        story.id,
      );

      if (!isMounted) return;

      if (!progress) {
        setRestoredProgressKey(progressScopeKey);
        return;
      }

      if (
        contentRevision &&
        progress.progress_payload.contentRevision !== contentRevision
      ) {
        setRestoredProgressKey(progressScopeKey);
        return;
      }

      const isCompleted = progress.status === "completed";
      setHasCompletedStory(isCompleted);
      setHasSavedCompletion(isCompleted);

      const restoredPageIndex = progress.progress_payload.currentPageIndex;
      if (
        !isCompleted &&
        typeof restoredPageIndex === "number" &&
        Number.isFinite(restoredPageIndex)
      ) {
        setPageIndex(Math.max(0, Math.min(story.pages.length - 1, restoredPageIndex)));
      }

      setRestoredProgressKey(progressScopeKey);
    };

    void restoreStoryProgress().catch((error) => {
      console.warn("Could not restore story progress:", error);
      if (isMounted && isMountedRef.current) {
        setRestoredProgressKey(progressScopeKey);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [activeChild, contentRevision, languageCode, progressScopeKey, story]);

  useEffect(() => {
    if (
      !activeChild ||
      !story ||
      isLoading ||
      hasCompletedStory ||
      restoredProgressKey !== progressScopeKey
    ) {
      return;
    }

    void markStageStarted(activeChild.id, languageCode, "stories", story.id, {
      progress_payload: {
        storyId: story.id,
        storyTitle: story.title,
        totalPages: story.pages.length,
        currentPage: pageIndex + 1,
        currentPageIndex: pageIndex,
        contentRevision,
        lastReadAt: new Date().toISOString(),
      },
    }).catch((error) => {
      console.warn("Could not persist story reading progress:", error);
    });
  }, [
    activeChild,
    contentRevision,
    hasCompletedStory,
    isLoading,
    languageCode,
    pageIndex,
    progressScopeKey,
    restoredProgressKey,
    story,
  ]);

  const quizScore = useMemo(() => {
    if (!story?.questions?.length) return undefined;
    return story.questions.reduce((score, question) => {
      return selectedAnswers[question.id] === question.correctAnswer ? score + 1 : score;
    }, 0);
  }, [selectedAnswers, story]);

  const saveCompletion = async (): Promise<boolean> => {
    if (hasSavedCompletion || hasCompletedStory) {
      if (isMountedRef.current) {
        stopReading();
        setShowCompletionCard(true);
      }
      return true;
    }

    if (
      !activeChild ||
      !story ||
      !hasAnsweredAllQuestions ||
      isSavingCompletionRef.current
    ) {
      return false;
    }

    isSavingCompletionRef.current = true;
    const duration = Math.round((Date.now() - startedAtRef.current) / 1000);
    const completedAt = new Date().toISOString();
    const percentage =
      totalQuestions > 0 && quizScore !== undefined
        ? Math.round((quizScore / totalQuestions) * 100)
        : undefined;

    const childId = activeChild.id;
    const activity = {
      child_id: childId,
      activity_type: "stories" as const,
      activity_name: `Read "${story.title}"`,
      score:
        totalQuestions > 0 && quizScore !== undefined
          ? `${quizScore}/${totalQuestions}`
          : undefined,
      duration,
      completed_at: completedAt,
      details: `Completed story "${story.title}"`,
      language_code: languageCode,
    };

    try {
      await completeLocallyFirst({
        persistLocal: async () => {
          await updateActivityProgress(childId, languageCode, "stories", {
            status: "completed",
            score: percentage,
            last_stage_id: story.id,
            completed_stage_count: 1,
            progress_payload: {
              storyId: story.id,
              storyTitle: story.title,
              totalPages: story.pages.length,
              quizScore,
              quizTotal: totalQuestions,
              quizCompletedAt: hasQuiz ? completedAt : undefined,
              durationSeconds: duration,
              completedAt,
              contentRevision,
            },
          });
          await markStageCompleted(childId, languageCode, "stories", story.id, {
            score: percentage,
            progress_payload: {
              storyTitle: story.title,
              totalPages: story.pages.length,
              quizScore,
              quizTotal: totalQuestions,
              quizCompletedAt: hasQuiz ? completedAt : undefined,
              contentRevision,
            },
          });
        },
        fallbackValue: undefined,
        revealCompletion: () => {
          if (!isMountedRef.current) return;
          setHasCompletedStory(true);
          setHasSavedCompletion(true);
          stopReading();
          setShowCompletionCard(true);
        },
        runBestEffortNetworkWork: async () => {
          await Promise.all([
            saveActivity(activity),
            syncProgressNow(childId),
          ]);
        },
        onLocalError: (error) => {
          console.warn("Could not persist story completion locally:", error);
        },
        onNetworkError: (error) => {
          console.warn("Could not finish background story completion work:", error);
        },
      });
      return true;
    } finally {
      isSavingCompletionRef.current = false;
    }
  };

  const finishStory = () => {
    void saveCompletion().catch((error) => {
      console.warn("Could not process story completion:", error);
    });
  };

  const readAgain = () => {
    stopReading();
    setPageIndex(0);
    setSelectedAnswers({});
    setShowCompletionCard(false);
    startedAtRef.current = Date.now();
  };

  const handleReadingSpeedChange = (value: ReadingSpeed) => {
    setReadingSpeed(value);
    if (isReading) {
      stopReading();
    }
  };

  const renderOptionButton = (
    label: string,
    isSelected: boolean,
    onPress: () => void,
  ) => (
    <TouchableOpacity
      key={label}
      className={`flex-1 py-3 mx-1 rounded-xl border ${
        isSelected ? "bg-amber-700 border-amber-800" : "bg-white border-amber-200"
      }`}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
    >
      <Text
        variant="bold"
        className={`text-center ${isSelected ? "text-white" : "text-slate-700"}`}
        style={{ fontSize: 15 }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <ChildLoadingState
        title={t("stories.opening")}
        message={t("stories.preparing")}
        icon="book-outline"
      />
    );
  }

  if (!story) {
    return (
      <ComingSoonState
        title={t("stories.notReady")}
        message={t("stories.missingLanguage")}
      />
    );
  }

  if (!page) {
    return (
      <ComingSoonState
        title={t("stories.notReady")}
        message={t("stories.missingPages")}
      />
    );
  }

  if (showCompletionCard) {
    return (
      <SafeAreaView className="flex-1 bg-amber-50">
        <View className="flex-1 items-center justify-center px-6 py-4">
          <ChildCompletionCard
            title={t("stories.complete")}
            message={t("stories.finished", { story: story.title })}
            icon="book"
            accentColor="#8B4513"
            availableWidth={width}
            metrics={[
              {
                label: t("stories.pagesRead"),
                value: story.pages.length,
                icon: "book-outline",
              },
              ...(hasQuiz && quizScore !== undefined
                ? [{
                    label: t("stories.quizResult"),
                    value: `${quizScore}/${totalQuestions}`,
                    icon: "checkmark-circle" as const,
                  }]
                : []),
            ]}
            actions={[
              {
                label: t("stories.readAgain"),
                icon: "refresh",
                onPress: readAgain,
                variant: "secondary",
              },
              {
                label: t("stories.backToStories"),
                icon: "arrow-back",
                onPress: () => router.back(),
                variant: "quiet",
              },
            ]}
            testID="story-completion-card"
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <GameTourProvider>
    <SafeAreaView className="flex-1 bg-amber-50">
      <View
        className="flex-1"
        style={{
          alignItems: "center",
          paddingHorizontal: outerPadding,
          paddingTop: isCompactReader ? 8 : 12,
          paddingBottom: isCompactReader ? 10 : 20,
        }}
      >
        <View
          className="flex-1"
          style={{
            width: readerStageWidth,
            transform: [{ translateX: readerStageOffsetX }],
          }}
        >
        <View
          className="flex-row items-center"
          style={{ marginBottom: isCompactReader ? 8 : 12 }}
        >
          <TouchableOpacity
            className="rounded-full bg-white items-center justify-center shadow-sm border border-amber-200"
            style={{
              width: headerButtonSize,
              height: headerButtonSize,
            }}
            onPress={() => {
              stopReading();
              router.back();
            }}
            accessibilityLabel={t("stories.goBack")}
            accessibilityRole="button"
          >
            <Ionicons name="arrow-back" size={headerIconSize} color="#8B4513" />
          </TouchableOpacity>

          <View className="flex-1 px-3">
            <Text
              variant="bold"
              className="text-amber-900"
              numberOfLines={1}
              style={{ fontSize: isCompactReader ? 18 : 20 }}
            >
              {story.title}
            </Text>
            <View className="h-2 bg-amber-100 rounded-full mt-2 overflow-hidden">
              <View
                className="h-full bg-amber-700 rounded-full"
                style={{
                  width: `${((pageIndex + 1) / story.pages.length) * 100}%`,
                }}
              />
            </View>
          </View>

          <View className="flex-row items-center">
            <TouchableOpacity
              className="rounded-full bg-white items-center justify-center shadow-sm border border-amber-200"
              style={{
                width: headerButtonSize,
                height: headerButtonSize,
              }}
              onPress={storyTour.open}
              accessibilityLabel={t("stories.showGuide")}
              accessibilityRole="button"
            >
              <Ionicons name="help-circle-outline" size={headerIconSize} color="#8B4513" />
            </TouchableOpacity>

            <TouchableOpacity
              className="rounded-full bg-white items-center justify-center shadow-sm border border-amber-200 ml-2"
              style={{
                width: headerButtonSize,
                height: headerButtonSize,
              }}
              onPress={() => setSettingsVisible(true)}
              accessibilityLabel={t("stories.openAccessibility")}
              accessibilityRole="button"
            >
              <Ionicons name="options-outline" size={headerIconSize} color="#8B4513" />
            </TouchableOpacity>
          </View>
        </View>

        <View
            className="flex-1"
            style={{
              flexDirection: useSplitLayout ? "row" : "column",
              alignItems: "stretch",
              justifyContent: "center",
            }}
          >
          <View
            className="bg-white rounded-3xl shadow-md border border-amber-200"
            style={{
              flex: useSplitLayout ? (isCompactReader ? 0.7 : 0.78) : undefined,
              height: useSplitLayout ? undefined : portraitImageHeight,
              padding: imagePanelPadding,
              marginRight: useSplitLayout ? (isCompactReader ? 10 : 12) : 0,
              marginBottom: useSplitLayout ? 0 : isCompactReader ? 8 : 12,
            }}
          >
            <CachedImage
              source={resolveImageSource(page.image, "learning-beginner.jpg")}
              fallbackSource={resolveImageSource("learning-beginner.jpg")}
              className="w-full h-full rounded-2xl"
              resizeMode="contain"
              accessibilityLabel={page.altText ?? story.title}
            />
          </View>

          <View
            className={useSplitLayout ? "pl-3" : "flex-1"}
            style={{
              flex: useSplitLayout ? 1 : 1,
              minHeight: 0,
            }}
          >
            <View
              className="flex-row items-center justify-between"
              style={{ marginBottom: isCompactReader ? 8 : 12 }}
            >
              <TourTarget id="story-audio">
              <TouchableOpacity
                className={`rounded-full shadow-sm flex-row items-center ${
                  isReading ? "bg-red-600" : "bg-emerald-700"
                }`}
                style={{
                  paddingHorizontal: isCompactReader ? 16 : 20,
                  paddingVertical: isCompactReader ? 11 : 13,
                }}
                onPress={toggleReading}
                accessibilityLabel={isReading ? t("stories.stopAloud") : t("stories.readAloud")}
                accessibilityRole="button"
              >
                <Ionicons
                  name={isReading ? "stop-circle-outline" : "volume-high-outline"}
                  size={isCompactReader ? 20 : 22}
                  color="#fff"
                />
                <Text
                  variant="bold"
                  className="text-white ml-2"
                  style={{ fontSize: isCompactReader ? 16 : 17 }}
                >
                  {isReading ? t("common.stop") : t("common.read")}
                </Text>
              </TouchableOpacity>
              </TourTarget>

              <View
                className="bg-white rounded-full shadow-sm flex-row items-center border border-amber-200"
                style={{
                  paddingHorizontal: isCompactReader ? 12 : 16,
                  paddingVertical: isCompactReader ? 7 : 8,
                }}
              >
                <Ionicons name="book-outline" size={isCompactReader ? 15 : 17} color="#92400E" />
                <Text variant="bold" className="text-amber-800 ml-1.5" numberOfLines={1}>
                  {pageIndex + 1}/{story.pages.length}
                </Text>
              </View>
            </View>

            <TourTarget id="story-content">
            <View
              className="bg-white rounded-3xl shadow-md border border-amber-200 overflow-hidden"
              style={{
                flex: textSizeConfig.textPanelFlex,
                minHeight: textPanelMinHeight,
                marginBottom: isCompactReader ? 8 : 12,
              }}
            >
              <ScrollView
                alwaysBounceVertical={false}
                bounces={storyCanScroll}
                className="flex-1"
                contentContainerStyle={{
                  padding: isCompactReader ? 16 : 22,
                  paddingBottom: isCompactReader ? 20 : 30,
                }}
                onContentSizeChange={(_, nextContentHeight) => {
                  const roundedHeight = Math.round(nextContentHeight);
                  setStoryContentHeight((currentHeight) =>
                    currentHeight === roundedHeight ? currentHeight : roundedHeight,
                  );
                }}
                onLayout={(event) => {
                  const roundedHeight = Math.round(event.nativeEvent.layout.height);
                  setStoryViewportHeight((currentHeight) =>
                    currentHeight === roundedHeight ? currentHeight : roundedHeight,
                  );
                }}
                overScrollMode={storyCanScroll ? "auto" : "never"}
                scrollEnabled={storyCanScroll}
                showsVerticalScrollIndicator={storyCanScroll}
              >
                {!isCompactReader ? (
                  <Text
                    variant="bold"
                    className="text-amber-800 mb-4 text-center"
                    style={{ fontSize: Math.max(20, textSizeConfig.fontSize + 1) }}
                  >
                    {story.title}
                  </Text>
                ) : null}
                {renderStoryText()}
                {page.translation ? (
                  <Text
                    className="text-slate-500 mt-4"
                    style={{
                      fontSize: textSizeConfig.translationFontSize,
                      lineHeight: textSizeConfig.translationLineHeight,
                    }}
                  >
                    {page.translation}
                  </Text>
                ) : null}

                {isLastPage && story.questions?.length ? (
                  <View className="mt-6">
                    <Text variant="bold" className="text-xl text-amber-800 mb-4 text-center">
                      {story.title} - {t("stories.quiz")}
                    </Text>
                    {story.questions.map((question, questionIndex) => (
                      <View key={question.id} className="mb-5 bg-amber-50 rounded-xl p-4">
                        <Text variant="bold" className="text-lg text-slate-800 mb-3">
                          {questionIndex + 1}. {question.question}
                        </Text>
                        {question.options.map((option, optionIndex) => {
                          const isSelected = selectedAnswers[question.id] === optionIndex;
                          const isCorrect = optionIndex === question.correctAnswer;
                          const hasAnswered = selectedAnswers[question.id] !== undefined;

                          return (
                            <TouchableOpacity
                              key={option}
                              className={`mb-2 rounded-lg border px-4 py-3 ${
                                isSelected
                                  ? isCorrect
                                    ? "bg-emerald-100 border-emerald-300"
                                    : "bg-red-100 border-red-300"
                                  : hasAnswered && isCorrect
                                    ? "bg-emerald-50 border-emerald-200"
                                    : "bg-amber-100 border-amber-200"
                              }`}
                              onPress={() =>
                                setSelectedAnswers((current) => ({
                                  ...current,
                                  [question.id]: optionIndex,
                                }))
                              }
                              accessibilityRole="button"
                            >
                              <Text
                                className={`${
                                  isSelected ? "text-slate-900" : "text-slate-700"
                                }`}
                              >
                                {option}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    ))}
                    {quizScore !== undefined ? (
                      <View className="bg-indigo-50 p-4 rounded-xl items-center">
                        <Text variant="bold" className="text-xl text-indigo-700">
                          {t("stories.score")}: {quizScore}/{story.questions.length}
                        </Text>
                      </View>
                    ) : null}
                    {!hasAnsweredAllQuestions ? (
                      <Text className="text-amber-700 text-center mt-3 italic">
                        {t("stories.answerAll")}
                      </Text>
                    ) : null}
                  </View>
                ) : null}
              </ScrollView>
            </View>
            </TourTarget>

            <TourTarget id="story-navigation">
            <View
              className="flex-row justify-between items-center"
              style={{ marginBottom: isCompactReader ? 0 : 12 }}
            >
              <TouchableOpacity
                className={`rounded-full justify-center items-center shadow ${
                  pageIndex === 0 ? "bg-gray-300" : "bg-amber-700"
                }`}
                style={{
                  width: footerButtonSize,
                  height: footerButtonSize,
                }}
                onPress={() => setPageIndex((current) => Math.max(0, current - 1))}
                disabled={pageIndex === 0}
                accessibilityLabel={t("stories.previousPage")}
                accessibilityRole="button"
                accessibilityState={{ disabled: pageIndex === 0 }}
              >
                <Ionicons name="chevron-back" size={footerIconSize} color="#fff" />
              </TouchableOpacity>

              {isLastPage ? (
                <TouchableOpacity
                  className={`rounded-full shadow-md ${
                    hasAnsweredAllQuestions ? "bg-indigo-700" : "bg-gray-300"
                  }`}
                  style={{
                    paddingHorizontal: isCompactReader ? 20 : 24,
                    paddingVertical: isCompactReader ? 10 : 12,
                  }}
                  onPress={finishStory}
                  disabled={!hasAnsweredAllQuestions}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !hasAnsweredAllQuestions }}
                >
                  <Text
                    variant="bold"
                    className={`${
                      hasAnsweredAllQuestions ? "text-white" : "text-slate-500"
                    }`}
                    style={{ fontSize: isCompactReader ? 16 : 18 }}
                  >
                    {t("common.finish")}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  className="rounded-full bg-emerald-700 shadow-md"
                  style={{
                    paddingHorizontal: isCompactReader ? 20 : 24,
                    paddingVertical: isCompactReader ? 10 : 12,
                  }}
                  onPress={() =>
                    setPageIndex((current) => Math.min(story.pages.length - 1, current + 1))
                  }
                  accessibilityRole="button"
                >
                  <Text
                    variant="bold"
                    className="text-white"
                    style={{ fontSize: isCompactReader ? 16 : 18 }}
                  >
                    {t("common.next")}
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                className={`rounded-full justify-center items-center shadow ${
                  isLastPage ? "bg-gray-300" : "bg-amber-700"
                }`}
                style={{
                  width: footerButtonSize,
                  height: footerButtonSize,
                }}
                onPress={() =>
                  setPageIndex((current) => Math.min(story.pages.length - 1, current + 1))
                }
                disabled={isLastPage}
                accessibilityLabel={t("stories.nextPage")}
                accessibilityRole="button"
                accessibilityState={{ disabled: isLastPage }}
              >
                <Ionicons name="chevron-forward" size={footerIconSize} color="#fff" />
              </TouchableOpacity>
            </View>
            </TourTarget>

            {!isCompactReader ? (
              <View className="flex-row justify-center">
                {story.pages.map((storyPage) => (
                  <View
                    key={storyPage.id}
                    className={`mx-1 rounded-full ${
                      storyPage.id === page.id
                        ? "w-4 h-4 bg-amber-700"
                        : "w-2.5 h-2.5 bg-amber-300"
                    }`}
                  />
                ))}
              </View>
            ) : null}
          </View>
        </View>
        </View>
      </View>
      <GameTour
        visible={storyTour.visible}
        onCancel={storyTour.close}
        onComplete={storyTour.complete}
        accentColor="#8B4513"
        finishLabel={t("stories.startReading")}
        steps={[
          {
            id: "content",
            targetId: "story-content",
            icon: "volume-high-outline",
            placement: "auto",
            title: t("stories.readStory"),
            description: t("stories.readWords"),
          },
          {
            id: "audio",
            targetId: "story-audio",
            icon: "volume-high-outline",
            placement: "bottom",
            title: t("stories.listen"),
            description: t("stories.listenHint"),
          },
          {
            id: "navigation",
            targetId: "story-navigation",
            icon: "arrow-forward-circle-outline",
            placement: "top",
            title: t("stories.turnPage"),
            description: t("stories.turnPageHint"),
          },
        ]}
      />
      <Modal
        testID="story-settings-modal"
        animationType="fade"
        navigationBarTranslucent
        onRequestClose={() => setSettingsVisible(false)}
        presentationStyle="overFullScreen"
        statusBarTranslucent
        supportedOrientations={["landscape", "landscape-left", "landscape-right"]}
        transparent
        visible={settingsVisible}
      >
        <SafeAreaView
          className="flex-1 bg-black/50 justify-center items-center px-6"
          edges={["top", "bottom", "left", "right"]}
          accessibilityViewIsModal
        >
          <View className="bg-white rounded-3xl p-5 w-full max-w-md shadow-lg border border-amber-200">
            <View className="flex-row items-center justify-between mb-5">
              <View className="flex-row items-center flex-1">
                <View className="w-11 h-11 rounded-full bg-amber-100 items-center justify-center mr-3">
                  <Ionicons name="options" size={24} color="#8B4513" />
                </View>
                <Text variant="bold" className="text-2xl text-amber-900" numberOfLines={1}>
                  {t("stories.accessibility")}
                </Text>
              </View>
              <TouchableOpacity
                className="w-11 h-11 rounded-full bg-slate-100 items-center justify-center"
                onPress={() => setSettingsVisible(false)}
                accessibilityLabel={t("stories.closeAccessibility")}
                accessibilityRole="button"
              >
                <Ionicons name="close" size={24} color="#334155" />
              </TouchableOpacity>
            </View>

            <View className="mb-5">
              <Text variant="bold" className="text-slate-800 text-base mb-2">
                {t("stories.textSize")}
              </Text>
              <View className="flex-row -mx-1">
                {TEXT_SIZE_OPTIONS.map((option) =>
                  renderOptionButton(t(`stories.${option.value}`), textSize === option.value, () =>
                    setTextSize(option.value),
                  ),
                )}
              </View>
            </View>

            <View className="mb-5">
              <Text variant="bold" className="text-slate-800 text-base mb-2">
                {t("stories.readingSpeed")}
              </Text>
              <View className="flex-row -mx-1">
                {READING_SPEED_OPTIONS.map((option) =>
                  renderOptionButton(t(`stories.${option.value}`), readingSpeed === option.value, () =>
                    handleReadingSpeedChange(option.value),
                  ),
                )}
              </View>
            </View>

            <TouchableOpacity
              className="bg-indigo-700 py-3 rounded-xl items-center shadow-sm"
              onPress={() => setSettingsVisible(false)}
              accessibilityRole="button"
              accessibilityLabel={t("stories.closeAccessibility")}
            >
              <Text variant="bold" className="text-white text-base">
                {t("common.done")}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
    </GameTourProvider>
  );
}
