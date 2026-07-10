import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import type { AchievementDefinition, ChildAchievement } from './achievementTypes';
import type { UserStats as LugandaLearningUserStats } from '../utils/progressManagerLugandaLearning'; 
import type { WordGameProgress } from '../utils/progressManagerWordGame'; 
import type { PuzzleGameProgress } from '../utils/progressManagerPuzzleGame';

// --- Supabase Functions ---

export const ACHIEVEMENT_DEFINITIONS_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
export const CHILD_ACHIEVEMENTS_CACHE_TTL_MS = 15 * 60 * 1000;
export const LEARNING_HUB_GAME_KEY = 'learning_hub';

export const LEARNING_HUB_ACHIEVEMENT_IDS = {
  FIRST_LEARNING_STEP: '7d4f6a00-4b5f-4e00-9a10-000000000101',
  LEARNING_STARTER: '7d4f6a00-4b5f-4e00-9a10-000000000102',
  FIRST_WORDS_EXPLORER: '7d4f6a00-4b5f-4e00-9a10-000000000103',
  QUIZ_HELPER: '7d4f6a00-4b5f-4e00-9a10-000000000104',
  STORY_LISTENER: '7d4f6a00-4b5f-4e00-9a10-000000000105',
} as const;

export const LEARNING_HUB_ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    id: LEARNING_HUB_ACHIEVEMENT_IDS.FIRST_LEARNING_STEP,
    name: 'First Learning Step',
    description: 'You finished your first Learning Hub lesson.',
    icon_name: 'footsteps-outline',
    activity_type: 'learning_hub_first_lesson',
    points: 10,
    trigger_value: null,
    game_key: LEARNING_HUB_GAME_KEY,
  },
  {
    id: LEARNING_HUB_ACHIEVEMENT_IDS.LEARNING_STARTER,
    name: 'Learning Starter',
    description: 'You completed 3 Learning Hub lessons.',
    icon_name: 'school-outline',
    activity_type: 'learning_hub_lessons_completed',
    points: 15,
    trigger_value: 3,
    game_key: LEARNING_HUB_GAME_KEY,
  },
  {
    id: LEARNING_HUB_ACHIEVEMENT_IDS.FIRST_WORDS_EXPLORER,
    name: 'First Words Explorer',
    description: 'You completed every startable First Words lesson.',
    icon_name: 'ribbon-outline',
    activity_type: 'learning_hub_first_words_complete',
    points: 25,
    trigger_value: null,
    game_key: LEARNING_HUB_GAME_KEY,
  },
  {
    id: LEARNING_HUB_ACHIEVEMENT_IDS.QUIZ_HELPER,
    name: 'Quiz Helper',
    description: 'You finished a Learning Hub quiz lesson.',
    icon_name: 'help-circle-outline',
    activity_type: 'learning_hub_mini_quiz_lesson',
    points: 15,
    trigger_value: null,
    game_key: LEARNING_HUB_GAME_KEY,
  },
  {
    id: LEARNING_HUB_ACHIEVEMENT_IDS.STORY_LISTENER,
    name: 'Story Listener',
    description: 'You finished a Learning Hub story bite.',
    icon_name: 'book-outline',
    activity_type: 'learning_hub_story_bite_lesson',
    points: 15,
    trigger_value: null,
    game_key: LEARNING_HUB_GAME_KEY,
  },
];

const CACHE_VERSION = 1;
const ACHIEVEMENT_DEFINITIONS_CACHE_KEY = 'cache:achievements:definitions';
const CHILD_ACHIEVEMENTS_CACHE_PREFIX = 'cache:child_achievements';

type CacheEntry<T> = {
  version: number;
  loadedAt: number;
  data: T;
};

type CacheOptions = {
  forceRefresh?: boolean;
  maxAgeMs?: number;
};

const achievementDefinitionMemoryCache = new Map<string, CacheEntry<AchievementDefinition[]>>();
const childAchievementMemoryCache = new Map<string, CacheEntry<ChildAchievement[]>>();
const achievementBackgroundRefreshes = new Map<string, Promise<void>>();

export const getAchievementDefinitionsCacheKey = (): string =>
  ACHIEVEMENT_DEFINITIONS_CACHE_KEY;

export const getChildAchievementsCacheKey = (childId: string): string =>
  `${CHILD_ACHIEVEMENTS_CACHE_PREFIX}:${encodeURIComponent(childId)}`;

const parseCacheEntry = <T,>(
  value: string | null,
  isValidData: (data: unknown) => data is T,
): CacheEntry<T> | undefined => {
  if (!value) return undefined;

  try {
    const parsed = JSON.parse(value) as Partial<CacheEntry<unknown>>;
    if (
      parsed.version !== CACHE_VERSION ||
      typeof parsed.loadedAt !== 'number' ||
      !isValidData(parsed.data)
    ) {
      return undefined;
    }

    return parsed as CacheEntry<T>;
  } catch (error) {
    console.warn('Could not parse achievement cache entry.', error);
    return undefined;
  }
};

const isCacheFresh = <T,>(entry: CacheEntry<T>, maxAgeMs: number): boolean =>
  Date.now() - entry.loadedAt <= maxAgeMs;

const readCacheEntry = async <T,>(
  key: string,
  memoryCache: Map<string, CacheEntry<T>>,
  maxAgeMs: number,
  isValidData: (data: unknown) => data is T,
  allowExpired = false,
): Promise<CacheEntry<T> | undefined> => {
  const memoryEntry = memoryCache.get(key);
  if (memoryEntry && (allowExpired || isCacheFresh(memoryEntry, maxAgeMs))) {
    return memoryEntry;
  }

  try {
    const storedEntry = parseCacheEntry(
      await AsyncStorage.getItem(key),
      isValidData,
    );

    if (!storedEntry) {
      return undefined;
    }

    memoryCache.set(key, storedEntry);

    if (!allowExpired && !isCacheFresh(storedEntry, maxAgeMs)) {
      return undefined;
    }

    return storedEntry;
  } catch (error) {
    console.warn('Could not read achievement cache entry.', error);
    return undefined;
  }
};

const writeCacheEntry = async <T,>(
  key: string,
  memoryCache: Map<string, CacheEntry<T>>,
  data: T,
): Promise<void> => {
  const entry: CacheEntry<T> = {
    version: CACHE_VERSION,
    loadedAt: Date.now(),
    data,
  };

  memoryCache.set(key, entry);

  try {
    await AsyncStorage.setItem(key, JSON.stringify(entry));
  } catch (error) {
    console.warn('Could not write achievement cache entry.', error);
  }
};

const isAchievementDefinitions = (data: unknown): data is AchievementDefinition[] =>
  Array.isArray(data);

const isChildAchievements = (data: unknown): data is ChildAchievement[] =>
  Array.isArray(data);

const filterDefinitionsByGameKey = (
  definitions: AchievementDefinition[],
  gameKey?: string,
): AchievementDefinition[] =>
  gameKey
    ? definitions.filter((achievement) => achievement.game_key === gameKey)
    : definitions;

const mergeBuiltInAchievementDefinitions = (
  definitions: AchievementDefinition[],
): AchievementDefinition[] => {
  const merged = new Map<string, AchievementDefinition>();

  LEARNING_HUB_ACHIEVEMENT_DEFINITIONS.forEach((achievement) => {
    merged.set(achievement.id, achievement);
  });
  definitions.forEach((achievement) => {
    merged.set(achievement.id, achievement);
  });

  return [...merged.values()].sort(
    (first, second) =>
      first.points - second.points ||
      (first.game_key ?? '').localeCompare(second.game_key ?? '') ||
      first.name.localeCompare(second.name),
  );
};

const fetchAchievementDefinitionsFromRemote = async (): Promise<AchievementDefinition[]> => {
  const query = supabase.from('achievements').select('*').order('points', { ascending: true });
  const { data, error } = await query;
  if (error) {
    throw error;
  }
  return data || [];
};

const refreshAchievementDefinitionsInBackground = (): void => {
  const key = getAchievementDefinitionsCacheKey();
  if (achievementBackgroundRefreshes.has(key)) return;

  const refresh = fetchAchievementDefinitionsFromRemote()
    .then((definitions) =>
      writeCacheEntry(
        key,
        achievementDefinitionMemoryCache,
        mergeBuiltInAchievementDefinitions(definitions),
      ),
    )
    .catch((error) => {
      console.warn('Could not refresh achievement definitions cache.', error);
    })
    .then(() => undefined)
    .finally(() => {
      achievementBackgroundRefreshes.delete(key);
    });

  achievementBackgroundRefreshes.set(key, refresh);
};

const fetchChildAchievementsFromRemote = async (childId: string): Promise<ChildAchievement[]> => {
  if (!childId) return [];
  const { data, error } = await supabase
    .from('child_achievements')
    .select('*')
    .eq('child_id', childId);

  if (error) {
    throw error;
  }
  return data || [];
};

const fetchExistingChildAchievementFromRemote = async (
  childId: string,
  achievementId: string,
): Promise<ChildAchievement | null> => {
  const { data, error } = await supabase
    .from('child_achievements')
    .select('*')
    .eq('child_id', childId)
    .eq('achievement_id', achievementId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as ChildAchievement | null) ?? null;
};

const refreshChildAchievementsInBackground = (childId: string): void => {
  const key = getChildAchievementsCacheKey(childId);
  if (achievementBackgroundRefreshes.has(key)) return;

  const refresh = fetchChildAchievementsFromRemote(childId)
    .then((achievements) =>
      writeCacheEntry(key, childAchievementMemoryCache, achievements),
    )
    .catch((error) => {
      console.warn(`Could not refresh child achievements cache for ${childId}.`, error);
    })
    .then(() => undefined)
    .finally(() => {
      achievementBackgroundRefreshes.delete(key);
    });

  achievementBackgroundRefreshes.set(key, refresh);
};

export const clearAchievementCaches = async (childId?: string): Promise<void> => {
  if (childId) {
    const key = getChildAchievementsCacheKey(childId);
    childAchievementMemoryCache.delete(key);
    await AsyncStorage.removeItem(key);
    return;
  }

  achievementDefinitionMemoryCache.clear();
  childAchievementMemoryCache.clear();
  achievementBackgroundRefreshes.clear();

  const keys = await AsyncStorage.getAllKeys();
  await AsyncStorage.multiRemove(
    keys.filter(
      (key) =>
        key === ACHIEVEMENT_DEFINITIONS_CACHE_KEY ||
        key.startsWith(`${CHILD_ACHIEVEMENTS_CACHE_PREFIX}:`),
    ),
  );
};

export const invalidateChildAchievementsCache = async (
  childId: string,
): Promise<void> => {
  if (!childId) return;

  const key = getChildAchievementsCacheKey(childId);
  childAchievementMemoryCache.delete(key);
  await AsyncStorage.removeItem(key);
};

const cacheAwardedChildAchievement = async (
  childId: string,
  achievement: ChildAchievement,
): Promise<void> => {
  const key = getChildAchievementsCacheKey(childId);
  const current = await readCacheEntry(
    key,
    childAchievementMemoryCache,
    CHILD_ACHIEVEMENTS_CACHE_TTL_MS,
    isChildAchievements,
    true,
  );
  const existing = current?.data ?? [];
  const next = existing.some((item) => item.achievement_id === achievement.achievement_id)
    ? existing.map((item) =>
        item.achievement_id === achievement.achievement_id ? achievement : item,
      )
    : [...existing, achievement];

  await writeCacheEntry(key, childAchievementMemoryCache, next);
};

export const fetchAllDefinedAchievements = async (
  gameKey?: string,
  options: CacheOptions = {},
): Promise<AchievementDefinition[]> => {
  const maxAgeMs = options.maxAgeMs ?? ACHIEVEMENT_DEFINITIONS_CACHE_TTL_MS;
  const key = getAchievementDefinitionsCacheKey();

  if (!options.forceRefresh) {
    const cached = await readCacheEntry(
      key,
      achievementDefinitionMemoryCache,
      maxAgeMs,
      isAchievementDefinitions,
    );

    if (cached) {
      return filterDefinitionsByGameKey(
        mergeBuiltInAchievementDefinitions(cached.data),
        gameKey,
      );
    }

    const staleCached = await readCacheEntry(
      key,
      achievementDefinitionMemoryCache,
      maxAgeMs,
      isAchievementDefinitions,
      true,
    );

    if (staleCached) {
      refreshAchievementDefinitionsInBackground();
      return filterDefinitionsByGameKey(
        mergeBuiltInAchievementDefinitions(staleCached.data),
        gameKey,
      );
    }
  }

  try {
    const definitions = mergeBuiltInAchievementDefinitions(
      await fetchAchievementDefinitionsFromRemote(),
    );
    await writeCacheEntry(key, achievementDefinitionMemoryCache, definitions);
    return filterDefinitionsByGameKey(definitions, gameKey);
  } catch (error) {
    console.error('Error fetching defined achievements:', error);
    const cached = await readCacheEntry(
      key,
      achievementDefinitionMemoryCache,
      maxAgeMs,
      isAchievementDefinitions,
      true,
    );
    return filterDefinitionsByGameKey(
      mergeBuiltInAchievementDefinitions(cached?.data ?? []),
      gameKey,
    );
  }
};

export const fetchChildEarnedAchievements = async (
  childId: string,
  options: CacheOptions = {},
): Promise<ChildAchievement[]> => {
  if (!childId) return [];

  const maxAgeMs = options.maxAgeMs ?? CHILD_ACHIEVEMENTS_CACHE_TTL_MS;
  const key = getChildAchievementsCacheKey(childId);

  if (!options.forceRefresh) {
    const cached = await readCacheEntry(
      key,
      childAchievementMemoryCache,
      maxAgeMs,
      isChildAchievements,
    );

    if (cached) {
      return cached.data;
    }

    const staleCached = await readCacheEntry(
      key,
      childAchievementMemoryCache,
      maxAgeMs,
      isChildAchievements,
      true,
    );

    if (staleCached) {
      refreshChildAchievementsInBackground(childId);
      return staleCached.data;
    }
  }

  try {
    const achievements = await fetchChildAchievementsFromRemote(childId);
    await writeCacheEntry(key, childAchievementMemoryCache, achievements);
    return achievements;
  } catch (error) {
    console.error('Error fetching child achievements:', error);
    const cached = await readCacheEntry(
      key,
      childAchievementMemoryCache,
      maxAgeMs,
      isChildAchievements,
      true,
    );
    return cached?.data ?? [];
  }
};

export const awardAchievementToChild = async (
  childId: string,
  achievementId: string
): Promise<ChildAchievement | null> => {
  if (!childId || !achievementId) return null;

  const cachedEarned = await fetchChildEarnedAchievements(childId);
  const alreadyEarned = cachedEarned.find(
    (achievement) => achievement.achievement_id === achievementId,
  );
  if (alreadyEarned) {
    return alreadyEarned;
  }

  let remoteAlreadyEarned: ChildAchievement | null = null;
  try {
    remoteAlreadyEarned = await fetchExistingChildAchievementFromRemote(
      childId,
      achievementId,
    );
  } catch (error) {
    console.error('Error checking existing child achievement:', error);
    return null;
  }

  if (remoteAlreadyEarned) {
    await cacheAwardedChildAchievement(childId, remoteAlreadyEarned);
    return remoteAlreadyEarned;
  }

  const { data, error } = await supabase
    .from('child_achievements')
    .insert([{ child_id: childId, achievement_id: achievementId }])
    .select()
    .single(); 

  if (error) {
    console.error('Error awarding achievement:', error);
    // Check for unique constraint violation specifically if you added it
    if (error.code === '23505') { // PostgreSQL unique violation error code
        console.warn(`Attempted to award already earned achievement (ID: ${achievementId}) to child ${childId}. Constraint prevented duplicate.`);
        // Find the existing record to return, so the calling function thinks it "succeeded" in a way
        const existing = await fetchExistingChildAchievementFromRemote(
          childId,
          achievementId,
        );
        if (existing) {
          await cacheAwardedChildAchievement(childId, existing);
        }
        return existing;
    }
    return null;
  }
  await cacheAwardedChildAchievement(childId, data as ChildAchievement);
  return data;
};


// --- Logic for Checking and Granting ---

interface CheckAchievementsArgs {
  childId: string;
  // gameProgress: any; // Or a union type of all possible game progress structures
  definedAchievements: AchievementDefinition[];
  earnedAchievementIds: string[];
  event: {
    type: // General event types
      | 'level_completed'
      | 'stage_completed'
      | 'score_updated'
      | 'stats_updated' // For things like total words, streak
      | 'level_perfect_clear'
      // Card Matching Game Specific Event Types
      | 'match_made'
      | 'game_completed' // For card matching
      | 'match_streak_achieved'
      // Word Game Specific Event Types
      | 'word_game_level_just_completed' // Different from generic level_completed if needed
      | 'word_game_stats_updated' // For score, completed levels count
      | 'puzzle_game_started' // For first play
      | 'puzzle_game_completed_successfully' // For any completion, specific completion, low moves, quick time
      | 'puzzle_game_stats_updated'
      | 'learning_hub_lesson_completed'
      ;
      
    gameKey: string; // e.g., 'luganda_learning_game', 'counting_game'
    // Game-specific data carried by the event
    levelId?: number | string;
    stageId?: number | string;
    lessonId?: string;
    languageCode?: string;
    newTotalScore?: number;
    currentLevelScore?: number; // for perfect clear
    currentLevelMaxScore?: number; // for perfect clear
    currentUserStats?: LugandaLearningUserStats; // For Luganda Learning game
    // Card Matching Game specific event data
    moves?: number;                       // For game_completed, matching_game_low_moves
    durationSeconds?: number;             // For game_completed, matching_game_quick_time
    matchedCardValue?: string;            // For match_made, matching_game_specific_match
    streakCount?: number;                 // For matching_game_match_streak
    totalPairsMatchedAcrossGames?: number; // For matching_game_total_pairs (if tracked)
    // Word Game specific event data
    levelIndex?: number; // The index of the level just completed
    wordGameProgress?: WordGameProgress; // Current progress state of the word game
    allLevelsInGameCount?: number; // Total number of levels available in the word game
    hintUsedThisLevel?: boolean; // For 'word_game_level_no_hint'
    consecutiveLevelsCompleted?: number; // For 'word_game_consecutive_levels'
    // Puzzle Game specific event data
    puzzleId?: number; // ID of the puzzle (e.g., 1 for Kasubi Tombs)
    movesTaken?: number;
    durationInSeconds?: number;
    puzzleGameProgress?: PuzzleGameProgress; // Current state of completed unique puzzles, games played
    totalUniquePuzzlesAvailable?: number;
    // Learning Hub specific event data
    completedLessonCount?: number;
    completedLessonIds?: string[];
    stageStartableLessonIds?: string[];
    mechanicTypes?: string[];
  };
}

/**
 * Checks for and awards new achievements.
 * Returns an array of newly earned achievements.
 */
export const checkAndGrantNewAchievements = async ({
  childId,
  // gameProgress, // We'll primarily use event.gameData
  definedAchievements,
  earnedAchievementIds,
  event,
}: CheckAchievementsArgs): Promise<AchievementDefinition[]> => {
  const newlyEarned: AchievementDefinition[] = [];
  
  // Filter definedAchievements to only those matching the event's gameKey
  const gameSpecificDefinedAchievements = definedAchievements.filter(
    achDef => achDef.game_key === event.gameKey || !achDef.game_key // Also include generic achievements if any
  );

  for (const achDef of gameSpecificDefinedAchievements) {
    if (earnedAchievementIds.includes(achDef.id)) {
      continue; // Already earned
    }

    let shouldAward = false;

    // Logic for Luganda Learning Game achievements
    if (event.gameKey === 'luganda_learning_game') {
      switch (achDef.activity_type) {
        case 'language_level_complete':
          // Assuming levelId and trigger_value are numbers for this type
          if (event.type === 'level_completed' && event.levelId === Number(achDef.trigger_value)) {
            shouldAward = true;
          }
          break;
        case 'language_stage_complete':
          // Assuming stageId and trigger_value are numbers for this type
          if (event.type === 'stage_completed' && event.stageId === Number(achDef.trigger_value)) {
            shouldAward = true;
          }
          break;
        case 'language_total_words_learned':
          if (event.currentUserStats?.totalWords !== undefined && 
              achDef.trigger_value !== null && achDef.trigger_value !== undefined &&
              event.currentUserStats.totalWords >= Number(achDef.trigger_value)) { // Convert to Number
            shouldAward = true;
          }
          break;
        case 'language_total_score_reach':
          if (event.newTotalScore !== undefined && 
              achDef.trigger_value !== null && achDef.trigger_value !== undefined &&
              event.newTotalScore >= Number(achDef.trigger_value)) { // Convert to Number
            shouldAward = true;
          }
          break;
        case 'language_level_perfect_quiz':
            if (event.type === 'level_perfect_clear' && event.currentLevelScore !== undefined && event.currentLevelMaxScore !== undefined && event.currentLevelScore === event.currentLevelMaxScore) {
                if (achDef.trigger_value === null || achDef.trigger_value === undefined || Number(achDef.trigger_value) === event.levelId) { // Also convert here if trigger_value can be a level ID
                    shouldAward = true;
                }
            }
            break;
        case 'language_streak_days':
          if (event.currentUserStats?.streakDays !== undefined && 
              achDef.trigger_value !== null && achDef.trigger_value !== undefined &&
              event.currentUserStats.streakDays >= Number(achDef.trigger_value)) { // Convert to Number
            shouldAward = true;
          }
          break;
      }
    }
   
    else if (event.gameKey === 'counting_game') {
        switch (achDef.activity_type) {
          case 'counting_game_stage_complete': // from your earlier code
            // Assuming trigger_value is stage ID (number)
            if (event.type === 'stage_completed' && event.stageId === Number(achDef.trigger_value)) {
              shouldAward = true;
            }
            break;
          case 'counting_game_score': // from your earlier code, ensure this matches SQL
            // Assuming trigger_value is score threshold (number)
            if (event.newTotalScore !== undefined && 
                achDef.trigger_value !== null && achDef.trigger_value !== undefined &&
                event.newTotalScore >= Number(achDef.trigger_value)) {
                shouldAward = true;
            }
            break;
          // ... other counting game cases
        }
    }

    else if (event.gameKey === 'card_matching_game') {
      switch (achDef.activity_type) {
        case 'matching_game_first_match':
          if (event.type === 'match_made') {
            shouldAward = true;
          }
          break;
        case 'matching_game_first_play':
            if (event.type === 'game_completed') {
                shouldAward = true;
            }
            break;
        case 'matching_game_complete':
          if (event.type === 'game_completed') {
            shouldAward = true;
          }
          break;
        case 'matching_game_low_moves':
          if (event.type === 'game_completed' && event.moves !== undefined && 
              achDef.trigger_value !== null && achDef.trigger_value !== undefined && // Check for null and undefined
              event.moves <= Number(achDef.trigger_value)) { // Convert to Number for comparison
            shouldAward = true;
          }
          break;
        case 'matching_game_quick_time':
          if (event.type === 'game_completed' && event.durationSeconds !== undefined && 
              achDef.trigger_value !== null && achDef.trigger_value !== undefined && 
              event.durationSeconds <= Number(achDef.trigger_value)) { // Convert to Number for comparison
            shouldAward = true;
          }
          break;
        case 'matching_game_match_streak':
          if (event.type === 'match_streak_achieved' && event.streakCount !== undefined && 
              achDef.trigger_value !== null && achDef.trigger_value !== undefined && 
              event.streakCount >= Number(achDef.trigger_value)) { // Convert to Number for comparison
            shouldAward = true;
          }
          break;
        case 'matching_game_specific_match_kabaka': // Specific activity type
          if (event.type === 'match_made' && event.matchedCardValue === 'Kabaka') {
            shouldAward = true;
          }
          break;
        // Add more specific match cases if needed:
        // case 'matching_game_specific_match_lubiri':
        //   if (event.type === 'match_made' && event.matchedCardValue === 'Lubiri') {
        //     shouldAward = true;
        //   }
        //   break;
        case 'matching_game_total_pairs':
          if (event.type === 'stats_updated' && event.totalPairsMatchedAcrossGames !== undefined && 
              achDef.trigger_value !== null && achDef.trigger_value !== undefined && 
              event.totalPairsMatchedAcrossGames >= Number(achDef.trigger_value)) { // Convert to Number for comparison
            shouldAward = true;
          }
          break;
      }
    }

    else if (event.gameKey === 'word_game') {
      switch (achDef.activity_type) {
        case 'word_game_level_complete': // For "First Word!"
          if (event.type === 'word_game_level_just_completed' && 
              event.levelIndex === achDef.trigger_value) { // trigger_value is 0 for first level
            shouldAward = true;
          }
          break;
        case 'word_game_levels_milestone':
          if (event.wordGameProgress && achDef.trigger_value !== null && achDef.trigger_value !== undefined &&
              event.wordGameProgress.completedLevels.length >= Number(achDef.trigger_value)) {
            shouldAward = true;
          }
          break;
        case 'word_game_all_levels_complete':
          if (event.type === 'game_completed' && event.wordGameProgress && event.allLevelsInGameCount &&
              event.wordGameProgress.completedLevels.length === event.allLevelsInGameCount) {
            shouldAward = true;
          }
          break;
        case 'word_game_total_score_reach':
          if (event.wordGameProgress && achDef.trigger_value !== null && achDef.trigger_value !== undefined &&
              event.wordGameProgress.totalScore >= Number(achDef.trigger_value)) {
            shouldAward = true;
          }
          break;
        case 'word_game_level_no_hint':
            if (event.type === 'word_game_level_just_completed' &&
                event.levelIndex === achDef.trigger_value &&
                event.hintUsedThisLevel === false) {
                shouldAward = true;
            }
            break;
        case 'word_game_consecutive_levels':
            if (event.type === 'word_game_level_just_completed' && // Or a specific event type like 'word_game_streak_update'
                event.consecutiveLevelsCompleted !== undefined &&
                achDef.trigger_value !== null && achDef.trigger_value !== undefined &&
                event.consecutiveLevelsCompleted >= Number(achDef.trigger_value)) {
                shouldAward = true;
            }
            break;
      }
    }

    else if (event.gameKey === 'puzzle_game') {
      switch (achDef.activity_type) {
        case 'puzzle_game_first_play':
          if (event.type === 'puzzle_game_started' && event.puzzleGameProgress?.totalGamesPlayed === 1) {
            shouldAward = true;
          }
          break;
        case 'puzzle_game_first_completion':
          // Award if a puzzle was completed AND total completed unique puzzles is now 1
          if (event.type === 'puzzle_game_completed_successfully' && event.puzzleGameProgress?.completedPuzzleIds.length === 1) {
             // Ensure the current puzzleId is indeed in completedPuzzleIds
            if (event.puzzleId !== undefined && event.puzzleGameProgress.completedPuzzleIds.includes(event.puzzleId)) {
                 shouldAward = true;
            }
          }
          break;
        case 'puzzle_game_specific_completed':
          if (event.type === 'puzzle_game_completed_successfully' && 
              event.puzzleId === achDef.trigger_value) {
            shouldAward = true;
          }
          break;
        case 'puzzle_game_low_moves':
          if (event.type === 'puzzle_game_completed_successfully' && 
              event.movesTaken !== undefined && 
              achDef.trigger_value !== null && achDef.trigger_value !== undefined &&
              event.movesTaken <= Number(achDef.trigger_value)) {
            shouldAward = true;
          }
          break;
        case 'puzzle_game_quick_time':
          if (event.type === 'puzzle_game_completed_successfully' && 
              event.durationInSeconds !== undefined && 
              achDef.trigger_value !== null && achDef.trigger_value !== undefined &&
              event.durationInSeconds <= Number(achDef.trigger_value)) {
            shouldAward = true;
          }
          break;
        case 'puzzle_game_all_unique_completed':
          if ((event.type === 'puzzle_game_completed_successfully' || event.type === 'puzzle_game_stats_updated') && 
              event.puzzleGameProgress && event.totalUniquePuzzlesAvailable !== undefined &&
              achDef.trigger_value !== null && achDef.trigger_value !== undefined && // trigger_value is the count of all unique puzzles
              event.puzzleGameProgress.completedPuzzleIds.length >= Number(achDef.trigger_value) &&
              event.puzzleGameProgress.completedPuzzleIds.length === event.totalUniquePuzzlesAvailable) {
            shouldAward = true;
          }
          break;
      }
    }

    else if (event.gameKey === LEARNING_HUB_GAME_KEY) {
      const completedLessonIds = event.completedLessonIds ?? [];
      const stageStartableLessonIds = event.stageStartableLessonIds ?? [];
      const mechanicTypes = event.mechanicTypes ?? [];

      switch (achDef.activity_type) {
        case 'learning_hub_first_lesson':
          if (event.type === 'learning_hub_lesson_completed') {
            shouldAward = true;
          }
          break;
        case 'learning_hub_lessons_completed':
          if (
            event.type === 'learning_hub_lesson_completed' &&
            event.completedLessonCount !== undefined &&
            achDef.trigger_value !== null &&
            achDef.trigger_value !== undefined &&
            event.completedLessonCount >= Number(achDef.trigger_value)
          ) {
            shouldAward = true;
          }
          break;
        case 'learning_hub_first_words_complete':
          if (
            event.type === 'learning_hub_lesson_completed' &&
            event.stageId === 'first-words' &&
            stageStartableLessonIds.length > 0 &&
            stageStartableLessonIds.every((lessonId) =>
              completedLessonIds.includes(lessonId),
            )
          ) {
            shouldAward = true;
          }
          break;
        case 'learning_hub_mini_quiz_lesson':
          if (
            event.type === 'learning_hub_lesson_completed' &&
            mechanicTypes.includes('mini_quiz')
          ) {
            shouldAward = true;
          }
          break;
        case 'learning_hub_story_bite_lesson':
          if (
            event.type === 'learning_hub_lesson_completed' &&
            mechanicTypes.includes('story_bite')
          ) {
            shouldAward = true;
          }
          break;
      }
    }

    if (shouldAward) {
      const awarded = await awardAchievementToChild(childId, achDef.id);
      if (awarded) {
        newlyEarned.push(achDef);
      }
    }
  }
  return newlyEarned;
};
