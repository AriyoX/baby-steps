import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ensureActivityProgressSnapshot,
  getActivityProgress,
  hydrateProgressFromRemote,
  markStageCompleted,
  markStageStarted,
  updateActivityProgress,
} from '@/lib/progressRepository';

const COUNTING_ACTIVITY_TYPE = 'counting';

// Types for progress tracking
export interface CountingGameProgress {
  unlockedStages: number[];
  currentStage: number;
  totalScore: number;
  lastPlayedLevel: Record<number, number>; // Stage ID to level number mapping
  completedStages: number[];
  playHistory: {
    date: string;
    score: number;
  }[];
  childId: string; // Add child ID to the progress object itself for validation
}

// Function to create default progress for a specific child
export const createDefaultProgress = (
  childId: string,
  firstStageId = 1
): CountingGameProgress => ({
  unlockedStages: [firstStageId],
  currentStage: firstStageId,
  totalScore: 0,
  lastPlayedLevel: { [firstStageId]: 1 },
  completedStages: [],
  playHistory: [],
  childId // Store the child ID in the progress object
});

// Default progress - only first stage unlocked
export const DEFAULT_PROGRESS: CountingGameProgress = createDefaultProgress('default');

/**
 * Get the storage key for a specific child
 */
const getStorageKey = (childId: string, languageCode: string): string => {
  return `@BabySteps:CountingGame:${childId}:${languageCode}`;
};

const getLegacyStorageKey = (childId: string): string => {
  return `@BabySteps:CountingGame:${childId}`;
};

const getAvailableStageIds = (availableStageIds?: number[]): number[] =>
  availableStageIds && availableStageIds.length > 0 ? availableStageIds : [1];

const normalizeProgressForStages = (
  progress: CountingGameProgress,
  childId: string,
  availableStageIds?: number[]
): CountingGameProgress => {
  const stageIds = getAvailableStageIds(availableStageIds);
  const stageIdSet = new Set(stageIds);
  const firstStageId = stageIds[0] ?? 1;
  const sourceUnlockedStages = Array.isArray(progress.unlockedStages)
    ? progress.unlockedStages
    : [];
  const sourceCompletedStages = Array.isArray(progress.completedStages)
    ? progress.completedStages
    : [];
  const unlockedStages = sourceUnlockedStages.filter((stageId) =>
    stageIdSet.has(stageId)
  );
  const completedStages = sourceCompletedStages.filter((stageId) =>
    stageIdSet.has(stageId)
  );
  const lastPlayedLevel = Object.entries(progress.lastPlayedLevel ?? {}).reduce(
    (result, [stageId, level]) => {
      const numericStageId = Number(stageId);
      if (stageIdSet.has(numericStageId)) {
        result[numericStageId] = level;
      }
      return result;
    },
    {} as Record<number, number>
  );
  const currentStage = stageIdSet.has(progress.currentStage)
    ? progress.currentStage
    : firstStageId;

  return {
    ...progress,
    childId,
    currentStage,
    totalScore: typeof progress.totalScore === 'number' ? progress.totalScore : 0,
    unlockedStages: unlockedStages.length > 0 ? unlockedStages : [firstStageId],
    completedStages,
    lastPlayedLevel: {
      [firstStageId]: 1,
      ...lastPlayedLevel,
    },
    playHistory: Array.isArray(progress.playHistory) ? progress.playHistory : [],
  };
};

const buildActivityProgressSnapshot = (
  progress: CountingGameProgress,
  availableStageIds?: number[]
) => {
  const stageIds = getAvailableStageIds(availableStageIds);
  const hasCompletedAllStages =
    stageIds.length > 0 &&
    stageIds.every((stageId) => progress.completedStages.includes(stageId));
  const highestUnlockedStage =
    progress.unlockedStages.length > 0 ? Math.max(...progress.unlockedStages) : null;
  const hasStarted =
    progress.totalScore > 0 ||
    progress.completedStages.length > 0 ||
    progress.playHistory.length > 0;

  return {
    status: hasCompletedAllStages
      ? 'completed' as const
      : hasStarted
        ? 'in_progress' as const
        : 'not_started' as const,
    score: progress.totalScore,
    last_stage_id: String(progress.currentStage),
    highest_unlocked_stage: highestUnlockedStage,
    completed_stage_count: progress.completedStages.length,
    progress_payload: {
      ...progress,
      availableStageIds: stageIds,
    },
  };
};

const persistNormalizedCountingProgress = async (
  progress: CountingGameProgress,
  childId: string,
  languageCode: string,
  availableStageIds?: number[],
  options: { onlyIfMissing?: boolean; markDirty?: boolean } = {}
) => {
  const normalizedProgress = normalizeProgressForStages(
    progress,
    childId,
    availableStageIds
  );
  const snapshot = buildActivityProgressSnapshot(normalizedProgress, availableStageIds);

  if (options.onlyIfMissing) {
    const existing = await getActivityProgress(
      childId,
      languageCode,
      COUNTING_ACTIVITY_TYPE
    );
    if (existing) return;

    await ensureActivityProgressSnapshot(
      childId,
      languageCode,
      COUNTING_ACTIVITY_TYPE,
      snapshot
    );
  } else {
    await updateActivityProgress(
      childId,
      languageCode,
      COUNTING_ACTIVITY_TYPE,
      snapshot,
      { markDirty: options.markDirty }
    );
  }

  if (options.markDirty === false) return;

  await markStageStarted(
    childId,
    languageCode,
    COUNTING_ACTIVITY_TYPE,
    normalizedProgress.currentStage,
    {
      score: normalizedProgress.totalScore,
      progress_payload: {
        lastPlayedLevel: normalizedProgress.lastPlayedLevel[normalizedProgress.currentStage] ?? 1,
      },
    }
  );

  await Promise.all(
    normalizedProgress.completedStages.map((stageId) =>
      markStageCompleted(childId, languageCode, COUNTING_ACTIVITY_TYPE, stageId, {
        score: normalizedProgress.totalScore,
      })
    )
  );
};

/**
 * Load saved game progress from AsyncStorage
 */
export const loadGameProgress = async (
  childId: string,
  languageCode: string,
  availableStageIds?: number[]
): Promise<CountingGameProgress> => {
  if (!childId) {
    console.warn('No child ID provided for loading progress, using default');
    return createDefaultProgress('default', getAvailableStageIds(availableStageIds)[0]);
  }

  try {
    const key = getStorageKey(childId, languageCode);
    let savedProgress = await AsyncStorage.getItem(key);

    if (!savedProgress && languageCode === 'lg') {
      const legacyKey = getLegacyStorageKey(childId);
      savedProgress = await AsyncStorage.getItem(legacyKey);
      if (savedProgress) {
        console.log(`Using explicit legacy Luganda counting progress key: ${legacyKey}`);
      }
    }
    
    if (savedProgress) {
      const parsedProgress = JSON.parse(savedProgress) as CountingGameProgress;
      
      // Validate the progress belongs to this child
      if (parsedProgress.childId !== childId) {
        console.warn('Progress childId mismatch, resetting to default');
        return createDefaultProgress(childId, getAvailableStageIds(availableStageIds)[0]);
      }
      
      const normalizedProgress = normalizeProgressForStages(
        parsedProgress,
        childId,
        availableStageIds
      );

      void persistNormalizedCountingProgress(
        normalizedProgress,
        childId,
        languageCode,
        availableStageIds,
        { onlyIfMissing: true }
      );
      void hydrateProgressFromRemote(childId, languageCode, {
        activityType: COUNTING_ACTIVITY_TYPE,
      });
      
      return normalizedProgress;
    }

    const hydratedLocalProgress = await getActivityProgress(
      childId,
      languageCode,
      COUNTING_ACTIVITY_TYPE
    );

    if (hydratedLocalProgress) {
      const restoredProgress = normalizeProgressForStages(
        hydratedLocalProgress.progress_payload as unknown as CountingGameProgress,
        childId,
        availableStageIds
      );
      await saveGameProgress(restoredProgress, childId, languageCode, {
        markDirty: false,
        availableStageIds,
      });
      return restoredProgress;
    }

    void hydrateProgressFromRemote(childId, languageCode, {
      activityType: COUNTING_ACTIVITY_TYPE,
      force: true,
    });
    
    // If no saved progress found, return default progress for this child
    return createDefaultProgress(childId, getAvailableStageIds(availableStageIds)[0]);
  } catch (error) {
    console.error('Failed to load counting game progress:', error);
    return createDefaultProgress(childId, getAvailableStageIds(availableStageIds)[0]);
  }
};

/**
 * Save game progress to AsyncStorage
 */
export const saveGameProgress = async (
  progress: CountingGameProgress,
  childId: string,
  languageCode: string,
  options: { markDirty?: boolean; availableStageIds?: number[] } = {}
): Promise<void> => {
  if (!childId) {
    console.warn('No child ID provided for saving progress, aborting');
    return;
  }

  try {
    // Ensure the progress object has the correct childId
    const updatedProgress = normalizeProgressForStages(
      {
        ...progress,
        childId // Always ensure the childId is set correctly
      },
      childId,
      options.availableStageIds
    );
    
    const key = getStorageKey(childId, languageCode);
    await AsyncStorage.setItem(key, JSON.stringify(updatedProgress));
    await persistNormalizedCountingProgress(
      updatedProgress,
      childId,
      languageCode,
      options.availableStageIds,
      { markDirty: options.markDirty }
    );
    console.log(`Saved progress for child: ${childId}`);
  } catch (error) {
    console.error('Failed to save counting game progress:', error);
  }
};

/**
 * Update progress when a stage is completed
 */
export const updateProgressForStageCompletion = (
  progress: CountingGameProgress, 
  stageId: number, 
  score: number,
  stageCountOrIds: number | number[],
  childId?: string
): CountingGameProgress => {
  const newProgress = { ...progress };
  
  // Add to completed stages if not already there
  if (!newProgress.completedStages.includes(stageId)) {
    newProgress.completedStages.push(stageId);
  }
  
  // Update total score
  newProgress.totalScore += score;
  
  // Unlock next stage if available
  const availableStageIds = Array.isArray(stageCountOrIds)
    ? stageCountOrIds
    : Array.from({ length: stageCountOrIds }, (_, index) => index + 1);
  const currentStageIndex = availableStageIds.indexOf(stageId);
  const nextStageId =
    currentStageIndex >= 0
      ? availableStageIds[currentStageIndex + 1]
      : stageId + 1;
  if (nextStageId && !newProgress.unlockedStages.includes(nextStageId)) {
    newProgress.unlockedStages.push(nextStageId);
  }
  
  // Update play history
  newProgress.playHistory.push({
    date: new Date().toISOString(),
    score
  });
  
  // Ensure childId is set correctly
  if (childId) {
    newProgress.childId = childId;
  }
  
  return newProgress;
};

/**
 * Update last played level for a specific stage
 */
export const updateLastPlayedLevel = (
  progress: CountingGameProgress, 
  stageId: number, 
  levelNumber: number,
  childId?: string
): CountingGameProgress => {
  const updatedProgress = {
    ...progress,
    lastPlayedLevel: {
      ...progress.lastPlayedLevel,
      [stageId]: levelNumber
    }
  };
  
  // Ensure childId is set correctly
  if (childId) {
    updatedProgress.childId = childId;
  }
  
  return updatedProgress;
};

/**
 * Check if a stage is unlocked
 */
export const isStageUnlocked = (progress: CountingGameProgress, stageId: number): boolean => {
  return progress.unlockedStages.includes(stageId);
};

/**
 * Reset progress for a specific child
 */
export const resetProgress = async (childId: string, languageCode: string): Promise<void> => {
  if (!childId) return;
  
  try {
    const key = getStorageKey(childId, languageCode);
    await AsyncStorage.removeItem(key);
    console.log(`Reset progress for child: ${childId}`);
  } catch (error) {
    console.error('Failed to reset progress:', error);
  }
};
