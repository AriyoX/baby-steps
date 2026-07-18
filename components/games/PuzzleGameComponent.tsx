import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Image,
  TouchableOpacity,
  useWindowDimensions,
  Animated,
  Alert,
  PanResponder,
  type GestureResponderEvent,
  type ImageSourcePropType,
  type PanResponderGestureState,
} from "react-native";
import type { Audio } from "expo-av";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Text } from "@/components/StyledText";
import { ChildLoadingState } from "@/components/child/ChildLoadingState";
import {
  DEFAULT_LEARNING_LANGUAGE_CODE,
  getDbLanguageCodeForLearningLanguage,
} from "@/content/languages";
import {
  loadContentBundle,
  resolveImageSource,
  type PuzzleGameDefinition,
} from "@/content/contentRepository";
import { saveActivity } from "@/lib/utils"; // Import saveActivity
import { useChild } from "@/context/ChildContext"; // Import useChild context
import { useChildNotice } from "@/context/ChildNoticeContext";
import { useAchievements } from "./achievements/useAchievements"; 
import { 
    PuzzleGameProgress, 
    DEFAULT_PUZZLE_PROGRESS, 
    loadPuzzleProgress, 
    savePuzzleProgress 
} from "./utils/progressManagerPuzzleGame"; // Import new progress manager
import { audioManager } from "@/lib/audioManager";
import {
  completeLocallyFirst,
  type LocalFirstCompletionResult,
  type LocalPersistenceStatus,
} from "@/lib/completionReliability";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  GameHeader,
  GameStatChip,
  GameTour,
  GameTourProvider,
  TourTarget,
  useGameTour,
} from "./GameTour";

const GRID_SIZE = 3; // Keep the same 3x3 puzzle grid
const PUZZLE_PADDING = 20;
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
  order: number;
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
const generateTileStaticData = (tileSize: number): Record<number, TileStaticData> => {
  const data: Record<number, TileStaticData> = {};
  for (let i = 0; i < GRID_SIZE * GRID_SIZE - 1; i++) {
    const id = i + 1;
    const row = Math.floor(i / GRID_SIZE);
    const col = i % GRID_SIZE;
    data[id] = {
      id,
      correctPosition: { row, col },
      imageX: col * tileSize,
      imageY: row * tileSize,
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

export interface PuzzleCompletionOptions {
  progress: PuzzleGameProgress;
  persistProgress: () => Promise<void>;
  revealCompletion: (
    progress: PuzzleGameProgress,
    persistence: LocalPersistenceStatus,
  ) => void;
  saveCompletionActivity: (
    progress: PuzzleGameProgress,
    persistence: LocalPersistenceStatus,
  ) => Promise<unknown>;
  evaluateAchievements: (
    progress: PuzzleGameProgress,
    persistence: LocalPersistenceStatus,
  ) => Promise<void>;
  onLocalError?: (error: unknown) => void;
  onNetworkError?: (error: unknown) => void;
}

export const getPlayablePuzzleDefinitions = (
  definitions: PuzzleGameDefinition[] | undefined,
): PuzzleGameDefinition[] | undefined => {
  if (!Array.isArray(definitions) || definitions.length === 0) {
    return undefined;
  }

  const ids = new Set<number>();
  const orders = new Set<number>();

  for (const definition of definitions) {
    if (
      !Number.isInteger(definition.id) ||
      definition.id <= 0 ||
      typeof definition.name !== "string" ||
      !definition.name.trim() ||
      typeof definition.description !== "string" ||
      !definition.description.trim() ||
      typeof definition.image !== "string" ||
      !definition.image.trim() ||
      !Number.isFinite(definition.order) ||
      ids.has(definition.id) ||
      orders.has(definition.order)
    ) {
      return undefined;
    }

    ids.add(definition.id);
    orders.add(definition.order);
  }

  return [...definitions].sort((left, right) => left.order - right.order);
};

export const completePuzzleLocallyFirst = async ({
  progress,
  persistProgress,
  revealCompletion,
  saveCompletionActivity,
  evaluateAchievements,
  onLocalError,
  onNetworkError,
}: PuzzleCompletionOptions): Promise<LocalFirstCompletionResult<PuzzleGameProgress>> =>
  completeLocallyFirst({
    persistLocal: async () => {
      await persistProgress();
      return progress;
    },
    fallbackValue: progress,
    revealCompletion,
    runBestEffortNetworkWork: async (saved, persistence) => {
      await Promise.all([
        saveCompletionActivity(saved, persistence),
        evaluateAchievements(saved, persistence),
      ]);
    },
    onLocalError,
    onNetworkError,
  });

export const runPuzzleAnimationCompletion = (
  finished: boolean,
  isMounted: () => boolean,
  commitAnimatedMove: () => void,
  checkCompletion: () => Promise<void>,
  onError: (error: unknown) => void,
): void => {
  if (!finished || !isMounted()) return;
  commitAnimatedMove();
  void checkCompletion().catch(onError);
};

const PuzzleGame: React.FC = () => {
  const router = useRouter();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const landscapeWidth = Math.max(windowWidth, windowHeight);
  const landscapeHeight = Math.min(windowWidth, windowHeight) - insets.top - insets.bottom;
  const puzzleContainerSize = Math.max(
    196,
    Math.min(300, landscapeHeight - 70, landscapeWidth * 0.42),
  );
  const tileSize = (puzzleContainerSize - PUZZLE_PADDING * 2) / GRID_SIZE;
  const { activeChild } = useChild(); // Get active child from context
  const puzzleTour = useGameTour("puzzle", activeChild?.id);
  const languageCode = getDbLanguageCodeForLearningLanguage(
    activeChild?.selected_language_code || DEFAULT_LEARNING_LANGUAGE_CODE,
  );
  const contentScope = `${activeChild?.id ?? "guest"}:${languageCode}`;
  const { checkAndGrantNewAchievements } = useAchievements(
    activeChild?.id,
    "puzzle_game",
  );
  const { enqueueAchievementUnlocked } = useChildNotice();

  const [puzzleProgress, setPuzzleProgress] = useState<PuzzleGameProgress>(DEFAULT_PUZZLE_PROGRESS);
  const [puzzleImages, setPuzzleImages] = useState<PuzzleImage[]>([]);
  const [puzzleTitle, setPuzzleTitle] = useState("Logic Puzzle");
  const [isContentLoading, setIsContentLoading] = useState(true);
  const [contentUnavailable, setContentUnavailable] = useState(false);
  const [contentRetryVersion, setContentRetryVersion] = useState(0);
  const [hydratedScope, setHydratedScope] = useState<string | null>(null);
  const gameStartTime = useRef(Date.now()); // Track when game started
  const isCompletingRef = useRef(false);
  const isMountedRef = useRef(true);
  const pendingTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
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

  const [currentPuzzle, setCurrentPuzzle] = useState<number>(0);
  const [grid, setGrid] = useState<(number | null)[][]>([]);
  const [emptySlotPosition, setEmptySlotPosition] = useState<Position>({ row: GRID_SIZE -1, col: GRID_SIZE -1 });
  const tileStaticData = useMemo(() => generateTileStaticData(tileSize), [tileSize]);
  
  const [isComplete, setIsComplete] = useState<boolean>(false);
  const [moves, setMoves] = useState<number>(0);
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [showPreview, setShowPreview] = useState<boolean>(false);
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
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      clearPendingTimers();
      previewAnim.stopAnimation();
      successAnim.stopAnimation();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const requestedChildId = activeChild?.id;
    const requestedLanguageCode = languageCode;
    const requestedScope = `${requestedChildId ?? "guest"}:${requestedLanguageCode}`;

    setIsContentLoading(true);
    setContentUnavailable(false);
    setHydratedScope(null);
    setPuzzleImages([]);
    setShowPreview(false);
    clearPendingTimers();

    const initPuzzleContentAndProgress = async () => {
      try {
        const result = await loadContentBundle(requestedLanguageCode, {
          forceRefresh: true,
        });
        if (cancelled || !isMountedRef.current) return;

        const puzzleContent =
          result.bundle?.languageCode === requestedLanguageCode
            ? result.bundle.puzzleGame
            : undefined;
        const contentProgressRevision =
          result.bundle?.progressRevisions?.puzzle_game;
        const definitions = getPlayablePuzzleDefinitions(puzzleContent?.puzzles);

        if (!definitions) {
          setContentUnavailable(true);
          return;
        }

        contentProgressRevisionRef.current = contentProgressRevision;

        const resolvedPuzzles = definitions.map((definition) => ({
          id: definition.id,
          name: definition.name,
          description: definition.description,
          order: definition.order,
          source: resolveImageSource(definition.image, "african-logic.png"),
        }));

        let loadedProgress = { ...DEFAULT_PUZZLE_PROGRESS, childId: "default" };
        if (requestedChildId) {
          try {
            loadedProgress = await loadPuzzleProgress(
              requestedChildId,
              requestedLanguageCode,
              contentProgressRevision,
            );
          } catch (error) {
            console.warn("Could not restore Puzzle progress; starting safely:", error);
            loadedProgress = {
              ...DEFAULT_PUZZLE_PROGRESS,
              childId: requestedChildId,
            };
          }
        }
        if (cancelled || !isMountedRef.current) return;

        setPuzzleProgress(loadedProgress);
        setPuzzleTitle(puzzleContent?.title || "Logic Puzzle");
        setPuzzleImages(resolvedPuzzles);
        setCurrentPuzzle(Math.floor(Math.random() * resolvedPuzzles.length));
        setGrid([]);
        setAnimatedPositions({});
        setGameStarted(false);
        setIsComplete(false);
        setMoves(0);
        previewAnim.setValue(1);
        setShowPreview(true);
      } catch (error) {
        console.warn("Could not initialize Puzzle content or progress:", error);
        if (!cancelled && isMountedRef.current) {
          setContentUnavailable(true);
        }
      } finally {
        if (!cancelled && isMountedRef.current) {
          setHydratedScope(requestedScope);
          setIsContentLoading(false);
        }
      }
    };

    void initPuzzleContentAndProgress().catch((error) => {
      console.warn("Could not finish Puzzle initialization:", error);
    });

    return () => {
      cancelled = true;
      clearPendingTimers();
    };
  }, [activeChild?.id, contentRetryVersion, languageCode]);

  useEffect(() => {
    const loadedSounds: Audio.Sound[] = [];
    let cancelled = false;

    const loadSounds = async () => {
      try {
        const tileMoveSound = await audioManager.createAppSound(require("../../assets/audio/page-turn.mp3"));
        const successSound = await audioManager.createAppSound(require("../../assets/audio/complete.mp3"));

        const createdSounds = [tileMoveSound, successSound].filter(
          (sound): sound is Audio.Sound => Boolean(sound),
        );
        if (cancelled) {
          createdSounds.forEach((sound) => {
            void audioManager.unloadAppSound(sound).catch((error) => {
              console.warn("Could not unload a late Puzzle sound:", error);
            });
          });
          return;
        }
        loadedSounds.push(...createdSounds);

        if (isMountedRef.current) {
          setSoundEffects({ tileMove: tileMoveSound, success: successSound });
        }
      } catch (error) {
        console.error("Failed to load sounds", error);
      }
    };
    void loadSounds().catch((error) => {
      console.warn("Could not initialize Puzzle sounds:", error);
    });
    return () => {
      cancelled = true;
      loadedSounds.forEach((loadedSound) => {
        void audioManager.unloadAppSound(loadedSound).catch((error) => {
          console.warn("Could not unload a Puzzle sound:", error);
        });
      });
    };
  }, []);

  useEffect(() => {
    if (
      !showPreview ||
      puzzleTour.visible ||
      hydratedScope !== contentScope ||
      !puzzleImages[currentPuzzle]
    ) {
      return;
    }

    scheduleTimer(() => {
      if (!isMountedRef.current) return;
        Animated.timing(previewAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }).start(() => {
          if (!isMountedRef.current) return;
          setShowPreview(false);
          void initializePuzzle().catch((error) => {
            console.warn("Could not initialize the Puzzle board:", error);
          });
        });
    }, 3000);

    return () => {
      clearPendingTimers();
      previewAnim.stopAnimation();
    };
  }, [contentScope, currentPuzzle, hydratedScope, puzzleImages.length, puzzleTour.visible, showPreview]);

  useEffect(() => {
    // Reset the game start time whenever a new puzzle starts
    gameStartTime.current = Date.now();
  }, [currentPuzzle, showPreview]);

  const initializePuzzle = async (): Promise<void> => {
    if (!puzzleImages[currentPuzzle]) return;

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
            left: new Animated.Value(c * (tileSize + TILE_MARGIN * 2) + PUZZLE_PADDING),
            top: new Animated.Value(r * (tileSize + TILE_MARGIN * 2) + PUZZLE_PADDING),
          };
        }
      });
    });
    setAnimatedPositions(newAnimatedPositions);

    setGameStarted(true);
    setMoves(0);
    setIsComplete(false);
    isCompletingRef.current = false;
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
        await savePuzzleProgress(
          newProgress,
          activeChild.id,
          languageCode,
          contentProgressRevisionRef.current,
        );

        // Check for "First Play" achievement
        if (newProgress.totalGamesPlayed === 1) {
            const eventFirstPlay: Parameters<typeof checkAndGrantNewAchievements>[0] = {
                type: 'puzzle_game_started',
                gameKey: 'puzzle_game',
                puzzleGameProgress: newProgress,
            };
            const newlyEarned = await checkAndGrantNewAchievements(eventFirstPlay);
            if (!isMountedRef.current) return;
            if (newlyEarned.length > 0) {
                newlyEarned.forEach(ach => {
                    console.log(`PUZZLE GAME - FIRST PLAY - NEW ACHIEVEMENT: ${ach.name}`);
                    enqueueAchievementUnlocked(ach);
                    // Handle points if necessary
                });
            }
        }
    }
    gameStartTime.current = Date.now();
  };
  
  const moveTile = (tileId: number): void => {
    if (isComplete || isCompletingRef.current || !grid.length) return;

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
      void audioManager.replayAppSound(soundEffects.tileMove).catch((error) => {
        console.warn("Could not play the Puzzle move sound:", error);
      });

      const newLeft = ec * (tileSize + TILE_MARGIN * 2) + PUZZLE_PADDING;
      const newTop = er * (tileSize + TILE_MARGIN * 2) + PUZZLE_PADDING;

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
        runPuzzleAnimationCompletion(
          finished,
          () => isMountedRef.current,
          () => {
            setGrid(newGrid); // Update grid state after animation
            setEmptySlotPosition({ row: tr, col: tc }); // Update empty slot to tile's old position
          },
          () => checkPuzzleCompletion(newGrid),
          (error) => {
            console.warn("Could not process Puzzle completion:", error);
            isCompletingRef.current = false;
          },
        );
      });
      setMoves(m => m + 1);
    }
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

    if (completed && !isCompletingRef.current) {
      isCompletingRef.current = true;
      const completedPuzzle = puzzleImages[currentPuzzle];
      if (!completedPuzzle) {
        isCompletingRef.current = false;
        return;
      }
      const currentPuzzleId = completedPuzzle.id;
      const completedMoves = moves + 1; // setMoves is asynchronous
      const durationSeconds = Math.round((Date.now() - gameStartTime.current) / 1000);

      const revealPuzzleCompletion = (savedProgress: PuzzleGameProgress) => {
        if (!isMountedRef.current) return;
        setPuzzleProgress(savedProgress);
        setIsComplete(true);
        void audioManager.replayAppSound(soundEffects.success).catch((error) => {
          console.warn("Could not play the Puzzle completion sound:", error);
        });

        Animated.spring(successAnim, {
          toValue: 1,
          friction: 5,
          tension: 40,
          useNativeDriver: true,
        }).start();

        scheduleTimer(() => {
          if (!isMountedRef.current) return;
          Alert.alert(
            "Congratulations!",
            `You completed the ${completedPuzzle.name} puzzle in ${completedMoves} moves!`,
            [
              {
                text: "Next Puzzle",
                onPress: () => {
                  if (!isMountedRef.current) return;
                  clearPendingTimers();
                  gameStartTime.current = Date.now();

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
      };

      if (!activeChild) {
        revealPuzzleCompletion(puzzleProgress);
        return;
      }

      const childId = activeChild.id;
      const updatedCompletedIds = [...puzzleProgress.completedPuzzleIds];
      if (!updatedCompletedIds.includes(currentPuzzleId)) {
        updatedCompletedIds.push(currentPuzzleId);
      }
      const newProgress: PuzzleGameProgress = {
        ...puzzleProgress,
        completedPuzzleIds: updatedCompletedIds,
        childId,
      };
      const activity = {
        child_id: childId,
        activity_type: "puzzle" as const,
        activity_name: `${completedPuzzle.name} Puzzle`,
        score: "100%",
        duration: durationSeconds,
        completed_at: new Date().toISOString(),
        details: `Completed the ${completedPuzzle.name} puzzle in ${completedMoves} moves`,
        level: currentPuzzle + 1,
      };

      await completePuzzleLocallyFirst({
        progress: newProgress,
        persistProgress: () =>
          savePuzzleProgress(
            newProgress,
            childId,
            languageCode,
            contentProgressRevisionRef.current,
          ),
        revealCompletion: revealPuzzleCompletion,
        saveCompletionActivity: () => saveActivity(activity),
        evaluateAchievements: async (savedProgress) => {
          const eventComplete: Parameters<typeof checkAndGrantNewAchievements>[0] = {
            type: 'puzzle_game_completed_successfully',
            gameKey: 'puzzle_game',
            puzzleId: currentPuzzleId,
            movesTaken: completedMoves,
            durationInSeconds: durationSeconds,
            puzzleGameProgress: savedProgress,
            totalUniquePuzzlesAvailable: puzzleImages.length,
          };
          const newlyEarned = await checkAndGrantNewAchievements(eventComplete);
          if (!isMountedRef.current) return;
          newlyEarned.forEach(ach => {
            console.log(`PUZZLE GAME - COMPLETE - NEW ACHIEVEMENT: ${ach.name}`);
            enqueueAchievementUnlocked(ach);
          });
        },
        onLocalError: (error) => {
          console.warn("Could not persist Puzzle completion locally:", error);
        },
        onNetworkError: (error) => {
          console.warn("Could not finish background Puzzle completion work:", error);
        },
      });
    }
  };

  const handleReset = () => {
    // Reset gameStartTime
    clearPendingTimers();
    gameStartTime.current = Date.now();
    void initializePuzzle().catch((error) => {
      console.warn("Could not reset the Puzzle board:", error);
    });
  };

  const createTilePanResponder = (tileId: number, tileRow: number, tileCol: number) => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => !isComplete && !isCompletingRef.current,
      onMoveShouldSetPanResponder: (
        _: GestureResponderEvent,
        gestureState: PanResponderGestureState
      ) => {
        const { dx, dy } = gestureState;
        return (
          !isComplete &&
          !isCompletingRef.current &&
          (Math.abs(dx) > 10 || Math.abs(dy) > 10)
        );
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
              width: tileSize,
              height: tileSize,
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
                  width: puzzleContainerSize - PUZZLE_PADDING * 2,
                  height: puzzleContainerSize - PUZZLE_PADDING * 2,
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

  if (isContentLoading || hydratedScope !== contentScope) {
    return (
      <ChildLoadingState
        title="Getting your puzzles ready"
        message="Loading puzzle pictures and your saved progress."
        icon="extension-puzzle-outline"
      />
    );
  }

  if (
    contentUnavailable ||
    puzzleImages.length === 0 ||
    !puzzleImages[currentPuzzle]
  ) {
    return (
      <View className="flex-1 bg-blue-50 justify-center items-center px-8">
        <StatusBar style="dark" />
        <Ionicons name="cloud-offline-outline" size={52} color="#7b5af0" />
        <Text className="text-primary-700 text-2xl mt-4 text-center" variant="bold">
          Logic Puzzle is unavailable
        </Text>
        <Text className="text-slate-600 mt-2 text-center">
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
            accessibilityLabel="Retry Puzzle content"
          >
            <Text className="text-white" variant="bold">Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <GameTourProvider>
      <SafeAreaView className="flex-1 bg-blue-50" edges={["top", "bottom", "left", "right"]}>
      <StatusBar style="dark" />
      <GameHeader
        title={puzzleTitle}
        subtitle="Slide a tile into the empty space to rebuild the picture"
        onBack={() => router.back()}
        backAccessibilityLabel="Back to Games"
        onHelp={puzzleTour.open}
        trailing={
          <>
            <GameStatChip
              icon="footsteps-outline"
              label={`${moves}`}
              accessibilityLabel={`${moves} moves`}
              tourTargetId="puzzle-moves"
            />
            {gameStarted && !showPreview ? (
              <TouchableOpacity
                className="w-12 h-12 rounded-2xl bg-white items-center justify-center border border-blue-100 ml-2"
                onPress={handleReset}
                accessibilityLabel="Reset Puzzle"
                accessibilityHint="Starts a new shuffled puzzle"
                accessibilityRole="button"
                activeOpacity={0.76}
              >
                <Ionicons name="refresh" size={21} color="#0274BB" />
              </TouchableOpacity>
            ) : null}
          </>
        }
      />

      <View className="flex-1 flex-row px-4 pb-3">
        <View className="justify-center items-center px-2" style={{ flex: 1.12 }}>
          <TourTarget id="puzzle-board">
          <View
            className="bg-white rounded-3xl overflow-hidden relative border-4 border-primary-100 shadow-lg"
            style={{
              width: puzzleContainerSize,
              height: puzzleContainerSize,
            }}
          >
            {showPreview && (
              <Animated.View
                className="absolute w-full h-full justify-center items-center bg-primary-50 z-10 px-5"
                style={{ opacity: previewAnim }}
              >
                <Image
                  source={puzzleImages[currentPuzzle].source}
                  className="w-4/5 h-4/5 rounded-2xl"
                  resizeMode="contain"
                />
                <Text variant="bold" className="text-lg text-primary-700 mt-2.5 text-center" numberOfLines={2}>
                  Memorize the image
                </Text>
              </Animated.View>
            )}

            {renderPuzzleTiles()}

            <Animated.View
              className="absolute w-full h-full justify-center items-center bg-primary-500/90 z-20 px-5"
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
                className="w-[70%] h-[60%] rounded-2xl border-3 border-white"
                resizeMode="contain"
              />
              <Text
                variant="bold"
                className="text-2xl text-white mt-5 shadow-sm text-center"
                numberOfLines={1}
              >
                Well done!
              </Text>
            </Animated.View>
          </View>
          </TourTarget>
        </View>

        <View className="justify-center pl-3 pr-2" style={{ flex: 0.88 }}>
          <TourTarget id="puzzle-instructions">
          <View className="bg-white rounded-3xl border border-blue-100 shadow-sm px-5 py-5">
            <View className="w-12 h-12 rounded-2xl bg-blue-50 items-center justify-center self-center mb-3">
              <Ionicons name="images-outline" size={25} color="#0274BB" />
            </View>
            <Text variant="bold" className="text-2xl text-indigo-800 mb-2 text-center" numberOfLines={2}>
              {puzzleImages[currentPuzzle].name}
            </Text>
            <Text className="text-base text-center text-slate-500" numberOfLines={4}>
              {puzzleImages[currentPuzzle].description}
            </Text>
            <View className="flex-row items-center justify-center mt-4 bg-blue-50 rounded-xl px-3 py-2.5">
              <Ionicons name="hand-left-outline" size={20} color="#0274BB" />
              <Text variant="medium" className="text-sm text-primary-700 ml-2" numberOfLines={2}>
                Tap or swipe a tile beside the empty space
              </Text>
            </View>
          </View>
          </TourTarget>
        </View>
      </View>
      <GameTour
        visible={puzzleTour.visible}
        onCancel={puzzleTour.close}
        onComplete={puzzleTour.complete}
        steps={[
          { id: "board", targetId: "puzzle-board", icon: "grid-outline", placement: "right", title: "Move the tiles", description: "Tap a tile next to the empty space." },
          { id: "instructions", targetId: "puzzle-instructions", icon: "hand-left-outline", placement: "left", title: "Need a reminder?", description: "This card shows what to do." },
          { id: "moves", targetId: "puzzle-moves", icon: "footsteps-outline", placement: "bottom", title: "Your moves", description: "This counts your tile moves." },
        ]}
      />
      </SafeAreaView>
    </GameTourProvider>
  );
};

export default PuzzleGame;
