import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, TouchableOpacity, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "@/components/StyledText";
import { ComingSoonState } from "@/components/child/ComingSoonState";
import { CachedImage } from "@/components/common/CachedImage";
import { useChild } from "@/context/ChildContext";
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
import { saveActivity } from "@/lib/utils";
import type { LocalStory } from "@/content/types";

interface GenericStoryRendererProps {
  story?: LocalStory;
  isLoading?: boolean;
}

export function GenericStoryRenderer({ story, isLoading = false }: GenericStoryRendererProps) {
  const router = useRouter();
  const { activeChild } = useChild();
  const { width } = useWindowDimensions();
  const [pageIndex, setPageIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [hasSavedCompletion, setHasSavedCompletion] = useState(false);
  const [hasCompletedStory, setHasCompletedStory] = useState(false);
  const startedAtRef = useRef(Date.now());
  const isSavingCompletionRef = useRef(false);

  const page = story?.pages[pageIndex];
  const isLastPage = story ? pageIndex === story.pages.length - 1 : false;
  const totalQuestions = story?.questions?.length ?? 0;
  const answeredQuestionCount = story?.questions?.filter(
    (question) => selectedAnswers[question.id] !== undefined,
  ).length ?? 0;
  const hasQuiz = totalQuestions > 0;
  const hasAnsweredAllQuestions = !hasQuiz || answeredQuestionCount === totalQuestions;
  const languageCode = activeChild?.selected_language_code || DEFAULT_LEARNING_LANGUAGE_CODE;
  const progressScopeKey =
    activeChild && story ? `${activeChild.id}:${languageCode}:stories:${story.id}` : null;
  const [restoredProgressKey, setRestoredProgressKey] = useState<string | null>(null);
  const useSplitLayout = width >= 700;

  useEffect(() => {
    if (story) {
      void preloadStoryImages(story);
    }
  }, [story]);

  useEffect(() => {
    setPageIndex(0);
    setSelectedAnswers({});
    setHasSavedCompletion(false);
    setHasCompletedStory(false);
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

    restoreStoryProgress();

    return () => {
      isMounted = false;
    };
  }, [activeChild, languageCode, progressScopeKey, story]);

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
        lastReadAt: new Date().toISOString(),
      },
    });
  }, [
    activeChild,
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

  const saveCompletion = async () => {
    if (
      !activeChild ||
      !story ||
      hasSavedCompletion ||
      hasCompletedStory ||
      !hasAnsweredAllQuestions ||
      isSavingCompletionRef.current
    ) {
      return;
    }

    isSavingCompletionRef.current = true;
    const duration = Math.round((Date.now() - startedAtRef.current) / 1000);
    const completedAt = new Date().toISOString();
    const percentage =
      totalQuestions > 0 && quizScore !== undefined
        ? Math.round((quizScore / totalQuestions) * 100)
        : undefined;

    try {
      await saveActivity({
        child_id: activeChild.id,
        activity_type: "stories",
        activity_name: `Read "${story.title}"`,
        score: totalQuestions > 0 && quizScore !== undefined ? `${quizScore}/${totalQuestions}` : undefined,
        duration,
        completed_at: completedAt,
        details: `Completed story "${story.title}"`,
        language_code: languageCode,
      });

      await updateActivityProgress(activeChild.id, languageCode, "stories", {
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
        },
      });
      await markStageCompleted(activeChild.id, languageCode, "stories", story.id, {
        score: percentage,
        progress_payload: {
          storyTitle: story.title,
          totalPages: story.pages.length,
          quizScore,
          quizTotal: totalQuestions,
          quizCompletedAt: hasQuiz ? completedAt : undefined,
        },
      });
      void syncProgressNow(activeChild.id);

      setHasCompletedStory(true);
      setHasSavedCompletion(true);
    } finally {
      isSavingCompletionRef.current = false;
    }
  };

  if (isLoading) {
    return (
      <ComingSoonState
        title="Loading story"
        message="Preparing this story for your learning language."
        showBackButton={false}
      />
    );
  }

  if (!story) {
    return (
      <ComingSoonState
        title="Story not ready"
        message="We could not find this story for your learning language yet."
      />
    );
  }

  if (!page) {
    return (
      <ComingSoonState
        title="Story not ready"
        message="This story is missing pages, so it cannot be opened yet."
      />
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-amber-50">
      <View className="flex-1 px-5 pt-4 pb-5">
        <TouchableOpacity
          className="absolute top-6 left-4 z-10 w-11 h-11 rounded-full bg-amber-100 items-center justify-center shadow-sm border border-amber-200"
          onPress={() => router.back()}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={24} color="#8B4513" />
        </TouchableOpacity>

        <View
          className="flex-1"
          style={{
            flexDirection: useSplitLayout ? "row" : "column",
            paddingTop: useSplitLayout ? 28 : 48,
          }}
        >
          <View
            className="bg-white rounded-3xl p-4 shadow-md border border-amber-200"
            style={{
              flex: useSplitLayout ? 1 : undefined,
              height: useSplitLayout ? undefined : 280,
              marginRight: useSplitLayout ? 12 : 0,
              marginBottom: useSplitLayout ? 0 : 12,
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
            className={useSplitLayout ? "flex-1 pl-3" : "flex-1"}
            style={{ minHeight: 0 }}
          >
            <View className="items-end mb-3">
              <View className="bg-amber-700 px-4 py-2 rounded-full shadow-sm flex-row items-center">
                <Text variant="bold" className="text-white" numberOfLines={1}>
                  {pageIndex + 1}/{story.pages.length}
                </Text>
              </View>
            </View>

            <View className="flex-1 bg-white rounded-3xl mb-3 shadow-md border border-amber-200 overflow-hidden">
              <ScrollView
                className="flex-1"
                contentContainerStyle={{ padding: 20, paddingBottom: 28 }}
                showsVerticalScrollIndicator
              >
                <Text variant="bold" className="text-xl text-amber-800 mb-4 text-center">
                  {story.title}
                </Text>
                <Text className="text-slate-800 leading-7" style={{ fontSize: 18 }}>
                  {page.text}
                </Text>
                {page.translation ? (
                  <Text className="text-base text-slate-500 leading-6 mt-4">
                    {page.translation}
                  </Text>
                ) : null}

                {isLastPage && story.questions?.length ? (
                  <View className="mt-6">
                    <Text variant="bold" className="text-xl text-amber-800 mb-4 text-center">
                      {story.title} - Quiz
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
                          Score: {quizScore}/{story.questions.length}
                        </Text>
                      </View>
                    ) : null}
                    {!hasAnsweredAllQuestions ? (
                      <Text className="text-amber-700 text-center mt-3 italic">
                        Answer all questions to finish the story.
                      </Text>
                    ) : null}
                  </View>
                ) : null}
              </ScrollView>
            </View>

            <View className="flex-row justify-between items-center mb-3">
              <TouchableOpacity
                className={`w-12 h-12 rounded-full justify-center items-center shadow ${
                  pageIndex === 0 ? "bg-gray-300" : "bg-amber-700"
                }`}
                onPress={() => setPageIndex((current) => Math.max(0, current - 1))}
                disabled={pageIndex === 0}
                accessibilityLabel="Previous page"
                accessibilityRole="button"
                accessibilityState={{ disabled: pageIndex === 0 }}
              >
                <Ionicons name="chevron-back" size={24} color="#fff" />
              </TouchableOpacity>

              {isLastPage ? (
                <TouchableOpacity
                  className={`py-3 px-6 rounded-full shadow-md ${
                    hasAnsweredAllQuestions ? "bg-indigo-700" : "bg-gray-300"
                  }`}
                  onPress={async () => {
                    await saveCompletion();
                    router.back();
                  }}
                  disabled={!hasAnsweredAllQuestions}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !hasAnsweredAllQuestions }}
                >
                  <Text
                    variant="bold"
                    className={`text-lg ${
                      hasAnsweredAllQuestions ? "text-white" : "text-slate-500"
                    }`}
                  >
                    Finish
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  className="py-3 px-6 rounded-full bg-emerald-700 shadow-md"
                  onPress={() =>
                    setPageIndex((current) => Math.min(story.pages.length - 1, current + 1))
                  }
                  accessibilityRole="button"
                >
                  <Text variant="bold" className="text-white text-lg">
                    Next
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                className={`w-12 h-12 rounded-full justify-center items-center shadow ${
                  isLastPage ? "bg-gray-300" : "bg-amber-700"
                }`}
                onPress={() =>
                  setPageIndex((current) => Math.min(story.pages.length - 1, current + 1))
                }
                disabled={isLastPage}
                accessibilityLabel="Next page"
                accessibilityRole="button"
                accessibilityState={{ disabled: isLastPage }}
              >
                <Ionicons name="chevron-forward" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

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
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
