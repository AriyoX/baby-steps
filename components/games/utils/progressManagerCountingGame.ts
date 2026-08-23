import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ensureActivityProgressSnapshot,
  getActivityProgress,
  getStageProgress,
  hydrateActivityProgressOnLocalMiss,
  hydrateProgressFromRemote,
  markLevelCompleted,
  markStageCompleted,
  updateActivityProgress,
} from '@/lib/progressRepository';

const COUNTING_ACTIVITY_TYPE = 'counting';

// Types for progress tracking
export interface CountingGameProgress {
  contentRevision?: string;
  unlockedStages: number[];
  currentStage: number;
  totalScore: number;
  lastPlayedLevel: Record<number, number>; // Stage ID to level number mapping
  completedLevelsByStage: Record<number, number[]>;
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
  completedLevelsByStage: {},
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

export type CountingStageProgressDefinition =
  | number
  | { id: number; levels: number };

const getAvailableStages = (
  availableStages?: CountingStageProgressDefinition[]
): { id: number; levels?: number }[] => {
  if (!availableStages || availableStages.length === 0) return [{ id: 1 }];

  return availableStages.reduce<{ id: number; levels?: number }[]>(
    (result, stage) => {
      const id = typeof stage === 'number' ? stage : stage.id;
      if (!Number.isInteger(id) || result.some((item) => item.id === id)) {
        return result;
      }
      result.push({
        id,
        levels:
          typeof stage === 'number'
            ? undefined
            : Math.max(1, Math.floor(stage.levels)),
      });
      return result;
    },
    []
  );
};

const getAvailableStageIds = (
  availableStages?: CountingStageProgressDefinition[]
): number[] => getAvailableStages(availableStages).map((stage) => stage.id);

const getStageLevelCount = (
  availableStages: CountingStageProgressDefinition[] | undefined,
  stageId: number
): number | undefined =>
  getAvailableStages(availableStages).find((stage) => stage.id === stageId)?.levels;

const uniqueSortedLevels = (levels: unknown, levelCount?: number): number[] => {
  if (!Array.isArray(levels)) return [];

  return [...new Set(
    levels.filter(
      (level): level is number =>
        Number.isInteger(level) &&
        level >= 1 &&
        (levelCount === undefined || level <= levelCount)
    )
  )].sort((left, right) => left - right);
};

export const normalizeCountingProgress = (
  progress: CountingGameProgress | Partial<CountingGameProgress>,
  childId: string,
  availableStages?: CountingStageProgressDefinition[]
): CountingGameProgress => {
  const stageIds = getAvailableStageIds(availableStages);
  const stageIdSet = new Set(stageIds);
  const firstStageId = stageIds[0] ?? 1;
  const sourceUnlockedStages = Array.isArray(progress.unlockedStages)
    ? progress.unlockedStages
    : [];
  const sourceCompletedStages = Array.isArray(progress.completedStages)
    ? progress.completedStages
    : [];
  // Keep retired IDs in the persisted history. Current availability is derived
  // separately from stageIdSet, so removing DB records never erases progress.
  const unlockedStages = [...new Set(sourceUnlockedStages.filter(Number.isInteger))];
  const completedStages = [...new Set(sourceCompletedStages.filter(Number.isInteger))];
  const lastPlayedLevel = Object.entries(progress.lastPlayedLevel ?? {}).reduce(
    (result, [stageId, level]) => {
      const numericStageId = Number(stageId);
      if (Number.isInteger(numericStageId) && Number.isFinite(level)) {
        result[numericStageId] = Math.max(1, Math.floor(level));
      }
      return result;
    },
    {} as Record<number, number>
  );
  const requestedCurrentStage = Number(progress.currentStage);
  const currentStage = stageIdSet.has(requestedCurrentStage)
    ? requestedCurrentStage
    : firstStageId;
  const completedLevelsByStage = Object.entries(
    progress.completedLevelsByStage ?? {}
  ).reduce((result, [stageId, levels]) => {
    const numericStageId = Number(stageId);
    if (!Number.isInteger(numericStageId)) return result;
    result[numericStageId] = uniqueSortedLevels(
      levels,
      getStageLevelCount(availableStages, numericStageId)
    );
    return result;
  }, {} as Record<number, number[]>);

  // Legacy Counting stored the next playable position only. Under that flow,
  // reaching level N meant levels 1..N-1 had already been completed.
  Object.entries(lastPlayedLevel).forEach(([stageId, lastPlayed]) => {
    const numericStageId = Number(stageId);
    const levelCount = getStageLevelCount(availableStages, numericStageId);
    const inferredThrough = Math.max(
      0,
      Math.min(lastPlayed - 1, levelCount ?? lastPlayed - 1)
    );
    const inferredLevels = Array.from(
      { length: inferredThrough },
      (_, index) => index + 1
    );
    const mergedLevels = uniqueSortedLevels(
      [...(completedLevelsByStage[numericStageId] ?? []), ...inferredLevels],
      levelCount
    );
    if (mergedLevels.length > 0 || completedLevelsByStage[numericStageId]) {
      completedLevelsByStage[numericStageId] = mergedLevels;
    }
  });

  completedStages.forEach((stageId) => {
    const levelCount = getStageLevelCount(availableStages, stageId);
    if (!levelCount) return;
    completedLevelsByStage[stageId] = Array.from(
      { length: levelCount },
      (_, index) => index + 1
    );
  });

  getAvailableStages(availableStages).forEach((stage) => {
    if (
      stage.levels &&
      completedLevelsByStage[stage.id]?.length === stage.levels &&
      !completedStages.includes(stage.id)
    ) {
      completedStages.push(stage.id);
    }
  });

  const normalizedUnlockedStages = [...unlockedStages];
  completedStages.forEach((stageId) => {
    const stageIndex = stageIds.indexOf(stageId);
    const nextStageId = stageIndex >= 0 ? stageIds[stageIndex + 1] : undefined;
    if (nextStageId && !normalizedUnlockedStages.includes(nextStageId)) {
      normalizedUnlockedStages.push(nextStageId);
    }
  });

  return {
    ...progress,
    childId,
    currentStage,
    totalScore: typeof progress.totalScore === 'number' ? progress.totalScore : 0,
    unlockedStages: normalizedUnlockedStages.includes(firstStageId)
      ? normalizedUnlockedStages
      : [firstStageId, ...normalizedUnlockedStages],
    completedStages,
    lastPlayedLevel: {
      [firstStageId]: 1,
      ...lastPlayedLevel,
    },
    completedLevelsByStage,
    playHistory: Array.isArray(progress.playHistory) ? progress.playHistory : [],
  };
};

export const getCompletedCountingLevels = (
  progress: CountingGameProgress,
  stageId: number
): number[] => progress.completedLevelsByStage?.[stageId] ?? [];

export const getHighestUnlockedCountingLevel = (
  progress: CountingGameProgress,
  stageId: number,
  levelCount: number
): number => {
  const safeLevelCount = Math.max(1, levelCount);
  if (progress.completedStages.includes(stageId)) return safeLevelCount;

  const completed = new Set(getCompletedCountingLevels(progress, stageId));
  let contiguousCompleted = 0;
  while (completed.has(contiguousCompleted + 1)) contiguousCompleted += 1;

  return Math.min(
    safeLevelCount,
    Math.max(
      1,
      contiguousCompleted + 1,
      progress.lastPlayedLevel[stageId] ?? 1
    )
  );
};

export const isCountingLevelUnlocked = (
  progress: CountingGameProgress,
  stageId: number,
  levelNumber: number,
  levelCount: number
): boolean =>
  Number.isInteger(levelNumber) &&
  levelNumber >= 1 &&
  levelNumber <= getHighestUnlockedCountingLevel(progress, stageId, levelCount);

const mergeCompletedLevelRows = async (
  progress: CountingGameProgress,
  childId: string,
  languageCode: string,
  availableStages?: CountingStageProgressDefinition[]
): Promise<CountingGameProgress> => {
  const stageDefinitions = getAvailableStages(availableStages);
  const rowRequests = stageDefinitions.flatMap((stage) => {
    if (!stage.levels) return [];
    return Array.from({ length: stage.levels }, (_, index) => ({
      stageId: stage.id,
      level: index + 1,
    }));
  });
  const rows = await Promise.all(
    rowRequests.map(async ({ stageId, level }) => ({
      stageId,
      level,
      record: await getStageProgress(
        childId,
        languageCode,
        COUNTING_ACTIVITY_TYPE,
        stageId,
        level
      ),
    }))
  );
  const completedLevelsByStage = Object.fromEntries(
    Object.entries(progress.completedLevelsByStage ?? {}).map(([stageId, levels]) => [
      stageId,
      [...levels],
    ])
  ) as Record<number, number[]>;
  const completedStageRows = await Promise.all(
    stageDefinitions.map(async (stage) => ({
      stageId: stage.id,
      record: await getStageProgress(
        childId,
        languageCode,
        COUNTING_ACTIVITY_TYPE,
        stage.id,
        ''
      ),
    }))
  );

  rows.forEach(({ stageId, level, record }) => {
    if (record?.status !== 'completed') return;
    completedLevelsByStage[stageId] = [
      ...(completedLevelsByStage[stageId] ?? []),
      level,
    ];
  });
  const completedStages = [
    ...progress.completedStages,
    ...completedStageRows
      .filter(({ record }) => record?.status === 'completed')
      .map(({ stageId }) => stageId),
  ];

  return normalizeCountingProgress(
    { ...progress, completedLevelsByStage, completedStages },
    childId,
    availableStages
  );
};

const buildActivityProgressSnapshot = (
  progress: CountingGameProgress,
  availableStages?: CountingStageProgressDefinition[]
) => {
  const stageIds = getAvailableStageIds(availableStages);
  const stageIdSet = new Set(stageIds);
  const completedCurrentStageIds = progress.completedStages.filter((stageId) =>
    stageIdSet.has(stageId)
  );
  const hasCompletedAllStages =
    stageIds.length > 0 &&
    stageIds.every((stageId) => completedCurrentStageIds.includes(stageId));
  const currentUnlockedStages = progress.unlockedStages.filter((stageId) =>
    stageIdSet.has(stageId)
  );
  const highestUnlockedStage =
    currentUnlockedStages.length > 0 ? Math.max(...currentUnlockedStages) : null;
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
    completed_stage_count: completedCurrentStageIds.length,
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
  availableStages?: CountingStageProgressDefinition[],
  options: { onlyIfMissing?: boolean; markDirty?: boolean } = {}
) => {
  const normalizedProgress = normalizeCountingProgress(
    progress,
    childId,
    availableStages
  );
  const snapshot = buildActivityProgressSnapshot(normalizedProgress, availableStages);

  if (options.onlyIfMissing) {
    const existing = await getActivityProgress(
      childId,
      languageCode,
      COUNTING_ACTIVITY_TYPE
    );
    if (!existing) {
      await ensureActivityProgressSnapshot(
        childId,
        languageCode,
        COUNTING_ACTIVITY_TYPE,
        snapshot
      );
    }
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

  const ensureCompletedLevelRow = async (stageId: number, level: number) => {
    const existing = await getStageProgress(
      childId,
      languageCode,
      COUNTING_ACTIVITY_TYPE,
      stageId,
      level
    );
    if (existing?.status === 'completed') return;
    await markLevelCompleted(
      childId,
      languageCode,
      COUNTING_ACTIVITY_TYPE,
      stageId,
      level,
      {
        score: normalizedProgress.totalScore,
        progress_payload: { levelNumber: level },
      }
    );
  };

  const ensureCompletedStageRow = async (stageId: number) => {
    const existing = await getStageProgress(
      childId,
      languageCode,
      COUNTING_ACTIVITY_TYPE,
      stageId,
      ''
    );
    if (existing?.status === 'completed') return;
    await markStageCompleted(
      childId,
      languageCode,
      COUNTING_ACTIVITY_TYPE,
      stageId,
      { score: normalizedProgress.totalScore }
    );
  };

  const completionRows = Object.entries(
    normalizedProgress.completedLevelsByStage
  ).flatMap(([stageId, levels]) =>
    levels.map((level) => ensureCompletedLevelRow(Number(stageId), level))
  );

  await Promise.all([
    ...completionRows,
    ...normalizedProgress.completedStages.map(ensureCompletedStageRow),
  ]);

};

/**
 * Load saved game progress from AsyncStorage
 */
export const loadGameProgress = async (
  childId: string,
  languageCode: string,
  availableStages?: CountingStageProgressDefinition[],
  contentRevision?: string,
): Promise<CountingGameProgress> => {
  if (!childId) {
    console.warn('No child ID provided for loading progress, using default');
    return createDefaultProgress('default', getAvailableStageIds(availableStages)[0]);
  }

  try {
    const key = getStorageKey(childId, languageCode);
    let savedProgress = await AsyncStorage.getItem(key);

    if (!savedProgress && languageCode === 'lg') {
      const legacyKey = getLegacyStorageKey(childId);
      savedProgress = await AsyncStorage.getItem(legacyKey);
    }
    
    if (savedProgress) {
      const parsedProgress = JSON.parse(savedProgress) as CountingGameProgress;
      
      // Validate the progress belongs to this child
      if (parsedProgress.childId !== childId) {
        console.warn('Progress childId mismatch, resetting to default');
        return createDefaultProgress(childId, getAvailableStageIds(availableStages)[0]);
      }

      if (
        contentRevision &&
        parsedProgress.contentRevision &&
        parsedProgress.contentRevision !== contentRevision
      ) {
        const resetProgress = {
          ...createDefaultProgress(
            childId,
            getAvailableStageIds(availableStages)[0],
          ),
          contentRevision,
        };
        await AsyncStorage.setItem(key, JSON.stringify(resetProgress));
        return resetProgress;
      }
      
      const normalizedProgress = normalizeCountingProgress(
        {
          ...parsedProgress,
          contentRevision: contentRevision ?? parsedProgress.contentRevision,
        },
        childId,
        availableStages
      );
      const restoredProgress = await mergeCompletedLevelRows(
        normalizedProgress,
        childId,
        languageCode,
        availableStages
      );
      await AsyncStorage.setItem(key, JSON.stringify(restoredProgress));

      void persistNormalizedCountingProgress(
        restoredProgress,
        childId,
        languageCode,
        availableStages,
        { onlyIfMissing: true }
      ).catch((error) => {
        console.warn('Could not normalize counting progress in the background:', error);
      });
      void hydrateProgressFromRemote(childId, languageCode, {
        activityType: COUNTING_ACTIVITY_TYPE,
      }).catch((error) => {
        console.warn('Could not hydrate counting progress in the background:', error);
      });
      
      return restoredProgress;
    }

    const hydratedLocalProgress = await getActivityProgress(
      childId,
      languageCode,
      COUNTING_ACTIVITY_TYPE
    );

    if (hydratedLocalProgress) {
      const hydratedContentRevision =
        typeof hydratedLocalProgress.progress_payload.contentRevision === 'string'
          ? hydratedLocalProgress.progress_payload.contentRevision
          : undefined;
      if (
        contentRevision &&
        hydratedContentRevision &&
        hydratedContentRevision !== contentRevision
      ) {
        const resetProgress = {
          ...createDefaultProgress(
            childId,
            getAvailableStageIds(availableStages)[0],
          ),
          contentRevision,
        };
        await AsyncStorage.setItem(key, JSON.stringify(resetProgress));
        return resetProgress;
      }
      const normalizedProgress = normalizeCountingProgress(
        {
          ...(hydratedLocalProgress.progress_payload as unknown as CountingGameProgress),
          contentRevision: contentRevision ?? hydratedContentRevision,
        },
        childId,
        availableStages
      );
      const restoredProgress = await mergeCompletedLevelRows(
        normalizedProgress,
        childId,
        languageCode,
        availableStages
      );
      await saveGameProgress(restoredProgress, childId, languageCode, {
        markDirty: false,
        availableStageIds: availableStages,
        contentRevision,
      });
      return restoredProgress;
    }

    const remoteProgress = await hydrateActivityProgressOnLocalMiss(
      childId,
      languageCode,
      COUNTING_ACTIVITY_TYPE,
    );

    if (remoteProgress) {
      const remoteContentRevision =
        typeof remoteProgress.progress_payload.contentRevision === 'string'
          ? remoteProgress.progress_payload.contentRevision
          : undefined;
      if (
        contentRevision &&
        remoteContentRevision &&
        remoteContentRevision !== contentRevision
      ) {
        const resetProgress = {
          ...createDefaultProgress(
            childId,
            getAvailableStageIds(availableStages)[0],
          ),
          contentRevision,
        };
        await AsyncStorage.setItem(key, JSON.stringify(resetProgress));
        return resetProgress;
      }
      const normalizedProgress = normalizeCountingProgress(
        {
          ...(remoteProgress.progress_payload as unknown as CountingGameProgress),
          contentRevision: contentRevision ?? remoteContentRevision,
        },
        childId,
        availableStages
      );
      const restoredProgress = await mergeCompletedLevelRows(
        normalizedProgress,
        childId,
        languageCode,
        availableStages
      );
      await saveGameProgress(restoredProgress, childId, languageCode, {
        markDirty: false,
        availableStageIds: availableStages,
        contentRevision,
      });
      return restoredProgress;
    }
    
    // If no saved progress found, return default progress for this child
    const defaultProgress = await mergeCompletedLevelRows(
      {
        ...createDefaultProgress(childId, getAvailableStageIds(availableStages)[0]),
        contentRevision,
      },
      childId,
      languageCode,
      availableStages
    );
    const recoveredExistingProgress =
      defaultProgress.completedStages.length > 0 ||
      Object.values(defaultProgress.completedLevelsByStage).some(
        (levels) => levels.length > 0
      );
    if (recoveredExistingProgress) {
      await AsyncStorage.setItem(key, JSON.stringify(defaultProgress));
    }
    return {
      ...defaultProgress,
      contentRevision,
    };
  } catch (error) {
    console.error('Failed to load counting game progress:', error);
    return createDefaultProgress(childId, getAvailableStageIds(availableStages)[0]);
  }
};

/**
 * Save game progress to AsyncStorage
 */
export const saveGameProgress = async (
  progress: CountingGameProgress,
  childId: string,
  languageCode: string,
  options: {
    markDirty?: boolean;
    availableStageIds?: CountingStageProgressDefinition[];
    contentRevision?: string;
  } = {}
): Promise<void> => {
  if (!childId) {
    console.warn('No child ID provided for saving progress, aborting');
    throw new Error('No child ID provided for saving counting progress.');
  }

  try {
    // Ensure the progress object has the correct childId
    const updatedProgress = normalizeCountingProgress(
      {
        ...progress,
        contentRevision: options.contentRevision ?? progress.contentRevision,
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
  } catch (error) {
    console.error('Failed to save counting game progress:', error);
    throw error;
  }
};

/**
 * Update progress when a stage is completed
 */
export const updateProgressForStageCompletion = (
  progress: CountingGameProgress, 
  stageId: number, 
  score: number,
  stageCountOrDefinitions: number | CountingStageProgressDefinition[],
  childId?: string
): CountingGameProgress => {
  const availableStages = Array.isArray(stageCountOrDefinitions)
    ? stageCountOrDefinitions
    : Array.from(
        { length: stageCountOrDefinitions },
        (_, index) => index + 1
      );
  const availableStageIds = getAvailableStageIds(availableStages);
  const newProgress: CountingGameProgress = {
    ...progress,
    unlockedStages: [...progress.unlockedStages],
    completedStages: [...progress.completedStages],
    lastPlayedLevel: { ...progress.lastPlayedLevel },
    completedLevelsByStage: Object.fromEntries(
      Object.entries(progress.completedLevelsByStage ?? {}).map(([id, levels]) => [
        id,
        [...levels],
      ])
    ) as Record<number, number[]>,
    playHistory: [...progress.playHistory],
  };
  
  // Add to completed stages if not already there
  if (!newProgress.completedStages.includes(stageId)) {
    newProgress.completedStages.push(stageId);
  }
  
  // Update total score
  newProgress.totalScore += score;
  
  // Unlock next stage if available
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
  
  return normalizeCountingProgress(
    newProgress,
    childId ?? progress.childId,
    availableStages
  );
};

/**
 * Record one completed level without regressing an earlier replay position.
 */
export const updateProgressForLevelCompletion = (
  progress: CountingGameProgress,
  stageId: number,
  levelNumber: number,
  availableStages: CountingStageProgressDefinition[],
  childId?: string
): CountingGameProgress => {
  const levelCount = getStageLevelCount(availableStages, stageId);
  if (!levelCount || levelNumber < 1 || levelNumber > levelCount) {
    return normalizeCountingProgress(
      progress,
      childId ?? progress.childId,
      availableStages
    );
  }

  const completedLevels = uniqueSortedLevels(
    [
      ...getCompletedCountingLevels(progress, stageId),
      levelNumber,
    ],
    levelCount
  );
  const completedStages = completedLevels.length === levelCount
    ? [...new Set([...progress.completedStages, stageId])]
    : [...progress.completedStages];
  const stageIds = getAvailableStageIds(availableStages);
  const stageIndex = stageIds.indexOf(stageId);
  const nextStageId = completedLevels.length === levelCount
    ? stageIds[stageIndex + 1]
    : undefined;

  return normalizeCountingProgress(
    {
      ...progress,
      childId: childId ?? progress.childId,
      currentStage: nextStageId ?? stageId,
      completedLevelsByStage: {
        ...(progress.completedLevelsByStage ?? {}),
        [stageId]: completedLevels,
      },
      completedStages,
      lastPlayedLevel: {
        ...progress.lastPlayedLevel,
        [stageId]: Math.max(
          progress.lastPlayedLevel[stageId] ?? 1,
          Math.min(levelCount, levelNumber + 1)
        ),
      },
      unlockedStages:
        nextStageId && !progress.unlockedStages.includes(nextStageId)
          ? [...progress.unlockedStages, nextStageId]
          : [...progress.unlockedStages],
    },
    childId ?? progress.childId,
    availableStages
  );
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
      [stageId]: Math.max(progress.lastPlayedLevel[stageId] ?? 1, levelNumber)
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
  } catch (error) {
    console.error('Failed to reset progress:', error);
  }
};
