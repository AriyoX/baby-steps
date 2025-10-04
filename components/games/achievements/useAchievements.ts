import { useState, useEffect, useCallback } from 'react';
import { useChild } from '@/context/ChildContext'; // Adjust path
import {
  fetchAllDefinedAchievements as fetchAllDefinedAchievementsLogic, // Renamed for clarity
  fetchChildEarnedAchievements,
  checkAndGrantNewAchievements as checkAndGrantNewAchievementsLogic,
  awardAchievementToChild,
} from './achievementManager';
import { AchievementDefinition, ChildAchievement } from './achievementTypes';
// Remove game-specific progress types from here unless absolutely needed by the hook itself
// The game component will prepare the event data.

// Add gameKey to the hook's parameters
export const useAchievements = (specificChildId?: string, gameKey?: string) => {
  const { activeChild } = useChild();
  const childIdToFetchFor = specificChildId || activeChild?.id;

  const [definedAchievements, setDefinedAchievements] = useState<AchievementDefinition[]>([]);
  const [earnedChildAchievements, setEarnedChildAchievements] = useState<ChildAchievement[]>([]);
  const [isLoadingAchievements, setIsLoadingAchievements] = useState(true);

  const loadInitialAchievements = useCallback(async () => {
    if (!childIdToFetchFor) {
      setIsLoadingAchievements(false);
      setDefinedAchievements([]);
      setEarnedChildAchievements([]);
      return;
    }
    setIsLoadingAchievements(true);
    try {
      // Fetch all defined achievements OR only for the specific gameKey if provided
      // For profile screens, you might want all achievements. For in-game, maybe just game-specific.
      // Let's assume for now it fetches all, and manager filters. Or fetchAll can take gameKey.
      const allDefs = await fetchAllDefinedAchievementsLogic(); // Fetches ALL by default now
      const childEarned = await fetchChildEarnedAchievements(childIdToFetchFor);
      
      setDefinedAchievements(allDefs);
      setEarnedChildAchievements(childEarned);
    } catch (error) {
      console.error("Failed to load achievements data:", error);
      setDefinedAchievements([]);
      setEarnedChildAchievements([]);
    } finally {
      setIsLoadingAchievements(false);
    }
  }, [childIdToFetchFor]); // Removed gameKey dependency for initial load, as manager will filter later

  useEffect(() => {
    loadInitialAchievements();
  }, [loadInitialAchievements]);

  // The event structure passed to this function will be crucial
  const checkAndGrantNewAchievements = useCallback(
    async (eventPayload: Omit<Parameters<typeof checkAndGrantNewAchievementsLogic>[0], 'childId' | 'definedAchievements' | 'earnedAchievementIds'>['event']
    ): Promise<AchievementDefinition[]> => {
      const currentChildId = specificChildId || activeChild?.id;
      if (!currentChildId || isLoadingAchievements || !definedAchievements.length) {
        return [];
      }

      const earnedIds = earnedChildAchievements.map(ach => ach.achievement_id);
      
      const newlyEarned = await checkAndGrantNewAchievementsLogic({
        childId: currentChildId,
        definedAchievements, // Pass all loaded definitions
        earnedAchievementIds: earnedIds,
        event: eventPayload, // The game component constructs this event object
      });

      if (newlyEarned.length > 0) {
        if (childIdToFetchFor) {
            const updatedEarned = await fetchChildEarnedAchievements(childIdToFetchFor);
            setEarnedChildAchievements(updatedEarned);
        }
      }
      return newlyEarned;
    },
    [activeChild, specificChildId, definedAchievements, earnedChildAchievements, isLoadingAchievements, childIdToFetchFor]
  );

  return {
    definedAchievements, // This will contain ALL achievements if gameKey not used in fetch
    earnedChildAchievements,
    isLoadingAchievements,
    checkAndGrantNewAchievements,
    refreshAchievements: loadInitialAchievements,
  };
};