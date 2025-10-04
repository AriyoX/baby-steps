import AsyncStorage from '@react-native-async-storage/async-storage';

export interface PuzzleGameProgress {
  completedPuzzleIds: number[]; // Store IDs of unique puzzles completed
  totalGamesPlayed: number;     // Overall count of games started/played
  childId: string;
}

export const DEFAULT_PUZZLE_PROGRESS: PuzzleGameProgress = {
  completedPuzzleIds: [],
  totalGamesPlayed: 0,
  childId: 'default',
};

const getStorageKey = (childId: string): string => {
  return `@BabySteps:PuzzleGameProgress:${childId}`;
};

export const loadPuzzleProgress = async (childId: string): Promise<PuzzleGameProgress> => {
  if (!childId) return { ...DEFAULT_PUZZLE_PROGRESS, childId: 'default' };
  try {
    const key = getStorageKey(childId);
    const savedData = await AsyncStorage.getItem(key);
    if (savedData) {
      const parsed = JSON.parse(savedData) as PuzzleGameProgress;
      if (parsed.childId === childId) {
        return parsed;
      }
    }
    return { ...DEFAULT_PUZZLE_PROGRESS, childId }; // Return a copy
  } catch (error) {
    console.error('Failed to load puzzle game progress:', error);
    return { ...DEFAULT_PUZZLE_PROGRESS, childId }; // Return a copy
  }
};

export const savePuzzleProgress = async (progress: PuzzleGameProgress, childId: string): Promise<void> => {
  if (!childId) return;
  try {
    const key = getStorageKey(childId);
    await AsyncStorage.setItem(key, JSON.stringify({ ...progress, childId }));
  } catch (error) {
    console.error('Failed to save puzzle game progress:', error);
  }
};