import React, { useState, useEffect } from 'react';
import { useChild } from '@/context/ChildContext';
import { DEFAULT_LEARNING_LANGUAGE_CODE } from '@/content/languages';
import {
  markStageCompleted,
  syncProgressNow,
  updateActivityProgress,
} from '@/lib/progressRepository';
import { saveActivity } from '@/lib/utils';
import { recordQualifiedStreakActivity } from '@/lib/streakRepository';

interface StoryProgressProps {
  storyId: string;
  storyTitle: string;
  totalPages: number;
  currentPage: number;
  onQuizComplete?: (score: number, total: number) => void;
  children: React.ReactNode;
}

interface StoryProgressChild {
  id: string;
  selected_language_code?: string;
}

interface SaveStoryQuizProgressInput {
  activeChild: StoryProgressChild;
  storyId: string;
  storyTitle: string;
  score: number;
  total: number;
  durationSeconds?: number;
}

export const saveStoryQuizProgress = async ({
  activeChild,
  storyId,
  storyTitle,
  score,
  total,
  durationSeconds,
}: SaveStoryQuizProgressInput): Promise<void> => {
  const duration = durationSeconds ?? 0;
  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
  const languageCode = activeChild.selected_language_code || DEFAULT_LEARNING_LANGUAGE_CODE;
  const completedAt = new Date().toISOString();

  await updateActivityProgress(activeChild.id, languageCode, 'stories', {
    status: 'completed',
    score: percentage,
    last_stage_id: storyId,
    completed_stage_count: 1,
    progress_payload: {
      storyId,
      storyTitle,
      quizScore: score,
      quizTotal: total,
      quizPercentage: percentage,
      quizCompletedAt: completedAt,
      durationSeconds: duration,
    },
  });
  await markStageCompleted(activeChild.id, languageCode, 'stories', storyId, {
    score: percentage,
    progress_payload: {
      storyTitle,
      quizScore: score,
      quizTotal: total,
      quizPercentage: percentage,
    },
  });
  void Promise.allSettled([
    saveActivity({
      child_id: activeChild.id,
      activity_type: 'stories',
      activity_name: `Completed Quiz for "${storyTitle}"`,
      score: `${score}/${total}`,
      duration,
      completed_at: completedAt,
      details: `Scored ${score}/${total} (${percentage}%) on the quiz for "${storyTitle}"`,
      language_code: languageCode,
    }),
    syncProgressNow(activeChild.id),
  ]);
};

export const StoryProgress: React.FC<StoryProgressProps> = ({
  storyId,
  storyTitle,
  totalPages,
  currentPage,
  onQuizComplete,
  children
}) => {
  const { activeChild } = useChild();
  const [startTime] = useState(Date.now());
  const [hasTrackedCompletion, setHasTrackedCompletion] = useState(false);

  useEffect(() => {
    const trackProgress = async () => {
      if (!activeChild || hasTrackedCompletion) return;

      if (currentPage === totalPages - 1) {
        const duration = Math.round((Date.now() - startTime) / 1000);
        const languageCode = activeChild.selected_language_code || DEFAULT_LEARNING_LANGUAGE_CODE;
        
        const completedAt = new Date().toISOString();
        let localCompletionPersisted = false;
        try {
          await updateActivityProgress(activeChild.id, languageCode, 'stories', {
            status: 'completed',
            last_stage_id: storyId,
            completed_stage_count: 1,
            progress_payload: {
              storyId,
              storyTitle,
              totalPages,
              completedAt,
              durationSeconds: duration,
            },
          });
          await markStageCompleted(activeChild.id, languageCode, 'stories', storyId, {
            progress_payload: {
              storyTitle,
              totalPages,
              durationSeconds: duration,
            },
          });
          localCompletionPersisted = true;
        } catch (error) {
          console.warn('Could not persist the story completion locally:', error);
        }

        if (localCompletionPersisted) {
          try {
            await recordQualifiedStreakActivity({
              childId: activeChild.id,
              sourceType: 'story',
              sourceId: storyId,
              completionId: `story:${storyId}:${startTime}`,
              completedAt,
            });
          } catch (error) {
            console.warn('Could not record the story streak day:', error);
          }
        }

        setHasTrackedCompletion(true);
        void Promise.allSettled([
          saveActivity({
            child_id: activeChild.id,
            activity_type: 'stories',
            activity_name: `Read "${storyTitle}"`,
            duration,
            completed_at: completedAt,
            details: `Completed reading the story "${storyTitle}"`,
            language_code: languageCode,
          }),
          syncProgressNow(activeChild.id),
        ]);
      }
    };

    trackProgress();
  }, [currentPage, totalPages, activeChild, storyId, storyTitle, startTime, hasTrackedCompletion]);

  const handleQuizComplete = async (score: number, total: number) => {
    if (!activeChild || !onQuizComplete) return;

    const duration = Math.round((Date.now() - startTime) / 1000);
    await saveStoryQuizProgress({
      activeChild,
      storyId,
      storyTitle,
      score,
      total,
      durationSeconds: duration,
    });

    onQuizComplete(score, total);
  };

  return (
    <>{children}</>
  );
};

export default StoryProgress;
