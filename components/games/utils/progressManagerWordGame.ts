import AsyncStorage from '@react-native-async-storage/async-storage';

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
      
      return normalizedProgress;
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
  languageCode: string
): Promise<void> => {
  if (!childId) {
    console.warn('No child ID provided for saving progress, aborting');
    return;
  }

  try {
    // Ensure the progress object has the correct childId
    const updatedProgress = {
      ...progress,
      childId // Always ensure the childId is set correctly
    };
    
    const key = getStorageKey(childId, languageCode);
    await AsyncStorage.setItem(key, JSON.stringify(updatedProgress));
    
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
