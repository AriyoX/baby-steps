// progressManager.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LearningGameStage } from '@/content/contentRepository';

// Keys for AsyncStorage
const SCORE_KEY = 'learning_total_score';
const COMPLETED_LEVELS_KEY = 'learning_completed_levels';
const STAGES_DATA_KEY = 'learning_stages';
const USER_STATS_KEY = 'learning_user_stats';

const LEGACY_SCORE_KEY = 'luganda_total_score';
const LEGACY_COMPLETED_LEVELS_KEY = 'luganda_completed_levels';
const LEGACY_STAGES_DATA_KEY = 'luganda_stages';
const LEGACY_USER_STATS_KEY = 'luganda_user_stats';

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

const getStorageKey = (baseKey: string, childId: string, languageCode: string) =>
  `${baseKey}_${childId}_${languageCode}`;

const getLegacyStorageKey = (baseKey: string, childId: string) =>
  `${baseKey}_${childId}`;

const cloneStages = (stages: LearningGameStage[]): LearningGameStage[] =>
  JSON.parse(JSON.stringify(stages));

// Load user's game progress
export const loadGameProgress = async (
  childId: string,
  languageCode: string,
  defaultStages: LearningGameStage[]
) => {
  try {
    let scoreData = await AsyncStorage.getItem(getStorageKey(SCORE_KEY, childId, languageCode));
    let completedLevelsData = await AsyncStorage.getItem(getStorageKey(COMPLETED_LEVELS_KEY, childId, languageCode));
    let stagesData = await AsyncStorage.getItem(getStorageKey(STAGES_DATA_KEY, childId, languageCode));
    let userStatsData = await AsyncStorage.getItem(getStorageKey(USER_STATS_KEY, childId, languageCode));

    if (!scoreData && !completedLevelsData && !stagesData && languageCode === 'lg') {
      scoreData = await AsyncStorage.getItem(getLegacyStorageKey(LEGACY_SCORE_KEY, childId));
      completedLevelsData = await AsyncStorage.getItem(getLegacyStorageKey(LEGACY_COMPLETED_LEVELS_KEY, childId));
      stagesData = await AsyncStorage.getItem(getLegacyStorageKey(LEGACY_STAGES_DATA_KEY, childId));
      userStatsData = await AsyncStorage.getItem(getLegacyStorageKey(LEGACY_USER_STATS_KEY, childId));

      if (scoreData || completedLevelsData || stagesData || userStatsData) {
        console.log('Using explicit legacy Luganda learning progress keys');
      }
    }

    const fallbackStages = cloneStages(defaultStages);

    return {
      totalScore: scoreData ? parseInt(scoreData) : 0,
      completedLevels: completedLevelsData ? JSON.parse(completedLevelsData) : [],
      stages: stagesData ? JSON.parse(stagesData) : fallbackStages,
      userStats: userStatsData ? JSON.parse(userStatsData) : { ...DEFAULT_USER_STATS }, // Return a copy of default
    };
  } catch (error) {
    console.error('Error loading game progress', error);
    return {
      totalScore: 0,
      completedLevels: [],
      stages: cloneStages(defaultStages),
      userStats: { ...DEFAULT_USER_STATS }
    };
  }
};

// Save user's game progress
export const saveGameProgress = async (
  totalScore: number,
  completedLevels: number[],
  stages: LearningGameStage[],
  userStats: UserStats,
  childId: string,
  languageCode: string
) => {
  try {
    await AsyncStorage.setItem(getStorageKey(SCORE_KEY, childId, languageCode), totalScore.toString());
    await AsyncStorage.setItem(getStorageKey(COMPLETED_LEVELS_KEY, childId, languageCode), JSON.stringify(completedLevels));
    await AsyncStorage.setItem(getStorageKey(STAGES_DATA_KEY, childId, languageCode), JSON.stringify(stages));
    await AsyncStorage.setItem(getStorageKey(USER_STATS_KEY, childId, languageCode), JSON.stringify(userStats));
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
  childId: string,
  languageCode: string,
  defaultStages: LearningGameStage[] = []
) => {
  try {
    // Get current stats
    const progress = await loadGameProgress(childId, languageCode, defaultStages); // Use loadGameProgress to get current stats
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
    await AsyncStorage.setItem(getStorageKey(USER_STATS_KEY, childId, languageCode), JSON.stringify(updatedUserStats));
    return updatedUserStats;
  } catch (error) {
    console.error('Error updating user stats', error);
    return null;
  }
};


// Reset all game progress (for testing or user-requested reset)
export const resetGameProgress = async (childId: string, languageCode: string) => {
  try {
    await AsyncStorage.removeItem(getStorageKey(SCORE_KEY, childId, languageCode));
    await AsyncStorage.removeItem(getStorageKey(COMPLETED_LEVELS_KEY, childId, languageCode));
    await AsyncStorage.removeItem(getStorageKey(STAGES_DATA_KEY, childId, languageCode));
    await AsyncStorage.removeItem(getStorageKey(USER_STATS_KEY, childId, languageCode));
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
  stages: LearningGameStage[]
): LearningGameStage[] => {
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
};

// Check if stage is completed and unlock next stage if applicable (PURE FUNCTION - Example)
export const checkAndUnlockNextStage = (
  currentStageId: number,
  completedLevels: number[],
  totalScore: number,
  stages: LearningGameStage[]
): LearningGameStage[] => {
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
