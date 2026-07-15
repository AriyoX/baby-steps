import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ensureActivityProgressSnapshot,
  getActivityProgress,
  hydrateActivityProgressOnLocalMiss,
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
  /**
   * Stable content identities added when Word Game moved to database content.
   * The positional fields above remain for backwards compatibility with existing
   * installs and achievement code, while these IDs prevent a later reorder or
   * retirement from reinterpreting a child's completions.
   */
  unlockedLevelIds?: string[];
  currentLevelId?: string;
  completedLevelIds?: string[];
  legacyLevelIdSnapshot?: string[];
  historicalCompletedLevels?: number[];
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

type WordLevelIdentity = { id: string };
type WordLevelSource = number | readonly WordLevelIdentity[];

// This is a progress-migration snapshot, not runtime learning content. These IDs
// are the immutable identities assigned to the original 50-level Luganda list.
// Keeping the snapshot lets old positional progress survive a DB reorder/retire.
const LEGACY_LUGANDA_WORD_LEVEL_IDS = Array.from(
  { length: 50 },
  (_, index) => `lg-word-game-level-${index + 1}`,
);

const uniqueNonNegativeIntegers = (value: unknown): number[] =>
  Array.isArray(value)
    ? [...new Set(value.filter(
        (item): item is number => Number.isInteger(item) && item >= 0,
      ))]
    : [];

const uniqueStrings = (value: unknown): string[] =>
  Array.isArray(value)
    ? [...new Set(value.filter(
        (item): item is string => typeof item === 'string' && item.length > 0,
      ))]
    : [];

const getLevelContext = (
  levelSource: WordLevelSource,
  languageCode?: string,
) => {
  if (typeof levelSource === 'number') {
    return {
      levelCount: Math.max(0, levelSource),
      currentLevelIds: undefined as string[] | undefined,
      migrationSnapshot: undefined as string[] | undefined,
    };
  }

  const currentLevelIds = levelSource.map((level) => level.id);
  return {
    levelCount: currentLevelIds.length,
    currentLevelIds,
    migrationSnapshot:
      languageCode === 'lg'
        ? LEGACY_LUGANDA_WORD_LEVEL_IDS
        : currentLevelIds,
  };
};

const ensureUnlockedProgress = (
  progress: WordGameProgress,
  levelSource: WordLevelSource,
  languageCode?: string,
): WordGameProgress => {
  const { levelCount, currentLevelIds, migrationSnapshot } = getLevelContext(
    levelSource,
    languageCode,
  );
  const maxLevelIndex = Math.max(0, levelCount - 1);
  const sourceUnlockedLevels = uniqueNonNegativeIntegers(progress.unlockedLevels);
  const sourceCompletedLevels = uniqueNonNegativeIntegers(progress.completedLevels);
  const hasStableIdentity = Boolean(
    currentLevelIds &&
    (progress.legacyLevelIdSnapshot ||
      progress.completedLevelIds ||
      progress.unlockedLevelIds ||
      progress.currentLevelId),
  );
  const legacyLevelIdSnapshot = currentLevelIds
    ? progress.legacyLevelIdSnapshot ?? migrationSnapshot
    : progress.legacyLevelIdSnapshot;
  const historicalCompletedLevels = currentLevelIds
    ? progress.historicalCompletedLevels ?? sourceCompletedLevels
    : progress.historicalCompletedLevels;

  let completedLevelIds = uniqueStrings(progress.completedLevelIds);
  let unlockedLevelIds = uniqueStrings(progress.unlockedLevelIds);
  let currentLevelId = progress.currentLevelId;

  if (currentLevelIds && legacyLevelIdSnapshot && !hasStableIdentity) {
    completedLevelIds = sourceCompletedLevels
      .map((index) => legacyLevelIdSnapshot[index])
      .filter((id): id is string => Boolean(id));
    unlockedLevelIds = sourceUnlockedLevels
      .map((index) => legacyLevelIdSnapshot[index])
      .filter((id): id is string => Boolean(id));
    currentLevelId = legacyLevelIdSnapshot[progress.currentLevel];
  }

  const completedLevels = currentLevelIds
    ? completedLevelIds
        .map((id) => currentLevelIds.indexOf(id))
        .filter((index) => index >= 0)
    : sourceCompletedLevels;
  const unlockedLevels = currentLevelIds
    ? unlockedLevelIds
        .map((id) => currentLevelIds.indexOf(id))
        .filter((index) => index >= 0)
    : sourceUnlockedLevels;
  const currentLevel = Number.isInteger(progress.currentLevel)
    ? currentLevelIds && currentLevelId
      ? Math.max(0, currentLevelIds.indexOf(currentLevelId))
      : Math.min(Math.max(progress.currentLevel, 0), maxLevelIndex)
    : 0;

  const normalizedProgress: WordGameProgress = {
    ...progress,
    currentLevel,
    unlockedLevels: unlockedLevels.length > 0 ? [...unlockedLevels] : [0],
    completedLevels: [...completedLevels],
    ...(currentLevelIds
      ? {
          legacyLevelIdSnapshot,
          historicalCompletedLevels,
          completedLevelIds,
          unlockedLevelIds,
          currentLevelId:
            currentLevelIds[currentLevel] ?? currentLevelId ?? currentLevelIds[0],
        }
      : {}),
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

  if (currentLevelIds) {
    normalizedProgress.completedLevels.forEach((level) => {
      const id = currentLevelIds[level];
      if (id && !normalizedProgress.completedLevelIds?.includes(id)) {
        normalizedProgress.completedLevelIds?.push(id);
      }
    });
    normalizedProgress.unlockedLevels.forEach((level) => {
      const id = currentLevelIds[level];
      if (id && !normalizedProgress.unlockedLevelIds?.includes(id)) {
        normalizedProgress.unlockedLevelIds?.push(id);
      }
    });
  }

  normalizedProgress.unlockedLevels.sort((a, b) => a - b);
  return normalizedProgress;
};

const buildActivityProgressSnapshot = (
  progress: WordGameProgress,
  levelCount: number
) => {
  const completedLevelCount = progress.completedLevels.filter(
    (level) => level >= 0 && level < levelCount,
  ).length;
  const hasCompletedAllLevels = levelCount > 0 && completedLevelCount >= levelCount;
  const hasStarted =
    progress.totalScore > 0 ||
    completedLevelCount > 0 ||
    (progress.completedLevelIds?.length ?? 0) > 0 ||
    (progress.historicalCompletedLevels?.length ?? 0) > 0 ||
    progress.playHistory.length > 0;
  const availableUnlockedLevels = progress.unlockedLevels.filter(
    (level) => level >= 0 && level < levelCount,
  );
  const highestUnlockedLevel =
    availableUnlockedLevels.length > 0 ? Math.max(...availableUnlockedLevels) : 0;

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
  levelSource: WordLevelSource,
  options: { onlyIfMissing?: boolean; markDirty?: boolean } = {}
) => {
  const normalizedProgress = ensureUnlockedProgress(
    { ...progress, childId },
    levelSource,
    languageCode,
  );
  const levelCount = getLevelContext(levelSource, languageCode).levelCount;
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
  levelSource: WordLevelSource,
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
      
      const normalizedProgress = ensureUnlockedProgress(
        parsedProgress,
        levelSource,
        languageCode,
      );

      // Persist the compatibility projection under the scoped key. The old
      // Luganda key is deliberately retained so rollback/migration remains safe.
      if (typeof levelSource !== 'number') {
        await AsyncStorage.setItem(key, JSON.stringify(normalizedProgress));
      }
      
      console.log(`Returning parsed progress for ${childId}:`, {
        completedLevels: normalizedProgress.completedLevels,
        unlockedLevels: normalizedProgress.unlockedLevels,
        currentLevel: normalizedProgress.currentLevel
      });
      
      void persistNormalizedWordProgress(
        normalizedProgress,
        childId,
        languageCode,
        levelSource,
        { onlyIfMissing: true }
      ).catch((error) => {
        console.warn('Could not normalize word-game progress in the background:', error);
      });
      void hydrateProgressFromRemote(childId, languageCode, {
        activityType: WORD_ACTIVITY_TYPE,
      }).catch((error) => {
        console.warn('Could not hydrate word-game progress in the background:', error);
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
        levelSource,
        languageCode,
      );
      await saveGameProgress(restoredProgress, childId, languageCode, {
        markDirty: false,
        levels: typeof levelSource === 'number' ? undefined : levelSource,
        levelCount: getLevelContext(levelSource, languageCode).levelCount,
      });
      return restoredProgress;
    }

    const remoteProgress = await hydrateActivityProgressOnLocalMiss(
      childId,
      languageCode,
      WORD_ACTIVITY_TYPE,
    );

    if (remoteProgress) {
      const restoredProgress = ensureUnlockedProgress(
        {
          ...createDefaultProgress(childId),
          ...(remoteProgress.progress_payload as Partial<WordGameProgress>),
          childId,
        },
        levelSource,
        languageCode,
      );
      await saveGameProgress(restoredProgress, childId, languageCode, {
        markDirty: false,
        levels: typeof levelSource === 'number' ? undefined : levelSource,
        levelCount: getLevelContext(levelSource, languageCode).levelCount,
      });
      return restoredProgress;
    }
    
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
  options: {
    markDirty?: boolean;
    levelCount?: number;
    levels?: readonly WordLevelIdentity[];
  } = {}
): Promise<void> => {
  if (!childId) {
    console.warn('No child ID provided for saving progress, aborting');
    throw new Error('No child ID provided for saving word-game progress.');
  }

  try {
    // Ensure the progress object has the correct childId
    const fallbackLevelCount = Math.max(
      1,
      progress.unlockedLevels.length,
      progress.completedLevels.length + 1,
    );
    const levelSource = options.levels ?? options.levelCount ?? fallbackLevelCount;
    const updatedProgress = ensureUnlockedProgress(
      {
        ...progress,
        childId // Always ensure the childId is set correctly
      },
      levelSource,
      languageCode,
    );
    
    const key = getStorageKey(childId, languageCode);
    await AsyncStorage.setItem(key, JSON.stringify(updatedProgress));
    await persistNormalizedWordProgress(
      updatedProgress,
      childId,
      languageCode,
      levelSource,
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
    throw error;
  }
};

/**
 * Update progress when a level is completed
 */
export const updateProgressForLevelCompletion = (
  progress: WordGameProgress, 
  levelIndex: number,
  word: string,
  levelSource: WordLevelSource,
  childId?: string
): WordGameProgress => {
  const { levelCount, currentLevelIds } = getLevelContext(levelSource);
  const newProgress = { ...progress };
  
  // Add to completed levels if not already there
  if (!newProgress.completedLevels.includes(levelIndex)) {
    newProgress.completedLevels.push(levelIndex);
  }
  const completedLevelId = currentLevelIds?.[levelIndex];
  if (completedLevelId) {
    newProgress.completedLevelIds = uniqueStrings([
      ...(newProgress.completedLevelIds ?? []),
      completedLevelId,
    ]);
  }
  
  // Update total score (10 points per completed level)
  newProgress.totalScore += 10;
  
  // Unlock next level if available
  const nextLevelIndex = levelIndex + 1;
  if (nextLevelIndex < levelCount && !newProgress.unlockedLevels.includes(nextLevelIndex)) {
    newProgress.unlockedLevels.push(nextLevelIndex);
  }
  const nextLevelId = currentLevelIds?.[nextLevelIndex];
  if (nextLevelId) {
    newProgress.unlockedLevelIds = uniqueStrings([
      ...(newProgress.unlockedLevelIds ?? []),
      nextLevelId,
    ]);
  }
  if (currentLevelIds && currentLevelIds.length > 0) {
    newProgress.currentLevelId =
      currentLevelIds[Math.min(nextLevelIndex, currentLevelIds.length - 1)];
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
export const isLevelUnlocked = (
  progress: WordGameProgress,
  levelIndex: number,
  levelId?: string,
): boolean => {
  // First level (index 0) is always unlocked
  if (levelIndex === 0) return true;
  
  // A level is unlocked if:
  // 1. It's in the unlockedLevels array, OR
  // 2. It's in the completedLevels array (if you completed it, you should be able to play it again), OR
  // 3. It's less than or equal to the current level (all previous levels should be accessible)
  return Boolean(levelId && progress.unlockedLevelIds?.includes(levelId)) ||
         progress.unlockedLevels.includes(levelIndex) ||
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
