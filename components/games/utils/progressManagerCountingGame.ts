import AsyncStorage from '@react-native-async-storage/async-storage';
import { COUNTING_GAME_STAGES } from './countingGameStages';

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
export const createDefaultProgress = (childId: string): CountingGameProgress => ({
  unlockedStages: [1],
  currentStage: 1,
  totalScore: 0,
  lastPlayedLevel: { 1: 1 },
  completedStages: [],
  playHistory: [],
  childId // Store the child ID in the progress object
});

// Default progress - only first stage unlocked
export const DEFAULT_PROGRESS: CountingGameProgress = createDefaultProgress('default');

/**
 * Get the storage key for a specific child
 */
const getStorageKey = (childId: string): string => {
  return `@BabySteps:CountingGame:${childId}`;
};

/**
 * Load saved game progress from AsyncStorage
 */
export const loadGameProgress = async (childId: string): Promise<CountingGameProgress> => {
  if (!childId) {
    console.warn('No child ID provided for loading progress, using default');
    return createDefaultProgress('default');
  }

  try {
    const key = getStorageKey(childId);
    const savedProgress = await AsyncStorage.getItem(key);
    
    if (savedProgress) {
      const parsedProgress = JSON.parse(savedProgress) as CountingGameProgress;
      
      // Validate the progress belongs to this child
      if (parsedProgress.childId !== childId) {
        console.warn('Progress childId mismatch, resetting to default');
        return createDefaultProgress(childId);
      }
      
      return parsedProgress;
    }
    
    // If no saved progress found, return default progress for this child
    return createDefaultProgress(childId);
  } catch (error) {
    console.error('Failed to load counting game progress:', error);
    return createDefaultProgress(childId);
  }
};

/**
 * Save game progress to AsyncStorage
 */
export const saveGameProgress = async (
  progress: CountingGameProgress,
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
  const nextStageId = stageId + 1;
  if (nextStageId <= COUNTING_GAME_STAGES.length && !newProgress.unlockedStages.includes(nextStageId)) {
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
export const resetProgress = async (childId: string): Promise<void> => {
  if (!childId) return;
  
  try {
    const key = getStorageKey(childId);
    await AsyncStorage.removeItem(key);
    console.log(`Reset progress for child: ${childId}`);
  } catch (error) {
    console.error('Failed to reset progress:', error);
  }
};