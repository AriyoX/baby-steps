import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ImageBackground,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "@/components/StyledText";
import { getMechanicRenderer } from "@/components/learning/mechanics/mechanicRegistry";
import { brandColors } from "@/constants/Brand";
import { useChild } from "@/context/ChildContext";
import { DEFAULT_LEARNING_LANGUAGE_CODE } from "@/content/languages";
import {
  getLearningStageById,
  getLessonById,
  getLessonItemsForLesson,
  getLessonStatus,
  getMechanicLabel,
} from "@/content/learningHubRepository";
import type { ItemResult } from "@/content/learningHubTypes";
import { useChildLandscapeOrientation } from "@/hooks/useChildLandscapeOrientation";

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
}: LessonStateProps) => (
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
            onPress={onButtonPress}
            accessibilityRole="button"
            accessibilityLabel={buttonLabel}
          >
            <Text variant="bold" className="text-white text-base">
              {buttonLabel}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  </ImageBackground>
);

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
  const { activeChild } = useChild();
  const stageId = getRouteParam(params.stageId);
  const lessonId = getRouteParam(params.lessonId);
  // TODO: Keep this tied to the child/profile language setting as more Learning bundles are added.
  const languageCode = activeChild?.selected_language_code || DEFAULT_LEARNING_LANGUAGE_CODE;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [results, setResults] = useState<ItemResult[]>([]);

  useChildLandscapeOrientation("child learning lesson");

  const stage = useMemo(
    () => getLearningStageById(languageCode, stageId),
    [languageCode, stageId],
  );
  const lesson = useMemo(
    () => getLessonById(languageCode, stageId, lessonId),
    [languageCode, lessonId, stageId],
  );
  const items = useMemo(
    () => getLessonItemsForLesson(languageCode, stageId, lessonId),
    [languageCode, lessonId, stageId],
  );
  const lessonStatus = useMemo(
    () => getLessonStatus(lesson, stage),
    [lesson, stage],
  );
  const currentItem = items[currentIndex];
  const isLastItem = currentIndex === items.length - 1;
  const CurrentMechanicRenderer = currentItem
    ? getMechanicRenderer(currentItem.mechanic)
    : null;

  useEffect(() => {
    setCurrentIndex(0);
    setIsComplete(false);
    setResults([]);
  }, [lesson?.id, stageId]);

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

  const handleItemComplete = useCallback(
    (result: ItemResult) => {
      // TODO: Persist lesson progress once the Learning hub gets a local-first progress pass.
      setResults((currentResults) => [
        ...currentResults.filter((itemResult) => itemResult.itemId !== result.itemId),
        result,
      ]);

      if (currentIndex >= items.length - 1) {
        setIsComplete(true);
        return;
      }

      setCurrentIndex((index) => Math.min(index + 1, items.length - 1));
    },
    [currentIndex, items.length],
  );

  if (!stage) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false, animation: "slide_from_right" }} />
        <StatusBar style="light" translucent backgroundColor="transparent" />
        <LessonState
          icon="search-outline"
          title="Lesson not found"
          message="This Learning stage is not available right now."
          buttonLabel="Back to Learning"
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
          title="Lesson not found"
          message={`${stage.title} does not have that lesson yet.`}
          buttonLabel="Back to Lessons"
          onButtonPress={goBackToStagePath}
        />
      </>
    );
  }

  if (lessonStatus !== "startable") {
    const title =
      lessonStatus === "locked"
        ? "Locked for now"
        : lessonStatus === "empty"
          ? "Cards coming soon"
          : lessonStatus === "unsupported"
            ? "Not ready yet"
            : "Coming soon";
    const message =
      lessonStatus === "locked"
        ? `${stage.title} will unlock later.`
        : lessonStatus === "empty"
          ? `${lesson.title} needs learning items before it can start.`
          : lessonStatus === "unsupported"
            ? `${getMechanicLabel(lesson.mechanic)} is not supported in the lesson player yet.`
            : `${getMechanicLabel(lesson.mechanic)} is being prepared for ${stage.title}.`;

    return (
      <>
        <Stack.Screen options={{ headerShown: false, animation: "slide_from_right" }} />
        <StatusBar style="light" translucent backgroundColor="transparent" />
        <LessonState
          icon={lessonStatus === "locked" ? "lock-closed-outline" : "construct-outline"}
          title={title}
          message={message}
          buttonLabel="Back to Lessons"
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
          title="Cards coming soon"
          message={`${lesson.title} needs learning items before it can start.`}
          buttonLabel="Back to Lessons"
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
            <View className="flex-1 items-center justify-center px-8">
              <View className="bg-white rounded-2xl border-2 border-accent-500 p-6 w-full max-w-md items-center">
                <View className="w-20 h-20 rounded-full bg-green-100 items-center justify-center mb-4">
                  <Ionicons name="checkmark-circle" size={44} color={brandColors.success} />
                </View>
                <Text variant="bold" className="text-primary-700 text-3xl text-center mb-2">
                  Great learning!
                </Text>
                <Text className="text-neutral-600 text-base text-center leading-6 mb-5">
                  You finished {lesson.title} in {stage.title}. {results.length} items complete.
                </Text>
                <TouchableOpacity
                  className="bg-primary-600 rounded-full px-6 py-3"
                  onPress={goBackToStagePath}
                  accessibilityRole="button"
                  accessibilityLabel="Continue"
                >
                  <Text variant="bold" className="text-white text-base">
                    Continue
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
    <>
      <Stack.Screen options={{ headerShown: false, animation: "slide_from_right" }} />
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <ImageBackground source={require("@/assets/images/gameBackground.jpg")} className="flex-1 bg-cover">
        <SafeAreaView className="flex-1" edges={[]} style={{ backgroundColor: "rgba(2, 116, 187, 0.88)" }}>
          <View className="flex-1 px-6 pt-4 pb-4">
            <View className="flex-row items-center justify-between mb-2">
              <TouchableOpacity
                className="w-12 h-12 rounded-full bg-white items-center justify-center border-2 border-accent-500"
                onPress={goBackToStagePath}
                accessibilityRole="button"
                accessibilityLabel="Back to Lessons"
              >
                <Ionicons name="arrow-back" size={22} color={brandColors.victoriaBlue} />
              </TouchableOpacity>

              <View className="flex-1 px-4">
                <Text variant="bold" className="text-white text-2xl text-center" numberOfLines={1}>
                  {lesson.title}
                </Text>
                <Text className="text-white/80 text-sm text-center" numberOfLines={1}>
                  {stage.title}
                </Text>
                <ProgressDots currentIndex={currentIndex} total={items.length} />
              </View>

              <View className="bg-white rounded-full px-4 py-2 border-2 border-accent-500">
                <Text variant="bold" className="text-primary-700 text-sm">
                  {currentIndex + 1} of {items.length}
                </Text>
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
    </>
  );
}
