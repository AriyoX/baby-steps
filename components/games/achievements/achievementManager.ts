import { supabase } from '@/lib/supabase';
import { AchievementDefinition, ChildAchievement } from './achievementTypes';
import { UserStats as LugandaLearningUserStats } from '../utils/progressManagerLugandaLearning'; 
import { CountingGameProgress, saveGameProgress } from '../utils/progressManagerCountingGame'; 
import { WordGameProgress } from '../utils/progressManagerWordGame'; 
import { PuzzleGameProgress } from '../utils/progressManagerPuzzleGame';

// --- Supabase Functions ---

export const fetchAllDefinedAchievements = async (gameKey?: string): Promise<AchievementDefinition[]> => {
  let query = supabase.from('achievements').select('*');
  if (gameKey) {
    query = query.eq('game_key', gameKey);
  }
  query = query.order('points', { ascending: true });
  const { data, error } = await query;
  if (error) {
    console.error('Error fetching defined achievements:', error);
    return [];
  }
  return data || [];
};

export const fetchChildEarnedAchievements = async (childId: string): Promise<ChildAchievement[]> => {
  if (!childId) return [];
  const { data, error } = await supabase
    .from('child_achievements')
    .select('*')
    .eq('child_id', childId);

  if (error) {
    console.error('Error fetching child achievements:', error);
    return [];
  }
  return data || [];
};

export const awardAchievementToChild = async (
  childId: string,
  achievementId: string
): Promise<ChildAchievement | null> => {
  if (!childId || !achievementId) return null;

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
        const existing = await supabase.from('child_achievements').select('*').eq('child_id', childId).eq('achievement_id', achievementId).single();
        return existing.data;
    }
    return null;
  }
  console.log('Achievement awarded:', data);
  return data;
};


// --- Logic for Checking and Granting ---

interface GameSpecificProgress {
    // For Luganda Learning Game
    totalScore?: number;
    completedLevels?: number[]; // IDs of completed levels
    completedStages?: number[]; // IDs of completed stages (derived or explicitly tracked)
    userStats?: LugandaLearningUserStats; // from LugandaLearningGame's progress
}

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
      ;
      
    gameKey: string; // e.g., 'luganda_learning_game', 'counting_game'
    // Game-specific data carried by the event
    levelId?: number;
    stageId?: number;
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

    if (shouldAward) {
      const awarded = await awardAchievementToChild(childId, achDef.id);
      if (awarded) {
        newlyEarned.push(achDef);
      }
    }
  }
  return newlyEarned;
};