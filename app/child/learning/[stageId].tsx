import { Ionicons } from "@expo/vector-icons";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  ImageBackground,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "@/components/StyledText";
import { LearningLanguageUnavailableState } from "@/components/learning/LearningLanguageUnavailableState";
import { brandColors } from "@/constants/Brand";
import { useChild } from "@/context/ChildContext";
import {
  DEFAULT_LEARNING_LANGUAGE_CODE,
  getLearningLanguage,
} from "@/content/languages";
import {
  getLessonStatus,
  getMechanicLabel,
  type LearningHubLesson,
  type LearningHubStage,
} from "@/content/learningHubRepository";
import type { LessonStatus } from "@/content/learningHubTypes";
import { useChildLandscapeOrientation } from "@/hooks/useChildLandscapeOrientation";
import { useLearningHubContent } from "@/hooks/useLearningHubContent";
import {
  getCompletedLearningLessonIds,
  getLearningProgressChildId,
  hydrateLearningProgressFromRemote,
} from "@/lib/learningProgressRepository";

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
  itemCount: number;
  isCompleted: boolean;
  width: number;
  height: number;
  gap: number;
  onPress: (lesson: LearningHubLesson) => void;
};

const LessonPathCard = ({
  stage,
  lesson,
  itemCount,
  isCompleted,
  width,
  height,
  gap,
  onPress,
}: LessonPathCardProps) => {
  const lessonStatus = getLessonStatus(lesson, stage);
  const status = getLessonCardStatus(lessonStatus, isCompleted);
  const mechanicLabel = getMechanicLabel(lesson.mechanic);

  return (
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
      accessibilityLabel={`${lesson.title}. ${status.label}. ${mechanicLabel}. ${itemCount} items.`}
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
          {isCompleted && !status.disabled ? (
            <View className="flex-row items-center mt-2">
              <Ionicons name="checkmark-done" size={14} color={brandColors.success} />
              <Text variant="bold" className="text-success text-xs ml-1" numberOfLines={1}>
                Completed
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
  );
};

type MissingStageStateProps = {
  onBack: () => void;
};

const MissingStageState = ({ onBack }: MissingStageStateProps) => (
  <ImageBackground source={require("@/assets/images/gameBackground.jpg")} className="flex-1 bg-cover">
    <SafeAreaView className="flex-1" edges={[]} style={{ backgroundColor: "rgba(2, 116, 187, 0.88)" }}>
      <View className="flex-1 items-center justify-center px-8">
        <View className="bg-white rounded-2xl border-2 border-accent-500 p-6 w-full max-w-md items-center">
          <View className="w-16 h-16 rounded-full bg-primary-50 items-center justify-center mb-4">
            <Ionicons name="search-outline" size={32} color={brandColors.victoriaBlue} />
          </View>
          <Text variant="bold" className="text-primary-700 text-2xl text-center mb-2">
            Learning area not found
          </Text>
          <Text className="text-neutral-600 text-base text-center leading-6 mb-5">
            This Learning path is not available right now.
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
  const { width, height } = useWindowDimensions();
  const stageId = getRouteStageId(params.stageId);
  const childId = getLearningProgressChildId(activeChild?.id);
  const {
    languageCode,
    languageContent,
    status: contentStatus,
    retry,
  } = useLearningHubContent(
    activeChild?.selected_language_code || DEFAULT_LEARNING_LANGUAGE_CODE,
  );
  const languageName = getLearningLanguage(languageCode)?.name;
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([]);

  useChildLandscapeOrientation("child learning stage path");

  const stage = useMemo(
    () => languageContent?.stages.find((candidate) => candidate.id === stageId),
    [languageContent, stageId],
  );
  const lessons = stage?.lessons ?? [];
  const completedLessonIdSet = useMemo(
    () => new Set(completedLessonIds),
    [completedLessonIds],
  );

  useFocusEffect(
    useCallback(() => {
      if (!languageContent) {
        return;
      }

      let isActive = true;

      void (async () => {
        await hydrateLearningProgressFromRemote(childId, languageCode);
        return getCompletedLearningLessonIds(childId, languageCode);
      })()
        .then((lessonIds) => {
          if (isActive) {
            setCompletedLessonIds(lessonIds);
          }
        })
        .catch((error) => {
          console.warn("Could not load local Learning lesson progress:", error);
          if (isActive) {
            setCompletedLessonIds([]);
          }
        });

      return () => {
        isActive = false;
      };
    }, [childId, languageCode, languageContent]),
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
    if (!stage || getLessonStatus(lesson, stage) !== "startable") {
      return;
    }

    router.push({
      pathname: "/child/learning/[stageId]/lesson/[lessonId]",
      params: { stageId: stage.id, lessonId: lesson.id },
    } as any);
  };

  if (!languageContent) {
    const isLoading = contentStatus === "loading";

    return (
      <>
        <Stack.Screen options={{ headerShown: false, animation: "slide_from_right" }} />
        <StatusBar style="light" translucent backgroundColor="transparent" />
        <LearningLanguageUnavailableState
          languageName={languageName}
          title={isLoading ? "Getting lessons ready…" : undefined}
          message={isLoading ? "We are loading this Learning path now." : undefined}
          actionLabel={isLoading ? "Back to Learning" : "Try again"}
          onAction={isLoading ? goBackToLearning : retry}
          secondaryActionLabel={isLoading ? undefined : "Back to Learning"}
          onSecondaryAction={isLoading ? undefined : goBackToLearning}
        />
      </>
    );
  }

  if (!stage) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false, animation: "slide_from_right" }} />
        <StatusBar style="light" translucent backgroundColor="transparent" />
        <MissingStageState onBack={goBackToLearning} />
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false, animation: "slide_from_right" }} />
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <ImageBackground source={require("@/assets/images/gameBackground.jpg")} className="flex-1 bg-cover">
        <SafeAreaView className="flex-1" edges={[]} style={{ backgroundColor: "rgba(2, 116, 187, 0.88)" }}>
          <View className="flex-1 px-6 pt-4 pb-4">
            <View className="flex-row items-center justify-between mb-3">
              <TouchableOpacity
                className="w-11 h-11 rounded-full bg-white items-center justify-center border-2 border-accent-500"
                onPress={goBackToLearning}
                accessibilityRole="button"
                accessibilityLabel="Back to Learning"
              >
                <Ionicons name="arrow-back" size={22} color={brandColors.victoriaBlue} />
              </TouchableOpacity>

              <View className="flex-1 px-4">
                <Text variant="bold" className="text-white text-2xl text-center" numberOfLines={1}>
                  {stage.title}
                </Text>
                <Text className="text-white/85 text-sm text-center" numberOfLines={2}>
                  {stage.description}
                </Text>
              </View>

              <View className="bg-white rounded-full px-4 py-2 border-2 border-accent-500">
                <Text variant="bold" className="text-primary-700 text-sm" numberOfLines={1}>
                  {stage.isPractice ? "Practice" : `Stage ${stage.stageNumber}`}
                </Text>
              </View>
            </View>

            <View className="bg-white/15 rounded-2xl px-4 py-2.5 mb-3">
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-4">
                  <Text variant="bold" className="text-white text-lg" numberOfLines={1}>
                    Lesson path
                  </Text>
                  <Text className="text-white/85 text-sm" numberOfLines={2}>
                    {stage.placeholderMessage}
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
              renderItem={({ item: lesson }) => (
                  <LessonPathCard
                    stage={stage}
                    lesson={lesson}
                    itemCount={lesson.items.length}
                    isCompleted={completedLessonIdSet.has(lesson.id)}
                    width={lessonCardWidth}
                    height={lessonCardHeight}
                    gap={cardGap}
                    onPress={startLesson}
                  />
              )}
            />
          </View>
        </SafeAreaView>
      </ImageBackground>
    </>
  );
}
