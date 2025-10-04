import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Image,
  TouchableOpacity,
  Dimensions,
  Animated,
  Alert,
  ImageSourcePropType,
} from "react-native";
import {
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
} from "react-native";
import { Audio } from "expo-av";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Text } from "@/components/StyledText";
import { saveActivity } from "@/lib/utils"; // Import saveActivity
import { useChild } from "@/context/ChildContext"; // Import useChild context
import { useAchievements } from "./achievements/useAchievements"; 
import { AchievementDefinition } from "./achievements/achievementTypes"; 
import { 
    PuzzleGameProgress, 
    DEFAULT_PUZZLE_PROGRESS, 
    loadPuzzleProgress, 
    savePuzzleProgress 
} from "./utils/progressManagerPuzzleGame"; // Import new progress manager

// Get dimensions for landscape mode
const { width, height } = Dimensions.get("window");
// Use the smaller dimension for the puzzle size but make it larger (reduced the subtraction amount)
const PUZZLE_CONTAINER_SIZE = Math.min(height - 80, width / 1.5); // Increased from (height-120, width/2)
const GRID_SIZE = 3; // Keep the same 3x3 puzzle grid
const PUZZLE_PADDING = 20;
const TILE_SIZE = (PUZZLE_CONTAINER_SIZE - PUZZLE_PADDING * 2) / GRID_SIZE;
const TILE_MARGIN = 2; // This margin seems to be applied visually by spacing animated views

// Define TypeScript interfaces
interface Position {
  row: number;
  col: number;
}

// Stores static data for each tile (ID, correct pos, image crop)
interface TileStaticData {
  id: number;
  correctPosition: Position; // The solved position for this tile ID
  imageX: number; // Crop X for the full image
  imageY: number; // Crop Y for the full image
}

interface PuzzleImage {
  id: number;
  name: string;
  source: ImageSourcePropType;
  description: string;
}

interface AnimatedPosition {
  left: Animated.Value;
  top: Animated.Value;
}

interface SoundEffects {
  tileMove: Audio.Sound | null;
  success: Audio.Sound | null;
}

// Helper to generate tile static data
const generateTileStaticData = (): Record<number, TileStaticData> => {
  const data: Record<number, TileStaticData> = {};
  for (let i = 0; i < GRID_SIZE * GRID_SIZE - 1; i++) {
    const id = i + 1;
    const row = Math.floor(i / GRID_SIZE);
    const col = i % GRID_SIZE;
    data[id] = {
      id,
      correctPosition: { row, col },
      imageX: col * TILE_SIZE,
      imageY: row * TILE_SIZE,
    };
  }
  return data;
};

const isPuzzleSolvable = (puzzle: (number | null)[][]): boolean => {
  // Create a flattened array without the empty tile
  const flatPuzzle: number[] = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (puzzle[r][c] !== null) {
        flatPuzzle.push(puzzle[r][c] as number);
      }
    }
  }

  // Count inversions
  let inversions = 0;
  for (let i = 0; i < flatPuzzle.length; i++) {
    for (let j = i + 1; j < flatPuzzle.length; j++) {
      if (flatPuzzle[i] > flatPuzzle[j]) {
        inversions++;
      }
    }
  }

  // Find empty position row from bottom (1-indexed)
  let emptyRow = 0;
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (puzzle[r][c] === null) {
        // Count from bottom, 1-indexed
        emptyRow = GRID_SIZE - r;
        break;
      }
    }
    if (emptyRow > 0) break;
  }

  // Apply solvability rules
  if (GRID_SIZE % 2 === 1) {
    // Grid width is odd
    return inversions % 2 === 0;
  } else {
    // Grid width is even
    if (emptyRow % 2 === 0) {
      // Empty row from bottom is even
      return inversions % 2 === 1;
    } else {
      // Empty row from bottom is odd
      return inversions % 2 === 0;
    }
  }
};

const BugandaPuzzleGame: React.FC = () => {
  const router = useRouter();
  const { activeChild } = useChild(); // Get active child from context
  const { 
    isLoadingAchievements, 
    checkAndGrantNewAchievements 
  } = useAchievements(activeChild?.id, 'puzzle_game'); // Game key

  const [newlyEarnedAchievementPZ, setNewlyEarnedAchievementPZ] = useState<AchievementDefinition | null>(null);
  const [puzzleProgress, setPuzzleProgress] = useState<PuzzleGameProgress>(DEFAULT_PUZZLE_PROGRESS);
  const gameStartTime = useRef(Date.now()); // Track when game started

  const puzzleImages: PuzzleImage[] = [
    {
      id: 1,
      name: "Kasubi Tombs",
      source: require("../../assets/puzzles/kasubi-tombs.jpg"),
      description:
        "A UNESCO World Heritage site and burial ground of Buganda kings",
    },
    {
      id: 2,
      name: "Buganda Royal Drums",
      source: require("../../assets/puzzles/buganda-drums.jpg"),
      description: "Traditional royal drums used in Buganda ceremonies",
    },
    {
      id: 3,
      name: "Lubiri Palace",
      source: require("../../assets/puzzles/lubiri-palace.jpg"),
      description: "The palace of the Kabaka (King) of Buganda",
    },
  ];

  // Initialize with a random puzzle when the component first loads
  const [currentPuzzle, setCurrentPuzzle] = useState<number>(
    Math.floor(Math.random() * puzzleImages.length)
  );
  const [grid, setGrid] = useState<(number | null)[][]>([]);
  const [emptySlotPosition, setEmptySlotPosition] = useState<Position>({ row: GRID_SIZE -1, col: GRID_SIZE -1 });
  const [tileStaticData, _setTileStaticData] = useState<Record<number, TileStaticData>>(generateTileStaticData());
  
  const [isComplete, setIsComplete] = useState<boolean>(false);
  const [moves, setMoves] = useState<number>(0);
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [showPreview, setShowPreview] = useState<boolean>(true);
  const [soundEffects, setSoundEffects] = useState<SoundEffects>({
    tileMove: null,
    success: null,
  });
  const [animatedPositions, setAnimatedPositions] = useState<
    Record<number, AnimatedPosition>
  >({});

  const previewAnim = useRef(new Animated.Value(1)).current;
  const successAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const initPuzzleProgress = async () => {
      if (activeChild) {
        const loadedProg = await loadPuzzleProgress(activeChild.id);
        setPuzzleProgress(loadedProg);

        // Check for "First Play" achievement if this is the very first time
        // This check needs to be careful not to run on every component mount.
        // One way is if totalGamesPlayed was 0 and now it's being incremented.
        // Or, if we move totalGamesPlayed increment to initializePuzzle and check there.
      } else {
        setPuzzleProgress({ ...DEFAULT_PUZZLE_PROGRESS, childId: 'default' });
      }
    };
    initPuzzleProgress();
  }, [activeChild]);

  useEffect(() => {
    const loadSounds = async () => {
      const tileMoveSound = new Audio.Sound();
      const successSound = new Audio.Sound();
      try {
        await tileMoveSound.loadAsync(require("../../assets/audio/page-turn.mp3"));
        await successSound.loadAsync(require("../../assets/audio/complete.mp3"));
        setSoundEffects({ tileMove: tileMoveSound, success: successSound });
      } catch (error) {
        console.error("Failed to load sounds", error);
      }
    };
    loadSounds();
    return () => {
      soundEffects.tileMove?.unloadAsync();
      soundEffects.success?.unloadAsync();
    };
  }, []);

  useEffect(() => {
    if (showPreview) {
      setTimeout(() => {
        Animated.timing(previewAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }).start(() => {
          setShowPreview(false);
          initializePuzzle();
        });
      }, 3000);
    }
  }, [showPreview, currentPuzzle]); // Added currentPuzzle to re-init on puzzle change

  useEffect(() => {
    // Reset the game start time whenever a new puzzle starts
    gameStartTime.current = Date.now();
  }, [currentPuzzle, showPreview]);

  const initializePuzzle = async (): Promise<void> => {
    // 1. Create solved grid
    const solvedGrid: (number | null)[][] = [];
    let tileCounter = 1;
    for (let r = 0; r < GRID_SIZE; r++) {
      solvedGrid[r] = [];
      for (let c = 0; c < GRID_SIZE; c++) {
        if (r === GRID_SIZE - 1 && c === GRID_SIZE - 1) {
          solvedGrid[r][c] = null; // Last slot is empty
        } else {
          solvedGrid[r][c] = tileCounter++;
        }
      }
    }
    
    let currentShuffledGrid = solvedGrid.map(row => [...row]);
    let currentEmptySlot = { row: GRID_SIZE - 1, col: GRID_SIZE - 1 };

    // 2. Shuffle by making random valid moves
    const shuffleMoveCount = 100 + Math.floor(Math.random() * 50); // Ensure enough shuffles
    for (let i = 0; i < shuffleMoveCount; i++) {
      const movableTilesPositions: Position[] = [];
      const { row: er, col: ec } = currentEmptySlot;

      if (er > 0) movableTilesPositions.push({ row: er - 1, col: ec }); // Tile above empty
      if (er < GRID_SIZE - 1) movableTilesPositions.push({ row: er + 1, col: ec }); // Tile below empty
      if (ec > 0) movableTilesPositions.push({ row: er, col: ec - 1 }); // Tile left of empty
      if (ec < GRID_SIZE - 1) movableTilesPositions.push({ row: er, col: ec + 1 }); // Tile right of empty
      
      if (movableTilesPositions.length > 0) {
        const randomMoveIndex = Math.floor(Math.random() * movableTilesPositions.length);
        const tileToMoveOriginalPos = movableTilesPositions[randomMoveIndex];
        
        // Swap tile with empty slot in currentShuffledGrid
        currentShuffledGrid[currentEmptySlot.row][currentEmptySlot.col] = currentShuffledGrid[tileToMoveOriginalPos.row][tileToMoveOriginalPos.col];
        currentShuffledGrid[tileToMoveOriginalPos.row][tileToMoveOriginalPos.col] = null;
        
        // Update currentEmptySlot to the position where the tile was
        currentEmptySlot = { ...tileToMoveOriginalPos };
      }
    }

    // Ensure the puzzle is solvable
    while (!isPuzzleSolvable(currentShuffledGrid)) {
      currentShuffledGrid = solvedGrid.map(row => [...row]);
      currentEmptySlot = { row: GRID_SIZE - 1, col: GRID_SIZE - 1 };
      for (let i = 0; i < shuffleMoveCount; i++) {
        const movableTilesPositions: Position[] = [];
        const { row: er, col: ec } = currentEmptySlot;

        if (er > 0) movableTilesPositions.push({ row: er - 1, col: ec }); // Tile above empty
        if (er < GRID_SIZE - 1) movableTilesPositions.push({ row: er + 1, col: ec }); // Tile below empty
        if (ec > 0) movableTilesPositions.push({ row: er, col: ec - 1 }); // Tile left of empty
        if (ec < GRID_SIZE - 1) movableTilesPositions.push({ row: er, col: ec + 1 }); // Tile right of empty
        
        if (movableTilesPositions.length > 0) {
          const randomMoveIndex = Math.floor(Math.random() * movableTilesPositions.length);
          const tileToMoveOriginalPos = movableTilesPositions[randomMoveIndex];
          
          // Swap tile with empty slot in currentShuffledGrid
          currentShuffledGrid[currentEmptySlot.row][currentEmptySlot.col] = currentShuffledGrid[tileToMoveOriginalPos.row][tileToMoveOriginalPos.col];
          currentShuffledGrid[tileToMoveOriginalPos.row][tileToMoveOriginalPos.col] = null;
          
          // Update currentEmptySlot to the position where the tile was
          currentEmptySlot = { ...tileToMoveOriginalPos };
        }
      }
    }

    // Check if the shuffled puzzle is solvable
    if (!isPuzzleSolvable(currentShuffledGrid)) {
      // Swap any two tiles to make it solvable
      let firstNonEmptyTile = null;
      let secondNonEmptyTile = null;
      
      // Find two non-empty tiles
      outerLoop: for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (currentShuffledGrid[r][c] !== null) {
            if (firstNonEmptyTile === null) {
              firstNonEmptyTile = { row: r, col: c };
            } else {
              secondNonEmptyTile = { row: r, col: c };
              break outerLoop;
            }
          }
        }
      }
      
      // Swap them
      if (firstNonEmptyTile && secondNonEmptyTile) {
        const temp = currentShuffledGrid[firstNonEmptyTile.row][firstNonEmptyTile.col];
        currentShuffledGrid[firstNonEmptyTile.row][firstNonEmptyTile.col] = 
          currentShuffledGrid[secondNonEmptyTile.row][secondNonEmptyTile.col];
        currentShuffledGrid[secondNonEmptyTile.row][secondNonEmptyTile.col] = temp;
      }
    }

    setGrid(currentShuffledGrid);
    setEmptySlotPosition(currentEmptySlot);

    // 3. Initialize animated positions for tiles based on the shuffled grid
    const newAnimatedPositions: Record<number, AnimatedPosition> = {};
    currentShuffledGrid.forEach((rowItems, r) => {
      rowItems.forEach((tileId, c) => {
        if (tileId !== null) {
          newAnimatedPositions[tileId] = {
            left: new Animated.Value(c * (TILE_SIZE + TILE_MARGIN * 2) + PUZZLE_PADDING),
            top: new Animated.Value(r * (TILE_SIZE + TILE_MARGIN * 2) + PUZZLE_PADDING),
          };
        }
      });
    });
    setAnimatedPositions(newAnimatedPositions);

    setGameStarted(true);
    setMoves(0);
    setIsComplete(false);
    successAnim.setValue(0); // Reset success animation

     // Increment games played and save progress
    if (activeChild) {
        const currentGamesPlayed = puzzleProgress.totalGamesPlayed || 0;
        const newProgress: PuzzleGameProgress = {
            ...puzzleProgress,
            totalGamesPlayed: currentGamesPlayed + 1,
            childId: activeChild.id, // Ensure childId is set
        };
        setPuzzleProgress(newProgress); // Update local state
        await savePuzzleProgress(newProgress, activeChild.id);

        // Check for "First Play" achievement
        if (newProgress.totalGamesPlayed === 1) {
            const eventFirstPlay: Parameters<typeof checkAndGrantNewAchievements>[0] = {
                type: 'puzzle_game_started',
                gameKey: 'puzzle_game',
                puzzleGameProgress: newProgress,
            };
            const newlyEarned = await checkAndGrantNewAchievements(eventFirstPlay);
            if (newlyEarned.length > 0) {
                newlyEarned.forEach(ach => {
                    console.log(`PUZZLE GAME - FIRST PLAY - NEW ACHIEVEMENT: ${ach.name}`);
                    setNewlyEarnedAchievementPZ(ach);
                    // Handle points if necessary
                });
            }
        }
    }
    gameStartTime.current = Date.now();
  };
  
  const moveTile = (tileId: number): void => {
    if (isComplete || !grid.length) return;

    let tilePos: Position | null = null;
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (grid[r][c] === tileId) {
          tilePos = { row: r, col: c };
          break;
        }
      }
      if (tilePos) break;
    }

    if (!tilePos) {
      console.error(`Tile ${tileId} not found in grid.`);
      return;
    }

    const { row: tr, col: tc } = tilePos;
    const { row: er, col: ec } = emptySlotPosition;

    // Check if the tile is adjacent to the empty slot
    const isAdjacent = Math.abs(tr - er) + Math.abs(tc - ec) === 1;

    if (isAdjacent) {
      soundEffects.tileMove?.replayAsync();

      const newLeft = ec * (TILE_SIZE + TILE_MARGIN * 2) + PUZZLE_PADDING;
      const newTop = er * (TILE_SIZE + TILE_MARGIN * 2) + PUZZLE_PADDING;

      const newGrid = grid.map(r_ => [...r_]); // Deep copy grid
      newGrid[er][ec] = tileId;       // Move tile to empty slot's old position
      newGrid[tr][tc] = null;         // Tile's old position becomes empty

      Animated.parallel([
        Animated.timing(animatedPositions[tileId].left, {
          toValue: newLeft,
          duration: 150,
          useNativeDriver: false,
        }),
        Animated.timing(animatedPositions[tileId].top, {
          toValue: newTop,
          duration: 150,
          useNativeDriver: false,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          setGrid(newGrid); // Update grid state after animation
          setEmptySlotPosition({ row: tr, col: tc }); // Update empty slot to tile's old position
          checkPuzzleCompletion(newGrid); // Pass the new grid for completion check
        }
      });
      setMoves(m => m + 1);
    }
  };

  const trackActivity = async (isCompleted: boolean = true) => {
    if (!activeChild) return;

    // Calculate duration in seconds
    const duration = Math.round((Date.now() - gameStartTime.current) / 1000);

    // Save activity to Supabase
    await saveActivity({
      child_id: activeChild.id,
      activity_type: "puzzle",
      activity_name: `${puzzleImages[currentPuzzle].name} Puzzle`,
      score: isCompleted ? "100%" : `${Math.round((moves > 0 ? 100 / moves : 100))}%`,
      duration,
      completed_at: new Date().toISOString(),
      details: `${isCompleted ? 'Completed' : 'Attempted'} the ${puzzleImages[currentPuzzle].name} puzzle in ${moves} moves`,
      level: currentPuzzle + 1,
    });
  };

  const checkPuzzleCompletion = async (currentGridToCheck: (number | null)[][]): Promise<void> => {
    let completed = true;
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const tileIdInGrid = currentGridToCheck[r][c];
        if (r === GRID_SIZE - 1 && c === GRID_SIZE - 1) { // Last slot should be empty
          if (tileIdInGrid !== null) {
            completed = false;
            break;
          }
        } else {
          const expectedTileId = r * GRID_SIZE + c + 1;
          if (tileIdInGrid !== expectedTileId) {
            completed = false;
            break;
          }
        }
      }
      if (!completed) break;
    }

    if (completed) {
      setIsComplete(true);
      soundEffects.success?.replayAsync();
      
      // Track the completed activity
      trackActivity(true);

      let finalPuzzleProgress = puzzleProgress;

      if (activeChild) {
          // Update PuzzleGameProgress: add current puzzleId to completedPuzzleIds
          const currentPuzzleId = puzzleImages[currentPuzzle].id;
          let updatedCompletedIds = [...puzzleProgress.completedPuzzleIds];
          if (!updatedCompletedIds.includes(currentPuzzleId)) {
              updatedCompletedIds.push(currentPuzzleId);
          }
          const newProgress: PuzzleGameProgress = {
              ...puzzleProgress,
              completedPuzzleIds: updatedCompletedIds,
              childId: activeChild.id, // Ensure childId
          };
          setPuzzleProgress(newProgress); // Update local state
          await savePuzzleProgress(newProgress, activeChild.id);
          finalPuzzleProgress = newProgress; // Use this for achievement check

          // --- ACHIEVEMENT CHECKING (ON PUZZLE COMPLETE) ---
          const durationSeconds = Math.round((Date.now() - gameStartTime.current) / 1000);
          const eventComplete: Parameters<typeof checkAndGrantNewAchievements>[0] = {
              type: 'puzzle_game_completed_successfully',
              gameKey: 'puzzle_game',
              puzzleId: currentPuzzleId,
              movesTaken: moves + 1, // +1 because setMoves is async
              durationInSeconds: durationSeconds,
              puzzleGameProgress: finalPuzzleProgress, // Pass the latest progress
              totalUniquePuzzlesAvailable: puzzleImages.length,
          };

          const newlyEarned = await checkAndGrantNewAchievements(eventComplete);
          if (newlyEarned.length > 0) {
              // No game-specific score to update with achievement points for this puzzle game.
              // Points contribute to global child score if such a system exists.
              newlyEarned.forEach(ach => {
                  console.log(`PUZZLE GAME - COMPLETE - NEW ACHIEVEMENT: ${ach.name}`);
                  setNewlyEarnedAchievementPZ(ach);
              });
          }
          // --- END ACHIEVEMENT CHECKING ---
      }
      
      Animated.spring(successAnim, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }).start();

      setTimeout(() => {
        Alert.alert(
          "Congratulations!",
          `You completed the ${puzzleImages[currentPuzzle].name} puzzle in ${moves + 1} moves!`, // moves+1 because setMoves is async
          [
            {
              text: "Next Puzzle",
              onPress: () => {
                // Reset gameStartTime for the next puzzle
                gameStartTime.current = Date.now();
                
                // Select a random puzzle that's different from the current one
                let randomPuzzleIndex;
                do {
                  randomPuzzleIndex = Math.floor(Math.random() * puzzleImages.length);
                } while (randomPuzzleIndex === currentPuzzle && puzzleImages.length > 1);
                
                setCurrentPuzzle(randomPuzzleIndex);
                setShowPreview(true);
                previewAnim.setValue(1);
              },
            },
          ]
        );
      }, 1000);
    }
  };

  const renderAchievementUnlockedModalPZ = () => {
    if (!newlyEarnedAchievementPZ) return null;
    // Use same modal structure as other games
    return (
      <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
        <View style={{ backgroundColor: 'white', borderRadius: 20, padding: 24, width: '85%', maxWidth: 380, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5 }}>
          <View style={{ position: 'absolute', top: -40, backgroundColor: '#f59e0b', width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: 'white' }}>
            <Ionicons name={(newlyEarnedAchievementPZ.icon_name as any) || "star"} size={36} color="white" />
          </View>
          <Text style={{ fontWeight: 'bold', fontSize: 20, color: '#b45309', marginTop: 48, marginBottom: 8, textAlign: 'center' }}>
            Achievement Unlocked!
          </Text>
          <Text style={{ fontWeight: 'bold', fontSize: 24, color: '#374151', marginBottom: 8, textAlign: 'center' }}>
            {newlyEarnedAchievementPZ.name}
          </Text>
          <Text style={{ fontSize: 14, color: '#4b5563', textAlign: 'center', marginBottom: 16 }}>
            {newlyEarnedAchievementPZ.description}
          </Text>
          <Text style={{ fontWeight: 'bold', fontSize: 18, color: '#f59e0b', marginBottom: 24 }}>
            +{newlyEarnedAchievementPZ.points} Points!
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: '#f59e0b', paddingVertical: 12, paddingHorizontal: 40, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1.41, elevation: 2 }}
            onPress={() => setNewlyEarnedAchievementPZ(null)}
          >
            <Text style={{ fontWeight: 'bold', color: 'white', fontSize: 16, textAlign: 'center' }}>
              Awesome!
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const handleReset = () => {
    // Track the current attempt before resetting
    if (gameStarted && !showPreview && !isComplete && moves > 0) {
      trackActivity(false);
    }
    
    // Reset gameStartTime
    gameStartTime.current = Date.now();
    initializePuzzle();
  };

  // When leaving the game, track the unfinished activity
  useEffect(() => {
    return () => {
      // Only track if game was actually played but not completed
      if (gameStarted && !showPreview && !isComplete && moves > 0) {
        trackActivity(false);
      }
    };
  }, [gameStarted, showPreview, isComplete, moves]);

  const createTilePanResponder = (tileId: number, tileRow: number, tileCol: number) => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => !isComplete,
      onMoveShouldSetPanResponder: (
        _: GestureResponderEvent,
        gestureState: PanResponderGestureState
      ) => {
        const { dx, dy } = gestureState;
        return !isComplete && (Math.abs(dx) > 10 || Math.abs(dy) > 10);
      },
      onPanResponderRelease: (
        _: GestureResponderEvent,
        gestureState: PanResponderGestureState
      ) => {
        const { dx, dy } = gestureState;
        const { row: emptyRow, col: emptyCol } = emptySlotPosition;

        let canSwipeMove = false;
        if (Math.abs(dx) > Math.abs(dy)) { // Horizontal swipe
          if (dx > 0 && tileRow === emptyRow && tileCol + 1 === emptyCol) { // Swipe Right towards empty
            canSwipeMove = true;
          } else if (dx < 0 && tileRow === emptyRow && tileCol - 1 === emptyCol) { // Swipe Left towards empty
            canSwipeMove = true;
          }
        } else { // Vertical swipe
          if (dy > 0 && tileCol === emptyCol && tileRow + 1 === emptyRow) { // Swipe Down towards empty
            canSwipeMove = true;
          } else if (dy < 0 && tileCol === emptyCol && tileRow - 1 === emptyRow) { // Swipe Up towards empty
            canSwipeMove = true;
          }
        }

        if (canSwipeMove) {
          moveTile(tileId);
        }
      },
    });
  };

  const renderPuzzleTiles = () => {
    if (showPreview || !grid.length || Object.keys(animatedPositions).length === 0) {
        return null;
    }

    return grid.flatMap((rowItems, r) =>
      rowItems.map((tileId, c) => {
        if (tileId === null) return null; // Don't render for the empty slot

        const staticInfo = tileStaticData[tileId];
        if (!staticInfo) {
          console.warn(`Static data not found for tile ${tileId}`);
          return null;
        }

        const animPos = animatedPositions[tileId];
        if (!animPos) {
          // console.warn(`Animated position not found for tile ${tileId}`);
          return null; // Can happen briefly during init
        }

        const panResponder = createTilePanResponder(tileId, r, c);
        const isTileAdjacentToEmpty = Math.abs(r - emptySlotPosition.row) + Math.abs(c - emptySlotPosition.col) === 1;

        return (
          <Animated.View
            key={tileId}
            className={`absolute rounded-md overflow-hidden justify-center items-center border border-purple-700`}
            style={{
              width: TILE_SIZE,
              height: TILE_SIZE,
              left: animPos.left,
              top: animPos.top,
              zIndex: 1,
            }}
            {...panResponder.panHandlers}
          >
            <TouchableOpacity
              className="w-full h-full justify-center items-center"
              hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
              onPress={() => {
                moveTile(tileId);
              }}
              activeOpacity={0.6}
              accessible={true}
              accessibilityLabel={`Tile ${tileId}`}
              accessibilityHint={
                isTileAdjacentToEmpty
                  ? "Double tap to move this tile or swipe it toward the empty space"
                  : "This tile cannot be moved"
              }
              accessibilityRole="button"
              accessibilityState={{ disabled: !isTileAdjacentToEmpty }}
            >
              <Image
                source={puzzleImages[currentPuzzle].source}
                className="absolute"
                style={{
                  width: PUZZLE_CONTAINER_SIZE - PUZZLE_PADDING * 2,
                  height: PUZZLE_CONTAINER_SIZE - PUZZLE_PADDING * 2,
                  top: -staticInfo.imageY,
                  left: -staticInfo.imageX,
                }}
                accessible={false}
              />
              <View
                className={`absolute bottom-[5px] right-[5px] bg-white/70 rounded-full w-5 h-5 justify-center items-center`}
              >
                <Text variant="bold" className="text-xs text-purple-800">
                  {tileId}
                </Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        );
      })
    );
  };

  return (
    <View className="flex-1 bg-indigo-50">
      <StatusBar style="dark" />
      {renderAchievementUnlockedModalPZ()}

      <TouchableOpacity
        className="w-12 h-12 rounded-full bg-white items-center justify-center shadow-md border-2 border-primary-200 mx-6 mt-6"
        onPress={() => {
          // Track activity before leaving if puzzle was started but not completed
          if (gameStarted && !showPreview && !isComplete && moves > 0) {
            trackActivity(false);
          }
          router.back();
        }}
        activeOpacity={0.7}
      >
        <Ionicons name="arrow-back" size={22} color="#7b5af0" />
      </TouchableOpacity>

      <View className="flex-1 flex-row p-2.5">
        <View className="flex-0.8 justify-center items-center px-2.5 ml-auto">
          <View
            className="bg-purple-100 rounded-lg overflow-hidden relative border-2 border-purple-400"
            style={{
              width: PUZZLE_CONTAINER_SIZE,
              height: PUZZLE_CONTAINER_SIZE,
            }}
          >
            {showPreview && (
              <Animated.View
                className="absolute w-full h-full justify-center items-center bg-purple-50 z-10"
                style={{ opacity: previewAnim }}
              >
                <Image
                  source={puzzleImages[currentPuzzle].source}
                  className="w-4/5 h-4/5"
                  resizeMode="contain"
                />
                <Text variant="bold" className="text-lg text-purple-700 mt-2.5">
                  Memorize the image
                </Text>
              </Animated.View>
            )}

            {renderPuzzleTiles()}

            <Animated.View
              className="absolute w-full h-full justify-center items-center bg-purple-400/90 z-20"
              style={{
                opacity: successAnim,
                transform: [
                  {
                    scale: successAnim.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0.5, 1.2, 1],
                    }),
                  },
                ],
              }}
              pointerEvents={isComplete ? "auto" : "none"}
            >
              <Image
                source={puzzleImages[currentPuzzle].source}
                className="w-[70%] h-[60%] rounded-lg border-3 border-white"
                resizeMode="contain"
              />
              <Text
                variant="bold"
                className="text-2xl text-white mt-5 shadow-sm"
              >
                Well done!
              </Text>
            </Animated.View>
          </View>
        </View>

        <View className="flex-1.2 justify-center px-5">
          <View className="w-full items-center mb-5">
            <Text variant="bold" className="text-2xl text-indigo-800 mb-2.5">
              {puzzleImages[currentPuzzle].name}
            </Text>
            {gameStarted && (
              <Text className="text-xl text-indigo-500">Moves: {moves}</Text>
            )}
          </View>

          <View className="w-full items-center my-5">
            <Text className="text-lg text-center text-slate-600 mb-6">
              {puzzleImages[currentPuzzle].description}
            </Text>

            {gameStarted && !showPreview && (
              <TouchableOpacity
                className="bg-purple-700 py-3 px-6 rounded-full shadow-md"
                onPress={handleReset} // Use handleReset instead of initializePuzzle directly
                accessible={true}
                accessibilityLabel="Reset Puzzle"
                accessibilityHint="Starts a new shuffled puzzle"
                accessibilityRole="button"
              >
                <Text variant="bold" className="text-lg text-white">
                  Reset Puzzle
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </View>
  );
};

export default BugandaPuzzleGame;