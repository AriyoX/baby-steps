"use client"

import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import * as Linking from "expo-linking"
import * as MediaLibrary from "expo-media-library"
import { useRouter } from "expo-router"
import * as Sharing from "expo-sharing"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  Animated,
  BackHandler,
  Image,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import Svg, { Circle, G, Path } from "react-native-svg"
import ViewShot from "react-native-view-shot"

import { Text } from "@/components/StyledText"
import { ChildLoadingCard } from "@/components/child/ChildLoadingState"
import {
  getColoringStudioLayout,
  SMALL_PHONE_CONTROL_SIZE,
} from "@/components/coloring/coloringStudioLayout"
import {
  BRUSH_SIZES,
  clampCanvasOffset,
  DEFAULT_BRUSH_SIZE,
  getZoomAdjustedBrushSize,
  getZoomAdjustedEraserRadius,
  stepBrushSize,
  stepCanvasZoom,
} from "@/components/coloring/coloringStudioControls"
import { DEFAULT_LEARNING_LANGUAGE_CODE } from "@/content/languages"
import { brandColors, brandFonts, brandShadows } from "@/constants/Brand"
import { useChild } from "@/context/ChildContext"
import { useChildLandscapeOrientation } from "@/hooks/useChildLandscapeOrientation"
import { useReducedMotion } from "@/hooks/useReducedMotion"
import {
  clearColoringHistory,
  commitColoringMark,
  createColoringHistory,
  eraseColoringMarks,
  getUsedColorCount,
  pointDistance,
  redoColoringHistory,
  type ColoringHistory,
  type ColoringMark,
  type ColoringPoint,
  undoColoringHistory,
} from "@/lib/coloringDrawing"
import {
  COLORING_ACHIEVEMENTS,
  recordColoringSave,
} from "@/lib/coloringProgress"
import {
  hasSeenColoringStudioTutorial,
  markColoringStudioTutorialSeen,
} from "@/lib/coloringStudioTutorial"
import {
  markStageCompleted,
  syncProgressNow,
  updateActivityProgress,
} from "@/lib/progressRepository"

interface ColoringGameProps {
  imageSource: number
  pageName: string
  colors?: string[]
}

type ColoringTool = "crayon" | "eraser" | "stamp"
type ExportAction = "save" | "share" | null

const DEFAULT_COLORS = [
  "#F43F75",
  "#FF7A45",
  "#F8C23E",
  "#58B957",
  "#15A8A0",
  "#1597E5",
  "#6658D3",
  "#A855C7",
  "#8B5E3C",
  "#344054",
]

const COLOR_NAMES: Record<string, string> = {
  "#F43F75": "Berry pink",
  "#FF7A45": "Tangerine",
  "#F8C23E": "Sunshine",
  "#58B957": "Leaf green",
  "#15A8A0": "Lagoon",
  "#1597E5": "Sky blue",
  "#6658D3": "Indigo",
  "#A855C7": "Grape",
  "#8B5E3C": "Cocoa",
  "#344054": "Charcoal",
  "#FF4081": "Berry pink",
  "#FF9800": "Tangerine",
  "#FFEB3B": "Sunshine",
  "#8BC34A": "Leaf green",
  "#03A9F4": "Sky blue",
  "#9C27B0": "Grape",
  "#4CAF50": "Leaf green",
  "#2196F3": "Sky blue",
  "#795548": "Cocoa",
  "#607D8B": "Slate",
  "#000000": "Charcoal",
}

const TUTORIAL_STEPS: {
  icon: React.ComponentProps<typeof Ionicons>["name"]
  location: string
  locationIcon: React.ComponentProps<typeof Ionicons>["name"]
  title: string
  message: string
}[] = [
  {
    icon: "brush",
    location: "Look left",
    locationIcon: "arrow-back",
    title: "Pick a tool",
    message: "Crayon draws, Eraser tidies up, and Flower makes a quick stamp.",
  },
  {
    icon: "color-palette",
    location: "Look right",
    locationIcon: "arrow-forward",
    title: "Choose color and size",
    message: "Tap a color, then use − and + to make your brush tiny or bold.",
  },
  {
    icon: "search",
    location: "On the picture",
    locationIcon: "arrow-up",
    title: "Zoom for tiny details",
    message: "Tap + to zoom. Use the hand to move, then tap the brush to draw again.",
  },
  {
    icon: "download-outline",
    location: "Look at the top",
    locationIcon: "arrow-up",
    title: "Keep your artwork",
    message: "Undo mistakes, save your finished picture, or go back when you are done.",
  },
]

const smoothPath = (points: ColoringPoint[]): string => {
  if (points.length === 0) return ""
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`

  let path = `M ${points[0].x} ${points[0].y}`
  for (let index = 0; index < points.length - 1; index += 1) {
    const firstControl = index > 0 ? points[index - 1] : points[index]
    const first = points[index]
    const second = points[index + 1]
    const secondControl =
      index < points.length - 2 ? points[index + 2] : second
    const controlOneX = first.x + (second.x - firstControl.x) / 6
    const controlOneY = first.y + (second.y - firstControl.y) / 6
    const controlTwoX = second.x - (secondControl.x - first.x) / 6
    const controlTwoY = second.y - (secondControl.y - first.y) / 6
    path += ` C ${controlOneX} ${controlOneY}, ${controlTwoX} ${controlTwoY}, ${second.x} ${second.y}`
  }
  return path
}

const renderStamp = (
  center: ColoringPoint,
  size: number,
  color: string,
  key?: string,
) => {
  const petalRadius = size * 0.26
  const offset = size * 0.32
  return (
    <G key={key}>
      <Circle cx={center.x} cy={center.y} r={size * 0.25} fill={color} />
      <Circle cx={center.x - offset} cy={center.y} r={petalRadius} fill={color} />
      <Circle cx={center.x + offset} cy={center.y} r={petalRadius} fill={color} />
      <Circle cx={center.x} cy={center.y - offset} r={petalRadius} fill={color} />
      <Circle cx={center.x} cy={center.y + offset} r={petalRadius} fill={color} />
    </G>
  )
}

const renderMark = (mark: ColoringMark) => {
  if (mark.type === "stamp") {
    return renderStamp(mark.points[0], mark.size, mark.color, mark.id)
  }

  if (mark.points.length === 1) {
    return (
      <Circle
        key={mark.id}
        cx={mark.points[0].x}
        cy={mark.points[0].y}
        r={mark.size / 2}
        fill={mark.color}
      />
    )
  }

  return (
    <Path
      key={mark.id}
      d={smoothPath(mark.points)}
      fill="none"
      stroke={mark.color}
      strokeWidth={mark.size}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  )
}

export default function ColoringGameScreen({
  imageSource,
  pageName,
  colors = DEFAULT_COLORS,
}: ColoringGameProps) {
  const insets = useSafeAreaInsets()
  const { width, height } = useWindowDimensions()
  const router = useRouter()
  const { activeChild } = useChild()
  const reduceMotion = useReducedMotion()
  useChildLandscapeOrientation("coloring studio")

  const {
    isCompact,
    isSmallPhone,
    showCanvasHint,
    showDockTitles,
  } = getColoringStudioLayout(width, height)
  const paletteColors = useMemo(
    () => [...new Set(colors.filter((color) => color.toUpperCase() !== "#FFFFFF"))],
    [colors],
  )
  const [selectedColor, setSelectedColor] = useState(
    paletteColors[0] ?? DEFAULT_COLORS[0],
  )
  const [selectedTool, setSelectedTool] = useState<ColoringTool>("crayon")
  const [brushSize, setBrushSize] = useState(DEFAULT_BRUSH_SIZE)
  const [canvasZoom, setCanvasZoom] = useState(1)
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 })
  const [isCanvasMoveMode, setIsCanvasMoveMode] = useState(false)
  const [tutorialStatus, setTutorialStatus] = useState<
    "checking" | "pending" | "hidden"
  >("checking")
  const [tutorialStep, setTutorialStep] = useState(0)
  const [history, setHistory] = useState<ColoringHistory>(createColoringHistory)
  const [currentPath, setCurrentPath] = useState<ColoringPoint[]>([])
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageLoadFailed, setImageLoadFailed] = useState(false)
  const [imageRetryKey, setImageRetryKey] = useState(0)
  const [exportAction, setExportAction] = useState<ExportAction>(null)
  const [celebrationMessage, setCelebrationMessage] = useState("")

  const viewShotRef = useRef<ViewShot>(null)
  const historyRef = useRef(history)
  const currentPathRef = useRef<ColoringPoint[]>([])
  const toolRef = useRef<ColoringTool>(selectedTool)
  const colorRef = useRef(selectedColor)
  const brushSizeRef = useRef(brushSize)
  const canvasZoomRef = useRef(canvasZoom)
  const canvasOffsetRef = useRef(canvasOffset)
  const canvasMoveModeRef = useRef(isCanvasMoveMode)
  const canvasSizeRef = useRef({ width: 0, height: 0 })
  const panGestureStartRef = useRef<{
    pageX: number
    pageY: number
    offsetX: number
    offsetY: number
  } | null>(null)
  const markSequenceRef = useRef(0)
  const celebrationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const celebrationAnimation = useRef(new Animated.Value(0)).current
  const tutorialVisibleRef = useRef(false)

  historyRef.current = history
  toolRef.current = selectedTool
  colorRef.current = selectedColor
  brushSizeRef.current = brushSize
  canvasZoomRef.current = canvasZoom
  canvasOffsetRef.current = canvasOffset
  canvasMoveModeRef.current = isCanvasMoveMode

  const zoomAdjustedBrushSize = getZoomAdjustedBrushSize(brushSize, canvasZoom)
  const zoomAdjustedEraserRadius = getZoomAdjustedEraserRadius(
    brushSize,
    canvasZoom,
  )
  const showTutorial = tutorialStatus === "pending" && imageLoaded
  tutorialVisibleRef.current = showTutorial

  const updateHistory = useCallback(
    (updater: (current: ColoringHistory) => ColoringHistory) => {
      setHistory((current) => {
        const next = updater(current)
        historyRef.current = next
        return next
      })
    },
    [],
  )

  const showCelebration = useCallback(
    (message: string) => {
      if (celebrationTimerRef.current) clearTimeout(celebrationTimerRef.current)
      setCelebrationMessage(message)
      celebrationAnimation.stopAnimation()

      if (reduceMotion) {
        celebrationAnimation.setValue(1)
      } else {
        celebrationAnimation.setValue(0)
        Animated.spring(celebrationAnimation, {
          toValue: 1,
          speed: 18,
          bounciness: 8,
          useNativeDriver: true,
        }).start()
      }

      celebrationTimerRef.current = setTimeout(() => {
        Animated.timing(celebrationAnimation, {
          toValue: 0,
          duration: reduceMotion ? 0 : 180,
          useNativeDriver: true,
        }).start(() => setCelebrationMessage(""))
      }, 1500)
    },
    [celebrationAnimation, reduceMotion],
  )

  useEffect(
    () => () => {
      if (celebrationTimerRef.current) clearTimeout(celebrationTimerRef.current)
    },
    [],
  )

  useEffect(() => {
    let isActive = true
    setTutorialStatus("checking")
    setTutorialStep(0)
    void hasSeenColoringStudioTutorial(activeChild?.id).then((hasSeenTutorial) => {
      if (!isActive) return
      setTutorialStatus(hasSeenTutorial ? "hidden" : "pending")
    })
    return () => {
      isActive = false
    }
  }, [activeChild?.id])

  const dismissTutorial = useCallback(() => {
    tutorialVisibleRef.current = false
    setTutorialStatus("hidden")
    void markColoringStudioTutorialSeen(activeChild?.id)
  }, [activeChild?.id])

  useEffect(() => {
    setImageLoaded(false)
    setImageLoadFailed(false)
    setImageRetryKey(0)
    setHistory(createColoringHistory())
    historyRef.current = createColoringHistory()
    setCanvasZoom(1)
    canvasZoomRef.current = 1
    setCanvasOffset({ x: 0, y: 0 })
    canvasOffsetRef.current = { x: 0, y: 0 }
    setIsCanvasMoveMode(false)
    canvasMoveModeRef.current = false
  }, [imageSource, pageName])

  const changeCanvasZoom = useCallback((direction: -1 | 1) => {
    const nextZoom = stepCanvasZoom(canvasZoomRef.current, direction)
    const nextOffset = clampCanvasOffset(
      canvasOffsetRef.current,
      nextZoom,
      canvasSizeRef.current,
    )

    canvasZoomRef.current = nextZoom
    canvasOffsetRef.current = nextOffset
    setCanvasZoom(nextZoom)
    setCanvasOffset(nextOffset)

    if (nextZoom === 1) {
      canvasMoveModeRef.current = false
      setIsCanvasMoveMode(false)
    }
  }, [])

  const toggleCanvasMoveMode = useCallback(() => {
    if (canvasZoomRef.current === 1) return
    const nextMoveMode = !canvasMoveModeRef.current
    canvasMoveModeRef.current = nextMoveMode
    setIsCanvasMoveMode(nextMoveMode)
  }, [])

  const commitGesture = useCallback(() => {
    const points = currentPathRef.current
    currentPathRef.current = []
    setCurrentPath([])
    if (points.length === 0) return

    const gestureBrushSize = getZoomAdjustedBrushSize(
      brushSizeRef.current,
      canvasZoomRef.current,
    )

    if (toolRef.current === "eraser") {
      updateHistory((current) =>
        eraseColoringMarks(
          current,
          points,
          getZoomAdjustedEraserRadius(
            brushSizeRef.current,
            canvasZoomRef.current,
          ),
        ),
      )
      return
    }

    markSequenceRef.current += 1
    const type = toolRef.current === "stamp" ? "stamp" : "stroke"
    const markPoints = type === "stamp" ? [points[0]] : points
    updateHistory((current) =>
      commitColoringMark(current, {
        id: `${Date.now()}-${markSequenceRef.current}`,
        points: markPoints,
        color: colorRef.current,
        size: type === "stamp" ? gestureBrushSize * 1.8 : gestureBrushSize,
        type,
      }),
    )
  }, [updateHistory])

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: (event) => event.nativeEvent.touches.length <= 1,
        onMoveShouldSetPanResponder: (event) => event.nativeEvent.touches.length <= 1,
        onPanResponderGrant: (event) => {
          if (canvasMoveModeRef.current && canvasZoomRef.current > 1) {
            panGestureStartRef.current = {
              pageX: event.nativeEvent.pageX,
              pageY: event.nativeEvent.pageY,
              offsetX: canvasOffsetRef.current.x,
              offsetY: canvasOffsetRef.current.y,
            }
            return
          }

          const point = {
            x: event.nativeEvent.locationX,
            y: event.nativeEvent.locationY,
          }
          currentPathRef.current = [point]
          setCurrentPath([point])
        },
        onPanResponderMove: (event) => {
          const panStart = panGestureStartRef.current
          if (panStart) {
            const nextOffset = clampCanvasOffset(
              {
                x: panStart.offsetX + event.nativeEvent.pageX - panStart.pageX,
                y: panStart.offsetY + event.nativeEvent.pageY - panStart.pageY,
              },
              canvasZoomRef.current,
              canvasSizeRef.current,
            )
            canvasOffsetRef.current = nextOffset
            setCanvasOffset(nextOffset)
            return
          }

          if (toolRef.current === "stamp") return
          const point = {
            x: event.nativeEvent.locationX,
            y: event.nativeEvent.locationY,
          }
          const previousPoints = currentPathRef.current
          const lastPoint = previousPoints.at(-1)
          if (lastPoint && pointDistance(lastPoint, point) < 2) return
          const nextPoints = [...previousPoints, point]
          currentPathRef.current = nextPoints
          setCurrentPath(nextPoints)
        },
        onPanResponderRelease: () => {
          if (panGestureStartRef.current) {
            panGestureStartRef.current = null
            return
          }
          commitGesture()
        },
        onPanResponderTerminate: () => {
          if (panGestureStartRef.current) {
            panGestureStartRef.current = null
            return
          }
          commitGesture()
        },
        onPanResponderTerminationRequest: () => false,
      }),
    [commitGesture],
  )

  const usedColorCount = getUsedColorCount(history.marks)
  const requestExit = useCallback(() => {
    if (historyRef.current.marks.length === 0) {
      router.back()
      return
    }

    Alert.alert(
      "Leave this picture?",
      "Save it first if you want to keep your colors.",
      [
        { text: "Keep coloring", style: "cancel" },
        { text: "Leave", style: "destructive", onPress: () => router.back() },
      ],
    )
  }, [router])

  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (tutorialVisibleRef.current) {
        dismissTutorial()
        return true
      }
      requestExit()
      return true
    })
    return () => subscription.remove()
  }, [dismissTutorial, requestExit])

  const clearCanvas = () => {
    if (history.marks.length === 0) return
    Alert.alert("Start this picture again?", "You can undo this if you change your mind.", [
      { text: "Not yet", style: "cancel" },
      {
        text: "Clear colors",
        style: "destructive",
        onPress: () => updateHistory(clearColoringHistory),
      },
    ])
  }

  const ensureSavePermission = async (): Promise<boolean> => {
    const isAvailable = await MediaLibrary.isAvailableAsync()
    if (!isAvailable) {
      Alert.alert(
        "Saving is not available",
        "This device cannot add pictures to its photo gallery. You can still use Share.",
      )
      return false
    }

    const granularPermissions: MediaLibrary.GranularPermission[] =
      Platform.OS === "android" ? [] : ["photo"]
    const current = await MediaLibrary.getPermissionsAsync(true, granularPermissions)
    if (current.granted) return true

    const requested = await MediaLibrary.requestPermissionsAsync(true, granularPermissions)
    if (requested.granted) return true

    const buttons: Parameters<typeof Alert.alert>[2] = [
      { text: "Keep coloring", style: "cancel" },
    ]
    if (!requested.canAskAgain) {
      buttons.push({ text: "Open settings", onPress: () => void Linking.openSettings() })
    }

    Alert.alert(
      "Photo saving is off",
      requested.canAskAgain
        ? "Baby Steps only needs permission to add this picture. It does not need to read your photos."
        : "Ask a grown-up to allow photo saving in Settings, then try again.",
      buttons,
    )
    return false
  }

  const captureArtwork = async (): Promise<string> => {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    if (!viewShotRef.current?.capture) throw new Error("Artwork capture is unavailable")
    return viewShotRef.current.capture()
  }

  const syncSavedProgress = async (savedAt: string) => {
    if (!activeChild) return
    const languageCode =
      activeChild.selected_language_code || DEFAULT_LEARNING_LANGUAGE_CODE
    try {
      await updateActivityProgress(activeChild.id, languageCode, "coloring", {
        status: "completed",
        last_stage_id: pageName,
        completed_stage_count: 1,
        progress_payload: {
          pageName,
          savedAt,
          usedColorCount,
          markCount: historyRef.current.marks.length,
        },
      })
      await markStageCompleted(activeChild.id, languageCode, "coloring", pageName, {
        progress_payload: { pageName, usedColorCount },
      })
      void syncProgressNow(activeChild.id)
    } catch (error) {
      console.warn("Artwork saved, but coloring progress could not sync yet:", error)
    }
  }

  const saveToGallery = async () => {
    if (history.marks.length === 0) {
      Alert.alert("Add a little color first", "Make a few marks, then save your masterpiece.")
      return
    }

    setExportAction("save")
    try {
      if (!(await ensureSavePermission())) return
      const uri = await captureArtwork()
      await MediaLibrary.saveToLibraryAsync(uri)
      const savedAt = new Date().toISOString()
      const localResult = activeChild
        ? await recordColoringSave(activeChild.id, pageName, usedColorCount)
        : undefined
      void syncSavedProgress(savedAt)

      const newAchievementNames =
        localResult?.newlyUnlockedIds
          .map((id) => COLORING_ACHIEVEMENTS.find((achievement) => achievement.id === id)?.title)
          .filter((title): title is string => Boolean(title)) ?? []
      const destination = Platform.OS === "ios" ? "Photos" : "your gallery"
      const localProgressFailed = localResult?.didPersist === false
      Alert.alert(
        localProgressFailed
          ? "Picture saved — badge progress not saved"
          : newAchievementNames.length > 0
            ? "Saved — new badge!"
            : "Picture saved!",
        localProgressFailed
          ? `Your ${pageName} picture is in ${destination}, but badge progress could not be saved this time.`
          : newAchievementNames.length > 0
            ? `Your ${pageName} picture is in ${destination}. You earned ${newAchievementNames.join(" and ")}!`
            : `Your ${pageName} picture is now in ${destination}.`,
        [{ text: "Keep creating" }],
      )
      showCelebration("Masterpiece saved!")
    } catch (error) {
      console.error("Could not save coloring artwork:", error)
      Alert.alert(
        "That picture did not save",
        "Your colors are still here. Check the device has free space, then try Save again.",
      )
    } finally {
      setExportAction(null)
    }
  }

  const shareArtwork = async () => {
    if (history.marks.length === 0) {
      Alert.alert("Add a little color first", "Make a few marks before sharing your picture.")
      return
    }

    setExportAction("share")
    try {
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert("Sharing is not available", "You can still save the picture to this device.")
        return
      }
      const uri = await captureArtwork()
      await Sharing.shareAsync(uri, {
        dialogTitle: `Share ${pageName} artwork`,
        mimeType: "image/png",
        UTI: "public.png",
      })
    } catch (error) {
      console.error("Could not share coloring artwork:", error)
      Alert.alert("Sharing did not open", "Your colors are still here. Please try again.")
    } finally {
      setExportAction(null)
    }
  }

  const toolButton = (
    tool: ColoringTool,
    label: string,
    icon: React.ReactNode,
  ) => {
    const selected = selectedTool === tool
    return (
      <Pressable
        key={tool}
        accessibilityRole="button"
        accessibilityLabel={`${label} tool`}
        accessibilityState={{ selected }}
        onPress={() => {
          canvasMoveModeRef.current = false
          setIsCanvasMoveMode(false)
          setSelectedTool(tool)
        }}
        style={({ pressed }) => [
          styles.toolButton,
          isCompact && styles.compactToolButton,
          isSmallPhone && styles.smallPhoneToolButton,
          selected && styles.selectedToolButton,
          pressed && styles.pressedButton,
        ]}
      >
        <View style={[styles.toolIcon, selected && styles.selectedToolIcon]}>{icon}</View>
        {!isSmallPhone ? (
          <Text
            variant="bold"
            numberOfLines={1}
            style={[styles.toolLabel, selected && styles.selectedToolLabel]}
          >
            {label}
          </Text>
        ) : null}
      </Pressable>
    )
  }

  const tutorial = TUTORIAL_STEPS[tutorialStep] ?? TUTORIAL_STEPS[0]

  return (
    <LinearGradient
      colors={["#E8F7FF", "#FFF8DF", "#FFF0ED"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
    >
      <View pointerEvents="none" style={styles.sunBubble} />
      <View pointerEvents="none" style={styles.skyBubble} />

      <View
        style={[
          styles.header,
          isCompact && styles.compactHeader,
          isSmallPhone && styles.smallPhoneHeader,
        ]}
      >
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Back to coloring pictures"
          onPress={requestExit}
          style={[styles.backButton, isSmallPhone && styles.smallPhoneHeaderButton]}
        >
          <Ionicons name="arrow-back" size={22} color={brandColors.blue[700]} />
        </TouchableOpacity>

        <View style={[styles.titleBlock, isSmallPhone && styles.smallPhoneTitleBlock]}>
          {!isSmallPhone ? (
            <Text variant="display" numberOfLines={1} style={styles.studioTitle}>
              Coloring Studio
            </Text>
          ) : null}
          <Text
            variant="bold"
            numberOfLines={1}
            style={[styles.pageTitle, isSmallPhone && styles.smallPhonePageTitle]}
          >
            {pageName}
          </Text>
        </View>

        <View style={[styles.headerActions, isSmallPhone && styles.smallPhoneHeaderActions]}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Undo"
            accessibilityState={{ disabled: history.undoStack.length === 0 }}
            disabled={history.undoStack.length === 0 || exportAction !== null}
            onPress={() => updateHistory(undoColoringHistory)}
            style={[
              styles.roundAction,
              isSmallPhone && styles.smallPhoneHeaderButton,
              history.undoStack.length === 0 && styles.disabledAction,
            ]}
          >
            <Ionicons name="arrow-undo" size={20} color={brandColors.blue[700]} />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Redo"
            accessibilityState={{ disabled: history.redoStack.length === 0 }}
            disabled={history.redoStack.length === 0 || exportAction !== null}
            onPress={() => updateHistory(redoColoringHistory)}
            style={[
              styles.roundAction,
              isSmallPhone && styles.smallPhoneHeaderButton,
              history.redoStack.length === 0 && styles.disabledAction,
            ]}
          >
            <Ionicons name="arrow-redo" size={20} color={brandColors.blue[700]} />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Share artwork"
            disabled={exportAction !== null}
            onPress={() => void shareArtwork()}
            style={[
              styles.shareButton,
              isSmallPhone && styles.smallPhoneShareButton,
              exportAction !== null && styles.disabledAction,
            ]}
          >
            {exportAction === "share" ? (
              <ActivityIndicator size="small" color={brandColors.blue[700]} />
            ) : (
              <Ionicons name="share-outline" size={20} color={brandColors.blue[700]} />
            )}
            {!isCompact ? <Text variant="bold" style={styles.shareText}>Share</Text> : null}
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Save artwork to photos"
            disabled={exportAction !== null}
            onPress={() => void saveToGallery()}
            style={[
              styles.saveButton,
              isSmallPhone && styles.smallPhoneSaveButton,
              exportAction !== null && styles.disabledAction,
            ]}
          >
            {exportAction === "save" ? (
              <ActivityIndicator size="small" color={brandColors.white} />
            ) : (
              <Ionicons name="download-outline" size={20} color={brandColors.white} />
            )}
            {!isSmallPhone ? <Text variant="bold" style={styles.saveText}>Save</Text> : null}
          </TouchableOpacity>
        </View>
      </View>

      <View
        style={[
          styles.workspace,
          isCompact && styles.compactWorkspace,
          isSmallPhone && styles.smallPhoneWorkspace,
        ]}
      >
        <View
          style={[
            styles.toolDock,
            isCompact && styles.compactToolDock,
            isSmallPhone && styles.smallPhoneToolDock,
          ]}
        >
          {showDockTitles ? (
            <Text variant="display" style={[styles.dockTitle, isCompact && styles.compactDockTitle]}>
              Tools
            </Text>
          ) : null}
          {toolButton(
            "crayon",
            "Crayon",
            <Ionicons name="brush" size={isCompact ? 21 : 25} color={selectedTool === "crayon" ? brandColors.white : brandColors.orange[600]} />,
          )}
          {toolButton(
            "eraser",
            "Eraser",
            <MaterialCommunityIcons name="eraser" size={isCompact ? 22 : 26} color={selectedTool === "eraser" ? brandColors.white : brandColors.blue[600]} />,
          )}
          {toolButton(
            "stamp",
            "Flower",
            <Ionicons name="flower" size={isCompact ? 22 : 26} color={selectedTool === "stamp" ? brandColors.white : "#A855C7"} />,
          )}
          <View style={styles.toolDockSpacer} />
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Clear all colors"
            accessibilityState={{ disabled: history.marks.length === 0 }}
            disabled={history.marks.length === 0 || exportAction !== null}
            onPress={clearCanvas}
            style={[
              styles.clearButton,
              isSmallPhone && styles.smallPhoneClearButton,
              history.marks.length === 0 && styles.disabledAction,
            ]}
          >
            <Ionicons name="refresh" size={18} color={brandColors.orange[700]} />
            {!isCompact ? <Text variant="bold" style={styles.clearText}>Start over</Text> : null}
          </TouchableOpacity>
        </View>

        <View style={styles.canvasColumn}>
          <View
            style={styles.canvasCard}
            onLayout={(event) => {
              canvasSizeRef.current = event.nativeEvent.layout
              const nextOffset = clampCanvasOffset(
                canvasOffsetRef.current,
                canvasZoomRef.current,
                canvasSizeRef.current,
              )
              canvasOffsetRef.current = nextOffset
              if (
                nextOffset.x !== canvasOffset.x ||
                nextOffset.y !== canvasOffset.y
              ) {
                setCanvasOffset(nextOffset)
              }
            }}
          >
            <View
              style={[
                styles.zoomedArtwork,
                {
                  transform: [
                    { translateX: canvasOffset.x },
                    { translateY: canvasOffset.y },
                    { scale: canvasZoom },
                  ],
                },
              ]}
            >
              <ViewShot
                ref={viewShotRef}
                options={{ format: "png", quality: 1, result: "tmpfile" }}
                style={styles.artworkCapture}
              >
                <Image
                  key={imageRetryKey}
                  source={imageSource}
                  resizeMode="contain"
                  style={styles.templateImage}
                  onLoad={() => {
                    setImageLoaded(true)
                    setImageLoadFailed(false)
                  }}
                  onError={() => {
                    setImageLoaded(false)
                    setImageLoadFailed(true)
                  }}
                />
                <View
                  accessibilityLabel={`${pageName} coloring canvas`}
                  style={styles.drawingSurface}
                  pointerEvents={imageLoaded && exportAction === null ? "auto" : "none"}
                  {...panResponder.panHandlers}
                >
                  <Svg width="100%" height="100%" style={styles.paintLayer} pointerEvents="none">
                    <G opacity={0.82}>{history.marks.map(renderMark)}</G>
                    {currentPath.length > 0 && selectedTool === "crayon" ? (
                      currentPath.length === 1 ? (
                        <Circle cx={currentPath[0].x} cy={currentPath[0].y} r={zoomAdjustedBrushSize / 2} fill={selectedColor} opacity={0.82} />
                      ) : (
                        <Path d={smoothPath(currentPath)} fill="none" stroke={selectedColor} strokeWidth={zoomAdjustedBrushSize} strokeLinecap="round" strokeLinejoin="round" opacity={0.82} />
                      )
                    ) : null}
                    {currentPath.length > 0 && selectedTool === "stamp"
                      ? renderStamp(currentPath[0], zoomAdjustedBrushSize * 1.8, selectedColor)
                      : null}
                  </Svg>
                </View>
              </ViewShot>

              {currentPath.length > 0 && selectedTool === "eraser" ? (
                <View pointerEvents="none" style={styles.gestureOverlay}>
                  <Svg width="100%" height="100%">
                    <Path
                      d={smoothPath(currentPath)}
                      fill="none"
                      stroke={brandColors.blue[700]}
                      strokeWidth={2}
                      strokeDasharray="5 6"
                      strokeLinecap="round"
                      opacity={0.7}
                    />
                      <Circle
                        cx={currentPath.at(-1)?.x ?? 0}
                        cy={currentPath.at(-1)?.y ?? 0}
                        r={zoomAdjustedEraserRadius}
                      fill="rgba(255,255,255,0.5)"
                      stroke={brandColors.blue[700]}
                      strokeWidth={2}
                    />
                  </Svg>
                </View>
              ) : null}
            </View>

            <View style={styles.zoomControls}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Zoom out"
                accessibilityState={{ disabled: canvasZoom === 1 }}
                disabled={canvasZoom === 1 || exportAction !== null}
                onPress={() => changeCanvasZoom(-1)}
                style={[styles.zoomButton, canvasZoom === 1 && styles.disabledAction]}
              >
                <Ionicons name="remove" size={23} color={brandColors.blue[700]} />
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={isCanvasMoveMode ? "Return to drawing" : "Move zoomed picture"}
                accessibilityHint="Use one finger to move the picture while this is selected"
                accessibilityState={{ disabled: canvasZoom === 1, selected: isCanvasMoveMode }}
                disabled={canvasZoom === 1 || exportAction !== null}
                onPress={toggleCanvasMoveMode}
                style={[
                  styles.zoomMoveButton,
                  isCanvasMoveMode && styles.selectedZoomMoveButton,
                  canvasZoom === 1 && styles.disabledAction,
                ]}
              >
                <Ionicons
                  name={isCanvasMoveMode ? "brush" : "hand-left-outline"}
                  size={18}
                  color={isCanvasMoveMode ? brandColors.white : brandColors.blue[700]}
                />
                <Text
                  variant="bold"
                  style={[
                    styles.zoomLevelText,
                    isCanvasMoveMode && styles.selectedZoomLevelText,
                  ]}
                >
                  {canvasZoom}×
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Zoom in"
                accessibilityState={{ disabled: canvasZoom === 3 }}
                disabled={canvasZoom === 3 || exportAction !== null}
                onPress={() => changeCanvasZoom(1)}
                style={[styles.zoomButton, canvasZoom === 3 && styles.disabledAction]}
              >
                <Ionicons name="add" size={23} color={brandColors.blue[700]} />
              </TouchableOpacity>
            </View>

            {!imageLoaded && !imageLoadFailed ? (
              <View style={styles.canvasOverlay}>
                <ChildLoadingCard label="Opening your coloring page..." style={styles.loadingCard} />
              </View>
            ) : null}

            {imageLoadFailed ? (
              <View style={styles.canvasOverlay} accessibilityRole="alert">
                <View style={styles.errorCard}>
                  <Ionicons name="image-outline" size={34} color={brandColors.victoriaBlue} />
                  <Text variant="display" style={styles.errorTitle}>Picture needs another try</Text>
                  <Text variant="medium" style={styles.errorMessage}>Reload it, or choose a different coloring page.</Text>
                  <View style={styles.errorActions}>
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel="Reload coloring picture"
                      onPress={() => {
                        setImageLoadFailed(false)
                        setImageLoaded(false)
                        setImageRetryKey((current) => current + 1)
                      }}
                      style={styles.retryButton}
                    >
                      <Ionicons name="refresh" size={17} color={brandColors.white} />
                      <Text variant="bold" style={styles.retryText}>Try again</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => router.back()} style={styles.chooseAnotherButton}>
                      <Text variant="bold" style={styles.chooseAnotherText}>Choose another</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ) : null}

            {exportAction !== null ? (
              <View style={styles.exportOverlay} accessibilityRole="progressbar" accessibilityLiveRegion="polite">
                <View style={styles.exportBubble}>
                  <ActivityIndicator size="small" color={brandColors.victoriaBlue} />
                  <Text variant="bold" style={styles.exportText}>
                    {exportAction === "save" ? "Saving your masterpiece..." : "Getting your picture ready..."}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>
          {showCanvasHint ? (
            <View style={styles.canvasHint}>
              <Ionicons name="hand-left-outline" size={16} color={brandColors.blue[700]} />
              <Text variant="medium" numberOfLines={1} style={styles.canvasHintText}>
                Draw with one finger • choose Eraser to tidy up
              </Text>
            </View>
          ) : null}
        </View>

        <View
          style={[
            styles.creativeDock,
            isCompact && styles.compactCreativeDock,
            isSmallPhone && styles.smallPhoneCreativeDock,
          ]}
        >
          {showDockTitles ? (
            <>
              <View style={styles.dockHeadingRow}>
                <Text variant="display" style={[styles.dockTitle, isCompact && styles.compactDockTitle]}>Colors</Text>
                <View style={[styles.activeColorDot, { backgroundColor: selectedColor }]} />
              </View>
              <Text variant="bold" numberOfLines={1} style={styles.colorName}>
                {COLOR_NAMES[selectedColor.toUpperCase()] ?? "My color"}
              </Text>
            </>
          ) : null}
          <View
            style={[
              styles.colorGrid,
              isCompact && styles.compactColorGrid,
              isSmallPhone && styles.smallPhoneColorGrid,
            ]}
          >
            {paletteColors.map((color) => {
              const isSelected = selectedColor === color
              const colorName = COLOR_NAMES[color.toUpperCase()] ?? "color"
              return (
                <Pressable
                  key={color}
                  accessibilityRole="button"
                  accessibilityLabel={colorName}
                  accessibilityState={{ selected: isSelected }}
                  hitSlop={isSmallPhone ? SMALL_PHONE_CONTROL_SIZE.colorHitSlop : undefined}
                  onPress={() => {
                    canvasMoveModeRef.current = false
                    setIsCanvasMoveMode(false)
                    setSelectedColor(color)
                    if (selectedTool === "eraser") setSelectedTool("crayon")
                  }}
                  style={({ pressed }) => [
                    styles.colorButton,
                    isCompact && styles.compactColorButton,
                    isSmallPhone && styles.smallPhoneColorButton,
                    isSelected && styles.selectedColorButton,
                    pressed && styles.pressedButton,
                  ]}
                >
                  <View style={[styles.colorSwatch, { backgroundColor: color }]}>
                    {isSelected ? <Ionicons name="checkmark" size={17} color={brandColors.white} /> : null}
                  </View>
                </Pressable>
              )
            })}
          </View>

          <Text variant="display" style={[styles.sizeTitle, isCompact && styles.compactSizeTitle]}>
            Brush size
          </Text>
          <View style={[styles.sizeRow, isSmallPhone && styles.smallPhoneSizeRow]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Use a smaller brush"
              accessibilityState={{ disabled: brushSize === BRUSH_SIZES[0] }}
              disabled={brushSize === BRUSH_SIZES[0]}
              onPress={() => setBrushSize((current) => stepBrushSize(current, -1))}
              style={({ pressed }) => [
                styles.sizeButton,
                brushSize === BRUSH_SIZES[0] && styles.disabledAction,
                pressed && styles.pressedButton,
              ]}
            >
              <Ionicons name="remove" size={23} color={brandColors.blue[700]} />
            </Pressable>
            <View
              accessibilityRole="adjustable"
              accessibilityLabel="Current brush size"
              accessibilityValue={{
                min: 1,
                max: BRUSH_SIZES.length,
                now: BRUSH_SIZES.findIndex((size) => size === brushSize) + 1,
              }}
              accessibilityActions={[{ name: "decrement" }, { name: "increment" }]}
              onAccessibilityAction={(event) => {
                if (event.nativeEvent.actionName === "decrement") {
                  setBrushSize((current) => stepBrushSize(current, -1))
                }
                if (event.nativeEvent.actionName === "increment") {
                  setBrushSize((current) => stepBrushSize(current, 1))
                }
              }}
              style={styles.brushPreview}
            >
              <View
                style={{
                  width: Math.min(30, Math.max(6, brushSize * 0.7)),
                  height: Math.min(30, Math.max(6, brushSize * 0.7)),
                  borderRadius: brushSize,
                  backgroundColor: selectedColor,
                }}
              />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Use a bigger brush"
              accessibilityState={{ disabled: brushSize === BRUSH_SIZES.at(-1) }}
              disabled={brushSize === BRUSH_SIZES.at(-1)}
              onPress={() => setBrushSize((current) => stepBrushSize(current, 1))}
              style={({ pressed }) => [
                styles.sizeButton,
                brushSize === BRUSH_SIZES.at(-1) && styles.disabledAction,
                pressed && styles.pressedButton,
              ]}
            >
              <Ionicons name="add" size={23} color={brandColors.blue[700]} />
            </Pressable>
          </View>
        </View>
      </View>

      {celebrationMessage ? (
        <Animated.View
          pointerEvents="none"
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={[
            styles.celebration,
            {
              opacity: celebrationAnimation,
              transform: [
                {
                  scale: celebrationAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.82, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.celebrationIcon}>
            <Ionicons name="star" size={21} color={brandColors.gold[700]} />
          </View>
          <Text variant="display" style={styles.celebrationText}>{celebrationMessage}</Text>
        </Animated.View>
      ) : null}

      {showTutorial ? (
        <View
          accessibilityViewIsModal
          accessibilityLabel="Coloring studio tutorial"
          style={styles.tutorialOverlay}
        >
          <View style={styles.tutorialCard}>
            <View style={styles.tutorialTopRow}>
              <View style={styles.tutorialIconBubble}>
                <Ionicons name={tutorial.icon} size={27} color={brandColors.victoriaBlue} />
              </View>
              <View style={styles.tutorialCopy}>
                <View style={styles.tutorialLocationRow}>
                  <Ionicons
                    name={tutorial.locationIcon}
                    size={14}
                    color={brandColors.orange[600]}
                  />
                  <Text variant="bold" style={styles.tutorialLocation}>
                    {tutorial.location}
                  </Text>
                </View>
                <Text variant="display" style={styles.tutorialTitle}>
                  {tutorial.title}
                </Text>
                <Text variant="medium" style={styles.tutorialMessage}>
                  {tutorial.message}
                </Text>
              </View>
            </View>

            <View style={styles.tutorialActions}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Skip coloring tutorial"
                onPress={dismissTutorial}
                style={styles.tutorialSkipButton}
              >
                <Text variant="bold" style={styles.tutorialSkipText}>Skip</Text>
              </TouchableOpacity>

              <View
                accessibilityLabel={`Tutorial step ${tutorialStep + 1} of ${TUTORIAL_STEPS.length}`}
                style={styles.tutorialDots}
              >
                {TUTORIAL_STEPS.map((step, index) => (
                  <View
                    key={step.title}
                    style={[
                      styles.tutorialDot,
                      index === tutorialStep && styles.activeTutorialDot,
                    ]}
                  />
                ))}
              </View>

              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={
                  tutorialStep === TUTORIAL_STEPS.length - 1
                    ? "Start coloring"
                    : "Next tutorial tip"
                }
                onPress={() => {
                  if (tutorialStep === TUTORIAL_STEPS.length - 1) {
                    dismissTutorial()
                    return
                  }
                  setTutorialStep((current) => current + 1)
                }}
                style={styles.tutorialNextButton}
              >
                <Text variant="bold" style={styles.tutorialNextText}>
                  {tutorialStep === TUTORIAL_STEPS.length - 1 ? "Let’s color!" : "Next"}
                </Text>
                <Ionicons
                  name={tutorialStep === TUTORIAL_STEPS.length - 1 ? "sparkles" : "arrow-forward"}
                  size={17}
                  color={brandColors.white}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : null}
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    overflow: "hidden",
  },
  sunBubble: {
    position: "absolute",
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: "rgba(248, 194, 62, 0.18)",
    right: -54,
    top: -74,
  },
  skyBubble: {
    position: "absolute",
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: "rgba(2, 116, 187, 0.11)",
    left: -76,
    bottom: -70,
  },
  header: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  compactHeader: {
    minHeight: 54,
    paddingVertical: 5,
    paddingHorizontal: 9,
  },
  smallPhoneHeader: {
    minHeight: 52,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.94)",
    borderWidth: 1,
    borderColor: brandColors.blue[100],
    ...brandShadows.soft,
  },
  titleBlock: {
    minWidth: 142,
    flexShrink: 1,
    marginLeft: 11,
  },
  smallPhoneTitleBlock: {
    flex: 1,
    minWidth: 0,
    marginLeft: 6,
  },
  studioTitle: {
    color: brandColors.blue[700],
    fontSize: 22,
    lineHeight: 24,
  },
  pageTitle: {
    color: brandColors.neutral[600],
    fontSize: 11,
    marginTop: 1,
  },
  smallPhonePageTitle: {
    color: brandColors.blue[700],
    fontSize: 12,
    marginTop: 0,
  },
  headerActions: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 7,
    marginLeft: 10,
  },
  smallPhoneHeaderActions: {
    flex: 0,
    gap: 4,
    marginLeft: 6,
  },
  roundAction: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.96)",
    borderWidth: 1,
    borderColor: brandColors.blue[100],
  },
  smallPhoneHeaderButton: {
    width: SMALL_PHONE_CONTROL_SIZE.header,
    height: SMALL_PHONE_CONTROL_SIZE.header,
    borderRadius: 22,
  },
  shareButton: {
    minWidth: 44,
    height: 42,
    borderRadius: 21,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.96)",
    borderWidth: 1,
    borderColor: brandColors.blue[200],
    paddingHorizontal: 12,
  },
  smallPhoneShareButton: {
    minWidth: SMALL_PHONE_CONTROL_SIZE.header,
    width: SMALL_PHONE_CONTROL_SIZE.header,
    height: SMALL_PHONE_CONTROL_SIZE.header,
    paddingHorizontal: 0,
  },
  shareText: {
    color: brandColors.blue[700],
    fontSize: 12,
    marginLeft: 5,
  },
  saveButton: {
    minWidth: 82,
    height: 42,
    borderRadius: 21,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: brandColors.victoriaBlue,
    borderWidth: 2,
    borderColor: brandColors.white,
    paddingHorizontal: 13,
    ...brandShadows.soft,
  },
  smallPhoneSaveButton: {
    minWidth: SMALL_PHONE_CONTROL_SIZE.header,
    width: SMALL_PHONE_CONTROL_SIZE.header,
    height: SMALL_PHONE_CONTROL_SIZE.header,
    paddingHorizontal: 0,
  },
  saveText: {
    color: brandColors.white,
    fontSize: 13,
    marginLeft: 6,
  },
  disabledAction: {
    opacity: 0.42,
  },
  workspace: {
    flex: 1,
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingBottom: 12,
    gap: 12,
  },
  compactWorkspace: {
    paddingHorizontal: 8,
    paddingBottom: 7,
    gap: 7,
  },
  smallPhoneWorkspace: {
    paddingHorizontal: 6,
    paddingBottom: 5,
    gap: 5,
  },
  toolDock: {
    width: 104,
    borderRadius: 25,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 2,
    borderColor: brandColors.gold[200],
    padding: 9,
    ...brandShadows.soft,
  },
  compactToolDock: {
    width: 76,
    borderRadius: 20,
    padding: 6,
  },
  smallPhoneToolDock: {
    width: 64,
    borderRadius: 18,
    padding: 5,
  },
  dockTitle: {
    color: brandColors.blue[700],
    fontSize: 18,
    textAlign: "center",
    marginBottom: 7,
  },
  compactDockTitle: {
    fontSize: 15,
    marginBottom: 4,
  },
  toolButton: {
    minHeight: 62,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "transparent",
    marginBottom: 7,
  },
  compactToolButton: {
    minHeight: 48,
    borderRadius: 14,
    marginBottom: 4,
  },
  smallPhoneToolButton: {
    minHeight: SMALL_PHONE_CONTROL_SIZE.tool,
    marginBottom: 4,
  },
  selectedToolButton: {
    backgroundColor: brandColors.blue[50],
    borderColor: brandColors.victoriaBlue,
  },
  toolIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: brandColors.neutral[50],
  },
  selectedToolIcon: {
    backgroundColor: brandColors.victoriaBlue,
  },
  toolLabel: {
    color: brandColors.neutral[600],
    fontSize: 10,
    marginTop: 3,
  },
  selectedToolLabel: {
    color: brandColors.blue[700],
  },
  toolDockSpacer: {
    flex: 1,
  },
  clearButton: {
    minHeight: 42,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: brandColors.orange[50],
    borderWidth: 1,
    borderColor: brandColors.orange[200],
    paddingHorizontal: 8,
  },
  smallPhoneClearButton: {
    minHeight: SMALL_PHONE_CONTROL_SIZE.header,
    paddingHorizontal: 0,
  },
  clearText: {
    color: brandColors.orange[700],
    fontSize: 10,
    marginLeft: 4,
  },
  canvasColumn: {
    flex: 1,
    minWidth: 0,
  },
  canvasCard: {
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
    borderRadius: 27,
    backgroundColor: brandColors.white,
    borderWidth: 4,
    borderColor: brandColors.white,
    ...brandShadows.lifted,
  },
  zoomedArtwork: {
    ...StyleSheet.absoluteFillObject,
  },
  artworkCapture: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: brandColors.white,
  },
  templateImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  drawingSurface: {
    ...StyleSheet.absoluteFillObject,
  },
  paintLayer: {
    mixBlendMode: "multiply",
  },
  gestureOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  zoomControls: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 10,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.94)",
    borderWidth: 1,
    borderColor: brandColors.blue[100],
    padding: 2,
    ...brandShadows.soft,
  },
  zoomButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  zoomMoveButton: {
    minWidth: 54,
    height: 44,
    borderRadius: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: brandColors.blue[50],
    paddingHorizontal: 7,
  },
  selectedZoomMoveButton: {
    backgroundColor: brandColors.victoriaBlue,
  },
  zoomLevelText: {
    color: brandColors.blue[700],
    fontSize: 10,
    marginLeft: 3,
  },
  selectedZoomLevelText: {
    color: brandColors.white,
  },
  canvasHint: {
    height: 26,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  canvasHintText: {
    color: brandColors.blue[700],
    fontSize: 10,
    marginLeft: 5,
  },
  canvasOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.94)",
  },
  loadingCard: {
    width: "66%",
    maxWidth: 300,
    minHeight: 150,
  },
  errorCard: {
    width: "76%",
    maxWidth: 390,
    alignItems: "center",
    borderRadius: 22,
    backgroundColor: brandColors.white,
    borderWidth: 2,
    borderColor: brandColors.gold[200],
    padding: 18,
  },
  errorTitle: {
    color: brandColors.blue[700],
    fontSize: 20,
    textAlign: "center",
    marginTop: 6,
  },
  errorMessage: {
    color: brandColors.neutral[600],
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
  },
  errorActions: {
    flexDirection: "row",
    marginTop: 13,
    gap: 8,
  },
  retryButton: {
    minHeight: 42,
    borderRadius: 21,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: brandColors.victoriaBlue,
    paddingHorizontal: 14,
  },
  retryText: {
    color: brandColors.white,
    fontSize: 11,
    marginLeft: 5,
  },
  chooseAnotherButton: {
    minHeight: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: brandColors.blue[200],
    paddingHorizontal: 14,
  },
  chooseAnotherText: {
    color: brandColors.blue[700],
    fontSize: 11,
  },
  exportOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 30,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.55)",
  },
  exportBubble: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 27,
    backgroundColor: brandColors.white,
    borderWidth: 2,
    borderColor: brandColors.blue[100],
    paddingHorizontal: 18,
    ...brandShadows.soft,
  },
  exportText: {
    color: brandColors.blue[700],
    fontSize: 12,
    marginLeft: 9,
  },
  creativeDock: {
    width: 214,
    borderRadius: 25,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 2,
    borderColor: brandColors.blue[100],
    padding: 11,
    ...brandShadows.soft,
  },
  compactCreativeDock: {
    width: 176,
    borderRadius: 20,
    padding: 7,
  },
  smallPhoneCreativeDock: {
    width: 176,
    borderRadius: 18,
    padding: 7,
  },
  dockHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  activeColorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: brandColors.white,
    ...brandShadows.soft,
  },
  colorName: {
    color: brandColors.neutral[500],
    fontSize: 9,
    textAlign: "center",
    marginTop: -5,
    marginBottom: 6,
  },
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  compactColorGrid: {
    gap: 3,
  },
  smallPhoneColorGrid: {
    gap: 3,
  },
  colorButton: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  compactColorButton: {
    width: 29,
    height: 29,
    borderRadius: 11,
  },
  smallPhoneColorButton: {
    width: SMALL_PHONE_CONTROL_SIZE.color,
    height: SMALL_PHONE_CONTROL_SIZE.color,
    borderRadius: 14,
  },
  selectedColorButton: {
    borderColor: brandColors.neutral[700],
    backgroundColor: brandColors.gold[50],
  },
  colorSwatch: {
    width: 29,
    height: 29,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.8)",
  },
  sizeTitle: {
    color: brandColors.blue[700],
    fontSize: 15,
    textAlign: "center",
    marginTop: 9,
    marginBottom: 4,
  },
  compactSizeTitle: {
    fontSize: 13,
    marginTop: 6,
  },
  sizeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  smallPhoneSizeRow: {
    gap: 3,
    marginTop: 6,
  },
  sizeButton: {
    width: SMALL_PHONE_CONTROL_SIZE.size,
    height: SMALL_PHONE_CONTROL_SIZE.size,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: brandColors.neutral[50],
    borderWidth: 2,
    borderColor: brandColors.neutral[100],
  },
  brushPreview: {
    width: SMALL_PHONE_CONTROL_SIZE.size,
    height: SMALL_PHONE_CONTROL_SIZE.size,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: brandColors.white,
    borderWidth: 2,
    borderColor: brandColors.blue[100],
  },
  tutorialOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 200,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(9, 44, 73, 0.68)",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  tutorialCard: {
    width: "92%",
    maxWidth: 520,
    borderRadius: 24,
    backgroundColor: brandColors.white,
    borderWidth: 3,
    borderColor: brandColors.gold[300],
    padding: 14,
    ...brandShadows.lifted,
  },
  tutorialTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  tutorialIconBubble: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: brandColors.blue[50],
    borderWidth: 2,
    borderColor: brandColors.blue[100],
  },
  tutorialCopy: {
    flex: 1,
    minWidth: 0,
    marginLeft: 12,
  },
  tutorialLocationRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  tutorialLocation: {
    color: brandColors.orange[700],
    fontSize: 10,
    marginLeft: 4,
    textTransform: "uppercase",
  },
  tutorialTitle: {
    color: brandColors.blue[700],
    fontSize: 19,
    lineHeight: 22,
    marginTop: 1,
  },
  tutorialMessage: {
    color: brandColors.neutral[600],
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  tutorialActions: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  tutorialSkipButton: {
    minWidth: 64,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: brandColors.neutral[200],
    paddingHorizontal: 13,
  },
  tutorialSkipText: {
    color: brandColors.neutral[600],
    fontSize: 12,
  },
  tutorialDots: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 8,
  },
  tutorialDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: brandColors.neutral[200],
  },
  activeTutorialDot: {
    width: 22,
    backgroundColor: brandColors.victoriaBlue,
  },
  tutorialNextButton: {
    minWidth: 92,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 22,
    backgroundColor: brandColors.victoriaBlue,
    paddingHorizontal: 14,
  },
  tutorialNextText: {
    color: brandColors.white,
    fontSize: 12,
  },
  pressedButton: {
    transform: [{ scale: 0.96 }],
  },
  celebration: {
    position: "absolute",
    top: 72,
    alignSelf: "center",
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 28,
    backgroundColor: brandColors.white,
    borderWidth: 3,
    borderColor: brandColors.gold[300],
    paddingHorizontal: 18,
    zIndex: 100,
    ...brandShadows.lifted,
  },
  celebrationIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: brandColors.gold[50],
  },
  celebrationText: {
    color: brandColors.blue[700],
    fontFamily: brandFonts.display,
    fontSize: 18,
    marginLeft: 9,
  },
})
