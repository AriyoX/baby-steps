import AsyncStorage from '@react-native-async-storage/async-storage';
import { gameLevels } from './wordgamewords';

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
const getStorageKey = (childId: string): string => {
  return `@BabySteps:WordGame:${childId}`;
};

/**
 * Load saved game progress from AsyncStorage
 */
export const loadGameProgress = async (childId: string): Promise<WordGameProgress> => {
  if (!childId) {
    console.warn('No child ID provided for loading progress, using default');
    return createDefaultProgress('default');
  }

  try {
    const key = getStorageKey(childId);
    console.log(`Loading progress with key: ${key} for child: ${childId}`);
    const savedProgress = await AsyncStorage.getItem(key);
    
    if (savedProgress) {
      console.log(`Found saved progress for child ${childId}:`, savedProgress);
      const parsedProgress = JSON.parse(savedProgress) as WordGameProgress;
      
      // Validate the progress belongs to this child
      if (parsedProgress.childId !== childId) {
        console.warn(`Progress childId mismatch: expected ${childId}, got ${parsedProgress.childId}`);
        return createDefaultProgress(childId);
      }
      
      // Ensure all completed levels are also in the unlockedLevels array
      parsedProgress.completedLevels.forEach(level => {
        if (!parsedProgress.unlockedLevels.includes(level)) {
          parsedProgress.unlockedLevels.push(level);
        }
        
        // Also unlock the next level after each completed level
        const nextLevel = level + 1;
        if (nextLevel < gameLevels.length && !parsedProgress.unlockedLevels.includes(nextLevel)) {
          parsedProgress.unlockedLevels.push(nextLevel);
        }
      });
      
      // Sort unlockedLevels for clarity
      parsedProgress.unlockedLevels.sort((a, b) => a - b);
      
      console.log(`Returning parsed progress for ${childId}:`, {
        completedLevels: parsedProgress.completedLevels,
        unlockedLevels: parsedProgress.unlockedLevels,
        currentLevel: parsedProgress.currentLevel
      });
      
      return parsedProgress;
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
  childId: string
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
    
    const key = getStorageKey(childId);
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
  if (nextLevelIndex < gameLevels.length && !newProgress.unlockedLevels.includes(nextLevelIndex)) {
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
export const resetProgress = async (childId: string): Promise<void> => {
  if (!childId) return;
  
  try {
    const key = getStorageKey(childId);
    await AsyncStorage.removeItem(key);
    console.log(`Reset word game progress for child: ${childId}`);
  } catch (error) {
    console.error('Failed to reset progress:', error);
  }
};