import React, { useState, useEffect, useRef } from "react";
import {
  View,
  TouchableOpacity,
  Animated,
  useWindowDimensions,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "@/components/StyledText";
import { ChildLoadingState } from "@/components/child/ChildLoadingState";
import { useChild } from "@/context/ChildContext";  
import {
  DEFAULT_LEARNING_LANGUAGE_CODE,
  getDbLanguageCodeForLearningLanguage,
} from "@/content/languages";
import {
  loadContentBundle,
  type CardGameContent,
  type CardGameItem,
} from "@/content/contentRepository";
import { saveActivity } from "@/lib/utils";
import { 
  loadGameState, 
  saveGameState, 
  clearGameState, 
  updateTotalPairsMatched, 
  incrementGamesPlayed,
  CardGameState,
  CardGameOverallStats, // Import the type too
  CardGameStatsSaveError,
  DEFAULT_OVERALL_STATS,
} from './utils/progressManagerCardGame';
import { useAchievements } from "./achievements/useAchievements";
import { audioManager } from "@/lib/audioManager";
import { useChildNotice } from "@/context/ChildNoticeContext";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  completeLocallyFirst,
  runCompletionOnce,
  type LocalFirstCompletionResult,
  type LocalPersistenceStatus,
} from "@/lib/completionReliability";
import { getCardsMatchingGridSizing } from "./responsiveSizing";
import {
  GameHeader,
  GameStatChip,
  GameTour,
  GameTourProvider,
  TourTarget,
  useGameTour,
} from "./GameTour";

// Define card interface
interface Card {
  id: number;
  value: string;
  flipped: boolean;
  matched: boolean;
  info: string;
  imageSymbol: string;
}

// Number of card pairs to use in each game (adjust as needed)
const PAIRS_PER_GAME = 8;

export const getPlayableCardGameContent = (
  content: CardGameContent | undefined,
): CardGameContent | undefined => {
  if (
    !content ||
    typeof content.title !== "string" ||
    !content.title.trim() ||
    !Array.isArray(content.items) ||
    content.items.length < PAIRS_PER_GAME
  ) {
    return undefined;
  }

  const ids = new Set<string>();
  const values = new Set<string>();
  const orders = new Set<number>();

  for (const item of content.items) {
    if (
      typeof item.id !== "string" ||
      !item.id.trim() ||
      typeof item.value !== "string" ||
      !item.value.trim() ||
      typeof item.info !== "string" ||
      !item.info.trim() ||
      typeof item.imageSymbol !== "string" ||
      !item.imageSymbol.trim() ||
      !Number.isFinite(item.order) ||
      ids.has(item.id) ||
      values.has(item.value) ||
      orders.has(item.order)
    ) {
      return undefined;
    }

    ids.add(item.id);
    values.add(item.value);
    orders.add(item.order);
  }

  return {
    ...content,
    items: [...content.items].sort((left, right) => left.order - right.order),
  };
};

// Card gradient colors for backside based on position
const cardGradients: string[][] = [
  ["#FF9AA2", "#FFB7B2"], // Pink
  ["#FFDAC1", "#E2F0CB"], // Peach to Light Green
  ["#B5EAD7", "#C7CEEA"], // Light Teal to Light Blue
  ["#E2F0CB", "#FFDAC1"], // Light Green to Peach
  ["#C7CEEA", "#FF9AA2"], // Light Blue to Pink
  ["#FFB7B2", "#B5EAD7"], // Light Pink to Teal
];

export interface CardsMatchingPairPersistenceOptions {
  gameState: CardGameState;
  persistPairStats: () => Promise<CardGameOverallStats>;
  persistGameState: () => Promise<void>;
  revealPersistedPair: (
    result: CardsMatchingPairPersistenceResult,
    persistence: LocalPersistenceStatus,
  ) => void;
  evaluateAchievements: (
    result: CardsMatchingPairPersistenceResult,
    persistence: LocalPersistenceStatus,
  ) => Promise<void>;
  onLocalError?: (error: unknown) => void;
  onNetworkError?: (error: unknown) => void;
}

export interface CardsMatchingPairPersistenceResult {
  gameState: CardGameState;
  overallStats: CardGameOverallStats;
}

export const persistCardsMatchingPairLocallyFirst = async ({
  gameState,
  persistPairStats,
  persistGameState,
  revealPersistedPair,
  evaluateAchievements,
  onLocalError,
  onNetworkError,
}: CardsMatchingPairPersistenceOptions): Promise<
  LocalFirstCompletionResult<CardsMatchingPairPersistenceResult>
> => {
  let fallbackOverallStats = { ...DEFAULT_OVERALL_STATS };

  return completeLocallyFirst({
    persistLocal: async () => {
      let overallStats: CardGameOverallStats;
      try {
        overallStats = await persistPairStats();
      } catch (error) {
        if (error instanceof CardGameStatsSaveError) {
          fallbackOverallStats = error.attemptedStats;
        }
        throw error;
      }
      fallbackOverallStats = overallStats;
      await persistGameState();
      return { gameState, overallStats };
    },
    fallbackValue: () => ({ gameState, overallStats: fallbackOverallStats }),
    revealCompletion: revealPersistedPair,
    runBestEffortNetworkWork: evaluateAchievements,
    onLocalError,
    onNetworkError,
  });
};

export interface CardsMatchingCompletionOptions {
  persistGamesPlayed: () => Promise<CardGameOverallStats>;
  clearPersistedGame: () => Promise<void>;
  revealCompletion: (
    overallStats: CardGameOverallStats,
    persistence: LocalPersistenceStatus,
  ) => void;
  evaluateAchievements: (
    overallStats: CardGameOverallStats,
    persistence: LocalPersistenceStatus,
  ) => Promise<void>;
  saveCompletionActivity: (
    overallStats: CardGameOverallStats,
    persistence: LocalPersistenceStatus,
  ) => Promise<unknown>;
  onLocalError?: (error: unknown) => void;
  onNetworkError?: (error: unknown) => void;
}

export const completeCardsMatchingGameLocallyFirst = async ({
  persistGamesPlayed,
  clearPersistedGame,
  revealCompletion,
  evaluateAchievements,
  saveCompletionActivity,
  onLocalError,
  onNetworkError,
}: CardsMatchingCompletionOptions): Promise<
  LocalFirstCompletionResult<CardGameOverallStats>
> => {
  let fallbackOverallStats = { ...DEFAULT_OVERALL_STATS };

  return completeLocallyFirst({
    persistLocal: async () => {
      let overallStats: CardGameOverallStats;
      try {
        overallStats = await persistGamesPlayed();
      } catch (error) {
        if (error instanceof CardGameStatsSaveError) {
          fallbackOverallStats = error.attemptedStats;
        }
        throw error;
      }
      fallbackOverallStats = overallStats;
      await clearPersistedGame();
      return overallStats;
    },
    fallbackValue: () => fallbackOverallStats,
    revealCompletion,
    runBestEffortNetworkWork: async (saved, persistence) => {
      await Promise.all([
        evaluateAchievements(saved, persistence),
        saveCompletionActivity(saved, persistence),
      ]);
    },
    onLocalError,
    onNetworkError,
  });
};

export const buildCardsMatchingCompletionData = (
  childId: string,
  completedMoves: number,
  duration: number,
  completedAt: string,
  gameTitle = "Cards",
) => {
  const perfectMoves = PAIRS_PER_GAME;
  const efficiency = Math.max(
    0,
    100 - Math.floor(((completedMoves - perfectMoves) / perfectMoves) * 50),
  );

  return {
    achievementEvent: {
      type: 'game_completed' as const,
      gameKey: 'card_matching_game' as const,
      moves: completedMoves,
      durationSeconds: duration,
    },
    activity: {
      child_id: childId,
      activity_type: 'cultural' as const,
      activity_name: 'Completed Matching Game',
      score: `${efficiency}%`,
      duration,
      completed_at: completedAt,
      details: `Completed ${gameTitle} matching game in ${completedMoves} moves and ${duration} seconds`,
    },
    efficiency,
  };
};

const CardsMatchingGame: React.FC = () => {
  const router = useRouter();
  const { activeChild } = useChild();
  const languageCode = getDbLanguageCodeForLearningLanguage(
    activeChild?.selected_language_code || DEFAULT_LEARNING_LANGUAGE_CODE,
  );
  const contentScope = `${activeChild?.id ?? "guest"}:${languageCode}`;
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const matchingTour = useGameTour("cards-matching", activeChild?.id);
  const { checkAndGrantNewAchievements } = useAchievements(
    activeChild?.id,
    "card_matching_game",
  );
  const { enqueueAchievementUnlocked } = useChildNotice();

  const [matchStreak, setMatchStreak] = useState(0); // For match streak achievement
  const [cards, setCards] = useState<Card[]>([]);
  const [boardSize, setBoardSize] = useState({ height: 0, width: 0 });
  const [flippedCards, setFlippedCards] = useState<Card[]>([]);
  const [matchedCount, setMatchedCount] = useState(0);
  const [moves, setMoves] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [contentUnavailable, setContentUnavailable] = useState(false);
  const [contentRetryVersion, setContentRetryVersion] = useState(0);
  const [hydratedScope, setHydratedScope] = useState<string | null>(null);
  const [gameTitle, setGameTitle] = useState("Cards Matching");
  const [cardItems, setCardItems] = useState<CardGameItem[]>([]);
  const [gameState, setGameState] = useState<CardGameState | null>(null);
  const [infoModal, setInfoModal] = useState<{
    show: boolean;
    info: string;
    value: string;
    symbol: string;
  }>({
    show: false,
    info: "",
    value: "",
    symbol: "",
  });

  // Animation references
  const bounceAnim = useRef(new Animated.Value(1)).current;
  
  // Add game start time reference for duration tracking
  const gameStartTime = useRef(Date.now());
  const isMountedRef = useRef(true);
  const pendingTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const cardPressLockRef = useRef(false);
  const pairResolutionLockRef = useRef(false);
  const completionScheduledRef = useRef(false);
  const completionWorkRef = useRef<Promise<void> | null>(null);
  const flippedCardsRef = useRef<Card[]>([]);
  const movesRef = useRef(0);
  const matchedCountRef = useRef(0);
  const matchStreakRef = useRef(0);
  const gameStateRef = useRef<CardGameState | null>(null);
  const contentProgressRevisionRef = useRef<string | undefined>(undefined);

  const clearPendingTimers = () => {
    pendingTimersRef.current.forEach((timer) => clearTimeout(timer));
    pendingTimersRef.current.clear();
  };

  const scheduleTimer = (callback: () => void, delayMs: number) => {
    const timer = setTimeout(() => {
      pendingTimersRef.current.delete(timer);
      callback();
    }, delayMs);
    pendingTimersRef.current.add(timer);
  };

  const resetCompletionLocks = () => {
    cardPressLockRef.current = false;
    pairResolutionLockRef.current = false;
    completionScheduledRef.current = false;
    completionWorkRef.current = null;
  };

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      clearPendingTimers();
    };
  }, []);

  // Initialize game
  useEffect(() => {
    let cancelled = false;
    const requestedChildId = activeChild?.id;
    const requestedLanguageCode = languageCode;
    const requestedScope = `${requestedChildId ?? "guest"}:${requestedLanguageCode}`;
    clearPendingTimers();
    resetCompletionLocks();
    setIsLoading(true);
    setContentUnavailable(false);
    setHydratedScope(null);
    setCards([]);

    const loadContentAndSavedState = async () => {
      try {
        const result = await loadContentBundle(requestedLanguageCode, {
          forceRefresh: true,
        });
        if (cancelled || !isMountedRef.current) return;

        const playableContent =
          result.bundle?.languageCode === requestedLanguageCode
            ? getPlayableCardGameContent(result.bundle.cardGame)
            : undefined;
        const contentProgressRevision =
          result.bundle?.progressRevisions?.card_game;

        if (!playableContent) {
          setCardItems([]);
          setContentUnavailable(true);
          return;
        }

        setCardItems(playableContent.items);
        setGameTitle(playableContent.title);
        contentProgressRevisionRef.current = contentProgressRevision;

        if (requestedChildId) {
          try {
            const savedState = await loadGameState(
              requestedChildId,
              requestedLanguageCode,
              contentProgressRevision,
            );
            if (cancelled || !isMountedRef.current) return;

            if (savedState && savedState.matchedValues.length > 0) {
              console.log("Loading saved game state:", savedState);
              initGameWithSavedState(savedState, playableContent.items, requestedChildId);
            } else {
              initGame(playableContent.items, requestedChildId);
            }
          } catch (error) {
            console.warn("Could not restore Cards Matching progress; starting safely:", error);
            if (!cancelled && isMountedRef.current) {
              initGame(playableContent.items, requestedChildId);
            }
          }
        } else {
          initGame(playableContent.items);
        }
      } catch (error) {
        console.error("Error loading Cards Matching content or progress:", error);
        if (!cancelled && isMountedRef.current) {
          setCardItems([]);
          setContentUnavailable(true);
        }
      } finally {
        if (!cancelled && isMountedRef.current) {
          setHydratedScope(requestedScope);
          setIsLoading(false);
        }
      }
    };

    void loadContentAndSavedState().catch((error) => {
      console.warn("Could not initialize Cards Matching state:", error);
    });

    // Initial bounce animation
    Animated.sequence([
      Animated.timing(bounceAnim, {
        toValue: 1.05,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(bounceAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();

    return () => {
      cancelled = true;
      clearPendingTimers();
    };
  }, [activeChild?.id, contentRetryVersion, languageCode]);

  // Function to initialize game with saved state
  const initGameWithSavedState = (
    savedState: CardGameState,
    availableItems: CardGameItem[] = cardItems,
    childId = activeChild?.id,
  ) => {
    const availableValues = new Set(availableItems.map((item) => item.value));
    const matchedValues = [...new Set(savedState.matchedValues || [])].filter((value) =>
      availableValues.has(value),
    );
    const matchedCount = matchedValues.length;
    const normalizedSavedState = { ...savedState, matchedValues };
    
    // If all pairs are matched, just start a new game
    if (matchedCount >= PAIRS_PER_GAME) {
      initGame(availableItems, childId);
      return;
    }
    
    // Otherwise, include matched values and add new random ones
    const matchedItems = availableItems.filter(
      item => matchedValues.includes(item.value)
    );
    
    // We need more random items to fill up to PAIRS_PER_GAME
    const unmatchedPool = availableItems.filter(
      item => !matchedValues.includes(item.value)
    );
    
    const shuffledUnmatched = shuffleCards([...unmatchedPool]);
    const additionalItems = shuffledUnmatched.slice(0, PAIRS_PER_GAME - matchedItems.length);
    
    // Combine to get our final selection of items
    const selectedItems = [...matchedItems, ...additionalItems];
    
    // Create pairs of cards with matched items already marked as matched
    const cardPairs: Card[] = [];
    selectedItems.forEach(item => {
      // For each item, create two cards (a pair)
      const isMatched = matchedValues.includes(item.value);
      
      for (let i = 0; i < 2; i++) {
        cardPairs.push({
          id: cardPairs.length,
          value: item.value,
          flipped: isMatched,
          matched: isMatched,
          info: item.info,
          imageSymbol: item.imageSymbol,
        });
      }
    });
    
    // Shuffle the cards
    const shuffledCards = shuffleCards(cardPairs);
    
    // Update state
    setCards(shuffledCards);
    setFlippedCards([]);
    flippedCardsRef.current = [];
    setMatchedCount(matchedCount);
    matchedCountRef.current = matchedCount;
    setMoves(savedState.moves || 0);
    movesRef.current = savedState.moves || 0;
    setMatchStreak(0);
    matchStreakRef.current = 0;
    setGameOver(false);
    setInfoModal({ show: false, info: "", value: "", symbol: "" });
    setGameState(normalizedSavedState);
    gameStateRef.current = normalizedSavedState;
    
    // Reset game start time from saved state
    gameStartTime.current = savedState.gameStartTime || Date.now();
  };

  // Shuffle function for cards
  const shuffleCards = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Start a new game, clearing any saved state
  const initGame = (
    availableItems: CardGameItem[] = cardItems,
    childId = activeChild?.id,
  ) => {
    if (availableItems.length < PAIRS_PER_GAME) return;

    clearPendingTimers();
    resetCompletionLocks();

    // Clear saved state if there's an active child
    if (childId) {
      void clearGameState(childId, languageCode).catch((error) => {
        console.warn("Could not clear the previous Cards Matching game:", error);
      });
    }

    // Select random items from the collection for this game
    const randomItems = shuffleCards([...availableItems])
      .slice(0, PAIRS_PER_GAME);
    
    // Create pairs of cards
    const cardPairs: Card[] = [...randomItems, ...randomItems].map(
      (item, index) => ({
        id: index,
        value: item.value,
        flipped: false,
        matched: false,
        info: item.info,
        imageSymbol: item.imageSymbol,
      })
    );

    // Shuffle cards
    const shuffledCards = shuffleCards(cardPairs);
    setCards(shuffledCards);
    setFlippedCards([]);
    flippedCardsRef.current = [];
    setMatchedCount(0);
    matchedCountRef.current = 0;
    setMoves(0);
    movesRef.current = 0;
    setMatchStreak(0);
    matchStreakRef.current = 0;
    setGameOver(false);
    setInfoModal({ show: false, info: "", value: "", symbol: "" });
    
    // Reset game state
    const newGameState: CardGameState = {
      matchedValues: [],
      moves: 0,
      gameStartTime: Date.now(),
      childId: childId || 'default'
    };
    setGameState(newGameState);
    gameStateRef.current = newGameState;
    
    // Reset start time when restarting game
    gameStartTime.current = Date.now();
  };

  // Reset current game (keep same cards but reset state)
  const resetGame = () => {
    clearPendingTimers();
    resetCompletionLocks();

    // Reset all cards to unflipped and unmatched state
    const resetCards = cards.map(card => ({
      ...card,
      flipped: false,
      matched: false
    }));
    
    setCards(resetCards);
    setFlippedCards([]);
    flippedCardsRef.current = [];
    setMatchedCount(0);
    matchedCountRef.current = 0;
    setMoves(0);
    movesRef.current = 0;
    setMatchStreak(0);
    matchStreakRef.current = 0;
    setGameOver(false);
    setInfoModal({ show: false, info: "", value: "", symbol: "" });
    
    // Clear saved state if there's an active child
    if (activeChild) {
      void clearGameState(activeChild.id, languageCode).catch((error) => {
        console.warn("Could not clear Cards Matching state during reset:", error);
      });
    }
    
    // Reset game state
    const newGameState: CardGameState = {
      matchedValues: [],
      moves: 0,
      gameStartTime: Date.now(),
      childId: activeChild?.id || 'default'
    };
    setGameState(newGameState);
    gameStateRef.current = newGameState;
    
    // Reset start time when resetting game
    gameStartTime.current = Date.now();
  };

  // Track activity when game completes. The shared promise is installed before
  // persistence starts, so repeated delayed callbacks reuse the same completion.
  const trackGameCompletion = (completedMoves: number): Promise<void> =>
    runCompletionOnce(completionWorkRef, async () => {
      if (!activeChild) {
        if (isMountedRef.current) setGameOver(true);
        return;
      }

      const childId = activeChild.id;
      const duration = Math.round((Date.now() - gameStartTime.current) / 1000);
      const { achievementEvent, activity } = buildCardsMatchingCompletionData(
        childId,
        completedMoves,
        duration,
        new Date().toISOString(),
        gameTitle,
      );

      await completeCardsMatchingGameLocallyFirst({
        persistGamesPlayed: () => incrementGamesPlayed(childId),
        clearPersistedGame: () => clearGameState(childId, languageCode),
        revealCompletion: () => {
          if (isMountedRef.current) setGameOver(true);
        },
        evaluateAchievements: async () => {
          const newlyEarnedFromEvent = await checkAndGrantNewAchievements(achievementEvent);
          if (!isMountedRef.current) return;
          newlyEarnedFromEvent.forEach(ach => {
            console.log(`CARD MATCH - GAME COMPLETE - NEW ACHIEVEMENT: ${ach.name}`);
            enqueueAchievementUnlocked(ach);
          });
        },
        saveCompletionActivity: () => saveActivity(activity),
        onLocalError: (error) => {
          console.warn("Could not persist Cards Matching completion locally:", error);
        },
        onNetworkError: (error) => {
          console.warn("Could not finish background Cards Matching completion work:", error);
        },
      });
    });

  const handleCardPress = async (card: Card) => {
    const selectedCards = flippedCardsRef.current;
    if (
      cardPressLockRef.current ||
      pairResolutionLockRef.current ||
      completionScheduledRef.current ||
      gameOver ||
      card.flipped ||
      card.matched ||
      selectedCards.length >= 2 ||
      selectedCards.some((selected) => selected.id === card.id)
    ) {
      return;
    }

    // This lock is synchronous so a second tap cannot enter while sound playback
    // is awaiting or before React has rendered the first flipped card.
    cardPressLockRef.current = true;
    try {
      try {
        await audioManager.playAppSound(require("@/assets/audio/page-turn.mp3"));
      } catch (error) {
        console.log("Error playing sound", error);
      }
      if (!isMountedRef.current) return;

      const currentSelection = flippedCardsRef.current;
      if (
        pairResolutionLockRef.current ||
        completionScheduledRef.current ||
        currentSelection.length >= 2 ||
        currentSelection.some((selected) => selected.id === card.id)
      ) {
        return;
      }

      const flippedCard = { ...card, flipped: true };
      const updatedFlippedCards = [...currentSelection, flippedCard];

      if (updatedFlippedCards.length === 2) {
        const [firstCard, secondCard] = updatedFlippedCards;
        const isMatch = firstCard.value === secondCard.value;
        const completedMoves = movesRef.current + 1;
        const completesGame = isMatch && matchedCountRef.current + 1 === PAIRS_PER_GAME;

        // Pair and final-completion locks are installed before any state update
        // or delayed callback can expose stale render state to another tap.
        pairResolutionLockRef.current = true;
        if (completesGame) completionScheduledRef.current = true;
        movesRef.current = completedMoves;
        flippedCardsRef.current = updatedFlippedCards;

        setCards((currentCards) =>
          currentCards.map((currentCard) =>
            currentCard.id === card.id ? flippedCard : currentCard,
          ),
        );
        setFlippedCards(updatedFlippedCards);
        setMoves(completedMoves);

        if (isMatch) {
          scheduleTimer(() => {
            void (async () => {
              if (!isMountedRef.current) return;

              const nextMatchedCount = matchedCountRef.current + 1;
              const nextMatchStreak = matchStreakRef.current + 1;
              matchedCountRef.current = nextMatchedCount;
              matchStreakRef.current = nextMatchStreak;
              flippedCardsRef.current = [];

              setCards((currentCards) =>
                currentCards.map((currentCard) =>
                  currentCard.value === firstCard.value
                    ? { ...currentCard, matched: true }
                    : currentCard,
                ),
              );
              setFlippedCards([]);
              setMatchedCount(nextMatchedCount);
              setMatchStreak(nextMatchStreak);

              if (activeChild) {
                const previousGameState = gameStateRef.current;
                const updatedMatchedValues = previousGameState
                  ? [...new Set([...previousGameState.matchedValues, firstCard.value])]
                  : [firstCard.value];
                const updatedState: CardGameState = {
                  matchedValues: updatedMatchedValues,
                  moves: completedMoves,
                  gameStartTime: gameStartTime.current,
                  childId: activeChild.id,
                };

                await persistCardsMatchingPairLocallyFirst({
                  gameState: updatedState,
                  persistPairStats: () => updateTotalPairsMatched(1, activeChild.id),
                  persistGameState: () =>
                    saveGameState(
                      updatedState,
                      activeChild.id,
                      languageCode,
                      contentProgressRevisionRef.current,
                    ),
                  revealPersistedPair: ({ gameState: savedState }) => {
                    if (!isMountedRef.current) return;
                    gameStateRef.current = savedState;
                    setGameState(savedState);
                  },
                  evaluateAchievements: async ({ overallStats: savedStats }, persistence) => {
                    const eventsForAchievements: Parameters<
                      typeof checkAndGrantNewAchievements
                    >[0][] = [
                      {
                        type: 'match_made',
                        gameKey: 'card_matching_game',
                        matchedCardValue: firstCard.value,
                      },
                    ];

                    if (nextMatchStreak >= 3) {
                      eventsForAchievements.push({
                        type: 'match_streak_achieved',
                        gameKey: 'card_matching_game',
                        streakCount: nextMatchStreak,
                      });
                    }

                    if (persistence.persisted) {
                      eventsForAchievements.push({
                        type: 'stats_updated',
                        gameKey: 'card_matching_game',
                        totalPairsMatchedAcrossGames: savedStats.totalPairsMatched,
                      });
                    }

                    for (const event of eventsForAchievements) {
                      const newlyEarnedFromEvent = await checkAndGrantNewAchievements(event);
                      if (!isMountedRef.current) return;
                      newlyEarnedFromEvent.forEach(ach => {
                        console.log(`CARD MATCH - NEW ACHIEVEMENT: ${ach.name}`);
                        enqueueAchievementUnlocked(ach);
                      });
                    }
                  },
                  onLocalError: (error) => {
                    console.warn("Could not persist the matched Cards pair locally:", error);
                  },
                  onNetworkError: (error) => {
                    console.warn("Could not finish background Cards Matching achievement work:", error);
                  },
                });
              }

              try {
                await audioManager.playAppSound(require("@/assets/sounds/correct.mp3"));
              } catch (error) {
                console.log("Error playing sound", error);
              }
              if (!isMountedRef.current) return;

              setInfoModal({
                show: true,
                info: firstCard.info,
                value: firstCard.value,
                symbol: firstCard.imageSymbol,
              });

              Animated.sequence([
                Animated.timing(bounceAnim, {
                  toValue: 1.05,
                  duration: 200,
                  useNativeDriver: true,
                }),
                Animated.spring(bounceAnim, {
                  toValue: 1,
                  friction: 4,
                  useNativeDriver: true,
                }),
              ]).start();

              if (completesGame) {
                scheduleTimer(() => {
                  if (!isMountedRef.current) return;
                  void trackGameCompletion(completedMoves).catch((error) => {
                    console.warn("Could not process Cards Matching completion:", error);
                    completionScheduledRef.current = false;
                  });
                }, 1000);
              } else {
                pairResolutionLockRef.current = false;
              }
            })().catch((error) => {
              console.warn("Could not resolve the matched Cards pair:", error);
              pairResolutionLockRef.current = false;
              if (completesGame) completionScheduledRef.current = false;
            });
          }, 500);
        } else {
          scheduleTimer(() => {
            if (!isMountedRef.current) return;

            setCards((currentCards) =>
              currentCards.map((currentCard) =>
                (currentCard.id === firstCard.id || currentCard.id === secondCard.id) &&
                !currentCard.matched
                  ? { ...currentCard, flipped: false }
                  : currentCard,
              ),
            );
            flippedCardsRef.current = [];
            matchStreakRef.current = 0;
            setFlippedCards([]);
            setMatchStreak(0);

            if (activeChild && gameStateRef.current) {
              const updatedState: CardGameState = {
                ...gameStateRef.current,
                moves: completedMoves,
              };
              gameStateRef.current = updatedState;
              setGameState(updatedState);
              void saveGameState(
                updatedState,
                activeChild.id,
                languageCode,
                contentProgressRevisionRef.current,
              ).catch((error) => {
                console.warn("Could not persist the Cards Matching move locally:", error);
              });
            }
            pairResolutionLockRef.current = false;
          }, 1000);
        }
      } else {
        flippedCardsRef.current = updatedFlippedCards;
        setCards((currentCards) =>
          currentCards.map((currentCard) =>
            currentCard.id === card.id ? flippedCard : currentCard,
          ),
        );
        setFlippedCards(updatedFlippedCards);
      }
    } finally {
      cardPressLockRef.current = false;
    }
  };

  const closeInfoModal = () => {
    setInfoModal({ ...infoModal, show: false });
  };

  // Never render content or progress hydrated for a different child/language.
  if (isLoading || hydratedScope !== contentScope) {
    return (
      <ChildLoadingState
        title="Getting the matching cards ready"
        message="Loading card pictures and your saved game."
        icon="copy-outline"
      />
    );
  }

  if (contentUnavailable || cardItems.length < PAIRS_PER_GAME) {
    return (
      <View className="flex-1 bg-primary-50 justify-center items-center px-8">
        <StatusBar style="dark" />
        <Ionicons name="cloud-offline-outline" size={52} color="#7b5af0" />
        <Text className="text-primary-700 text-2xl mt-4 text-center" variant="bold">
          Cards Matching is unavailable
        </Text>
        <Text className="text-neutral-600 mt-2 text-center">
          This activity is not ready for your learning language yet. Check your connection and try again.
        </Text>
        <View className="flex-row mt-6">
          <TouchableOpacity
            className="bg-white border-2 border-primary-200 rounded-xl px-5 py-3 mr-3"
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Back to Games"
          >
            <Text className="text-primary-700" variant="bold">Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="bg-primary-600 rounded-xl px-5 py-3"
            onPress={() => setContentRetryVersion((version) => version + 1)}
            accessibilityRole="button"
            accessibilityLabel="Retry Cards Matching content"
          >
            <Text className="text-white" variant="bold">Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const fallbackBoardWidth = Math.max(0, windowWidth - insets.left - insets.right - 16);
  const fallbackBoardHeight = Math.max(0, windowHeight - insets.top - insets.bottom);
  const {
    cardHeight,
    cardWidth,
    columnGap,
    rowGap,
  } = getCardsMatchingGridSizing(
    boardSize.width || fallbackBoardWidth,
    boardSize.height || fallbackBoardHeight,
    cards.length,
  );

  // Get gradient colors for a card based on its index
  const getCardGradient = (index: number): readonly [string, string] => {
    const colors = cardGradients[index % cardGradients.length];
    return [colors[0], colors[1]] as const;
  };

  return (
    <GameTourProvider>
      <View className="flex-1 bg-blue-50">
      <SafeAreaView className="flex-1 flex-col" edges={["top", "bottom", "left", "right"]}>
      <StatusBar style={infoModal.show || gameOver ? "light" : "dark"} />
      <GameHeader
        title={gameTitle}
        subtitle="Turn over two cards and find every matching pair"
        onBack={() => router.back()}
        backAccessibilityLabel="Back to Games"
        onHelp={matchingTour.open}
        trailing={
          <>
            <GameStatChip
              icon="swap-horizontal"
              label={`${moves}`}
              accessibilityLabel={`${moves} moves`}
              tourTargetId="matching-moves"
            />
            <GameStatChip
              icon="checkmark-circle"
              label={`${matchedCount}/${PAIRS_PER_GAME}`}
              tint="#22c55e"
              accessibilityLabel={`${matchedCount} of ${PAIRS_PER_GAME} pairs matched`}
              tourTargetId="matching-progress"
            />
            <TouchableOpacity
              className="bg-white w-12 h-12 rounded-2xl border border-blue-100 items-center justify-center ml-2"
              onPress={resetGame}
              activeOpacity={0.76}
              accessibilityRole="button"
              accessibilityLabel="Reset matching game"
            >
              <Ionicons name="refresh" size={21} color="#0274BB" />
            </TouchableOpacity>
          </>
        }
      />

      {/* Game board with improved visuals - reduced padding */}
      <Animated.View
        className="flex-1 px-2 pb-2 pt-1"
        style={{ transform: [{ scale: bounceAnim }] }}
      >
        <View
          className="flex-1 flex-row flex-wrap justify-center items-center"
          onLayout={({ nativeEvent }) => {
            const { height, width } = nativeEvent.layout;
            if (Math.abs(boardSize.height - height) > 0.5 || Math.abs(boardSize.width - width) > 0.5) {
              setBoardSize({ height, width });
            }
          }}
          style={{ columnGap, rowGap }}
        >
          {cards.map((card, index) => (
            <TourTarget
              key={card.id}
              id={index === 0 ? "matching-card-grid" : `matching-card-${card.id}`}
            >
            <TouchableOpacity
              style={{
                width: cardWidth,
                height: cardHeight,
              }}
              className={`
                  rounded-2xl overflow-hidden justify-center items-center
                  shadow-md border-2
                  ${card.matched ? "border-green-400" : "border-white"}
                `}
              onPress={() => {
                void handleCardPress(card).catch((error) => {
                  console.warn("Could not handle the Cards Matching tap:", error);
                });
              }}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={card.flipped || card.matched ? `${card.value} card` : "Hidden card"}
              accessibilityState={{ selected: card.flipped || card.matched }}
            >
              {card.flipped || card.matched ? (
                // Front of card (flipped)
                <LinearGradient
                  colors={["#ffffff", "#f8f8ff"]}
                  className="flex-1 w-full justify-center items-center p-1"
                >
                  <View
                    style={{
                      width: cardWidth * 0.6,
                      height: cardWidth * 0.6,
                    }}
                    className={`
                      rounded-full mb-1 justify-center items-center
                      ${card.matched ? "bg-green-100" : "bg-blue-100"}
                    `}
                  >
                    <Text
                      variant="bold"
                      style={{ fontSize: cardWidth * 0.35 }}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.7}
                    >
                      {card.imageSymbol}
                    </Text>
                  </View>
                  <Text
                    className="text-center text-primary-700 px-1"
                    numberOfLines={1}
                    style={{ fontSize: Math.max(12, cardWidth * 0.16) }}
                    variant="bold"
                    adjustsFontSizeToFit
                    minimumFontScale={0.72}
                  >
                    {card.value}
                  </Text>
                </LinearGradient>
              ) : (
                // Back of card (unflipped) with gradient
                <LinearGradient
                  colors={getCardGradient(index)}
                  className="flex-1 w-full justify-center items-center"
                >
                  {/* Fun question mark design */}
                  <View
                    style={{
                      width: cardWidth * 0.5,
                      height: cardWidth * 0.5,
                    }}
                    className="bg-white/30 rounded-full justify-center items-center"
                  >
                    <Text
                      className=" text-primary-700"
                      style={{ fontSize: cardWidth * 0.3 }}
                    >
                      ?
                    </Text>
                  </View>
                  <View className="absolute bottom-2 right-2">
                    <View className="w-3 h-3 rounded-full bg-white/20" />
                  </View>
                  <View className="absolute top-2 left-2">
                    <View className="w-2 h-2 rounded-full bg-white/20" />
                  </View>
                </LinearGradient>
              )}
            </TouchableOpacity>
            </TourTarget>
          ))}
        </View>
      </Animated.View>
      </SafeAreaView>

      {/* Info modal when match is found - with fun styling */}
      {infoModal.show && (
        <View
          className="absolute inset-0 justify-center items-center px-5"
          style={{
            backgroundColor: "#020617B3",
            paddingBottom: Math.max(insets.bottom, 16),
            paddingLeft: Math.max(insets.left, 20),
            paddingRight: Math.max(insets.right, 20),
            paddingTop: Math.max(insets.top, 16),
          }}
        >
          <View
            className="w-4/5 max-w-xl rounded-3xl p-6 items-center shadow-xl border-4 border-primary-200 bg-white"
          >
            {/* Symbol display at top */}
            <View className="absolute -top-8 bg-yellow-100 w-16 h-16 rounded-full border-4 border-white justify-center items-center">
              <Text className="text-4xl" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                {infoModal.symbol}
              </Text>
            </View>

            <Text
              variant="bold"
              className="text-2xl text-primary-700 mb-2 mt-4 text-center"
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.82}
            >
              {infoModal.value}
            </Text>

            <View className="bg-primary-50 w-full rounded-xl p-4 mb-5">
              <Text className="text-lg text-primary-700 text-center" numberOfLines={5}>
                {infoModal.info}
              </Text>
            </View>

            <TouchableOpacity
              className="bg-primary-500 py-3 px-7 rounded-full shadow-md border-2 border-primary-400 min-w-[140px] items-center"
              onPress={closeInfoModal}
              activeOpacity={0.78}
              accessibilityRole="button"
              accessibilityLabel="Continue matching game"
            >
              <Text variant="bold" className="text-white text-lg" numberOfLines={1}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Game over modal with celebration styling */}
      {gameOver && (
        <View
          className="absolute inset-0 justify-center items-center px-5"
          style={{
            backgroundColor: "#020617B3",
            paddingBottom: Math.max(insets.bottom, 16),
            paddingLeft: Math.max(insets.left, 20),
            paddingRight: Math.max(insets.right, 20),
            paddingTop: Math.max(insets.top, 16),
          }}
        >
          <View
            className="w-4/5 max-w-xl rounded-3xl p-6 items-center shadow-xl border-4 border-primary-200 bg-white"
          >
            {/* Trophy at top */}
            <View className="absolute -top-8 bg-yellow-300 w-20 h-20 rounded-full border-4 border-white justify-center items-center">
              <Ionicons name="trophy" size={42} color="#ffffff" />
            </View>

            <Text variant="bold" className="text-3xl text-primary-600 mb-2 mt-6 text-center" numberOfLines={1}>
              Congratulations!
            </Text>

            <View className="bg-primary-50 w-full rounded-xl p-4 mb-5">
              <Text className="text-xl text-primary-700 text-center font-medium" numberOfLines={3}>
                {`You've completed the game in ${moves} moves!`}
              </Text>
            </View>

            <TouchableOpacity
              className="bg-primary-500 py-4 px-8 rounded-full shadow-md border-2 border-primary-400 min-w-[164px] items-center"
              onPress={() => initGame()}
              activeOpacity={0.78}
              accessibilityRole="button"
              accessibilityLabel="Play matching game again"
            >
              <Text variant="bold" className="text-white text-xl" numberOfLines={1}>Play Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      <GameTour
        visible={matchingTour.visible}
        onCancel={matchingTour.close}
        onComplete={matchingTour.complete}
        steps={[
          { id: "grid", targetId: "matching-card-grid", icon: "albums-outline", placement: "auto", title: "Flip a card", description: "Tap two cards to find a pair." },
          { id: "progress", targetId: "matching-progress", icon: "checkmark-circle-outline", placement: "bottom", title: "Your pairs", description: "This shows the pairs you found." },
          { id: "moves", targetId: "matching-moves", icon: "swap-horizontal", placement: "bottom", title: "Your moves", description: "Try to use fewer turns." },
        ]}
      />
      </View>
    </GameTourProvider>
  );
};

export default CardsMatchingGame;
