import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useMemo } from "react";
import {
  FlatList,
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
import { brandColors } from "@/constants/Brand";
import { useChild } from "@/context/ChildContext";
import {
  DEFAULT_LEARNING_LANGUAGE_CODE,
  getLearningLanguage,
} from "@/content/languages";
import {
  getMechanicLabel,
  type LearningHubLesson,
  type LearningHubStage,
} from "@/content/learningHubRepository";
import type { LessonStatus } from "@/content/learningHubTypes";
import { useChildLandscapeOrientation } from "@/hooks/useChildLandscapeOrientation";
import { useLearningHubContent } from "@/hooks/useLearningHubContent";
import { useLearningHubProgress } from "@/hooks/useLearningHubProgress";
import { getLearningProgressChildId } from "@/lib/learningProgressRepository";
import {
  getLearningLessonAccessStates,
  getLearningStageAccessState,
  type LearningLessonAccessState,
} from "@/lib/learningStageAccess";

const getRouteStageId = (value: unknown): string => {
  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0] : "";
  }

  return typeof value === "string" ? value : "";
};

type LessonCardStatus = {
  label: "Start" | "Review" | "Coming soon" | "Locked" | "Unsupported" | "Needs cards";
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  backgroundColor: string;
  disabled: boolean;
};

const getLessonCardStatus = (
  status: LessonStatus,
  isCompleted = false,
): LessonCardStatus => {
  if (status === "locked") {
    return {
      label: "Locked",
      icon: "lock-closed",
      color: brandColors.neutral[600],
      backgroundColor: brandColors.neutral[100],
      disabled: true,
    };
  }

  if (status === "unsupported") {
    return {
      label: "Unsupported",
      icon: "alert-circle",
      color: brandColors.neutral[600],
      backgroundColor: brandColors.neutral[100],
      disabled: true,
    };
  }

  if (status === "empty") {
    return {
      label: "Needs cards",
      icon: "images",
      color: brandColors.shanaOrange,
      backgroundColor: brandColors.orange[50],
      disabled: true,
    };
  }

  if (status === "coming_soon") {
    return {
      label: "Coming soon",
      icon: "construct",
      color: brandColors.shanaOrange,
      backgroundColor: brandColors.orange[50],
      disabled: true,
    };
  }

  if (isCompleted) {
    return {
      label: "Review",
      icon: "checkmark-circle",
      color: brandColors.success,
      backgroundColor: "#DCFCE7",
      disabled: false,
    };
  }

  return {
    label: "Start",
    icon: "play-circle",
    color: brandColors.success,
    backgroundColor: "#DCFCE7",
    disabled: false,
  };
};

type LessonPathCardProps = {
  stage: LearningHubStage;
  lesson: LearningHubLesson;
  lessonAccess: LearningLessonAccessState;
  itemCount: number;
  width: number;
  height: number;
  gap: number;
  onPress: (lesson: LearningHubLesson) => void;
  tourTargetId?: string;
};

const LessonPathCard = ({
  stage,
  lesson,
  lessonAccess,
  itemCount,
  width,
  height,
  gap,
  onPress,
  tourTargetId,
}: LessonPathCardProps) => {
  const status = getLessonCardStatus(
    lessonAccess.effectiveStatus,
    lessonAccess.isCompleted,
  );
  const mechanicLabel = getMechanicLabel(lesson.mechanic);
  const progressLockLabel =
    lessonAccess.isProgressLocked && lessonAccess.lockedByLessonTitle
      ? `Complete ${lessonAccess.lockedByLessonTitle} first.`
      : undefined;

  return (
    <TourTarget id={tourTargetId ?? `learning-stage-lesson-${lesson.id}`}>
    <TouchableOpacity
      className="bg-white rounded-2xl border-2 overflow-hidden shadow-sm"
      style={{
        width,
        height,
        marginRight: gap,
        borderColor: status.disabled ? brandColors.neutral[200] : brandColors.equatorialGold,
        opacity: status.label === "Locked" ? 0.72 : 1,
      }}
      onPress={() => onPress(lesson)}
      disabled={status.disabled}
      activeOpacity={status.disabled ? 1 : 0.76}
      accessibilityRole="button"
      accessibilityLabel={`${lesson.title}. ${status.label}. ${mechanicLabel}. ${itemCount} items.${progressLockLabel ? ` ${progressLockLabel}` : ""}`}
      accessibilityState={{ disabled: status.disabled }}
    >
      <View className="p-4 flex-1 justify-between">
        <View>
          <View className="flex-row items-start justify-between mb-3">
            <View className="flex-row items-center flex-1 pr-2">
              <View
                className="w-11 h-11 rounded-full items-center justify-center mr-3"
                style={{ backgroundColor: status.backgroundColor }}
              >
                <Text variant="bold" className="text-primary-700 text-base">
                  {lesson.order}
                </Text>
              </View>
              <View className="flex-1">
                <Text variant="bold" className="text-primary-700 text-xs uppercase" numberOfLines={1}>
                  Stage {stage.stageNumber}.{lesson.order}
                </Text>
                <Text
                  variant="bold"
                  className="text-primary-700 text-lg leading-5"
                  numberOfLines={2}
                  adjustsFontSizeToFit
                  minimumFontScale={0.82}
                >
                  {lesson.title}
                </Text>
              </View>
            </View>

            <View
              className="rounded-full px-3 py-1.5 flex-row items-center"
              style={{ backgroundColor: status.backgroundColor }}
            >
              <Ionicons name={status.icon} size={14} color={status.color} />
              <Text variant="bold" className="text-[11px] ml-1" style={{ color: status.color }} numberOfLines={1}>
                {status.label}
              </Text>
            </View>
          </View>

          <Text className="text-neutral-600 text-sm leading-5" numberOfLines={2}>
            {lesson.description}
          </Text>
          {lessonAccess.isCompleted && !status.disabled ? (
            <View className="flex-row items-center mt-2">
              <Ionicons name="checkmark-done" size={14} color={brandColors.success} />
              <Text variant="bold" className="text-success text-xs ml-1" numberOfLines={1}>
                Completed
              </Text>
            </View>
          ) : progressLockLabel ? (
            <View className="flex-row items-center mt-2">
              <Ionicons name="lock-closed-outline" size={14} color={brandColors.neutral[600]} />
              <Text className="text-neutral-600 text-xs ml-1" numberOfLines={1}>
                {progressLockLabel}
              </Text>
            </View>
          ) : null}
        </View>

        <View className="flex-row items-center justify-between mt-4">
          <View className="flex-row items-center flex-1 pr-2">
            <Ionicons name="construct-outline" size={15} color={brandColors.victoriaBlue} />
            <Text variant="medium" className="text-primary-700 text-xs ml-1" numberOfLines={1}>
              {mechanicLabel}
            </Text>
          </View>
          <View className="flex-row items-center">
            <Ionicons name="albums-outline" size={15} color={brandColors.neutral[600]} />
            <Text className="text-neutral-600 text-xs ml-1" numberOfLines={1}>
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
    </TourTarget>
  );
};

type StageStateProps = {
  icon: keyof typeof Ionicons.glyphMap;
  message: string;
  onBack: () => void;
  title: string;
};

const StageState = ({ icon, message, onBack, title }: StageStateProps) => (
  <ImageBackground source={require("@/assets/images/gameBackground.jpg")} className="flex-1 bg-cover">
    <SafeAreaView className="flex-1" edges={[]} style={{ backgroundColor: "rgba(2, 116, 187, 0.88)" }}>
      <View className="flex-1 items-center justify-center px-8">
        <View className="bg-white rounded-2xl border-2 border-accent-500 p-6 w-full max-w-md items-center">
          <View className="w-16 h-16 rounded-full bg-primary-50 items-center justify-center mb-4">
            <Ionicons name={icon} size={32} color={brandColors.victoriaBlue} />
          </View>
          <Text variant="bold" className="text-primary-700 text-2xl text-center mb-2">
            {title}
          </Text>
          <Text className="text-neutral-600 text-base text-center leading-6 mb-5">
            {message}
          </Text>
          <TouchableOpacity
            className="bg-primary-600 rounded-full px-6 py-3"
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Back to Learning"
          >
            <Text variant="bold" className="text-white text-base">
              Back to Learning
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  </ImageBackground>
);

export default function LearningStagePathScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { activeChild } = useChild();
  const stageTour = useGameTour("learning-hub-stage", activeChild?.id);
  const { width, height } = useWindowDimensions();
  const stageId = getRouteStageId(params.stageId);
  const childId = getLearningProgressChildId(activeChild?.id);
  const {
    languageCode,
    languageContent,
    contentVersion,
    status: contentStatus,
    retry,
  } = useLearningHubContent(
    activeChild?.selected_language_code || DEFAULT_LEARNING_LANGUAGE_CODE,
  );
  const languageName = getLearningLanguage(languageCode)?.name;
  const completedLessonIds = useLearningHubProgress(
    childId,
    languageCode,
    Boolean(languageContent),
    contentVersion,
  );

  useChildLandscapeOrientation("child learning stage path");

  const stage = useMemo(
    () => languageContent?.stages.find((candidate) => candidate.id === stageId),
    [languageContent, stageId],
  );
  const stageAccess = useMemo(
    () =>
      languageContent
        ? getLearningStageAccessState(
            languageContent.stages,
            completedLessonIds,
            stageId,
          )
        : undefined,
    [completedLessonIds, languageContent, stageId],
  );
  const lessons = stage?.lessons ?? [];
  const lessonAccessStates = useMemo(
    () =>
      stage
        ? getLearningLessonAccessStates(stage, completedLessonIds)
        : [],
    [completedLessonIds, stage],
  );
  const lessonAccessById = useMemo(
    () =>
      new Map(
        lessonAccessStates.map((accessState) => [
          accessState.lesson.id,
          accessState,
        ]),
      ),
    [lessonAccessStates],
  );

  const landscapeWidth = Math.max(width, height);
  const landscapeHeight = Math.min(width, height);
  const cardGap = 16;
  const lessonCardWidth = Math.min(250, Math.max(220, landscapeWidth * 0.3));
  const lessonCardHeight = Math.max(166, Math.min(198, landscapeHeight * 0.48));
  const lessonListEndPadding = Math.max(16, landscapeWidth - lessonCardWidth - 48);

  const goBackToLearning = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/child/learning" as any);
  };

  const startLesson = (lesson: LearningHubLesson) => {
    if (
      !stage ||
      lessonAccessById.get(lesson.id)?.effectiveStatus !== "startable"
    ) {
      return;
    }

    router.push({
      pathname: "/child/learning/[stageId]/lesson/[lessonId]",
      params: { stageId: stage.id, lessonId: lesson.id },
    } as any);
  };

  if (!languageContent) {
    const isLoading = contentStatus === "loading";

    if (isLoading) {
      return (
        <>
          <Stack.Screen options={{ headerShown: false, animation: "slide_from_right" }} />
          <ChildLoadingState
            title="Getting your lessons ready"
            message="Loading this learning path and your saved progress."
            icon="school-outline"
            onBack={goBackToLearning}
            backLabel="Back to Learning"
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
          actionLabel="Try again"
          onAction={retry}
          secondaryActionLabel="Back to Learning"
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
        <StageState
          icon="search-outline"
          title="Learning area not found"
          message="This Learning path is not available right now."
          onBack={goBackToLearning}
        />
      </>
    );
  }

  if (stageAccess?.isLocked) {
    const lockMessage = stageAccess.isExplicitlyLocked
      ? `${stage.title} is locked for now.`
      : stageAccess.isProgressLocked && stageAccess.lockedByStageTitle
        ? `Complete ${stageAccess.lockedByStageTitle} to unlock ${stage.title}.`
        : `${stage.title} is locked for now.`;

    return (
      <>
        <Stack.Screen options={{ headerShown: false, animation: "slide_from_right" }} />
        <StatusBar style="light" translucent backgroundColor="transparent" />
        <StageState
          icon="lock-closed-outline"
          title="Stage locked"
          message={lockMessage}
          onBack={goBackToLearning}
        />
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
          <View className="flex-1 px-6 pt-6 pb-5">
            <View className="flex-row items-center justify-between mb-4">
              <TouchableOpacity
                className="w-12 h-12 rounded-full bg-white items-center justify-center border-2 border-accent-500"
                onPress={goBackToLearning}
                accessibilityRole="button"
                accessibilityLabel="Back to Learning"
              >
                <Ionicons name="arrow-back" size={22} color={brandColors.victoriaBlue} />
              </TouchableOpacity>

              <View className="flex-1 px-4">
                <Text variant="bold" className="text-white text-3xl text-center" numberOfLines={1}>
                  {stage.title}
                </Text>
                <Text className="text-white/85 text-sm text-center" numberOfLines={2}>
                  {stage.description}
                </Text>
              </View>

              <View className="flex-row items-center">
                <TouchableOpacity
                  className="w-12 h-12 rounded-full bg-white items-center justify-center border-2 border-accent-500 mr-2"
                  onPress={stageTour.open}
                  accessibilityRole="button"
                  accessibilityLabel="Show lesson path guide"
                >
                  <Ionicons name="help-circle-outline" size={23} color={brandColors.victoriaBlue} />
                </TouchableOpacity>
                <TourTarget id="learning-stage-info">
                <View className="flex-row items-center bg-white rounded-full px-4 py-2 border-2 border-accent-500">
                  <Ionicons
                    name={stage.isPractice ? "sparkles" : "map"}
                    size={18}
                    color={brandColors.victoriaBlue}
                  />
                  <Text variant="bold" className="text-primary-700 text-sm ml-1" numberOfLines={1}>
                    {stage.isPractice ? "Practice" : `Stage ${stage.stageNumber}`}
                  </Text>
                </View>
                </TourTarget>
              </View>
            </View>

            <View className="bg-white/15 rounded-2xl px-4 py-3 mb-4">
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-4">
                  <Text variant="bold" className="text-white text-lg" numberOfLines={1}>
                    Choose a lesson
                  </Text>
                  <Text className="text-white/85 text-sm" numberOfLines={2}>
                    Swipe through the lesson path and continue from saved progress.
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <Ionicons
                    name={stage.isLocked ? "lock-closed" : "map-outline"}
                    size={22}
                    color="#ffffff"
                  />
                  <Text variant="bold" className="text-white text-sm ml-2" numberOfLines={1}>
                    {lessons.length} {lessons.length === 1 ? "step" : "steps"}
                  </Text>
                </View>
              </View>
            </View>

            <FlatList
              className="flex-1"
              data={lessons}
              horizontal
              keyExtractor={(lesson) => lesson.id}
              showsHorizontalScrollIndicator={false}
              snapToInterval={lessonCardWidth + cardGap}
              snapToAlignment="start"
              decelerationRate="fast"
              contentContainerStyle={{
                alignItems: "center",
                paddingTop: 4,
                paddingBottom: 6,
                paddingRight: lessonListEndPadding,
              }}
              renderItem={({ item: lesson, index }) => (
                  <LessonPathCard
                    stage={stage}
                    lesson={lesson}
                    lessonAccess={lessonAccessById.get(lesson.id)!}
                    itemCount={lesson.items.length}
                    width={lessonCardWidth}
                    height={lessonCardHeight}
                    gap={cardGap}
                    onPress={startLesson}
                    tourTargetId={index === 0 ? "learning-stage-lessons" : undefined}
                  />
              )}
            />
          </View>
        </SafeAreaView>
      </ImageBackground>
      <GameTour
        visible={stageTour.visible}
        onCancel={stageTour.close}
        onComplete={stageTour.complete}
        finishLabel="Choose a lesson"
        steps={[
          {
            id: "stage",
            targetId: "learning-stage-info",
            icon: "map-outline",
            placement: "bottom",
            title: "Your stage",
            description: stage.isPractice ? "This is your practice stage." : `You are on Stage ${stage.stageNumber}.`,
          },
          {
            id: "lessons",
            targetId: "learning-stage-lessons",
            icon: "albums-outline",
            placement: "top",
            title: "Pick a lesson",
            description: "Swipe, then tap an open lesson.",
          },
        ]}
      />
    </>
    </GameTourProvider>
  );
}
