import React, { useState, useEffect, useRef } from "react";
import {
  View,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "@/components/StyledText";
import { useChild } from "@/context/ChildContext";  
import { saveActivity } from "@/lib/utils";
import { 
  loadGameState, 
  saveGameState, 
  clearGameState, 
  loadOverallStats, 
  updateTotalPairsMatched, 
  incrementGamesPlayed,
  CardGameState,
  CardGameOverallStats, // Import the type too
  DEFAULT_OVERALL_STATS // Import the default stats constant
} from './utils/progressManagerCardGame';
import { useAchievements } from "./achievements/useAchievements";
import { audioManager } from "@/lib/audioManager";
import { useChildNotice } from "@/context/ChildNoticeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getCardsMatchingGridSizing } from "./responsiveSizing";

// Define card interface
interface Card {
  id: number;
  value: string;
  flipped: boolean;
  matched: boolean;
  info: string;
  imageSymbol: string;
}

// Define expanded Buganda cultural items data
const bugandaItemsCollection = [
  // Original 8 items
  {
    value: "Kabaka",
    info: "The King of Buganda, one of the most powerful traditional monarchs in Uganda.",
    imageSymbol: "👑",
  },
  {
    value: "Lubiri",
    info: "The royal palace of the Kabaka of Buganda located in Mengo, Kampala.",
    imageSymbol: "🏰",
  },
  {
    value: "Matoke",
    info: "Steamed green bananas, a staple food in Buganda cuisine.",
    imageSymbol: "🍌",
  },
  {
    value: "Kanzu",
    info: "Traditional white robe worn by Baganda men, especially during ceremonies.",
    imageSymbol: "👘",
  },
  {
    value: "Gomesi",
    info: "A colorful floor-length dress worn by Baganda women during ceremonies.",
    imageSymbol: "👗",
  },
  {
    value: "Engoma",
    info: "Traditional drums used in Kiganda music and royal ceremonies.",
    imageSymbol: "🥁",
  },
  {
    value: "Lukiiko",
    info: "The parliament or council of the Buganda Kingdom.",
    imageSymbol: "🏛️",
  },
  {
    value: "Olugero",
    info: "Traditional fables and stories that teach moral lessons in Buganda culture.",
    imageSymbol: "📚",
  },
  
  // Additional items to expand the collection to ~40
  {
    value: "Bakisimba",
    info: "A traditional Baganda dance performed at cultural celebrations.",
    imageSymbol: "💃",
  },
  {
    value: "Mweso",
    info: "A traditional board game played throughout Uganda, especially in Buganda.",
    imageSymbol: "🎮",
  },
  {
    value: "Endere",
    info: "A traditional flute used in Kiganda music.",
    imageSymbol: "🎵",
  },
  {
    value: "Amadinda",
    info: "A xylophone-like instrument with wooden keys used in traditional music.",
    imageSymbol: "🎹",
  },
  {
    value: "Ensi",
    info: "The traditional territories or counties of Buganda Kingdom.",
    imageSymbol: "🗺️",
  },
  {
    value: "Namasole",
    info: "The title given to the mother of the Kabaka (King) of Buganda.",
    imageSymbol: "👸",
  },
  {
    value: "Katikkiro",
    info: "The prime minister or chief minister of the Buganda Kingdom.",
    imageSymbol: "👔",
  },
  {
    value: "Ssabasajja",
    info: "An honorific title for the Kabaka, meaning 'Chief of Men'.",
    imageSymbol: "🤴",
  },
  {
    value: "Kasubi",
    info: "The royal burial grounds where Buganda kings are laid to rest.",
    imageSymbol: "⚱️",
  },
  {
    value: "Bulungi Bwansi",
    info: "Traditional community service practice in Buganda culture.",
    imageSymbol: "🌱",
  },
  {
    value: "Empagi",
    info: "The traditional pillars that support the Buganda social structure.",
    imageSymbol: "🏗️",
  },
  {
    value: "Akendo",
    info: "Traditional walking stick symbolizing authority in Buganda culture.",
    imageSymbol: "🦯",
  },
  {
    value: "Omuziro",
    info: "Clan totems that are sacred and respected in Buganda tradition.",
    imageSymbol: "🐘",
  },
  {
    value: "Ddamula",
    info: "The royal scepter, a symbol of the Kabaka's authority.",
    imageSymbol: "🔱",
  },
  {
    value: "Luwombo",
    info: "A traditional Buganda dish of meat stewed in banana leaves.",
    imageSymbol: "🍲",
  },
  {
    value: "Entebbe",
    info: "A historic location in Buganda that means 'seat' or 'chair' in Luganda.",
    imageSymbol: "🪑",
  },
  {
    value: "Embaga",
    info: "Traditional festivities or celebrations in Buganda culture.",
    imageSymbol: "🎉",
  },
  {
    value: "Enkula",
    info: "Special beads worn by members of the royal family.",
    imageSymbol: "📿",
  },
  {
    value: "Enseenene",
    info: "Grasshoppers, a traditional delicacy in Buganda cuisine.",
    imageSymbol: "🦗",
  },
  {
    value: "Muganda",
    info: "A person belonging to the Baganda ethnic group.",
    imageSymbol: "👨",
  },
  {
    value: "Ssaabasajja",
    info: "Royal title for the Kabaka meaning 'Chief of Chiefs'.",
    imageSymbol: "👑",
  },
  {
    value: "Namulondo",
    info: "The royal throne of the Buganda Kingdom.",
    imageSymbol: "👑",
  },
  {
    value: "Kyabazinga",
    info: "A royal title in some kingdoms neighboring Buganda.",
    imageSymbol: "👑",
  },
  {
    value: "Oluganda",
    info: "The Luganda language, spoken by the Baganda people.",
    imageSymbol: "🗣️",
  },
  {
    value: "Barkcloth",
    info: "Traditional fabric made from the Mutuba tree, used for ceremonies.",
    imageSymbol: "🧵",
  },
  {
    value: "Okukyala",
    info: "Traditional visiting practices in Buganda culture.",
    imageSymbol: "🚶",
  },
  {
    value: "Nankere",
    info: "A small drum in the ensemble of Kiganda music.",
    imageSymbol: "🪘",
  },
  {
    value: "Masiro",
    info: "Royal tombs or burial places for Buganda royalty.",
    imageSymbol: "🏛️",
  },
  {
    value: "Ekyoto",
    info: "The traditional fireplace where families gather for stories.",
    imageSymbol: "🔥",
  },
  {
    value: "Entamu",
    info: "Traditional ceremonial spears used in Buganda rituals.",
    imageSymbol: "🗡️",
  },
  {
    value: "Okuggya Omwana",
    info: "Baby naming ceremony in Buganda culture.",
    imageSymbol: "👶",
  },
  {
    value: "Okwanjula",
    info: "Traditional introduction ceremony before marriage in Buganda.",
    imageSymbol: "💍",
  },
  {
    value: "Kaggwa",
    info: "A legendary figure in Buganda history and culture.",
    imageSymbol: "🦸",
  },
  {
    value: "Musambwa",
    info: "Ancestral spirits venerated in traditional Buganda beliefs.",
    imageSymbol: "👻",
  },
  {
    value: "Kawulugumo",
    info: "A mythical creature in Buganda folklore.",
    imageSymbol: "🐲",
  },
  {
    value: "Ekitiibwa",
    info: "Honor and respect, a core value in Buganda culture.",
    imageSymbol: "🙏",
  },
  {
    value: "Akasiimo",
    info: "Traditional gift-giving practice in Buganda.",
    imageSymbol: "🎁",
  },
  {
    value: "Obusinga",
    info: "Royal clan lineages in Buganda Kingdom.",
    imageSymbol: "👪",
  },
  {
    value: "Ensimbi",
    info: "Traditional cowrie shells once used as currency.",
    imageSymbol: "🐚",
  },
];

// Number of card pairs to use in each game (adjust as needed)
const PAIRS_PER_GAME = 8;

// Card gradient colors for backside based on position
const cardGradients: string[][] = [
  ["#FF9AA2", "#FFB7B2"], // Pink
  ["#FFDAC1", "#E2F0CB"], // Peach to Light Green
  ["#B5EAD7", "#C7CEEA"], // Light Teal to Light Blue
  ["#E2F0CB", "#FFDAC1"], // Light Green to Peach
  ["#C7CEEA", "#FF9AA2"], // Light Blue to Pink
  ["#FFB7B2", "#B5EAD7"], // Light Pink to Teal
];

const BugandaMatchingGame: React.FC = () => {
  const router = useRouter();
  const { activeChild } = useChild();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { 
    // definedAchievements, 
    // earnedChildAchievements, 
    isLoadingAchievements, 
    checkAndGrantNewAchievements 
  } = useAchievements(activeChild?.id, 'card_matching_game'); // Game key
  const { enqueueAchievementUnlocked } = useChildNotice();

  const [matchStreak, setMatchStreak] = useState(0); // For match streak achievement
  const [overallStats, setOverallStats] = useState<CardGameOverallStats | null>(null); // For overall game stats
  const [cards, setCards] = useState<Card[]>([]);
  const [boardSize, setBoardSize] = useState({ height: 0, width: 0 });
  const [flippedCards, setFlippedCards] = useState<Card[]>([]);
  const [matchedCount, setMatchedCount] = useState(0);
  const [moves, setMoves] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
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

  // Initialize game
  useEffect(() => {
    // Load saved game state if available
    const loadSavedState = async () => {
      if (activeChild) {
        try {
          const savedState = await loadGameState(activeChild.id);
          
          if (savedState && savedState.matchedValues.length > 0) {
            console.log("Loading saved game state:", savedState);
            setGameState(savedState);
            // Initialize game with saved state
            initGameWithSavedState(savedState);
          } else {
            // No valid saved state, initialize a new game
            initGame();
          }
        } catch (error) {
          console.error("Error loading game state:", error);
          initGame(); // Fallback to new game
        } finally {
          setIsLoading(false);
        }
      } else {
        initGame();
        setIsLoading(false);
      }
    };

    loadSavedState();

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
  }, [activeChild]);

  useEffect(() => {
    const fetchOverallStats = async () => {
      if (activeChild) {
        const stats = await loadOverallStats(activeChild.id);
        setOverallStats(stats);
      }
    };
    fetchOverallStats();
  }, [activeChild]);

  // Function to initialize game with saved state
  const initGameWithSavedState = (savedState: CardGameState) => {
    // Determine how many new pairs to select
    const matchedValues = savedState.matchedValues || [];
    const matchedCount = matchedValues.length;
    
    // If all pairs are matched, just start a new game
    if (matchedCount >= PAIRS_PER_GAME) {
      initGame();
      return;
    }
    
    // Otherwise, include matched values and add new random ones
    const matchedItems = bugandaItemsCollection.filter(
      item => matchedValues.includes(item.value)
    );
    
    // We need more random items to fill up to PAIRS_PER_GAME
    const unmatchedPool = bugandaItemsCollection.filter(
      item => !matchedValues.includes(item.value)
    );
    
    const shuffledUnmatched = shuffleCards([...unmatchedPool]);
    const additionalItems = shuffledUnmatched.slice(0, PAIRS_PER_GAME - matchedCount);
    
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
    setMatchedCount(matchedCount);
    setMoves(savedState.moves || 0);
    setGameOver(false);
    setInfoModal({ show: false, info: "", value: "", symbol: "" });
    
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
  const initGame = () => {
    // Clear saved state if there's an active child
    if (activeChild) {
      clearGameState(activeChild.id);
    }

    // Select random items from the collection for this game
    const randomItems = shuffleCards([...bugandaItemsCollection])
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
    setMatchedCount(0);
    setMoves(0);
    setGameOver(false);
    setInfoModal({ show: false, info: "", value: "", symbol: "" });
    
    // Reset game state
    const newGameState: CardGameState = {
      matchedValues: [],
      moves: 0,
      gameStartTime: Date.now(),
      childId: activeChild?.id || 'default'
    };
    setGameState(newGameState);
    
    // Reset start time when restarting game
    gameStartTime.current = Date.now();
  };

  // Reset current game (keep same cards but reset state)
  const resetGame = () => {
    // Reset all cards to unflipped and unmatched state
    const resetCards = cards.map(card => ({
      ...card,
      flipped: false,
      matched: false
    }));
    
    setCards(resetCards);
    setFlippedCards([]);
    setMatchedCount(0);
    setMoves(0);
    setGameOver(false);
    setInfoModal({ show: false, info: "", value: "", symbol: "" });
    
    // Clear saved state if there's an active child
    if (activeChild) {
      clearGameState(activeChild.id);
    }
    
    // Reset game state
    const newGameState: CardGameState = {
      matchedValues: [],
      moves: 0,
      gameStartTime: Date.now(),
      childId: activeChild?.id || 'default'
    };
    setGameState(newGameState);
    
    // Reset start time when resetting game
    gameStartTime.current = Date.now();
  };

  // Track activity when game completes
  const trackGameCompletion = async () => {
    if (!activeChild) return;
    

    // Calculate efficiency - lower moves is better
    const perfectMoves = PAIRS_PER_GAME; // Perfect score would be one move per match
    const efficiency = Math.max(0, 100 - Math.floor(((moves - perfectMoves) / perfectMoves) * 50));
    
    // Calculate duration in seconds
    const duration = Math.round((Date.now() - gameStartTime.current) / 1000);

     const newOverallStatsAfterGame = await incrementGamesPlayed(activeChild.id);
      if (overallStats) { // if overallStats was loaded
          setOverallStats(prev => ({...(prev || DEFAULT_OVERALL_STATS), gamesPlayed: newOverallStatsAfterGame.gamesPlayed}));
      }


      // --- ACHIEVEMENT CHECKING (ON GAME COMPLETE) ---
      const eventsForAchievements: Parameters<typeof checkAndGrantNewAchievements>[0][] = [];
      
      eventsForAchievements.push({
          type: 'game_completed',
          gameKey: 'card_matching_game',
          moves: moves,
          durationSeconds: duration,
      });

      // If it's the first game ever played (for "Game On!" achievement)
      if (newOverallStatsAfterGame.gamesPlayed === 1) {
          // The 'matching_game_first_play' achievement type implicitly handles "first"
          // by only being awardable once.
      }

      let achievementPointsEarnedThisGame = 0;
      for (const event of eventsForAchievements) {
          const newlyEarnedFromEvent = await checkAndGrantNewAchievements(event);
          if (newlyEarnedFromEvent.length > 0) {
              newlyEarnedFromEvent.forEach(ach => {
                  achievementPointsEarnedThisGame += ach.points;
                  console.log(`CARD MATCH - GAME COMPLETE - NEW ACHIEVEMENT: ${ach.name}`);
                  enqueueAchievementUnlocked(ach);
              });
          }
      }

    await saveActivity({
      child_id: activeChild.id,
      activity_type: "cultural",
      activity_name: "Completed Matching Game",
      score: `${efficiency}%`,
      duration: duration,
      completed_at: new Date().toISOString(),
      details: `Completed Buganda Cultural Cards matching game in ${moves} moves and ${duration} seconds`
    });
    
    // Clear saved game state when game is completed
    if (activeChild) {
      await clearGameState(activeChild.id);
    }
  };

  const handleCardPress = async (card: Card) => {
    // Prevent flipping if card is already flipped or matched, or if two cards are already flipped
    if (card.flipped || card.matched || flippedCards.length >= 2) {
      return;
    }

    // Play sound effect
    try {
      await audioManager.playAppSound(require("@/assets/audio/page-turn.mp3"));
    } catch (error) {
      console.log("Error playing sound", error);
    }

    // Flip the card
    const updatedCards = cards.map((c) =>
      c.id === card.id ? { ...c, flipped: true } : c
    );

    setCards(updatedCards);

    const updatedFlippedCards = [...flippedCards, card];
    setFlippedCards(updatedFlippedCards);

    // If this is the second flipped card
    if (updatedFlippedCards.length === 2) {
      setMoves((prevMoves) => prevMoves + 1);

      // Check for a match
      const [firstCard, secondCard] = updatedFlippedCards;
      if (firstCard.value === secondCard.value) {
        // It's a match
        setTimeout(async () => {
          const matchedCards = cards.map((c) =>
            c.value === firstCard.value ? { ...c, matched: true } : c
          );

          setCards(matchedCards);
          setFlippedCards([]);
          setMatchedCount((prevCount) => prevCount + 1);
          
          // Save game state with new match
          if (activeChild) {
            setMatchStreak(prev => prev + 1); // Increment streak
            const currentTotalPairsMatched = (overallStats?.totalPairsMatched || 0) + 1;
            const newOverallStats = await updateTotalPairsMatched(1, activeChild.id);
            setOverallStats(newOverallStats); // Update local state for overall stats

            const eventsForAchievements: Parameters<typeof checkAndGrantNewAchievements>[0][] = [];

            eventsForAchievements.push({
                type: 'match_made',
                gameKey: 'card_matching_game',
                matchedCardValue: firstCard.value,
            });

            // If it's the very first match overall for this child (for "First Match!" achievement)
            if (newOverallStats.totalPairsMatched === 1) {
                // The 'matching_game_first_match' achievement type implicitly handles "first"
                // by only being awardable once. So, just sending 'match_made' is enough.
            }

            if (matchStreak + 1 >= 3) { // Check against current streak + 1 (for streak of 3)
                eventsForAchievements.push({
                    type: 'match_streak_achieved',
                    gameKey: 'card_matching_game',
                    streakCount: matchStreak + 1,
                });
            }
            
            // Event for total pairs matched update
            eventsForAchievements.push({
                type: 'stats_updated', // Generic event type
                gameKey: 'card_matching_game',
                totalPairsMatchedAcrossGames: newOverallStats.totalPairsMatched,
            });


            let achievementPointsEarnedThisTurn = 0;
            for (const event of eventsForAchievements) {
                const newlyEarnedFromEvent = await checkAndGrantNewAchievements(event);
                if (newlyEarnedFromEvent.length > 0) {
                    newlyEarnedFromEvent.forEach(ach => {
                        achievementPointsEarnedThisTurn += ach.points; // Accumulate points if any for this turn
                        console.log(`CARD MATCH - NEW ACHIEVEMENT: ${ach.name}`);
                        enqueueAchievementUnlocked(ach);
                    });
                }
            }
            const updatedMatchedValues = gameState ? 
              [...gameState.matchedValues, firstCard.value] : 
              [firstCard.value];
              
            const updatedState: CardGameState = {
              matchedValues: updatedMatchedValues,
              moves: moves + 1, // Include the move that just happened
              gameStartTime: gameStartTime.current,
              childId: activeChild.id
            };
            
            setGameState(updatedState);
            await saveGameState(updatedState, activeChild.id);
          }

          // Play match sound
          try {
            await audioManager.playAppSound(require("@/assets/sounds/correct.mp3"));
          } catch (error) {
            console.log("Error playing sound", error);
          }

          // Show info modal with symbol
          setInfoModal({
            show: true,
            info: firstCard.info,
            value: firstCard.value,
            symbol: firstCard.imageSymbol,
          });

          // Celebrate with animation
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

          // Check if all pairs are matched
          if (matchedCount + 1 === PAIRS_PER_GAME) {
            setTimeout(async () => {
              // Track game completion before showing game over screen
              await trackGameCompletion();
              setGameOver(true);
            }, 1000);
          }
        }, 500);
      } else {
        // Not a match, flip cards back
        setTimeout(() => {
          const resetCards = cards.map((c) =>
            (c.id === firstCard.id || c.id === secondCard.id) && !c.matched
              ? { ...c, flipped: false }
              : c
          );
          setCards(resetCards);
          setFlippedCards([]);
          setMatchStreak(0);
          
          // Save moves in game state
          if (activeChild && gameState) {
            const updatedState: CardGameState = {
              ...gameState,
              moves: moves + 1,
            };
            
            setGameState(updatedState);
            saveGameState(updatedState, activeChild.id);
          }
        }, 1000);
      }
    }
  };

  const closeInfoModal = () => {
    setInfoModal({ ...infoModal, show: false });
  };

  // Show loading screen while fetching saved state
  if (isLoading) {
    return (
      <View className="flex-1 bg-primary-50 justify-center items-center">
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color="#7b5af0" />
        <Text className="text-primary-700 mt-4" variant="medium">Loading your progress...</Text>
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
    <View
      className="flex-1 flex-col bg-blue-50"
      style={{ paddingLeft: insets.left, paddingRight: insets.right }}
    >
      <StatusBar style="dark" />
      {/* Top navigation bar with all elements aligned horizontally */}
      <View className="flex-row justify-between items-center px-5 pt-4 pb-1">
        {/* Back button */}
        <TouchableOpacity
          className="w-11 h-11 rounded-full bg-white items-center justify-center shadow-md border-2 border-primary-200"
          onPress={() => router.back()}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Back to Games"
        >
          <Ionicons name="arrow-back" size={20} color="#7b5af0" />
        </TouchableOpacity>

        {/* Game title in the middle */}
        <View className="flex-1 mx-3 bg-white px-4 py-2 rounded-2xl shadow-md border-2 border-blue-100">
          <Text
            className=" text-primary-700 text-center"
            variant="bold"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.84}
          >
            Buganda Cultural Cards
          </Text>
        </View>

        {/* Right side container for stats, reset and new game buttons */}
        <View className="flex-row items-center space-x-2">
          {/* Moves counter */}
          <View className="bg-white px-2.5 py-1.5 rounded-xl shadow-md border-2 border-primary-200 min-w-[74px]">
            <View className="flex-row items-center">
              <Ionicons name="swap-horizontal" size={13} color="#7b5af0" />
              <Text className="text-sm text-primary-700 ml-1" numberOfLines={1}>{moves}</Text>
            </View>
          </View>

          {/* Matches counter */}
          <View className="bg-white px-2.5 py-1.5 rounded-xl shadow-md border-2 border-primary-200 min-w-[82px]">
            <View className="flex-row items-center">
              <Ionicons name="checkmark-circle" size={13} color="#22c55e" />
              <Text className="text-sm text-primary-700 ml-1" numberOfLines={1}>
                {matchedCount}/{PAIRS_PER_GAME}
              </Text>
            </View>
          </View>

          {/* Reset button */}
          <TouchableOpacity
            className="bg-white w-11 h-11 rounded-full shadow-md border-2 border-primary-200 items-center justify-center"
            onPress={resetGame}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Reset matching game"
          >
            <Ionicons name="refresh" size={18} color="#7b5af0" />
          </TouchableOpacity>

          {/* New Game button */}
          <TouchableOpacity
            className="bg-white w-11 h-11 rounded-full shadow-md border-2 border-secondary-200 items-center justify-center"
            onPress={initGame}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Start a new matching game"
          >
            <Ionicons name="add-circle" size={19} color="#7b5af0" />
          </TouchableOpacity>
        </View>
      </View>

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
            <TouchableOpacity
              key={card.id}
              style={{
                width: cardWidth,
                height: cardHeight,
              }}
              className={`
                  rounded-2xl overflow-hidden justify-center items-center
                  shadow-md border-2
                  ${card.matched ? "border-green-400" : "border-white"}
                `}
              onPress={() => handleCardPress(card)}
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
                    style={{ fontSize: Math.max(10, cardWidth * 0.15) }}
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
          ))}
        </View>
      </Animated.View>

      {/* Info modal when match is found - with fun styling */}
      {infoModal.show && (
        <View className="absolute inset-0 bg-black/50 justify-center items-center px-5">
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
        <View className="absolute inset-0 bg-black/50 justify-center items-center px-5">
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
              onPress={initGame}
              activeOpacity={0.78}
              accessibilityRole="button"
              accessibilityLabel="Play matching game again"
            >
              <Text variant="bold" className="text-white text-xl" numberOfLines={1}>Play Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

export default BugandaMatchingGame;
