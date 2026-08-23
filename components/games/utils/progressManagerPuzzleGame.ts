import AsyncStorage from '@react-native-async-storage/async-storage';

export interface PuzzleGameProgress {
  contentRevision?: string;
  languageCode?: string;
  completedPuzzleIds: number[]; // Store IDs of unique puzzles completed
  totalGamesPlayed: number;     // Overall count of games started/played
  childId: string;
}

export const DEFAULT_PUZZLE_PROGRESS: PuzzleGameProgress = {
  completedPuzzleIds: [],
  totalGamesPlayed: 0,
  childId: 'default',
};

const getStorageKey = (childId: string, languageCode?: string): string => {
  return languageCode
    ? `@BabySteps:PuzzleGameProgress:${childId}:${languageCode}`
    : `@BabySteps:PuzzleGameProgress:${childId}`;
};

export const loadPuzzleProgress = async (
  childId: string,
  languageCode?: string,
  contentRevision?: string,
): Promise<PuzzleGameProgress> => {
  if (!childId) return { ...DEFAULT_PUZZLE_PROGRESS, childId: 'default' };
  try {
    const key = getStorageKey(childId, languageCode);
    const savedData = await AsyncStorage.getItem(key);
    if (savedData) {
      const parsed = JSON.parse(savedData) as PuzzleGameProgress;
      if (
        parsed.childId === childId &&
        (!languageCode || parsed.languageCode === languageCode) &&
        (!contentRevision || parsed.contentRevision === contentRevision)
      ) {
        return parsed;
      }
    }
    return {
      ...DEFAULT_PUZZLE_PROGRESS,
      childId,
      languageCode,
      contentRevision,
    }; // Return a copy
  } catch (error) {
    console.error('Failed to load puzzle game progress:', error);
    return {
      ...DEFAULT_PUZZLE_PROGRESS,
      childId,
      languageCode,
      contentRevision,
    }; // Return a copy
  }
};

export const savePuzzleProgress = async (
  progress: PuzzleGameProgress,
  childId: string,
  languageCode?: string,
  contentRevision?: string,
): Promise<void> => {
  if (!childId) return;
  try {
    const key = getStorageKey(childId, languageCode);
    await AsyncStorage.setItem(
      key,
      JSON.stringify({
        ...progress,
        childId,
        languageCode,
        contentRevision,
      }),
    );
  } catch (error) {
    console.error('Failed to save puzzle game progress:', error);
    throw error;
  }
};
