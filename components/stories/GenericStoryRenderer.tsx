import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Image, ScrollView, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "@/components/StyledText";
import { ComingSoonState } from "@/components/child/ComingSoonState";
import { useChild } from "@/context/ChildContext";
import { resolveImageSource } from "@/content/contentRepository";
import { saveActivity } from "@/lib/utils";
import type { LocalStory } from "@/content/types";

interface GenericStoryRendererProps {
  story?: LocalStory;
  isLoading?: boolean;
}

export function GenericStoryRenderer({ story, isLoading = false }: GenericStoryRendererProps) {
  const router = useRouter();
  const { activeChild } = useChild();
  const [pageIndex, setPageIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [hasSavedCompletion, setHasSavedCompletion] = useState(false);
  const [startedAt] = useState(Date.now());

  const page = story?.pages[pageIndex];
  const isLastPage = story ? pageIndex === story.pages.length - 1 : false;

  const quizScore = useMemo(() => {
    if (!story?.questions?.length) return undefined;
    return story.questions.reduce((score, question) => {
      return selectedAnswers[question.id] === question.correctAnswer ? score + 1 : score;
    }, 0);
  }, [selectedAnswers, story]);

  const saveCompletion = async () => {
    if (!activeChild || !story || hasSavedCompletion) return;

    const duration = Math.round((Date.now() - startedAt) / 1000);
    const totalQuestions = story.questions?.length ?? 0;

    await saveActivity({
      child_id: activeChild.id,
      activity_type: "stories",
      activity_name: `Read "${story.title}"`,
      score: totalQuestions > 0 && quizScore !== undefined ? `${quizScore}/${totalQuestions}` : undefined,
      duration,
      completed_at: new Date().toISOString(),
      details: `Completed story "${story.title}"`,
      language_code: activeChild.selected_language_code,
    });

    setHasSavedCompletion(true);
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

  if (!story || !page) {
    return <ComingSoonState title="Story coming soon" />;
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="flex-row items-center justify-between px-5 py-4 bg-white border-b border-slate-200">
        <TouchableOpacity
          className="w-11 h-11 rounded-full bg-slate-50 items-center justify-center border border-slate-200"
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={22} color="#6366f1" />
        </TouchableOpacity>
        <Text variant="bold" className="text-lg text-slate-800 text-center flex-1 mx-3" numberOfLines={1}>
          {story.title}
        </Text>
        <Text className="text-sm text-slate-500">
          {pageIndex + 1}/{story.pages.length}
        </Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
        <View className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <Image
            source={resolveImageSource(page.image, "learning-beginner.jpg") as any}
            className="w-full h-56"
            resizeMode="cover"
          />
          <View className="p-5">
            <Text className="text-lg text-slate-800 leading-7">{page.text}</Text>
            {page.translation ? (
              <Text className="text-base text-slate-500 leading-6 mt-4">{page.translation}</Text>
            ) : null}
          </View>
        </View>

        {isLastPage && story.questions?.length ? (
          <View className="mt-5 bg-white rounded-2xl border border-slate-200 p-5">
            <Text variant="bold" className="text-lg text-slate-800 mb-3">
              Quiz
            </Text>
            {story.questions.map((question) => (
              <View key={question.id} className="mb-5">
                <Text className="text-base text-slate-700 mb-3">{question.question}</Text>
                {question.options.map((option, optionIndex) => {
                  const isSelected = selectedAnswers[question.id] === optionIndex;
                  const isCorrect = optionIndex === question.correctAnswer;
                  const hasAnswered = selectedAnswers[question.id] !== undefined;

                  return (
                    <TouchableOpacity
                      key={option}
                      className={`mb-2 rounded-xl border px-4 py-3 ${
                        isSelected
                          ? isCorrect
                            ? "bg-emerald-50 border-emerald-400"
                            : "bg-red-50 border-red-400"
                          : hasAnswered && isCorrect
                            ? "bg-emerald-50 border-emerald-300"
                            : "bg-slate-50 border-slate-200"
                      }`}
                      onPress={() =>
                        setSelectedAnswers((current) => ({
                          ...current,
                          [question.id]: optionIndex,
                        }))
                      }
                    >
                      <Text className="text-slate-700">{option}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
            {quizScore !== undefined ? (
              <Text variant="bold" className="text-slate-700">
                Score: {quizScore}/{story.questions.length}
              </Text>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      <View className="flex-row items-center justify-between p-4 bg-white border-t border-slate-200">
        <TouchableOpacity
          className={`px-5 py-3 rounded-xl ${pageIndex === 0 ? "bg-slate-200" : "bg-indigo-500"}`}
          onPress={() => setPageIndex((current) => Math.max(0, current - 1))}
          disabled={pageIndex === 0}
        >
          <Text variant="bold" className={pageIndex === 0 ? "text-slate-400" : "text-white"}>
            Previous
          </Text>
        </TouchableOpacity>

        {isLastPage ? (
          <TouchableOpacity
            className="px-5 py-3 rounded-xl bg-emerald-500"
            onPress={async () => {
              await saveCompletion();
              router.back();
            }}
          >
            <Text variant="bold" className="text-white">
              Finish
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            className="px-5 py-3 rounded-xl bg-indigo-500"
            onPress={() => setPageIndex((current) => Math.min(story.pages.length - 1, current + 1))}
          >
            <Text variant="bold" className="text-white">
              Next
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}
