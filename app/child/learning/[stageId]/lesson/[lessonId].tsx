import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ImageBackground,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "@/components/StyledText";
import { ChildLoadingState } from "@/components/child/ChildLoadingState";
import {
  GameTour,
  GameTourProvider,
  TourTarget,
  useGameTour,
} from "@/components/games/GameTour";
import { LearningLanguageUnavailableState } from "@/components/learning/LearningLanguageUnavailableState";
import { getMechanicRenderer } from "@/components/learning/mechanics/mechanicRegistry";
import { brandColors } from "@/constants/Brand";
import { useChild } from "@/context/ChildContext";
import { useChildNotice } from "@/context/ChildNoticeContext";
import { useChildUiLanguage } from "@/context/ChildUiLanguageContext";
import {
  DEFAULT_LEARNING_LANGUAGE_CODE,
  getLearningLanguage,
} from "@/content/languages";
import {
  getLessonStatus,
  getMechanicLabel,
} from "@/content/learningHubRepository";
import type {
  ItemResult,
  LearningLanguageContent,
} from "@/content/learningHubTypes";
import { useChildLandscapeOrientation } from "@/hooks/useChildLandscapeOrientation";
import { useLearningHubContent } from "@/hooks/useLearningHubContent";
import { useLearningHubProgress } from "@/hooks/useLearningHubProgress";
import {
  LEARNING_ACTIVITY_TYPE,
  awardLearningLessonCompletionAchievements,
  buildLearningCompletionLocalId,
  getLearningLessonCompletion,
  getLearningProgressChildId,
  saveLearningLessonCompletion,
} from "@/lib/learningProgressRepository";
import {
  getLearningLessonAccessState,
  getLearningStageAccessState,
} from "@/lib/learningStageAccess";

const getRouteParam = (value: unknown): string => {
  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0] : "";
  }

  return typeof value === "string" ? value : "";
};

type LessonStateProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  buttonLabel: string;
  onButtonPress: () => void;
};

const LessonState = ({
  icon,
  title,
  message,
  buttonLabel,
  onButtonPress,
}: LessonStateProps) => {
  const { height } = useWindowDimensions();
  const isCompactState = height < 430;

  return (
    <ImageBackground source={require("@/assets/images/gameBackground.jpg")} className="flex-1 bg-cover">
      <SafeAreaView className="flex-1" edges={[]} style={{ backgroundColor: "rgba(2, 116, 187, 0.88)" }}>
        <View
          className="flex-1 items-center justify-center"
          style={{
            paddingHorizontal: isCompactState ? 24 : 32,
            paddingVertical: isCompactState ? 12 : 20,
          }}
        >
          <View
            className="bg-white rounded-2xl border-2 border-accent-500 w-full max-w-md items-center"
            style={{ padding: isCompactState ? 18 : 24 }}
          >
            <View
              className="rounded-full bg-primary-50 items-center justify-center"
              style={{
                height: isCompactState ? 60 : 68,
                marginBottom: isCompactState ? 10 : 14,
                width: isCompactState ? 60 : 68,
              }}
            >
              <Ionicons
                name={icon}
                size={isCompactState ? 32 : 36}
                color={brandColors.victoriaBlue}
              />
            </View>
            <Text
              variant="bold"
              className="text-primary-700 text-center mb-2"
              style={{ fontSize: isCompactState ? 26 : 29 }}
            >
              {title}
            </Text>
            <Text
              className="text-neutral-600 text-center mb-5"
              style={{ fontSize: 17, lineHeight: 24 }}
            >
              {message}
            </Text>
            <TouchableOpacity
              className="bg-primary-600 rounded-full px-7 py-3"
              onPress={onButtonPress}
              accessibilityRole="button"
              accessibilityLabel={buttonLabel}
            >
              <Text variant="bold" className="text-white" style={{ fontSize: 17 }}>
                {buttonLabel}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
};

const ProgressDots = ({
  currentIndex,
  total,
}: {
  currentIndex: number;
  total: number;
}) => (
  <View className="flex-row items-center justify-center mt-2">
    {Array.from({ length: total }).map((_, index) => (
      <View
        key={`lesson-progress-dot-${index}`}
        className="w-2.5 h-2.5 rounded-full mx-1"
        style={{
          backgroundColor:
            index <= currentIndex ? brandColors.equatorialGold : "rgba(255,255,255,0.38)",
        }}
      />
    ))}
  </View>
);

export default function LearningLessonSessionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { height, width } = useWindowDimensions();
  const { activeChild } = useChild();
  const { t } = useChildUiLanguage();
  const lessonTour = useGameTour("learning-hub", activeChild?.id);
  const { enqueueAchievementUnlocks } = useChildNotice();
  const stageId = getRouteParam(params.stageId);
  const lessonId = getRouteParam(params.lessonId);
  const childId = getLearningProgressChildId(activeChild?.id);
  const {
    languageCode,
    languageContent: loadedLanguageContent,
    contentVersion: loadedContentVersion,
    status: contentStatus,
    retry,
  } = useLearningHubContent(
    activeChild?.selected_language_code || DEFAULT_LEARNING_LANGUAGE_CODE,
  );
  const contentScopeKey = `${languageCode}:${stageId}:${lessonId}`;
  const [contentSnapshot, setContentSnapshot] = useState<{
    scopeKey: string;
    content: LearningLanguageContent;
    contentVersion: string;
  } | null>(null);
  const activeContentSnapshot =
    contentSnapshot?.scopeKey === contentScopeKey ? contentSnapshot : null;
  const languageContent = activeContentSnapshot?.content ?? null;
  const lessonContentVersion = activeContentSnapshot?.contentVersion;
  const languageName = getLearningLanguage(languageCode)?.name;
  const completedLearningLessonIds = useLearningHubProgress(
    childId,
    languageCode,
    Boolean(languageContent),
    lessonContentVersion,
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [results, setResults] = useState<ItemResult[]>([]);
  const resultsRef = useRef<ItemResult[]>([]);
  const saveCompletionInFlightRef = useRef(false);
  const isMountedRef = useRef(true);
  const completionScopeRef = useRef({ childId, languageCode, lessonId });

  completionScopeRef.current = { childId, languageCode, lessonId };

  useChildLandscapeOrientation("child learning lesson");

  useEffect(() => {
    setContentSnapshot((currentSnapshot) => {
      if (currentSnapshot?.scopeKey === contentScopeKey) {
        return currentSnapshot;
      }

      if (!loadedLanguageContent || !loadedContentVersion) {
        return null;
      }

      return {
        scopeKey: contentScopeKey,
        content: loadedLanguageContent,
        contentVersion: loadedContentVersion,
      };
    });
  }, [contentScopeKey, loadedContentVersion, loadedLanguageContent]);

  const stage = useMemo(
    () => languageContent?.stages.find((candidate) => candidate.id === stageId),
    [languageContent, stageId],
  );
  const lesson = useMemo(
    () => stage?.lessons.find((candidate) => candidate.id === lessonId),
    [lessonId, stage],
  );
  const stageAccess = useMemo(
    () =>
      languageContent
        ? getLearningStageAccessState(
            languageContent.stages,
            completedLearningLessonIds,
            stageId,
          )
        : undefined,
    [completedLearningLessonIds, languageContent, stageId],
  );
  const lessonAccess = useMemo(
    () =>
      stage
        ? getLearningLessonAccessState(
            stage,
            completedLearningLessonIds,
            lessonId,
          )
        : undefined,
    [completedLearningLessonIds, lessonId, stage],
  );
  const items = useMemo(() => lesson?.items ?? [], [lesson]);
  const lessonStatus = useMemo(
    () =>
      stageAccess?.isLocked
        ? "locked"
        : lessonAccess?.effectiveStatus ?? getLessonStatus(lesson, stage),
    [lesson, lessonAccess?.effectiveStatus, stage, stageAccess?.isLocked],
  );
  const currentItem = items[currentIndex];
  const isLastItem = currentIndex === items.length - 1;
  const isCompactLessonScreen = height < 430;
  const lessonHorizontalPadding = width < 380 ? 16 : 24;
  const headerButtonSize = isCompactLessonScreen ? 44 : 48;
  const CurrentMechanicRenderer = currentItem && lessonStatus === "startable"
    ? getMechanicRenderer(currentItem.mechanic)
    : null;

  useEffect(() => {
    setCurrentIndex(0);
    setIsComplete(false);
    setResults([]);
    resultsRef.current = [];
    saveCompletionInFlightRef.current = false;
  }, [lesson?.id, stageId]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const goBackToLearning = () => {
    router.replace("/child/learning" as any);
  };

  const goBackToStagePath = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    if (!stageId) {
      goBackToLearning();
      return;
    }

    router.replace({
      pathname: "/child/learning/[stageId]",
      params: { stageId },
    } as any);
  };

  const saveLessonCompletion = useCallback(
    async (itemResults: ItemResult[]) => {
      if (!stage || !lesson || saveCompletionInFlightRef.current) {
        return;
      }

      saveCompletionInFlightRef.current = true;
      const completionScope = { childId, languageCode, lessonId };
      const completedAt = Date.now();
      const totalItems = items.length;
      const correctItems = itemResults.filter(
        (itemResult) => itemResult.correct !== false,
      ).length;
      const existingCompletion = await getLearningLessonCompletion(
        childId,
        languageCode,
        stage.id,
        lesson.id,
      );
      const attempts = (existingCompletion?.attempts ?? 0) + 1;
      const mechanicTypes = [
        ...new Set(items.map((item) => item.mechanic)),
      ];
      const stageStartableLessonIds = stage.lessons
        .filter((stageLesson) => getLessonStatus(stageLesson, stage) === "startable")
        .map((stageLesson) => stageLesson.id);

      const savedCompletion = await saveLearningLessonCompletion({
        localId: buildLearningCompletionLocalId(
          childId,
          languageCode,
          stage.id,
          lesson.id,
        ),
        childId,
        languageCode,
        activityType: LEARNING_ACTIVITY_TYPE,
        stageId: stage.id,
        levelId: lesson.id,
        status: "completed",
        score: totalItems > 0 ? Math.round((correctItems / totalItems) * 100) : 0,
        attempts,
        completedAt,
        progressPayload: {
          source: "learning_hub",
          lessonId: lesson.id,
          stageTitle: stage.title,
          lessonTitle: lesson.title,
          stageNumber: stage.stageNumber,
          lessonOrder: lesson.order,
          stageLessonIds: stageStartableLessonIds,
          mechanicTypes,
          itemResults,
          totalItems,
          correctItems,
          completedAt,
          contentVersion: lessonContentVersion,
        },
        readiness: "local_only",
      });

      void awardLearningLessonCompletionAchievements(savedCompletion)
        .then((newlyEarnedAchievements) => {
          const currentScope = completionScopeRef.current;
          if (
            isMountedRef.current &&
            currentScope.childId === completionScope.childId &&
            currentScope.languageCode === completionScope.languageCode &&
            currentScope.lessonId === completionScope.lessonId &&
            newlyEarnedAchievements.length > 0
          ) {
            enqueueAchievementUnlocks(newlyEarnedAchievements);
          }
        })
        .catch((error) => {
          console.warn("Could not award Learning Hub achievements:", error);
        });
    },
    [
      childId,
      enqueueAchievementUnlocks,
      items,
      languageCode,
      lesson,
      lessonContentVersion,
      lessonId,
      stage,
    ],
  );

  const handleItemComplete = useCallback(
    (result: ItemResult) => {
      const nextResults = [
        ...resultsRef.current.filter((itemResult) => itemResult.itemId !== result.itemId),
        result,
      ];

      resultsRef.current = nextResults;
      setResults(nextResults);

      if (currentIndex >= items.length - 1) {
        setIsComplete(true);
        void saveLessonCompletion(nextResults).catch((error) => {
          saveCompletionInFlightRef.current = false;
          console.warn("Could not save local Learning lesson completion:", error);
        });
        return;
      }

      setCurrentIndex((index) => Math.min(index + 1, items.length - 1));
    },
    [currentIndex, items.length, saveLessonCompletion],
  );

  if (!languageContent) {
    const isLoading = contentStatus === "loading" || Boolean(loadedLanguageContent);

    if (isLoading) {
      return (
        <>
          <Stack.Screen options={{ headerShown: false, animation: "slide_from_right" }} />
          <ChildLoadingState
            title={t("learning.gettingLessonReady")}
            message={t("learning.loadingActivity")}
            icon="book-outline"
            onBack={goBackToLearning}
            backLabel={t("learning.backToLearning")}
          />
        </>
      );
    }

    return (
      <>
        <Stack.Screen options={{ headerShown: false, animation: "slide_from_right" }} />
        <StatusBar style="light" translucent backgroundColor="transparent" />
        <LearningLanguageUnavailableState
          languageName={languageName}
          actionLabel={t("common.retry")}
          onAction={retry}
          secondaryActionLabel={t("learning.backToLearning")}
          onSecondaryAction={goBackToLearning}
        />
      </>
    );
  }

  if (!stage) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false, animation: "slide_from_right" }} />
        <StatusBar style="light" translucent backgroundColor="transparent" />
        <LessonState
          icon="search-outline"
          title={t("learning.lessonNotFound")}
          message={t("learning.stageUnavailable")}
          buttonLabel={t("learning.backToLearning")}
          onButtonPress={goBackToLearning}
        />
      </>
    );
  }

  if (!lesson) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false, animation: "slide_from_right" }} />
        <StatusBar style="light" translucent backgroundColor="transparent" />
        <LessonState
          icon="search-outline"
          title={t("learning.lessonNotFound")}
          message={t("learning.stageUnavailable")}
          buttonLabel={t("learning.backToLessons")}
          onButtonPress={goBackToStagePath}
        />
      </>
    );
  }

  if (lessonStatus !== "startable") {
    const title =
      lessonStatus === "locked"
        ? t("learning.lockedForNow")
        : lessonStatus === "empty"
          ? t("learning.cardsComingSoon")
          : lessonStatus === "unsupported"
            ? t("learning.notReadyYet")
            : t("games.comingSoon");
    const message =
      lessonStatus === "locked"
        ? stageAccess?.isExplicitlyLocked
          ? t("learning.stageWillUnlock", { stage: stage.title })
          : stageAccess?.isProgressLocked && stageAccess.lockedByStageTitle
            ? t("learning.completeToUnlock", {
                required: stageAccess.lockedByStageTitle,
                target: stage.title,
              })
            : lessonAccess?.isProgressLocked && lessonAccess.lockedByLessonTitle
              ? t("learning.completeToUnlock", {
                  required: lessonAccess.lockedByLessonTitle,
                  target: lesson.title,
                })
            : t("learning.stageWillUnlock", { stage: stage.title })
        : lessonStatus === "empty"
          ? t("learning.needsItems", { lesson: lesson.title })
          : lessonStatus === "unsupported"
            ? t("learning.mechanicUnsupported", {
                mechanic: getMechanicLabel(lesson.mechanic),
              })
            : t("learning.mechanicPreparing", {
                mechanic: getMechanicLabel(lesson.mechanic),
                stage: stage.title,
              });

    return (
      <>
        <Stack.Screen options={{ headerShown: false, animation: "slide_from_right" }} />
        <StatusBar style="light" translucent backgroundColor="transparent" />
        <LessonState
          icon={lessonStatus === "locked" ? "lock-closed-outline" : "construct-outline"}
          title={title}
          message={message}
          buttonLabel={t("learning.backToLessons")}
          onButtonPress={goBackToStagePath}
        />
      </>
    );
  }

  if (items.length === 0 || !currentItem || !CurrentMechanicRenderer) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false, animation: "slide_from_right" }} />
        <StatusBar style="light" translucent backgroundColor="transparent" />
        <LessonState
          icon="images-outline"
          title={t("learning.cardsComingSoon")}
          message={t("learning.needsItems", { lesson: lesson.title })}
          buttonLabel={t("learning.backToLessons")}
          onButtonPress={goBackToStagePath}
        />
      </>
    );
  }

  if (isComplete) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false, animation: "slide_from_right" }} />
        <StatusBar style="light" translucent backgroundColor="transparent" />
        <ImageBackground source={require("@/assets/images/gameBackground.jpg")} className="flex-1 bg-cover">
          <SafeAreaView className="flex-1" edges={[]} style={{ backgroundColor: "rgba(2, 116, 187, 0.88)" }}>
            <View
              className="flex-1 items-center justify-center"
              style={{
                paddingHorizontal: isCompactLessonScreen ? 24 : 32,
                paddingVertical: isCompactLessonScreen ? 12 : 20,
              }}
            >
              <View
                className="bg-white rounded-2xl border-2 border-accent-500 w-full max-w-md items-center"
                style={{ padding: isCompactLessonScreen ? 18 : 24 }}
              >
                <View
                  className="rounded-full bg-green-100 items-center justify-center"
                  style={{
                    height: isCompactLessonScreen ? 68 : 80,
                    marginBottom: isCompactLessonScreen ? 10 : 14,
                    width: isCompactLessonScreen ? 68 : 80,
                  }}
                >
                  <Ionicons
                    name="checkmark-circle"
                    size={isCompactLessonScreen ? 40 : 46}
                    color={brandColors.success}
                  />
                </View>
                <Text
                  variant="bold"
                  className="text-primary-700 text-center mb-2"
                  style={{ fontSize: isCompactLessonScreen ? 28 : 31 }}
                >
                  {t("learning.greatLearning")}
                </Text>
                <Text
                  className="text-neutral-600 text-center mb-5"
                  style={{ fontSize: 17, lineHeight: 24 }}
                >
                  {t("learning.finishedLesson", {
                    lesson: lesson.title,
                    stage: stage.title,
                    count: results.length,
                  })}
                </Text>
                <TouchableOpacity
                  className="bg-primary-600 rounded-full px-7 py-3"
                  onPress={goBackToStagePath}
                  accessibilityRole="button"
                  accessibilityLabel={t("common.continue")}
                >
                  <Text variant="bold" className="text-white" style={{ fontSize: 17 }}>
                    {t("common.continue")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </ImageBackground>
      </>
    );
  }

  return (
    <GameTourProvider>
    <>
      <Stack.Screen options={{ headerShown: false, animation: "slide_from_right" }} />
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <ImageBackground source={require("@/assets/images/gameBackground.jpg")} className="flex-1 bg-cover">
        <SafeAreaView className="flex-1" edges={[]} style={{ backgroundColor: "rgba(2, 116, 187, 0.88)" }}>
          <View
            className="flex-1"
            style={{
              paddingBottom: isCompactLessonScreen ? 10 : 14,
              paddingHorizontal: lessonHorizontalPadding,
              paddingTop: isCompactLessonScreen ? 14 : 20,
            }}
          >
            <View className="flex-row items-center justify-between mb-2">
              <TouchableOpacity
                className="w-12 h-12 rounded-full bg-white items-center justify-center border-2 border-accent-500"
                style={{
                  flexShrink: 0,
                  height: headerButtonSize,
                  width: headerButtonSize,
                }}
                onPress={goBackToStagePath}
                accessibilityRole="button"
                accessibilityLabel={t("learning.backToLessons")}
              >
                <Ionicons name="arrow-back" size={24} color={brandColors.victoriaBlue} />
              </TouchableOpacity>

              <View
                className="flex-1"
                style={{
                  minWidth: 0,
                  paddingHorizontal: width < 380 ? 8 : 16,
                }}
              >
                <Text
                  variant="bold"
                  className="text-white text-center"
                  style={{ fontSize: isCompactLessonScreen ? 25 : 27 }}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.72}
                >
                  {lesson.title}
                </Text>
                <Text
                  className="text-white/80 text-center"
                  style={{ fontSize: 15 }}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.78}
                >
                  {stage.title}
                </Text>
                <ProgressDots currentIndex={currentIndex} total={items.length} />
              </View>

              <View className="flex-row items-center" style={{ flexShrink: 0 }}>
                <TourTarget id="learning-lesson-progress">
                <View
                  className="bg-white rounded-full px-4 py-2 border-2 border-accent-500"
                  style={{ maxWidth: width < 380 ? 82 : 104 }}
                >
                  <Text
                    variant="bold"
                    className="text-primary-700 text-center"
                    style={{ fontSize: 15 }}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.76}
                  >
                    {t("learning.progressPosition", {
                      current: currentIndex + 1,
                      total: items.length,
                    })}
                  </Text>
                </View>
                </TourTarget>

                <TouchableOpacity
                  className="rounded-full bg-white items-center justify-center border-2 border-accent-500 ml-2"
                  style={{ height: headerButtonSize, width: headerButtonSize }}
                  onPress={lessonTour.open}
                  accessibilityRole="button"
                  accessibilityLabel="Show lesson guide"
                >
                  <Ionicons
                    name="help-circle-outline"
                    size={24}
                    color={brandColors.victoriaBlue}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View className="h-2 bg-white/30 rounded-full overflow-hidden mb-2">
              <View
                className="h-full bg-accent-500 rounded-full"
                style={{ width: `${((currentIndex + 1) / items.length) * 100}%` }}
              />
            </View>

            <View className="flex-1">
              <CurrentMechanicRenderer
                key={currentItem.id}
                item={currentItem}
                isLastItem={isLastItem}
                stageImageKey={stage.imageKey}
                onComplete={handleItemComplete}
              />
            </View>
          </View>
        </SafeAreaView>
      </ImageBackground>
      <GameTour
        visible={lessonTour.visible}
        onCancel={lessonTour.close}
        onComplete={lessonTour.complete}
        finishLabel={t("games.startLearning")}
        steps={[
          {
            id: "content",
            targetId: "learning-lesson-content",
            icon: "eye-outline",
            placement: "auto",
            title: t("learning.tryThis"),
            description: t("learning.tryDescription"),
          },
          {
            id: "action",
            targetId: "learning-lesson-action",
            icon: "hand-left-outline",
            placement: "top",
            title: t("common.next"),
            description: t("learning.nextHint"),
          },
          {
            id: "progress",
            targetId: "learning-lesson-progress",
            icon: "trending-up-outline",
            placement: "bottom",
            title: t("learning.yourProgress"),
            description: t("learning.progressDescription", {
              current: currentIndex + 1,
              total: items.length,
            }),
          },
        ]}
      />
    </>
    </GameTourProvider>
  );
}
