import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import { useChild } from '@/context/ChildContext';
import { saveActivity } from '@/lib/utils';

interface StoryProgressProps {
  storyId: string;
  storyTitle: string;
  totalPages: number;
  currentPage: number;
  onQuizComplete?: (score: number, total: number) => void;
  children: React.ReactNode;
}

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
        
        await saveActivity({
          child_id: activeChild.id,
          activity_type: 'stories',
          activity_name: `Read "${storyTitle}"`,
          duration,
          completed_at: new Date().toISOString(),
          details: `Completed reading the story "${storyTitle}"`,
          language_code: activeChild.selected_language_code,
        });
        
        setHasTrackedCompletion(true);
      }
    };

    trackProgress();
  }, [currentPage, totalPages, activeChild, storyId, storyTitle, startTime, hasTrackedCompletion]);

  const handleQuizComplete = async (score: number, total: number) => {
    if (!activeChild || !onQuizComplete) return;

    const duration = Math.round((Date.now() - startTime) / 1000);
    const percentage = Math.round((score / total) * 100);

    await saveActivity({
      child_id: activeChild.id,
      activity_type: 'stories',
      activity_name: `Completed Quiz for "${storyTitle}"`,
      score: score.toString(),
      duration,
      completed_at: new Date().toISOString(),
      details: `Scored ${score}/${total} (${percentage}%) on the quiz for "${storyTitle}"`,
      language_code: activeChild.selected_language_code,
    });

    onQuizComplete(score, total);
  };

  return (
    <View style={{ flex: 1 }} testID="story-page" accessibilityLabel={`${storyTitle} story page`}>
      {children}
    </View>
  );
};

export default StoryProgress;
