// progressManager.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stage, Level, LUGANDA_STAGES } from './lugandawords'; // Assuming lugandawords.ts is in the same directory or accessible path

// Keys for AsyncStorage
const SCORE_KEY = 'luganda_total_score';
const COMPLETED_LEVELS_KEY = 'luganda_completed_levels';
const STAGES_DATA_KEY = 'luganda_stages';
const USER_STATS_KEY = 'luganda_user_stats';

// User Statistics Interface
export interface UserStats { 
  totalWords: number;
  correctAnswers: number;
  wrongAnswers: number;
  lastPlayed: string;
  streakDays: number;
}

// Default user stats
export const DEFAULT_USER_STATS: UserStats = {
  totalWords: 0,
  correctAnswers: 0,
  wrongAnswers: 0,
  lastPlayed: new Date().toISOString(),
  streakDays: 1
};

// Load user's game progress
export const loadGameProgress = async (childId: string) => {
  try {
    const scoreData = await AsyncStorage.getItem(`${SCORE_KEY}_${childId}`);
    const completedLevelsData = await AsyncStorage.getItem(`${COMPLETED_LEVELS_KEY}_${childId}`);
    const stagesData = await AsyncStorage.getItem(`${STAGES_DATA_KEY}_${childId}`);
    const userStatsData = await AsyncStorage.getItem(`${USER_STATS_KEY}_${childId}`);

    // Ensure LUGANDA_STAGES is used as a fallback and not mutated directly
    const defaultStages = JSON.parse(JSON.stringify(LUGANDA_STAGES)); // Deep copy for default

    return {
      totalScore: scoreData ? parseInt(scoreData) : 0,
      completedLevels: completedLevelsData ? JSON.parse(completedLevelsData) : [],
      stages: stagesData ? JSON.parse(stagesData) : defaultStages,
      userStats: userStatsData ? JSON.parse(userStatsData) : { ...DEFAULT_USER_STATS }, // Return a copy of default
    };
  } catch (error) {
    console.error('Error loading game progress', error);
    const defaultStages = JSON.parse(JSON.stringify(LUGANDA_STAGES));
    return {
      totalScore: 0,
      completedLevels: [],
      stages: defaultStages,
      userStats: { ...DEFAULT_USER_STATS }
    };
  }
};

// Save user's game progress
export const saveGameProgress = async (
  totalScore: number,
  completedLevels: number[],
  stages: Stage[],
  userStats: UserStats,
  childId: string
) => {
  try {
    await AsyncStorage.setItem(`${SCORE_KEY}_${childId}`, totalScore.toString());
    await AsyncStorage.setItem(`${COMPLETED_LEVELS_KEY}_${childId}`, JSON.stringify(completedLevels));
    await AsyncStorage.setItem(`${STAGES_DATA_KEY}_${childId}`, JSON.stringify(stages)); // Ensure stages are saved correctly
    await AsyncStorage.setItem(`${USER_STATS_KEY}_${childId}`, JSON.stringify(userStats));
    return true;
  } catch (error) {
    console.error('Error saving game progress', error);
    return false;
  }
};

// Update user stats when completing a game session
export const updateUserStats = async ( // This function is good but not directly called by the fix.
                                    // The logic was integrated into completeLevelAndUpdateProgress.
  correctAnswers: number,
  wrongAnswers: number,
  wordsLearned: number,
  childId: string
) => {
  try {
    // Get current stats
    const progress = await loadGameProgress(childId); // Use loadGameProgress to get current stats
    let userStats: UserStats = progress.userStats || { ...DEFAULT_USER_STATS }; // Use a copy of default if undefined

    // Check if the last played date was yesterday or earlier
    const lastPlayedDate = new Date(userStats.lastPlayed || 0);
    const today = new Date();
    const isNewDay =
      today.getFullYear() !== lastPlayedDate.getFullYear() ||
      today.getMonth() !== lastPlayedDate.getMonth() ||
      today.getDate() !== lastPlayedDate.getDate();

    let newStreakDays = userStats.streakDays;
    if (isNewDay) {
        newStreakDays = (userStats.streakDays || 0) + 1;
    } else if ((userStats.streakDays || 0) === 0) {
        newStreakDays = 1;
    }


    // Update stats
    const updatedUserStats: UserStats = { // Create a new object
      totalWords: (userStats.totalWords || 0) + wordsLearned,
      correctAnswers: (userStats.correctAnswers || 0) + correctAnswers,
      wrongAnswers: (userStats.wrongAnswers || 0) + wrongAnswers,
      lastPlayed: today.toISOString(),
      streakDays: newStreakDays
    };

    // Save updated stats
    await AsyncStorage.setItem(`${USER_STATS_KEY}_${childId}`, JSON.stringify(updatedUserStats));
    return updatedUserStats;
  } catch (error) {
    console.error('Error updating user stats', error);
    return null;
  }
};


// Reset all game progress (for testing or user-requested reset)
export const resetGameProgress = async (childId: string) => {
  try {
    await AsyncStorage.removeItem(`${SCORE_KEY}_${childId}`);
    await AsyncStorage.removeItem(`${COMPLETED_LEVELS_KEY}_${childId}`);
    await AsyncStorage.removeItem(`${STAGES_DATA_KEY}_${childId}`);
    await AsyncStorage.removeItem(`${USER_STATS_KEY}_${childId}`);
    return true;
  } catch (error) {
    console.error('Error resetting game progress', error);
    return false;
  }
};

// --- IMPORTANT: Ensure unlock functions are pure if used from here ---
// The versions from lugandawords.ts should be preferred if they are pure.
// If these are kept, they also need to be pure (non-mutating).

// Check and unlock next level in a stage (PURE FUNCTION - Example)
export const unlockNextLevel = (
  currentStageId: number,
  currentLevelId: number,
  stages: Stage[]
): Stage[] => {
  return stages.map(stage => {
    if (stage.id === currentStageId) {
      return {
        ...stage,
        levels: stage.levels.map((level, index, arr) => {
          if (level.id === currentLevelId && index < arr.length - 1) {
            // This only marks the *next* level for unlocking based on current logic.
            // The actual unlock should be done on a deep copy.
            // To be truly pure, we return a new level object for the next one.
            // However, this function as structured here only finds the *current* level.
            // The logic in `lugandawords.ts` is better for this.
            // This function's purpose here is less clear if `lugandawords.ts` handles it.
            // For now, let's assume this is just an example and might not be used.
            // If it IS used, it needs to be made pure like the lugandawords.ts version.
            return level; // No change to current level
          }
          // If this is the level *after* the current one
          if (arr[index-1]?.id === currentLevelId && level.isLocked){
            return {...level, isLocked: false};
          }
          return level;
        })
      };
    }
    return stage;
  });
  // This version is more complex to make pure if it's directly unlocking.
  // The `lugandawords.ts` version is simpler for this task.
  // I'll keep the original simpler (but potentially mutating if not careful) version for now,
  // assuming the pure versions from `lugandawords.ts` are used in the component.
  const originalLogicStages = [...stages]; // Shallow copy
  const stageIndex = originalLogicStages.findIndex(stage => stage.id === currentStageId);

  if (stageIndex === -1) return originalLogicStages;

  const currentStage = {...originalLogicStages[stageIndex], levels: [...originalLogicStages[stageIndex].levels.map(l => ({...l}))]}; // Deeper copy of target stage
  const currentLevelIndex = currentStage.levels.findIndex(level => level.id === currentLevelId);

  if (currentLevelIndex !== -1 && currentLevelIndex < currentStage.levels.length - 1) {
    currentStage.levels[currentLevelIndex + 1].isLocked = false; // Mutates the copied level
    originalLogicStages[stageIndex] = currentStage; // Put the modified copy back
  }
  return originalLogicStages;
};

// Check if stage is completed and unlock next stage if applicable (PURE FUNCTION - Example)
export const checkAndUnlockNextStage = (
  currentStageId: number,
  completedLevels: number[],
  totalScore: number,
  stages: Stage[]
): Stage[] => {
  // Make pure:
  const updatedStages = stages.map(s => ({
    ...s,
    levels: s.levels.map(l => ({...l}))
  }));

  const currentStageIndex = updatedStages.findIndex(stage => stage.id === currentStageId);

  if (currentStageIndex === -1 || currentStageIndex >= updatedStages.length - 1) {
    return updatedStages;
  }

  const currentStage = updatedStages[currentStageIndex];
  const nextStage = updatedStages[currentStageIndex + 1];

  const allLevelsCompleted = currentStage.levels.every(level =>
    completedLevels.includes(level.id)
  );

  const hasEnoughScore = totalScore >= nextStage.requiredScore;

  if (allLevelsCompleted && hasEnoughScore) {
    nextStage.isLocked = false;
    if (nextStage.levels.length > 0) {
      nextStage.levels[0].isLocked = false;
    }
  }
  return updatedStages;
};