import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ensureActivityProgressSnapshot,
  getActivityProgress,
  hydrateProgressFromRemote,
  markStageCompleted,
  updateActivityProgress,
} from '@/lib/progressRepository';

const WORD_ACTIVITY_TYPE = 'words';

// Types for progress tracking
export interface WordGameProgress {
  unlockedLevels: number[];
  currentLevel: number;
  completedLevels: number[];
  totalScore: number;
  playHistory: {
    date: string;
    levelCompleted: number;
    word: string;
  }[];
  childId: string; // Add child ID to the progress object for validation
}

// Function to create default progress for a specific child
export const createDefaultProgress = (childId: string): WordGameProgress => ({
  unlockedLevels: [0], // First level is always unlocked (index 0)
  currentLevel: 0,
  completedLevels: [],
  totalScore: 0,
  playHistory: [],
  childId
});

// Default progress - only first level unlocked
export const DEFAULT_PROGRESS: WordGameProgress = createDefaultProgress('default');

/**
 * Get the storage key for a specific child
 */
const getStorageKey = (childId: string, languageCode: string): string => {
  return `@BabySteps:WordGame:${childId}:${languageCode}`;
};

const getLegacyStorageKey = (childId: string): string => {
  return `@BabySteps:WordGame:${childId}`;
};

const ensureUnlockedProgress = (
  progress: WordGameProgress,
  levelCount: number
): WordGameProgress => {
  const maxLevelIndex = Math.max(0, levelCount - 1);
  const unlockedLevels = Array.isArray(progress.unlockedLevels)
    ? progress.unlockedLevels.filter((level) => Number.isInteger(level) && level >= 0 && level <= maxLevelIndex)
    : [0];
  const completedLevels = Array.isArray(progress.completedLevels)
    ? progress.completedLevels.filter((level) => Number.isInteger(level) && level >= 0 && level <= maxLevelIndex)
    : [];
  const currentLevel = Number.isInteger(progress.currentLevel)
    ? Math.min(Math.max(progress.currentLevel, 0), maxLevelIndex)
    : 0;

  const normalizedProgress = {
    ...progress,
    currentLevel,
    unlockedLevels: unlockedLevels.length > 0 ? [...unlockedLevels] : [0],
    completedLevels: [...completedLevels],
  };

  normalizedProgress.completedLevels.forEach(level => {
    if (!normalizedProgress.unlockedLevels.includes(level)) {
      normalizedProgress.unlockedLevels.push(level);
    }

    const nextLevel = level + 1;
    if (nextLevel < levelCount && !normalizedProgress.unlockedLevels.includes(nextLevel)) {
      normalizedProgress.unlockedLevels.push(nextLevel);
    }
  });

  normalizedProgress.unlockedLevels.sort((a, b) => a - b);
  return normalizedProgress;
};

const buildActivityProgressSnapshot = (
  progress: WordGameProgress,
  levelCount: number
) => {
  const completedLevelCount = progress.completedLevels.length;
  const hasCompletedAllLevels = levelCount > 0 && completedLevelCount >= levelCount;
  const hasStarted =
    progress.totalScore > 0 ||
    completedLevelCount > 0 ||
    progress.playHistory.length > 0;
  const highestUnlockedLevel =
    progress.unlockedLevels.length > 0 ? Math.max(...progress.unlockedLevels) : 0;

  return {
    status: hasCompletedAllLevels
      ? 'completed' as const
      : hasStarted
        ? 'in_progress' as const
        : 'not_started' as const,
    score: progress.totalScore,
    last_stage_id: String(progress.currentLevel),
    highest_unlocked_stage: highestUnlockedLevel,
    completed_stage_count: completedLevelCount,
    progress_payload: {
      ...progress,
      levelCount,
    },
  };
};

const persistNormalizedWordProgress = async (
  progress: WordGameProgress,
  childId: string,
  languageCode: string,
  levelCount: number,
  options: { onlyIfMissing?: boolean; markDirty?: boolean } = {}
) => {
  const normalizedProgress = ensureUnlockedProgress(
    { ...progress, childId },
    levelCount
  );
  const snapshot = buildActivityProgressSnapshot(normalizedProgress, levelCount);

  if (options.onlyIfMissing) {
    const existing = await getActivityProgress(
      childId,
      languageCode,
      WORD_ACTIVITY_TYPE
    );
    if (existing) return;

    await ensureActivityProgressSnapshot(
      childId,
      languageCode,
      WORD_ACTIVITY_TYPE,
      snapshot
    );
  } else {
    await updateActivityProgress(
      childId,
      languageCode,
      WORD_ACTIVITY_TYPE,
      snapshot,
      { markDirty: options.markDirty }
    );
  }

  if (options.markDirty === false) return;

  await Promise.all(
    normalizedProgress.completedLevels.map((levelIndex) =>
      markStageCompleted(childId, languageCode, WORD_ACTIVITY_TYPE, levelIndex, {
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
  levelCount: number
): Promise<WordGameProgress> => {
  if (!childId) {
    console.warn('No child ID provided for loading progress, using default');
    return createDefaultProgress('default');
  }

  try {
    const key = getStorageKey(childId, languageCode);
    console.log(`Loading progress with key: ${key} for child: ${childId}`);
    let savedProgress = await AsyncStorage.getItem(key);

    if (!savedProgress && languageCode === 'lg') {
      const legacyKey = getLegacyStorageKey(childId);
      savedProgress = await AsyncStorage.getItem(legacyKey);
      if (savedProgress) {
        console.log(`Using explicit legacy Luganda word-game progress key: ${legacyKey}`);
      }
    }
    
    if (savedProgress) {
      console.log(`Found saved progress for child ${childId}:`, savedProgress);
      const parsedProgress = JSON.parse(savedProgress) as WordGameProgress;
      
      // Validate the progress belongs to this child
      if (parsedProgress.childId !== childId) {
        console.warn(`Progress childId mismatch: expected ${childId}, got ${parsedProgress.childId}`);
        return createDefaultProgress(childId);
      }
      
      const normalizedProgress = ensureUnlockedProgress(parsedProgress, levelCount);
      
      console.log(`Returning parsed progress for ${childId}:`, {
        completedLevels: normalizedProgress.completedLevels,
        unlockedLevels: normalizedProgress.unlockedLevels,
        currentLevel: normalizedProgress.currentLevel
      });
      
      void persistNormalizedWordProgress(
        normalizedProgress,
        childId,
        languageCode,
        levelCount,
        { onlyIfMissing: true }
      );
      void hydrateProgressFromRemote(childId, languageCode, {
        activityType: WORD_ACTIVITY_TYPE,
      });
      
      return normalizedProgress;
    }

    const hydratedLocalProgress = await getActivityProgress(
      childId,
      languageCode,
      WORD_ACTIVITY_TYPE
    );

    if (hydratedLocalProgress) {
      const restoredProgress = ensureUnlockedProgress(
        {
          ...createDefaultProgress(childId),
          ...(hydratedLocalProgress.progress_payload as Partial<WordGameProgress>),
          childId,
        },
        levelCount
      );
      await saveGameProgress(restoredProgress, childId, languageCode, {
        markDirty: false,
        levelCount,
      });
      return restoredProgress;
    }

    void hydrateProgressFromRemote(childId, languageCode, {
      activityType: WORD_ACTIVITY_TYPE,
      force: true,
    });
    
    console.log(`No saved progress found for child ${childId}, creating default`);
    // If no saved progress found, return default progress for this child
    return createDefaultProgress(childId);
  } catch (error) {
    console.error('Failed to load word game progress:', error);
    return createDefaultProgress(childId);
  }
};

/**
 * Save game progress to AsyncStorage
 */
export const saveGameProgress = async (
  progress: WordGameProgress,
  childId: string,
  languageCode: string,
  options: { markDirty?: boolean; levelCount?: number } = {}
): Promise<void> => {
  if (!childId) {
    console.warn('No child ID provided for saving progress, aborting');
    return;
  }

  try {
    // Ensure the progress object has the correct childId
    const updatedProgress = ensureUnlockedProgress({
      ...progress,
      childId // Always ensure the childId is set correctly
    }, options.levelCount ?? Math.max(1, progress.unlockedLevels.length, progress.completedLevels.length + 1));
    
    const key = getStorageKey(childId, languageCode);
    await AsyncStorage.setItem(key, JSON.stringify(updatedProgress));
    await persistNormalizedWordProgress(
      updatedProgress,
      childId,
      languageCode,
      options.levelCount ?? Math.max(1, updatedProgress.unlockedLevels.length, updatedProgress.completedLevels.length + 1),
      { markDirty: options.markDirty }
    );
    
    // Add this line to ensure data is flushed to persistent storage
    await AsyncStorage.flushGetRequests();
    
    console.log(`Saved word game progress for child: ${childId}`, {
      completedLevels: updatedProgress.completedLevels,
      currentLevel: updatedProgress.currentLevel
    });
  } catch (error) {
    console.error('Failed to save word game progress:', error);
  }
};

/**
 * Update progress when a level is completed
 */
export const updateProgressForLevelCompletion = (
  progress: WordGameProgress, 
  levelIndex: number,
  word: string,
  levelCount: number,
  childId?: string
): WordGameProgress => {
  const newProgress = { ...progress };
  
  // Add to completed levels if not already there
  if (!newProgress.completedLevels.includes(levelIndex)) {
    newProgress.completedLevels.push(levelIndex);
  }
  
  // Update total score (10 points per completed level)
  newProgress.totalScore += 10;
  
  // Unlock next level if available
  const nextLevelIndex = levelIndex + 1;
  if (nextLevelIndex < levelCount && !newProgress.unlockedLevels.includes(nextLevelIndex)) {
    newProgress.unlockedLevels.push(nextLevelIndex);
  }
  
  // Update play history
  newProgress.playHistory.push({
    date: new Date().toISOString(),
    levelCompleted: levelIndex,
    word
  });
  
  // Ensure childId is set correctly
  if (childId) {
    newProgress.childId = childId;
  }
  
  return newProgress;
};

/**
 * Check if a level is unlocked
 */
export const isLevelUnlocked = (progress: WordGameProgress, levelIndex: number): boolean => {
  // First level (index 0) is always unlocked
  if (levelIndex === 0) return true;
  
  // A level is unlocked if:
  // 1. It's in the unlockedLevels array, OR
  // 2. It's in the completedLevels array (if you completed it, you should be able to play it again), OR
  // 3. It's less than or equal to the current level (all previous levels should be accessible)
  return progress.unlockedLevels.includes(levelIndex) || 
         progress.completedLevels.includes(levelIndex) || 
         levelIndex <= progress.currentLevel;
};

/**
 * Reset progress for a specific child
 */
export const resetProgress = async (childId: string, languageCode: string): Promise<void> => {
  if (!childId) return;
  
  try {
    const key = getStorageKey(childId, languageCode);
    await AsyncStorage.removeItem(key);
    console.log(`Reset word game progress for child: ${childId}`);
  } catch (error) {
    console.error('Failed to reset progress:', error);
  }
};
