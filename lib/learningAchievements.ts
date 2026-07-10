import {
  LEARNING_HUB_GAME_KEY,
  checkAndGrantNewAchievements,
  fetchAllDefinedAchievements,
  fetchChildEarnedAchievements,
} from "@/components/games/achievements/achievementManager";
import type { AchievementDefinition } from "@/components/games/achievements/achievementTypes";
import { getStartableLessonsForStage } from "@/content/learningHubRepository";
import type { LearningLessonCompletion } from "@/lib/learningProgressTypes";

interface LearningHubAchievementArgs {
  childId: string;
  languageCode: string;
  completion: LearningLessonCompletion;
  completedLessonIds: string[];
}

const uniqueStrings = (values: string[]): string[] => [
  ...new Set(values.filter((value) => value.trim().length > 0)),
];

const getStartableLessonIds = (
  languageCode: string,
  completion: LearningLessonCompletion,
): string[] => {
  const repositoryLessonIds = getStartableLessonsForStage(
    languageCode,
    completion.stageId,
  ).map((lesson) => lesson.id);

  return repositoryLessonIds.length > 0
    ? repositoryLessonIds
    : completion.progressPayload.stageLessonIds ?? [];
};

export const checkAndGrantLearningHubAchievements = async ({
  childId,
  languageCode,
  completion,
  completedLessonIds,
}: LearningHubAchievementArgs): Promise<AchievementDefinition[]> => {
  if (!childId) {
    return [];
  }

  try {
    const [definedAchievements, earnedAchievements] = await Promise.all([
      fetchAllDefinedAchievements(LEARNING_HUB_GAME_KEY),
      fetchChildEarnedAchievements(childId),
    ]);
    const stageStartableLessonIds = getStartableLessonIds(languageCode, completion);
    const lessonId = completion.progressPayload.lessonId || completion.levelId;

    return checkAndGrantNewAchievements({
      childId,
      definedAchievements,
      earnedAchievementIds: earnedAchievements.map(
        (achievement) => achievement.achievement_id,
      ),
      event: {
        type: "learning_hub_lesson_completed",
        gameKey: LEARNING_HUB_GAME_KEY,
        languageCode,
        stageId: completion.stageId,
        levelId: completion.levelId,
        lessonId,
        completedLessonCount: completedLessonIds.length,
        completedLessonIds: uniqueStrings(completedLessonIds),
        stageStartableLessonIds: uniqueStrings(stageStartableLessonIds),
        mechanicTypes: uniqueStrings(completion.progressPayload.mechanicTypes),
      },
    });
  } catch (error) {
    console.warn("Could not check Learning Hub achievements:", error);
    return [];
  }
};
